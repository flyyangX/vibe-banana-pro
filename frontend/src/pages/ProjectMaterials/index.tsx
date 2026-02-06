import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MaterialGeneratorModal } from '@/components/shared/MaterialGeneratorModal';
import { useProjectMaterialsState } from './hooks/useProjectMaterialsState';
import { BulkActionsBar, EditMaterialModal, HeaderBar, MaterialsGrid, MoveCopyModal } from './components';

export const ProjectMaterials: React.FC = () => {
  const navigate = useNavigate();
  const {
    projectId,
    currentProjectTitle,
    materials,
    isLoading,
    scope,
    setScope,
    search,
    setSearch,
    isGeneratorOpen,
    setIsGeneratorOpen,
    isUploading,
    uploadInputRef,
    isMultiSelect,
    setIsMultiSelect,
    selectedIds,
    projects,
    editingMaterial,
    editDisplayName,
    editNote,
    actionMaterial,
    actionType,
    targetProjectId,
    setEditDisplayName,
    setEditNote,
    setTargetProjectId,
    getMaterialDisplayName,
    handleUploadClick,
    handleUploadChange,
    handleDelete,
    openEditModal,
    closeEditModal,
    handleSaveMeta,
    openActionModal,
    openBulkActionModal,
    closeActionModal,
    handleConfirmAction,
    handleConfirmBulkAction,
    toggleSelect,
    clearSelection,
    selectAllFiltered,
    handleBulkDelete,
    reloadMaterials,
    ConfirmDialog,
    ToastContainer,
  } = useProjectMaterialsState();

  if (!projectId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-500">缺少项目ID</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <HeaderBar
        title={currentProjectTitle}
        scope={scope}
        search={search}
        isUploading={isUploading}
        isMultiSelect={isMultiSelect}
        uploadInputRef={uploadInputRef}
        onBack={() => navigate(-1)}
        onScopeChange={setScope}
        onSearchChange={setSearch}
        onUploadClick={handleUploadClick}
        onUploadChange={handleUploadChange}
        onGenerate={() => setIsGeneratorOpen(true)}
        onToggleMultiSelect={() => {
          setIsMultiSelect((value) => !value);
          clearSelection();
        }}
      />

      <main className="flex-1 p-4 md:p-6">
        {isMultiSelect && (
          <BulkActionsBar
            selectedCount={selectedIds.size}
            onSelectAll={selectAllFiltered}
            onClear={clearSelection}
            onBulkMove={() => openBulkActionModal('move')}
            onBulkCopy={() => openBulkActionModal('copy')}
            onBulkDelete={handleBulkDelete}
          />
        )}
        {isLoading ? (
          <div className="text-sm text-gray-500">加载中...</div>
        ) : materials.length === 0 ? (
          <div className="text-center text-sm text-gray-500 py-12">暂无素材</div>
        ) : (
          <MaterialsGrid
            materials={materials}
            isMultiSelect={isMultiSelect}
            selectedIds={selectedIds}
            getMaterialDisplayName={getMaterialDisplayName}
            onToggleSelect={toggleSelect}
            onEdit={openEditModal}
            onMove={(material) => openActionModal(material, 'move')}
            onCopy={(material) => openActionModal(material, 'copy')}
            onDelete={handleDelete}
          />
        )}
      </main>

      <EditMaterialModal
        isOpen={!!editingMaterial}
        displayName={editDisplayName}
        note={editNote}
        onDisplayNameChange={setEditDisplayName}
        onNoteChange={setEditNote}
        onCancel={closeEditModal}
        onSave={handleSaveMeta}
      />

      <MoveCopyModal
        isOpen={!!actionType && (!!actionMaterial || selectedIds.size > 0)}
        actionType={actionType}
        isBulk={selectedIds.size > 0 && !actionMaterial}
        projects={projects}
        targetProjectId={targetProjectId}
        onTargetChange={setTargetProjectId}
        onCancel={closeActionModal}
        onConfirm={() => {
          if (actionMaterial) {
            handleConfirmAction();
          } else {
            handleConfirmBulkAction();
          }
        }}
      />

      <MaterialGeneratorModal
        projectId={projectId}
        isOpen={isGeneratorOpen}
        onClose={() => {
          setIsGeneratorOpen(false);
          reloadMaterials();
        }}
      />
      {ConfirmDialog}
      <ToastContainer />
    </div>
  );
};
