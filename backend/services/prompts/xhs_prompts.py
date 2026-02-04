"""
小红书图文生成相关的 Prompt 模板

包含：
- get_xhs_blueprint_prompt: 生成小红书竖版轮播图文的结构化蓝图
- get_xhs_image_prompt: 生成单张小红书竖版信息卡片图片
"""
import json
import logging
from typing import Dict, TYPE_CHECKING

from .base import get_language_instruction, format_reference_files_xml

if TYPE_CHECKING:
    from services.ai_service import ProjectContext

logger = logging.getLogger(__name__)


def get_xhs_blueprint_prompt(
    project_context: 'ProjectContext',
    outline_text: str = "",
    image_count: int = 7,
    aspect_ratio: str = "4:5",
    language: str = None
) -> str:
    """
    生成"小红书图文（竖版轮播）"的结构化蓝图（JSON）。
    """
    files_xml = format_reference_files_xml(project_context.reference_files_content)
    idea_prompt = project_context.idea_prompt or ""
    description_text = project_context.description_text or ""
    outline_text = outline_text or project_context.outline_text or ""
    extra_req_text = (getattr(project_context, 'extra_requirements', '') or '').strip()
    style_text = (getattr(project_context, 'template_style', '') or '').strip()
    safe_count = int(image_count or 7)
    safe_count = min(9, max(6, safe_count))
    aspect_ratio = (aspect_ratio or "4:5").strip()

    prompt = f"""\
你是一名"小红书图文内容策划 + 信息卡片编辑"。请将输入内容整理成一个可直接生成"竖版轮播图文"的结构化蓝图（JSON）。

目标产物：
- 竖版轮播图文（手机阅读），共 {safe_count} 张图（第 1 张为封面，其余为内容卡片）
- 同时输出小红书文案：标题、正文、话题标签

图片参数：
- 建议画幅比例：{aspect_ratio}（竖版）

输入：
- 项目想法/主题：
{idea_prompt}

- 大纲（如果有）：
{outline_text}

- 描述文本（如果有）：
{description_text}

- 额外要求（如有，必须严格遵循）：
{extra_req_text or "无"}

- 风格描述（如有，必须严格遵循）：
{style_text or "无"}

输出要求（必须严格遵守）：
1) 只输出 JSON（不要 markdown 代码块、不要额外解释文字）。
2) JSON schema 如下：
{{
  "product_type": "xiaohongshu",
  "mode": "vertical_carousel",
  "aspect_ratio": "{aspect_ratio}",
  "image_count": {safe_count},
  "copywriting": {{
    "title": "主标题（<=20字，吸引点击）",
    "title_candidates": ["备选标题1", "备选标题2", "备选标题3"],
    "body": "正文（口语化、分段、可读性强，建议含要点/步骤/避坑/总结）",
    "hashtags": ["#话题1", "#话题2", "#话题3"]
  }},
  "style_pack": {{
    "tone": "整体语气/人设（例如：理性科普/亲测分享/干货清单）",
    "palette": ["主色#HEX", "辅助色#HEX", "高亮色#HEX"],
    "typography": "字体风格/字重/字号层级（标题、正文、数字强调）",
    "title_style": "标题样式（颜色、加粗、描边/高光方式）",
    "background": "背景材质/纹理/光影/留白规则（可含颜色与透明度）",
    "highlight_rules": "高亮/标注/强调的使用方式与频率",
    "do": ["必须做的设计规则1", "规则2"],
    "dont": ["禁止做的设计规则1", "规则2"]
  }},
  "cards": [
    {{
      "index": 0,
      "role": "cover",
      "heading": "封面主标题（<=14字）",
      "subheading": "封面副标题（可选，<=20字）",
      "bullets": ["要点1", "要点2"],
      "visual_suggestions": ["图标/图形建议", "结构建议"]
    }},
    {{
      "index": 1,
      "role": "content",
      "heading": "内容卡标题（<=14字）",
      "subheading": "（可选）",
      "bullets": ["3-6条要点，短句"],
      "visual_suggestions": ["时间线/对比表/流程图/清单/数字强调等建议"]
    }}
  ]
}}
3) cards 数组长度必须等于 image_count，index 从 0 到 image_count-1，且严格递增。
4) 每张卡片都要"信息密度高但可读"，避免长段落；更倾向清单、步骤、对比、时间线。
5) 文案与卡片内容要一致，不要虚构无法自洽的信息；如果不确定，使用保守表述并标注"可能/一般/通常"。
6) 标题与正文的写作规范（尽量遵循，除非与"额外要求/风格描述"冲突）：
   - 标题：15-25字优先，尽量包含数字/对比/疑问/痛点中的 1-2 个；emoji 可少量点缀但不要堆叠。
   - 正文：200-500字，分段清晰（2-4行/段），开头必须有 hook，结尾建议有互动引导（例如"你们更想看哪条？"）。
   - hashtags：5-8个，兼顾大词+精准小词，按重要性排序；必须以 # 开头。
7) JSON 中如需换行，请使用 \\n（不要输出 markdown）。\n{get_language_instruction(language)}
"""
    final_prompt = files_xml + prompt
    logger.debug(f"[get_xhs_blueprint_prompt] Final prompt:\n{final_prompt}")
    return final_prompt


