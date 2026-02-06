import React, { useState } from 'react';
import { X, FileText, Settings as SettingsIcon, Download, Sparkles, AlertTriangle } from 'lucide-react';
import { Button, Textarea } from '@/components/shared';
import { Settings } from '@/pages/Settings/index';
import type { ExportExtractorMethod, ExportInpaintMethod } from '@/types';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  // 项目设置
  extraRequirements: string;
  templateStyle: string;
  templateUsageMode: 'auto' | 'template' | 'style';
  onExtraRequirementsChange: (value: string) => void;
  onTemplateStyleChange: (value: string) => void;
  onTemplateUsageModeChange: (value: 'auto' | 'template' | 'style') => void;
  onSaveExtraRequirements: () => void;
  onSaveTemplateStyle: () => void;
  isSavingRequirements: boolean;
  isSavingTemplateStyle: boolean;
  // 导出设置
  exportExtractorMethod?: ExportExtractorMethod;
  exportInpaintMethod?: ExportInpaintMethod;
  onExportExtractorMethodChange?: (value: ExportExtractorMethod) => void;
  onExportInpaintMethodChange?: (value: ExportInpaintMethod) => void;
  onSaveExportSettings?: () => void;
  isSavingExportSettings?: boolean;
}

type SettingsTab = 'project' | 'global' | 'export';

// 组件提取方法选项
const EXTRACTOR_METHOD_OPTIONS: { value: ExportExtractorMethod; label: string; description: string }[] = [
  { 
    value: 'hybrid', 
    label: '混合提取（推荐）', 
    description: 'MinerU版面分析 + 百度高精度OCR，文字识别更精确' 
  },
  { 
    value: 'mineru', 
    label: 'MinerU提取', 
    description: '仅使用MinerU进行版面分析和文字识别' 
  },
];

