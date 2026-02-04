import React from 'react';
import { Button, Modal, Textarea } from '@/components/shared';

type RegenerateDescriptionModalProps = {
  isOpen: boolean;
  extraPrompt: string;
  isSubmitting: boolean;
  onExtraPromptChange: (value: string) => void;
  onClose: () => void;
  onConfirm: () => void;
};

export const RegenerateDescriptionModal: React.FC<RegenerateDescriptionModalProps> = ({
  isOpen,
  extraPrompt,
  isSubmitting,
  onExtraPromptChange,
  onClose,
  onConfirm,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="重新生成本页描述"
      size="lg"
    >
      <div className="space-y-4">
        <Textarea
          label="单页额外提示词（可选，仅本页生效）"
          placeholder="例如：更学术严谨、增加对比数据、强调关键结论..."
          value={extraPrompt}
          onChange={(event) => onExtraPromptChange(event.target.value)}
          rows={4}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isSubmitting}
          >
            取消
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? '正在提交...' : '开始生成'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
