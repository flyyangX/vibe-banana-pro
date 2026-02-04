import json
import logging
from datetime import datetime
from pathlib import Path
from typing import List

from models import db, Task, Page, Project, Material
from .helpers import save_material_image_version

logger = logging.getLogger(__name__)


def edit_material_image_task(
    task_id: str,
    project_id: str,
    material_id: str,
    edit_instruction: str,
    ai_service,
    file_service,
    aspect_ratio: str = "16:9",
    resolution: str = "2K",
    additional_ref_images: List[str] = None,
    use_template: bool = None,
    temp_dir: str = None,
    app=None
):
    """
    Background task for editing a Material image (used by infographic editing).
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

            material = Material.query.get(material_id)
            if not material or material.project_id != project_id:
                raise ValueError("Material not found")

            current_image_path = file_service.get_absolute_path(material.relative_path)

            # Try to derive original_description from bound page (infographic series)
            original_description = None
            note_data = None
            try:
                if material.note:
                    note_data = json.loads(material.note)
            except Exception:
                note_data = None

            page_id = note_data.get("page_id") if isinstance(note_data, dict) else None
            if page_id:
                page = Page.query.get(page_id)
                if page and page.project_id == project_id:
                    desc_content = page.get_description_content() or {}
                    original_description = desc_content.get('text') or ''
                    if not original_description and desc_content.get('text_content'):
                        if isinstance(desc_content['text_content'], list):
                            original_description = '\n'.join(desc_content['text_content'])
                        else:
                            original_description = str(desc_content['text_content'])

            resolved_use_template = use_template
            if resolved_use_template is None:
                resolved_use_template = bool(project.template_image_path or project.get_template_variants())

            refs: List[str] = list(additional_ref_images or [])
            if resolved_use_template:
                try:
                    template_ref = file_service.get_template_path(project_id)
                    if template_ref:
                        refs.insert(0, template_ref)
                except Exception:
                    pass

            image = ai_service.edit_image(
                prompt=edit_instruction,
                current_image_path=current_image_path,
                aspect_ratio=aspect_ratio,
                resolution=resolution,
                original_description=original_description,
                additional_ref_images=refs if refs else None
            )
            if not image:
                raise ValueError("Failed to edit material image")

            relative_path = file_service.save_material_image(image, project_id)
            relative = Path(relative_path)
            filename = relative.name
            image_url = file_service.get_file_url(project_id, 'materials', filename)

            # Build new note (preserve + add parent linkage)
            new_note_data = dict(note_data) if isinstance(note_data, dict) else {}
            # Ensure infographic metadata is preserved when editing infographic materials
            if project.product_type == 'infographic':
                new_note_data.setdefault("type", "infographic")
                new_note_data.setdefault("mode", (new_note_data.get("mode") or "single"))
            else:
                new_note_data.setdefault("type", "asset")
            new_note_data["source"] = "edit"
            new_note_data["parent_material_id"] = material_id
            new_note = json.dumps(new_note_data, ensure_ascii=False)

            new_material = Material(
                project_id=project_id,
                filename=filename,
                relative_path=relative_path,
                url=image_url,
                note=new_note
            )
            db.session.add(new_material)
            db.session.commit()

            # Save version record (history + current pointer)
            try:
                mode = (new_note_data.get('mode') or 'single')
                page_id = new_note_data.get('page_id', None)
                if page_id in ['', 'null']:
                    page_id = None
                save_material_image_version(project_id, mode, page_id, new_material.id)
            except Exception as e:
                logger.warning(f"Failed to save material image version: {e}")

            task.status = 'COMPLETED'
            task.completed_at = datetime.utcnow()
            task.set_progress({"total": 1, "completed": 1, "failed": 0, "material_id": new_material.id, "image_url": image_url})
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
                raise ValueError("Failed to generate material image")

            # Save generated material image
            relative_path = file_service.save_material_image(image, project_id)
            relative = Path(relative_path)
            filename = relative.name
            image_url = file_service.get_file_url(project_id, 'materials', filename)

            note = json.dumps({
                "type": "asset",
                "source": "generate",
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
            task.set_progress({"total": 1, "completed": 1, "failed": 0, "material_id": material.id, "image_url": image_url})
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
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")
