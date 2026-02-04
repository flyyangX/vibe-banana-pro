# -*- coding: utf-8 -*-
"""
信息图提示词模块 - 信息图蓝图和图片生成相关的 prompt
"""
import logging
from typing import TYPE_CHECKING

from .base import get_language_instruction, format_reference_files_xml

if TYPE_CHECKING:
    from services.ai_service import ProjectContext

logger = logging.getLogger(__name__)


def get_infographic_blueprint_prompt(project_context: 'ProjectContext',
                                     outline_text: str = "",
                                     page_title: str = "",
                                     page_desc: str = "",
                                     mode: str = "single",
                                     extra_requirements: str = "",
                                     template_style: str = "",
                                     language: str = None) -> str:
    """
    生成信息图"结构蓝图"的 prompt（先压缩信息，再给图像生成）
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    idea_prompt = project_context.idea_prompt or ""
    description_text = project_context.description_text or ""
    outline_text = outline_text or project_context.outline_text or ""
    page_title = page_title or ""
    page_desc = page_desc or ""
    mode = (mode or "single").strip().lower()
    extra_req_text = (extra_requirements or "").strip()
    style_text = (template_style or "").strip()

    mode_hint = "单张信息图" if mode == "single" else "多张信息图（本页为其中一张）"

    prompt = f"""\
你是一名信息图内容策划。你的任务是将输入内容压缩成"信息图结构蓝图"，用于后续生成视觉信息图。

当前模式：{mode_hint}

输入：
- 项目想法/主题：
{idea_prompt}

- 大纲（如果有）：
{outline_text}

- 描述文本（如果有）：
{description_text}

- 当前页标题（仅多张模式有效）：
{page_title}

- 当前页描述（仅多张模式有效）：
{page_desc}

额外要求（如有）：
{extra_req_text}

风格描述（如有）：
{style_text}

输出要求：
1) 只输出纯文本（不要 JSON、不要代码块）。
2) 输出格式为"分区块的要点清单"，每个区块包含：区块标题 + 3-6 条要点。
3) 必须包含数据化表达建议（如时间线、对比表、流程图、统计数字、地图/分布）。
4) 语言简洁、信息密度高、层级清楚。
5) 不要出现"PPT/幻灯片/页码"等词。
{get_language_instruction(language)}
"""

    final_prompt = files_xml + prompt
    logger.debug(f"[get_infographic_blueprint_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_infographic_image_prompt(blueprint: str,
                                 mode: str = "single",
                                 page_title: str = "",
                                 extra_requirements: str = "",
                                 template_style: str = "",
                                 aspect_ratio: str = "",
                                 language: str = None) -> str:
    """
    生成信息图图片的 prompt（非 PPT 风格）
    """
    mode = (mode or "single").strip().lower()
    mode_hint = "单张信息图" if mode == "single" else "多张信息图中的一张"
    page_title = page_title or ""
    extra_req_text = (extra_requirements or "").strip()
    style_text = (template_style or "").strip()
    ratio_text = (aspect_ratio or "").strip()

    prompt = f"""\
你是一名专业信息图设计师。请根据给定蓝图生成一张高信息密度的信息图（不是PPT/不是幻灯片）。

模式：{mode_hint}
页标题（可选）：{page_title}

信息图蓝图：
{blueprint}

额外要求（如有）：
{extra_req_text}

风格描述（如有）：
{style_text}

设计要求：
- 版式为信息图/海报型排版，遵循画布比例：{ratio_text or "由系统配置决定"}。
- 强调数据化表达：时间线、对比表、流程图、数字指标、图标等优先。
- 信息密度高但可读性强，合理留白与对齐。
- 禁止出现"PPT风格、分页、页码、页眉页脚、导航条、水印"。
- 统一风格与配色，避免花哨装饰。
{get_language_instruction(language)}
"""
    logger.debug(f"[get_infographic_image_prompt] Final prompt:\n{prompt}")
    return prompt
