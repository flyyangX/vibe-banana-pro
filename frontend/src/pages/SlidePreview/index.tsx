import React, { useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getImageUrl } from '@/api/client';
import { exportProject } from '@/api/endpoints';
import { ImageVersionsModal, Loading } from '@/components/shared';

import { PreviewToolbar } from './components/PreviewToolbar';
import { PreviewCanvas } from './components/PreviewCanvas';
import { PreviewSidebar } from './components/PreviewSidebar';
import { EditModal } from './components/EditModal';
import { useSlidePreviewState } from './hooks/useSlidePreviewState';

export const SlidePreview: React.FC = () => {
  const [searchParams] = useSearchParams();
  const fromHistory = searchParams.get('from') === 'history';

  const state = useSlidePreviewState();

  const {
    projectId,
    currentProject,
    selectedIndex,
    setSelectedIndex,
    selectedPage,
    isRefreshing,
    pageGeneratingTasks,
    isEditModalOpen,
    setIsEditModalOpen,
    setIsTemplateModalOpen,
    setIsProjectSettingsOpen,
    setIsMaterialModalOpen,
    setIsMaterialSelectorOpen,
    editPrompt,
    setEditPrompt,
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
    selectedContextImages,
    setSelectedContextImages,
    showExportMenu,
    setShowExportMenu,
    showExportTasksPanel,
    setShowExportTasksPanel,
    exportTasks,
    addTask,
    pollExportTask,
    isMultiSelectMode,
    selectedPageIds,
    togglePageSelection,
    selectAllPages,
    deselectAllPages,
    toggleMultiSelectMode,
    getSelectedPageIdsForExport,
    selectedExportableCount,
    imageVersions,
    isVersionModalOpen,
    setIsVersionModalOpen,
    isBatchPreparing,
    batchPreparingText,
    startBatchPreparing,
    templateUsageMode,
    hasTemplateResource,
    hasAllImages,
    formatElapsed,
    getElapsedSeconds,
    handleRefresh,
    handleSwitchVersion,
    extractImageUrlsFromDescription,
    generateImages,
    generateSinglePageImage,
    editPageImage,
    deletePageById,
    updatePageLocal,
    saveAllPages,
    clearPageImage,
    syncProject,
    show,
    ToastContainer,
    confirm,
    ConfirmDialog,
  } = state;

  const pages = currentProject?.pages || [];

  const imageUrl = useMemo(() => {
    if (!selectedPage?.generated_image_path) return '';
    return getImageUrl(selectedPage.generated_image_path, selectedPage.updated_at);
  }, [selectedPage?.generated_image_path, selectedPage?.updated_at]);

  // 编辑页面
  const handleEditPage = useCallback((index?: number) => {
    const targetIndex = index ?? selectedIndex;
    const page = currentProject?.pages[targetIndex];
    if (!page) return;

    setSelectedIndex(targetIndex);
    setEditPrompt('');
    setEditOutlineTitle(page.outline_content?.title || '');
    setEditOutlinePoints((page.outline_content?.points || []).join('\n'));
    setEditDescription(
      typeof page.description_content === 'object' && 'text' in page.description_content
        ? (page.description_content.text as string) || ''
        : ''
    );
    setSelectedContextImages({
      templateUsageMode,
      descImageUrls: [],
      uploadedFiles: [],
    });
    setIsEditModalOpen(true);
  }, [selectedIndex, currentProject?.pages, setSelectedIndex, setEditPrompt, setEditOutlineTitle, setEditOutlinePoints, setEditDescription, setSelectedContextImages, setIsEditModalOpen, templateUsageMode]);

  // 删除页面
  const handleDeletePage = useCallback(async (pageId: string) => {
    const confirmed = await confirm({
      title: '确认删除',
      message: '确定要删除这一页吗？此操作无法撤销。',
      confirmText: '删除',
      cancelText: '取消',
    });
    if (!confirmed || !projectId) return;

    try {
      await deletePageById(pageId);
      show({ message: '页面已删除', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '删除失败', type: 'error' });
    }
  }, [confirm, projectId, deletePageById, show]);

  // 清除页面图片
  const handleClearPageImage = useCallback(async () => {
    if (!projectId || !selectedPage?.id) return;

    const confirmed = await confirm({
      title: '确认清除',
      message: '确定要清除当前页面的图片吗？',
      confirmText: '清除',
      cancelText: '取消',
    });
    if (!confirmed) return;

    try {
      await clearPageImage(selectedPage.id);
      show({ message: '图片已清除', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '清除失败', type: 'error' });
    }
  }, [projectId, selectedPage?.id, confirm, clearPageImage, show]);

  // 重新生成单页
  const handleRegeneratePage = useCallback(async () => {
    if (!projectId || !selectedPage?.id) return;

    try {
      await generateSinglePageImage(selectedPage.id);
      show({ message: '已开始生成', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '生成失败', type: 'error' });
    }
  }, [projectId, selectedPage?.id, generateSinglePageImage, show]);

  // 批量生成
  const handleGenerateAll = useCallback(async () => {
    if (!projectId) return;

    const targetPageIds = isMultiSelectMode && selectedPageIds.size > 0
      ? Array.from(selectedPageIds)
      : pages.map(p => p.id!).filter(Boolean);

    if (!hasTemplateResource) {
      startBatchPreparing(targetPageIds);
    }

    try {
      await generateImages(targetPageIds);
      show({ message: '已开始批量生成', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '批量生成失败', type: 'error' });
    }
  }, [projectId, isMultiSelectMode, selectedPageIds, pages, hasTemplateResource, startBatchPreparing, generateImages, show]);

  // 导出
  const handleExport = useCallback(async (type: 'pptx' | 'pdf' | 'editable-pptx') => {
    if (!projectId) return;
    setShowExportMenu(false);

    const selectedIds = getSelectedPageIdsForExport();

    try {
      const response = await exportProject(projectId, type, selectedIds);
      const taskId = (response as any)?.data?.task_id as string | undefined;
      const downloadUrl =
        (response as any)?.data?.download_url_absolute ||
        (response as any)?.data?.download_url;

      if (taskId) {
        addTask({
          id: taskId,
          taskId,
          projectId,
          type,
          status: 'PENDING',
          pageIds: selectedIds,
        });
        pollExportTask(taskId, projectId, taskId);
        show({ message: '导出任务已创建', type: 'success' });
      } else if (downloadUrl) {
        window.open(downloadUrl, '_blank');
        show({ message: '已开始下载', type: 'success' });
      } else {
        show({ message: '导出失败：未返回任务或下载链接', type: 'error' });
      }
    } catch (error: any) {
      show({ message: error.message || '导出失败', type: 'error' });
    }
  }, [projectId, getSelectedPageIdsForExport, setShowExportMenu, addTask, pollExportTask, show]);

  // 保存大纲和描述
  const handleSaveOutlineAndDescription = useCallback(async () => {
    if (!projectId || !selectedPage?.id) return;

    const updatedOutline = {
      title: editOutlineTitle,
      points: editOutlinePoints.split('\n').filter(p => p.trim()),
    };
    const updatedDescription = { text: editDescription };

    try {
      updatePageLocal(selectedPage.id, {
        outline_content: updatedOutline,
        description_content: updatedDescription,
      });
      await saveAllPages();
      await syncProject(projectId);
      show({ message: '已保存', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '保存失败', type: 'error' });
    }
  }, [projectId, selectedPage?.id, editOutlineTitle, editOutlinePoints, editDescription, updatePageLocal, saveAllPages, syncProject, show]);

  // 提交编辑
  const handleSubmitEdit = useCallback(async () => {
    if (!projectId || !selectedPage?.id || !editPrompt.trim()) return;

    await handleSaveOutlineAndDescription();

    try {
      await editPageImage(selectedPage.id, editPrompt, selectedContextImages);
      setIsEditModalOpen(false);
      show({ message: '已开始编辑生成', type: 'success' });
    } catch (error: any) {
      show({ message: error.message || '编辑失败', type: 'error' });
    }
  }, [projectId, selectedPage?.id, editPrompt, selectedContextImages, handleSaveOutlineAndDescription, editPageImage, setIsEditModalOpen, show]);

  if (!currentProject) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loading message="加载中..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PreviewToolbar
        projectId={projectId}
        fromHistory={fromHistory}
        isRefreshing={isRefreshing}
        showExportMenu={showExportMenu}
        showExportTasksPanel={showExportTasksPanel}
        isMultiSelectMode={isMultiSelectMode}
        selectedExportableCount={selectedExportableCount}
        hasAllImages={hasAllImages}
        exportTasks={exportTasks}
        pages={pages}
        onRefresh={handleRefresh}
        onOpenProjectSettings={() => setIsProjectSettingsOpen(true)}
        onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
        onOpenMaterialModal={() => setIsMaterialModalOpen(true)}
        onToggleExportMenu={() => setShowExportMenu(prev => !prev)}
        onToggleExportTasksPanel={() => setShowExportTasksPanel(prev => !prev)}
        onExport={handleExport}
      />

      <div className="flex-1 flex flex-col md:flex-row min-h-0">
        <PreviewSidebar
          pages={pages}
          selectedIndex={selectedIndex}
          isMultiSelectMode={isMultiSelectMode}
          selectedPageIds={selectedPageIds}
          isBatchPreparing={isBatchPreparing}
          batchPreparingText={batchPreparingText}
          pageGeneratingTasks={pageGeneratingTasks}
          onSelectIndex={setSelectedIndex}
          onTogglePageSelection={togglePageSelection}
          onSelectAll={selectAllPages}
          onDeselectAll={deselectAllPages}
          onToggleMultiSelectMode={toggleMultiSelectMode}
          onGenerateAll={handleGenerateAll}
          onEditPage={handleEditPage}
          onDeletePage={handleDeletePage}
          getElapsedSeconds={getElapsedSeconds}
        />

        <div className="flex-1 flex flex-col min-h-0">
          <PreviewCanvas
            projectId={projectId}
            pages={pages}
            selectedIndex={selectedIndex}
            selectedPage={selectedPage}
            imageUrl={imageUrl}
            imageVersions={imageVersions}
            isRefreshing={isRefreshing}
            pageGeneratingTasks={pageGeneratingTasks}
            onSelectIndex={setSelectedIndex}
            onOpenVersions={() => setIsVersionModalOpen(true)}
            onEditPage={() => handleEditPage()}
            onClearPageImage={handleClearPageImage}
            onRegeneratePage={handleRegeneratePage}
            onRefresh={handleRefresh}
            onOpenTemplateModal={() => setIsTemplateModalOpen(true)}
            onOpenMaterialModal={() => setIsMaterialModalOpen(true)}
            formatElapsed={formatElapsed}
            getElapsedSeconds={getElapsedSeconds}
          />
        </div>
      </div>

      <EditModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        imageUrl={imageUrl}
        selectedPage={selectedPage}
        currentProject={currentProject}
        hasTemplateResource={hasTemplateResource}
        editPrompt={editPrompt}
        editOutlineTitle={editOutlineTitle}
        editOutlinePoints={editOutlinePoints}
        editDescription={editDescription}
        isOutlineExpanded={isOutlineExpanded}
        isDescriptionExpanded={isDescriptionExpanded}
        selectedContextImages={selectedContextImages}
        onEditPromptChange={setEditPrompt}
        onEditOutlineTitleChange={setEditOutlineTitle}
        onEditOutlinePointsChange={setEditOutlinePoints}
        onEditDescriptionChange={setEditDescription}
        onToggleOutlineExpanded={() => setIsOutlineExpanded(prev => !prev)}
        onToggleDescriptionExpanded={() => setIsDescriptionExpanded(prev => !prev)}
        onSelectedContextImagesChange={setSelectedContextImages}
        onOpenMaterialSelector={() => setIsMaterialSelectorOpen(true)}
        onSaveOutlineAndDescription={handleSaveOutlineAndDescription}
        onSubmitEdit={handleSubmitEdit}
        extractImageUrlsFromDescription={extractImageUrlsFromDescription}
        showToast={show}
      />

          <ImageVersionsModal
            isOpen={isVersionModalOpen}
            onClose={() => setIsVersionModalOpen(false)}
            title={`历史版本（第 ${selectedIndex + 1} 页）`}
            isLoading={false}
            isSwitching={false}
            versions={imageVersions.map((v) => ({
              versionId: v.version_id,
              versionNumber: v.version_number,
              isCurrent: v.is_current,
              previewUrl: v.image_url ? getImageUrl(v.image_url, v.created_at) : null,
            }))}
            onSelectVersion={handleSwitchVersion}
          />

      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};

export default SlidePreview;
