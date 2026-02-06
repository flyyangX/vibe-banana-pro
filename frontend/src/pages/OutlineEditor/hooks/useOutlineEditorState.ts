import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
  KeyboardSensor,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { useProjectStore } from '@/store/useProjectStore';
import { refineOutline, updateProject } from '@/api/endpoints';
import { exportOutlineToMarkdown } from '@/utils/projectUtils';
import { useConfirm, useToast } from '@/components/shared';

export const useOutlineEditorState = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { projectId } = useParams<{ projectId: string }>();
  const fromHistory = (location.state as any)?.from === 'history';

  const {
    currentProject,
    syncProject,
    updatePageLocal,
    saveAllPages,
    reorderPages,
    deletePageById,
    addNewPage,
    generateOutline,
    isGlobalLoading,
  } = useProjectStore();

  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [isAiRefining, setIsAiRefining] = useState(false);
  const [outlinePageCount, setOutlinePageCount] = useState<string>('');
  const [infographicMode, setInfographicMode] = useState<'single' | 'series'>('single');
  const [pptAspectRatio, setPptAspectRatio] = useState<'16:9' | '4:3' | 'auto'>('16:9');
  const [infographicAspectRatio, setInfographicAspectRatio] = useState<string>('auto');
  const [xhsAspectRatio, setXhsAspectRatio] = useState<'4:5' | '3:4' | 'auto'>('3:4');
  const { confirm, ConfirmDialog } = useConfirm();
  const { show, ToastContainer } = useToast();

  const productTypeLabel =
    currentProject?.product_type === 'infographic'
      ? '信息图主题'
      : currentProject?.product_type === 'xiaohongshu'
        ? '小红书主题'
        : 'PPT构想';

  const parsePayload = (raw?: string | null) => {
    if (!raw) return {};
    try {
      const parsed = JSON.parse(raw);
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  };

  // 加载项目数据
  useEffect(() => {
    if (projectId && (!currentProject || currentProject.id !== projectId)) {
      syncProject(projectId);
    }
  }, [projectId, currentProject, syncProject]);

  useEffect(() => {
    if (!currentProject) return;
    const payload = parsePayload(currentProject.product_payload);
    const payloadPageCount =
      typeof payload.page_count === 'number'
        ? payload.page_count
        : typeof payload.image_count === 'number'
          ? payload.image_count
          : null;
    const payloadAspectRatio = typeof payload.aspect_ratio === 'string' ? payload.aspect_ratio.trim() : '';
    setOutlinePageCount(payloadPageCount ? String(payloadPageCount) : '');
    setInfographicMode(payload.mode === 'series' ? 'series' : 'single');
    if (currentProject?.product_type === 'xiaohongshu') {
      if (payloadAspectRatio === 'auto') {
        setXhsAspectRatio('auto');
      } else if (payloadAspectRatio === '4:5') {
        setXhsAspectRatio('4:5');
      } else {
        setXhsAspectRatio('3:4');
      }
    }
    if (!currentProject?.product_type || currentProject.product_type === 'ppt') {
      if (payloadAspectRatio === 'auto') {
        setPptAspectRatio('auto');
      } else if (payloadAspectRatio === '4:3') {
        setPptAspectRatio('4:3');
      } else {
        setPptAspectRatio('16:9');
      }
    }
    if (currentProject?.product_type === 'infographic') {
      const infoRatios = new Set([
        '1:1', '16:9', '9:16', '4:3', '3:4', '3:2', '2:3', '5:4', '4:5', '21:9',
      ]);
      if (payloadAspectRatio === 'auto' || !payloadAspectRatio) {
        setInfographicAspectRatio('auto');
      } else if (infoRatios.has(payloadAspectRatio)) {
        setInfographicAspectRatio(payloadAspectRatio);
      } else {
        setInfographicAspectRatio('auto');
      }
    }
  }, [currentProject?.id, currentProject?.product_payload]);

  useEffect(() => {
    if (currentProject?.product_type !== 'infographic') return;
    if (infographicMode === 'single' && outlinePageCount) {
      setOutlinePageCount('');
    }
  }, [currentProject?.product_type, infographicMode, outlinePageCount]);

  // 拖拽传感器配置 - 官方最佳实践：MouseSensor + TouchSensor 分开配置
  const sensors = useSensors(
    // 桌面端：鼠标需移动 10px 才激活拖拽
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    // 移动端：长按 250ms 才激活拖拽，tolerance 允许 5px 抖动
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && currentProject) {
      const oldIndex = currentProject.pages.findIndex((p) => p.id === active.id);
      const newIndex = currentProject.pages.findIndex((p) => p.id === over.id);

      const reorderedPages = arrayMove(currentProject.pages, oldIndex, newIndex);
      reorderPages(reorderedPages.map((p) => p.id).filter((id): id is string => id !== undefined));
    }
  }, [currentProject, reorderPages]);

  const handleGenerateOutline = useCallback(async () => {
    if (!currentProject) return;
    const pageCountNumber = Number(outlinePageCount);
    const isInfographicSingle =
      currentProject.product_type === 'infographic' && infographicMode === 'single';
    const shouldUsePageCount = !isInfographicSingle;
    const desiredPageCount =
      isInfographicSingle
        ? 1
        : shouldUsePageCount && Number.isFinite(pageCountNumber) && pageCountNumber > 0
          ? pageCountNumber
          : undefined;

    if (projectId) {
      const payload = parsePayload(currentProject.product_payload);
      if (currentProject.product_type === 'infographic') {
        payload.product_type = 'infographic';
        payload.mode = infographicMode;
        if (infographicAspectRatio === 'auto') {
          delete payload.aspect_ratio;
        } else {
          payload.aspect_ratio = infographicAspectRatio;
        }
      }
      if (currentProject.product_type === 'xiaohongshu') {
        payload.product_type = 'xiaohongshu';
        payload.mode = payload.mode || 'vertical_carousel';
        if (xhsAspectRatio === 'auto') {
          delete payload.aspect_ratio;
        } else {
          payload.aspect_ratio = xhsAspectRatio;
        }
        if (desiredPageCount) {
          payload.image_count = desiredPageCount;
        } else {
          delete payload.image_count;
        }
      }
      if (!currentProject.product_type || currentProject.product_type === 'ppt') {
        if (pptAspectRatio === 'auto') {
          delete payload.aspect_ratio;
        } else {
          payload.aspect_ratio = pptAspectRatio;
        }
      }
      if (desiredPageCount) {
        payload.page_count = desiredPageCount;
      } else {
        delete payload.page_count;
      }
      try {
        await updateProject(projectId, {
          product_payload: JSON.stringify(payload),
        });
        await syncProject(projectId);
      } catch (error) {
        console.warn('写入生成设置失败，继续生成大纲:', error);
      }
    }

    if (currentProject.pages.length > 0) {
      confirm(
        '已有大纲内容，重新生成将覆盖现有内容，确定继续吗？',
        async () => {
          try {
            await generateOutline({ pageCount: desiredPageCount });
          } catch (error) {
            console.error('生成大纲失败:', error);
          }
        },
        { title: '确认重新生成', variant: 'warning' }
      );
      return;
    }

    try {
      await generateOutline({ pageCount: desiredPageCount });
    } catch (error) {
      console.error('生成大纲失败:', error);
    }
  }, [
    currentProject,
    outlinePageCount,
    infographicMode,
    xhsAspectRatio,
    pptAspectRatio,
    infographicAspectRatio,
    projectId,
    syncProject,
    confirm,
    generateOutline,
  ]);

  const handleAiRefineOutline = useCallback(async (requirement: string, previousRequirements: string[]) => {
    if (!currentProject || !projectId) return;

    try {
      const response = await refineOutline(projectId, requirement, previousRequirements);
      await syncProject(projectId);
      show({
        message: response.data?.message || '大纲修改成功',
        type: 'success'
      });
    } catch (error: any) {
      console.error('修改大纲失败:', error);
      const errorMessage = error?.response?.data?.error?.message
        || error?.message
        || '修改失败，请稍后重试';
      show({ message: errorMessage, type: 'error' });
      throw error;
    }
  }, [currentProject, projectId, syncProject, show]);

  const handleExportOutline = useCallback(() => {
    if (!currentProject) return;
    exportOutlineToMarkdown(currentProject);
    show({ message: '导出成功', type: 'success' });
  }, [currentProject, show]);

  const handleNavigateBack = useCallback(() => {
    if (fromHistory) {
      navigate('/history');
    } else {
      navigate('/');
    }
  }, [fromHistory, navigate]);

  const handleNavigateNext = useCallback(() => {
    if (currentProject?.product_type === 'infographic') {
      navigate(`/project/${projectId}/infographic`);
      return;
    }
    if (currentProject?.product_type === 'xiaohongshu') {
      navigate(`/project/${projectId}/detail`);
      return;
    }
    navigate(`/project/${projectId}/detail`);
  }, [currentProject?.product_type, projectId, navigate]);

  const handleNavigateToMaterials = useCallback(() => {
    navigate(`/project/${projectId}/materials`);
  }, [projectId, navigate]);

  const selectedPage = currentProject?.pages.find((p) => p.id === selectedPageId);

  return {
    // State
    projectId,
    currentProject,
    selectedPageId,
    setSelectedPageId,
    selectedPage,
    isAiRefining,
    setIsAiRefining,
    outlinePageCount,
    setOutlinePageCount,
    infographicMode,
    setInfographicMode,
    pptAspectRatio,
    setPptAspectRatio,
    infographicAspectRatio,
    setInfographicAspectRatio,
    xhsAspectRatio,
    setXhsAspectRatio,
    isGlobalLoading,
    productTypeLabel,

    // Actions
    sensors,
    handleDragEnd,
    handleGenerateOutline,
    handleAiRefineOutline,
    handleExportOutline,
    handleNavigateBack,
    handleNavigateNext,
    handleNavigateToMaterials,
    updatePageLocal,
    saveAllPages,
    deletePageById,
    addNewPage,

    // Components
    ConfirmDialog,
    ToastContainer,
  };
};
