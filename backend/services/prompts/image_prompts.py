"""
Image generation prompts - PPT图片生成相关提示词
"""
import json
import logging
from typing import List, Dict, Optional

from .base import get_ppt_language_instruction

logger = logging.getLogger(__name__)


def get_image_generation_prompt(page_desc: str, outline_text: str, 
                                current_section: str,
                                has_material_images: bool = False,
                                extra_requirements: str = None,
                                language: str = None,
                                has_template: bool = True,
                                page_index: int = 1,
                                page_type: str = None) -> str:
    """
    生成图片生成 prompt
    
    Args:
        page_desc: 页面描述文本
        outline_text: 大纲文本
        current_section: 当前章节
        has_material_images: 是否有素材图片
        extra_requirements: 额外的要求（可能包含风格描述）
        language: 输出语言
        has_template: 是否有模板图片（False表示无模板图模式）
    Returns:
        格式化后的 prompt 字符串
    """
    # 如果有素材图片，在 prompt 中明确告知 AI
    material_images_note = ""
    if has_material_images:
        material_images_note = (
            "\n\n提示：" + ("除了模板参考图片（用于风格参考）外，还提供了额外的素材图片。" if has_template else "用户提供了额外的素材图片。") +
            "这些素材图片是可供挑选和使用的元素，你可以从这些素材图片中选择合适的图片、图标、图表或其他视觉元素"
            "直接整合到生成的PPT页面中。请根据页面内容的需要，智能地选择和组合这些素材图片中的元素。"
        )
    
    # 添加额外要求到提示词
    extra_req_text = ""
    if extra_requirements and extra_requirements.strip():
        extra_req_text = f"\n\n额外要求（请务必遵循）：\n{extra_requirements}\n"

    # 根据是否有模板生成不同的设计指南内容（保持原prompt要点顺序）
    template_style_guideline = "- 配色和设计语言和模板图片严格相似。" if has_template else "- 严格按照风格描述进行设计。"
    forbidden_template_text_guidline = "- 只参考风格设计，禁止出现模板中的文字。\n" if has_template else ""

    # 该处参考了@歸藏的A工具箱
    normalized_page_type = (page_type or '').strip().lower()
    if normalized_page_type == '':
        # 仅当 page_type 为空时才兼容旧逻辑：未指定类型时，用页码判断封面
        normalized_page_type = 'cover' if page_index == 1 else 'content'

    # 每种页面类型的"设计 brief"（偏好/倾向），用于强化版式差异与稳定性
    page_type_notes = {
        'cover': (
            "注意：当前页面为PPT的封面页（Cover Page）。\n"
            "- 倾向：高质感、克制、层级清晰（主标题最大，其次副标题/短标签）。\n"
            "- 倾向：文字更少但更显著，留白更充足，画面更像“封面”而不是“内容页”。\n"
        ),
        'content': (
            "注意：当前页面为PPT的内容页（Content Page）。\n"
            "- 倾向：信息层级清晰、模块化布局（栅格/卡片），对齐与间距统一。\n"
            "- 倾向：可读性优先、专业克制；装饰只做辅助且与参考风格一致。\n"
        ),
        'transition': (
            "注意：当前页面为PPT的过渡/章节页（Transition Page）。\n"
            "- 倾向：内容极少（通常只有章节标题/一句短句），留白更多。\n"
            "- 倾向：作为段落间的视觉停顿（visual pause），更干净、更克制。\n"
        ),
        'ending': (
            "注意：当前页面为PPT的结尾页（Closing/Ending Page）。\n"
            "- 倾向：收束、稳重、可记忆；可包含致谢/总结/CTA（以页面描述为准）。\n"
            "- 倾向：与封面保持一致的视觉语言，但更克制。\n"
        ),
    }

    prompt = (f"""\
你是一位专家级UI UX演示设计师，专注于生成设计良好的PPT页面。
当前PPT页面的页面描述如下:
<page_description>
{page_desc}
</page_description>

<reference_information>
以下内容仅用于理解上下文，不得出现在最终画面中：
整个PPT的大纲为：
{outline_text}

当前位于章节：{current_section}
</reference_information>


<constraints>
【不可妥协的硬约束】
1) 输出为16:9比例、4K质感，文字清晰锐利。
2）根据内容自动设计最完美的构图
3) 必须完整渲染 <page_description> 内的全部文字：不遗漏、不改写、不新增无关文本。
4) 如非必要，禁止出现 markdown 符号（如 #、* 等）。
5) {template_style_guideline}
6) 除非 <page_description> 明确要求，否则禁止出现页眉/页脚/页码/面包屑/导航条/水印/打印页码等页面装饰。
7) 禁止渲染 <reference_information> 中的任何文字（包括"当前位于章节：..."），除非 <page_description> 明确要求展示章节/面包屑/导航信息。
{forbidden_template_text_guidline}</constraints>

<preferences>
【设计偏好（允许自由发挥）】
- 让版式层级清晰、对齐统一、留白自然；优先保证可读性与信息节奏。
- 装饰元素可用但要克制且与整体风格一致：只在需要时补空，不要喧宾夺主。
</preferences>
{get_ppt_language_instruction(language)}
{material_images_note}{extra_req_text}
{page_type_notes.get(normalized_page_type, "")}
""")
    
    logger.debug(f"[get_image_generation_prompt] Final prompt:\n{prompt}")
    return prompt


