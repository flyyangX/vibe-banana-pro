import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Dict, List

from models import db, Task, Page, Project, Material
from services import ProjectContext
from utils import get_filtered_pages

from .helpers import _get_project_reference_files_content
from .helpers import save_material_image_version

logger = logging.getLogger(__name__)


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

                # Save version record for single-mode infographic
                try:
                    save_material_image_version(project_id, "single", None, material.id)
                except Exception as e:
                    logger.warning(f"Failed to save material version (single): {e}")

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
                        try:
                            save_material_image_version(project_id, "series", page_id, material.id)
                        except Exception as e:
                            logger.warning(f"Failed to save material version (series): {e}")
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
