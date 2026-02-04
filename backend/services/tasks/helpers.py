import json
import logging
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List

from sqlalchemy import func

from models import db, Page, Project, Material, PageImageVersion, XhsCardImageVersion, MaterialImageVersion, ReferenceFile

logger = logging.getLogger(__name__)


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


def save_material_image_version(project_id: str, mode: str, page_id: str | None, material_id: str) -> MaterialImageVersion:
    """
    保存 Material 的历史版本，并标记为当前版本。

    用于信息图（infographic）这种“以 Material 为渲染对象”的产品。
    分组维度：project_id + mode + page_id（single 模式可为 None）
    """
    safe_mode = (mode or 'single').strip().lower()
    if safe_mode not in ['single', 'series']:
        safe_mode = 'single'
    safe_page_id = page_id or None

    max_version = db.session.query(func.max(MaterialImageVersion.version_number))\
        .filter_by(project_id=project_id, mode=safe_mode, page_id=safe_page_id).scalar() or 0
    next_version = max_version + 1

    MaterialImageVersion.query.filter_by(project_id=project_id, mode=safe_mode, page_id=safe_page_id)\
        .update({'is_current': False})

    version = MaterialImageVersion(
        project_id=project_id,
        mode=safe_mode,
        page_id=safe_page_id,
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


def _get_material_plan_refs(payload: Dict[str, Any], project_id: str) -> Dict[int, List[str]]:
    material_plan = payload.get("material_plan") if isinstance(payload.get("material_plan"), list) else []
    if not material_plan:
        return {}

    ids_by_index: Dict[int, List[str]] = {}
    all_ids: List[str] = []
    for position, entry in enumerate(material_plan):
        if not isinstance(entry, dict):
            continue
        entry_index = entry.get("index", position)
        try:
            entry_index = int(entry_index)
        except Exception:
            continue
        material_ids = entry.get("material_ids") if isinstance(entry.get("material_ids"), list) else []
        material_ids = [str(mid) for mid in material_ids if mid]
        if material_ids:
            ids_by_index[entry_index] = material_ids
            all_ids.extend(material_ids)

    if not all_ids:
        return {}

    unique_ids = list(dict.fromkeys(all_ids))
    materials = Material.query.filter(
        Material.project_id == project_id,
        Material.id.in_(unique_ids)
    ).all()
    url_map = {m.id: m.url for m in materials if m and m.url}

    refs_by_index: Dict[int, List[str]] = {}
    for idx, ids in ids_by_index.items():
        urls: List[str] = []
        for mid in ids:
            url = url_map.get(mid)
            if url and url not in urls:
                urls.append(url)
        if urls:
            refs_by_index[idx] = urls

    return refs_by_index


def _normalize_files_url(url: str) -> str:
    if not url:
        return ""
    u = str(url).strip()
    if not u:
        return ""
    # Strip query/hash to match stored Material.url (usually no query)
    u = u.split("#", 1)[0].split("?", 1)[0].strip()
    return u


def _sync_material_plan_from_description_ref_images(
    payload: Dict[str, Any],
    cards_with_ref_images: List[Dict[str, Any]],
    project_id: str,
    max_per_card: int = 8,
) -> bool:
    """
    Reduce UX confusion by syncing description-embedded images to material_plan when plan is empty.
    """
    try:
        material_plan = payload.get("material_plan") if isinstance(payload.get("material_plan"), list) else []
        # Build url -> material (only asset)
        materials = Material.query.filter_by(project_id=project_id).all()
        url_to_id: Dict[str, str] = {}
        for m in materials:
            if not m or not m.url:
                continue
            note_data = None
            if m.note:
                try:
                    note_data = json.loads(m.note)
                except Exception:
                    note_data = None
            if not (isinstance(note_data, dict) and note_data.get("type") == "asset"):
                continue
            url_to_id[_normalize_files_url(m.url)] = m.id

        if not url_to_id:
            return False

        # Ensure material_plan list length >= cards length
        total = len(cards_with_ref_images or [])
        normalized_plan: List[Dict[str, Any]] = []
        for i in range(total):
            entry = material_plan[i] if i < len(material_plan) and isinstance(material_plan[i], dict) else {}
            entry = dict(entry)
            entry.setdefault("index", i)
            entry.setdefault("material_ids", [])
            entry.setdefault("locked", False)
            entry.setdefault("reason", entry.get("reason") or "auto")
            normalized_plan.append(entry)

        changed = False
        for i, card in enumerate(cards_with_ref_images or []):
            entry = normalized_plan[i]
            if bool(entry.get("locked")):
                continue
            existing_ids = entry.get("material_ids") if isinstance(entry.get("material_ids"), list) else []
            existing_ids = [str(mid) for mid in existing_ids if mid]
            if existing_ids:
                continue
            ref_images = card.get("ref_images") if isinstance(card.get("ref_images"), list) else []
            candidate_ids: List[str] = []
            for u in ref_images:
                nu = _normalize_files_url(u)
                mid = url_to_id.get(nu)
                if mid and mid not in candidate_ids:
                    candidate_ids.append(mid)
                if len(candidate_ids) >= max_per_card:
                    break
            if candidate_ids:
                entry["material_ids"] = candidate_ids
                entry["reason"] = "from_description_images"
                changed = True

        if changed:
            payload["material_plan"] = normalized_plan
        return changed
    except Exception:
        return False


def _merge_ref_images(primary: List[str], secondary: List[str]) -> List[str]:
    merged: List[str] = []
    for url in (primary or []) + (secondary or []):
        if url and url not in merged:
            merged.append(url)
    return merged
