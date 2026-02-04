# -*- coding: utf-8 -*-
"""
大纲相关提示词模板
"""
import json
import logging
from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from services.ai_service import ProjectContext

from .base import format_reference_files_xml, get_language_instruction

logger = logging.getLogger(__name__)


def get_outline_generation_prompt(project_context: 'ProjectContext', language: str = None, page_count: int | None = None) -> str:
    """
    生成大纲的 prompt（按产品类型区分）
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        language: 输出语言代码（'zh', 'ja', 'en', 'auto'），如果为 None 则使用默认语言
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    idea_prompt = project_context.idea_prompt or ""
    
    product_type = (getattr(project_context, 'product_type', None) or 'ppt').strip().lower()
    if product_type == 'infographic':
        product_desc = "an infographic"
        product_rules = "Do NOT mention PPT, slides, pages, or page numbers. Focus on infographic structure and sections."
    elif product_type == 'xiaohongshu':
        product_desc = "a Xiaohongshu vertical carousel"
        product_rules = "Do NOT mention PPT or slides. Think in terms of cover + content cards + ending cadence."
    else:
        product_desc = "a ppt"
        product_rules = ""

    page_count_hint = ""
    if page_count and page_count > 0:
        page_count_hint = f"Target page/card count: {page_count}. Try to match this count unless it would harm coherence.\n"

    prompt = (f"""\
You are a helpful assistant that generates an outline for {product_desc}.

Freshness & Verification Policy (must follow):
- You MUST use up-to-date information for factual claims (numbers, dates, rankings, "latest", "as of", policies, product specs, company status, etc.).
- If your runtime has browsing / web access / search tools, you MUST search first to verify key facts before writing the outline.
- If you do NOT have web access, or you cannot verify a fact from the provided <uploaded_files>, you MUST NOT guess or fabricate.
  - Prefer high-level, timeless framing that stays accurate without precise numbers/dates.
  - Do NOT include specific figures, "latest X", or time-sensitive claims unless verified.
- Internal self-check (do this silently):
  - Remove/soften any unverified factual claim.
  - Ensure each page title/points are consistent and non-contradictory.

You can organize the content in two ways:

1. Simple format (for short PPTs without major sections):
[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]

2. Part-based format (for longer PPTs with major sections):
[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"]}},
        {{"title": "Overview", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"]}},
        {{"title": "Topic 2", "points": ["point1", "point2"]}}
    ]
    }}
]

Choose the format that best fits the content. Use parts when the content has clear major sections.
Unless otherwise specified, the first item should be kept simplest, containing only the title and optional subtitle.
{page_count_hint}
{product_rules}

The user's request: {idea_prompt}. Now generate the outline, don't include any other text.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_generation_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_outline_parsing_prompt(project_context: 'ProjectContext', language: str = None) -> str:
    """
    解析用户提供的大纲文本的 prompt
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    outline_text = project_context.outline_text or ""
    
    product_type = (getattr(project_context, 'product_type', None) or 'ppt').strip().lower()
    if product_type == 'infographic':
        product_desc = "an infographic"
        product_rules = "Do NOT mention PPT, slides, pages, or page numbers."
    elif product_type == 'xiaohongshu':
        product_desc = "a Xiaohongshu vertical carousel"
        product_rules = "Do NOT mention PPT or slides. Keep cover/content/ending cadence in mind."
    else:
        product_desc = "a ppt"
        product_rules = ""

    prompt = (f"""\
You are a helpful assistant that parses a user-provided outline text for {product_desc} into a structured format.

The user has provided the following outline text:

{outline_text}

Your task is to analyze this text and convert it into a structured JSON format WITHOUT modifying any of the original text content. 
You should only reorganize and structure the existing content, preserving all titles, points, and text exactly as provided.

You can organize the content in two ways:

1. Simple format (for short PPTs without major sections):
[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]

