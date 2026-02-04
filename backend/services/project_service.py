"""
Project Service - provides utility functions for project-related operations.

This module contains helper functions extracted from project_controller.py
to improve code organization and reusability.
"""
import json
import logging
from datetime import datetime
from pathlib import Path

from flask import current_app
from sqlalchemy import desc
from sqlalchemy.orm import joinedload

from config import Config
from models import db, Project, Page, Material, ReferenceFile, Task
from services.ai_service import ProjectContext
from services.task_manager import task_manager

logger = logging.getLogger(__name__)


class ProjectService:
    """
    Service class providing static utility methods for project operations.

    All methods are static and stateless, designed for reuse across
    controllers and other services.
    """

    @staticmethod
    def guess_is_image_filename(filename: str) -> bool:
        """
        Guess if a filename represents an image based on its extension.

        Args:
            filename: The filename to check

        Returns:
            True if the filename has a common image extension, False otherwise
        """
        ext = (filename or "").split(".")[-1].lower().strip()
        return ext in {"png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "bmp"}

    @staticmethod
    def collect_project_outline_image_attachments(project_id: str, max_images: int = 10) -> list:
        """
        Collect local image paths to be sent as multimodal attachments for outline generation.

        Priority:
        - asset materials (note.type == asset)
        - image-type reference_files (by file_type/filename)

        Args:
            project_id: The project ID
            max_images: Maximum number of images to collect (default: 10)

        Returns:
            List of local file paths to image files
        """
        paths: list[str] = []

        # 1) asset materials (fallback for legacy materials without note)
        try:
            materials = Material.query.filter_by(project_id=project_id).order_by(Material.created_at.asc()).all()
        except Exception:
            materials = []
        for m in materials:
            note_data = None
            if m.note:
                try:
                    note_data = json.loads(m.note)
                except Exception:
                    note_data = None
            if isinstance(note_data, dict):
                if note_data.get("type") in {"xhs", "infographic"}:
                    continue
                if note_data.get("type") != "asset":
                    continue
            try:
                if m.relative_path:
                    p = (Path(Config.UPLOAD_FOLDER) / m.relative_path).resolve()
                    if p.exists():
                        paths.append(str(p))
            except Exception:
                continue

        # 2) image reference files
        try:
            ref_files = ReferenceFile.query.filter_by(project_id=project_id).all()
        except Exception:
            ref_files = []
        for rf in ref_files:
            if len(paths) >= max_images:
                break
            try:
                is_image = (rf.file_type or "").lower() in {"png", "jpg", "jpeg", "webp", "gif", "heic", "heif", "bmp"} or ProjectService.guess_is_image_filename(rf.filename)
                if not is_image:
                    continue
                p = (Path(Config.UPLOAD_FOLDER) / (rf.file_path or "")).resolve()
                if p.exists():
                    paths.append(str(p))
            except Exception:
                continue

        # unique + limit
        uniq = []
        seen = set()
        for p in paths:
            if p in seen:
                continue
            seen.add(p)
            uniq.append(p)
            if len(uniq) >= max_images:
                break
        return uniq

    @staticmethod
    def get_project_asset_material_summaries(project_id: str, max_items: int = 10) -> list:
        """
        Build lightweight summaries for project asset materials to feed into outline generation.

        Args:
            project_id: The project ID
            max_items: Maximum number of items to return (default: 10)

        Returns:
            List of dicts with keys: filename, content
        """
        try:
            materials = Material.query.filter_by(project_id=project_id).order_by(Material.created_at.asc()).all()
        except Exception:
            materials = []

        asset_materials = []
        for m in materials:
            # Exclude generated xhs materials and keep only explicit assets.
            note_data = None
            if m.note:
                try:
                    note_data = json.loads(m.note)
                except Exception:
                    note_data = None
            if isinstance(note_data, dict):
                if note_data.get("type") == "xhs":
                    continue
                if note_data.get("type") == "infographic":
                    continue
                if note_data.get("type") != "asset":
                    continue
            asset_materials.append(m)

        if not asset_materials:
            return []

        # Limit to avoid excessive latency/cost
        asset_materials = asset_materials[: max(0, int(max_items or 10))]

        # Caption each asset image on demand (no persistence required for outline)
        try:
            from services.file_parser_service import FileParserService
            parser = FileParserService(
                mineru_token=current_app.config.get('MINERU_TOKEN', ''),
                mineru_api_base=current_app.config.get('MINERU_API_BASE', ''),
                google_api_key=current_app.config.get('GOOGLE_API_KEY', ''),
                google_api_base=current_app.config.get('GOOGLE_API_BASE', ''),
                openai_api_key=current_app.config.get('OPENAI_API_KEY', ''),
                openai_api_base=current_app.config.get('OPENAI_API_BASE', ''),
                image_caption_model=current_app.config.get('IMAGE_CAPTION_MODEL', getattr(Config, 'IMAGE_CAPTION_MODEL', 'gemini-3-flash-preview')),
                provider_format=current_app.config.get('AI_PROVIDER_FORMAT', 'gemini')
            )
        except Exception as e:
            logger.warning(f"Failed to init FileParserService for asset captions: {str(e)}")
            return []

        summaries = []
        for m in asset_materials:
            local_path = None
            try:
                if m.relative_path:
                    local_path = str((Path(Config.UPLOAD_FOLDER) / m.relative_path).resolve())
            except Exception:
                local_path = None
            try:
                caption = parser._generate_single_caption(local_path or (m.url or ""))
            except Exception:
                caption = ""
            caption = (caption or "").strip() or "（未识别到清晰内容）"
            summaries.append({
                "filename": f"[素材图] {m.display_name or m.filename or m.id}",
                "content": caption
            })
        return summaries

    @staticmethod
    def get_project_reference_files_content(project_id: str) -> list:
        """
        Get reference files content for a project.

        Args:
            project_id: Project ID

        Returns:
            List of dicts with 'filename' and 'content' keys
        """
        reference_files = ReferenceFile.query.filter_by(
            project_id=project_id,
            parse_status='completed'
        ).all()

        files_content = []
        for ref_file in reference_files:
            if ref_file.markdown_content:
                files_content.append({
                    'filename': ref_file.filename,
                    'content': ref_file.markdown_content
                })

        return files_content

    @staticmethod
    def reconstruct_outline_from_pages(pages: list) -> list:
        """
        Reconstruct outline structure from Page objects.

        Args:
            pages: List of Page objects ordered by order_index

        Returns:
            Outline structure (list) with optional part grouping
        """
        outline = []
        current_part = None
        current_part_pages = []

        for page in pages:
            outline_content = page.get_outline_content()
            if not outline_content:
                continue

            page_data = outline_content.copy()

            # 如果当前页面属于一个 part
            if page.part:
                # 如果这是新的 part，先保存之前的 part（如果有）
                if current_part and current_part != page.part:
                    outline.append({
                        "part": current_part,
                        "pages": current_part_pages
                    })
                    current_part_pages = []

                current_part = page.part
                # 移除 part 字段，因为它在顶层
                if 'part' in page_data:
                    del page_data['part']
                current_part_pages.append(page_data)
            else:
                # 如果当前页面不属于任何 part，先保存之前的 part（如果有）
                if current_part:
                    outline.append({
                        "part": current_part,
                        "pages": current_part_pages
                    })
                    current_part = None
                    current_part_pages = []

                # 直接添加页面
                outline.append(page_data)

        # 保存最后一个 part（如果有）
        if current_part:
            outline.append({
                "part": current_part,
                "pages": current_part_pages
            })

        return outline

    @staticmethod
    def build_project_context(project_id: str, **overrides) -> ProjectContext:
        """
        Build a ProjectContext for the given project.

        This method encapsulates the common pattern of:
        1. Fetching the project from the database
        2. Getting reference files content
        3. Instantiating and returning a ProjectContext

        Args:
            project_id: The project ID
            **overrides: Optional overrides to pass to ProjectContext
                - reference_files_content: Override the default reference files content
                - include_asset_summaries: If True, include asset material summaries (default: False)

        Returns:
            ProjectContext instance

        Raises:
            ValueError: If the project is not found
        """
        project = Project.query.get(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")

        # Get reference files content (can be overridden)
        reference_files_content = overrides.get('reference_files_content')
        if reference_files_content is None:
            reference_files_content = ProjectService.get_project_reference_files_content(project_id)

        # Optionally include asset summaries
        if overrides.get('include_asset_summaries', False):
            asset_summaries = ProjectService.get_project_asset_material_summaries(project_id, max_items=10)
            if asset_summaries:
                reference_files_content = reference_files_content + asset_summaries

        return ProjectContext(project, reference_files_content)

    @staticmethod
    def prepare_image_generation_context(project_id: str, use_template: bool = None, language: str = None) -> dict:
        """
        Prepare the context needed for image generation.

        This method extracts the pre-generation logic including:
        - Template/style determination
        - Cache reading for refined styles
        - Extra requirements merging

        Args:
            project_id: The project ID
            use_template: Whether to use template (None for auto-detect)
            language: Language for generation (defaults to config OUTPUT_LANGUAGE)

        Returns:
            Dict containing:
                - project: The Project object
                - use_template: Resolved boolean for template usage
                - has_template_resource: Whether template resources exist
                - effective_template_style: The resolved template style
                - combined_requirements: Merged extra requirements with style
                - no_template_mode: Whether in no-template mode

        Raises:
            ValueError: If the project is not found
        """
        from flask import current_app
        from services import FileService
        from services.ai_service_manager import get_ai_service, get_cached_refined_template_style

        project = Project.query.get(project_id)
        if not project:
            raise ValueError(f"Project not found: {project_id}")

        # Resolve language
        if language is None:
            language = current_app.config.get('OUTPUT_LANGUAGE', 'zh')

        # Check for template resources
        file_service = FileService(current_app.config['UPLOAD_FOLDER'])
        template_variants = project.get_template_variants() if hasattr(project, 'get_template_variants') else {}
        has_variant_template = any(bool(v) for v in template_variants.values())
        has_template_image = bool(file_service.get_template_path(project_id))
        has_template_resource = has_template_image or has_variant_template

        # Resolve use_template (auto-detect if not specified)
        if use_template is None:
            use_template = has_template_resource
        elif isinstance(use_template, str):
            use_template = use_template.lower() == 'true'
        else:
            use_template = bool(use_template)

        # Determine no-template mode
        no_template_mode = (not has_template_resource) or (use_template is False)
        effective_template_style = (project.template_style or "").strip()

        if no_template_mode:
            # Build project context and get outline text
            project_context = ProjectService.build_project_context(project_id)
            ai_service = get_ai_service()

            # Get outline for style generation
            pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
            outline = ProjectService.reconstruct_outline_from_pages(pages)
            outline_text = project.outline_text or ai_service.generate_outline_text(outline)

            if not effective_template_style:
                # No style description: auto-generate and persist
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
                # Has style description: use cached refined version
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

        # Merge extra requirements with style description
        combined_requirements = project.extra_requirements or ""
        if effective_template_style:
            style_requirement = f"\n\nppt页面风格描述：\n\n{effective_template_style}"
            combined_requirements = combined_requirements + style_requirement

        return {
            'project': project,
            'use_template': use_template,
            'has_template_resource': has_template_resource,
            'effective_template_style': effective_template_style,
            'combined_requirements': combined_requirements,
            'no_template_mode': no_template_mode,
            'language': language
        }

    @staticmethod
    def generate_outline_workflow(project_id: str, project, ai_service, data: dict, language: str) -> list:
        """
        Core workflow for generating outline from project.

        This method handles:
        - Preparing context (reference files, asset materials, images)
        - Calling AI Service to generate outline
        - Deleting old pages & creating new pages
        - Updating project status
        - Returning pages list

        Args:
            project_id: The project ID
            project: The Project object
            ai_service: The AI service instance
            data: Request data dict containing optional 'idea_prompt', 'page_count'
            language: Output language code (e.g., 'zh', 'en')

        Returns:
            List of created Page objects
        """
        page_count = data.get('page_count')
        if page_count is not None:
            try:
                page_count = int(page_count)
            except Exception:
                page_count = None
            if page_count is not None and page_count < 1:
                page_count = None

        # Get reference files content
        reference_files_content = ProjectService.get_project_reference_files_content(project_id)
        if reference_files_content:
            logger.info(f"Found {len(reference_files_content)} reference files for project {project_id}")

        # Generate outline based on creation type
        if project.creation_type == 'outline':
            # Parse user-provided outline text
            project_context = ProjectContext(project, reference_files_content)
            outline = ai_service.parse_outline_text(project_context, language=language)
        else:
            # Generate outline from idea
            idea_prompt = data.get('idea_prompt') or project.idea_prompt
            if idea_prompt:
                project.idea_prompt = idea_prompt

            # Add asset material summaries
            asset_summaries = ProjectService.get_project_asset_material_summaries(project_id, max_items=10)
            if asset_summaries:
                reference_files_content = reference_files_content + asset_summaries

            project_context = ProjectContext(project, reference_files_content)

            # Use multimodal generation if images are available
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

        return pages_list

    @staticmethod
    def submit_background_task(
        project_id: str,
        task_type: str,
        task_func,
        progress_total: int = 0,
        **kwargs
    ) -> str:
        """
        Unified template for submitting background tasks.

        This method handles:
        - Creating a Task record with initial progress
        - Submitting to TaskManager
        - Returning the task ID

        Args:
            project_id: The project ID
            task_type: Task type string (e.g., 'GENERATE_DESCRIPTIONS', 'GENERATE_IMAGES')
            task_func: The task function to execute
            progress_total: Total items for progress tracking (default: 0)
            **kwargs: Additional arguments to pass to task_func

        Returns:
            The created task ID as string
        """
        # Create task record
        task = Task(
            project_id=project_id,
            task_type=task_type,
            status='PENDING'
        )
        task.set_progress({
            'total': progress_total,
            'completed': 0,
            'failed': 0
        })

        db.session.add(task)
        db.session.commit()

        # Submit to task manager
        task_manager.submit_task(
            task.id,
            task_func,
            **kwargs
        )

        return task.id

    # =========================================================================
    # CRUD Operations
    # =========================================================================

    @staticmethod
    def list_projects(limit: int = 50, offset: int = 0) -> dict:
        """
        List projects with pagination.

        Args:
            limit: Number of projects to return (1-100, default: 50)
            offset: Offset for pagination (default: 0)

        Returns:
            Dict containing:
                - projects: List of project dicts with pages
                - has_more: Boolean indicating if more projects exist
                - limit: Applied limit
                - offset: Applied offset
        """
        # Enforce limits to prevent performance issues
        limit = min(max(1, limit), 100)  # Between 1-100
        offset = max(0, offset)  # Non-negative

        # Fetch limit + 1 items to check for more pages efficiently
        projects_with_extra = Project.query\
            .options(joinedload(Project.pages))\
            .order_by(desc(Project.updated_at))\
            .limit(limit + 1)\
            .offset(offset)\
            .all()

        # Check if there are more items beyond the current page
        has_more = len(projects_with_extra) > limit
        # Return only the requested limit
        projects = projects_with_extra[:limit]

        return {
            'projects': [project.to_dict(include_pages=True) for project in projects],
            'has_more': has_more,
            'limit': limit,
            'offset': offset
        }

    @staticmethod
    def create_project(data: dict) -> Project:
        """
        Create a new project.

        Args:
            data: Dict containing project data:
                - creation_type: 'idea', 'outline', or 'descriptions' (required)
                - idea_prompt: Optional idea prompt
                - outline_text: Optional outline text
                - description_text: Optional description text
                - template_style: Optional template style
                - product_type: 'ppt', 'infographic', or 'xiaohongshu' (default: 'ppt')

        Returns:
            Created Project object

        Raises:
            ValueError: If creation_type is invalid or missing
        """
        creation_type = data.get('creation_type')
        if not creation_type:
            raise ValueError("creation_type is required")

        if creation_type not in ['idea', 'outline', 'descriptions']:
            raise ValueError("Invalid creation_type")

        product_type = (data.get('product_type') or 'ppt').strip().lower()
        if product_type not in ['ppt', 'infographic', 'xiaohongshu']:
            raise ValueError("Invalid product_type")

        # Create project
        project = Project(
            creation_type=creation_type,
            idea_prompt=data.get('idea_prompt'),
            outline_text=data.get('outline_text'),
            description_text=data.get('description_text'),
            template_style=data.get('template_style'),
            product_type=product_type,
            status='DRAFT'
        )

        db.session.add(project)
        db.session.commit()

        return project

    @staticmethod
    def update_project(project: Project, data: dict) -> Project:
        """
        Update a project with the provided data.

        Args:
            project: The Project object to update
            data: Dict containing fields to update:
                - idea_prompt: Optional
                - extra_requirements: Optional
                - template_style: Optional
                - product_payload: Optional
                - export_extractor_method: Optional
                - export_inpaint_method: Optional
                - pages_order: Optional list of page IDs for reordering

        Returns:
            Updated Project object
        """
        # Update simple fields if provided
        if 'idea_prompt' in data:
            project.idea_prompt = data['idea_prompt']

        if 'extra_requirements' in data:
            project.extra_requirements = data['extra_requirements']

        if 'template_style' in data:
            project.template_style = data['template_style']

        if 'product_payload' in data:
            project.product_payload = data['product_payload']

        if 'export_extractor_method' in data:
            project.export_extractor_method = data['export_extractor_method']

        if 'export_inpaint_method' in data:
            project.export_inpaint_method = data['export_inpaint_method']

        # Update page order if provided
        if 'pages_order' in data:
            pages_order = data['pages_order']
            # Optimization: batch query all pages to update, avoiding N+1 queries
            pages_to_update = Page.query.filter(
                Page.id.in_(pages_order),
                Page.project_id == project.id
            ).all()

            # Create page_id -> page mapping for O(1) lookup
            pages_map = {page.id: page for page in pages_to_update}

            # Batch update order
            for index, page_id in enumerate(pages_order):
                if page_id in pages_map:
                    pages_map[page_id].order_index = index

        project.updated_at = datetime.utcnow()
        db.session.commit()

        return project

    @staticmethod
    def delete_project(project: Project, upload_folder: str) -> None:
        """
        Delete a project and all associated resources.

        This method handles:
        - Deleting reference files from disk and database
        - Deleting project files via FileService
        - Deleting project from database (cascade deletes pages and tasks)

        Args:
            project: The Project object to delete
            upload_folder: Path to the upload folder

        Returns:
            None
        """
        project_id = project.id

        # Delete project-scoped reference files (DB rows + disk files)
        try:
            reference_files = ReferenceFile.query.filter_by(project_id=project_id).all()
            for rf in reference_files:
                # Best-effort disk cleanup
                try:
                    file_path = Path(upload_folder) / rf.file_path
                    if file_path.exists():
                        file_path.unlink()
                except Exception as file_err:
                    logger.warning(
                        f"Failed to delete reference file from disk (id={rf.id}): {file_err}"
                    )

                db.session.delete(rf)
        except Exception as ref_err:
            # Do not block project deletion if reference files cleanup fails
            logger.warning(f"Reference files cleanup failed: {ref_err}", exc_info=True)

        # Delete project files
        from services import FileService
        file_service = FileService(upload_folder)
        file_service.delete_project_files(project_id)

        # Delete project from database (cascade will delete pages and tasks)
        db.session.delete(project)
        db.session.commit()
