"""
Task Manager - handles background tasks using ThreadPoolExecutor
No need for Celery or Redis, uses in-memory task tracking
"""
import logging
import threading
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from typing import Callable, List, Dict, Any
from datetime import datetime
from sqlalchemy import func
from models import db, Task, Page, Project, Material, PageImageVersion, XhsCardImageVersion, ReferenceFile
from services import ProjectContext
from utils import get_filtered_pages
from pathlib import Path

logger = logging.getLogger(__name__)


class TaskManager:
    """Simple task manager using ThreadPoolExecutor"""
    
    def __init__(self, max_workers: int = 4):
        """Initialize task manager"""
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.active_tasks = {}  # task_id -> Future
        self.lock = threading.Lock()
    
    def submit_task(self, task_id: str, func: Callable, *args, **kwargs):
        """Submit a background task"""
        future = self.executor.submit(func, task_id, *args, **kwargs)
        
        with self.lock:
            self.active_tasks[task_id] = future
        
        # Add callback to clean up when done and log exceptions
        future.add_done_callback(lambda f: self._task_done_callback(task_id, f))
    
    def _task_done_callback(self, task_id: str, future):
        """Handle task completion and log any exceptions"""
        try:
            # Check if task raised an exception
            exception = future.exception()
            if exception:
                logger.error(f"Task {task_id} failed with exception: {exception}", exc_info=exception)
        except Exception as e:
            logger.error(f"Error in task callback for {task_id}: {e}", exc_info=True)
        finally:
            self._cleanup_task(task_id)
    
    def _cleanup_task(self, task_id: str):
        """Clean up completed task"""
        with self.lock:
            if task_id in self.active_tasks:
                del self.active_tasks[task_id]
    
    def is_task_active(self, task_id: str) -> bool:
        """Check if task is still running"""
        with self.lock:
            return task_id in self.active_tasks
    
    def shutdown(self):
        """Shutdown the executor"""
        self.executor.shutdown(wait=True)


# Global task manager instance
task_manager = TaskManager(max_workers=4)


def infer_page_type(page: Page, total_pages: int) -> str:
    """
    Infer page type based on order and title keywords.
    """
    explicit_type = (page.page_type or 'auto').strip()
    if explicit_type != 'auto':
        return explicit_type

    if page.order_index == 0:
        return 'cover'
    if total_pages > 0 and page.order_index == total_pages - 1:
        return 'ending'

    title = ''
    outline_content = page.get_outline_content() or {}
    if isinstance(outline_content, dict):
        title = outline_content.get('title', '') or ''

    title_lower = title.lower()
    transition_keywords = ['过渡', '章节', '部分', '目录', '篇章', 'section', 'part', 'agenda', 'outline', 'overview']
    ending_keywords = ['结尾', '总结', '致谢', '谢谢', 'ending', 'summary', 'thanks', 'q&a', 'qa', '结论', '回顾']

    if any(keyword in title_lower for keyword in transition_keywords):
        return 'transition'
    if any(keyword in title_lower for keyword in ending_keywords):
        return 'ending'

    return 'content'


