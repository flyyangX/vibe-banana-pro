import React from 'react';
import { Copy, MoveRight, Pencil, Trash2 } from 'lucide-react';

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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {materials.map((material) => (
        <div
          key={material.id}
          className={`bg-white border transition-colors group ${
            selectedIds.has(material.id) ? 'border-primary bg-gray-50' : 'border-border hover:border-gray-400'
          }`}
        >
          <div className="relative aspect-video bg-gray-50 overflow-hidden">
            <img
              src={getImageUrl(material.url)}
              alt={getMaterialDisplayName(material)}
              className={`w-full h-full object-cover transition-all duration-700 ${selectedIds.has(material.id) ? 'grayscale' : 'grayscale group-hover:grayscale-0'}`}
            />
            {isMultiSelect && (
              <button
                type="button"
                onClick={() => onToggleSelect(material.id)}
                className="absolute top-2 left-2 w-5 h-5 bg-white border border-black flex items-center justify-center"
                aria-label="选择素材"
              >
                {selectedIds.has(material.id) && <div className="w-3 h-3 bg-black" />}
              </button>
            )}
          </div>
          <div className="p-4 space-y-2">
            <div className="text-sm font-medium font-serif text-primary truncate">{getMaterialDisplayName(material)}</div>
            {material.note && <div className="text-xs text-secondary line-clamp-2">{material.note}</div>}
            
            <div className="pt-3 flex flex-wrap gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => onEdit(material)} className="text-secondary hover:text-primary transition-colors" title="编辑">
                 <Pencil size={14} />
              </button>
              <button onClick={() => onMove(material)} disabled={isMultiSelect} className="text-secondary hover:text-primary transition-colors disabled:opacity-30" title="移动">
                 <MoveRight size={14} />
              </button>
              <button onClick={() => onCopy(material)} disabled={isMultiSelect} className="text-secondary hover:text-primary transition-colors disabled:opacity-30" title="复制">
                 <Copy size={14} />
              </button>
              <button onClick={() => onDelete(material.id)} disabled={isMultiSelect} className="text-secondary hover:text-red-600 transition-colors disabled:opacity-30" title="删除">
                 <Trash2 size={14} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