// 背景图获取方法选项
const INPAINT_METHOD_OPTIONS: { value: ExportInpaintMethod; label: string; description: string; usesAI: boolean }[] = [
  { 
    value: 'hybrid', 
    label: '混合方式获取（推荐）', 
    description: '百度精确去除文字 + 生成式模型提升画质',
    usesAI: true 
  },
  { 
    value: 'generative', 
    label: '生成式获取', 
    description: '使用生成式大模型（如Gemini）直接生成背景，背景质量高但有遗留元素的可能',
    usesAI: true 
  },
  { 
    value: 'baidu', 
    label: '百度抹除服务获取', 
    description: '使用百度图像修复API，速度快但画质一般',
    usesAI: false 
  },
];

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  extraRequirements,
  templateStyle,
  templateUsageMode,
  onExtraRequirementsChange,
  onTemplateStyleChange,
  onTemplateUsageModeChange,
  onSaveExtraRequirements,
  onSaveTemplateStyle,
  isSavingRequirements,
  isSavingTemplateStyle,
  // 导出设置
  exportExtractorMethod = 'hybrid',
  exportInpaintMethod = 'hybrid',
  onExportExtractorMethodChange,
  onExportInpaintMethodChange,
  onSaveExportSettings,
  isSavingExportSettings = false,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('project');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* 顶部标题栏 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <h2 className="text-xl font-bold font-serif text-primary">设置</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
            aria-label="关闭"
          >
            <X size={20} />
          </button>
        </div>

        {/* 主内容区 */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* 左侧导航栏 */}
          <aside className="w-64 bg-gray-50 border-r border-border flex-shrink-0">
            <nav className="p-4 space-y-1">
              <button
                onClick={() => setActiveTab('project')}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === 'project'
                    ? 'bg-black text-white'
                    : 'bg-transparent text-secondary hover:bg-gray-200 hover:text-primary'
                }`}
              >
                <FileText size={18} />
                <span className="font-medium text-sm">项目设置</span>
              </button>
              <button
                onClick={() => setActiveTab('export')}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === 'export'
                    ? 'bg-black text-white'
                    : 'bg-transparent text-secondary hover:bg-gray-200 hover:text-primary'
                }`}
              >
                <Download size={18} />
                <span className="font-medium text-sm">导出设置</span>
              </button>
              <button
                onClick={() => setActiveTab('global')}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  activeTab === 'global'
                    ? 'bg-black text-white'
                    : 'bg-transparent text-secondary hover:bg-gray-200 hover:text-primary'
                }`}
              >
                <SettingsIcon size={18} />
                <span className="font-medium text-sm">全局设置</span>
              </button>
            </nav>
          </aside>

          {/* 右侧内容区 */}
          <div className="flex-1 overflow-y-auto p-8">
            {activeTab === 'project' ? (
              <div className="max-w-3xl space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2 font-serif">项目级配置</h3>
                  <p className="text-sm text-secondary">
                    这些设置仅应用于当前项目，不影响其他项目
                  </p>
                </div>

                {/* 额外要求 */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-1">额外要求</h4>
                    <p className="text-xs text-secondary opacity-70">
                      在生成内容时，AI 会参考这些额外要求
                    </p>
                  </div>
                  <Textarea
                    value={extraRequirements}
                    onChange={(e) => onExtraRequirementsChange(e.target.value)}
                    placeholder="例如：使用紧凑的布局，强调数据可视化，加入更丰富的插图或图表..."
                    rows={4}
                    className="text-sm rounded-none border-border focus:border-black"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onSaveExtraRequirements}
                    disabled={isSavingRequirements}
                    className="w-full sm:w-auto rounded-none border-black hover:bg-black hover:text-white"
                  >
                    {isSavingRequirements ? '保存中...' : '保存额外要求'}
                  </Button>
                </div>

                <hr className="border-t border-border" />

                {/* 风格描述 */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-1">风格描述</h4>
                    <p className="text-xs text-secondary opacity-70">
                      描述您期望的整体风格，AI 将根据描述生成相应风格的内容
                    </p>
                  </div>
                  <Textarea
                    value={templateStyle}
                    onChange={(e) => onTemplateStyleChange(e.target.value)}
                    placeholder="例如：简约商务风格，使用深蓝色和白色配色，字体清晰大方，布局整洁..."
                    rows={5}
                    className="text-sm rounded-none border-border focus:border-black"
                  />
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onSaveTemplateStyle}
                      disabled={isSavingTemplateStyle}
                      className="w-full sm:w-auto rounded-none border-black hover:bg-black hover:text-white"
                    >
                      {isSavingTemplateStyle ? '保存中...' : '保存风格描述'}
                    </Button>
                  </div>
                  <div className="bg-gray-50 border border-border p-3">
                    <p className="text-xs text-secondary">
                      <span className="font-bold text-primary">TIP:</span> 风格描述会在生成图片时自动添加到提示词中。如果同时上传了模板图片，风格描述会作为补充说明。
                    </p>
                  </div>
                </div>

                <hr className="border-t border-border" />

                {/* 生成风格来源 */}
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-1">生成风格来源</h4>
                    <p className="text-xs text-secondary opacity-70">
                      自动模式会在有模板时使用模板图，无模板时自动生成并锁定风格描述
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-primary">选择模式</label>
                    <select
                      value={templateUsageMode}
                      onChange={(e) =>
                        onTemplateUsageModeChange(e.target.value as 'auto' | 'template' | 'style')
                      }
                      className="w-full border border-border bg-white px-3 py-2 text-sm focus:border-black focus:outline-none rounded-none"
                    >
                      <option value="auto">自动（推荐）</option>
                      <option value="template">优先使用模板图片</option>
                      <option value="style">仅使用风格描述</option>
                    </select>
                  </div>
                  <div className="bg-gray-50 border border-border p-3">
                    <p className="text-xs text-secondary">
                      <span className="font-bold text-primary">NOTE:</span> “仅使用风格描述”会忽略模板图片，仅依据风格描述生成页面。
                    </p>
                  </div>
                </div>

              </div>
            ) : activeTab === 'export' ? (
              <div className="max-w-3xl space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-primary mb-2 font-serif">可编辑 PPTX 导出设置</h3>
                  <p className="text-sm text-secondary">
                    配置「导出可编辑 PPTX」功能的处理方式。这些设置影响导出质量和API调用成本。
                  </p>
                </div>

                {/* 组件提取方法 */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-1">组件提取方法</h4>
                    <p className="text-xs text-secondary opacity-70">
                      选择如何从PPT图片中提取文字、表格等可编辑组件
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {EXTRACTOR_METHOD_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`group flex items-start gap-3 p-4 border cursor-pointer transition-all ${
                          exportExtractorMethod === option.value
                            ? 'border-black bg-black text-white'
                            : 'border-border hover:border-black bg-white text-primary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="extractorMethod"
                          value={option.value}
                          checked={exportExtractorMethod === option.value}
                          onChange={(e) => onExportExtractorMethodChange?.(e.target.value as ExportExtractorMethod)}
                          className="mt-1 w-3 h-3 text-current focus:ring-0 accent-white"
                        />
                        <div className="flex-1">
                          <div className="font-bold text-sm tracking-wide">{option.label}</div>
                          <div className={`text-xs mt-1 ${
                            exportExtractorMethod === option.value ? 'text-gray-300' : 'text-secondary'
                          }`}>{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <hr className="border-t border-border" />

                {/* 背景图获取方法 */}
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-bold text-primary mb-1">背景图获取方法</h4>
                    <p className="text-xs text-secondary opacity-70">
                      选择如何生成干净的背景图（移除原图中的文字后用于PPT背景）
                    </p>
                  </div>
                  <div className="space-y-2">
                    {INPAINT_METHOD_OPTIONS.map((option) => (
                      <label
                        key={option.value}
                        className={`flex items-start gap-3 p-4 border cursor-pointer transition-all ${
                          exportInpaintMethod === option.value
                            ? 'border-black bg-black text-white'
                            : 'border-border hover:border-black bg-white text-primary'
                        }`}
                      >
                        <input
                          type="radio"
                          name="inpaintMethod"
                          value={option.value}
                          checked={exportInpaintMethod === option.value}
                          onChange={(e) => onExportInpaintMethodChange?.(e.target.value as ExportInpaintMethod)}
                          className="mt-1 w-3 h-3 text-current focus:ring-0 accent-white"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm tracking-wide">{option.label}</span>
                            {option.usesAI && (
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-mono border ${
                                exportInpaintMethod === option.value 
                                  ? 'border-white text-white' 
                                  : 'border-black text-black'
                              }`}>
                                <Sparkles size={10} />
                                AI MODE
                              </span>
                            )}
                          </div>
                          <div className={`text-xs mt-1 ${
                            exportInpaintMethod === option.value ? 'text-gray-300' : 'text-secondary'
                          }`}>{option.description}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                  <div className="bg-gray-50 border border-border p-3 flex items-start gap-2">
                    <AlertTriangle size={14} className="text-primary flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-secondary">
                      <span className="font-bold text-primary">COST WARNING:</span> 标有「AI MODE」的选项会调用生成模型API，每页产生额外费用。如果不希望增加成本，请选择「百度抹除服务」。
                    </p>
                  </div>
                </div>

                {/* 保存按钮 */}
                {onSaveExportSettings && (
                  <div className="flex justify-start pt-4">
                    <Button
                      variant="primary"
                      onClick={onSaveExportSettings}
                      disabled={isSavingExportSettings}
                      className="rounded-none bg-black text-white hover:bg-gray-800 px-8"
                    >
                      {isSavingExportSettings ? '保存中...' : '保存导出设置'}
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-4xl space-y-6">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-primary mb-2 font-serif">全局设置</h3>
                  <p className="text-sm text-secondary">
                    这些设置应用于所有项目
                  </p>
                </div>
                {/* 复用 Settings 组件的内容 */}
                <Settings />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