def _parse_template_variants(project: Project) -> Dict[str, str]:
    if project.template_variants:
        try:
            data = json.loads(project.template_variants)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _parse_template_sets(project: Project) -> Dict[str, Dict[str, Any]]:
    if getattr(project, 'template_sets', None):
        try:
            data = json.loads(project.template_sets)
            return data if isinstance(data, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def _get_project_reference_files_content(project_id: str) -> List[Dict[str, str]]:
    """
    Get reference files content for a project (completed only).
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


def _append_template_variant_history(active_set: Dict[str, Any], variant_type: str, relative_path: str,
                                     max_history: int = 10) -> Dict[str, Any]:
    if not isinstance(active_set, dict):
        active_set = {}
    history = active_set.get('template_variants_history')
    if not isinstance(history, dict):
        history = {}
    items = history.get(variant_type)
    if not isinstance(items, list):
        items = []
    # 去重并置顶最新
    items = [p for p in items if p and p != relative_path]
    items.insert(0, relative_path)
    if max_history and len(items) > max_history:
        items = items[:max_history]
    history[variant_type] = items
    active_set['template_variants_history'] = history
    return active_set


def pick_template_for_page(project: Project, page: Page, total_pages: int, file_service) -> str | None:
    """
    Pick template image path based on page type and project template variants.
    Falls back to content -> template_image_path -> None.
    """
    template_variants = _parse_template_variants(project)
    page_type = infer_page_type(page, total_pages)

    candidate_rel_path = template_variants.get(page_type)
    if not candidate_rel_path and page_type != 'content':
        candidate_rel_path = template_variants.get('content')

    if candidate_rel_path:
        absolute_path = file_service.get_absolute_path(candidate_rel_path)
        if Path(absolute_path).exists():
            return absolute_path

    return file_service.get_template_path(project.id)

def save_image_with_version(image, project_id: str, page_id: str, file_service,
                            page_obj=None, image_format: str = 'PNG') -> tuple[str, int]:
    """
    保存图片并创建历史版本记录的公共函数

    Args:
        image: PIL Image 对象
        project_id: 项目ID
        page_id: 页面ID
        file_service: FileService 实例
        page_obj: Page 对象（可选，如果提供则更新页面状态）
        image_format: 图片格式，默认 PNG

    Returns:
        tuple: (image_path, version_number) - 图片路径和版本号

    这个函数会：
    1. 计算下一个版本号（使用 MAX 查询确保安全）
    2. 标记所有旧版本为非当前版本
    3. 保存图片到最终位置
    4. 生成并保存压缩的缓存图片
    5. 创建新版本记录
    6. 如果提供了 page_obj，更新页面状态和图片路径
    """
    # 使用 MAX 查询确保版本号安全（即使有版本被删除也不会重复）
    max_version = db.session.query(func.max(PageImageVersion.version_number)).filter_by(page_id=page_id).scalar() or 0
    next_version = max_version + 1

    # 批量更新：标记所有旧版本为非当前版本（使用单条 SQL 更高效）
    PageImageVersion.query.filter_by(page_id=page_id).update({'is_current': False})

    # 保存原图到最终位置（使用版本号）
    image_path = file_service.save_generated_image(
        image, project_id, page_id,
        version_number=next_version,
        image_format=image_format
    )

    # 生成并保存压缩的缓存图片（用于前端快速显示）
    cached_image_path = file_service.save_cached_image(
        image, project_id, page_id,
        version_number=next_version,
        quality=85
    )

    # 创建新版本记录
    new_version = PageImageVersion(
        page_id=page_id,
        image_path=image_path,
        version_number=next_version,
        is_current=True
    )
    db.session.add(new_version)

    # 如果提供了 page_obj，更新页面状态和图片路径
    if page_obj:
        page_obj.generated_image_path = image_path
        page_obj.cached_image_path = cached_image_path
        page_obj.status = 'COMPLETED'
        page_obj.updated_at = datetime.utcnow()

    # 提交事务
    db.session.commit()

    logger.debug(f"Page {page_id} image saved as version {next_version}: {image_path}, cached: {cached_image_path}")

    return image_path, next_version


def save_xhs_card_version(project_id: str, card_index: int, material_id: str) -> XhsCardImageVersion:
    """
    保存小红书卡片版本，并标记为当前版本。
    """
    max_version = db.session.query(func.max(XhsCardImageVersion.version_number))\
        .filter_by(project_id=project_id, index=card_index).scalar() or 0
    next_version = max_version + 1
    XhsCardImageVersion.query.filter_by(project_id=project_id, index=card_index)\
        .update({'is_current': False})
    version = XhsCardImageVersion(
        project_id=project_id,
        index=card_index,
        material_id=material_id,
        version_number=next_version,
        is_current=True
    )
    db.session.add(version)
    db.session.commit()
    return version


def get_current_xhs_material(project_id: str, card_index: int) -> Material | None:
    """
    获取小红书卡片当前版本对应的素材，如果没有则取最新素材。
    """
    version = XhsCardImageVersion.query.filter_by(
        project_id=project_id,
        index=card_index,
        is_current=True
    ).order_by(XhsCardImageVersion.version_number.desc()).first()
    if version:
        material = Material.query.get(version.material_id)
        if material:
            return material
    materials = Material.query.filter_by(project_id=project_id).all()
    candidates = []
    for m in materials:
        try:
            note = json.loads(m.note or '{}')
        except Exception:
            note = {}
        if note.get('type') == 'xhs' and note.get('mode') == 'vertical_carousel' and int(note.get('index', -1)) == card_index:
            candidates.append(m)
    if not candidates:
        return None
    candidates.sort(key=lambda m: m.created_at or datetime.min, reverse=True)
    return candidates[0]


def update_xhs_payload_material(project: Project, card_index: int, material: Material, role: str):
    payload = {}
    if project.product_payload:
        try:
            payload = json.loads(project.product_payload)
        except Exception:
            payload = {}
    materials_payload = payload.get("materials") if isinstance(payload.get("materials"), list) else []
    materials_payload = [m for m in materials_payload if int(m.get("index", -1) or -1) != card_index]
    materials_payload.append({
        "index": card_index,
        "material_id": material.id,
        "url": material.url,
        "display_name": material.display_name,
        "role": role,
    })
    payload["materials"] = sorted(materials_payload, key=lambda x: int(x.get("index", 0) or 0))
    project.product_payload = json.dumps(payload, ensure_ascii=False)
    project.updated_at = datetime.utcnow()
    db.session.commit()


def generate_infographic_task(task_id: str, project_id: str, ai_service, file_service,
                              outline: List[Dict], mode: str = "single",
                              max_workers: int = 6, aspect_ratio: str = "9:16",
                              resolution: str = "2K", app=None,
                              language: str = None, page_ids: list = None,
                              use_template: bool = True):
    """
    Background task for generating infographic images (single or series).
    Saves results as Material records bound to the project.
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")

    mode = (mode or "single").strip().lower()
    if mode not in ("single", "series"):
        mode = "single"

    with app.app_context():
        try:
            task = Task.query.get(task_id)
            if not task:
                return

            task.status = 'PROCESSING'
            db.session.commit()

            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")

            pages = get_filtered_pages(project_id, page_ids)
            if mode == "series" and not pages:
                raise ValueError("No pages found for project")

            reference_files_content = _get_project_reference_files_content(project_id)
            project_context = ProjectContext(project, reference_files_content)
            outline_text = project.outline_text or ai_service.generate_outline_text(outline)

            template_ref_path = file_service.get_template_path(project_id) if use_template else None
            extra_requirements = (project.extra_requirements or "").strip()
            template_style = (project.template_style or "").strip()

            if mode == "single":
                task.set_progress({"total": 1, "completed": 0, "failed": 0})
                db.session.commit()

                ref_images = []
                if project.description_text:
                    ref_images = ai_service.extract_image_urls_from_markdown(project.description_text)

                blueprint = ai_service.generate_infographic_blueprint(
                    project_context=project_context,
                    outline_text=outline_text,
                    page_title=None,
                    page_desc=None,
                    mode=mode,
                    extra_requirements=extra_requirements,
                    template_style=template_style,
                    language=language
                )
                prompt = ai_service.generate_infographic_image_prompt(
                    blueprint=blueprint,
                    mode=mode,
                    page_title=None,
                    extra_requirements=extra_requirements,
                    template_style=template_style,
                    aspect_ratio=aspect_ratio,
                    language=language
                )

                image = ai_service.generate_image(
                    prompt=prompt,
                    ref_image_path=template_ref_path,
                    additional_ref_images=ref_images or None,
                    aspect_ratio=aspect_ratio,
                    resolution=resolution
                )

                if not image:
                    raise ValueError("Failed to generate infographic image")

                relative_path = file_service.save_material_image(image, project_id)
                relative = Path(relative_path)
                filename = relative.name
                image_url = file_service.get_file_url(project_id, 'materials', filename)

                note = json.dumps({
                    "type": "infographic",
                    "mode": "single",
                    "source": "project",
                    "page_id": None
                }, ensure_ascii=False)

                material = Material(
                    project_id=project_id,
                    filename=filename,
                    relative_path=relative_path,
                    url=image_url,
                    note=note
                )
                db.session.add(material)
                db.session.commit()

                task.status = 'COMPLETED'
                task.completed_at = datetime.utcnow()
                task.set_progress({
                    "total": 1,
                    "completed": 1,
                    "failed": 0,
                    "material_id": material.id,
                    "image_url": image_url
                })
                db.session.commit()
                project.status = 'COMPLETED'
                project.updated_at = datetime.utcnow()
                db.session.commit()
                return

            # series mode
            task.set_progress({"total": len(pages), "completed": 0, "failed": 0})
            db.session.commit()

            completed = 0
            failed = 0

            def _get_page_desc(page_obj: Page) -> str:
                desc_content = page_obj.get_description_content() or {}
                desc_text = desc_content.get('text', '')
                if not desc_text and desc_content.get('text_content'):
                    text_content = desc_content.get('text_content', [])
                    if isinstance(text_content, list):
                        desc_text = '\n'.join(text_content)
                    else:
                        desc_text = str(text_content)
                if not desc_text:
                    outline_content = page_obj.get_outline_content() or {}
                    points = outline_content.get('points') or []
                    if isinstance(points, list):
                        points_text = "\n".join([str(p) for p in points if p])
                    else:
                        points_text = str(points or "")
                    title = outline_content.get('title') or ''
                    desc_text = "\n".join([t for t in [title, points_text] if t])
                return desc_text

            def generate_single_infographic(page_id: str):
                with app.app_context():
                    try:
                        page_obj = Page.query.get(page_id)
                        if not page_obj:
                            raise ValueError(f"Page {page_id} not found")

                        page_desc = _get_page_desc(page_obj)
                        ref_images = ai_service.extract_image_urls_from_markdown(page_desc or "")
                        outline_content = page_obj.get_outline_content() or {}
                        page_title = outline_content.get('title') or ''

                        blueprint = ai_service.generate_infographic_blueprint(
                            project_context=project_context,
                            outline_text=outline_text,
                            page_title=page_title,
                            page_desc=page_desc,
                            mode=mode,
                            extra_requirements=extra_requirements,
                            template_style=template_style,
                            language=language
                        )
                        prompt = ai_service.generate_infographic_image_prompt(
                            blueprint=blueprint,
                            mode=mode,
                            page_title=page_title,
                            extra_requirements=extra_requirements,
                            template_style=template_style,
                            aspect_ratio=aspect_ratio,
                            language=language
                        )

                        image = ai_service.generate_image(
                            prompt=prompt,
                            ref_image_path=template_ref_path,
                            additional_ref_images=ref_images or None,
                            aspect_ratio=aspect_ratio,
                            resolution=resolution
                        )

                        if not image:
                            raise ValueError("Failed to generate infographic image")

                        relative_path = file_service.save_material_image(image, project_id)
                        relative = Path(relative_path)
                        filename = relative.name
                        image_url = file_service.get_file_url(project_id, 'materials', filename)

                        note = json.dumps({
                            "type": "infographic",
                            "mode": "series",
                            "source": "page",
                            "page_id": page_id,
                            "order_index": page_obj.order_index
                        }, ensure_ascii=False)

                        material = Material(
                            project_id=project_id,
                            filename=filename,
                            relative_path=relative_path,
                            url=image_url,
                            note=note
                        )
                        db.session.add(material)
                        db.session.commit()
                        return (page_id, image_url, None)

                    except Exception as e:
                        import traceback
                        logger.error(f"Failed to generate infographic for page {page_id}: {traceback.format_exc()}")
                        return (page_id, None, str(e))

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(generate_single_infographic, page.id)
                    for page in pages
                    if page and page.id
                ]

                for future in as_completed(futures):
                    _, _, error = future.result()
                    if error:
                        failed += 1
                    else:
                        completed += 1

                    task = Task.query.get(task_id)
                    if task:
                        task.update_progress(completed=completed, failed=failed)
                        db.session.commit()

            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.utcnow()
                db.session.commit()
            project = Project.query.get(project_id)
            if project:
                project.status = 'COMPLETED'
                project.updated_at = datetime.utcnow()
                db.session.commit()

        except Exception as e:
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()


