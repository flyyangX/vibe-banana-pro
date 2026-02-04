import React from 'react';
import { Key, FileText } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import type { SectionConfig, FormData } from '../hooks/useSettingsState';
import type { Settings as SettingsType } from '@/types';

// API 配置设置
const apiSettingsSections: SectionConfig[] = [
  {
    title: '大模型 API 配置',
    icon: <Key size={20} />,
    fields: [
      {
        key: 'ai_provider_format',
        label: 'AI 提供商格式',
        type: 'buttons',
        description: '选择 API 请求格式，影响后端如何构造和发送请求。保存设置后生效。',
        options: [
          { value: 'openai', label: 'OpenAI 格式' },
          { value: 'gemini', label: 'Gemini 格式' },
        ],
      },
      {
        key: 'api_base_url',
        label: 'API Base URL',
        type: 'text',
        placeholder: 'https://api.example.com',
        description: '设置大模型提供商 API 的基础 URL',
      },
      {
        key: 'api_key',
        label: 'API Key',
        type: 'password',
        placeholder: '输入新的 API Key',
        sensitiveField: true,
        lengthKey: 'api_key_length',
        description: '留空则保持当前设置不变，输入新值则更新',
      },
    ],
  },
  {
    title: 'MinerU 配置',
    icon: <FileText size={20} />,
    fields: [
      {
        key: 'mineru_api_base',
        label: 'MinerU API Base',
        type: 'text',
        placeholder: '留空使用环境变量配置 (如: https://mineru.net)',
        description: 'MinerU 服务地址，用于解析参考文件',
      },
      {
        key: 'mineru_token',
        label: 'MinerU Token',
        type: 'password',
        placeholder: '输入新的 MinerU Token',
        sensitiveField: true,
        lengthKey: 'mineru_token_length',
        description: '留空则保持当前设置不变，输入新值则更新',
      },
    ],
  },
  {
    title: '百度 OCR 配置',
    icon: <FileText size={20} />,
    fields: [
      {
        key: 'baidu_ocr_api_key',
        label: '百度 OCR API Key',
        type: 'password',
        placeholder: '输入百度 OCR API Key',
        sensitiveField: true,
        lengthKey: 'baidu_ocr_api_key_length',
        description: '用于可编辑 PPTX 导出时的文字识别功能，留空则保持当前设置不变',
      },
    ],
  },
];

interface ApiSettingsProps {
  formData: FormData;
  settings: SettingsType | null;
  onFieldChange: (key: string, value: any) => void;
}

export const ApiSettings: React.FC<ApiSettingsProps> = ({
  formData,
  settings,
  onFieldChange,
}) => {
  return (
    <>
      {apiSettingsSections.map((section) => (
        <SettingsSection
          key={section.title}
          title={section.title}
          icon={section.icon}
          fields={section.fields}
          formData={formData}
          settings={settings}
          onFieldChange={onFieldChange}
          extraContent={
            section.title === '大模型 API 配置' ? (
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-gray-700">
                  API 密匙获取可前往{' '}
                  <a
                    href="https://aihubmix.com/?aff=17EC"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 underline font-medium"
                  >
                    AIHubmix
                  </a>
                  , 减小迁移成本
                </p>
              </div>
            ) : undefined
          }
        />
      ))}
    </>
  );
};
