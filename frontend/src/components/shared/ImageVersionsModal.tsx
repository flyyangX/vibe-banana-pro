import React from 'react';
import { Button } from './Button';
import { Loading } from './Loading';
import { Modal } from './Modal';

export type ImageVersionGridItem = {
  versionId: string;
  versionNumber: number;
  isCurrent: boolean;
  previewUrl?: string | null;
};

interface ImageVersionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  isLoading: boolean;
  isSwitching: boolean;
  versions: ImageVersionGridItem[];
  onSelectVersion: (versionId: string) => void;
  emptyText?: string;
}

export const ImageVersionsModal: React.FC<ImageVersionsModalProps> = ({
  isOpen,
  onClose,
  title,
  isLoading,
  isSwitching,
  versions,
  onSelectVersion,
  emptyText = '暂无历史版本',
}) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
      <div className="space-y-4">
        {isLoading ? (
          <Loading message="加载版本中..." />
        ) : (
          <>
            {versions.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {versions.map((version) => (
                  <button
                    key={version.versionId}
                    type="button"
                    onClick={() => onSelectVersion(version.versionId)}
                    disabled={isSwitching}
                    className={`relative rounded border overflow-hidden ${
                      version.isCurrent ? 'border-banana-500 ring-2 ring-banana-200' : 'border-gray-200'
                    }`}
                  >
                    {version.previewUrl ? (
                      <img src={version.previewUrl} alt="version" className="w-full h-32 object-cover" />
                    ) : (
                      <div className="w-full h-32 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                        无预览
                      </div>
                    )}
                    {version.isCurrent && (
                      <div className="absolute inset-0 bg-banana-500/20 flex items-center justify-center text-xs text-white">
                        当前
                      </div>
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-black/40 text-white text-[10px] px-2 py-1">
                      版本 {version.versionNumber}
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-sm text-gray-500">{emptyText}</div>
            )}
          </>
        )}
        <div className="flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </Modal>
  );
};

