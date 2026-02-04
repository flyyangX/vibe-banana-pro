import React from 'react';
import { ImageIcon, RefreshCw, X } from 'lucide-react';
import { getImageUrl } from '@/api/client';
import type { Material } from '@/api/endpoints';
import type { MaterialManagerReturn } from '../hooks/useMaterialManager';

interface MaterialGridProps {
  materials: Material[];
  selectedMaterials: Set<string>;
  deletingIds: Set<string>;
  isLoading: boolean;
  projectId?: string;
  multiple: boolean;
  maxSelection?: number;
  getMaterialKey: MaterialManagerReturn['getMaterialKey'];
  getMaterialDisplayName: MaterialManagerReturn['getMaterialDisplayName'];
  onSelectMaterial: (material: Material, multiple: boolean, maxSelection?: number) => void;
  onDeleteMaterial: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>, material: Material) => void;
}

export const MaterialGrid: React.FC<MaterialGridProps> = ({
  materials,
  selectedMaterials,
  deletingIds,
  isLoading,
  projectId,
  multiple,
  maxSelection,
  getMaterialKey,
  getMaterialDisplayName,
  onSelectMaterial,
  onDeleteMaterial,
}) => {
  if (isLoading && materials.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">加载中...</div>
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-400 p-4">
        <ImageIcon size={48} className="mb-4 opacity-50" />
        <div className="text-sm">暂无素材</div>
        <div className="text-xs mt-1">
          {projectId ? '可以上传图片或使用素材生成功能创建素材' : '可以上传图片作为素材'}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-4 gap-4 max-h-96 overflow-y-auto p-4">
      {materials.map((material) => {
        const key = getMaterialKey(material);
        const isSelected = selectedMaterials.has(key);
        const isDeleting = deletingIds.has(material.id);
        return (
          <div
            key={key}
            onClick={() => onSelectMaterial(material, multiple, maxSelection)}
            className={`aspect-video rounded-lg border-2 cursor-pointer transition-all relative group ${
              isSelected
                ? 'border-banana-500 ring-2 ring-banana-200'
                : 'border-gray-200 hover:border-banana-300'
            }`}
          >
            <img
              src={getImageUrl(material.url)}
              alt={getMaterialDisplayName(material)}
              className="absolute inset-0 w-full h-full object-cover"
            />
            {/* 删除按钮：右上角，圆心在角上 */}
            <button
              type="button"
              onClick={(e) => onDeleteMaterial(e, material)}
              disabled={isDeleting}
              className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10 disabled:opacity-60 disabled:cursor-not-allowed"
              aria-label="删除素材"
            >
              {isDeleting ? <RefreshCw size={12} className="animate-spin" /> : <X size={12} />}
            </button>
            {isSelected && (
              <div className="absolute inset-0 bg-banana-500 bg-opacity-20 flex items-center justify-center">
                <div className="bg-banana-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold">
                  ✓
                </div>
              </div>
            )}
            {/* 悬停时显示文件名 */}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs p-1 truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {getMaterialDisplayName(material)}
            </div>
          </div>
        );
      })}
    </div>
  );
};