def generate_xhs_task(
    task_id: str,
    project_id: str,
    ai_service,
    file_service,
    image_count: int = 7,
    aspect_ratio: str = "3:4",
    resolution: str = "2K",
    max_workers: int = 6,
    use_template: bool = None,
    app=None,
    language: str = None
):
    """
    Background task for generating Xiaohongshu image+text pack (vertical carousel).

    - Generates a JSON blueprint (copywriting + cards + style_pack)
    - Generates N vertical images (cover + content cards)
    - Saves images as Material records and stores structured payload into Project.product_payload
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")

    with app.app_context():
        try:
            task = Task.query.get(task_id)
            if not task:
                return

            task.status = 'PROCESSING'
            db.session.commit()

            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            resolved_use_template = use_template
            if resolved_use_template is None:
                resolved_use_template = bool(project.template_image_path or project.get_template_variants())

            pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()

            # Normalize params (prefer pages length if available)
            if pages:
                total = len(pages)
            else:
                try:
                    total = int(image_count or 7)
                except Exception:
                    total = 7
            if total < 1:
                raise ValueError("XHS pages count must be greater than 0")
            aspect_ratio = (aspect_ratio or "4:5").strip()
            resolution = (resolution or "2K").strip()
            try:
                max_workers = int(max_workers or 6)
            except Exception:
                max_workers = 6
            max_workers = min(16, max(1, max_workers))
            max_workers = min(max_workers, total)

            task.set_progress({"total": total, "completed": 0, "failed": 0})
            db.session.commit()

            reference_files_content = _get_project_reference_files_content(project_id)
            project_context = ProjectContext(project, reference_files_content)

            # Build outline_text fallback (if user didn't provide outline_text)
            outline_text = (project.outline_text or "").strip()
            if not outline_text:
                titles = []
                for p in pages:
                    oc = p.get_outline_content() or {}
                    t = (oc.get('title') or '').strip()
                    if t:
                        titles.append(t)
                if titles:
                    outline_text = "\n".join([f"{i+1}. {t}" for i, t in enumerate(titles)])

            payload = {}
            if project.product_payload:
                try:
                    payload = json.loads(project.product_payload)
                except Exception:
                    payload = {}

            copywriting = payload.get("copywriting") if isinstance(payload.get("copywriting"), dict) else {}
            style_pack = payload.get("style_pack") if isinstance(payload.get("style_pack"), dict) else {}
            payload_cards = payload.get("cards") if isinstance(payload.get("cards"), list) else []

            if not copywriting or not style_pack:
                blueprint = ai_service.generate_xhs_blueprint(
                    project_context=project_context,
                    outline_text=outline_text,
                    image_count=total,
                    aspect_ratio=aspect_ratio,
                    language=language
                )
                if not copywriting:
                    copywriting = blueprint.get("copywriting") if isinstance(blueprint.get("copywriting"), dict) else {}
                if not style_pack:
                    style_pack = blueprint.get("style_pack") if isinstance(blueprint.get("style_pack"), dict) else {}

            if project.template_style:
                style_pack = dict(style_pack or {})
                style_pack["template_style"] = project.template_style
            if project.extra_requirements:
                style_pack = dict(style_pack or {})
                style_pack["extra_requirements"] = project.extra_requirements

            # Normalize cards (prefer pages + description edits)
            normalized_cards: List[Dict[str, Any]] = []
            if pages:
                page_ids = [p.id for p in pages]
                for i, page in enumerate(pages):
                    oc = page.get_outline_content() or {}
                    heading = (oc.get("title") or "").strip()
                    bullets = oc.get("points") if isinstance(oc.get("points"), list) else []
                    desc_content = page.get_description_content() or {}
                    desc_text = desc_content.get("text") or ""
                    if not desc_text and desc_content.get("text_content"):
                        text_content = desc_content.get("text_content", [])
                        if isinstance(text_content, list):
                            desc_text = "\n".join(text_content)
                        else:
                            desc_text = str(text_content)
                    clean_desc = ai_service.remove_markdown_images(desc_text or "")
                    desc_lines = [line.strip() for line in clean_desc.splitlines() if line.strip()]

                    base_card = payload_cards[i] if i < len(payload_cards) and isinstance(payload_cards[i], dict) else {}
                    card = dict(base_card)
                    inferred_role = infer_page_type(page, total)
                    role = inferred_role if inferred_role in ["cover", "content", "ending"] else "content"
                    if not bullets and desc_lines:
                        bullets = desc_lines[:6]

                    card.update({
                        "index": i,
                        "role": role,
                        "heading": heading or card.get("heading", ""),
                        "subheading": card.get("subheading", ""),
                        "bullets": bullets or card.get("bullets", []) or [],
                        "visual_suggestions": card.get("visual_suggestions", []) or [],
                        "ref_images": ai_service.extract_image_urls_from_markdown(desc_text or ""),
                    })
                    # 兜底：描述里没有 bullets 时，用描述文本作为视觉建议
                    if not card.get("visual_suggestions") and desc_lines:
                        card["visual_suggestions"] = desc_lines[:4]
                    normalized_cards.append(card)
            else:
                page_ids = []
                for i in range(total):
                    c = payload_cards[i] if i < len(payload_cards) and isinstance(payload_cards[i], dict) else {}
                    c = dict(c)
                    c["index"] = i
                    c["role"] = (c.get("role") or ("cover" if i == 0 else "content")).strip()
                    normalized_cards.append(c)
                while len(normalized_cards) < total:
                    i = len(normalized_cards)
                    normalized_cards.append(
                        {
                            "index": i,
                            "role": "cover" if i == 0 else "content",
                            "heading": "封面" if i == 0 else f"要点 {i}",
                            "subheading": "",
                            "bullets": [],
                            "visual_suggestions": [],
                            "ref_images": [],
                        }
                    )

            completed = 0
            failed = 0
            results: List[Dict[str, Any]] = []

            def _generate_one(card: Dict[str, Any]) -> Dict[str, Any]:
                with app.app_context():
                    idx = int(card.get("index", 0) or 0)
                    try:
                        template_ref_path = None
                        page_obj = None
                        if page_ids and idx < len(page_ids):
                            page_obj = Page.query.get(page_ids[idx])
                        if resolved_use_template and page_obj:
                            template_ref_path = pick_template_for_page(project, page_obj, total, file_service)
                        prompt = ai_service.generate_xhs_image_prompt(
                            card=card,
                            style_pack=style_pack,
                            aspect_ratio=aspect_ratio,
                            total=total,
                            language=language
                        )
                        image = ai_service.generate_image(
                            prompt=prompt,
                            ref_image_path=template_ref_path,
                            additional_ref_images=card.get("ref_images") or None,
                            aspect_ratio=aspect_ratio,
                            resolution=resolution
                        )
                        if not image:
                            raise ValueError("Failed to generate xhs image")

                        if not page_obj:
                            raise ValueError("Page not found for xhs card")
                        image_path, _ = save_image_with_version(
                            image=image,
                            project_id=project_id,
                            page_id=page_obj.id,
                            file_service=file_service,
                            page_obj=page_obj
                        )
                        display_path = page_obj.cached_image_path or page_obj.generated_image_path or image_path
                        image_url = None
                        if display_path:
                            image_url = file_service.get_file_url(
                                project_id, 'pages', Path(display_path).name
                            )

                        return {
                            "index": idx,
                            "url": image_url,
                            "page_id": page_obj.id,
                            "card": card,
                        }
                    except Exception as e:
                        import traceback
                        logger.error(f"Failed to generate xhs card {idx}: {traceback.format_exc()}")
                        return {"index": idx, "error": str(e), "card": card}

            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [executor.submit(_generate_one, c) for c in normalized_cards]
                for future in as_completed(futures):
                    res = future.result()
                    if res.get("error"):
                        failed += 1
                    else:
                        completed += 1
                        results.append(res)

                    t = Task.query.get(task_id)
                    if t:
                        t.update_progress(completed=completed, failed=failed)
                        db.session.commit()

            # Persist payload to project for history
            results_sorted = sorted(results, key=lambda r: int(r.get("index", 0) or 0))
            cards_for_payload = []
            for c in normalized_cards:
                if isinstance(c, dict):
                    c = dict(c)
                    c.pop("ref_images", None)
                    cards_for_payload.append(c)
            payload = {
                "product_type": "xiaohongshu",
                "mode": "vertical_carousel",
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "image_count": total,
                "copywriting": copywriting,
                "style_pack": style_pack,
                "cards": cards_for_payload,
                "materials": payload.get("materials") if isinstance(payload.get("materials"), list) else [],
            }

            project = Project.query.get(project_id)
            if project:
                project.product_payload = json.dumps(payload, ensure_ascii=False)
                project.updated_at = datetime.utcnow()
                if failed == 0:
                    project.status = 'COMPLETED'
                db.session.commit()

            # Mark task status
            task = Task.query.get(task_id)
            if task:
                task.completed_at = datetime.utcnow()
                if completed == 0 and failed > 0:
                    task.status = 'FAILED'
                else:
                    task.status = 'COMPLETED'
                db.session.commit()

        except Exception as e:
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()


def generate_xhs_single_card_task(
    task_id: str,
    project_id: str,
    card_index: int,
    ai_service,
    file_service,
    aspect_ratio: str = "4:5",
    resolution: str = "2K",
    use_template: bool = None,
    app=None,
    language: str = None
):
    """
    Background task for generating a single Xiaohongshu card image.
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")

    with app.app_context():
        task = Task.query.get(task_id)
        try:
            if not task:
                return

            task.status = 'PROCESSING'
            task.set_progress({"total": 1, "completed": 0, "failed": 0})
            db.session.commit()

            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            resolved_use_template = use_template
            if resolved_use_template is None:
                resolved_use_template = bool(project.template_image_path or project.get_template_variants())

            pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
            if not pages:
                raise ValueError("No pages found for project")

            total = len(pages)
            if card_index < 0 or card_index >= total:
                raise ValueError("card_index out of range")

            aspect_ratio = (aspect_ratio or "4:5").strip()
            resolution = (resolution or "2K").strip()

            reference_files_content = _get_project_reference_files_content(project_id)
            project_context = ProjectContext(project, reference_files_content)

            outline_text = (project.outline_text or "").strip()
            if not outline_text:
                titles = []
                for p in pages:
                    oc = p.get_outline_content() or {}
                    t = (oc.get('title') or '').strip()
                    if t:
                        titles.append(t)
                if titles:
                    outline_text = "\n".join([f"{i+1}. {t}" for i, t in enumerate(titles)])

            payload = {}
            if project.product_payload:
                try:
                    payload = json.loads(project.product_payload)
                except Exception:
                    payload = {}

            copywriting = payload.get("copywriting") if isinstance(payload.get("copywriting"), dict) else {}
            style_pack = payload.get("style_pack") if isinstance(payload.get("style_pack"), dict) else {}
            payload_cards = payload.get("cards") if isinstance(payload.get("cards"), list) else []

            if not copywriting or not style_pack:
                blueprint = ai_service.generate_xhs_blueprint(
                    project_context=project_context,
                    outline_text=outline_text,
                    image_count=total,
                    aspect_ratio=aspect_ratio,
                    language=language
                )
                if not copywriting:
                    copywriting = blueprint.get("copywriting") if isinstance(blueprint.get("copywriting"), dict) else {}
                if not style_pack:
                    style_pack = blueprint.get("style_pack") if isinstance(blueprint.get("style_pack"), dict) else {}
                if not payload_cards:
                    payload_cards = blueprint.get("cards") if isinstance(blueprint.get("cards"), list) else []

            if project.template_style:
                style_pack = dict(style_pack or {})
                style_pack["template_style"] = project.template_style
            if project.extra_requirements:
                style_pack = dict(style_pack or {})
                style_pack["extra_requirements"] = project.extra_requirements

            normalized_cards: List[Dict[str, Any]] = []
            for i, page in enumerate(pages):
                oc = page.get_outline_content() or {}
                heading = (oc.get("title") or "").strip()
                bullets = oc.get("points") if isinstance(oc.get("points"), list) else []
                desc_content = page.get_description_content() or {}
                desc_text = desc_content.get("text") or ""
                if not desc_text and desc_content.get("text_content"):
                    text_content = desc_content.get("text_content", [])
                    if isinstance(text_content, list):
                        desc_text = "\n".join(text_content)
                    else:
                        desc_text = str(text_content)
                clean_desc = ai_service.remove_markdown_images(desc_text or "")
                desc_lines = [line.strip() for line in clean_desc.splitlines() if line.strip()]

                base_card = payload_cards[i] if i < len(payload_cards) and isinstance(payload_cards[i], dict) else {}
                card = dict(base_card)
                inferred_role = infer_page_type(page, total)
                role = inferred_role if inferred_role in ["cover", "content", "ending"] else "content"
                if not bullets and desc_lines:
                    bullets = desc_lines[:6]

                card.update({
                    "index": i,
                    "role": role,
                    "heading": heading or card.get("heading", ""),
                    "subheading": card.get("subheading", ""),
                    "bullets": bullets or card.get("bullets", []) or [],
                    "visual_suggestions": card.get("visual_suggestions", []) or [],
                    "ref_images": ai_service.extract_image_urls_from_markdown(desc_text or ""),
                })
                if not card.get("visual_suggestions") and desc_lines:
                    card["visual_suggestions"] = desc_lines[:4]
                normalized_cards.append(card)

            target_card = normalized_cards[card_index]
            template_ref_path = None
            if resolved_use_template and card_index < len(pages):
                template_ref_path = pick_template_for_page(project, pages[card_index], total, file_service)
            prompt = ai_service.generate_xhs_image_prompt(
                card=target_card,
                style_pack=style_pack,
                aspect_ratio=aspect_ratio,
                total=total,
                language=language
            )
            image = ai_service.generate_image(
                prompt=prompt,
                ref_image_path=template_ref_path,
                additional_ref_images=target_card.get("ref_images") or None,
                aspect_ratio=aspect_ratio,
                resolution=resolution
            )
            if not image:
                raise ValueError("Failed to generate xhs image")

            page_obj = pages[card_index]
            save_image_with_version(
                image=image,
                project_id=project_id,
                page_id=page_obj.id,
                file_service=file_service,
                page_obj=page_obj
            )

            cards_for_payload: List[Dict[str, Any]] = []
            for c in normalized_cards:
                if isinstance(c, dict):
                    c = dict(c)
                    c.pop("ref_images", None)
                    cards_for_payload.append(c)

            payload.update({
                "product_type": "xiaohongshu",
                "mode": "vertical_carousel",
                "aspect_ratio": aspect_ratio,
                "resolution": resolution,
                "image_count": total,
                "copywriting": copywriting,
                "style_pack": style_pack,
                "cards": cards_for_payload,
                "materials": payload.get("materials") if isinstance(payload.get("materials"), list) else [],
            })

            project.product_payload = json.dumps(payload, ensure_ascii=False)
            project.updated_at = datetime.utcnow()
            project.status = 'COMPLETED'
            db.session.commit()

            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({"total": 1, "completed": 1, "failed": 0})
            db.session.commit()

        except Exception as e:
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                task.set_progress({"total": 1, "completed": 0, "failed": 1})
                db.session.commit()


