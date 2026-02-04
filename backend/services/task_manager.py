"""
Compatibility layer for task manager and background tasks.

This module re-exports the task manager and task functions after refactor.
"""

from services.tasks import (
    TaskManager,
    task_manager,
    infer_page_type,
    update_xhs_payload_material,
    generate_descriptions_task,
    generate_images_task,
    generate_single_page_image_task,
    edit_page_image_task,
    generate_infographic_task,
    generate_xhs_task,
    generate_xhs_single_card_task,
    edit_xhs_card_image_task,
    generate_material_image_task,
    edit_material_image_task,
    generate_template_variants_task,
    generate_single_template_variant_task,
    export_editable_pptx_with_recursive_analysis_task,
)

__all__ = [
    "TaskManager",
    "task_manager",
    "infer_page_type",
    "update_xhs_payload_material",
    "generate_descriptions_task",
    "generate_images_task",
    "generate_single_page_image_task",
    "edit_page_image_task",
    "generate_infographic_task",
    "generate_xhs_task",
    "generate_xhs_single_card_task",
    "edit_xhs_card_image_task",
    "generate_material_image_task",
    "edit_material_image_task",
    "generate_template_variants_task",
    "generate_single_template_variant_task",
    "export_editable_pptx_with_recursive_analysis_task",
]
