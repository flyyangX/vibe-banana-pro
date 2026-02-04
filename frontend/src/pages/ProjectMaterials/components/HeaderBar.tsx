import React from 'react';
import { ArrowLeft, ImagePlus, Search, Upload } from 'lucide-react';
import { Button } from '@/components/shared';
import type { MaterialScope } from '../hooks/useProjectMaterialsState';

type HeaderBarProps = {
  title: string;
  scope: MaterialScope;
  search: string;
  isUploading: boolean;
  isMultiSelect: boolean;
  uploadInputRef: React.RefObject<HTMLInputElement>;
  onBack: () => void;
  onScopeChange: (scope: MaterialScope) => void;
  onSearchChange: (value: string) => void;
  onUploadClick: () => void;
  onUploadChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onGenerate: () => void;
  onToggleMultiSelect: () => void;
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  scope,
  search,
  isUploading,
  isMultiSelect,
  uploadInputRef,
  onBack,
  onScopeChange,
  onSearchChange,
  onUploadClick,
  onUploadChange,
  onGenerate,
  onToggleMultiSelect,
}) => {
  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-4 md:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack}>
            返回
          </Button>
          <h1 className="text-base md:text-lg font-semibold text-gray-800">{title} · 素材库</h1>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={uploadInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={onUploadChange}
            className="hidden"
          />
          <Button
            variant="secondary"
            size="sm"
            icon={<Upload size={16} />}
            onClick={onUploadClick}
            disabled={isUploading}
          >
            上传素材
          </Button>
          <Button variant="primary" size="sm" icon={<ImagePlus size={16} />} onClick={onGenerate}>
            生成素材
          </Button>
          <Button variant={isMultiSelect ? 'primary' : 'secondary'} size="sm" onClick={onToggleMultiSelect}>
            {isMultiSelect ? '退出多选' : '多选'}
          </Button>
        </div>
      </div>
      <div className="mt-3 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant={scope === 'project' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onScopeChange('project')}
          >
            本项目
          </Button>
          <Button
            variant={scope === 'global' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onScopeChange('global')}
          >
            全局（未归属）
          </Button>
          <Button
            variant={scope === 'all' ? 'primary' : 'ghost'}
            size="sm"
            onClick={() => onScopeChange('all')}
          >
            全部（含全局）
          </Button>
        </div>
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索名称/文件名/备注"
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
          />
        </div>
      </div>
    </header>
  );
};
