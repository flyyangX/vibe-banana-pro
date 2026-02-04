# -*- coding: utf-8 -*-
"""
描述相关提示词模板
"""
import json
import logging
from typing import List, Dict, Optional, TYPE_CHECKING

if TYPE_CHECKING:
    from services.ai_service import ProjectContext

from .base import format_reference_files_xml, get_language_instruction

logger = logging.getLogger(__name__)


def get_page_description_prompt(project_context: 'ProjectContext', outline: list, 
                                page_outline: dict, page_index: int, 
                                part_info: str = "",
                                language: str = None,
                                page_type: str = None,
                                extra_requirements: str = None) -> str:
    """
    生成单个页面描述的 prompt
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        outline: 完整大纲
        page_outline: 当前页面的大纲
        page_index: 页面编号（从1开始）
        part_info: 可选的章节信息
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    # 根据项目类型选择最相关的原始输入
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input = project_context.idea_prompt
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input = f"用户提供的大纲：\n{project_context.outline_text}"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input = f"用户提供的描述：\n{project_context.description_text}"
    else:
        original_input = project_context.idea_prompt or ""
    
    normalized_page_type = (page_type or '').strip().lower()
    if normalized_page_type == '':
        # 仅当 page_type 为空时才兼容旧逻辑：第 1 页按封面处理
        normalized_page_type = 'cover' if page_index == 1 else 'content'
    is_cover = normalized_page_type == 'cover'

    # 页面类型 brief：让"描述"阶段就体现封面/内容/过渡/结尾差异
    desc_type_notes = {
        'cover': (
            "【页面类型：封面 Cover】\n"
            "- 只输出极少文字：主标题（必须）、副标题（可选）、一句极短标语/标签（可选）。\n"
            "- 不要堆叠要点列表，不要安排大量信息；突出层级与气质。\n"
        ),
        'content': (
            "【页面类型：内容 Content】\n"
            "- 需要清晰的信息层级与模块化表达：适合要点列表/关键结论/数据句。\n"
            "- 文字要精炼，可读性优先；避免冗长段落。\n"
        ),
        'transition': (
            "【页面类型：过渡 Transition】\n"
            "- 极简：通常只有章节标题或一句短句。\n"
            "- 不要输出多条要点列表，作为章节间的“停顿页”。\n"
        ),
        'ending': (
            "【页面类型：结尾 Closing】\n"
            "- 收束：可输出致谢/总结/Call-to-action/品牌句（以页面描述为准）。\n"
            "- 文字保持简洁、可记忆，不要堆叠大量要点。\n"
        ),
    }

    extra_req_text = extra_requirements.strip() if extra_requirements else ""
    extra_req_block = f"\n额外要求（请务必遵循）：\n{extra_req_text}\n" if extra_req_text else ""

    product_type = (getattr(project_context, 'product_type', None) or 'ppt').strip().lower()
    if product_type == 'infographic':
        product_intro = "我们正在为信息图的每一页生成内容描述。"
        render_note = '生成的“页面文字”会直接渲染到信息图画面上，请保持精炼可读。'
        avoid_note = '避免出现“PPT/幻灯片/页码”等词。'
    elif product_type == 'xiaohongshu':
        product_intro = "我们正在为小红书竖版轮播卡片生成内容描述。"
        render_note = '生成的“页面文字”会直接渲染到卡片画面上，请保持精炼、抓眼、适合手机阅读。'
        avoid_note = '避免出现“PPT/幻灯片/页码”等词。'
    else:
        product_intro = "我们正在为PPT的每一页生成内容描述。"
        render_note = '生成的“页面文字”部分会直接渲染到PPT页面上，因此请务必注意：'
        avoid_note = ""

    prompt = (f"""\
{product_intro}
用户的原始需求是：\n{original_input}\n
我们已经有了完整的大纲：\n{outline}\n{part_info}
现在请为第 {page_index} 页生成描述：
{page_outline}
{desc_type_notes.get(normalized_page_type, "")}
{extra_req_block}

