import React from 'react';
import { Button, Modal, Textarea } from '@/components/shared';

type EditMaterialModalProps = {
  isOpen: boolean;
  displayName: string;
  note: string;
  onDisplayNameChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onCancel: () => void;
  onSave: () => void;
};

export const EditMaterialModal: React.FC<EditMaterialModalProps> = ({
  isOpen,
  displayName,
  note,
  onDisplayNameChange,
  onNoteChange,
  onCancel,
  onSave,
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title="编辑素材信息" size="md">
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">名称</label>
          <input
            value={displayName}
            onChange={(event) => onDisplayNameChange(event.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-banana-500"
            placeholder="可选，留空显示文件名"
          />
        </div>
        <Textarea
          label="备注"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          rows={3}
          placeholder="可选，描述素材用途"
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={onCancel}>
            取消
          </Button>
          <Button variant="primary" onClick={onSave}>
            保存
          </Button>
        </div>
      </div>
    </Modal>
  );
};
