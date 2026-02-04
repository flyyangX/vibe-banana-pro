import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/components/shared';
import {
  listProjectReferenceFiles,
  uploadReferenceFile,
  deleteReferenceFile,
  getReferenceFile,
  triggerFileParse,
  type ReferenceFile,
} from '@/api/endpoints';

interface UseReferenceFileManagerOptions {
  projectId?: string | null;
  isOpen: boolean;
  initialSelectedIds?: string[];
}

export const useReferenceFileManager = ({
  projectId,
  isOpen,
  initialSelectedIds = [],
}: UseReferenceFileManagerOptions) => {
  const { show } = useToast();
  const [files, setFiles] = useState<ReferenceFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [parsingIds, setParsingIds] = useState<Set<string>>(new Set());
  const [filterProjectId, setFilterProjectId] = useState<string>('all');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialSelectedIdsRef = useRef(initialSelectedIds);
  const showRef = useRef(show);

  // Update ref to keep the latest value
  useEffect(() => {
    initialSelectedIdsRef.current = initialSelectedIds;
    showRef.current = show;
  }, [initialSelectedIds, show]);

  const loadFiles = useCallback(async () => {
    setIsLoading(true);
    try {
      const targetProjectId = filterProjectId === 'all' ? 'all' : filterProjectId === 'none' ? 'none' : filterProjectId;
      const response = await listProjectReferenceFiles(targetProjectId);

      if (response.data?.files) {
        setFiles(prev => {
          const fileMap = new Map<string, ReferenceFile>();
          const serverFiles = response.data!.files;

          serverFiles.forEach((f: ReferenceFile) => {
            fileMap.set(f.id, f);
          });

          prev.forEach(f => {
            if (parsingIds.has(f.id) && !fileMap.has(f.id)) {
              fileMap.set(f.id, f);
            }
          });

          return Array.from(fileMap.values());
        });
      }
    } catch (error: any) {
      console.error('加载参考文件列表失败:', error);
      showRef.current({
        message: error?.response?.data?.error?.message || error.message || '加载参考文件列表失败',
        type: 'error',
      });
    } finally {
      setIsLoading(false);
    }
  }, [filterProjectId, parsingIds]);

  useEffect(() => {
    if (isOpen) {
      loadFiles();
      setSelectedFiles(new Set(initialSelectedIdsRef.current));
    }
  }, [isOpen, filterProjectId, loadFiles]);

  // Poll parsing status
  useEffect(() => {
    if (!isOpen || parsingIds.size === 0) return;

    const intervalId = setInterval(async () => {
      const idsToCheck = Array.from(parsingIds);
      const updatedFiles: ReferenceFile[] = [];
      const completedIds: string[] = [];

      for (const fileId of idsToCheck) {
        try {
          const response = await getReferenceFile(fileId);
          if (response.data?.file) {
            const updatedFile = response.data.file;
            updatedFiles.push(updatedFile);

            if (updatedFile.parse_status === 'completed' || updatedFile.parse_status === 'failed') {
              completedIds.push(fileId);
            }
          }
        } catch (error) {
          console.error(`Failed to poll file ${fileId}:`, error);
        }
      }

      if (updatedFiles.length > 0) {
        setFiles(prev => {
          const fileMap = new Map(prev.map(f => [f.id, f]));
          updatedFiles.forEach(uf => fileMap.set(uf.id, uf));
          return Array.from(fileMap.values());
        });
      }

      if (completedIds.length > 0) {
        setParsingIds(prev => {
          const newSet = new Set(prev);
          completedIds.forEach(id => newSet.delete(id));
          return newSet;
        });
      }
    }, 2000);

    return () => clearInterval(intervalId);
  }, [isOpen, parsingIds]);

  const handleSelectFile = (file: ReferenceFile, multiple: boolean, maxSelection?: number) => {
    if (multiple) {
      const newSelected = new Set(selectedFiles);
      if (newSelected.has(file.id)) {
        newSelected.delete(file.id);
      } else {
        if (maxSelection && newSelected.size >= maxSelection) {
          show({
            message: `最多只能选择 ${maxSelection} 个文件`,
            type: 'info',
          });
          return;
        }
        newSelected.add(file.id);
      }
      setSelectedFiles(newSelected);
    } else {
      setSelectedFiles(new Set([file.id]));
    }
  };

  const handleConfirm = async (onSelect: (files: ReferenceFile[]) => void, onClose: () => void) => {
    const selected = files.filter((f) => selectedFiles.has(f.id));

    if (selected.length === 0) {
      show({ message: '请至少选择一个文件', type: 'info' });
      return;
    }

    const unparsedFiles = selected.filter(f => f.parse_status === 'pending');

    if (unparsedFiles.length > 0) {
      try {
        show({
          message: `已触发 ${unparsedFiles.length} 个文件的解析，将在后台进行`,
          type: 'success',
        });

        unparsedFiles.forEach(file => {
          triggerFileParse(file.id).catch(error => {
            console.error(`触发文件 ${file.filename} 解析失败:`, error);
          });
        });

        onSelect(selected);
        onClose();
      } catch (error: any) {
        console.error('触发文件解析失败:', error);
        show({
          message: error?.response?.data?.error?.message || error.message || '触发文件解析失败',
          type: 'error',
        });
      }
    } else {
      const validFiles = selected.filter(f =>
        f.parse_status === 'completed' || f.parse_status === 'parsing'
      );

      if (validFiles.length === 0) {
        show({ message: '请选择有效的文件', type: 'info' });
        return;
      }

      onSelect(validFiles);
      onClose();
    }
  };

  const handleClear = () => {
    setSelectedFiles(new Set());
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const hasPptFiles = Array.from(files).some(file => {
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      return fileExt === 'ppt' || fileExt === 'pptx';
    });

    if (hasPptFiles) show({ message: '提示：建议将PPT转换为PDF格式上传，可获得更好的解析效果', type: 'info' });

    setIsUploading(true);
    try {
      const targetProjectId = (filterProjectId === 'all' || filterProjectId === 'none')
        ? null
        : filterProjectId;

      const uploadPromises = Array.from(files).map(file =>
        uploadReferenceFile(file, targetProjectId)
      );

      const results = await Promise.all(uploadPromises);
      const uploadedFiles = results
        .map(r => r.data?.file)
        .filter((f): f is ReferenceFile => f !== undefined);

      if (uploadedFiles.length > 0) {
        show({ message: `成功上传 ${uploadedFiles.length} 个文件`, type: 'success' });

        const needsParsing = uploadedFiles.filter(f =>
          f.parse_status === 'parsing'
        );
        if (needsParsing.length > 0) {
          setParsingIds(prev => {
            const newSet = new Set(prev);
            needsParsing.forEach(f => newSet.add(f.id));
            return newSet;
          });
        }

        setFiles(prev => {
          const fileMap = new Map(prev.map(f => [f.id, f]));
          uploadedFiles.forEach(uf => fileMap.set(uf.id, uf));
          return Array.from(fileMap.values());
        });

        setTimeout(() => {
          loadFiles();
        }, 500);
      }
    } catch (error: any) {
      console.error('上传文件失败:', error);
      show({
        message: error?.response?.data?.error?.message || error.message || '上传文件失败',
        type: 'error',
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (
    e: React.MouseEvent<HTMLButtonElement, MouseEvent>,
    file: ReferenceFile
  ) => {
    e.stopPropagation();
    const fileId = file.id;

    if (!fileId) {
      show({ message: '无法删除：缺少文件ID', type: 'error' });
      return;
    }

    setDeletingIds((prev) => {
      const newSet = new Set(prev);
      newSet.add(fileId);
      return newSet;
    });

    try {
      await deleteReferenceFile(fileId);
      show({ message: '文件删除成功', type: 'success' });

      setSelectedFiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      setParsingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });

      loadFiles();
    } catch (error: any) {
      console.error('删除文件失败:', error);
      show({
        message: error?.response?.data?.error?.message || error.message || '删除文件失败',
        type: 'error',
      });
    } finally {
      setDeletingIds((prev) => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  return {
    files,
    selectedFiles,
    deletingIds,
    isLoading,
    isUploading,
    parsingIds,
    filterProjectId,
    fileInputRef,
    setFilterProjectId,
    loadFiles,
    handleSelectFile,
    handleConfirm,
    handleClear,
    handleUpload,
    handleDeleteFile,
  };
};