def edit_xhs_card_image_task(
    task_id: str,
    project_id: str,
    card_index: int,
    edit_instruction: str,
    ai_service,
    file_service,
    aspect_ratio: str = "4:5",
    resolution: str = "2K",
    additional_ref_images: List[str] = None,
    use_template: bool = None,
    temp_dir: str = None,
    app=None
):
    """
    Background task for editing an XHS card image.
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")

    with app.app_context():
        task = Task.query.get(task_id)
        try:
            if not task:
                return
            task.status = 'PROCESSING'
            task.set_progress({"total": 1, "completed": 0, "failed": 0})
            db.session.commit()

            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f"Project {project_id} not found")
            resolved_use_template = use_template
            if resolved_use_template is None:
                resolved_use_template = bool(project.template_image_path or project.get_template_variants())

            pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
            if not pages or card_index < 0 or card_index >= len(pages):
                raise ValueError("card_index out of range")

            page = pages[card_index]
            current_image_path = None
            if page.generated_image_path:
                current_image_path = file_service.get_absolute_path(page.generated_image_path)
            if not current_image_path:
                material = get_current_xhs_material(project_id, card_index)
                if not material:
                    raise ValueError("No current xhs image found for index")
                current_image_path = file_service.get_absolute_path(material.relative_path)

            original_description = None
            desc_content = page.get_description_content()
            if desc_content:
                original_description = desc_content.get('text') or ''
                if not original_description and desc_content.get('text_content'):
                    if isinstance(desc_content['text_content'], list):
                        original_description = '\n'.join(desc_content['text_content'])
                    else:
                        original_description = str(desc_content['text_content'])

            ref_images = list(additional_ref_images or [])
            if resolved_use_template:
                template_ref = pick_template_for_page(project, page, len(pages), file_service)
                if template_ref:
                    ref_images.insert(0, template_ref)

            image = ai_service.edit_image(
                prompt=edit_instruction,
                current_image_path=current_image_path,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                original_description=original_description,
                additional_ref_images=ref_images if ref_images else None
            )
            if not image:
                raise ValueError("Failed to edit xhs image")

            save_image_with_version(
                image=image,
                project_id=project_id,
                page_id=page.id,
                file_service=file_service,
                page_obj=page
            )

            project.status = 'COMPLETED'
            db.session.commit()

            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({"total": 1, "completed": 1, "failed": 0})
            db.session.commit()
        except Exception as e:
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                task.set_progress({"total": 1, "completed": 0, "failed": 1})
                db.session.commit()
        finally:
            if temp_dir:
                try:
                    import shutil
                    from pathlib import Path
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")


def generate_descriptions_task(task_id: str, project_id: str, ai_service, 
                               project_context, outline: List[Dict], 
                               max_workers: int = 5, app=None,
                               language: str = None):
    """
    Background task for generating page descriptions
    Based on demo.py gen_desc() with parallel processing
    
    Note: app instance MUST be passed from the request context
    
    Args:
        task_id: Task ID
        project_id: Project ID
        ai_service: AI service instance
        project_context: ProjectContext object containing all project information
        outline: Complete outline structure
        max_workers: Maximum number of parallel workers
        app: Flask app instance
        language: Output language (zh, en, ja, auto)
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    # 在整个任务中保持应用上下文
    with app.app_context():
        try:
            # 重要：在后台线程开始时就获取task和设置状态
            task = Task.query.get(task_id)
            if not task:
                logger.error(f"Task {task_id} not found")
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            logger.info(f"Task {task_id} status updated to PROCESSING")
            
            # Flatten outline to get pages
            pages_data = ai_service.flatten_outline(outline)
            
            # Get all pages for this project
            pages = Page.query.filter_by(project_id=project_id).order_by(Page.order_index).all()
            
            if len(pages) != len(pages_data):
                raise ValueError("Page count mismatch")
            
            # Initialize progress
            task.set_progress({
                "total": len(pages),
                "completed": 0,
                "failed": 0
            })
            db.session.commit()
            
            # Generate descriptions in parallel
            completed = 0
            failed = 0
            total_pages = len(pages)
            
            def generate_single_desc(page_id, page_outline, page_index):
                """
                Generate description for a single page
                注意：只传递 page_id（字符串），不传递 ORM 对象，避免跨线程会话问题
                """
                # 关键修复：在子线程中也需要应用上下文
                with app.app_context():
                    try:
                        # Get page from database in this thread (for page_type / order_index)
                        page_obj = Page.query.get(page_id)
                        if not page_obj:
                            raise ValueError(f"Page {page_id} not found")

                        # Get singleton AI service instance
                        from services.ai_service_manager import get_ai_service
                        ai_service = get_ai_service()
                        
                        desc_text = ai_service.generate_page_description(
                            project_context,
                            outline,
                            page_outline,
                            page_obj.order_index + 1,
                            language=language,
                            page_type=infer_page_type(page_obj, total_pages)
                        )
                        
                        # Parse description into structured format
                        # This is a simplified version - you may want more sophisticated parsing
                        desc_content = {
                            "text": desc_text,
                            "generated_at": datetime.utcnow().isoformat()
                        }
                        
                        return (page_id, desc_content, None)
                    except Exception as e:
                        import traceback
                        error_detail = traceback.format_exc()
                        logger.error(f"Failed to generate description for page {page_id}: {error_detail}")
                        return (page_id, None, str(e))
            
            # Use ThreadPoolExecutor for parallel generation
            # 关键：提前提取 page.id，不要传递 ORM 对象到子线程
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(generate_single_desc, page.id, page_data, i)
                    for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                ]
                
                # Process results as they complete
                for future in as_completed(futures):
                    page_id, desc_content, error = future.result()
                    
                    db.session.expire_all()
                    
                    # Update page in database
                    page = Page.query.get(page_id)
                    if page:
                        if error:
                            page.status = 'FAILED'
                            failed += 1
                        else:
                            page.set_description_content(desc_content)
                            page.status = 'DESCRIPTION_GENERATED'
                            completed += 1
                        
                        db.session.commit()
                    
                    # Update task progress
                    task = Task.query.get(task_id)
                    if task:
                        task.update_progress(completed=completed, failed=failed)
                        db.session.commit()
                        logger.info(f"Description Progress: {completed}/{len(pages)} pages completed")
            
            # Mark task as completed
            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.utcnow()
                db.session.commit()
                logger.info(f"Task {task_id} COMPLETED - {completed} pages generated, {failed} failed")
            
            # Update project status
            project = Project.query.get(project_id)
            if project and failed == 0:
                project.status = 'DESCRIPTIONS_GENERATED'
                db.session.commit()
                logger.info(f"Project {project_id} status updated to DESCRIPTIONS_GENERATED")
        
        except Exception as e:
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()


