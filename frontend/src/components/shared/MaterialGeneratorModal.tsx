import React, { useState, useEffect, useRef } from 'react';
import { Image as ImageIcon, ImagePlus, Upload, X, FolderOpen } from 'lucide-react';
import { Modal, Textarea, Button, useToast, MaterialSelector } from '@/components/shared';
import { generateMaterialImage, getTaskStatus } from '@/api/endpoints';
import { getImageUrl } from '@/api/client';
import { materialUrlToFile } from './MaterialSelector/index';
import type { Material } from '@/api/endpoints';
import type { Task } from '@/types';

interface MaterialGeneratorModalProps {
  projectId?: string | null; // 可选，如果不提供则生成全局素材
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 素材生成模态卡片
 * - 输入提示词 + 上传参考图
 * - 提示词原样传给文生图模型（不做额外修饰）
 * - 生成结果展示在模态顶部
 * - 结果统一保存在项目下的历史素材库（backend /uploads/{projectId}/materials）
 */
export const MaterialGeneratorModal: React.FC<MaterialGeneratorModalProps> = ({
  projectId,
  isOpen,
  onClose,
}) => {
  const materialGenerateTaskKey = 'materialGenerateTask';
  const { show } = useToast();
  const [prompt, setPrompt] = useState('');
  const [refImage, setRefImage] = useState<File | null>(null);
  const [extraImages, setExtraImages] = useState<File[]>([]);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingStartedAt, setGeneratingStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);

