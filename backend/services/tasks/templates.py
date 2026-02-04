import logging
from datetime import datetime
from typing import List

from models import db, Task, Project

from .helpers import _append_template_variant_history, _parse_template_sets

logger = logging.getLogger(__name__)


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