def get_image_edit_prompt(edit_instruction: str, original_description: str = None) -> str:
    """
    生成图片编辑 prompt
    
    Args:
        edit_instruction: 编辑指令
        original_description: 原始页面描述（可选）
        
    Returns:
        格式化后的 prompt 字符串
    """
    if original_description:
        # 删除"其他页面素材："之后的内容，避免被前面的图影响
        if "其他页面素材" in original_description:
            original_description = original_description.split("其他页面素材")[0].strip()
        
        prompt = (f"""\
该PPT页面的原始页面描述为：
{original_description}

现在，根据以下指令修改这张PPT页面：{edit_instruction}

要求维持原有的文字内容和设计风格，只按照指令进行修改。提供的参考图中既有新素材，也有用户手动框选出的区域，请你根据原图和参考图的关系智能判断用户意图。
""")
    else:
        prompt = f"根据以下指令修改这张PPT页面：{edit_instruction}\n保持原有的内容结构和设计风格，只按照指令进行修改。提供的参考图中既有新素材，也有用户手动框选出的区域，请你根据原图和参考图的关系智能判断用户意图。"
    
    logger.debug(f"[get_image_edit_prompt] Final prompt:\n{prompt}")
    return prompt


def get_clean_background_prompt() -> str:
    """
    生成纯背景图的 prompt（去除文字和插画）
    用于从完整的PPT页面中提取纯背景
    """
    prompt = """\
你是一位专业的图片文字&图片擦除专家。你的任务是从原始图片中移除文字和配图，输出一张无任何文字和图表内容、干净纯净的底板图。
<requirements>
- 彻底移除页面中的所有文字、插画、图表。必须确保所有文字都被完全去除。
- 保持原背景设计的完整性（包括渐变、纹理、图案、线条、色块等）。保留原图的文本框和色块。
- 对于被前景元素遮挡的背景区域，要智能填补，使背景保持无缝和完整，就像被移除的元素从来没有出现过。
- 输出图片的尺寸、风格、配色必须和原图完全一致。
- 请勿新增任何元素。
</requirements>

注意，**任意位置的, 所有的**文字和图表都应该被彻底移除，**输出不应该包含任何文字和图表。**
"""
    logger.debug(f"[get_clean_background_prompt] Final prompt:\n{prompt}")
    return prompt