def generate_images_task(task_id: str, project_id: str, ai_service, file_service,
                        outline: List[Dict], use_template: bool = True, 
                        max_workers: int = 8, aspect_ratio: str = "16:9",
                        resolution: str = "2K", app=None,
                        extra_requirements: str = None,
                        language: str = None,
                        page_ids: list = None):
    """
    Background task for generating page images
    Based on demo.py gen_images_parallel()
    
    Note: app instance MUST be passed from the request context
    
    Args:
        language: Output language (zh, en, ja, auto)
        page_ids: Optional list of page IDs to generate (if not provided, generates all pages)
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Get pages for this project (filtered by page_ids if provided)
            pages = get_filtered_pages(project_id, page_ids)
            pages_data = ai_service.flatten_outline(outline)
            
            # 注意：不在任务开始时获取模板路径，而是在每个子线程中动态获取
            # 这样可以确保即使用户在上传新模板后立即生成，也能使用最新模板
            
            # Initialize progress
            task.set_progress({
                "total": len(pages),
                "completed": 0,
                "failed": 0
            })
            db.session.commit()
            
            # Generate images in parallel
            completed = 0
            failed = 0
            total_pages = len(pages)
            
            def generate_single_image(page_id, page_data, page_index):
                """
                Generate image for a single page
                注意：只传递 page_id（字符串），不传递 ORM 对象，避免跨线程会话问题
                """
                # 关键修复：在子线程中也需要应用上下文
                with app.app_context():
                    try:
                        logger.debug(f"Starting image generation for page {page_id}, index {page_index}")
                        # Get page from database in this thread
                        page_obj = Page.query.get(page_id)
                        if not page_obj:
                            raise ValueError(f"Page {page_id} not found")
                        
                        # Update page status
                        page_obj.status = 'GENERATING'
                        db.session.commit()
                        logger.debug(f"Page {page_id} status updated to GENERATING")
                        
                        # Get description content
                        desc_content = page_obj.get_description_content()
                        if not desc_content:
                            raise ValueError("No description content for page")
                        
                        # 获取描述文本（可能是 text 字段或 text_content 数组）
                        desc_text = desc_content.get('text', '')
                        if not desc_text and desc_content.get('text_content'):
                            # 如果 text 字段不存在，尝试从 text_content 数组获取
                            text_content = desc_content.get('text_content', [])
                            if isinstance(text_content, list):
                                desc_text = '\n'.join(text_content)
                            else:
                                desc_text = str(text_content)
                        
                        logger.debug(f"Got description text for page {page_id}: {desc_text[:100]}...")
                        
                        # 从当前页面的描述内容中提取图片 URL
                        page_additional_ref_images = []
                        has_material_images = False
                        
                        # 从描述文本中提取图片
                        if desc_text:
                            image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
                            if image_urls:
                                logger.info(f"Found {len(image_urls)} image(s) in page {page_id} description")
                                page_additional_ref_images = image_urls
                                has_material_images = True
                        
                        # 在子线程中动态获取模板路径，确保使用最新模板
                        page_ref_image_path = None
                        project = Project.query.get(project_id)
                        if use_template and project:
                            page_ref_image_path = pick_template_for_page(
                                project, page_obj, total_pages, file_service
                            )
                            # 注意：如果有风格描述，即使没有模板图片也允许生成
                            # 这个检查已经在 controller 层完成，这里不再检查
                        
                        # Generate image prompt
                        inferred_page_type = infer_page_type(page_obj, total_pages)
                        prompt = ai_service.generate_image_prompt(
                            outline, page_data, desc_text, page_obj.order_index + 1,
                            has_material_images=has_material_images,
                            extra_requirements=extra_requirements,
                            language=language,
                            has_template=bool(page_ref_image_path),
                            page_type=inferred_page_type
                        )
                        logger.debug(f"Generated image prompt for page {page_id}")
                        
                        # Generate image
                        logger.info(f"🎨 Calling AI service to generate image for page {page_index}/{len(pages)}...")
                        image = ai_service.generate_image(
                            prompt, page_ref_image_path, aspect_ratio, resolution,
                            additional_ref_images=page_additional_ref_images if page_additional_ref_images else None
                        )
                        logger.info(f"✅ Image generated successfully for page {page_index}")
                        
                        if not image:
                            raise ValueError("Failed to generate image")
                        
                        # 优化：直接在子线程中计算版本号并保存到最终位置
                        # 每个页面独立，使用数据库事务保证版本号原子性，避免临时文件
                        image_path, next_version = save_image_with_version(
                            image, project_id, page_id, file_service, page_obj=page_obj
                        )
                        
                        return (page_id, image_path, None)
                        
                    except Exception as e:
                        import traceback
                        error_detail = traceback.format_exc()
                        logger.error(f"Failed to generate image for page {page_id}: {error_detail}")
                        return (page_id, None, str(e))
            
            # Use ThreadPoolExecutor for parallel generation
            # 关键：提前提取 page.id，不要传递 ORM 对象到子线程
            with ThreadPoolExecutor(max_workers=max_workers) as executor:
                futures = [
                    executor.submit(generate_single_image, page.id, page_data, i)
                    for i, (page, page_data) in enumerate(zip(pages, pages_data), 1)
                ]
                
                # Process results as they complete
                for future in as_completed(futures):
                    page_id, image_path, error = future.result()
                    
                    db.session.expire_all()
                    
                    # Update page in database (主要是为了更新失败状态)
                    page = Page.query.get(page_id)
                    if page:
                        if error:
                            page.status = 'FAILED'
                            failed += 1
                            db.session.commit()
                        else:
                            # 图片已在子线程中保存并创建版本记录，这里只需要更新计数
                            completed += 1
                            # 刷新页面对象以获取最新状态
                            db.session.refresh(page)
                    
                    # Update task progress
                    task = Task.query.get(task_id)
                    if task:
                        task.update_progress(completed=completed, failed=failed)
                        db.session.commit()
                        logger.info(f"Image Progress: {completed}/{len(pages)} pages completed")
            
            # Mark task as completed
            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.utcnow()
                db.session.commit()
                logger.info(f"Task {task_id} COMPLETED - {completed} images generated, {failed} failed")
            
            # Update project status
            project = Project.query.get(project_id)
            if project and failed == 0:
                project.status = 'COMPLETED'
                db.session.commit()
                logger.info(f"Project {project_id} status updated to COMPLETED")
        
        except Exception as e:
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()


def generate_single_page_image_task(task_id: str, project_id: str, page_id: str, 
                                    ai_service, file_service, outline: List[Dict],
                                    use_template: bool = True, aspect_ratio: str = "16:9",
                                    resolution: str = "2K", app=None,
                                    extra_requirements: str = None,
                                    language: str = None,
                                    user_ref_images: List[str] = None,
                                    temp_dir: str = None):
    """
    Background task for generating a single page image
    
    Note: app instance MUST be passed from the request context
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Get page from database
            page = Page.query.get(page_id)
            if not page or page.project_id != project_id:
                raise ValueError(f"Page {page_id} not found")
            
            # Update page status
            page.status = 'GENERATING'
            db.session.commit()
            
            # Get description content
            desc_content = page.get_description_content()
            if not desc_content:
                raise ValueError("No description content for page")
            
            # 获取描述文本（可能是 text 字段或 text_content 数组）
            desc_text = desc_content.get('text', '')
            if not desc_text and desc_content.get('text_content'):
                text_content = desc_content.get('text_content', [])
                if isinstance(text_content, list):
                    desc_text = '\n'.join(text_content)
                else:
                    desc_text = str(text_content)
            
            # 从描述文本中提取图片 URL（desc里的素材）
            additional_ref_images: List[str] = []
            has_material_images = False
            
            if desc_text:
                image_urls = ai_service.extract_image_urls_from_markdown(desc_text)
                if image_urls:
                    logger.info(f"Found {len(image_urls)} image(s) in page {page_id} description")
                    additional_ref_images = image_urls
                    has_material_images = True

            # 合并用户额外提供的参考图（素材库选择 / 上传图片等）
            if user_ref_images:
                # 去重，保持稳定顺序：先用户提供，再desc提取
                merged = []
                for u in user_ref_images:
                    if u and u not in merged:
                        merged.append(u)
                for u in additional_ref_images:
                    if u and u not in merged:
                        merged.append(u)
                additional_ref_images = merged
                has_material_images = True
            
            # Get template path if use_template
            ref_image_path = None
            total_pages = Page.query.filter_by(project_id=project_id).count()
            project = Project.query.get(project_id)
            if use_template and project:
                ref_image_path = pick_template_for_page(
                    project, page, total_pages, file_service
                )
                # 注意：如果有风格描述，即使没有模板图片也允许生成
                # 这个检查已经在 controller 层完成，这里不再检查
            
            # Generate image prompt
            page_data = page.get_outline_content() or {}
            if page.part:
                page_data['part'] = page.part
            
            prompt = ai_service.generate_image_prompt(
                outline, page_data, desc_text, page.order_index + 1,
                has_material_images=has_material_images,
                extra_requirements=extra_requirements,
                language=language,
                has_template=bool(ref_image_path),
                page_type=infer_page_type(page, total_pages)
            )
            
            # Generate image
            logger.info(f"🎨 Generating image for page {page_id}...")
            image = ai_service.generate_image(
                prompt, ref_image_path, aspect_ratio, resolution,
                additional_ref_images=additional_ref_images if additional_ref_images else None
            )
            
            if not image:
                raise ValueError("Failed to generate image")
            
            # 保存图片并创建历史版本记录
            image_path, next_version = save_image_with_version(
                image, project_id, page_id, file_service, page_obj=page
            )
            
            # Mark task as completed
            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({
                "total": 1,
                "completed": 1,
                "failed": 0
            })
            db.session.commit()
            
            logger.info(f"✅ Task {task_id} COMPLETED - Page {page_id} image generated")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED: {error_detail}")
            
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()
            
            # Update page status
            page = Page.query.get(page_id)
            if page:
                page.status = 'FAILED'
                db.session.commit()
        finally:
            # Clean up temp directory if created
            if temp_dir:
                try:
                    import shutil
                    from pathlib import Path
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")


