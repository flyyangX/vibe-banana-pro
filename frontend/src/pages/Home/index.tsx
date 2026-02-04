import React from 'react';
import { Sparkles, Palette } from 'lucide-react';
import {
  Card,
  MaterialGeneratorModal,
  ReferenceFileList,
  ReferenceFileSelector,
  FilePreviewModal,
  MaterialPreviewList,
  MaterialSelector,
  Textarea
} from '@/components/shared';
import { TemplateSelector } from '@/components/shared/TemplateSelector/index';
import { PRESET_STYLES } from '@/config/presetStyles';

import { useHomeState } from './hooks/useHomeState';
import { ProjectList } from './components/ProjectList';
import { CreateProjectForm } from './components/CreateProjectForm';
import { FileUploadZone } from './components/FileUploadZone';
import { QuickActions } from './components/QuickActions';

export const Home: React.FC = () => {
  const state = useHomeState();

  const isParsingFiles = state.referenceFiles.some(
    f => f.parse_status === 'pending' || f.parse_status === 'parsing'
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 via-orange-50/30 to-pink-50/50 relative overflow-hidden">
      {/* 背景装饰元素 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-banana-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-orange-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-yellow-400/5 rounded-full blur-3xl"></div>
      </div>

      {/* 导航栏 */}
      <nav className="relative h-16 md:h-18 bg-white/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-full flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center">
              <img
                src="/logo.png"
                alt="蕉幻 Banana Slides Logo"
                className="h-10 md:h-12 w-auto rounded-lg object-contain"
              />
            </div>
            <span className="text-xl md:text-2xl font-bold bg-gradient-to-r from-banana-600 via-orange-500 to-pink-500 bg-clip-text text-transparent">
              蕉幻
            </span>
          </div>
          <QuickActions
            onOpenMaterialModal={state.handleOpenMaterialModal}
            onOpenMaterialsLibrary={state.handleOpenMaterialsLibrary}
            onNavigateToHistory={() => state.navigate('/history')}
            onNavigateToSettings={() => state.navigate('/settings')}
          />
        </div>
      </nav>

      {/* 主内容 */}
      <main className="relative max-w-5xl mx-auto px-3 md:px-4 py-8 md:py-12">
        {/* Hero 标题区 */}
        <div className="text-center mb-10 md:mb-16 space-y-4 md:space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/60 backdrop-blur-sm rounded-full border border-banana-200/50 shadow-sm mb-4">
            <span className="text-2xl animate-pulse"><Sparkles size={20} color="orange" /></span>
            <span className="text-sm font-medium text-gray-700">基于 nano banana pro 的原生 AI PPT 生成器</span>
          </div>

          <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-tight">
            <span className="bg-gradient-to-r from-yellow-600 via-orange-500 to-pink-500 bg-clip-text text-transparent" style={{
              backgroundSize: '200% auto',
              animation: 'gradient 3s ease infinite',
            }}>
              蕉幻 · Banana Slides
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-light">
            Vibe your PPT like vibing code
          </p>

          {/* 特性标签 */}
          <ProjectList />
        </div>

        {/* 创建卡片 */}
        <Card className="p-4 md:p-10 bg-white/90 backdrop-blur-xl shadow-2xl border-0 hover:shadow-3xl transition-all duration-300">
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
          />

          <FileUploadZone
            isDocDragOver={state.isDocDragOver}
            setIsDocDragOver={state.setIsDocDragOver}
            onDocDrop={state.handleDocDrop}
            onDocInputSelect={state.handleDocInputSelect}
            isUploadingDoc={state.isUploadingFile && state.uploadingTarget === 'doc'}
            docUploadProgress={state.docUploadProgress}
            isImageDragOver={state.isImageDragOver}
            setIsImageDragOver={state.setIsImageDragOver}
            onImageDrop={state.handleImageDrop}
            onImageSelect={state.handleImageSelect}
            onOpenMaterialSelector={() => state.setIsMaterialSelectorOpen(true)}
            isUploadingImage={state.isUploadingFile && state.uploadingTarget === 'image'}
            imageUploadProgress={state.imageUploadProgress}
            isUploadExpanded={state.isUploadExpanded}
            setIsUploadExpanded={state.setIsUploadExpanded}
            isXhs={state.isXhs}
            docInputRef={state.docInputRef}
            imageInputRef={state.imageInputRef}
            docAccept={state.docAccept}
            imageAccept={state.imageAccept}
            onDocInputChange={state.handleDocInputSelectChange}
            onImageInputChange={state.handleFileSelect}
          />

          <MaterialPreviewList
            materials={state.materialItems}
            onRemoveMaterial={state.handleRemoveMaterial}
            className="mb-4"
            title="素材列表"
          />

          <ReferenceFileList
            files={state.referenceFiles}
            onFileClick={state.setPreviewFileId}
            onFileDelete={state.handleFileRemove}
            onFileStatusChange={state.handleFileStatusChange}
            deleteMode="remove"
            title="文档参考"
            className="mb-4"
          />

          {/* 模板选择 */}
          <div className="mb-6 md:mb-8 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3 md:mb-4">
              <div className="flex items-center gap-2">
                <Palette size={18} className="text-orange-600 flex-shrink-0" />
                <h3 className="text-base md:text-lg font-semibold text-gray-900">
                  选择风格模板
                </h3>
              </div>
              {/* 无模板图模式开关 */}
              <label className="flex items-center gap-2 cursor-pointer group">
                <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">
                  使用文字描述风格
                </span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={state.useTemplateStyle}
                    onChange={(e) => state.handleUseTemplateStyleChange(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-banana-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-banana-500"></div>
                </div>
              </label>
            </div>

            {/* 根据模式显示不同的内容 */}
            <p className="text-xs text-gray-500 mb-3">
              风格模板仅影响视觉风格，不会使用上传的图片素材作为风格参考。
            </p>

            {state.useTemplateStyle ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="描述您想要的风格，例如：简约商务风格，使用蓝色和白色配色，字体清晰大方..."
                  value={state.templateStyle}
                  onChange={(e) => state.setTemplateStyle(e.target.value)}
                  rows={3}
                  className="text-sm border-2 border-gray-200 focus:border-banana-400 transition-colors duration-200"
                />

                {/* 预设风格按钮 */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-gray-600">
                    快速选择预设风格：
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_STYLES.map((preset) => (
                      <div key={preset.id} className="relative">
                        <button
                          type="button"
                          onClick={() => state.setTemplateStyle(prev => prev === preset.description ? '' : preset.description)}
                          onMouseEnter={() => state.setHoveredPresetId(preset.id)}
                          onMouseLeave={() => state.setHoveredPresetId(null)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-full border-2 transition-all duration-200 hover:shadow-sm ${
                            state.templateStyle === preset.description
                              ? 'border-banana-500 ring-2 ring-banana-200 bg-banana-50'
                              : 'border-gray-200 hover:border-banana-400 hover:bg-banana-50'
                          }`}
                        >
                          {preset.name}
                        </button>

                        {/* 悬停时显示预览图片 */}
                        {state.hoveredPresetId === preset.id && preset.previewImage && (
                          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
                            <div className="bg-white rounded-lg shadow-2xl border-2 border-banana-400 p-2.5 w-72">
                              <img
                                src={preset.previewImage}
                                alt={preset.name}
                                className="w-full h-40 object-cover rounded"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                              <p className="text-xs text-gray-600 mt-2 px-1 line-clamp-3">
                                {preset.description}
                              </p>
                            </div>
                            {/* 小三角形指示器 */}
                            <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1">
                              <div className="w-3 h-3 bg-white border-r-2 border-b-2 border-banana-400 transform rotate-45"></div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-500">
                  提示：点击预设风格快速填充，或自定义描述风格、配色、布局等要求
                </p>
              </div>
            ) : (
              <TemplateSelector
                onSelect={state.handleTemplateSelect}
                selectedTemplateId={state.selectedTemplateId}
                selectedPresetTemplateId={state.selectedPresetTemplateId}
                showUpload={true}
                projectId={state.currentProjectId}
              />
            )}
          </div>
        </Card>
      </main>

      <state.ToastContainer />

      {/* 素材生成模态 - 在主页始终生成全局素材 */}
      <MaterialGeneratorModal
        projectId={null}
        isOpen={state.isMaterialModalOpen}
        onClose={() => state.setIsMaterialModalOpen(false)}
      />

      {/* 参考文件选择器 */}
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