def get_template_variant_prompt(variant_type: str) -> str:
    """
    生成模板套装变体的 prompt（基于参考图风格，输出纯背景/装饰模板）
    """
    variant_type = (variant_type or 'content').lower()
    # 关键：不同变体需要"明显差异"，否则模型会复用同一布局
    type_spec_map = {
        'cover': (
            "封面页背景。\n"
            "设计要求：\n"
            "1) 视觉目标：强焦点 + 高级质感（cinematic / premium product launch feeling）。\n"
            "2) 焦点构图：在中上或中心形成“标题聚焦区”，但必须克制、干净、可叠加文字。\n"
            "   - 推荐用方式：更大的留白、更干净的背景层次，微弱对比来引导视线。\n"
            "   - 明确禁止：生成巨大圆形光斑/聚光灯晕染、厚重的中心渐变色团、强烈大面积色块覆盖主体区域（会显得廉价且影响标题可读性）。\n"
            "3) 标题安全区：中上/中心留出干净区域，便于叠加大标题与副标题；边缘可更丰富。\n"
            "4) 装饰密度：四类中最高，但要有秩序，不杂乱。\n"
        ),
        'transition': (
            "过渡/章节页背景。\n"
            "设计要求：\n"
            "1) 极简：装饰元素数量显著减少，只保留少量轻量元素（细线、微弱纹理、小角标）。\n"
            "2) 强负空间：中心或上半区域大面积留白，形成章节间的“视觉停顿”（visual pause）。\n"
            "3) 氛围克制：对比与噪点更低，干净、优雅、带情绪的呼吸感（breathing moment）。\n"
            "4) 与其他变体相比：装饰密度最低、留白最多。\n"
        ),
        'ending': (
            "结尾页背景。\n"
            "设计要求：\n"
            "1) 收束与记忆点：像电影片尾画面（movie ending frame），干净但有“落点”。\n"
            "2) 稳定构图：在底部或中心形成稳定的结构/聚焦（底部条带、对称构图、柔和聚光等）。\n"
            "3) 与封面一致：配色与材质语言应呼应封面，但装饰更克制、更沉稳。\n"
            "4) 留白适中：不如过渡页极简，也不如封面页装饰密集。\n"
        ),
        'content': (
            "内容页背景。\n"
            "设计要求：\n"
            "1) 模块化：暗示栅格/卡片/分区结构（通过色块、细线分割、弱纹理层次），便于叠加正文。\n"
            "2) 强对齐与留白：内容安全区清晰（中部/左右），装饰主要在边缘，不干扰阅读。\n"
            "3) 专业克制：偏咨询/报告风格；避免“装饰噪点”，但保持参考图材质与配色一致。\n"
            "4) 装饰密度：明显高于过渡页，明显低于封面页。\n"
        ),
    }
    type_spec = type_spec_map.get(variant_type, type_spec_map['content'])

    prompt = f"""\
你是一位专业的PPT模板设计师。请基于参考图的整体风格、配色和视觉语言，生成一张新的PPT背景模板图。
要求：
- 只输出背景和装饰性元素，不要出现任何文字、logo、图标、人物、图表或具体内容。
- 画面干净、可用于叠加内容，保持与参考图一致的风格与质感。
- 不同类型（封面/内容/过渡/结尾）之间必须有明显差异：构图、留白比例、装饰密度、视觉焦点位置至少两项不同。禁止简单复制同一布局。
- {type_spec}
- 画面中不能出现占位文字（例如 lorem ipsum）。
"""
    logger.debug(f"[get_template_variant_prompt] Final prompt:\n{prompt}")
    return prompt


def get_text_attribute_extraction_prompt(content_hint: str = "") -> str:
    """
    生成文字属性提取的 prompt
    
    提取文字内容、颜色、公式等信息。模型输出的文字将替代 OCR 结果。
    
    Args:
        content_hint: 文字内容提示（OCR 结果参考），如果提供则会在 prompt 中包含
    
    Returns:
        格式化后的 prompt 字符串
    """
    prompt = """你的任务是精确识别这张图片中的文字内容和样式，返回JSON格式的结果。

{content_hint}

## 核心任务
请仔细观察图片，精确识别：
1. **文字内容** - 输出你实际看到的文字符号。
2. **颜色** - 每个字/词的实际颜色
3. **空格** - 精确识别文本中空格的位置和数量
4. **公式** - 如果是数学公式，输出 LaTeX 格式

## 注意事项
- **空格识别**：必须精确还原空格数量，多个连续空格要完整保留，不要合并或省略
- **颜色分割**：一行文字可能有多种颜色，按颜色分割成片段，一般来说只有两种颜色。
- **公式识别**：如果片段是数学公式，设置 is_latex=true 并用 LaTeX 格式输出
- **相邻合并**：相同颜色的相邻普通文字应合并为一个片段

## 输出格式
- colored_segments: 文字片段数组，每个片段包含：
  - text: 文字内容（公式时为 LaTeX 格式，如 "x^2"、"\\sum_{{i=1}}^n"）
  - color: 颜色，十六进制格式 "#RRGGBB"
  - is_latex: 布尔值，true 表示这是一个 LaTeX 公式片段（可选，默认 false）

只返回JSON对象，不要包含任何其他文字。
示例输出：
```json
{{
    "colored_segments": [
        {{"text": "·  创新合成", "color": "#000000"}},
        {{"text": "1827个任务环境", "color": "#26397A"}},
        {{"text": "与", "color": "#000000"}},
        {{"text": "8.5万提示词", "color": "#26397A"}},
        {{"text": "突破数据瓶颈", "color": "#000000"}},
        {{"text": "x^2 + y^2 = z^2", "color": "#FF0000", "is_latex": true}}
    ]
}}
```
""".format(content_hint=content_hint)
    
    # logger.debug(f"[get_text_attribute_extraction_prompt] Final prompt:\n{prompt}")
    return prompt


