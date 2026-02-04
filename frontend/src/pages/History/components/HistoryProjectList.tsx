import React from 'react';
import { ProjectCard } from '@/components/history/ProjectCard';
import type { Project } from '@/types';
import { HistorySelectToolbar } from './HistorySelectToolbar';

interface HistoryProjectListProps {
  projects: Project[];
  selectedProjects: Set<string>;
  editingProjectId: string | null;
  editingTitle: string;
  onSelectProject: (project: Project) => void;
  onToggleSelect: (projectId: string) => void;
  onSelectAll: () => void;
  onDeleteProject: (event: React.MouseEvent, project: Project) => void;
  onStartEdit: (event: React.MouseEvent, project: Project) => void;
  onTitleChange: (title: string) => void;
  onTitleKeyDown: (event: React.KeyboardEvent, projectId: string) => void;
  onSaveEdit: (projectId: string) => void;
}

export const HistoryProjectList: React.FC<HistoryProjectListProps> = ({
  projects,
  selectedProjects,
  editingProjectId,
  editingTitle,
  onSelectProject,
  onToggleSelect,
  onSelectAll,
  onDeleteProject,
  onStartEdit,
  onTitleChange,
  onTitleKeyDown,
  onSaveEdit,
}) => {
  const selectedCount = selectedProjects.size;
  const isBatchMode = selectedCount > 0;
  const isAllSelected = projects.length > 0 && selectedCount === projects.length;

  return (
    <div className="space-y-4">
      <HistorySelectToolbar
        projectCount={projects.length}
        selectedCount={selectedCount}
        isAllSelected={isAllSelected}
        onToggleAll={onSelectAll}
      />
      {projects.map((project) => {
        const projectId = project.id || project.project_id;
        if (!projectId) return null;

        return (
          <ProjectCard
            key={projectId}
            project={project}
            isSelected={selectedProjects.has(projectId)}
            isEditing={editingProjectId === projectId}
            editingTitle={editingTitle}
            onSelect={onSelectProject}
            onToggleSelect={onToggleSelect}
            onDelete={onDeleteProject}
            onStartEdit={onStartEdit}
            onTitleChange={onTitleChange}
            onTitleKeyDown={onTitleKeyDown}
            onSaveEdit={onSaveEdit}
            isBatchMode={isBatchMode}
          />
        );
      })}
    </div>
  );
};

export default HistoryProjectList;
