import React from 'react';
import { Image, Zap, Globe, Brain } from 'lucide-react';
import { SettingsSection } from './SettingsSection';
import { OUTPUT_LANGUAGE_OPTIONS } from '@/api/endpoints';
import type { SectionConfig, FormData } from '../hooks/useSettingsState';
import type { Settings as SettingsType } from '@/types';

// 通用设置配置
const generalSettingsSections: SectionConfig[] = [
  {
    title: '图像生成配置',
    icon: <Image size={20} />,
    fields: [
      {
        key: 'image_resolution',
        label: '图像清晰度（某些OpenAI格式中转调整该值无效）',
        type: 'select',
        description: '更高的清晰度会生成更详细的图像，但需要更长时间',
        options: [
          { value: '1K', label: '1K (1024px)' },
          { value: '2K', label: '2K (2048px)' },
          { value: '4K', label: '4K (4096px)' },
        ],
      },
    ],
  },
  {
    title: '性能配置',
    icon: <Zap size={20} />,
    fields: [
      {
        key: 'max_description_workers',
        label: '描述生成最大并发数',
        type: 'number',
        min: 1,
        max: 20,
        description: '同时生成描述的最大工作线程数 (1-20)，越大速度越快',
      },
      {
        key: 'max_image_workers',
        label: '图像生成最大并发数',
        type: 'number',
        min: 1,
        max: 20,
        description: '同时生成图像的最大工作线程数 (1-20)，越大速度越快',
      },
    ],
  },
  {
    title: '输出语言设置',
    icon: <Globe size={20} />,
    fields: [
      {
        key: 'output_language',
        label: '默认输出语言',
        type: 'buttons',
        description: 'AI 生成内容时使用的默认语言',
        options: OUTPUT_LANGUAGE_OPTIONS,
      },
    ],
  },
  {
    title: '文本推理模式',
    icon: <Brain size={20} />,
    fields: [
      {
        key: 'enable_text_reasoning',
        label: '启用文本推理',
        type: 'switch',
        description: '开启后，文本生成（大纲、描述等）会使用 extended thinking 进行深度推理',
      },
      {
        key: 'text_thinking_budget',
        label: '文本思考负载',
        type: 'number',
        min: 1,
        max: 8192,
        description: '文本推理的思考 token 预算 (1-8192)，数值越大推理越深入',
      },
    ],
  },
  {
    title: '图像推理模式',
    icon: <Brain size={20} />,
    fields: [
      {
        key: 'enable_image_reasoning',
        label: '启用图像推理',
        type: 'switch',
        description: '开启后，图像生成会使用思考链模式，可能获得更好的构图效果',
      },
      {
        key: 'image_thinking_budget',
        label: '图像思考负载',
        type: 'number',
        min: 1,
        max: 8192,
        description: '图像推理的思考 token 预算 (1-8192)，数值越大推理越深入',
      },
    ],
  },
];

interface GeneralSettingsProps {
  formData: FormData;
  settings: SettingsType | null;
  onFieldChange: (key: string, value: any) => void;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  formData,
  settings,
  onFieldChange,
}) => {
  return (
    <>
      {generalSettingsSections.map((section) => (
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
    </>
  );
};
