import React from 'react';
import { FileText } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { Button } from '@/components/shared';
import * as api from '@/api/endpoints';
import type { SectionConfig, FormData, ServiceTestState, TestStatus } from '../hooks/useSettingsState';
import type { Settings as SettingsType } from '@/types';

// 模型配置设置
const modelSettingsSections: SectionConfig[] = [
  {
    title: '模型配置',
    icon: <FileText size={20} />,
    fields: [
      {
        key: 'text_model',
        label: '文本大模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: gemini-2.0-flash-exp)',
        description: '用于生成大纲、描述等文本内容的模型名称',
      },
      {
        key: 'image_model',
        label: '图像生成模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: imagen-3.0-generate-001)',
        description: '用于生成页面图片的模型名称',
      },
      {
        key: 'image_caption_model',
        label: '图片识别模型',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: gemini-2.0-flash-exp)',
        description: '用于识别参考文件中的图片并生成描述',
      },
    ],
  },
];

// 服务测试配置
const serviceTestConfigs = [
  {
    key: 'baidu-ocr',
    title: 'Baidu OCR 服务',
    description: '识别测试图片文字，验证 BAIDU_OCR_API_KEY 配置',
    action: api.testBaiduOcr,
    formatDetail: (data: any) => (data?.recognized_text ? `识别结果：${data.recognized_text}` : ''),
  },
  {
    key: 'text-model',
    title: '文本生成模型',
    description: '发送短提示词，验证文本模型与 API 配置',
    action: api.testTextModel,
    formatDetail: (data: any) => (data?.reply ? `模型回复：${data.reply}` : ''),
  },
  {
    key: 'caption-model',
    title: '图片识别模型',
    description: '生成测试图片并请求模型输出描述',
    action: api.testCaptionModel,
    formatDetail: (data: any) => (data?.caption ? `识别描述：${data.caption}` : ''),
  },
  {
    key: 'baidu-inpaint',
    title: 'Baidu 图像修复',
    description: '使用测试图片执行修复，验证百度 inpaint 服务',
    action: api.testBaiduInpaint,
    formatDetail: (data: any) => (data?.image_size ? `输出尺寸：${data.image_size[0]}x${data.image_size[1]}` : ''),
  },
  {
    key: 'image-model',
    title: '图像生成模型',
    description: '基于测试图片生成演示文稿背景图',
    action: api.testImageModel,
    formatDetail: (data: any) => (data?.image_size ? `输出尺寸：${data.image_size[0]}x${data.image_size[1]}` : ''),
  },
  {
    key: 'mineru-pdf',
    title: 'MinerU 解析 PDF',
    description: '上传测试 PDF 并等待解析结果返回',
    action: api.testMineruPdf,
    formatDetail: (data: any) => (data?.content_preview ? `解析预览：${data.content_preview}` : ''),
  },
];

interface ModelSettingsProps {
  formData: FormData;
  settings: SettingsType | null;
  onFieldChange: (key: string, value: any) => void;
  serviceTestStates: Record<string, ServiceTestState>;
  onServiceTest: (
    key: string,
    action: () => Promise<any>,
    formatDetail: (data: any) => string
  ) => void;
}

export const ModelSettings: React.FC<ModelSettingsProps> = ({
  formData,
  settings,
  onFieldChange,
  serviceTestStates,
  onServiceTest,
}) => {
  return (
    <>
      {modelSettingsSections.map((section) => (
        <SettingsSection
          key={section.title}
          title={section.title}
          icon={section.icon}
          fields={section.fields}
          formData={formData}
          settings={settings}
          onFieldChange={onFieldChange}
        />
      ))}

      {/* 服务测试区 */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 mb-2 flex items-center">
          <FileText size={20} />
          <span className="ml-2">服务测试</span>
        </h2>
        <p className="text-sm text-gray-500">
          提前验证关键服务配置是否可用，避免使用期间异常。
        </p>
        <div className="space-y-4">
          {serviceTestConfigs.map((item) => {
            const testState = serviceTestStates[item.key] || { status: 'idle' as TestStatus };
            const isLoadingTest = testState.status === 'loading';
            return (
              <div
                key={item.key}
                className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-2"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="text-base font-semibold text-gray-800">{item.title}</div>
                    <div className="text-sm text-gray-500">{item.description}</div>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={isLoadingTest}
                    onClick={() => onServiceTest(item.key, item.action, item.formatDetail)}
                  >
                    {isLoadingTest ? '测试中...' : '开始测试'}
                  </Button>
                </div>
                {testState.status === 'success' && (
                  <p className="text-sm text-green-600">
                    {testState.message}{testState.detail ? `｜${testState.detail}` : ''}
                  </p>
                )}
                {testState.status === 'error' && (
                  <p className="text-sm text-red-600">
                    {testState.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};
