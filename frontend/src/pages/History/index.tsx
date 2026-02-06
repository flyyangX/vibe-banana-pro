import React from 'react';
import { useHistoryState } from './hooks/useHistoryState';
import {
  HistoryNavbar,
  HistoryHeader,
  HistoryLoadingState,
  HistoryErrorState,
  HistoryEmptyState,
  HistoryProjectList,
} from './components';

export const History: React.FC = () => {
  const {
    projects,
    isLoading,
    error,
    selectedProjects,
    isDeleting,
    editingProjectId,
    editingTitle,
    ToastContainer,
    ConfirmDialog,
    loadProjects,
    navigateHome,
    clearSelection,
    setEditingTitle,
    handleSelectProject,
    handleToggleSelect,
    handleSelectAll,
    handleDeleteProject,
    handleBatchDelete,
    handleStartEdit,
    handleSaveEdit,
    handleTitleKeyDown,
  } = useHistoryState();

  return (
    <div className="min-h-screen bg-white">
      <HistoryNavbar onGoHome={navigateHome} />
      <main className="max-w-6xl mx-auto px-3 md:px-4 py-6 md:py-8">
        <HistoryHeader
          projectCount={projects.length}
          selectedCount={selectedProjects.size}
          isDeleting={isDeleting}
          onClearSelection={clearSelection}
          onBatchDelete={handleBatchDelete}
        />
        {isLoading ? (
          <HistoryLoadingState message="加载中..." />
        ) : error ? (
          <HistoryErrorState message={error} onRetry={loadProjects} />
        ) : projects.length === 0 ? (
          <HistoryEmptyState onCreateProject={navigateHome} />
        ) : (
          <HistoryProjectList
            projects={projects}
            selectedProjects={selectedProjects}
            editingProjectId={editingProjectId}
            editingTitle={editingTitle}
            onSelectProject={handleSelectProject}
            onToggleSelect={handleToggleSelect}
            onSelectAll={handleSelectAll}
            onDeleteProject={handleDeleteProject}
            onStartEdit={handleStartEdit}
            onTitleChange={setEditingTitle}
            onTitleKeyDown={handleTitleKeyDown}
            onSaveEdit={handleSaveEdit}
          />
        )}
      </main>
      <ToastContainer />
      {ConfirmDialog}
    </div>
  );
};

export default History;