def edit_page_image_task(task_id: str, project_id: str, page_id: str,
                         edit_instruction: str, ai_service, file_service,
                         aspect_ratio: str = "16:9", resolution: str = "2K",
                         original_description: str = None,
                         additional_ref_images: List[str] = None,
                         temp_dir: str = None, app=None):
    """
    Background task for editing a page image
    
    Note: app instance MUST be passed from the request context
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Get page from database
            page = Page.query.get(page_id)
            if not page or page.project_id != project_id:
                raise ValueError(f"Page {page_id} not found")
            
            if not page.generated_image_path:
                raise ValueError("Page must have generated image first")
            
            # Update page status
            page.status = 'GENERATING'
            db.session.commit()
            
            # Get current image path
            current_image_path = file_service.get_absolute_path(page.generated_image_path)
            
            # Edit image
            logger.info(f"🎨 Editing image for page {page_id}...")
            try:
                image = ai_service.edit_image(
                    edit_instruction,
                    current_image_path,
                    aspect_ratio,
                    resolution,
                    original_description=original_description,
                    additional_ref_images=additional_ref_images if additional_ref_images else None
                )
            finally:
                # Clean up temp directory if created
                if temp_dir:
                    import shutil
                    from pathlib import Path
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
            
            if not image:
                raise ValueError("Failed to edit image")
            
            # 保存编辑后的图片并创建历史版本记录
            image_path, next_version = save_image_with_version(
                image, project_id, page_id, file_service, page_obj=page
            )
            
            # Mark task as completed
            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({
                "total": 1,
                "completed": 1,
                "failed": 0
            })
            db.session.commit()
            
            logger.info(f"✅ Task {task_id} COMPLETED - Page {page_id} image edited")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED: {error_detail}")
            
            # Clean up temp directory on error
            if temp_dir:
                import shutil
                from pathlib import Path
                temp_path = Path(temp_dir)
                if temp_path.exists():
                    shutil.rmtree(temp_dir)
            
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()
            
            # Update page status
            page = Page.query.get(page_id)
            if page:
                page.status = 'FAILED'
                db.session.commit()


def generate_template_variants_task(task_id: str, project_id: str, types: List[str],
                                    ai_service, file_service,
                                    aspect_ratio: str = "16:9", resolution: str = "2K",
                                    app=None, extra_requirements: str = None):
    """
    Background task for generating template variants based on reference image.
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")

    with app.app_context():
        try:
            task = Task.query.get(task_id)
            if not task:
                return

            task.status = 'PROCESSING'
            task.set_progress({
                "total": len(types),
                "completed": 0,
                "failed": 0
            })
            db.session.commit()

            project = Project.query.get(project_id)
            if not project:
                raise ValueError("Project not found")

            ref_image_path = file_service.get_template_path(project_id)
            if not ref_image_path:
                raise ValueError("No template image found for project")

            from services.prompts import get_template_variant_prompt

            template_sets = _parse_template_sets(project)
            template_key = project.active_template_key or 'legacy'
            active_set = template_sets.get(template_key) or {}
            active_variants = active_set.get('template_variants') if isinstance(active_set, dict) else {}
            if not isinstance(active_variants, dict):
                active_variants = {}
            active_set = {
                "template_image_path": project.template_image_path,
                "template_variants": active_variants,
                "template_variants_history": (active_set.get('template_variants_history')
                                              if isinstance(active_set, dict) else {}) or {}
            }
            template_sets[template_key] = active_set
            completed = 0
            failed = 0

            for variant_type in types:
                try:
                    prompt = get_template_variant_prompt(variant_type)
                    if extra_requirements and extra_requirements.strip():
                        prompt = f"{prompt}\n\n额外要求（请务必遵循）：\n{extra_requirements.strip()}\n"
                    image = ai_service.generate_image(
                        prompt=prompt,
                        ref_image_path=ref_image_path,
                        aspect_ratio=aspect_ratio,
                        resolution=resolution
                    )
                    if not image:
                        raise ValueError("Failed to generate image")

                    relative_path = file_service.save_template_variant_image(
                        image, project_id, variant_type, template_key=template_key, with_timestamp=True
                    )
                    active_variants[variant_type] = relative_path
                    active_set = _append_template_variant_history(active_set, variant_type, relative_path)
                    completed += 1
                except Exception as e:
                    logger.error(f"Failed to generate template variant {variant_type}: {e}", exc_info=True)
                    failed += 1

                task.update_progress(completed=completed, failed=failed)
                db.session.commit()

            template_sets[template_key] = {
                "template_image_path": project.template_image_path,
                "template_variants": active_variants,
                "template_variants_history": active_set.get('template_variants_history', {})
            }
            project.set_template_sets(template_sets)
            project.active_template_key = template_key
            project.set_template_variants(active_variants)
            project.updated_at = datetime.utcnow()
            db.session.commit()

            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED' if failed == 0 else 'PARTIAL'
                task.completed_at = datetime.utcnow()
                db.session.commit()

        except Exception as e:
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()


