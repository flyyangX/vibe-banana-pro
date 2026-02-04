import React from 'react';
import { Sparkles, FileText, FileEdit, Lightbulb } from 'lucide-react';
import { Button, Textarea } from '@/components/shared';
import type { CreationType, ProductType } from '../hooks/useHomeState';

interface TabConfig {
  icon: React.ReactNode;
  label: string;
  placeholder: string;
  description: string;
}

const tabConfig: Record<CreationType, TabConfig> = {
  idea: {
    icon: <Sparkles size={20} />,
    label: '一句话生成',
    placeholder: '例如：生成一份关于 AI 发展史的演讲 PPT',
    description: '输入你的想法，AI 将为你生成完整的 PPT',
  },
  outline: {
    icon: <FileText size={20} />,
    label: '从大纲生成',
    placeholder: '粘贴你的 PPT 大纲...\n\n例如：\n第一部分：AI 的起源\n- 1950 年代的开端\n- 达特茅斯会议\n\n第二部分：发展历程\n...',
    description: '已有大纲？直接粘贴即可快速生成，AI 将自动切分为结构化大纲',
  },
  description: {
    icon: <FileEdit size={20} />,
    label: '从描述生成',
    placeholder: '粘贴你的完整页面描述...\n\n例如：\n第 1 页\n标题：人工智能的诞生\n内容：1950 年，图灵提出"图灵测试"...\n\n第 2 页\n标题：AI 的发展历程\n内容：1950年代：符号主义...\n...',
    description: '已有完整描述？AI 将自动解析出大纲并切分为每页描述，直接生成图片',
  },
};

interface CreateProjectFormProps {
  activeTab: CreationType;
  setActiveTab: (tab: CreationType) => void;
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
  const currentTab = tabConfig[activeTab];

  return (
    <>
      {/* 选项卡 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-6 md:mb-8">
        {(Object.keys(tabConfig) as CreationType[]).map((type) => {
          const config = tabConfig[type];
          return (
            <button
              key={type}
              onClick={() => setActiveTab(type)}
              className={`flex-1 flex items-center justify-center gap-1.5 md:gap-2 px-3 md:px-6 py-2.5 md:py-3 rounded-lg font-medium transition-all text-sm md:text-base touch-manipulation ${
                activeTab === type
                  ? 'bg-gradient-to-r from-banana-500 to-banana-600 text-black shadow-yellow'
                  : 'bg-white border border-gray-200 text-gray-700 hover:bg-banana-50 active:bg-banana-100'
              }`}
            >
              <span className="scale-90 md:scale-100">{config.icon}</span>
              <span className="truncate">{config.label}</span>
            </button>
          );
        })}
      </div>

      {/* 产物类型选择 */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 mb-4">
        <button
          type="button"
          onClick={() => setProductType('ppt')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
            productType === 'ppt'
              ? 'bg-banana-500 text-black shadow-yellow'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-banana-50'
          }`}
        >
          生成 PPT
        </button>
        <button
          type="button"
          onClick={() => setProductType('infographic')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
            productType === 'infographic'
              ? 'bg-banana-500 text-black shadow-yellow'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-banana-50'
          }`}
        >
          生成信息图
        </button>
        <button
          type="button"
          onClick={() => setProductType('xiaohongshu')}
          className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium transition-all text-sm ${
            productType === 'xiaohongshu'
              ? 'bg-banana-500 text-black shadow-yellow'
              : 'bg-white border border-gray-200 text-gray-700 hover:bg-banana-50'
          }`}
        >
          小红书图文
        </button>
      </div>

      {/* 描述 */}
      <div className="relative">
        <p className="text-sm md:text-base mb-4 md:mb-6 leading-relaxed">
          <span className="inline-flex items-center gap-2 text-gray-600">
            <Lightbulb size={16} className="text-banana-600 flex-shrink-0" />
            <span className="font-semibold">
              {currentTab.description}
            </span>
          </span>
        </p>
      </div>

      {/* 输入区 - 带按钮 */}
      <div className="relative mb-2 group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-banana-400 to-orange-400 rounded-lg opacity-0 group-hover:opacity-20 blur transition-opacity duration-300"></div>
        <Textarea
          ref={textareaRef}
          placeholder={currentTab.placeholder}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onPaste={onPaste}
          rows={activeTab === 'idea' ? 4 : 8}
          className="relative pr-20 md:pr-28 pb-12 md:pb-14 text-sm md:text-base border-2 border-gray-200 focus:border-banana-400 transition-colors duration-200"
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
