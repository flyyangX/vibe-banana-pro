import React from 'react';
import { getImageUrl } from '@/api/client';
import type { UserTemplate } from '@/api/endpoints';
import { X } from 'lucide-react';

interface PresetTemplate {
  id: string;
  name: string;
  preview: string;
  thumb?: string;
  tags: string[];
}

interface TemplateGridProps {
  userTemplates: UserTemplate[];
  presetTemplates: PresetTemplate[];
  selectedTemplateId?: string | null;
  selectedPresetTemplateId?: string | null;
  deletingTemplateId: string | null;
  onSelectUserTemplate: (template: UserTemplate) => void;
  onSelectPresetTemplate: (templateId: string, preview: string) => void;
  onDeleteUserTemplate: (template: UserTemplate, e: React.MouseEvent) => void;
  onUploadClick: () => void;
  isLoadingTemplates: boolean;
}

export const TemplateGrid: React.FC<TemplateGridProps> = ({
  userTemplates,
  presetTemplates,
  selectedTemplateId,
  selectedPresetTemplateId,
  deletingTemplateId,
  onSelectUserTemplate,
  onSelectPresetTemplate,
  onDeleteUserTemplate,
  onUploadClick,
  isLoadingTemplates,
}) => {
  return (
    <>
      {/* User saved templates */}
      {userTemplates.length > 0 && (
        <div>
          <h4 className="text-sm font-bold text-primary mb-3">我的模板</h4>
          <div className="grid grid-cols-4 gap-4 mb-6">
            {userTemplates.map((template) => (
              <div
                key={template.template_id}
                onClick={() => onSelectUserTemplate(template)}
                className={`aspect-[4/3] border-2 cursor-pointer transition-all relative group ${
                  selectedTemplateId === template.template_id
                    ? 'border-primary ring-1 ring-primary'
                    : 'border-border hover:border-black'
                }`}
              >
                <img
                  src={getImageUrl(template.thumb_url || template.template_image_url)}
                  alt={template.name || 'Template'}
                  className="absolute inset-0 w-full h-full object-cover"
                />
                {/* Delete button: only for user templates and not currently selected */}
                {selectedTemplateId !== template.template_id && (
                  <button
                    type="button"
                    onClick={(e) => onDeleteUserTemplate(template, e)}
                    disabled={deletingTemplateId === template.template_id}
                    className={`absolute -top-2 -right-2 w-6 h-6 bg-black text-white flex items-center justify-center shadow z-20 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 ${
                      deletingTemplateId === template.template_id ? 'opacity-60 cursor-not-allowed' : ''
                    }`}
                    aria-label="删除模板"
                  >
                    <X size={12} />
                  </button>
                )}
                {selectedTemplateId === template.template_id && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                    <span className="text-white font-bold text-sm tracking-widest uppercase">Selected</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h4 className="text-sm font-bold text-primary mb-3">预设模板</h4>
        <div className="grid grid-cols-4 gap-4">
          {/* Preset templates */}
          {presetTemplates.map((template) => (
            <div
              key={template.id}
              onClick={() => template.preview && onSelectPresetTemplate(template.id, template.preview)}
              className={`aspect-[4/3] border-2 cursor-pointer transition-all bg-gray-50 flex items-center justify-center relative ${
                selectedPresetTemplateId === template.id
                  ? 'border-primary ring-1 ring-primary'
                  : 'border-border hover:border-black'
              }`}
            >
              {template.preview ? (
                <>
                  <img
                    src={template.thumb || template.preview}
                    alt={template.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  {selectedPresetTemplateId === template.id && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                      <span className="text-white font-bold text-sm tracking-widest uppercase">Selected</span>
                    </div>
                  )}
                </>
              ) : (
                <span className="text-sm text-secondary font-serif italic">{template.name}</span>
              )}
            </div>
          ))}

          {/* Upload new template */}
          <label className="aspect-[4/3] border-2 border-dashed border-border hover:border-black cursor-pointer transition-all flex flex-col items-center justify-center gap-2 relative overflow-hidden bg-white hover:bg-gray-50 group">
            <span className="text-2xl font-light text-secondary group-hover:text-primary">+</span>
            <span className="text-xs text-secondary group-hover:text-primary font-medium uppercase tracking-wide">Upload</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  onUploadClick();
                }
              }}
              className="hidden"
              disabled={isLoadingTemplates}
            />
          </label>
        </div>
      </div>
    </>
  );
};
