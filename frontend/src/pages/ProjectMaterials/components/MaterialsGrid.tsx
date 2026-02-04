import React from 'react';
import { Copy, MoveRight, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import type { Material } from '@/api/endpoints';

type MaterialsGridProps = {
  materials: Material[];
  isMultiSelect: boolean;
  selectedIds: Set<string>;
  getMaterialDisplayName: (material: Material) => string;
  onToggleSelect: (id: string) => void;
  onEdit: (material: Material) => void;
  onMove: (material: Material) => void;
  onCopy: (material: Material) => void;
  onDelete: (materialId: string) => void;
};

export const MaterialsGrid: React.FC<MaterialsGridProps> = ({
  materials,
  isMultiSelect,
  selectedIds,
  getMaterialDisplayName,
  onToggleSelect,
  onEdit,
  onMove,
  onCopy,
  onDelete,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {materials.map((material) => (
        <div
          key={material.id}
          className={`bg-white border rounded-lg overflow-hidden ${
            selectedIds.has(material.id) ? 'border-banana-500 ring-2 ring-banana-200' : 'border-gray-200'
          }`}
        >
          <div className="relative aspect-video bg-gray-100">
            <img
              src={getImageUrl(material.url)}
              alt={getMaterialDisplayName(material)}
              className="w-full h-full object-cover"
            />
            {isMultiSelect && (
              <button
                type="button"
                onClick={() => onToggleSelect(material.id)}
                className="absolute top-2 left-2 w-6 h-6 rounded bg-white/90 border border-gray-200 flex items-center justify-center"
                aria-label="选择素材"
              >
                <input type="checkbox" checked={selectedIds.has(material.id)} readOnly className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="p-3 space-y-1">
            <div className="text-sm font-medium text-gray-800 truncate">{getMaterialDisplayName(material)}</div>
            {material.note && <div className="text-xs text-gray-500 line-clamp-2">{material.note}</div>}
            <div className="pt-2 flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" icon={<Pencil size={14} />} onClick={() => onEdit(material)}>
                编辑
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<MoveRight size={14} />}
                onClick={() => onMove(material)}
                disabled={isMultiSelect}
              >
                移动
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Copy size={14} />}
                onClick={() => onCopy(material)}
                disabled={isMultiSelect}
              >
                复制
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<Trash2 size={14} />}
                onClick={() => onDelete(material.id)}
                disabled={isMultiSelect}
              >
                删除
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
