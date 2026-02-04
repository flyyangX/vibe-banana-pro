import React from 'react';
import { X } from 'lucide-react';

interface MaterialPreviewItem {
  id?: string;
  projectId?: string | null;
  url: string;
  name?: string;
}

interface MaterialPreviewListProps {
  materials: MaterialPreviewItem[];
  onRemoveMaterial?: (url: string) => void;
  className?: string;
  title?: string;
}

export const MaterialPreviewList: React.FC<MaterialPreviewListProps> = ({
  materials,
  onRemoveMaterial,
  className = '',
  title = '素材预览'
}) => {
  if (materials.length === 0) {
    return null;
  }

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-sm font-medium text-gray-700">
          {title} ({materials.length})
        </span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {materials.map((material, index) => (
          <div key={`${material.url}-${index}`} className="relative flex-shrink-0 group">
            <div className="relative w-32 h-32 bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-200 hover:border-banana-400 transition-colors">
              <img
                src={material.url}
                alt={material.name || 'material'}
                className="w-full h-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                  const parent = target.parentElement;
                  if (parent && !parent.querySelector('.error-placeholder')) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'error-placeholder w-full h-full flex items-center justify-center text-gray-400 text-xs text-center p-2';
                    placeholder.textContent = '图片加载失败';
                    parent.appendChild(placeholder);
                  }
                }}
              />

              {onRemoveMaterial && (
                <button
                  onClick={() => onRemoveMaterial(material.url)}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 active:scale-95"
                  title="移除素材"
                >
                  <X size={14} />
                </button>
              )}

              <div className="absolute inset-x-0 bottom-0 bg-black/70 text-white text-xs p-1 opacity-0 group-hover:opacity-100 transition-opacity truncate">
                {material.name || material.url}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MaterialPreviewList;
