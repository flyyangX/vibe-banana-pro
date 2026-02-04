import React from 'react';
import { Button, Modal } from '@/components/shared';
import type { ActionType } from '../hooks/useProjectMaterialsState';
import type { Project } from '@/types';
import { getProjectTitle } from '@/utils/projectUtils';

type MoveCopyModalProps = {
  isOpen: boolean;
  actionType: ActionType | null;
  isBulk: boolean;
  projects: Project[];
  targetProjectId: string;
  onTargetChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export const MoveCopyModal: React.FC<MoveCopyModalProps> = ({
  isOpen,
  actionType,
  isBulk,
  projects,
  targetProjectId,
  onTargetChange,
  onCancel,
  onConfirm,
}) => {
  if (!actionType) return null;

  const title = actionType === 'move' ? (isBulk ? '批量移动素材' : '移动素材') : isBulk ? '批量复制素材' : '复制素材';

  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="md">
      <div className="space-y-4">
        <div className="text-sm text-gray-600">选择目标项目（可选：选择“全局”表示不归属任何项目）</div>
        <select
          value={targetProjectId}
          onChange={(event) => onTargetChange(event.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg"
        >
          <option value="none">全局</option>
          {projects.map((project) => (
            <option key={project.project_id || project.id} value={project.project_id || project.id}>
              {getProjectTitle(project)}
            </option>
          ))}
        </select>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" onClick={onConfirm}>
            确认
          </Button>
        </div>
      </div>
    </Modal>
  );
};
