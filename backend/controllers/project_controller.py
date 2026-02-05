"""
Project Controller - handles project-related endpoints
"""
import json
import logging
import traceback
from datetime import datetime
from pathlib import Path

from flask import Blueprint, request, jsonify, current_app
from sqlalchemy import desc
from sqlalchemy.orm import joinedload
from werkzeug.exceptions import BadRequest

from models import db, Project, Page, Task, ReferenceFile, Material, XhsCardImageVersion
from services import ProjectContext
from services.project_service import ProjectService
from services.ai_service_manager import get_ai_service, get_cached_refined_template_style
from services.task_manager import (
    task_manager,
    generate_descriptions_task,
    generate_images_task,
    generate_infographic_task,
    generate_xhs_task,
    generate_xhs_single_card_task,
    edit_xhs_card_image_task,
    update_xhs_payload_material
)
from utils import (
    success_response, error_response, not_found, bad_request,
    parse_page_ids_from_body, get_filtered_pages
)

logger = logging.getLogger(__name__)

project_bp = Blueprint('projects', __name__, url_prefix='/api/projects')


@project_bp.route('', methods=['GET'])
def list_projects():
    """
    GET /api/projects - Get all projects (for history)

    Query params:
    - limit: number of projects to return (default: 50, max: 100)
    - offset: offset for pagination (default: 0)
    """
    try:
        limit = request.args.get('limit', 50, type=int)
        offset = request.args.get('offset', 0, type=int)

        result = ProjectService.list_projects(limit=limit, offset=offset)
        return success_response(result)

    except Exception as e:
        logger.error(f"list_projects failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('', methods=['POST'])
def create_project():
    """
    POST /api/projects - Create a new project
    
    Request body:
    {
        "creation_type": "idea|outline|descriptions",
        "idea_prompt": "...",  # required for idea type
        "outline_text": "...",  # required for outline type
        "description_text": "...",  # required for descriptions type
        "template_id": "optional"
    }
    """
    try:
        data = request.get_json()

        if not data:
            return bad_request("Request body is required")

        # creation_type is required
        if 'creation_type' not in data:
            return bad_request("creation_type is required")

        project = ProjectService.create_project(data)

        return success_response({
            'project_id': project.id,
            'status': project.status,
            'pages': []
        }, status_code=201)

    except ValueError as e:
        db.session.rollback()
        return bad_request(str(e))

    except BadRequest as e:
        # Handle JSON parsing errors (invalid JSON body)
        db.session.rollback()
        logger.warning(f"create_project: Invalid JSON body - {str(e)}")
        return bad_request("Invalid JSON in request body")
    
    except Exception as e:
        db.session.rollback()
        error_trace = traceback.format_exc()
        logger.error(f"create_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>', methods=['GET'])
def get_project(project_id):
    """
    GET /api/projects/{project_id} - Get project details
    """
    try:
        # Use eager loading to load project and related pages
        project = Project.query\
            .options(joinedload(Project.pages))\
            .filter(Project.id == project_id)\
            .first()
        
        if not project:
            return not_found('Project')
        
        return success_response(project.to_dict(include_pages=True))
    
    except Exception as e:
        logger.error(f"get_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>', methods=['PUT'])
def update_project(project_id):
    """
    PUT /api/projects/{project_id} - Update project
    
    Request body:
    {
        "idea_prompt": "...",
        "pages_order": ["page-uuid-1", "page-uuid-2", ...]
    }
    """
    try:
        # Use eager loading to load project and pages (for page order updates)
        project = Project.query\
            .options(joinedload(Project.pages))\
            .filter(Project.id == project_id)\
            .first()
        
        if not project:
            return not_found('Project')

        data = request.get_json()

        project = ProjectService.update_project(project, data)

        return success_response(project.to_dict(include_pages=True))
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"update_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>', methods=['DELETE'])
def delete_project(project_id):
    """
    DELETE /api/projects/{project_id} - Delete project
    """
    try:
        project = Project.query.get(project_id)

        if not project:
            return not_found('Project')

        upload_folder = current_app.config['UPLOAD_FOLDER']
        ProjectService.delete_project(project, upload_folder)

        return success_response(message="Project deleted successfully")
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"delete_project failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/outline', methods=['POST'])
def generate_outline(project_id):
    """
    POST /api/projects/{project_id}/generate/outline - Generate outline
    
    For 'idea' type: Generate outline from idea_prompt
    For 'outline' type: Parse outline_text into structured format
    
    Request body (optional):
    {
        "idea_prompt": "...",  # for idea type
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get request data and language parameter
        data = request.get_json() or {}
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        page_count = data.get('page_count')
        if page_count is not None:
            try:
                page_count = int(page_count)
            except Exception:
                return bad_request("page_count must be an integer")
            if page_count < 1:
                return bad_request("page_count must be greater than 0")
        
        # Get reference files content and create project context (documents -> parsed text)
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for project {project_id}")
            for rf in reference_files_content:
                logger.info(f"  - {rf['filename']}: {len(rf['content'])} characters")
        else:
            logger.info(f"No reference files found for project {project_id}")
        
        # 根据项目类型选择不同的处理方式
        if project.creation_type == 'outline':
            # 从大纲生成：解析用户输入的大纲文本
            if not project.outline_text:
                return bad_request("outline_text is required for outline type project")
            
            # Create project context and parse outline text into structured format
            project_context = ProjectContext(project, reference_files_content)
            outline = ai_service.parse_outline_text(project_context, language=language)
        elif project.creation_type == 'descriptions':
            # 从描述生成：这个类型应该使用专门的端点
            return bad_request("Use /generate/from-description endpoint for descriptions type")
        else:
            # 一句话生成：从idea生成大纲
            idea_prompt = data.get('idea_prompt') or project.idea_prompt
            
            if not idea_prompt:
                return bad_request("idea_prompt is required")
            
            project.idea_prompt = idea_prompt
            
            # Create project context and generate outline from idea
            asset_summaries = ProjectService.get_project_asset_material_summaries(project_id, max_items=10)
            if asset_summaries:
                reference_files_content = reference_files_content + asset_summaries
            project_context = ProjectContext(project, reference_files_content)

            # Unified multimodal outline generation:
            # If the project has image attachments (materials asset / image reference files),
            # pass them to the LLM directly so it can "see" the images.
            image_paths = ProjectService.collect_project_outline_image_attachments(project_id, max_images=10)
            if image_paths:
                from services.prompts import get_outline_generation_prompt
                prompt = get_outline_generation_prompt(project_context, language, page_count)
                outline = ai_service.generate_json_with_images(prompt, image_paths, thinking_budget=1000)
            else:
                outline = ai_service.generate_outline(project_context, language=language, page_count=page_count)
        
        # Flatten outline to pages
        pages_data = ai_service.flatten_outline(outline)
        
        # Delete existing pages (using ORM session to trigger cascades)
        # Note: Cannot use bulk delete as it bypasses ORM cascades for PageImageVersion
        old_pages = Page.query.filter_by(project_id=project_id).all()
        for old_page in old_pages:
            db.session.delete(old_page)
        
        # Create pages from outline
        pages_list = []
        for i, page_data in enumerate(pages_data):
            page = Page(
                project_id=project_id,
                order_index=i,
                part=page_data.get('part'),
                status='DRAFT'
            )
            page.set_outline_content({
                'title': page_data.get('title'),
                'points': page_data.get('points', [])
            })
            
            db.session.add(page)
            pages_list.append(page)
        
        # Update project status
        project.status = 'OUTLINE_GENERATED'
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"大纲生成完成: 项目 {project_id}, 创建了 {len(pages_list)} 个页面")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages_list]
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_outline failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/generate/from-description', methods=['POST'])
def generate_from_description(project_id):
    """
    POST /api/projects/{project_id}/generate/from-description - Generate outline and page descriptions from description text
    
    This endpoint:
    1. Parses the description_text to extract outline structure
    2. Splits the description_text into individual page descriptions
    3. Creates pages with both outline and description content filled
    4. Sets project status to DESCRIPTIONS_GENERATED
    
    Request body (optional):
    {
        "description_text": "...",  # if not provided, uses project.description_text
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        if project.creation_type != 'descriptions':
            return bad_request("This endpoint is only for descriptions type projects")
        
        # Get description text and language
        data = request.get_json() or {}
        description_text = data.get('description_text') or project.description_text
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        if not description_text:
            return bad_request("description_text is required")
        
        project.description_text = description_text
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        project_context = ProjectContext(project, reference_files_content)
        
        logger.info(f"开始从描述生成大纲和页面描述: 项目 {project_id}")
        
        # Step 1: Parse description to outline
        logger.info("Step 1: 解析描述文本到大纲结构...")
        outline = ai_service.parse_description_to_outline(project_context, language=language)
        logger.info(f"大纲解析完成，共 {len(ai_service.flatten_outline(outline))} 页")
        
        # Step 2: Split description into page descriptions
        logger.info("Step 2: 切分描述文本到每页描述...")
        page_descriptions = ai_service.parse_description_to_page_descriptions(project_context, outline, language=language)
        logger.info(f"描述切分完成，共 {len(page_descriptions)} 页")
        
        # Step 3: Flatten outline to pages
        pages_data = ai_service.flatten_outline(outline)
        
        if len(pages_data) != len(page_descriptions):
            logger.warning(f"页面数量不匹配: 大纲 {len(pages_data)} 页, 描述 {len(page_descriptions)} 页")
            # 取较小的数量，避免索引错误
            min_count = min(len(pages_data), len(page_descriptions))
            pages_data = pages_data[:min_count]
            page_descriptions = page_descriptions[:min_count]
        
        # Step 4: Delete existing pages (using ORM session to trigger cascades)
        old_pages = Page.query.filter_by(project_id=project_id).all()
        for old_page in old_pages:
            db.session.delete(old_page)
        
        # Step 5: Create pages with both outline and description
        pages_list = []
        for i, (page_data, page_desc) in enumerate(zip(pages_data, page_descriptions)):
            page = Page(
                project_id=project_id,
                order_index=i,
                part=page_data.get('part'),
                status='DESCRIPTION_GENERATED'  # 直接设置为已生成描述
            )
            
            # Set outline content
            page.set_outline_content({
                'title': page_data.get('title'),
                'points': page_data.get('points', [])
            })
            
            # Set description content
            desc_content = {
                "text": page_desc,
                "generated_at": datetime.utcnow().isoformat()
            }
            page.set_description_content(desc_content)
            
            db.session.add(page)
            pages_list.append(page)
        
        # Update project status
        project.status = 'DESCRIPTIONS_GENERATED'
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"从描述生成完成: 项目 {project_id}, 创建了 {len(pages_list)} 个页面，已填充大纲和描述")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages_list],
            'status': 'DESCRIPTIONS_GENERATED'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_from_description failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/generate/descriptions', methods=['POST'])
def generate_descriptions(project_id):
    """
    POST /api/projects/{project_id}/generate/descriptions - Generate descriptions
    
    Request body:
    {
        "max_workers": 5,
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        if project.status not in ['OUTLINE_GENERATED', 'DRAFT', 'DESCRIPTIONS_GENERATED']:
            return bad_request("Project must have outline generated first")
        
        # IMPORTANT: Expire cached objects to ensure fresh data
        db.session.expire_all()
        
        # Get pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            return bad_request("No pages found for project")
        
        # Reconstruct outline from pages with part structure
        outline = ProjectService.reconstruct_outline_from_pages(pages)
        
        data = request.get_json() or {}
        # 从配置中读取默认并发数，如果请求中提供了则使用请求的值
        max_workers = data.get('max_workers', current_app.config.get('MAX_DESCRIPTION_WORKERS', 5))
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Create task
        task = Task(
            project_id=project_id,
            task_type='GENERATE_DESCRIPTIONS',
            status='PENDING'
        )
        task.set_progress({
            'total': len(pages),
            'completed': 0,
            'failed': 0
        })
        
        db.session.add(task)
        db.session.commit()
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        project_context = ProjectContext(project, reference_files_content)
        
        # Get app instance for background task
        app = current_app._get_current_object()
        
        # Submit background task
        task_manager.submit_task(
            task.id,
            generate_descriptions_task,
            project_id,
            ai_service,
            project_context,
            outline,
            max_workers,
            app,
            language
        )
        
        # Update project status
        project.status = 'GENERATING_DESCRIPTIONS'
        db.session.commit()
        
        return success_response({
            'task_id': task.id,
            'status': 'GENERATING_DESCRIPTIONS',
            'total_pages': len(pages)
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_descriptions failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/images', methods=['POST'])
def generate_images(project_id):
    """
    POST /api/projects/{project_id}/generate/images - Generate images
    
    Request body:
    {
        "max_workers": 8,
        "use_template": true,
        "language": "zh",  # output language: zh, en, ja, auto
        "page_ids": ["id1", "id2"]  # optional: specific page IDs to generate (if not provided, generates all)
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        # if project.status not in ['DESCRIPTIONS_GENERATED', 'OUTLINE_GENERATED']:
        #     return bad_request("Project must have descriptions generated first")
        
        # IMPORTANT: Expire cached objects to ensure fresh data
        db.session.expire_all()
        
        data = request.get_json() or {}
        
        # Get page_ids from request body and fetch filtered pages
        selected_page_ids = parse_page_ids_from_body(data)
        pages = get_filtered_pages(project_id, selected_page_ids if selected_page_ids else None)
        
        if not pages:
            return bad_request("No pages found for project")
        
        # 检查是否有模板图片或风格描述
        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        template_variants = project.get_template_variants() if hasattr(project, 'get_template_variants') else {}
        has_variant_template = any(bool(v) for v in template_variants.values())
        has_template_image = bool(file_service.get_template_path(project_id))
        has_template_resource = has_template_image or has_variant_template

        # use_template 默认“自动”：未显式传时根据是否有模板资源决定
        use_template_raw = data.get('use_template')
        if use_template_raw is None:
            use_template = has_template_resource
        else:
            use_template = use_template_raw
            if isinstance(use_template, str):
                use_template = use_template.lower() == 'true'
            else:
                use_template = bool(use_template)
        
        # Reconstruct outline from pages with part structure
        outline = ProjectService.reconstruct_outline_from_pages(pages)
        
        # 从配置中读取默认并发数，如果请求中提供了则使用请求的值
        max_workers = data.get('max_workers', current_app.config.get('MAX_IMAGE_WORKERS', 8))
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        default_ratio = current_app.config.get('DEFAULT_ASPECT_RATIO', '16:9')
        aspect_ratio = data.get('aspect_ratio')
        if aspect_ratio is None:
            try:
                payload = json.loads(project.product_payload) if project.product_payload else {}
            except Exception:
                payload = {}
            payload_ratio = (payload.get('aspect_ratio') or '').strip() if isinstance(payload, dict) else ''
            if payload_ratio and payload_ratio != 'auto':
                aspect_ratio = payload_ratio
        aspect_ratio = (str(aspect_ratio).strip() if aspect_ratio else default_ratio)
        if aspect_ratio not in ['16:9', '4:3']:
            aspect_ratio = default_ratio
        
        # Create task
        task = Task(
            project_id=project_id,
            task_type='GENERATE_IMAGES',
            status='PENDING'
        )
        task.set_progress({
            'total': len(pages),
            'completed': 0,
            'failed': 0
        })
        
        db.session.add(task)
        db.session.commit()
        
        # Get singleton AI service instance
        ai_service = get_ai_service()

        # 无模板时：准备“有效风格描述”（不覆盖用户手写风格，但仍可做智能整理/补全）
        no_template_mode = (not has_template_resource) or (use_template is False)
        effective_template_style = (project.template_style or "").strip()

        if no_template_mode:
            reference_files_content = ProjectService.get_project_reference_files_content(project_id)
            project_context = ProjectContext(project, reference_files_content)
            outline_text = project.outline_text or ai_service.generate_outline_text(outline)

            if not effective_template_style:
                # 1) 没有风格描述：自动生成并写入（生成并锁定）
                template_style = ai_service.generate_template_style(
                    project_context=project_context,
                    outline_text=outline_text,
                    extra_requirements=project.extra_requirements,
                    existing_template_style=None,
                    language=language
                )
                effective_template_style = (template_style or "").strip()
                project.template_style = effective_template_style
                db.session.commit()
            else:
                # 2) 已有风格描述：不覆盖；整理/补全结果做短期缓存，避免重复调用并保持风格一致
                effective_template_style = get_cached_refined_template_style(
                    project_id=project_id,
                    base_style=effective_template_style,
                    outline_text=outline_text,
                    extra_requirements=project.extra_requirements or "",
                    language=language or "",
                    generate_fn=lambda: ai_service.generate_template_style(
                        project_context=project_context,
                        outline_text=outline_text,
                        extra_requirements=project.extra_requirements,
                        existing_template_style=effective_template_style,
                        language=language
                    )
                ).strip()
        
        # 合并额外要求和风格描述
        combined_requirements = project.extra_requirements or ""
        if effective_template_style:
            style_requirement = f"\n\nppt页面风格描述：\n\n{effective_template_style}"
            combined_requirements = combined_requirements + style_requirement
        
        # Get app instance for background task
        app = current_app._get_current_object()
        
        # Submit background task
        task_manager.submit_task(
            task.id,
            generate_images_task,
            project_id,
            ai_service,
            file_service,
            outline,
            use_template,
            max_workers,
            aspect_ratio,
            current_app.config['DEFAULT_RESOLUTION'],
            app,
            combined_requirements if combined_requirements.strip() else None,
            language,
            selected_page_ids if selected_page_ids else None
        )
        
        # Update project status
        project.status = 'GENERATING_IMAGES'
        db.session.commit()
        
        return success_response({
            'task_id': task.id,
            'status': 'GENERATING_IMAGES',
            'total_pages': len(pages)
        }, status_code=202)
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_images failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/infographic', methods=['POST'])
def generate_infographic(project_id):
    """
    POST /api/projects/{project_id}/generate/infographic - Generate infographic images

    Request body:
    {
        "mode": "single|series",
        "page_ids": ["..."],  # optional for series
        "language": "zh|en|ja|auto",
        "use_template": true,  # optional
        "aspect_ratio": "9:16",  # optional
        "resolution": "2K",      # optional
        "max_workers": 6         # optional
    }
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        data = request.get_json() or {}
        mode = (data.get('mode') or 'single').strip().lower()
        if mode not in ['single', 'series']:
            return bad_request("Invalid mode, must be 'single' or 'series'")

        page_ids = parse_page_ids_from_body(data)
        pages = get_filtered_pages(project_id, page_ids if page_ids else None)

        if mode == 'series' and not pages:
            return bad_request("No pages found for project")

        outline = ProjectService.reconstruct_outline_from_pages(pages) if pages else []

        # Defaults
        aspect_ratio = data.get('aspect_ratio')
        if not aspect_ratio or str(aspect_ratio).strip() == 'auto':
            aspect_ratio = current_app.config.get('DEFAULT_ASPECT_RATIO', '16:9')
        else:
            aspect_ratio = str(aspect_ratio).strip()
        resolution = data.get('resolution') or current_app.config.get('DEFAULT_RESOLUTION', '2K')
        max_workers = data.get('max_workers', current_app.config.get('MAX_IMAGE_WORKERS', 6))
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))

        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        template_path = file_service.get_template_path(project_id)
        use_template_raw = data.get('use_template')
        if use_template_raw is None:
            use_template = bool(template_path)
        else:
            if isinstance(use_template_raw, str):
                use_template = use_template_raw.lower() == 'true'
            else:
                use_template = bool(use_template_raw)

        task = Task(
            project_id=project_id,
            task_type='GENERATE_INFOGRAPHIC',
            status='PENDING'
        )
        task.set_progress({
            'total': 1 if mode == 'single' else len(pages),
            'completed': 0,
            'failed': 0
        })
        db.session.add(task)
        db.session.commit()

        # file_service already created above
        ai_service = get_ai_service()
        app = current_app._get_current_object()

        task_manager.submit_task(
            task.id,
            generate_infographic_task,
            project_id,
            ai_service,
            file_service,
            outline,
            mode,
            max_workers,
            aspect_ratio,
            resolution,
            app,
            language,
            page_ids if page_ids else None,
            use_template
        )

        project.status = 'GENERATING_INFOGRAPHIC'
        db.session.commit()

        return success_response({
            'task_id': task.id,
            'status': 'GENERATING_INFOGRAPHIC',
            'mode': mode
        }, status_code=202)

    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_infographic failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/xhs', methods=['POST'])
def generate_xhs(project_id):
    """
    POST /api/projects/{project_id}/generate/xhs - Generate Xiaohongshu image+text pack (vertical carousel)

    Request body:
    {
        "image_count": 7,         # optional, 6-9
        "aspect_ratio": "4:5",    # optional, default 4:5 (or 3:4)
        "resolution": "2K",       # optional
        "max_workers": 6,         # optional
        "language": "zh|en|ja|auto"
    }
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        data = request.get_json() or {}
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        template_usage_mode = (data.get('template_usage_mode') or '').strip()
        use_template = data.get('use_template', None)
        if isinstance(use_template, str):
            use_template = use_template.lower() in ['1', 'true', 'yes']
        if template_usage_mode == 'template':
            use_template = True
        elif template_usage_mode == 'style':
            use_template = False

        # Params with validation
        image_count = data.get('image_count', 7)
        try:
            image_count = int(image_count)
        except Exception:
            return bad_request("image_count must be an integer")
        if image_count < 1:
            return bad_request("image_count must be greater than 0")

        aspect_ratio = (data.get('aspect_ratio') or '3:4').strip()
        if aspect_ratio == 'auto':
            aspect_ratio = '3:4'
        if aspect_ratio not in ['4:5', '3:4']:
            return bad_request("aspect_ratio must be one of 4:5, 3:4")

        resolution = (data.get('resolution') or current_app.config.get('DEFAULT_RESOLUTION', '2K')).strip()
        max_workers = data.get('max_workers', current_app.config.get('MAX_IMAGE_WORKERS', 6))
        try:
            max_workers = int(max_workers)
        except Exception:
            return bad_request("max_workers must be an integer")
        if max_workers < 1 or max_workers > 16:
            return bad_request("max_workers must be an integer between 1 and 16")

        task = Task(
            project_id=project_id,
            task_type='GENERATE_XHS',
            status='PENDING'
        )
        task.set_progress({
            'total': image_count,
            'completed': 0,
            'failed': 0
        })
        db.session.add(task)
        db.session.commit()

        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        ai_service = get_ai_service()
        app = current_app._get_current_object()

        task_manager.submit_task(
            task.id,
            generate_xhs_task,
            project_id,
            ai_service,
            file_service,
            image_count,
            aspect_ratio,
            resolution,
            max_workers,
            use_template,
            app,
            language
        )

        project.status = 'GENERATING_XHS'
        db.session.commit()

        return success_response(
            {
                'task_id': task.id,
                'status': 'GENERATING_XHS',
                'image_count': image_count,
                'aspect_ratio': aspect_ratio
            },
            status_code=202
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_xhs failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/xhs/card', methods=['POST'])
def generate_xhs_card(project_id):
    """
    POST /api/projects/{project_id}/generate/xhs/card - Generate a single XHS card image

    Request body:
    {
        "index": 0,
        "aspect_ratio": "4:5",
        "resolution": "2K",
        "language": "zh|en|ja|auto"
    }
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        if project.product_type != 'xiaohongshu':
            return bad_request("Project is not xiaohongshu type")

        data = request.get_json() or {}
        if 'index' not in data:
            return bad_request("index is required")

        try:
            index = int(data.get('index'))
        except Exception:
            return bad_request("index must be an integer")

        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        if not pages:
            return bad_request("No pages found for project")
        if index < 0 or index >= len(pages):
            return bad_request("index out of range")

        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        template_usage_mode = (data.get('template_usage_mode') or '').strip()
        use_template = data.get('use_template', None)
        if isinstance(use_template, str):
            use_template = use_template.lower() in ['1', 'true', 'yes']
        if template_usage_mode == 'template':
            use_template = True
        elif template_usage_mode == 'style':
            use_template = False
        aspect_ratio = (data.get('aspect_ratio') or '3:4').strip()
        if aspect_ratio == 'auto':
            aspect_ratio = '3:4'
        if aspect_ratio not in ['4:5', '3:4']:
            return bad_request("aspect_ratio must be one of 4:5, 3:4")

        resolution = (data.get('resolution') or current_app.config.get('DEFAULT_RESOLUTION', '2K')).strip()

        task = Task(
            project_id=project_id,
            task_type='GENERATE_XHS_CARD',
            status='PENDING'
        )
        task.set_progress({
            'total': 1,
            'completed': 0,
            'failed': 0
        })
        db.session.add(task)
        db.session.commit()

        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        ai_service = get_ai_service()
        app = current_app._get_current_object()

        task_manager.submit_task(
            task.id,
            generate_xhs_single_card_task,
            project_id,
            index,
            ai_service,
            file_service,
            aspect_ratio,
            resolution,
            use_template,
            app,
            language
        )

        project.status = 'GENERATING_XHS'
        db.session.commit()

        return success_response(
            {
                'task_id': task.id,
                'status': 'GENERATING_XHS',
                'index': index,
                'aspect_ratio': aspect_ratio
            },
            status_code=202
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_xhs_card failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/xhs/card/edit', methods=['POST'])
def edit_xhs_card(project_id):
    """
    POST /api/projects/{project_id}/generate/xhs/card/edit - Edit a single XHS card image
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        # Parse request data (support JSON or multipart/form-data)
        if request.is_json:
            data = request.get_json() or {}
            uploaded_files = []
        else:
            data = request.form.to_dict()
            uploaded_files = request.files.getlist('context_images')
            if 'desc_image_urls' in data and data['desc_image_urls']:
                try:
                    data['desc_image_urls'] = json.loads(data['desc_image_urls'])
                except Exception:
                    data['desc_image_urls'] = []

        if 'index' not in data:
            return bad_request("index is required")
        try:
            index = int(data.get('index'))
        except Exception:
            return bad_request("index must be an integer")

        edit_instruction = data.get('edit_instruction') or data.get('instruction')
        if not edit_instruction:
            return bad_request("edit_instruction is required")

        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        if not pages:
            return bad_request("No pages found for project")
        if index < 0 or index >= len(pages):
            return bad_request("index out of range")

        aspect_ratio = (data.get('aspect_ratio') or '3:4').strip()
        if aspect_ratio == 'auto':
            aspect_ratio = '3:4'
        if aspect_ratio not in ['4:5', '3:4']:
            return bad_request("aspect_ratio must be one of 4:5, 3:4")
        resolution = (data.get('resolution') or current_app.config.get('DEFAULT_RESOLUTION', '2K')).strip()

        template_usage_mode = (data.get('template_usage_mode') or '').strip()
        use_template = data.get('use_template', None)
        if isinstance(use_template, str):
            use_template = use_template.lower() in ['1', 'true', 'yes']
        if template_usage_mode == 'template':
            use_template = True
        elif template_usage_mode == 'style':
            use_template = False
        else:
            context_images = data.get('context_images', {})
            if isinstance(context_images, dict) and 'use_template' in context_images:
                use_template = bool(context_images.get('use_template'))

        additional_ref_images = []
        context_images = data.get('context_images', {})
        if isinstance(context_images, dict):
            desc_image_urls = context_images.get('desc_image_urls', [])
        else:
            desc_image_urls = data.get('desc_image_urls', [])
        if isinstance(desc_image_urls, str):
            try:
                desc_image_urls = json.loads(desc_image_urls)
            except Exception:
                desc_image_urls = []
        if isinstance(desc_image_urls, list):
            additional_ref_images.extend([str(u) for u in desc_image_urls if u])

        temp_dir = None
        if uploaded_files:
            import tempfile
            import shutil
            from werkzeug.utils import secure_filename
            from pathlib import Path
            temp_dir = Path(tempfile.mkdtemp(dir=current_app.config['UPLOAD_FOLDER']))
            try:
                for uploaded_file in uploaded_files:
                    if uploaded_file.filename:
                        temp_path = temp_dir / secure_filename(uploaded_file.filename)
                        uploaded_file.save(str(temp_path))
                        additional_ref_images.append(str(temp_path))
            except Exception as e:
                if temp_dir and temp_dir.exists():
                    shutil.rmtree(temp_dir)
                raise e

        task = Task(
            project_id=project_id,
            task_type='EDIT_XHS_CARD_IMAGE',
            status='PENDING'
        )
        task.set_progress({
            'total': 1,
            'completed': 0,
            'failed': 0
        })
        db.session.add(task)
        db.session.commit()

        from services import FileService
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        ai_service = get_ai_service()
        app = current_app._get_current_object()

        task_manager.submit_task(
            task.id,
            edit_xhs_card_image_task,
            project_id,
            index,
            edit_instruction,
            ai_service,
            file_service,
            aspect_ratio,
            resolution,
            additional_ref_images if additional_ref_images else None,
            use_template,
            str(temp_dir) if temp_dir else None,
            app
        )

        project.status = 'GENERATING_XHS'
        db.session.commit()

        return success_response(
            {
                'task_id': task.id,
                'status': 'GENERATING_XHS',
                'index': index,
                'aspect_ratio': aspect_ratio
            },
            status_code=202
        )
    except Exception as e:
        db.session.rollback()
        logger.error(f"edit_xhs_card failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/xhs/cards/<int:index>/image-versions', methods=['GET'])
def get_xhs_card_versions(project_id, index: int):
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        versions = XhsCardImageVersion.query.filter_by(
            project_id=project_id,
            index=index
        ).order_by(XhsCardImageVersion.version_number.desc()).all()

        version_payload = []
        for v in versions:
            material = Material.query.get(v.material_id)
            version_payload.append({
                **v.to_dict(),
                'material_url': material.url if material else None,
                'display_name': material.display_name if material else None,
                'material_created_at': material.created_at.isoformat() if material and material.created_at else None,
            })

        return success_response({'versions': version_payload})
    except Exception as e:
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/xhs/cards/<int:index>/image-versions/<version_id>/set-current', methods=['POST'])
def set_xhs_card_current_version(project_id, index: int, version_id: str):
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        version = XhsCardImageVersion.query.get(version_id)
        if not version or version.project_id != project_id or version.index != index:
            return not_found('XhsCardImageVersion')

        XhsCardImageVersion.query.filter_by(project_id=project_id, index=index).update({'is_current': False})
        version.is_current = True
        db.session.commit()

        material = Material.query.get(version.material_id)
        if material:
            role = "cover" if index == 0 else "content"
            update_xhs_payload_material(project, index, material, role)

        return success_response({'version_id': version.id, 'index': index})
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/xhs/cards/<int:index>/materials', methods=['POST'])
def update_xhs_card_materials(project_id, index: int):
    """
    POST /api/projects/{project_id}/xhs/cards/{index}/materials - Update material plan for a single XHS card

    Request body:
    {
        "material_ids": ["..."],
        "locked": true/false
    }
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')
        if project.product_type != 'xiaohongshu':
            return bad_request("Project is not xiaohongshu type")

        data = request.get_json() or {}
        if not isinstance(data, dict):
            return bad_request("Invalid request body")

        material_ids = data.get('material_ids', [])
        if material_ids is None:
            material_ids = []
        if not isinstance(material_ids, list):
            return bad_request("material_ids must be a list")
        material_ids = [str(mid) for mid in material_ids if mid]
        locked = bool(data.get('locked', False))

        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        if not pages:
            return bad_request("No pages found for project")
        image_count = len(pages)

        payload = {}
        if project.product_payload:
            try:
                payload = json.loads(project.product_payload)
            except Exception:
                payload = {}

        payload_image_count = payload.get("image_count")
        try:
            payload_image_count = int(payload_image_count)
        except Exception:
            payload_image_count = None
        if payload_image_count and payload_image_count > 0:
            image_count = payload_image_count

        if index < 0 or index >= image_count:
            return bad_request("index out of range")

        if material_ids:
            materials = Material.query.filter(
                Material.project_id == project_id,
                Material.id.in_(material_ids)
            ).all()
            if len(materials) != len(set(material_ids)):
                return bad_request("material_ids contain invalid material")

        material_plan = payload.get("material_plan") if isinstance(payload.get("material_plan"), list) else []
        normalized_plan = []
        for i in range(image_count):
            entry = material_plan[i] if i < len(material_plan) and isinstance(material_plan[i], dict) else {}
            entry = dict(entry)
            entry.setdefault("index", i)
            entry.setdefault("material_ids", [])
            entry.setdefault("locked", False)
            entry.setdefault("reason", entry.get("reason") or "manual_update")
            normalized_plan.append(entry)

        normalized_plan[index] = {
            "index": index,
            "material_ids": material_ids,
            "locked": locked,
            "reason": "manual_update" if material_ids else "manual_clear"
        }

        payload.update({
            "product_type": payload.get("product_type") or "xiaohongshu",
            "mode": payload.get("mode") or "vertical_carousel",
            "image_count": image_count,
            "material_plan": normalized_plan,
        })
        project.product_payload = json.dumps(payload, ensure_ascii=False)
        project.updated_at = datetime.utcnow()
        db.session.commit()

        return success_response({"product_payload": project.product_payload})
    except Exception as e:
        db.session.rollback()
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/generate/xhs/blueprint', methods=['POST'])
def generate_xhs_blueprint(project_id):
    """
    POST /api/projects/{project_id}/generate/xhs/blueprint - Generate XHS copywriting + cards (no images)
    """
    try:
        project = Project.query.get(project_id)
        if not project:
            return not_found('Project')

        if project.product_type != 'xiaohongshu':
            return bad_request("Project is not xiaohongshu type")

        data = request.get_json() or {}
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        aspect_ratio = (data.get('aspect_ratio') or '3:4').strip()
        if aspect_ratio == 'auto':
            aspect_ratio = '3:4'
        copywriting_only = bool(data.get('copywriting_only', False))

        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        if not pages:
            return bad_request("No pages found for project")

        image_count = len(pages)

        ai_service = get_ai_service()
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        project_context = ProjectContext(project, reference_files_content)

        outline_text = (project.outline_text or "").strip()
        if not outline_text:
            titles = []
            for p in pages:
                oc = p.get_outline_content() or {}
                title = (oc.get('title') or '').strip()
                if title:
                    titles.append(title)
            if titles:
                outline_text = "\n".join([f"{i + 1}. {t}" for i, t in enumerate(titles)])

        blueprint = ai_service.generate_xhs_blueprint(
            project_context=project_context,
            outline_text=outline_text,
            image_count=image_count,
            aspect_ratio=aspect_ratio,
            language=language
        )

        copywriting = blueprint.get("copywriting") if isinstance(blueprint.get("copywriting"), dict) else {}
        style_pack = blueprint.get("style_pack") if isinstance(blueprint.get("style_pack"), dict) else {}
        cards = blueprint.get("cards") if isinstance(blueprint.get("cards"), list) else []

        existing_payload = {}
        if project.product_payload:
            try:
                existing_payload = json.loads(project.product_payload)
            except Exception:
                existing_payload = {}
        existing_cards = existing_payload.get("cards") if isinstance(existing_payload.get("cards"), list) else []
        existing_style_pack = existing_payload.get("style_pack") if isinstance(existing_payload.get("style_pack"), dict) else {}
        existing_material_plan = (
            existing_payload.get("material_plan")
            if isinstance(existing_payload.get("material_plan"), list)
            else []
        )

        materials = Material.query.filter_by(project_id=project_id).order_by(Material.created_at.asc()).all()
        asset_ids = []
        for material in materials:
            note_data = None
            if material.note:
                try:
                    note_data = json.loads(material.note)
                except Exception:
                    note_data = None
            if isinstance(note_data, dict):
                if note_data.get("type") == "xhs":
                    continue
                if note_data.get("type") != "asset":
                    continue
            asset_ids.append(material.id)

        def _build_default_material_plan(total_images: int, asset_material_ids: list) -> list:
            plan = []
            total_assets = len(asset_material_ids)
            for i in range(total_images):
                if total_assets == 0:
                    material_ids = []
                    reason = "auto: no assets"
                elif total_assets == 1:
                    material_ids = [asset_material_ids[0]]
                    reason = "auto: single asset"
                else:
                    if i == total_images - 1:
                        material_ids = [asset_material_ids[-1]]
                        reason = "auto: ending asset"
                    else:
                        material_ids = [asset_material_ids[i % total_assets]]
                        reason = "auto: rotating assets"
                plan.append({
                    "index": i,
                    "material_ids": material_ids,
                    "locked": False,
                    "reason": reason
                })
            return plan

        if copywriting_only and existing_material_plan:
            material_plan = existing_material_plan
        else:
            material_plan = _build_default_material_plan(image_count, asset_ids)
            if existing_material_plan:
                for position, entry in enumerate(existing_material_plan):
                    if not isinstance(entry, dict):
                        continue
                    entry_index = entry.get("index", position)
                    try:
                        entry_index = int(entry_index)
                    except Exception:
                        continue
                    if entry_index < 0 or entry_index >= image_count:
                        continue
                    material_ids = entry.get("material_ids")
                    if entry.get("locked") is True and isinstance(material_ids, list) and material_ids:
                        preserved = dict(entry)
                        preserved["index"] = entry_index
                        material_plan[entry_index] = preserved

        # Normalize cards length to pages length
        normalized_cards = []
        for i in range(image_count):
            card = cards[i] if i < len(cards) and isinstance(cards[i], dict) else {}
            card = dict(card)
            card["index"] = i
            card["role"] = (card.get("role") or ("cover" if i == 0 else ("ending" if i == image_count - 1 else "content"))).strip()
            normalized_cards.append(card)

        def _to_description(card_obj: dict) -> str:
            heading = (card_obj.get("heading") or "").strip()
            subheading = (card_obj.get("subheading") or "").strip()
            bullets = card_obj.get("bullets") if isinstance(card_obj.get("bullets"), list) else []
            visuals = card_obj.get("visual_suggestions") if isinstance(card_obj.get("visual_suggestions"), list) else []
            parts = []
            if heading:
                parts.append(f"标题：{heading}")
            if subheading:
                parts.append(f"副标题：{subheading}")
            if bullets:
                parts.append("要点：\n" + "\n".join([f"- {b}" for b in bullets if b]))
            if visuals:
                parts.append("画面建议：\n" + "\n".join([f"- {v}" for v in visuals if v]))
            return "\n".join(parts).strip()

        # Update pages from cards unless only regenerating copywriting
        if not copywriting_only:
            for page, card in zip(pages, normalized_cards):
                heading = (card.get("heading") or "").strip()
                bullets = card.get("bullets") if isinstance(card.get("bullets"), list) else []
                role = (card.get("role") or "content").strip().lower()
                page_type = 'cover' if role == 'cover' else ('ending' if role == 'ending' else 'content')

                if heading or bullets:
                    page.set_outline_content({
                        'title': heading or (page.get_outline_content() or {}).get('title', ''),
                        'points': [b for b in bullets if b] or (page.get_outline_content() or {}).get('points', []),
                    })

                desc_text = _to_description(card)
                if desc_text:
                    page.set_description_content({
                        "text": desc_text,
                        "generated_at": datetime.utcnow().isoformat()
                    })
                    page.status = 'DESCRIPTION_GENERATED'
                page.page_type = page_type

        payload = {
            "product_type": "xiaohongshu",
            "mode": "vertical_carousel",
            "aspect_ratio": aspect_ratio,
            "image_count": image_count,
            "copywriting": copywriting,
            "style_pack": style_pack if style_pack else existing_style_pack,
            "cards": normalized_cards if not copywriting_only else (existing_cards or normalized_cards),
            "material_plan": material_plan,
        }
        project.product_payload = json.dumps(payload, ensure_ascii=False)
        if not copywriting_only:
            project.status = 'DESCRIPTIONS_GENERATED'
        project.updated_at = datetime.utcnow()

        db.session.commit()

        return success_response({
            "project_id": project_id,
            "pages": [page.to_dict() for page in pages],
            "product_payload": project.product_payload
        })
    except Exception as e:
        db.session.rollback()
        logger.error(f"generate_xhs_blueprint failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/tasks/<task_id>', methods=['GET'])
def get_task_status(project_id, task_id):
    """
    GET /api/projects/{project_id}/tasks/{task_id} - Get task status
    """
    try:
        task = Task.query.get(task_id)
        
        if not task or task.project_id != project_id:
            return not_found('Task')
        
        return success_response(task.to_dict())
    
    except Exception as e:
        logger.error(f"get_task_status failed: {str(e)}", exc_info=True)
        return error_response('SERVER_ERROR', str(e), 500)


@project_bp.route('/<project_id>/refine/outline', methods=['POST'])
def refine_outline(project_id):
    """
    POST /api/projects/{project_id}/refine/outline - Refine outline based on user requirements
    
    Request body:
    {
        "user_requirement": "用户要求，例如：增加一页关于XXX的内容",
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json()
        
        if not data or not data.get('user_requirement'):
            return bad_request("user_requirement is required")
        
        user_requirement = data['user_requirement']
        
        # IMPORTANT: Expire all cached objects to ensure we get fresh data from database
        # This prevents issues when multiple refine operations are called in sequence
        db.session.expire_all()
        
        # Get current outline from pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        # Reconstruct current outline from pages (如果没有页面，使用空列表)
        if not pages:
            logger.info(f"项目 {project_id} 当前没有页面，将从空开始生成")
            current_outline = []  # 空大纲
        else:
            current_outline = ProjectService.reconstruct_outline_from_pages(pages)
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for refine_outline")
            for rf in reference_files_content:
                logger.info(f"  - {rf['filename']}: {len(rf['content'])} characters")
        else:
            logger.info(f"No reference files found for project {project_id}")
        
        project_context = ProjectContext(project.to_dict(), reference_files_content)
        
        # Get previous requirements and language from request
        previous_requirements = data.get('previous_requirements', [])
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Refine outline
        logger.info(f"开始修改大纲: 项目 {project_id}, 用户要求: {user_requirement}, 历史要求数: {len(previous_requirements)}")
        refined_outline = ai_service.refine_outline(
            current_outline=current_outline,
            user_requirement=user_requirement,
            project_context=project_context,
            previous_requirements=previous_requirements,
            language=language
        )
        
        # Flatten outline to pages
        pages_data = ai_service.flatten_outline(refined_outline)
        
        # 在删除旧页面之前，先保存已有的页面描述（按标题匹配）
        old_pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        descriptions_map = {}  # {title: description_content}
        old_status_map = {}  # {title: status} 用于保留状态
        
        for old_page in old_pages:
            old_outline = old_page.get_outline_content()
            if old_outline and old_outline.get('title'):
                title = old_outline.get('title')
                if old_page.description_content:
                    descriptions_map[title] = old_page.description_content
                # 如果旧页面已经有描述，保留状态
                if old_page.status in ['DESCRIPTION_GENERATED', 'IMAGE_GENERATED']:
                    old_status_map[title] = old_page.status
        
        # Delete existing pages (using ORM session to trigger cascades)
        for old_page in old_pages:
            db.session.delete(old_page)
        
        # Create pages from refined outline
        pages_list = []
        has_descriptions = False
        preserved_count = 0
        new_count = 0
        
        for i, page_data in enumerate(pages_data):
            page = Page(
                project_id=project_id,
                order_index=i,
                part=page_data.get('part'),
                status='DRAFT'
            )
            page.set_outline_content({
                'title': page_data.get('title'),
                'points': page_data.get('points', [])
            })
            
            # 尝试匹配并恢复已有的描述
            title = page_data.get('title')
            if title in descriptions_map:
                # 恢复描述内容
                page.description_content = descriptions_map[title]
                # 恢复状态（如果有）
                if title in old_status_map:
                    page.status = old_status_map[title]
                else:
                    page.status = 'DESCRIPTION_GENERATED'
                has_descriptions = True
                preserved_count += 1
            else:
                # 新页面或标题改变的页面，描述为空
                # 这包括：新增的页面、合并的页面、标题改变的页面
                page.status = 'DRAFT'
                new_count += 1
            
            db.session.add(page)
            pages_list.append(page)
        
        logger.info(f"描述匹配完成: 保留了 {preserved_count} 个页面的描述, {new_count} 个页面需要重新生成描述")
        
        # Update project status
        # 如果所有页面都有描述，保持 DESCRIPTION_GENERATED 状态
        # 否则降级为 OUTLINE_GENERATED
        if has_descriptions and all(p.description_content for p in pages_list):
            project.status = 'DESCRIPTIONS_GENERATED'
        else:
            project.status = 'OUTLINE_GENERATED'
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"大纲修改完成: 项目 {project_id}, 创建了 {len(pages_list)} 个页面")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages_list],
            'message': '大纲修改成功'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"refine_outline failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)


@project_bp.route('/<project_id>/refine/descriptions', methods=['POST'])
def refine_descriptions(project_id):
    """
    POST /api/projects/{project_id}/refine/descriptions - Refine page descriptions based on user requirements
    
    Request body:
    {
        "user_requirement": "用户要求，例如：让描述更详细一些",
        "language": "zh"  # output language: zh, en, ja, auto
    }
    """
    try:
        project = Project.query.get(project_id)
        
        if not project:
            return not_found('Project')
        
        data = request.get_json()
        
        if not data or not data.get('user_requirement'):
            return bad_request("user_requirement is required")
        
        user_requirement = data['user_requirement']
        
        db.session.expire_all()
        
        # Get current pages
        pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
        
        if not pages:
            logger.info(f"项目 {project_id} 当前没有页面，无法修改描述")
            return bad_request("No pages found for project. Please generate outline first.")
        
        # Check if pages have descriptions (允许没有描述，从空开始)
        has_descriptions = any(page.description_content for page in pages)
        if not has_descriptions:
            logger.info(f"项目 {project_id} 当前没有描述，将基于大纲生成新描述")
        
        # Reconstruct outline from pages
        outline = ProjectService.reconstruct_outline_from_pages(pages)
        
        # Prepare current descriptions
        current_descriptions = []
        for i, page in enumerate(pages):
            outline_content = page.get_outline_content()
            desc_content = page.get_description_content()
            
            current_descriptions.append({
                'index': i,
                'title': outline_content.get('title', '未命名') if outline_content else '未命名',
                'description_content': desc_content if desc_content else ''
            })
        
        # Get singleton AI service instance
        ai_service = get_ai_service()
        
        # Get reference files content and create project context
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for refine_descriptions")
            for rf in reference_files_content:
                logger.info(f"  - {rf['filename']}: {len(rf['content'])} characters")
        else:
            logger.info(f"No reference files found for project {project_id}")
        
        project_context = ProjectContext(project.to_dict(), reference_files_content)
        
        # Get previous requirements and language from request
        previous_requirements = data.get('previous_requirements', [])
        language = data.get('language', current_app.config.get('OUTPUT_LANGUAGE', 'zh'))
        
        # Refine descriptions
        logger.info(f"开始修改页面描述: 项目 {project_id}, 用户要求: {user_requirement}, 历史要求数: {len(previous_requirements)}")
        refined_descriptions = ai_service.refine_descriptions(
            current_descriptions=current_descriptions,
            user_requirement=user_requirement,
            project_context=project_context,
            outline=outline,
            previous_requirements=previous_requirements,
            language=language
        )
        
        # 验证返回的描述数量
        if len(refined_descriptions) != len(pages):
            error_msg = ""
            logger.error(f"AI 返回的描述数量不匹配: 期望 {len(pages)} 个页面，实际返回 {len(refined_descriptions)} 个描述。")
            
            # 如果 AI 试图增删页面，给出明确提示
            if len(refined_descriptions) > len(pages):
                error_msg += " 提示：如需增加页面，请在大纲页面进行操作。"
            elif len(refined_descriptions) < len(pages):
                error_msg += " 提示：如需删除页面，请在大纲页面进行操作。"
            
            return bad_request(error_msg)
        
        # Update pages with refined descriptions
        for page, refined_desc in zip(pages, refined_descriptions):
            desc_content = {
                "text": refined_desc,
                "generated_at": datetime.utcnow().isoformat()
            }
            page.set_description_content(desc_content)
            page.status = 'DESCRIPTION_GENERATED'
        
        # Update project status
        project.status = 'DESCRIPTIONS_GENERATED'
        project.updated_at = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"页面描述修改完成: 项目 {project_id}, 更新了 {len(pages)} 个页面")
        
        # Return pages
        return success_response({
            'pages': [page.to_dict() for page in pages],
            'message': '页面描述修改成功'
        })
    
    except Exception as e:
        db.session.rollback()
        logger.error(f"refine_descriptions failed: {str(e)}", exc_info=True)
        return error_response('AI_SERVICE_ERROR', str(e), 503)
