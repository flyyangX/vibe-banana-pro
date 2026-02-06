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
    <aside className="w-80 bg-white border-l border-border flex flex-col overflow-hidden">
      {/* 文案编辑区 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-sm font-bold text-primary">文案</div>
            <Button
              variant="ghost"
              size="sm"
              icon={<Copy size={16} />}
              onClick={onCopy}
              className="text-secondary hover:text-black"
            >
              复制
            </Button>
          </div>
          {copywritingText ? (
            <pre className="whitespace-pre-wrap text-sm text-secondary bg-gray-50 border border-border p-3 max-h-60 overflow-y-auto font-mono">
              {copywritingText}
            </pre>
          ) : (
            <div className="text-sm text-secondary opacity-50 italic">尚未生成文案，点击"生成图文"。</div>
          )}
        </div>

        {/* 卡片列表概览 */}
        <div className="space-y-3">
          <div className="text-sm font-bold text-primary">卡片概览</div>
          <div className="text-xs text-secondary opacity-70">
            共 {cardCount} 张卡片，已生成 {generatedCount} 张
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: cardCount }, (_, i) => (
              <div
                key={i}
                className={`w-8 h-8 flex items-center justify-center text-xs font-mono border ${
                  i < generatedCount
                    ? 'bg-black text-white border-black'
                    : 'bg-white border-border text-secondary'
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
