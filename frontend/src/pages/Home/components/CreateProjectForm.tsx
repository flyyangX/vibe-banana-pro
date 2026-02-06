import React, { useState } from 'react';
import { ArrowRight, Sparkles, FileText, FileEdit, Wand2, Paperclip, Palette, X } from 'lucide-react';
import { Button } from '@/components/shared';
import { VisualProductSelector } from './VisualProductSelector';
import type { CreationMode, ProductType } from '../hooks/useHomeState';
import { FileUploadZone } from './FileUploadZone';
import { MaterialPreviewList, ReferenceFileList } from '@/components/shared';
import { Textarea } from '@/components/shared';
import { TemplateSelector } from '@/components/shared/TemplateSelector/index';
import { PRESET_STYLES } from '@/config/presetStyles';

interface ModeConfig {
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  description: string;
}

const PRODUCT_COPY: Record<ProductType, { short: string; full: string; unit: string }> = {
  ppt: { short: 'PPT', full: 'PPT', unit: '页' },
  infographic: { short: '信息图', full: '信息图', unit: '版块' },
  xiaohongshu: { short: '小红书', full: '小红书图文', unit: '张' },
};

const getModeConfig = (productType: ProductType): Record<CreationMode, ModeConfig> => {
  const { full, unit } = PRODUCT_COPY[productType];

  return {
    auto: {
      label: '智能识别',
      icon: <Wand2 size={13} />,
      placeholder: `粘贴你的想法、大纲或脚本...`,
      description: `自动识别输入`,
    },
    idea: {
      label: '一句话生成',
      icon: <Sparkles size={13} />,
      placeholder: `输入你的演讲主题或核心想法...`,
      description: `创意生成`,
    },
    outline: {
      label: '已有大纲',
      icon: <FileText size={13} />,
      placeholder: `1. 封面：...\n2. 目录：...\n3. 第一章：...`,
      description: `大纲转${full}`,
    },
    description: {
      label: '已有脚本',
      icon: <FileEdit size={13} />,
      placeholder: `Page 1:\n[画面]...\n[台词]...`,
      description: `脚本转${full}`,
    },
  };
};

// Define types for the props passed from Home
// Define types for the props passed from Home
interface FileProps {
    isDocDragOver: boolean;
    setIsDocDragOver: (v: boolean) => void;
    handleDocDrop: (e: React.DragEvent) => void;
    handleDocInputSelect: () => void;
    isUploadingDoc: boolean;
    docUploadProgress: number;
    isImageDragOver: boolean;
    setIsImageDragOver: (v: boolean) => void;
    handleImageDrop: (e: React.DragEvent) => void;
    handleImageSelect: () => void;
    onOpenMaterialSelector: () => void;
    isUploadingImage: boolean;
    imageUploadProgress: number;
    isUploadExpanded: boolean;
    setIsUploadExpanded: (v: boolean) => void;
    isXhs: boolean;
    docInputRef: React.RefObject<HTMLInputElement>;
    imageInputRef: React.RefObject<HTMLInputElement>;
    docAccept: string;
    imageAccept: string;
    handleDocInputSelectChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
    materialItems: any[];
    handleRemoveMaterial: (id: string) => void;
    referenceFiles: any[];
    setPreviewFileId: (id: string | null) => void;
    handleFileRemove: (id: string) => void;
    handleFileStatusChange: (id: string, status: any) => void;
}

interface StyleProps {
    useTemplateStyle: boolean;
    handleUseTemplateStyleChange: (checked: boolean) => void;
    templateStyle: string;
    setTemplateStyle: (val: any) => void; 
    handleTemplateSelect: (template: any) => void;
    selectedTemplateId: string | undefined;
    selectedPresetTemplateId: string | undefined;
    currentProjectId: string | null;
}

interface CreateProjectFormProps {
  activeTab: CreationMode;
  setActiveTab: (tab: CreationMode) => void;
  productType: ProductType;
  setProductType: (type: ProductType) => void;
  content: string;
  setContent: (content: string) => void;
  onPaste: (e: React.ClipboardEvent<HTMLTextAreaElement>) => void;
  onSubmit: () => void;
  isLoading: boolean;
  isParsingFiles: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  fileProps: FileProps;
  styleProps: StyleProps;
}

