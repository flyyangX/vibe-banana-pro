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
    <div className="bg-white border border-gray-200 rounded-none p-4 md:p-6 mb-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-6 border-b border-gray-100 pb-4">
        <div className="text-sm font-bold uppercase tracking-wide text-black">小红书文案配置</div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onGenerateCopywriting}
            disabled={isGenerating}
            className="text-xs uppercase font-bold"
          >
            {isGenerating ? '生成中...' : '重新生成文案'}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onSaveCopywriting}
            disabled={isSaving}
            className="text-xs uppercase font-bold px-4"
          >
            {isSaving ? '保存中...' : '保存草稿'}
          </Button>
        </div>
      </div>
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-black mb-2">笔记标题</label>
          <input
            value={title}
            onChange={(event) => onTitleChange(event.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-none focus:outline-none focus:border-black font-serif font-medium bg-gray-50 focus:bg-white transition-all"
            placeholder="请输入小红书标题..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-black mb-2">笔记正文</label>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            rows={8}
            className="text-sm leading-relaxed rounded-none border-gray-200 focus:border-black bg-gray-50 focus:bg-white"
            placeholder="请输入笔记相关内容..."
          />
        </div>
        <div>
          <label className="block text-[10px] font-bold uppercase tracking-wider text-black mb-2">话题标签</label>
          <input
            value={hashtags}
            onChange={(event) => onHashtagsChange(event.target.value)}
            className="w-full px-4 py-2 text-sm border border-gray-200 rounded-none focus:outline-none focus:border-black font-mono text-gray-500 bg-gray-50 focus:bg-white transition-all"
            placeholder="#旅行 #攻略 #小贴士"
          />
        </div>
      </div>
    </div>
  );
};