def get_xhs_image_prompt(
    card: Dict,
    style_pack: Dict,
    aspect_ratio: str = "4:5",
    total: int = 7,
    language: str = None
) -> str:
    """
    生成单张"小红书竖版信息卡片"图片的 prompt。
    """
    card = card or {}
    style_pack = style_pack or {}
    index = card.get("index", 0)
    role = (card.get("role") or ("cover" if index == 0 else "content")).strip()
    heading = card.get("heading", "")
    subheading = card.get("subheading", "")
    bullets = card.get("bullets") or []
    if not isinstance(bullets, list):
        bullets = [str(bullets)]
    bullets_text = "\n".join([f"- {str(b).strip()}" for b in bullets if str(b).strip()])
    visual_suggestions = card.get("visual_suggestions") or []
    if not isinstance(visual_suggestions, list):
        visual_suggestions = [str(visual_suggestions)]
    visual_text = "\n".join([f"- {str(v).strip()}" for v in visual_suggestions if str(v).strip()])

    style_text = json.dumps(style_pack, ensure_ascii=False, indent=2) if style_pack else "{}"

    prompt = f"""\
你是一名"小红书竖版信息卡片"视觉设计师。请生成一张竖版轮播图（不是PPT/不是幻灯片）。

画幅比例：{aspect_ratio}
总张数：{total}
当前张：{index + 1}/{total}
角色：{role}

统一风格包（必须遵循）：
{style_text}

本页内容：
- 主标题：{heading}
- 副标题：{subheading}
- 要点：
{bullets_text}

可视化建议（可选，尽量采纳）：
{visual_text}

设计要求：
- 竖版、手机可读：字号足够大、层级清晰、对齐与留白统一。
- 信息卡片风：用模块/卡片/分区块表达，优先清单、步骤、对比、时间线、数字强调。
- 文字必须清晰可读且内容准确；避免生成乱码或难以辨认的文字。
- 不要出现页码、页眉页脚、导航条、水印、PPT元素。
- 合规硬约束：禁止出现任何"小红书logo/水印/右下角用户ID/平台标识"；如参考图中带有水印/Logo（尤其右下角、左上角），生成结果必须去除。
- 画面必须保持竖屏阅读方向：禁止旋转、倒置、横版排版。
- 不要添加手机边框、截屏UI、白色留边或相框。
{get_language_instruction(language)}
"""
    logger.debug(f"[get_xhs_image_prompt] Final prompt:\n{prompt}")
    return prompt