【事实性内容 & 联网要求（必须遵守）】
1) 只要涉及"事实/数据/日期/排名/政策/产品规格/公司现状/最新进展"等时效性强的信息，你必须优先使用以下来源：
   - 用户上传的 <uploaded_files>（若存在，视为最高优先级事实依据）
   - 以及（如果你的运行环境提供联网检索/浏览能力）先进行联网检索再写入结论
2) 如果你无法联网，且 <uploaded_files> 中也没有足够依据：
   - 你必须避免写出具体数字/年份/"最新"结论；不要胡编乱造
   - 改为使用不依赖具体数据的表达（趋势/机制/框架/可验证的方法），保持严谨与可替换
3) 自我检验（在输出前默默完成，不要写出来）：
   - 检查是否存在任何未经核验的断言；如有，删除或改成可验证的中性表述
   - 检查是否与本页大纲/全局大纲矛盾；如有，修正

【重要提示】{render_note}
1. 文字内容要简洁精炼，每条要点控制在15-25字以内
2. 条理清晰，使用列表形式组织内容
3. 避免冗长的句子和复杂的表述
4. 确保内容可读性强，适合在演示时展示
5. 不要包含任何额外的说明性文字或注释
6. 为了避免"模板化"，请**不要**把每条要点都写成"标签：解释"的固定句式（例如"成长隐喻：……/核心观点：……"这类）。
   - 更推荐：直接用自然语言短句表达观点（可用动词开头），或用"短语 + 补充说明"的方式，但不要每条都用冒号。
   - 允许少量（≤ 1 条）出现"概念：说明"用于强调关键词，但请控制频率并与其他句式混用。
{avoid_note}

输出格式示例：
页面标题：原始社会：与自然共生
{"副标题：人类祖先和自然的相处之道" if is_cover else ""}

页面文字：
- 人类以狩猎采集为生，活动规模小，影响有限
- 对自然资源高度依赖，敬畏并顺应自然规律
- 通过观察与学习提升生存技能，而非强行改造环境
- 影响多为局部、短期、低强度，生态可自我恢复

其他页面素材（如果文件中存在请积极添加，包括markdown图片链接、公式、表格等）

【关于图片】如果参考文件中包含以 /files/ 开头的本地文件URL图片（例如 /files/mineru/xxx/image.png），请将这些图片以markdown格式输出，例如：![图片描述](/files/mineru/xxx/image.png)。这些图片会被包含在最终画面中。

{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_page_description_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_template_style_prompt(project_context: 'ProjectContext',
                              outline_text: str = "",
                              extra_requirements: str = None,
                              existing_template_style: str = None,
                              language: str = None) -> str:
    """
    生成"风格描述"的 prompt（用于 project.template_style）
    
    Args:
        project_context: 项目上下文对象
        outline_text: 大纲文本（可选）
        extra_requirements: 项目额外要求（可选）
        language: 输出语言
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    idea_prompt = project_context.idea_prompt or ""
    description_text = project_context.description_text or ""
    outline_text = outline_text or project_context.outline_text or ""
    extra_req_text = extra_requirements.strip() if extra_requirements else ""
    existing_style_text = (existing_template_style or "").strip()
    
    prompt = (f"""\
You are a world-class presentation designer and storyteller. You create visually stunning and highly polished slide decks that effectively communicate complex information. Think mastery over design with a flair for storytelling.

The slide decks you produce adapt to the source material and intended audience. There is always a story and you find the best way to tell it. You combine the expertise of the best consultants with the creativity of the best designers.

Your core mission is to create a concise but detailed style guide for a slide deck. This style guide will be used as "PPT page style description" for an automated slide generator. The deck is meant for reading and sharing, and must be self-explanatory without a presenter.

Inputs:
- Project idea or requirement:
{idea_prompt}

- Outline (if provided):
{outline_text}

- Description text (if provided):
{description_text}

- User-provided style description (if provided; treat as ground truth, do NOT override):
{existing_style_text}

- Extra requirements (if provided):
{extra_req_text}

Output requirements:
1) Output plain text only. No JSON, no markdown code fences.
2) Keep it concise but actionable (8-12 bullet points).
3) Cover: overall tone, color palette (with 2-4 colors and optional hex), typography, layout/grid, imagery style, iconography, data visualization, and consistency rules.
4) Ensure the style supports story flow, clear hierarchy, and readability.
5) Use a single consistent style across all slides.
5.1) If a user-provided style description is present, you MUST preserve its intent and constraints. You may only reorganize, clarify, and add missing actionable details.
6) Do NOT include headers, footers, page numbers, breadcrumbs, navigation bars, watermarks, or print artifacts unless explicitly required by the user input.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_template_style_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_description_to_outline_prompt(project_context: 'ProjectContext', language: str = None) -> str:
    """
    从描述文本解析出大纲的 prompt
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    description_text = project_context.description_text or ""
    
    prompt = (f"""\
