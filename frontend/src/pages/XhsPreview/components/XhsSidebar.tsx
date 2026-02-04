import React from 'react';
import { Copy } from 'lucide-react';
import { Button } from '@/components/shared';

export interface XhsSidebarProps {
  copywritingText: string;
  onCopy: () => void;
  cardCount: number;
  generatedCount: number;
}

export const XhsSidebar: React.FC<XhsSidebarProps> = ({
  copywritingText,
  onCopy,
  cardCount,
  generatedCount,
}) => {
  return (
    <aside className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
      {/* 文案编辑区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-semibold text-gray-800">文案</div>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy size={16} />}
              onClick={onCopy}
            >
              复制
            </Button>
          </div>
          {copywritingText ? (
            <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3 max-h-60 overflow-y-auto">
              {copywritingText}
            </pre>
          ) : (
            <div className="text-sm text-gray-500">尚未生成文案，点击"生成图文"。</div>
          )}
        </div>

        {/* 卡片列表概览 */}
        <div className="space-y-3">
          <div className="text-sm font-semibold text-gray-800">卡片概览</div>
          <div className="text-xs text-gray-500">
            共 {cardCount} 张卡片，已生成 {generatedCount} 张
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: cardCount }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 rounded border flex items-center justify-center text-xs ${
                  i < generatedCount
                    ? 'bg-banana-50 border-banana-200 text-banana-700'
                    : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>
      </div>
    </aside>
  );
};