def get_batch_text_attribute_extraction_prompt(text_elements_json: str) -> str:
    """
    生成批量文字属性提取的 prompt
    
    新逻辑：给模型提供全图和所有文本元素的 bbox 及内容，
    让模型一次性分析所有文本的样式属性。
    
    Args:
        text_elements_json: 文本元素列表的 JSON 字符串，每个元素包含：
            - element_id: 元素唯一标识
            - bbox: 边界框 [x0, y0, x1, y1]
            - content: 文字内容
    
    Returns:
        格式化后的 prompt 字符串
    """
    prompt = f"""你是一位专业的 PPT/文档排版分析专家。请分析这张图片中所有标注的文字区域的样式属性。

我已经从图片中提取了以下文字元素及其位置信息：

```json
{text_elements_json}
```

请仔细观察图片，对比每个文字区域在图片中的实际视觉效果，为每个元素分析以下属性：

1. **font_color**: 字体颜色的十六进制值，格式为 "#RRGGBB"
   - 请仔细观察文字的实际颜色，不要只返回黑色
   - 常见颜色如：白色 "#FFFFFF"、蓝色 "#0066CC"、红色 "#FF0000" 等

2. **is_bold**: 是否为粗体 (true/false)
   - 观察笔画粗细，标题通常是粗体

3. **is_italic**: 是否为斜体 (true/false)

4. **is_underline**: 是否有下划线 (true/false)

5. **text_alignment**: 文字对齐方式
   - "left": 左对齐
   - "center": 居中对齐
   - "right": 右对齐
   - "justify": 两端对齐
   - 如果无法判断，根据文字在其区域内的位置推测

请返回一个 JSON 数组，数组中每个对象对应输入的一个元素（按相同顺序），包含以下字段：
- element_id: 与输入相同的元素ID
- text_content: 文字内容
- font_color: 颜色十六进制值
- is_bold: 布尔值
- is_italic: 布尔值
- is_underline: 布尔值
- text_alignment: 对齐方式字符串

只返回 JSON 数组，不要包含其他文字：
```json
[
    {{
        "element_id": "xxx",
        "text_content": "文字内容",
        "font_color": "#RRGGBB",
        "is_bold": true/false,
        "is_italic": true/false,
        "is_underline": true/false,
        "text_alignment": "对齐方式"
    }},
    ...
]
```
"""
    
    # logger.debug(f"[get_batch_text_attribute_extraction_prompt] Final prompt:\n{prompt}")
    return prompt


def get_quality_enhancement_prompt(inpainted_regions: list = None) -> str:
    """
    生成画质提升的 prompt
    用于在百度图像修复后，使用生成式模型提升整体画质
    
    Args:
        inpainted_regions: 被修复区域列表，每个区域包含百分比坐标：
            - left, top, right, bottom: 相对于图片宽高的百分比 (0-100)
            - width_percent, height_percent: 区域宽高占图片的百分比
    """
    import json
    
    # 构建区域信息
    regions_info = ""
    if inpainted_regions and len(inpainted_regions) > 0:
        regions_json = json.dumps(inpainted_regions, ensure_ascii=False, indent=2)
        regions_info = f"""
以下是被抹除工具处理过的具体区域（共 {len(inpainted_regions)} 个矩形区域），请重点修复这些位置：

```json
{regions_json}
```

坐标说明（所有数值都是相对于图片宽高的百分比，范围0-100%）：
- left: 区域左边缘距离图片左边缘的百分比
- top: 区域上边缘距离图片上边缘的百分比  
- right: 区域右边缘距离图片左边缘的百分比
- bottom: 区域下边缘距离图片上边缘的百分比
- width_percent: 区域宽度占图片宽度的百分比
- height_percent: 区域高度占图片高度的百分比

例如：left=10 表示区域从图片左侧10%的位置开始。
"""
    
    prompt = f"""\
你是一位专业的图像修复专家。这张ppt页面图片刚刚经过了文字/对象抹除操作，抹除工具在指定区域留下了一些修复痕迹，包括：
- 色块不均匀、颜色不连贯
- 模糊的斑块或涂抹痕迹
- 与周围背景不协调的区域，比如不和谐的渐变色块
- 可能的纹理断裂或图案不连续
{regions_info}
你的任务是修复这些抹除痕迹，让图片看起来像从未有过对象抹除操作一样自然。

要求：
- **重点修复上述标注的区域**：这些区域刚刚经过抹除处理，需要让它们与周围背景完美融合
- 保持纹理、颜色、图案的连续性
- 提升整体画质，消除模糊、噪点、伪影
- 保持图片的原始构图、布局、色调风格
- 禁止添加任何文字、图表、插画、图案、边框等元素
- 除了上述区域，其他区域不要做任何修改，保持和原图像素级别地一致。
- 输出图片的尺寸必须与原图一致

请输出修复后的高清ppt页面背景图片，不要遗漏修复任何一个被涂抹的区域。
"""
#     prompt = f"""
# 你是一位专业的图像修复专家。请你修复上传的图像，去除其中的涂抹痕迹，消除所有的模糊、噪点、伪影，输出处理后的高清图像，其他区域保持和原图**完全相同**，颜色、布局、线条、装饰需要完全一致.
# {regions_info}
# """
    return prompt
