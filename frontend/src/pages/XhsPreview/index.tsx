import React from 'react';
import { Check, Download, AlertTriangle } from 'lucide-react';
import { Button, ImageVersionsModal, Loading, Modal, PageEditModal } from '@/components/shared';
import { MaterialGeneratorModal, MaterialSelector, ProjectSettingsModal, TemplateSelector } from '@/components/shared';
import { getImageUrl } from '@/api/client';
import { useXhsPreviewState } from '@/hooks/useXhsPreviewState';
import { XhsCanvas } from './components/XhsCanvas';
import { XhsToolbar } from './components/XhsToolbar';

export const XhsPreview: React.FC = () => {
  const s = useXhsPreviewState();
  const {
    projectId,
    currentProject,
    ToastContainer,
    ConfirmDialog,
    aspectRatio,
    setAspectRatio,
    imageCount,
    isLoading,
    loadMaterials,
    syncProject,
    isGenerating,
    progress,
    generationStartedAt,
    xhsDisplayCards,
    regeneratingIndex,
    regeneratingStartedAt,
    copywritingText,
    setPreviewImageUrl,
    setPreviewTitle,
    handleCopy,
    handleEditCard,
    loadXhsCardVersions,
    handleRegenerateCard,
    formatElapsed,
    openExportModal,
    handleGenerate,
    handleRegenerateAll,
    isExportModalOpen,
    setIsExportModalOpen,
    exportMode,
    setExportMode,
    exportSelectedIndices,
    toggleExportIndex,
    allSelected,
    handleToggleSelectAll,
    handleConfirmExport,
    isExporting,
    previewImageUrl,
    previewTitle,
    isEditModalOpen,
    setIsEditModalOpen,
    editIndex,
    editInstruction,
    setEditInstruction,
    editOutlineTitle,
    setEditOutlineTitle,
    editOutlinePoints,
    setEditOutlinePoints,
    editDescription,
    setEditDescription,
    isOutlineExpanded,
    setIsOutlineExpanded,
    isDescriptionExpanded,
    setIsDescriptionExpanded,
    editDescImageUrls,
    selectedDescImageUrls,
    setSelectedDescImageUrls,
    editUploadedFiles,
    setEditUploadedFiles,
    editTemplateUsageMode,
    setEditTemplateUsageMode,
    editImageUrl,
    setIsEditMaterialSelectorOpen,
    isSubmittingEdit,
    handleEditSelectMaterials,
    handleSaveOutlineAndDescription,
    handleSubmitEdit,
    show,
    isVersionModalOpen,
    setIsVersionModalOpen,
    versionTargetIndex,
    versionList,
    isLoadingVersions,
    isSwitchingVersion,
    handleSwitchVersion,
    isProjectSettingsOpen,
    setIsProjectSettingsOpen,
    extraRequirements,
    setExtraRequirements,
    templateStyle,
    setTemplateStyle,
    templateUsageMode,
    setTemplateUsageMode,
    handleSaveExtraRequirements,
    handleSaveTemplateStyle,
    isSavingRequirements,
    isSavingTemplateStyle,
    isEditingRequirements,
    isEditingTemplateStyle,
    isTemplateModalOpen,
    setIsTemplateModalOpen,
    selectedTemplateId,
    selectedPresetTemplateId,
    handleTemplateSelect,
    handleClearTemplate,
    isUploadingTemplate,
    isClearingTemplate,
    hasTemplateResource,
    isMaterialModalOpen,
    setIsMaterialModalOpen,
    isEditMaterialSelectorOpen,
  } = s;

  const handleRefresh = React.useCallback(async () => {
    if (!projectId) return;
    await syncProject(projectId);
    await loadMaterials();
  }, [projectId, syncProject, loadMaterials]);

  if (!projectId) {
    return <Loading fullscreen message="缺少项目ID" />;
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">
      <XhsToolbar
        projectId={projectId}
        projectTitle={currentProject?.idea_prompt}
        isLoading={isLoading}
        isGenerating={isGenerating}
        onRefresh={handleRefresh}
        onGenerate={handleGenerate}
        onRegenerateAll={handleRegenerateAll}
        onOpenExportModal={openExportModal}
        onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        onOpenMaterialModal={() => setIsMaterialModalOpen(true)}
      />

      <XhsCanvas
        projectId={projectId}
        aspectRatio={aspectRatio}
        imageCount={imageCount}
        isLoading={isLoading}
        isGenerating={isGenerating}
        progress={progress}
        generationStartedAt={generationStartedAt}
        xhsDisplayCards={xhsDisplayCards}
        regeneratingIndex={regeneratingIndex}
        regeneratingStartedAt={regeneratingStartedAt}
        copywritingText={copywritingText}
        onAspectRatioChange={setAspectRatio}
        onCopy={handleCopy}
        onPreviewImage={(url, title) => {
          setPreviewImageUrl(url);
          setPreviewTitle(title);
        }}
        onEditCard={handleEditCard}
        onLoadVersions={loadXhsCardVersions}
        onRegenerateCard={handleRegenerateCard}
        formatElapsed={formatElapsed}
      />

      <ToastContainer />
      {ConfirmDialog}

      {/* 导出弹窗 */}
      <Modal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} title="导出图片" size="xl">
        <div className="space-y-6">
          <div className="text-sm text-gray-500 bg-gray-50 p-3 border border-gray-200">
            选择要导出的图片范围与导出方式。
            <span className="block mt-1 font-bold text-black text-xs">推荐：批量导出时请使用 ZIP 格式。</span>
          </div>
          
          <div className="bg-white space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-2">
              <div className="text-sm font-bold text-black">选择图片</div>
              <Button variant="ghost" size="sm" onClick={handleToggleSelectAll} className="h-8 text-xs font-bold tracking-wide hover:bg-gray-100 rounded-none">
                {allSelected ? '取消全选' : '全选'}
              </Button>
            </div>
            
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {xhsDisplayCards.map((card) => {
                const selectable = Boolean(card.imageUrl);
                const selected = exportSelectedIndices.has(card.index);
                const roleLabel = card.index === 0 ? '封面' : card.index === imageCount - 1 ? '结尾' : '内容';
                return (
                  <button
                    type="button"
                    key={`export-card-${card.index}`}
                    onClick={() => selectable && toggleExportIndex(card.index)}
                    disabled={!selectable}
                    className={`relative border overflow-hidden transition-all group ${
                      selected ? 'border-black ring-1 ring-black' : 'border-gray-200 hover:border-black'
                    } ${!selectable ? 'opacity-50 cursor-not-allowed bg-gray-50' : 'bg-white'}`}
                  >
                    <div className="relative w-full aspect-[3/4] bg-gray-50">
                      {card.imageUrl ? (
                        <img src={card.imageUrl} alt={roleLabel} className="w-full h-full object-cover" />
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] text-gray-400 font-mono">未生成</span>
                        </div>
                      )}
                      {selected && (
                        <div className="absolute inset-0 bg-black/10 flex items-center justify-center">
                          <div className="bg-black text-white p-1 shadow-sm">
                            <Check size={16} />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className={`px-2 py-1.5 text-[10px] flex items-center justify-between border-t ${selected ? 'bg-black text-white border-black' : 'bg-white text-gray-500 border-gray-100'}`}>
                      <span className="font-mono">
                        {String(card.index + 1).padStart(2, '0')}. {roleLabel}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-white space-y-3 pt-2">
            <div className="text-sm font-bold text-black border-b border-gray-100 pb-2">导出方式</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setExportMode('zip')}
                className={`p-4 border text-left transition-all ${
                  exportMode === 'zip' 
                    ? 'border-black bg-black text-white ring-1 ring-black' 
                    : 'border-gray-200 bg-white hover:border-black text-gray-900'
                }`}
              >
                <div className="font-bold text-sm">压缩包导出 (ZIP)</div>
                <div className={`text-xs mt-1 opacity-80 ${exportMode === 'zip' ? 'text-gray-300' : 'text-gray-500'}`}>
                  推荐：打包下载所有选中图片，按顺序命名。
                </div>
              </button>
              <button
                type="button"
                onClick={() => setExportMode('single')}
                className={`p-4 border text-left transition-all ${
                  exportMode === 'single' 
                    ? 'border-black bg-black text-white ring-1 ring-black' 
                    : 'border-gray-200 bg-white hover:border-black text-gray-900'
                }`}
              >
                <div className="font-bold text-sm">逐张下载</div>
                <div className={`text-xs mt-1 opacity-80 ${exportMode === 'single' ? 'text-gray-300' : 'text-gray-500'}`}>
                  会逐张打开图片下载页面，可能被浏览器拦截。
                </div>
              </button>
            </div>
            {exportMode === 'single' && exportSelectedIndices.size >= 3 && (
              <div className="flex items-start gap-3 text-xs text-amber-900 bg-amber-50 border border-amber-200 p-3 mt-2">
                <AlertTriangle size={16} className="mt-0.5 flex-shrink-0 text-amber-600" />
                <div>连续下载多张图片可能会被浏览器弹窗拦截，建议使用 ZIP 导出。</div>
              </div>
            )}
          </div>
          
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
            <Button variant="ghost" onClick={() => setIsExportModalOpen(false)} disabled={isExporting} className="text-xs font-bold rounded-none">
              取消
            </Button>
            <Button
              variant="primary"
              onClick={handleConfirmExport}
              disabled={isExporting || exportSelectedIndices.size === 0}
              className="bg-black text-white hover:bg-gray-800 rounded-none px-6 text-xs font-bold"
            >
              {isExporting ? '导出中...' : exportMode === 'zip' ? '下载 ZIP' : '下载选中图片'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 图片预览弹窗 */}
      <Modal
        isOpen={Boolean(previewImageUrl)}
        onClose={() => setPreviewImageUrl(null)}
        title={previewTitle || '图片预览'}
        size="xl"
      >
        {previewImageUrl ? (
          <div className="space-y-4">
            <div className="max-h-[70vh] w-full flex items-center justify-center bg-gray-50 overflow-hidden">
              <img src={previewImageUrl} alt={previewTitle || 'preview'} className="max-h-[70vh] w-auto object-contain" />
            </div>
            <div className="flex justify-end">
              <Button
                variant="secondary"
                size="sm"
                icon={<Download size={16} />}
                onClick={() => window.open(previewImageUrl, '_blank')}
              >
                下载 PNG
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      {/* 编辑卡片弹窗（与 Slide 统一） */}
      <PageEditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={editIndex !== null ? `编辑第 ${editIndex + 1} 张` : '编辑卡片'}
        imageUrl={editImageUrl}
        previewAspectRatio={aspectRatio === 'auto' ? '3:4' : aspectRatio}
        showOutline
        outlineTitle={editOutlineTitle}
        outlinePointsText={editOutlinePoints}
        isOutlineExpanded={isOutlineExpanded}
        onOutlineTitleChange={setEditOutlineTitle}
        onOutlinePointsTextChange={setEditOutlinePoints}
        onToggleOutlineExpanded={() => setIsOutlineExpanded((prev) => !prev)}
        showDescription
        descriptionText={editDescription}
        isDescriptionExpanded={isDescriptionExpanded}
        onDescriptionTextChange={setEditDescription}
        onToggleDescriptionExpanded={() => setIsDescriptionExpanded((prev) => !prev)}
        templateUsageMode={editTemplateUsageMode}
        onTemplateUsageModeChange={setEditTemplateUsageMode}
        hasTemplateResource={hasTemplateResource}
        templatePreviewUrl={
          currentProject?.template_image_path ? getImageUrl(currentProject.template_image_path, currentProject.updated_at) : null
        }
        descImageCandidates={editDescImageUrls}
        selectedDescImageUrls={selectedDescImageUrls}
        onSelectedDescImageUrlsChange={setSelectedDescImageUrls}
        uploadedFiles={editUploadedFiles}
        onUploadedFilesChange={setEditUploadedFiles}
        onOpenMaterialSelector={() => setIsEditMaterialSelectorOpen(true)}
        editInstruction={editInstruction}
        onEditInstructionChange={setEditInstruction}
        isSubmitting={isSubmittingEdit}
        submitText="开始编辑"
        onSubmit={handleSubmitEdit}
        showSaveOnly
        saveOnlyText="仅保存大纲/描述"
        onSaveOnly={handleSaveOutlineAndDescription}
        toast={show}
      />

      {/* 历史版本弹窗 */}
      <ImageVersionsModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        title={versionTargetIndex !== null ? `历史版本（第 ${versionTargetIndex + 1} 张）` : '历史版本'}
        isLoading={isLoadingVersions}
        isSwitching={isSwitchingVersion}
        versions={versionList.map((version) => {
          const previewUrl =
            version.source === 'page'
              ? version.image_url
                ? getImageUrl(version.image_url, version.created_at)
                : null
              : version.material_url
                ? getImageUrl(version.material_url, version.material_created_at || version.created_at)
                : null;
          return {
            versionId: version.version_id,
            versionNumber: version.version_number,
            isCurrent: version.is_current,
            previewUrl,
          };
        })}
        onSelectVersion={(versionId) => {
          const version = versionList.find((v) => v.version_id === versionId);
          if (!version || versionTargetIndex === null) return;
          handleSwitchVersion(version, versionTargetIndex);
        }}
      />

      {projectId && (
        <>
          <ProjectSettingsModal
            isOpen={isProjectSettingsOpen}
            onClose={() => setIsProjectSettingsOpen(false)}
            extraRequirements={extraRequirements}
            templateStyle={templateStyle}
            templateUsageMode={templateUsageMode}
            onExtraRequirementsChange={(value) => {
              isEditingRequirements.current = true;
              setExtraRequirements(value);
            }}
            onTemplateStyleChange={(value) => {
              isEditingTemplateStyle.current = true;
              setTemplateStyle(value);
            }}
            onTemplateUsageModeChange={setTemplateUsageMode}
            onSaveExtraRequirements={handleSaveExtraRequirements}
            onSaveTemplateStyle={handleSaveTemplateStyle}
            isSavingRequirements={isSavingRequirements}
            isSavingTemplateStyle={isSavingTemplateStyle}
          />

          <Modal
            isOpen={isTemplateModalOpen}
            onClose={() => setIsTemplateModalOpen(false)}
            title="更换模板"
            size="lg"
          >
            <div className="flex flex-col max-h-[70vh]">
              <div className="shrink-0">
                <p className="text-sm text-gray-600 mb-4">
                  选择模板将影响后续小红书卡片生成的风格与结构（不影响已生成卡片）。
                </p>
              </div>
              <div className="flex-1 overflow-y-auto pr-1">
                <TemplateSelector
                  onSelect={handleTemplateSelect}
                  selectedTemplateId={selectedTemplateId}
                  selectedPresetTemplateId={selectedPresetTemplateId}
                  showUpload={false}
                  projectId={projectId}
                  templateVariants={currentProject?.template_variants}
                  templateVariantsHistory={currentProject?.template_variants_history}
                  onTemplatesGenerated={async () => {
                    await syncProject(projectId);
                  }}
                  productContext="xhs"
                  showAllToggle
                />
              </div>
              <div className="shrink-0 pt-4 border-t">
                {(isUploadingTemplate || isClearingTemplate) && (
                  <div className="text-center pb-3 text-sm text-gray-500">
                    {isUploadingTemplate ? '正在上传模板...' : '正在取消模板...'}
                  </div>
                )}
                <div className="flex justify-end gap-3">
                  <Button
                    variant="secondary"
                    onClick={handleClearTemplate}
                    disabled={isUploadingTemplate || isClearingTemplate || !hasTemplateResource}
                  >
                    取消当前模板
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setIsTemplateModalOpen(false)}
                    disabled={isUploadingTemplate || isClearingTemplate}
                  >
                    关闭
                  </Button>
                </div>
              </div>
            </div>
          </Modal>

          <MaterialGeneratorModal
            projectId={projectId}
            isOpen={isMaterialModalOpen}
            onClose={() => setIsMaterialModalOpen(false)}
          />

          <MaterialSelector
            projectId={projectId}
            isOpen={isEditMaterialSelectorOpen}
            onClose={() => setIsEditMaterialSelectorOpen(false)}
            multiple
            maxSelection={8}
            onSelect={handleEditSelectMaterials}
          />
        </>
      )}
    </div>
  );
};

export default XhsPreview;