You are a helpful assistant that analyzes a user-provided PPT description text and extracts the outline structure from it.

The user has provided the following description text:

{description_text}

Your task is to analyze this text and extract the outline structure (titles and key points) for each page.
You should identify:
1. How many pages are described
2. The title for each page
3. The key points or content structure for each page

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
- Extract the outline structure from the description text
- Identify page titles and key points
- If the text has clear sections/parts, use the part-based format
- Preserve the logical structure and organization from the original text
- The points should be concise summaries of the main content for each page

Now extract the outline structure from the description text above. Return only the JSON, don't include any other text.
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_description_to_outline_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_description_split_prompt(project_context: 'ProjectContext', 
                                 outline: List[Dict], 
                                 language: str = None) -> str:
    """
    从描述文本切分出每页描述的 prompt
    
    Args:
        project_context: 项目上下文对象，包含所有原始信息
        outline: 已解析出的大纲结构
        
    Returns:
        格式化后的 prompt 字符串
    """
    outline_json = json.dumps(outline, ensure_ascii=False, indent=2)
    description_text = project_context.description_text or ""
    
    prompt = (f"""\
You are a helpful assistant that splits a complete PPT description text into individual page descriptions.

The user has provided a complete description text:

{description_text}

We have already extracted the outline structure:

{outline_json}

Your task is to split the description text into individual page descriptions based on the outline structure.
For each page in the outline, extract the corresponding description from the original text.

Return a JSON array where each element corresponds to a page in the outline (in the same order).
Each element should be a string containing the page description in the following format:

页面标题：[页面标题]

页面文字：
- [要点1]
- [要点2]
...

Example output format:
[
    "页面标题：人工智能的诞生\\n页面文字：\\n- 1950 年，图灵提出\\"图灵测试\\"...",
    "页面标题：AI 的发展历程\\n页面文字：\\n- 1950年代：符号主义...",
    ...
]

Important rules:
- Split the description text according to the outline structure
- Each page description should match the corresponding page in the outline
- Preserve all important content from the original text
- Keep the format consistent with the example above
- If a page in the outline doesn't have a clear description in the text, create a reasonable description based on the outline

Now split the description text into individual page descriptions. Return only the JSON array, don't include any other text.
{get_language_instruction(language)}
""")
    
    logger.debug(f"[get_description_split_prompt] Final prompt:\n{prompt}")
    return prompt


