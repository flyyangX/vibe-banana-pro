import React from 'react';
import {
  MaterialGeneratorModal,
  ReferenceFileSelector,
  FilePreviewModal,
  MaterialSelector,
  Logo
} from '@/components/shared';

import { useHomeState } from './hooks/useHomeState';
import { ProjectList } from './components/ProjectList';
import { CreateProjectForm } from './components/CreateProjectForm';
import { FluidGrid } from './components/FluidGrid';


export const Home: React.FC = () => {
  const state = useHomeState();
  const [showAdvanced, setShowAdvanced] = React.useState(false);

  const isParsingFiles = state.referenceFiles.some(
    f => f.parse_status === 'pending' || f.parse_status === 'parsing'
  );

  return (
    <div className="min-h-screen bg-white relative flex flex-col font-sans text-primary overflow-hidden">
      
      {/* Background Layer: Fluid Mesh */}
      <div className="absolute inset-0 z-0 opacity-60">
        <FluidGrid />
      </div>

      {/* 导航栏 (Navbar) */}
      <nav className="w-full h-16 md:h-20 flex items-center justify-between px-4 md:px-12 max-w-[1920px] mx-auto z-10 relative pointer-events-none">
         {/* Allow pointer events on interactive children */}
         <div className="cursor-pointer pointer-events-auto scale-75 md:scale-100 origin-left">
           <Logo size="lg" />
         </div>
        <div className="flex items-center gap-4 md:gap-8 text-xs md:text-sm font-medium text-gray-500 pointer-events-auto">
          <button onClick={() => state.navigate('/history')} className="hover:text-black transition-colors">
            我的项目
          </button>
          <button onClick={state.handleOpenMaterialsLibrary} className="hover:text-black transition-colors hidden md:block">
            素材库
          </button>
          <button onClick={() => state.navigate('/settings')} className="hover:text-black transition-colors">
            设置
          </button>
          <div className="w-8 h-8 bg-black/5 rounded-full hidden md:block"></div>
        </div>
      </nav>

      {/* 主内容 (Main Content) */}
      <main className="flex-1 flex flex-col items-center pt-20 md:pt-32 max-w-[800px] mx-auto w-full px-4 md:px-6 relative z-10">
        
        {/* Hero 标题区 (Text Only) */}
        <div className="text-left w-full mb-8 md:mb-16 select-none pointer-events-none">
          <h1 className="font-serif text-[42px] md:text-[64px] font-normal leading-none mb-3 md:mb-4 text-black">
            简单，<span className="italic text-gray-400">即美。</span>
          </h1>
          <p className="text-gray-500 text-sm md:text-lg max-w-md">
            最简单的创作方式，专注于你的想法。
          </p>
        </div>

        {/* 核心创建区 (Core Creation Area) */}
        <div className="w-full relative space-y-16 mb-24">
          
          <CreateProjectForm
            activeTab={state.activeTab}
            setActiveTab={state.setActiveTab}
            productType={state.productType}
            setProductType={state.setProductType}
            content={state.content}
            setContent={state.setContent}
            onPaste={state.handlePaste}
            onSubmit={state.handleSubmit}
            isLoading={state.isGlobalLoading}
            isParsingFiles={isParsingFiles}
            textareaRef={state.textareaRef}
            // Pass all file related props
            fileProps={{
                isDocDragOver: state.isDocDragOver,
                setIsDocDragOver: state.setIsDocDragOver,
                handleDocDrop: state.handleDocDrop,
                handleDocInputSelect: state.handleDocInputSelect,
                isUploadingDoc: state.isUploadingFile && state.uploadingTarget === 'doc',
                docUploadProgress: state.docUploadProgress,
                isImageDragOver: state.isImageDragOver,
                setIsImageDragOver: state.setIsImageDragOver,
                handleImageDrop: state.handleImageDrop,
                handleImageSelect: state.handleImageSelect,
                onOpenMaterialSelector: () => state.setIsMaterialSelectorOpen(true),
                isUploadingImage: state.isUploadingFile && state.uploadingTarget === 'image',
                imageUploadProgress: state.imageUploadProgress,
                isUploadExpanded: state.isUploadExpanded,
                setIsUploadExpanded: state.setIsUploadExpanded,
                isXhs: state.isXhs,
                docInputRef: state.docInputRef,
                imageInputRef: state.imageInputRef,
                docAccept: state.docAccept,
                imageAccept: state.imageAccept,
                handleDocInputSelectChange: state.handleDocInputSelectChange,
                handleFileSelect: state.handleFileSelect,
                materialItems: state.materialItems,
                handleRemoveMaterial: state.handleRemoveMaterial,
                referenceFiles: state.referenceFiles,
                setPreviewFileId: state.setPreviewFileId,
                handleFileRemove: state.handleFileRemove,
                handleFileStatusChange: state.handleFileStatusChange
            }}
            // Pass all style related props
            styleProps={{
                useTemplateStyle: state.useTemplateStyle,
                handleUseTemplateStyleChange: state.handleUseTemplateStyleChange,
                templateStyle: state.templateStyle,
                setTemplateStyle: state.setTemplateStyle,
                handleTemplateSelect: state.handleTemplateSelect,
                selectedTemplateId: state.selectedTemplateId,
                selectedPresetTemplateId: state.selectedPresetTemplateId,
                currentProjectId: state.currentProjectId
            }}
          />
        </div>

      </main>

      <state.ToastContainer />
      <MaterialGeneratorModal
        projectId={null}
        isOpen={state.isMaterialModalOpen}
        onClose={() => state.setIsMaterialModalOpen(false)}
      />
      <ReferenceFileSelector
        projectId={null}
        isOpen={state.isFileSelectorOpen}
        onClose={() => state.setIsFileSelectorOpen(false)}
        onSelect={state.handleFilesSelected}
        multiple={true}
        initialSelectedIds={state.selectedFileIds}
      />
      <MaterialSelector
        isOpen={state.isMaterialSelectorOpen}
        onClose={() => state.setIsMaterialSelectorOpen(false)}
        onSelect={state.handleMaterialsSelected}
        multiple={true}
        maxSelection={12}
      />
      <FilePreviewModal fileId={state.previewFileId} onClose={() => state.setPreviewFileId(null)} />
    </div>
  );
};

export default Home;
