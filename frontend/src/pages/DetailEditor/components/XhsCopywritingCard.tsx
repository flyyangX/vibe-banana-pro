import React from 'react';
import { Button, Textarea } from '@/components/shared';

type XhsCopywritingCardProps = {
  title: string;
  body: string;
  hashtags: string;
  isGenerating: boolean;
  isSaving: boolean;
  onGenerateCopywriting: () => void;
  onSaveCopywriting: () => void;
  onTitleChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onHashtagsChange: (value: string) => void;
};

export const XhsCopywritingCard: React.FC<XhsCopywritingCardProps> = ({
  title,
  body,
  hashtags,
  isGenerating,
  isSaving,
  onGenerateCopywriting,
  onSaveCopywriting,
  onTitleChange,
  onBodyChange,
  onHashtagsChange,
}) => {
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 md:p-5 shadow-sm mb-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <div className="text-sm font-semibold text-gray-800">标题与正文</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateCopywriting}
            disabled={isGenerating}
          >
            {isGenerating ? '生成中...' : '重新生成文案'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSaveCopywriting}
            disabled={isSaving}
          >
            {isSaving ? '保存中...' : '保存文案'}
          </Button>
        </div>
      </div>
      <div className="space-y-3">
        <div>
          <label className="block text-xs text-gray-600 mb-1">标题</label>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400"
            placeholder="请输入标题"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">正文</label>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            rows={5}
            className="text-sm"
            placeholder="请输入正文内容"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-600 mb-1">话题（空格分隔）</label>
          <input
            value={hashtags}
            onChange={(event) => onHashtagsChange(event.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-400"
            placeholder="例如：#旅行 #攻略 #打卡"
          />
        </div>
      </div>
    </div>
  );
};
