import React from 'react';
import { Sparkles, FileEdit, Search, Paperclip } from 'lucide-react';

interface ProjectListProps {
  className?: string;
}

/**
 * 项目列表展示组件（特性标签展示）
 * 在首页用于展示产品特性
 */
export const ProjectList: React.FC<ProjectListProps> = ({ className = '' }) => {
  const features = [
    { icon: <Sparkles size={14} className="text-yellow-600" />, label: '一句话生成 PPT' },
    { icon: <FileEdit size={14} className="text-blue-500" />, label: '自然语言修改' },
    { icon: <Search size={14} className="text-orange-500" />, label: '指定区域编辑' },
    { icon: <Paperclip size={14} className="text-green-600" />, label: '一键导出 PPTX/PDF' },
  ];

  return (
    <div className={`flex flex-wrap items-center justify-center gap-2 md:gap-3 pt-4 ${className}`}>
      {features.map((feature, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 px-3 py-1.5 bg-white/70 backdrop-blur-sm rounded-full text-xs md:text-sm text-gray-700 border border-gray-200/50 shadow-sm hover:shadow-md transition-all hover:scale-105 cursor-default"
        >
          {feature.icon}
          {feature.label}
        </span>
      ))}
    </div>
  );
};

export default ProjectList;
