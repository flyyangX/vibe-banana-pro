import json
import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from models import db, Task, Page, Project
from services import ProjectContext

from .helpers import (
    _get_project_reference_files_content,
    _get_material_plan_refs,
    _merge_ref_images,
    _sync_material_plan_from_description_ref_images,
    get_current_xhs_material,
    infer_page_type,
    pick_template_for_page,
    save_image_with_version,
)

logger = logging.getLogger(__name__)


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
            aspect_ratio = (aspect_ratio or "3:4").strip()
            if aspect_ratio == "auto":
                aspect_ratio = "3:4"
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
            material_plan_refs = _get_material_plan_refs(payload, project_id)

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

            # Sync description ref_images -> material_plan (only when applicable)
            if _sync_material_plan_from_description_ref_images(payload, normalized_cards, project_id):
                project.product_payload = json.dumps(payload, ensure_ascii=False)
                project.updated_at = datetime.utcnow()
                db.session.commit()
                material_plan_refs = _get_material_plan_refs(payload, project_id)

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
                        base_ref_images = card.get("ref_images") if isinstance(card.get("ref_images"), list) else []
                        plan_ref_images = material_plan_refs.get(idx, [])
                        additional_ref_images = _merge_ref_images(plan_ref_images, base_ref_images)
                        image = ai_service.generate_image(
                            prompt=prompt,
                            ref_image_path=template_ref_path,
                            additional_ref_images=additional_ref_images or None,
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
            material_plan_refs = _get_material_plan_refs(payload, project_id)

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

            # Keep material_plan consistent with description ref_images (when plan empty & unlocked)
            if _sync_material_plan_from_description_ref_images(payload, normalized_cards, project_id):
                project.product_payload = json.dumps(payload, ensure_ascii=False)
                project.updated_at = datetime.utcnow()
                db.session.commit()
                material_plan_refs = _get_material_plan_refs(payload, project_id)

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
            base_ref_images = target_card.get("ref_images") if isinstance(target_card.get("ref_images"), list) else []
            plan_ref_images = material_plan_refs.get(card_index, [])
            additional_ref_images = _merge_ref_images(plan_ref_images, base_ref_images)
            image = ai_service.generate_image(
                prompt=prompt,
                ref_image_path=template_ref_path,
                additional_ref_images=additional_ref_images or None,
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


def _infer_xhs_aspect_ratio_from_image(image_path: str) -> str | None:
    """
    Infer XHS aspect ratio ("4:5" | "3:4" | "9:16") from an existing image.
    """
    if not image_path:
        return None

    try:
        from PIL import Image

        with Image.open(image_path) as img:
            width, height = img.size
    except Exception as e:
        logger.warning(f"[xhs] Failed to read image for aspect ratio inference: {image_path}, err={e}")
        return None

    if not width or not height:
        return None

    # Normalize to <= 1.0 (treat horizontal images by flipping ratio).
    ratio = width / height
    if ratio > 1:
        ratio = 1 / ratio

    targets = {
        "4:5": 4 / 5,
        "3:4": 3 / 4,
        "9:16": 9 / 16,
    }
    best = min(targets.items(), key=lambda kv: abs(ratio - kv[1]))
    best_key, best_ratio = best
    diff = abs(ratio - best_ratio)

    # Tolerance: allow small drift (resizing, compression, provider quirks).
    if diff <= 0.03:
        return best_key
    return None


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

            # Preserve the original image aspect ratio when editing.
            inferred_ratio = _infer_xhs_aspect_ratio_from_image(current_image_path)
            if inferred_ratio:
                logger.info(
                    f"[xhs] Inferred aspect_ratio={inferred_ratio} from current image "
                    f"(index={card_index}, size_path={current_image_path})"
                )
                aspect_ratio = inferred_ratio

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
                    temp_path = Path(temp_dir)
                    if temp_path.exists():
                        shutil.rmtree(temp_dir)
                except Exception as e:
                    logger.warning(f"Failed to cleanup temp directory {temp_dir}: {e}")
