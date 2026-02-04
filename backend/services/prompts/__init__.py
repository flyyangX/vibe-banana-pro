# -*- coding: utf-8 -*-
"""
AI Service Prompts - 模块化提示词模板

为保持向后兼容，此入口文件统一导出所有子模块的函数。
"""

# 基础模块
from .base import (
    LANGUAGE_CONFIG,
    get_default_output_language,
    get_language_instruction,
    get_ppt_language_instruction,
    format_reference_files_xml,
)

# 大纲相关
from .outline_prompts import (
    get_outline_generation_prompt,
    get_outline_parsing_prompt,
    get_outline_refinement_prompt,
)

# 描述相关
from .description_prompts import (
    get_page_description_prompt,
    get_description_to_outline_prompt,
    get_description_split_prompt,
    get_descriptions_refinement_prompt,
    get_template_style_prompt,
)

# 图片相关
from .image_prompts import (
    get_image_generation_prompt,
    get_image_edit_prompt,
    get_clean_background_prompt,
    get_template_variant_prompt,
    get_text_attribute_extraction_prompt,
    get_batch_text_attribute_extraction_prompt,
    get_quality_enhancement_prompt,
)

# 信息图相关
from .infographic_prompts import (
    get_infographic_blueprint_prompt,
    get_infographic_image_prompt,
)

# 小红书相关
from .xhs_prompts import (
    get_xhs_blueprint_prompt,
    get_xhs_image_prompt,
)

# 向后兼容：保留旧的私有函数名
_format_reference_files_xml = format_reference_files_xml

__all__ = [
    # 基础
    'LANGUAGE_CONFIG',
    'get_default_output_language',
    'get_language_instruction',
    'get_ppt_language_instruction',
    'format_reference_files_xml',
    '_format_reference_files_xml',
    # 大纲
    'get_outline_generation_prompt',
    'get_outline_parsing_prompt',
    'get_outline_refinement_prompt',
    # 描述
    'get_page_description_prompt',
    'get_description_to_outline_prompt',
    'get_description_split_prompt',
    'get_descriptions_refinement_prompt',
    'get_template_style_prompt',
    # 图片
    'get_image_generation_prompt',
    'get_image_edit_prompt',
    'get_clean_background_prompt',
    'get_template_variant_prompt',
    'get_text_attribute_extraction_prompt',
    'get_batch_text_attribute_extraction_prompt',
    'get_quality_enhancement_prompt',
    # 信息图
    'get_infographic_blueprint_prompt',
    'get_infographic_image_prompt',
    # 小红书
    'get_xhs_blueprint_prompt',
    'get_xhs_image_prompt',
]
