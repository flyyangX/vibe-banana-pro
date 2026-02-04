import React from 'react';
import type { Page } from '@/types';

interface PageEditorProps {
  selectedPage: Page | undefined;
}

export const PageEditor: React.FC<PageEditorProps> = ({ selectedPage }) => {
  if (!selectedPage) {
    return (
      <div className="text-center py-8 md:py-10 text-gray-400">
        <div className="text-3xl md:text-4xl mb-2">👆</div>
        <p className="text-sm md:text-base">点击左侧卡片查看详情</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 md:space-y-4">
      <div>
        <div className="text-xs md:text-sm text-gray-500 mb-1">标题</div>
        <div className="text-base md:text-lg font-semibold text-gray-900">
          {selectedPage.outline_content.title}
        </div>
      </div>
      <div>
        <div className="text-xs md:text-sm text-gray-500 mb-2">要点</div>
        <ul className="space-y-1.5 md:space-y-2">
          {selectedPage.outline_content.points.map((point, idx) => (
            <li key={idx} className="flex items-start text-sm md:text-base text-gray-700">
              <span className="mr-2 text-banana-500 flex-shrink-0">•</span>
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

// 移动端预览抽屉
export const MobilePagePreview: React.FC<PageEditorProps> = ({ selectedPage }) => {
  if (!selectedPage) return null;

  return (
    <div className="md:hidden fixed inset-x-0 bottom-0 bg-white border-t border-gray-200 p-4 max-h-[50vh] overflow-y-auto shadow-lg z-50">
      <h3 className="text-sm font-semibold text-gray-900 mb-2">预览</h3>
      <div className="space-y-2">
        <div>
          <div className="text-xs text-gray-500 mb-1">标题</div>
          <div className="text-sm font-semibold text-gray-900">
            {selectedPage.outline_content.title}
          </div>
        </div>
        <div>
          <div className="text-xs text-gray-500 mb-1">要点</div>
          <ul className="space-y-1">
            {selectedPage.outline_content.points.map((point, idx) => (
              <li key={idx} className="flex items-start text-xs text-gray-700">
                <span className="mr-1.5 text-banana-500 flex-shrink-0">•</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};