  const handleRefImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = (e.target.files && e.target.files[0]) || null;
    if (file) {
      setRefImage(file);
    }
  };

  const handleExtraImagesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // 如果还没有主参考图，优先把第一张作为主参考图，其余作为额外参考图
    if (!refImage) {
      const [first, ...rest] = files;
      setRefImage(first);
      if (rest.length > 0) {
        setExtraImages((prev) => [...prev, ...rest]);
      }
    } else {
      setExtraImages((prev) => [...prev, ...files]);
    }
  };

  const removeExtraImage = (index: number) => {
    setExtraImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSelectMaterials = async (materials: Material[]) => {
    try {
      // 将选中的素材转换为File对象
      const files = await Promise.all(
        materials.map((material) => materialUrlToFile(material))
      );

      if (files.length === 0) return;

      // 如果没有主图，优先把第一张设为主参考图
      if (!refImage) {
        const [first, ...rest] = files;
        setRefImage(first);
        if (rest.length > 0) {
          setExtraImages((prev) => [...prev, ...rest]);
        }
      } else {
        setExtraImages((prev) => [...prev, ...files]);
      }

      show({ message: `已添加 ${files.length} 个素材`, type: 'success' });
    } catch (error: any) {
      console.error('加载素材失败:', error);
      show({
        message: '加载素材失败: ' + (error.message || '未知错误'),
        type: 'error',
      });
    }
  };

  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const readStoredTask = () => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = window.sessionStorage.getItem(materialGenerateTaskKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { taskId?: string; startedAt?: number; projectId?: string | null };
      if (!parsed?.taskId || typeof parsed.startedAt !== 'number') return null;
      return parsed;
    } catch (error) {
      console.warn('[MaterialGeneratorModal] 读取生成任务失败:', error);
      return null;
    }
  };

  const writeStoredTask = (value: { taskId: string; startedAt: number; projectId?: string | null }) => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(materialGenerateTaskKey, JSON.stringify(value));
    } catch (error) {
      console.warn('[MaterialGeneratorModal] 写入生成任务失败:', error);
    }
  };

  const clearStoredTask = () => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.removeItem(materialGenerateTaskKey);
    } catch (error) {
      console.warn('[MaterialGeneratorModal] 清除生成任务失败:', error);
    }
  };

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const storedTask = readStoredTask();
    if (!storedTask?.taskId) return;
    const targetProjectId = storedTask.projectId || 'global';
    setIsGenerating(true);
    setGeneratingStartedAt(storedTask.startedAt || Date.now());
    pollMaterialTask(storedTask.taskId, targetProjectId);
  }, [isOpen]);

  useEffect(() => {
    if (!isGenerating) {
      return;
    }
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => window.clearInterval(intervalId);
  }, [isGenerating]);

  const formatElapsed = (seconds: number) => {
    const safeSeconds = Math.max(0, seconds);
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const secs = safeSeconds % 60;
    if (hours > 0) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
    }
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const generatingElapsed = generatingStartedAt
    ? Math.floor((now - generatingStartedAt) / 1000)
    : 0;

  const pollMaterialTask = async (taskId: string, targetProjectId?: string) => {
    const resolvedProjectId = targetProjectId || projectId || 'global'; // 使用'global'作为Task的project_id
    const isProjectScoped = resolvedProjectId !== 'global';
    const maxAttempts = 60; // 最多轮询60次（约2分钟）
    let attempts = 0;

    const poll = async () => {
      try {
        attempts++;
        const response = await getTaskStatus(resolvedProjectId, taskId);
        const task = response.data as Task;

        if (task.status === 'COMPLETED') {
          // 任务完成，从progress中获取结果
          const progress = (task.progress || {}) as { image_url?: string };
          const imageUrl = progress.image_url;
          
          if (imageUrl) {
            setPreviewUrl(getImageUrl(imageUrl));
            const message = isProjectScoped 
              ? '素材生成成功，已保存到历史素材库' 
              : '素材生成成功，已保存到全局素材库';
            show({ message, type: 'success' });
          } else {
            show({ message: '素材生成完成，但未找到图片地址', type: 'error' });
          }
          
          setIsGenerating(false);
          setGeneratingStartedAt(null);
          clearStoredTask();
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (task.status === 'FAILED') {
          show({
            message: task.error_message || '素材生成失败',
            type: 'error',
          });
          setIsGenerating(false);
          setGeneratingStartedAt(null);
          clearStoredTask();
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        } else if (task.status === 'PENDING' || task.status === 'PROCESSING') {
          // 继续轮询
          if (attempts >= maxAttempts) {
            show({ message: '素材生成超时，请稍后查看素材库', type: 'error' });
            setIsGenerating(false);
            setGeneratingStartedAt(null);
            clearStoredTask();
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }
      } catch (error: any) {
        console.error('轮询任务状态失败:', error);
        if (attempts >= maxAttempts) {
          show({ message: '轮询任务状态失败，请稍后查看素材库', type: 'error' });
          setIsGenerating(false);
          setGeneratingStartedAt(null);
          clearStoredTask();
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }
    };

    // 立即执行一次，然后每2秒轮询一次
    poll();
    pollingIntervalRef.current = setInterval(poll, 2000);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      show({ message: '请输入提示词', type: 'error' });
      return;
    }

    setIsGenerating(true);
    const startedAt = Date.now();
    setGeneratingStartedAt(startedAt);
    try {
      // 如果没有projectId，使用'none'表示生成全局素材（后端会转换为'global'用于Task）
      const targetProjectId = projectId || 'none';
      const resp = await generateMaterialImage(targetProjectId, prompt.trim(), refImage as File, extraImages);
      const taskId = resp.data?.task_id;
      
      if (taskId) {
        writeStoredTask({ taskId, startedAt, projectId: projectId || null });
        // 开始轮询任务状态
        await pollMaterialTask(taskId, projectId || 'global');
      } else {
        show({ message: '素材生成失败：未返回任务ID', type: 'error' });
        setIsGenerating(false);
        setGeneratingStartedAt(null);
        clearStoredTask();
      }
    } catch (error: any) {
      show({
        message: error?.response?.data?.error?.message || error.message || '素材生成失败',
        type: 'error',
      });
      setIsGenerating(false);
      setGeneratingStartedAt(null);
      clearStoredTask();
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="素材生成" size="lg">
      <blockquote className="text-sm text-secondary mb-4 italic font-serif border-l-2 border-black pl-3 py-1 bg-gray-50">生成的素材会保存到素材库</blockquote>
      <div className="space-y-6">
        {/* 顶部：生成结果预览（始终显示最新一次生成） */}
        <div className="bg-white border border-border p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3 border-b border-border pb-2">
            <h4 className="text-sm font-bold text-primary tracking-wide uppercase">生成结果</h4>
            {isGenerating && (
              <span className="text-xs font-mono text-secondary">
                PROCESSING · {formatElapsed(generatingElapsed)}
              </span>
            )}
          </div>
          {isGenerating ? (
            <div className="aspect-video overflow-hidden border border-border bg-gray-50 flex items-center justify-center">
              <div className="flex flex-col items-center">
                 <span className="w-8 h-8 border-2 border-gray-200 border-t-black animate-spin rounded-full mb-3" />
                 <span className="text-xs font-mono text-secondary">GENERATING IMAGE...</span>
              </div>
            </div>
          ) : previewUrl ? (
            <div className="aspect-video bg-white overflow-hidden border border-border flex items-center justify-center p-2">
              <img
                src={previewUrl}
                alt="生成的素材"
                className="w-full h-full object-contain shadow-sm"
              />
            </div>
          ) : (
            <div className="aspect-video bg-gray-50 border border-border border-dashed flex flex-col items-center justify-center text-secondary text-sm">
              <div className="mb-2 opacity-50">🎨</div>
              <div className="font-serif italic text-xs">Generated result will appear here</div>
            </div>
          )}
        </div>

        {/* 提示词：原样传给模型 */}
        <Textarea
          label="提示词 (Prompts)"
          placeholder="例如：蓝紫色渐变背景，带几何图形和科技感线条，用于科技主题标题页..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={3}
          className="rounded-none border-border focus:border-black resize-none"
        />

        {/* 参考图上传区 */}
        <div className="bg-white border border-border p-4 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-primary font-bold">
              <ImagePlus size={16} />
              <span className="uppercase tracking-wide text-xs">Reference Images</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              icon={<FolderOpen size={16} />}
              onClick={() => setIsMaterialSelectorOpen(true)}
              className="text-xs hover:bg-black hover:text-white rounded-none border border-transparent hover:border-black transition-all"
            >
              从素材库选择
            </Button>
          </div>
          <div className="flex flex-wrap gap-4">
            {/* 主参考图（可选） */}
            <div className="space-y-2">
              <div className="text-[10px] uppercase font-bold text-secondary tracking-wider">Primary Reference</div>
              <label className="w-32 h-24 border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all bg-white relative group">
                {refImage ? (
                  <>
                    <img
                      src={URL.createObjectURL(refImage)}
                      alt="主参考图"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setRefImage(null);
                      }}
                      className="absolute -top-2 -right-2 w-5 h-5 bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow z-10 hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </>
                ) : (
                  <>
                    <ImageIcon size={18} className="text-secondary mb-1 opacity-50" />
                    <span className="text-[10px] text-secondary">CLICK UPLOAD</span>
                  </>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleRefImageChange}
                />
              </label>
            </div>

            {/* 额外参考图（可选） */}
            <div className="flex-1 space-y-2 min-w-[180px]">
              <div className="text-[10px] uppercase font-bold text-secondary tracking-wider">Additional References</div>
              <div className="flex flex-wrap gap-2">
                {extraImages.map((file, idx) => (
                  <div key={idx} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={`extra-${idx + 1}`}
                      className="w-16 h-16 object-cover border border-border"
                    />
                    <button
                      onClick={() => removeExtraImage(idx)}
                      className="absolute -top-2 -right-2 w-4 h-4 bg-black text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                <label className="w-16 h-16 border border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-black hover:bg-gray-50 transition-all bg-white text-secondary hover:text-black">
                  <Upload size={14} className="mb-0.5" />
                  <span className="text-[9px] uppercase">Add</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleExtraImagesChange}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Button variant="ghost" onClick={handleClose} disabled={isGenerating} className="rounded-none hover:bg-gray-100 text-secondary hover:text-black">
            关闭
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={isGenerating || !prompt.trim()}
            className="rounded-none bg-black text-white hover:bg-gray-800 px-6"
          >
            {isGenerating ? '生成中...' : '生成素材'}
          </Button>
        </div>
      </div>
      {/* 素材选择器 */}
      <MaterialSelector
        projectId={projectId || undefined}
        isOpen={isMaterialSelectorOpen}
        onClose={() => setIsMaterialSelectorOpen(false)}
        onSelect={handleSelectMaterials}
        multiple={true}
      />
    </Modal>
  );
};


