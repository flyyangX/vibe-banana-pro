import React from 'react';
import { Sparkles, FileText, FileEdit, Lightbulb, Wand2 } from 'lucide-react';
import { Button, Textarea } from '@/components/shared';
import type { CreationMode, ProductType } from '../hooks/useHomeState';

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

  const ideaExample =
    productType === 'ppt'
      ? '例如：生成一份关于 AI 发展史的演讲 PPT'
      : productType === 'infographic'
        ? '例如：生成一张关于 AI 发展史的信息图'
        : '例如：生成一篇关于 AI 发展史的小红书图文';

  const outlineIntro =
    productType === 'ppt'
      ? '粘贴你的 PPT 大纲...'
      : productType === 'infographic'
        ? '粘贴你的信息图结构大纲...'
        : '粘贴你的小红书图文大纲...';

  const scriptIntro =
    productType === 'ppt'
      ? '粘贴你的逐页脚本...'
      : productType === 'infographic'
        ? '粘贴你的信息图分区脚本...'
        : '粘贴你的小红书图文分卡脚本...';

  const scriptExample =
    productType === 'ppt'
      ? `例如：\n第 1 页\n标题：人工智能的诞生\n内容：1950 年，图灵提出"图灵测试"...\n\n第 2 页\n标题：AI 的发展历程\n内容：1950年代：符号主义...\n...`
      : productType === 'infographic'
        ? `例如：\n第 1 ${unit}\n标题：人工智能的诞生\n内容：1950 年，图灵提出"图灵测试"...\n\n第 2 ${unit}\n标题：AI 的发展历程\n内容：1950年代：符号主义...\n...`
        : `例如：\n第 1 ${unit}\n标题：封面\n内容：AI 发展史速览（副标题/金句）\n\n第 2 ${unit}\n标题：起源\n内容：1950 年，图灵提出"图灵测试"...\n...`;

  return {
    auto: {
      label: '自动识别',
      icon: <Wand2 size={16} />,
      placeholder: `粘贴主题 / 大纲 / 分${unit}脚本，系统会自动识别类型并进入下一步`,
      description: `自动识别输入类型：主题 / 大纲 / 分${unit}脚本（适配 ${full}）`,
    },
    idea: {
      label: '主题生成',
      icon: <Sparkles size={16} />,
      placeholder: ideaExample,
      description: `输入你的想法，AI 将为你生成 ${full} 的大纲与内容`,
    },
    outline: {
      label: '大纲生成',
      icon: <FileText size={16} />,
      placeholder: `${outlineIntro}\n\n例如：\n第一部分：AI 的起源\n- 1950 年代的开端\n- 达特茅斯会议\n\n第二部分：发展历程\n...`,
      description: `已有大纲？直接粘贴即可，AI 会自动结构化并进入下一步（${full}）`,
    },
    description: {
      label: '逐页脚本',
      icon: <FileEdit size={16} />,
      placeholder: `${scriptIntro}\n\n${scriptExample}`,
      description: `已有分${unit}脚本？AI 将解析为大纲与页面内容，进入详情编辑（${full}）`,
    },
  };
};

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
}) => {
  const MODE_CONFIG = getModeConfig(productType);
  const currentConfig = MODE_CONFIG[activeTab];
  const textareaRows = activeTab === 'idea' ? 4 : 8;

  return (
    <>
      {/* 顶部控制栏：模式选择 + 产物类型 */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        {/* 模式选择 - 分段控制器风格 */}
        <div className="flex p-1 bg-gray-100/80 rounded-lg overflow-x-auto max-w-full no-scrollbar">
          {(Object.keys(MODE_CONFIG) as CreationMode[]).map((mode) => {
            const config = MODE_CONFIG[mode];
            const isActive = activeTab === mode;
            return (
              <button
                key={mode}
                onClick={() => setActiveTab(mode)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-banana-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/50'
                }`}
              >
                {config.icon}
                <span>{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* 产物类型选择 - 简化版 */}
        <div className="flex items-center gap-2 p-1 bg-gray-100/80 rounded-lg">
          <button
            type="button"
            onClick={() => setProductType('ppt')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              productType === 'ppt'
                ? 'bg-white text-banana-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            PPT
          </button>
          <button
            type="button"
            onClick={() => setProductType('infographic')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              productType === 'infographic'
                ? 'bg-white text-banana-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            信息图
          </button>
          <button
            type="button"
            onClick={() => setProductType('xiaohongshu')}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
              productType === 'xiaohongshu'
                ? 'bg-white text-banana-600 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            小红书
          </button>
        </div>
      </div>

      {/* 描述提示 */}
      <div className="relative mb-3">
        <p className="text-sm text-gray-500 flex items-center gap-2">
          <Lightbulb size={14} className="text-banana-500 flex-shrink-0" />
          <span>{currentConfig.description}</span>
        </p>
      </div>

      {/* 输入区 - 带按钮 */}
      <div className="relative mb-2 group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-banana-400 to-orange-400 rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
        <Textarea
          ref={textareaRef}
          placeholder={currentConfig.placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          rows={textareaRows}
          className="relative pr-20 md:pr-28 pb-12 md:pb-14 text-sm md:text-base border-2 border-gray-200 focus:border-banana-400 transition-colors duration-200 min-h-[160px]"
        />

        {/* 右下角：开始生成按钮 */}
        <div className="absolute right-2 md:right-3 bottom-2 md:bottom-3 z-10">
          <Button
            size="sm"
            onClick={onSubmit}
            loading={isLoading}
            disabled={!content.trim() || isParsingFiles}
            className="shadow-sm text-xs md:text-sm px-3 md:px-4"
          >
            {isParsingFiles ? '解析中...' : '下一步'}
          </Button>
        </div>
      </div>
    </>
  );
};

export default CreateProjectForm;
