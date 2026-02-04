import React, { useState } from 'react';
import { Button, useToast, Modal } from '@/components/shared';
import type { Material } from '@/api/endpoints';
import { getImageUrl } from '@/api/client';
import { MaterialGeneratorModal } from '../MaterialGeneratorModal';
import { useMaterialManager } from './hooks/useMaterialManager';
import { MaterialGrid } from './components/MaterialGrid';
import { MaterialActions } from './components/MaterialActions';

interface MaterialSelectorProps {
  projectId?: string; // 可选，如果不提供则使用全局接口
  isOpen: boolean;
  onClose: () => void;
  onSelect: (materials: Material[], saveAsTemplate?: boolean) => void;
  multiple?: boolean; // 是否支持多选
  maxSelection?: number; // 最大选择数量
  showSaveAsTemplateOption?: boolean; // 是否显示"保存为模板"选项
}

/**
 * 素材选择器组件
 * - 浏览项目下的所有素材
 * - 支持单选/多选
 * - 可以将选中的素材转换为File对象或直接使用URL
 * - 支持上传图片作为素材
 * - 支持进入素材生成组件
 * - 支持按项目筛选素材
 */
export const MaterialSelector: React.FC<MaterialSelectorProps> = ({
  projectId,
  isOpen,
  onClose,
  onSelect,
  multiple = false,
  maxSelection,
  showSaveAsTemplateOption = false,
}) => {
  const { show } = useToast();
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);
  const [saveAsTemplate, setSaveAsTemplate] = useState(true);

  const manager = useMaterialManager({ projectId, isOpen });

  const handleGeneratorClose = () => {
    setIsGeneratorOpen(false);
    manager.loadMaterials();
  };

  const handleConfirm = () => {
    const selected = manager.getSelectedMaterials();
    if (selected.length === 0) {
      show({ message: '请至少选择一个素材', type: 'info' });
      return;
    }
    onSelect(selected, showSaveAsTemplateOption ? saveAsTemplate : undefined);
    onClose();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="选择素材" size="lg">
        <div className="space-y-4">
          {/* 工具栏 */}
          <MaterialActions
            materials={manager.materials}
            selectedCount={manager.selectedMaterials.size}
            isLoading={manager.isLoading}
            isUploading={manager.isUploading}
            filterProjectId={manager.filterProjectId}
            projects={manager.projects}
            projectId={projectId}
            showAllProjects={manager.showAllProjects}
            onFilterChange={manager.setFilterProjectId}
            onShowAllProjects={() => manager.setShowAllProjects(true)}
            onRefresh={manager.loadMaterials}
            onUpload={manager.handleUpload}
            onOpenGenerator={() => setIsGeneratorOpen(true)}
            onClearSelection={manager.handleClearSelection}
            renderProjectLabel={manager.renderProjectLabel}
          />

          {/* 素材网格 */}
          <MaterialGrid
            materials={manager.materials}
            selectedMaterials={manager.selectedMaterials}
            deletingIds={manager.deletingIds}
            isLoading={manager.isLoading}
            projectId={projectId}
            multiple={multiple}
            maxSelection={maxSelection}
            getMaterialKey={manager.getMaterialKey}
            getMaterialDisplayName={manager.getMaterialDisplayName}
            onSelectMaterial={manager.handleSelectMaterial}
            onDeleteMaterial={manager.handleDeleteMaterial}
          />

          {/* 底部操作 */}
          <div className="pt-4 border-t">
            {/* 保存为模板选项 */}
            {showSaveAsTemplateOption && (
              <div className="mb-3 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={saveAsTemplate}
                    onChange={(e) => setSaveAsTemplate(e.target.checked)}
                    className="w-4 h-4 text-banana-500 border-gray-300 rounded focus:ring-banana-500"
                  />
                  <span className="text-sm text-gray-700">同时保存到我的模板库</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose}>
                取消
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirm}
                disabled={manager.selectedMaterials.size === 0}
              >
                确认选择 ({manager.selectedMaterials.size})
              </Button>
            </div>
          </div>
        </div>
      </Modal>

      {/* 素材生成组件 */}
      {projectId && (
        <MaterialGeneratorModal
          projectId={projectId}
          isOpen={isGeneratorOpen}
          onClose={handleGeneratorClose}
        />
      )}
    </>
  );
};

/**
 * 将素材URL转换为File对象
 * 用于需要File对象的场景（如上传参考图）
 */
export const materialUrlToFile = async (material: Material, filename?: string): Promise<File> => {
  const imageUrl = getImageUrl(material.url);
  const response = await fetch(imageUrl);
  const blob = await response.blob();
  const file = new File([blob], filename || material.filename, { type: blob.type || 'image/png' });
  return file;
};