def generate_single_template_variant_task(task_id: str, project_id: str, variant_type: str,
                                          ai_service, file_service,
                                          aspect_ratio: str = "16:9", resolution: str = "2K",
                                          app=None, extra_requirements: str = None,
                                          additional_ref_images: List[str] = None,
                                          temp_dir: str = None):
    """
    Background task for generating a single template variant with optional extra requirements
    and additional reference images.
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")

    with app.app_context():
        try:
            task = Task.query.get(task_id)
            if not task:
                return

            task.status = 'PROCESSING'
            task.set_progress({
                "total": 1,
                "completed": 0,
                "failed": 0
            })
            db.session.commit()

            project = Project.query.get(project_id)
            if not project:
                raise ValueError("Project not found")

            ref_image_path = file_service.get_template_path(project_id)
            if not ref_image_path:
                raise ValueError("No template image found for project")

            from services.prompts import get_template_variant_prompt

            prompt = get_template_variant_prompt(variant_type)
            if extra_requirements and extra_requirements.strip():
                prompt = f"{prompt}\n\n额外要求（请务必遵循）：\n{extra_requirements.strip()}\n"

            image = ai_service.generate_image(
                prompt=prompt,
                ref_image_path=ref_image_path,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                additional_ref_images=additional_ref_images or None
            )
            if not image:
                raise ValueError("Failed to generate image")

            template_sets = _parse_template_sets(project)
            template_key = project.active_template_key or 'legacy'
            active_set = template_sets.get(template_key) or {}
            active_variants = active_set.get('template_variants') if isinstance(active_set, dict) else {}
            if not isinstance(active_variants, dict):
                active_variants = {}

            relative_path = file_service.save_template_variant_image(
                image, project_id, variant_type, template_key=template_key, with_timestamp=True
            )

            active_variants[variant_type] = relative_path
            active_set = _append_template_variant_history(active_set, variant_type, relative_path)
            template_sets[template_key] = {
                "template_image_path": project.template_image_path,
                "template_variants": active_variants,
                "template_variants_history": active_set.get('template_variants_history', {})
            }
            project.set_template_sets(template_sets)
            project.active_template_key = template_key
            project.set_template_variants(active_variants)
            project.updated_at = datetime.utcnow()
            db.session.commit()

            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.utcnow()
                task.set_progress({
                    "total": 1,
                    "completed": 1,
                    "failed": 0
                })
                db.session.commit()

        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Template variant task {task_id} FAILED: {error_detail}")
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()
        finally:
            if temp_dir:
                try:
                    import shutil
                    from pathlib import Path
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")


def generate_material_image_task(task_id: str, project_id: str, prompt: str,
                                 ai_service, file_service,
                                 ref_image_path: str = None,
                                 additional_ref_images: List[str] = None,
                                 aspect_ratio: str = "16:9",
                                 resolution: str = "2K",
                                 temp_dir: str = None, app=None):
    """
    Background task for generating a material image
    复用核心的generate_image逻辑，但保存到Material表而不是Page表
    
    Note: app instance MUST be passed from the request context
    project_id can be None for global materials (but Task model requires a project_id,
    so we use a special value 'global' for task tracking)
    """
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        try:
            # Update task status to PROCESSING
            task = Task.query.get(task_id)
            if not task:
                return
            
            task.status = 'PROCESSING'
            db.session.commit()
            
            # Generate image (复用核心逻辑)
            logger.info(f"🎨 Generating material image with prompt: {prompt[:100]}...")
            image = ai_service.generate_image(
                prompt=prompt,
                ref_image_path=ref_image_path,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                additional_ref_images=additional_ref_images or None,
            )
            
            if not image:
                raise ValueError("Failed to generate image")
            
            # 处理project_id：如果为'global'或None，转换为None
            actual_project_id = None if (project_id == 'global' or project_id is None) else project_id
            
            # Save generated material image
            relative_path = file_service.save_material_image(image, actual_project_id)
            relative = Path(relative_path)
            filename = relative.name
            
            # Construct frontend-accessible URL
            image_url = file_service.get_file_url(actual_project_id, 'materials', filename)
            
            # Save material info to database
            material = Material(
                project_id=actual_project_id,
                filename=filename,
                relative_path=relative_path,
                url=image_url
            )
            db.session.add(material)
            
            # Mark task as completed
            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({
                "total": 1,
                "completed": 1,
                "failed": 0,
                "material_id": material.id,
                "image_url": image_url
            })
            db.session.commit()
            
            logger.info(f"✅ Task {task_id} COMPLETED - Material {material.id} generated")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"Task {task_id} FAILED: {error_detail}")
            
            # Mark task as failed
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()
        
        finally:
            # Clean up temp directory
            if temp_dir:
                import shutil
                temp_path = Path(temp_dir)
                if temp_path.exists():
                    shutil.rmtree(temp_dir, ignore_errors=True)


def export_editable_pptx_with_recursive_analysis_task(
    task_id: str, 
    project_id: str, 
    filename: str,
    file_service,
    page_ids: list = None,
    max_depth: int = 2,
    max_workers: int = 4,
    export_extractor_method: str = 'hybrid',
    export_inpaint_method: str = 'hybrid',
    app=None
):
    """
    使用递归图片可编辑化分析导出可编辑PPTX的后台任务
    
    这是新的架构方法，使用ImageEditabilityService进行递归版面分析。
    与旧方法的区别：
    - 不再假设图片是16:9
    - 支持任意尺寸和分辨率
    - 递归分析图片中的子图和图表
    - 更智能的坐标映射和元素提取
    - 不需要 ai_service（使用 ImageEditabilityService 和 MinerU）
    
    Args:
        task_id: 任务ID
        project_id: 项目ID
        filename: 输出文件名
        file_service: 文件服务实例
        page_ids: 可选的页面ID列表（如果提供，只导出这些页面）
        max_depth: 最大递归深度
        max_workers: 并发处理数
        export_extractor_method: 组件提取方法 ('mineru' 或 'hybrid')
        export_inpaint_method: 背景修复方法 ('generative', 'baidu', 'hybrid')
        app: Flask应用实例
    """
    logger.info(f"🚀 Task {task_id} started: export_editable_pptx_with_recursive_analysis (project={project_id}, depth={max_depth}, workers={max_workers}, extractor={export_extractor_method}, inpaint={export_inpaint_method})")
    
    if app is None:
        raise ValueError("Flask app instance must be provided")
    
    with app.app_context():
        import os
        from datetime import datetime
        from PIL import Image
        from models import Project
        from services.export_service import ExportService
        
        logger.info(f"开始递归分析导出任务 {task_id} for project {project_id}")
        
        try:
            # Get project
            project = Project.query.get(project_id)
            if not project:
                raise ValueError(f'Project {project_id} not found')
            
            # Get pages (filtered by page_ids if provided)
            pages = get_filtered_pages(project_id, page_ids)
            if not pages:
                raise ValueError('No pages found for project')
            
            image_paths = []
            for page in pages:
                if page.generated_image_path:
                    img_path = file_service.get_absolute_path(page.generated_image_path)
                    if os.path.exists(img_path):
                        image_paths.append(img_path)
            
            if not image_paths:
                raise ValueError('No generated images found for project')
            
            logger.info(f"找到 {len(image_paths)} 张图片")
            
            # 初始化任务进度（包含消息日志）
            task = Task.query.get(task_id)
            task.set_progress({
                "total": 100,  # 使用百分比
                "completed": 0,
                "failed": 0,
                "current_step": "准备中...",
                "percent": 0,
                "messages": ["🚀 开始导出可编辑PPTX..."]  # 消息日志
            })
            db.session.commit()
            
            # 进度回调函数 - 更新数据库中的进度
            progress_messages = ["🚀 开始导出可编辑PPTX..."]
            max_messages = 10  # 最多保留最近10条消息
            
            def progress_callback(step: str, message: str, percent: int):
                """更新任务进度到数据库"""
                nonlocal progress_messages
                try:
                    # 添加新消息到日志
                    new_message = f"[{step}] {message}"
                    progress_messages.append(new_message)
                    # 只保留最近的消息
                    if len(progress_messages) > max_messages:
                        progress_messages = progress_messages[-max_messages:]
                    
                    # 更新数据库
                    task = Task.query.get(task_id)
                    if task:
                        task.set_progress({
                            "total": 100,
                            "completed": percent,
                            "failed": 0,
                            "current_step": message,
                            "percent": percent,
                            "messages": progress_messages.copy()
                        })
                        db.session.commit()
                except Exception as e:
                    logger.warning(f"更新进度失败: {e}")
            
            # Step 1: 准备工作
            logger.info("Step 1: 准备工作...")
            progress_callback("准备", f"找到 {len(image_paths)} 张幻灯片图片", 2)
            
            # 准备输出路径
            exports_dir = os.path.join(app.config['UPLOAD_FOLDER'], project_id, 'exports')
            os.makedirs(exports_dir, exist_ok=True)
            
            # Handle filename collision
            if not filename.endswith('.pptx'):
                filename += '.pptx'
            
            output_path = os.path.join(exports_dir, filename)
            if os.path.exists(output_path):
                base_name = filename.rsplit('.', 1)[0]
                timestamp = datetime.utcnow().strftime('%Y%m%d_%H%M%S')
                filename = f"{base_name}_{timestamp}.pptx"
                output_path = os.path.join(exports_dir, filename)
                logger.info(f"文件名冲突，使用新文件名: {filename}")
            
            # 获取第一张图片的尺寸作为参考
            first_img = Image.open(image_paths[0])
            slide_width, slide_height = first_img.size
            first_img.close()
            
            logger.info(f"幻灯片尺寸: {slide_width}x{slide_height}")
            logger.info(f"递归深度: {max_depth}, 并发数: {max_workers}")
            progress_callback("准备", f"幻灯片尺寸: {slide_width}×{slide_height}", 3)
            
            # Step 2: 创建文字属性提取器
            from services.image_editability import TextAttributeExtractorFactory
            text_attribute_extractor = TextAttributeExtractorFactory.create_caption_model_extractor()
            progress_callback("准备", "文字属性提取器已初始化", 5)
            
            # Step 3: 调用导出方法（使用项目的导出设置）
            logger.info(f"Step 3: 创建可编辑PPTX (extractor={export_extractor_method}, inpaint={export_inpaint_method})...")
            progress_callback("配置", f"提取方法: {export_extractor_method}, 背景修复: {export_inpaint_method}", 6)
            
            _, export_warnings = ExportService.create_editable_pptx_with_recursive_analysis(
                image_paths=image_paths,
                output_file=output_path,
                slide_width_pixels=slide_width,
                slide_height_pixels=slide_height,
                max_depth=max_depth,
                max_workers=max_workers,
                text_attribute_extractor=text_attribute_extractor,
                progress_callback=progress_callback,
                export_extractor_method=export_extractor_method,
                export_inpaint_method=export_inpaint_method
            )
            
            logger.info(f"✓ 可编辑PPTX已创建: {output_path}")
            
            # Step 4: 标记任务完成
            download_path = f"/files/{project_id}/exports/{filename}"
            
            # 添加完成消息
            progress_messages.append("✅ 导出完成！")
            
            # 添加警告信息（如果有）
            warning_messages = []
            if export_warnings and export_warnings.has_warnings():
                warning_messages = export_warnings.to_summary()
                progress_messages.extend(warning_messages)
                logger.warning(f"导出有 {len(warning_messages)} 条警告")
            
            task = Task.query.get(task_id)
            if task:
                task.status = 'COMPLETED'
                task.completed_at = datetime.utcnow()
                task.set_progress({
                    "total": 100,
                    "completed": 100,
                    "failed": 0,
                    "current_step": "✓ 导出完成",
                    "percent": 100,
                    "messages": progress_messages,
                    "download_url": download_path,
                    "filename": filename,
                    "method": "recursive_analysis",
                    "max_depth": max_depth,
                    "warnings": warning_messages,  # 单独的警告列表
                    "warning_details": export_warnings.to_dict() if export_warnings else {}  # 详细警告信息
                })
                db.session.commit()
                logger.info(f"✓ 任务 {task_id} 完成 - 递归分析导出成功（深度={max_depth}）")
        
        except Exception as e:
            import traceback
            error_detail = traceback.format_exc()
            logger.error(f"✗ 任务 {task_id} 失败: {error_detail}")
            
            # 标记任务失败
            task = Task.query.get(task_id)
            if task:
                task.status = 'FAILED'
                task.error_message = str(e)
                task.completed_at = datetime.utcnow()
                db.session.commit()