2. Part-based format (for longer PPTs with major sections):
[
    {{
    "part": "Part 1: Introduction",
    "pages": [
        {{"title": "Welcome", "points": ["point1", "point2"]}},
        {{"title": "Overview", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "Part 2: Main Content",
    "pages": [
        {{"title": "Topic 1", "points": ["point1", "point2"]}},
        {{"title": "Topic 2", "points": ["point1", "point2"]}}
    ]
    }}
]

Important rules:
- DO NOT modify, rewrite, or change any text from the original outline
- DO NOT add new content that wasn't in the original text
- DO NOT remove any content from the original text
- Only reorganize the existing content into the structured format
- Preserve all titles, bullet points, and text exactly as they appear
- If the text has clear sections/parts, use the part-based format
- Extract titles and points from the original text, keeping them exactly as written
{product_rules}

Now parse the outline text above into the structured format. Return only the JSON, don't include any other text.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_parsing_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_outline_refinement_prompt(current_outline: List[Dict], user_requirement: str,
                                   project_context: 'ProjectContext',
                                   previous_requirements: Optional[List[str]] = None,
                                   language: str = None) -> str:
    """
    根据用户要求修改已有大纲的 prompt
    
    Args:
        current_outline: 当前的大纲结构
        user_requirement: 用户的新要求
        project_context: 项目上下文对象，包含所有原始信息
        previous_requirements: 之前的修改要求列表（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    
    # 处理空大纲的情况
    if not current_outline or len(current_outline) == 0:
        outline_text = "(当前没有内容)"
    else:
        outline_text = json.dumps(current_outline, ensure_ascii=False, indent=2)
    
    # 构建之前的修改历史记录
    previous_req_text = ""
    if previous_requirements and len(previous_requirements) > 0:
        prev_list = "\n".join([f"- {req}" for req in previous_requirements])
        previous_req_text = f"\n\n之前用户提出的修改要求：\n{prev_list}\n"
    
    # 构建原始输入信息（根据项目类型显示不同的原始内容）
    original_input_text = "\n原始输入信息：\n"
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input_text += f"- PPT构想：{project_context.idea_prompt}\n"
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input_text += f"- 用户提供的大纲文本：\n{project_context.outline_text}\n"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input_text += f"- 用户提供的页面描述文本：\n{project_context.description_text}\n"
    elif project_context.idea_prompt:
        original_input_text += f"- 用户输入：{project_context.idea_prompt}\n"
    
    prompt = (f"""\
You are a helpful assistant that modifies PPT outlines based on user requirements.
{original_input_text}
当前的 PPT 大纲结构如下：

{outline_text}
{previous_req_text}
**用户现在提出新的要求：{user_requirement}**

请根据用户的要求修改和调整大纲。你可以：
- 添加、删除或重新排列页面
- 修改页面标题和要点
- 调整页面的组织结构
- 添加或删除章节（part）
- 合并或拆分页面
- 根据用户要求进行任何合理的调整
- 如果当前没有内容，请根据用户要求和原始输入信息创建新的大纲

输出格式可以选择：

1. 简单格式（适用于没有主要章节的短 PPT）：
[{{"title": "title1", "points": ["point1", "point2"]}}, {{"title": "title2", "points": ["point1", "point2"]}}]

2. 基于章节的格式（适用于有明确主要章节的长 PPT）：
[
    {{
    "part": "第一部分：引言",
    "pages": [
        {{"title": "欢迎", "points": ["point1", "point2"]}},
        {{"title": "概述", "points": ["point1", "point2"]}}
    ]
    }},
    {{
    "part": "第二部分：主要内容",
    "pages": [
        {{"title": "主题1", "points": ["point1", "point2"]}},
        {{"title": "主题2", "points": ["point1", "point2"]}}
    ]
    }}
]

选择最适合内容的格式。当 PPT 有清晰的主要章节时使用章节格式。

现在请根据用户要求修改大纲，只输出 JSON 格式的大纲，不要包含其他文字。
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_outline_refinement_prompt] Final prompt:\n{final_prompt}")
    return final_prompt