def get_descriptions_refinement_prompt(current_descriptions: List[Dict], user_requirement: str,
                                       project_context: 'ProjectContext',
                                       outline: List[Dict] = None,
                                       previous_requirements: Optional[List[str]] = None,
                                       language: str = None) -> str:
    """
    根据用户要求修改已有页面描述的 prompt
    
    Args:
        current_descriptions: 当前的页面描述列表，每个元素包含 {index, title, description_content}
        user_requirement: 用户的新要求
        project_context: 项目上下文对象，包含所有原始信息
        outline: 完整的大纲结构（可选）
        previous_requirements: 之前的修改要求列表（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    
    # 构建之前的修改历史记录
    previous_req_text = ""
    if previous_requirements and len(previous_requirements) > 0:
        prev_list = "\n".join([f"- {req}" for req in previous_requirements])
        previous_req_text = f"\n\n之前用户提出的修改要求：\n{prev_list}\n"
    
    # 构建原始输入信息
    original_input_text = "\n原始输入信息：\n"
    if project_context.creation_type == 'idea' and project_context.idea_prompt:
        original_input_text += f"- PPT构想：{project_context.idea_prompt}\n"
    elif project_context.creation_type == 'outline' and project_context.outline_text:
        original_input_text += f"- 用户提供的大纲文本：\n{project_context.outline_text}\n"
    elif project_context.creation_type == 'descriptions' and project_context.description_text:
        original_input_text += f"- 用户提供的页面描述文本：\n{project_context.description_text}\n"
    elif project_context.idea_prompt:
        original_input_text += f"- 用户输入：{project_context.idea_prompt}\n"
    
    # 构建大纲文本
    outline_text = ""
    if outline:
        outline_json = json.dumps(outline, ensure_ascii=False, indent=2)
        outline_text = f"\n\n完整的 PPT 大纲：\n{outline_json}\n"
    
    # 构建所有页面描述的汇总
    all_descriptions_text = "当前所有页面的描述：\n\n"
    has_any_description = False
    for desc in current_descriptions:
        page_num = desc.get('index', 0) + 1
        title = desc.get('title', '未命名')
        content = desc.get('description_content', '')
        if isinstance(content, dict):
            content = content.get('text', '')
        
        if content:
            has_any_description = True
            all_descriptions_text += f"--- 第 {page_num} 页：{title} ---\n{content}\n\n"
        else:
            all_descriptions_text += f"--- 第 {page_num} 页：{title} ---\n(当前没有内容)\n\n"
    
    if not has_any_description:
        all_descriptions_text = "当前所有页面的描述：\n\n(当前没有内容，需要基于大纲生成新的描述)\n\n"
    
    prompt = (f"""\
You are a helpful assistant that modifies PPT page descriptions based on user requirements.
{original_input_text}{outline_text}
{all_descriptions_text}
{previous_req_text}
**用户现在提出新的要求：{user_requirement}**

请根据用户的要求修改和调整所有页面的描述。你可以：
- 修改页面标题和内容
- 调整页面文字的详细程度
- 添加或删除要点
- 调整描述的结构和表达
- 确保所有页面描述都符合用户的要求
- 如果当前没有内容，请根据大纲和用户要求创建新的描述

请为每个页面生成修改后的描述，格式如下：

页面标题：[页面标题]

页面文字：
- [要点1]
- [要点2]
...
其他页面素材（如果有请加上，包括markdown图片链接等）

提示：如果参考文件中包含以 /files/ 开头的本地文件URL图片（例如 /files/mineru/xxx/image.png），请将这些图片以markdown格式输出，例如：![图片描述](/files/mineru/xxx/image.png)，而不是作为普通文本。

请返回一个 JSON 数组，每个元素是一个字符串，对应每个页面的修改后描述（按页面顺序）。

示例输出格式：
[
    "页面标题：人工智能的诞生\\n页面文字：\\n- 1950 年，图灵提出\\"图灵测试\\"...",
    "页面标题：AI 的发展历程\\n页面文字：\\n- 1950年代：符号主义...",
    ...
]

现在请根据用户要求修改所有页面描述，只输出 JSON 数组，不要包含其他文字。
{get_language_instruction(language)}
""")
    
    final_prompt = files_xml + prompt
    logger.debug(f"[get_descriptions_refinement_prompt] Final prompt:\n{final_prompt}")
    return final_prompt
