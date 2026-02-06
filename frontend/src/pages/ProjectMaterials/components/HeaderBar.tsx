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
    <header className="bg-white border-b border-border px-4 md:px-6 py-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" icon={<ArrowLeft size={16} />} onClick={onBack} className="hover:bg-gray-100 rounded-none h-8 w-8 p-0" />
          <h1 className="text-xl font-serif font-medium text-primary">{title} <span className="text-secondary font-sans text-sm ml-2">素材库</span></h1>
        </div>
        <div className="flex items-center gap-3">
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
            icon={<Upload size={14} />}
            onClick={onUploadClick}
            disabled={isUploading}
            className="rounded-none h-8 text-xs border border-border hover:border-primary hover:text-primary transition-colors"
          >
            上传
          </Button>
          <Button 
            variant="secondary" 
            size="sm" 
            icon={<ImagePlus size={14} />} 
            onClick={onGenerate}
            className="rounded-none h-8 text-xs border border-border hover:border-primary hover:text-primary transition-colors"
          >
            生成
          </Button>
          <Button 
            variant={isMultiSelect ? 'primary' : 'secondary'} 
            size="sm" 
            onClick={onToggleMultiSelect}
            className={`rounded-none h-8 text-xs ${isMultiSelect ? 'bg-primary text-white border-none' : 'border border-border hover:border-primary'}`}
          >
            {isMultiSelect ? '退出多选' : '多选'}
          </Button>
        </div>
      </div>
      <div className="mt-4 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
        <div className="flex items-center border-b border-border w-full md:w-auto">
          <button
            onClick={() => onScopeChange('project')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${scope === 'project' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
          >
            本项目
          </button>
          <button
            onClick={() => onScopeChange('global')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${scope === 'global' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
          >
            全局 (未归属)
          </button>
          <button
            onClick={() => onScopeChange('all')}
            className={`px-4 py-2 text-xs font-medium border-b-2 transition-colors ${scope === 'all' ? 'border-primary text-primary' : 'border-transparent text-secondary hover:text-primary'}`}
          >
            全部
          </button>
        </div>
        <div className="relative w-full md:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="搜索..."
            className="w-full pl-9 pr-3 py-1.5 text-sm border-b border-border bg-transparent focus:outline-none focus:border-primary transition-colors rounded-none placeholder-gray-300"
          />
        </div>
      </div>
    </header>
  );
};