export const CreateProjectForm: React.FC<CreateProjectFormProps> = ({
  activeTab,
  setActiveTab,
  productType,
  setProductType,
  content,
  setContent,
  onPaste,
  onSubmit,
  isLoading,
  isParsingFiles,
  textareaRef,
  fileProps,
  styleProps
}) => {
  const MODE_CONFIG = getModeConfig(productType);
  const selectedConfig = MODE_CONFIG[activeTab];
  
  // Local state for toolbar panels
  const [activePanel, setActivePanel] = useState<'none' | 'files' | 'style'>('none');

  const togglePanel = (panel: 'files' | 'style') => {
      setActivePanel(current => current === panel ? 'none' : panel);
  };
  
  // Minimal mode selector
  const ModeSelector = () => (
    <div className="flex gap-6">
       {(Object.keys(MODE_CONFIG) as CreationMode[]).map((mode) => {
          const config = MODE_CONFIG[mode];
          const isActive = activeTab === mode;
          return (
            <button
              key={mode}
              onClick={() => setActiveTab(mode)}
              className={`
                text-[13px] font-medium flex items-center gap-1.5 transition-colors
                ${isActive ? 'text-black' : 'text-gray-400 hover:text-gray-600'}
              `}
            >
              {config.icon}
              {config.label}
            </button>
          );
       })}
    </div>
  );

  return (
    <div className="w-full flex flex-col">
      {/* Product Selection */}
      <VisualProductSelector 
          value={productType}
          onChange={setProductType}
          disabled={isLoading || isParsingFiles}
      />

      {/* Input Mode Tabs */}
      <div className="mb-6">
         <ModeSelector />
      </div>

      {/* Clean Input Area */}
      <div className="relative group w-full mb-4">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          placeholder={selectedConfig.placeholder}
          className="w-full bg-transparent p-0 min-h-[160px] md:min-h-[200px] resize-none outline-none text-xl md:text-2xl font-serif text-black placeholder-gray-200 leading-relaxed"
        />
      </div>
      
      {/* Integrated Toolbar & Actions */}
      <div className="flex flex-col gap-4">
          
          {/* Toolbar Buttons */}
          <div className="flex justify-between items-center border-t border-gray-100 pt-4">
             <div className="flex items-center gap-4">
                <button 
                   onClick={() => togglePanel('files')}
                   className={`flex items-center gap-2 text-sm font-medium transition-colors ${activePanel === 'files' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Paperclip size={16} />
                    <span>{fileProps.referenceFiles.length + fileProps.materialItems.length > 0 ? `附件 (${fileProps.referenceFiles.length + fileProps.materialItems.length})` : '添加附件'}</span>
                </button>
                <button 
                   onClick={() => togglePanel('style')}
                   className={`flex items-center gap-2 text-sm font-medium transition-colors ${activePanel === 'style' ? 'text-black' : 'text-gray-400 hover:text-gray-600'}`}
                >
                    <Palette size={16} />
                    <span>视觉风格</span>
                </button>
             </div>

             <Button
                onClick={onSubmit}
                loading={isLoading}
                disabled={!content.trim() || isParsingFiles}
                className={`
                    bg-black text-white hover:bg-gray-900 rounded-none px-6 py-2.5 h-auto 
                    text-sm font-medium transition-all duration-300
                    disabled:opacity-30 disabled:cursor-not-allowed
                    flex items-center gap-2
                    ${content.trim() ? 'opacity-100' : 'opacity-50'}
                `}
                >
                {isParsingFiles ? '解析中...' : '开始生成'}
                <ArrowRight size={16} />
            </Button>
          </div>

          {/* Expandable Panels */}
          {activePanel === 'files' && (
              <div className="bg-gray-50 rounded-lg p-6 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">参考资料 & 附件</h3>
                      <button onClick={() => setActivePanel('none')}><X size={14} className="text-gray-400 hover:text-black" /></button>
                  </div>
                  <FileUploadZone
                      isDocDragOver={fileProps.isDocDragOver}
                      setIsDocDragOver={fileProps.setIsDocDragOver}
                      onDocDrop={fileProps.handleDocDrop}
                      onDocInputSelect={fileProps.handleDocInputSelect}
                      isUploadingDoc={fileProps.isUploadingDoc}
                      docUploadProgress={fileProps.docUploadProgress}
                      isImageDragOver={fileProps.isImageDragOver}
                      setIsImageDragOver={fileProps.setIsImageDragOver}
                      onImageDrop={fileProps.handleImageDrop}
                      onImageSelect={fileProps.handleImageSelect}
                      onOpenMaterialSelector={fileProps.onOpenMaterialSelector}
                      isUploadingImage={fileProps.isUploadingImage}
                      imageUploadProgress={fileProps.imageUploadProgress}
                      isUploadExpanded={fileProps.isUploadExpanded}
                      setIsUploadExpanded={fileProps.setIsUploadExpanded}
                      isXhs={fileProps.isXhs}
                      docInputRef={fileProps.docInputRef}
                      imageInputRef={fileProps.imageInputRef}
                      docAccept={fileProps.docAccept}
                      imageAccept={fileProps.imageAccept}
                      onDocInputChange={fileProps.handleDocInputSelectChange}
                      onImageInputChange={fileProps.handleFileSelect}
                   />
                   {(fileProps.referenceFiles.length > 0 || fileProps.materialItems.length > 0) && (
                       <div className="mt-4 space-y-4">
                           <MaterialPreviewList
                              materials={fileProps.materialItems}
                              onRemoveMaterial={fileProps.handleRemoveMaterial}
                              title="已选素材"
                            />
                            <ReferenceFileList
                              files={fileProps.referenceFiles}
                              onFileClick={fileProps.setPreviewFileId}
                              onFileDelete={fileProps.handleFileRemove}
                              onFileStatusChange={fileProps.handleFileStatusChange}
                              deleteMode="remove"
                              title="已选文档"
                            />
                       </div>
                   )}
              </div>
          )}

          {activePanel === 'style' && (
              <div className="bg-gray-50 rounded-lg p-6 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                   <div className="flex justify-between items-center mb-4">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">视觉风格</h3>
                      <button onClick={() => setActivePanel('none')}><X size={14} className="text-gray-400 hover:text-black" /></button>
                  </div>
                  <div className="space-y-4">
                        <label className="flex items-center gap-2 cursor-pointer group w-fit">
                           <input
                             type="checkbox"
                             checked={styleProps.useTemplateStyle}
                             onChange={(e) => styleProps.handleUseTemplateStyleChange(e.target.checked)}
                             className="accent-black w-3.5 h-3.5" 
                           />
                           <span className="text-sm text-gray-600 group-hover:text-black transition-colors">
                             使用自定义描述
                           </span>
                        </label>

                        {styleProps.useTemplateStyle ? (
                          <div className="space-y-3">
                            <Textarea
                              placeholder="例如：极简风格，衬线字体，高对比度..."
                              value={styleProps.templateStyle}
                              onChange={(e) => styleProps.setTemplateStyle(e.target.value)}
                              rows={2}
                              className="text-sm border border-gray-200 focus:border-black p-3 w-full bg-white rounded-md resize-none font-serif"
                            />
                             <div className="flex flex-wrap gap-2">
                                {PRESET_STYLES.map((preset) => (
                                  <button
                                    key={preset.id}
                                    type="button"
                                    onClick={() => styleProps.setTemplateStyle((prev: string) => prev === preset.description ? '' : preset.description)}
                                    className={`px-2 py-1 text-[10px] uppercase font-bold tracking-wider transition-colors border rounded-sm ${
                                      styleProps.templateStyle === preset.description
                                        ? 'border-black bg-black text-white'
                                        : 'border-gray-200 bg-white text-gray-400 hover:border-gray-400 hover:text-black'
                                    }`}
                                  >
                                    {preset.name}
                                  </button>
                                ))}
                              </div>
                          </div>
                        ) : (
                           <div className="bg-white rounded-lg p-2 border border-gray-200">
                              <TemplateSelector
                                onSelect={styleProps.handleTemplateSelect}
                                selectedTemplateId={styleProps.selectedTemplateId}
                                selectedPresetTemplateId={styleProps.selectedPresetTemplateId}
                                showUpload={true}
                                projectId={styleProps.currentProjectId}
                              />
                           </div>
                        )}
                     </div>
              </div>
          )}
      </div>
    </div>
  );
};

export default CreateProjectForm;
