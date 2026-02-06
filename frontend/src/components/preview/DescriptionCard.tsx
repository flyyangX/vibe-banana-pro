import React, { useState } from 'react';
import { Edit2, FileText, ImagePlus, RefreshCw } from 'lucide-react';
import { Button, Modal, Textarea, Markdown, MaterialSelector, useToast, ShimmerOverlay } from '@/components/shared';
import { useDescriptionGeneratingState } from '@/hooks/useGeneratingState';
import type { Page, PageType, DescriptionContent } from '@/types';
import type { Material } from '@/api/endpoints';

export interface DescriptionCardProps {
  page: Page;
  index: number;
  totalPages: number;
  projectId?: string | null;
  onUpdate: (data: Partial<Page>) => void;
  onRegenerate: () => void;
  isGenerating?: boolean;
  isAiRefining?: boolean;
}

export const DescriptionCard: React.FC<DescriptionCardProps> = ({
  page,
  index,
  totalPages,
  projectId,
  onUpdate,
  onRegenerate,
  isGenerating = false,
  isAiRefining = false,
}) => {
  const { show } = useToast();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewImageSrc, setPreviewImageSrc] = useState<string | null>(null);

  const MATERIAL_SECTION_TITLE = '其他页面素材：';

  // 从 description_content 提取文本内容
  const getDescriptionText = (descContent: DescriptionContent | undefined): string => {
    if (!descContent) return '';
    if ('text' in descContent) {
      return descContent.text;
    } else if ('text_content' in descContent && Array.isArray(descContent.text_content)) {
      return descContent.text_content.join('\n');
    }
    return '';
  };

  const text = getDescriptionText(page.description_content);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  
  // 使用专门的描述生成状态 hook，不受图片生成状态影响
  const generating = useDescriptionGeneratingState(isGenerating, isAiRefining);

  const handleEdit = () => {
    // 在打开编辑对话框时，从当前的 page 获取最新值
    const currentText = getDescriptionText(page.description_content);
    setEditContent(currentText);
    setIsEditing(true);
  };

  const handleSave = () => {
    // 保存时使用 text 格式（后端期望的格式）
    onUpdate({
      description_content: {
        text: editContent,
      } as DescriptionContent,
    });
    setIsEditing(false);
  };

  const handleImageClick = (src: string) => {
     setPreviewImageSrc(src);
     setIsPreviewOpen(true);
  };

  const pageTypeLabels: Record<PageType, string> = {
    auto: '自动',
    cover: '封面',
    content: '内容',
    transition: '过渡',
    ending: '结尾',
  };

  const inferPageType = () => {
    const title = page.outline_content?.title || '';
    const titleLower = title.toLowerCase();
    const transitionKeywords = ['过渡', '章节', '部分', '目录', '篇章', 'section', 'part', 'agenda', 'outline', 'overview'];
    const endingKeywords = ['结尾', '总结', '致谢', '谢谢', 'ending', 'summary', 'thanks', 'q&a', 'qa', '结论', '回顾'];

    if (index === 0) return { type: 'cover' as PageType, reason: '第 1 页默认封面' };
    if (totalPages > 0 && index === totalPages - 1) return { type: 'ending' as PageType, reason: '最后一页默认结尾' };
    if (transitionKeywords.some((keyword) => titleLower.includes(keyword))) return { type: 'transition' as PageType, reason: `标题包含关键词：${title}` };
    if (endingKeywords.some((keyword) => titleLower.includes(keyword))) return { type: 'ending' as PageType, reason: `标题包含关键词：${title}` };
    return { type: 'content' as PageType, reason: '默认内容页' };
  };

  const currentType = (page.page_type || 'auto') as PageType;
  const inferred = inferPageType();
  const displayType = currentType === 'auto' ? inferred.type : currentType;

  const getMaterialDisplayName = (material: Material): string =>
    material.prompt?.trim() ||
    material.name?.trim() ||
    material.original_filename?.trim() ||
    material.source_filename?.trim() ||
    material.filename ||
    material.url;

  const sanitizeAltText = (textValue: string): string =>
    textValue.replace(/[[\]]/g, '').trim() || '素材';

  const buildMaterialsMarkdown = (materials: Material[]): string =>
    materials
      .map((material) => {
        const alt = sanitizeAltText(getMaterialDisplayName(material));
        return `![${alt}](${material.url})`;
      })
      .join('\n'); // Join with newline, but CSS will interpret standard block flow until we force inline-block

  const updateDescriptionWithMaterials = (currentText: string, materials: Material[]): string => {
    const materialsMarkdown = buildMaterialsMarkdown(materials);
    const trimmedText = (currentText || '').trim();
    const sectionRegex = new RegExp(`(^|\\n)${MATERIAL_SECTION_TITLE}\\s*\\n([\\s\\S]*?)$`);

    if (sectionRegex.test(trimmedText)) {
      return trimmedText.replace(sectionRegex, `$1${MATERIAL_SECTION_TITLE}\n${materialsMarkdown}`);
    }

    if (!trimmedText) {
      return `${MATERIAL_SECTION_TITLE}\n${materialsMarkdown}`;
    }

    return `${trimmedText}\n\n${MATERIAL_SECTION_TITLE}\n${materialsMarkdown}`;
  };

  const getMaterialCountFromText = (currentText: string): number => {
    const sectionRegex = new RegExp(`${MATERIAL_SECTION_TITLE}\\s*\\n([\\s\\S]*)$`);
    const match = currentText.match(sectionRegex);
    if (!match) return 0;
    const sectionBody = match[1] || '';
    const imageRegex = /!\[[^\]]*]\(([^)]+)\)/g;
    return Array.from(sectionBody.matchAll(imageRegex)).length;
  };

  const handleSelectMaterials = (materials: Material[]) => {
    const updatedText = updateDescriptionWithMaterials(text, materials);
    onUpdate({
      description_content: {
        text: updatedText,
      } as DescriptionContent,
    });
    show({ message: `Included ${materials.length} Materials`, type: 'success' });
  };

  const materialCount = getMaterialCountFromText(text);

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-none mb-4 group hover:border-black transition-all duration-300">
        <ShimmerOverlay show={isAiRefining} />
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
             <div className="flex flex-col items-center justify-center w-8 h-8 bg-black text-white">
                <span className="font-mono text-xs font-bold">{String(index + 1).padStart(2, '0')}</span>
             </div>
             <div>
                <div className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-2">
                   {pageTypeLabels[displayType]}
                   {page.part && <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-none text-[10px]">{page.part}</span>}
                </div>
             </div>
          </div>
          <div className="flex items-center gap-3">
             {/* Status Indicator (Minimalist) */}
             <div className="flex items-center gap-1.5 min-w-[20px] justify-end">
                {generating ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-500">
                        <RefreshCw size={10} className="animate-spin" />
                        <span className="hidden sm:inline">生成中</span>
                    </div>
                ) : text ? (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-black" title="AI 已生成内容">
                         <div className="w-1.5 h-1.5 bg-black rounded-full"></div>
                         <span className="hidden sm:inline opacity-60">已生成</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-300">
                        <div className="w-1.5 h-1.5 bg-gray-200 rounded-full"></div>
                        <span className="hidden sm:inline">待生成</span>
                    </div>
                )}
             </div>
             
             {/* Actions - Always visible on mobile, hover on desktop */}
             <div className="flex items-center gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                <button onClick={handleEdit} className="p-1.5 hover:bg-gray-100 rounded-none text-gray-400 hover:text-black transition-colors" title="编辑文本">
                   <Edit2 size={14} />
                </button>
                <button onClick={() => setIsMaterialSelectorOpen(true)} className="p-1.5 hover:bg-gray-100 rounded-none text-gray-400 hover:text-black transition-colors" title="添加素材">
                   <ImagePlus size={14} />
                </button>
                 <button onClick={onRegenerate} className="p-1.5 hover:bg-gray-100 rounded-none text-gray-400 hover:text-black transition-colors" title="重新生成">
                   <RefreshCw size={14} className={generating ? 'animate-spin' : ''} />
                </button>
             </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 min-h-[120px]">
           {generating ? (
            <div className="space-y-4 animate-pulse">
               <div className="h-2 bg-gray-100 w-3/4"></div>
               <div className="h-2 bg-gray-100 w-full"></div>
               <div className="h-2 bg-gray-100 w-5/6"></div>
               <div className="flex gap-2 pt-2">
                  <div className="w-16 h-16 bg-gray-100"></div>
                  <div className="w-16 h-16 bg-gray-100"></div>
               </div>
            </div>
           ) : text ? (
             <div className="text-sm text-gray-800 leading-relaxed font-serif">
                {/* 
                   We want thumbnails. 
                   We pass a class that styles images as small inline-blocks.
                   The Markdown component's img renderer now accepts imageClassName.
                */}
                <Markdown 
                  imageClassName="inline-block w-24 h-24 object-cover border border-gray-200 hover:border-black transition-all cursor-zoom-in mr-2 mb-2"
                  onImageClick={handleImageClick}
                >
                  {text}
                </Markdown>
             </div>
           ) : (
             <div className="h-full flex flex-col items-center justify-center text-gray-300 py-8">
                <FileText size={32} className="mb-2 opacity-20" />
                <span className="text-xs uppercase tracking-widest font-bold opacity-40">暂无描述</span>
             </div>
           )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={isEditing}
        onClose={() => setIsEditing(false)}
        title="编辑页面内容"
        size="lg"
      >
        <div className="space-y-6">
          <Textarea
            label="内容详情"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            rows={12}
            className="font-serif text-base"
          />
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsEditing(false)} className="uppercase text-xs font-bold">
              取消
            </Button>
            <Button variant="primary" onClick={handleSave} className="uppercase text-xs font-bold px-6">
              保存更改
            </Button>
          </div>
        </div>
      </Modal>
      
      {/* Lightbox / Image Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 md:p-10" onClick={() => setIsPreviewOpen(false)}>
           <button className="absolute top-6 right-6 text-white/50 hover:text-white transition-colors" onClick={() => setIsPreviewOpen(false)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="square" strokeLinejoin="miter"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
           </button>
           <img 
             src={previewImageSrc || ''} 
             alt="Preview" 
             className="max-w-full max-h-full object-contain shadow-2xl border border-gray-800"
             onClick={(e) => e.stopPropagation()} 
           />
        </div>
      )}

      {projectId && (
        <MaterialSelector
          projectId={projectId}
          isOpen={isMaterialSelectorOpen}
          onClose={() => setIsMaterialSelectorOpen(false)}
          onSelect={handleSelectMaterials}
          multiple={true}
        />
      )}
    </>
  );
};

