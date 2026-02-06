import React, { useState } from 'react';
import { ArrowLeft, X, Play, Menu } from 'lucide-react';
import { Loading, Logo } from '@/components/shared';
import { updateProject } from '@/api/endpoints';
import { useProjectStore } from '@/store/useProjectStore';
import { useOutlineEditorState } from './hooks/useOutlineEditorState';
// We'll re-use internal components but wrap them in the new layout
import { OutlineList } from './components/OutlineList';
import { MobilePagePreview } from './components/PageEditor';

export const OutlineEditor: React.FC = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleInputValue, setTitleInputValue] = useState('');
  
  const { syncProject } = useProjectStore();

  const {
    // State
    projectId,
    currentProject, // Ensure this is destructured from useOutlineEditorState if available, or get from store
    selectedPageId,
    setSelectedPageId,
    selectedPage,
    isAiRefining,
    // setIsAiRefining, 
    outlinePageCount,
    setOutlinePageCount,
    infographicMode,
    setInfographicMode,
    pptAspectRatio,
    setPptAspectRatio,
    infographicAspectRatio,
    setInfographicAspectRatio,
    xhsAspectRatio,
    setXhsAspectRatio,
    isGlobalLoading,

    // Actions
    sensors,
    handleDragEnd,
    handleGenerateOutline,
    handleExportOutline,
    handleNavigateBack,
    handleNavigateNext,
    updatePageLocal,
    saveAllPages,
    deletePageById,
    addNewPage,

    // Components
    ConfirmDialog,
    ToastContainer,
  } = useOutlineEditorState();

  if (!currentProject) {
    return <Loading fullscreen message="加载项目中..." />;
  }

  if (isGlobalLoading) {
    return <Loading fullscreen message="正在生成大纲..." />;
  }

  const productType = currentProject.product_type || 'ppt';

  return (
    <div className="flex flex-col md:flex-row bg-white h-screen w-screen overflow-hidden text-primary font-sans relative">
      


      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div 
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity"
            onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 1. 左侧设置栏 (SETTINGS RAIL) */}
      <aside className={`
          fixed inset-y-0 left-0 z-50 w-[280px] bg-white border-r border-black flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
          md:relative md:translate-x-0 md:flex md:flex-shrink-0 md:z-20
      `}>
        <div className="p-6 border-b border-gray-100 flex justify-between items-center md:hidden">
            <div className="text-[10px] font-bold uppercase tracking-wider">设置与选项</div>
            {/* Mobile Close Button */}
            <button onClick={() => setIsMobileMenuOpen(false)} className="p-1 hover:bg-gray-100 rounded text-gray-400">
                <X size={20} />
            </button>
        </div>

        <div className="p-6 space-y-8 overflow-y-auto custom-scrollbar flex-1">
          {/* Mobile Project Title (Editable) - Visible only on mobile */}
          <div className="flex flex-col gap-3 md:hidden">
            <label className="text-[10px] font-bold uppercase tracking-wider text-black">项目名称</label>
            {isEditingTitle ? (
               <input 
                 autoFocus
                 className="w-full border-b border-black py-1 text-sm font-bold focus:outline-none bg-transparent"
                 value={titleInputValue}
                 onChange={(e) => setTitleInputValue(e.target.value)}
                 onBlur={async () => {
                   if (titleInputValue.trim() !== currentProject.idea_prompt && titleInputValue.trim() && currentProject.id) {
                     try {
                       await updateProject(currentProject.id, { idea_prompt: titleInputValue });
                       await syncProject(currentProject.id);
                     } catch (err) {
                       console.error('Failed to update project name', err);
                     }
                   }
                   setIsEditingTitle(false);
                 }}
                 onKeyDown={(e) => {
                   if (e.key === 'Enter') {
                     e.currentTarget.blur();
                   } else if (e.key === 'Escape') {
                      setIsEditingTitle(false);
                      setTitleInputValue(currentProject.idea_prompt || '');
                   }
                 }}
               />
            ) : (
               <div 
                 className="text-sm font-bold cursor-pointer hover:text-gray-600 truncate"
                 onClick={() => {
                   setTitleInputValue(currentProject.idea_prompt || '');
                   setIsEditingTitle(true);
                 }}
               >
                 {currentProject.idea_prompt || '未命名项目'}
               </div>
            )}
          </div>

          {/* 产物类型 (只读) */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-black">生成类型</label>
            <div className="flex border border-black p-0 pointer-events-none opacity-100">
               <div className={`flex-1 py-1.5 text-xs text-center font-bold uppercase ${productType === 'ppt' ? 'bg-black text-white' : 'text-gray-400'}`}>PPT</div>
               <div className={`flex-1 py-1.5 text-xs text-center font-bold uppercase ${productType === 'infographic' ? 'bg-black text-white' : 'text-gray-400'}`}>长图</div>
               <div className={`flex-1 py-1.5 text-xs text-center font-bold uppercase ${productType === 'xiaohongshu' ? 'bg-black text-white' : 'text-gray-400'}`}>小红书</div>
            </div>
          </div>

          {/* 比例设置 (功能性) */}
          <div className="flex flex-col gap-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-black">画布比例</label>
            <div className="flex border border-black p-0">
              {productType === 'ppt' && (
                  <>
                    <button onClick={() => setPptAspectRatio('16:9')} className={`flex-1 py-1.5 text-xs text-center font-bold transition-all ${pptAspectRatio === '16:9' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>16:9</button>
                    <button onClick={() => setPptAspectRatio('4:3')} className={`flex-1 border-l border-black py-1.5 text-xs text-center font-bold transition-all ${pptAspectRatio === '4:3' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>4:3</button>
                  </>
              )}
              {productType === 'infographic' && (
                   <>
                    <button onClick={() => setInfographicAspectRatio('1:2')} className={`flex-1 py-1.5 text-xs text-center font-bold transition-all ${infographicAspectRatio === '1:2' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>1:2</button>
                    <button onClick={() => setInfographicAspectRatio('1:3')} className={`flex-1 border-l border-black py-1.5 text-xs text-center font-bold transition-all ${infographicAspectRatio === '1:3' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>1:3</button>
                   </>
              )}
               {productType === 'xiaohongshu' && (
                   <>
                    <button onClick={() => setXhsAspectRatio('3:4')} className={`flex-1 py-1.5 text-xs text-center font-bold transition-all ${xhsAspectRatio === '3:4' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>3:4</button>
                   </>
              )}
            </div>
          </div>

          {/* 页面设置 (页数 & 模式) - 移到这里 */}
          {(productType !== 'infographic' || infographicMode === 'series') && (
            <div className="flex flex-col gap-3">
              <label className="text-[10px] font-bold uppercase tracking-wider text-black">目标页数</label>
              <input
                type="number"
                min={1}
                placeholder="AI 自动决定"
                value={outlinePageCount}
                onChange={(e) => setOutlinePageCount(e.target.value)}
                className="w-full border-b border-black py-1 text-sm font-mono focus:outline-none placeholder:text-gray-300"
              />
            </div>
          )}
          
          {productType === 'infographic' && (
            <div className="flex flex-col gap-3">
               <label className="text-[10px] font-bold uppercase tracking-wider text-black">长图模式</label>
               <div className="flex border border-black p-0">
                  <button onClick={() => setInfographicMode('single')} className={`flex-1 py-1.5 text-xs text-center font-bold uppercase transition-all ${infographicMode === 'single' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>单图</button>
                  <button onClick={() => setInfographicMode('series')} className={`flex-1 border-l border-black py-1.5 text-xs text-center font-bold uppercase transition-all ${infographicMode === 'series' ? 'bg-black text-white' : 'hover:bg-gray-100/50 text-gray-400'}`}>切片系列</button>
               </div>
            </div>
          )}

          {/* 上下文信息 */}
          <div className="border-t border-gray-100 pt-6">
               <label className="text-[10px] font-bold text-black uppercase tracking-wider mb-3 block">项目上下文</label>
               <p className="text-xs text-gray-600 font-serif italic leading-relaxed pl-3 border-l-2 border-black">
                 "{currentProject.idea_prompt || currentProject?.outline_text?.slice(0, 100) || '未提供上下文信息'}"
               </p>
          </div>
        </div>
        
        {/* 底部版权或额外信息 */}

      </aside>

      {/* 2. 中间编辑流 (EDITABLE FEED - CENTERED) */}
      <div className="flex-1 flex flex-col bg-white relative min-w-0 overflow-hidden">
      {/* 1. 顶部 Header (Minimalist) */}
      <header className="h-14 md:h-16 bg-white border-b border-black flex items-center justify-between px-3 md:px-6 z-20 flex-shrink-0">
         <div className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
             {/* 1. Logo / Menu First */}
             <div className="flex items-center gap-1">
                 <button onClick={() => setIsMobileMenuOpen(true)} className="md:hidden w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-gray-500">
                     <Menu size={20} />
                 </button>
                 <div onClick={() => navigate('/')} className="cursor-pointer hover:opacity-80 transition-all uppercase tracking-tighter hidden md:block">
                   <Logo size="md" />
                 </div>
             </div>

             {/* 2. Standard Back Button (Round like SlidePreview) */}
             <button 
               onClick={handleNavigateBack} 
               className="w-10 h-10 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-black flex-shrink-0"
               title="返回主页"
             >
                 <ArrowLeft size={20} />
             </button>

             <div className="h-6 w-px bg-gray-200 hidden md:block"></div>

             {/* 3. Page Title / Project Title */}
             <div className="flex items-center gap-3 overflow-hidden">
                <span className="font-bold text-sm uppercase tracking-wider whitespace-nowrap hidden lg:inline">大纲结构</span>
                <div className="h-4 w-px bg-gray-100 hidden lg:block"></div>

                {isEditingTitle ? (
                    <input 
                      autoFocus
                      className="text-xs md:text-sm font-bold border-b border-black outline-none bg-transparent min-w-[120px] max-w-[200px]"
                      value={titleInputValue}
                      onChange={(e) => setTitleInputValue(e.target.value)}
                      onBlur={async () => {
                        if (titleInputValue.trim() !== currentProject.idea_prompt && titleInputValue.trim() && currentProject.id) {
                          try {
                            await updateProject(currentProject.id, { idea_prompt: titleInputValue });
                            await syncProject(currentProject.id);
                          } catch (err) {
                            console.error('Failed to update project name', err);
                          }
                        }
                        setIsEditingTitle(false);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') e.currentTarget.blur();
                        else if (e.key === 'Escape') {
                           setIsEditingTitle(false);
                           setTitleInputValue(currentProject.idea_prompt || '');
                        }
                      }}
                    />
                ) : (
                   <div 
                     className="text-xs md:text-sm font-bold truncate max-w-[150px] md:max-w-[250px] cursor-pointer hover:underline hover:text-gray-700"
                     onClick={() => {
                       setTitleInputValue(currentProject.idea_prompt || '');
                       setIsEditingTitle(true);
                     }}
                     title="点击修改名称"
                   >
                       {currentProject.idea_prompt || '未命名项目'}
                   </div>
                )}
             </div>
         </div>

         {/* Right Side Actions */}
         <div className="flex items-center gap-2 md:gap-4">
             <button 
               onClick={handleGenerateOutline} 
               className="h-8 md:h-9 px-3 md:px-5 border border-black hover:bg-black hover:text-white transition-all flex items-center gap-2 text-[10px] md:text-xs font-bold uppercase tracking-wider"
             >
                <ArrowLeft size={10} className="rotate-180" />
                <span className="hidden sm:inline">重新生成大纲</span>
                <span className="sm:hidden">重新生成</span>
             </button>

             <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>

             <button 
               onClick={handleNavigateNext} 
               className="bg-black text-white hover:bg-gray-800 text-[10px] md:text-xs font-bold uppercase tracking-wide px-3 md:px-6 h-8 md:h-9 border border-black transition-all flex items-center gap-2"
             >
                <span className="hidden sm:inline">生成描述</span>
                <span className="md:hidden">下一步</span>
                <Play size={10} fill="currentColor" />
             </button>
         </div>
      </header>
        
        <div className="flex-1 overflow-y-auto bg-gray-50/50 p-0 custom-scrollbar">
             <div className="max-w-3xl mx-auto w-full bg-white border-x border-gray-100 min-h-full shadow-sm">
                <OutlineList
                    currentProject={currentProject}
                    projectId={projectId}
                    selectedPageId={selectedPageId}
                    isAiRefining={isAiRefining}
                    outlinePageCount={outlinePageCount} 
                    setOutlinePageCount={setOutlinePageCount}
                    infographicMode={infographicMode} 
                    setInfographicMode={setInfographicMode} 
                    pptAspectRatio={pptAspectRatio} 
                    setPptAspectRatio={setPptAspectRatio} 
                    infographicAspectRatio={infographicAspectRatio} 
                    setInfographicAspectRatio={setInfographicAspectRatio} 
                    xhsAspectRatio={xhsAspectRatio} 
                    setXhsAspectRatio={setXhsAspectRatio} 
                    sensors={sensors}
                    onDragEnd={handleDragEnd}
                    onPageSelect={setSelectedPageId}
                    onPageUpdate={updatePageLocal}
                    onPageDelete={deletePageById}
                    onAddPage={addNewPage}
                    onGenerateOutline={handleGenerateOutline}
                    onExportOutline={handleExportOutline}
                    onSaveAllPages={saveAllPages}
                />
             </div>
        </div>
      </div>

      {/* 移动端支持 */}
      <MobilePagePreview selectedPage={selectedPage} />
      
      {ConfirmDialog}
      <ToastContainer />
    </div>
  );
};


export default OutlineEditor;
