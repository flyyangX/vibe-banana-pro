import React, { useState, useEffect } from 'react';
import { Download, X, Trash2, FileText, Clock, CheckCircle, XCircle, Loader2, AlertTriangle } from 'lucide-react';
import { useExportTasksStore, type ExportTask, type ExportTaskType } from '@/store/useExportTasksStore';
import type { Page } from '@/types';
import { Button } from './Button';
import { cn } from '@/utils';

const taskTypeLabels: Record<ExportTaskType, string> = {
  'pptx': 'PPTX',
  'pdf': 'PDF',
  'editable-pptx': '可编辑 PPTX',
};

/**
 * 计算页数范围显示文本
 * @param pageIds 选中的页面ID列表，undefined表示全部
 * @param pages 所有页面列表
 * @returns 页数范围文本，如"全部"、"第1-3页"、"第2页"
 */
const getPageRangeText = (pageIds: string[] | undefined, pages: Page[]): string => {
  if (!pageIds || pageIds.length === 0) {
    return '全部';
  }
  
  // 找到所有页面的索引
  const indices: number[] = [];
  pageIds.forEach(pageId => {
    const index = pages.findIndex(p => (p.id || p.page_id) === pageId);
    if (index >= 0) {
      indices.push(index);
    }
  });
  
  if (indices.length === 0) {
    return `${pageIds.length}页`;
  }
  
  indices.sort((a, b) => a - b);
  const minIndex = indices[0];
  const maxIndex = indices[indices.length - 1];
  
  // 如果是连续的，显示范围；否则显示数量
  if (indices.length === maxIndex - minIndex + 1) {
    // 连续范围
    if (minIndex === maxIndex) {
      return `第${minIndex + 1}页`;
    }
    return `第${minIndex + 1}-${maxIndex + 1}页`;
  } else {
    // 不连续，显示数量
    return `${pageIds.length}页`;
  }
};

const TaskStatusIcon: React.FC<{ status: ExportTask['status'] }> = ({ status }) => {
  switch (status) {
    case 'PENDING':
      return <Clock size={16} className="text-gray-400" />;
    case 'PROCESSING':
    case 'RUNNING':
      return <Loader2 size={16} className="text-black animate-spin" />;
    case 'COMPLETED':
      return <CheckCircle size={16} className="text-green-500" />;
    case 'FAILED':
      return <XCircle size={16} className="text-red-500" />;
    default:
      return null;
  }
};

// 警告详情 Modal
const WarningsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  warnings: string[];
  warningDetails?: any;
}> = ({ isOpen, onClose, warnings, warningDetails }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 背景遮罩 */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
      
      {/* Modal 内容 */}
      <div className="relative bg-white text-left shadow-2xl max-w-lg w-full mx-4 max-h-[80vh] flex flex-col border border-black transition-all">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-black" />
            <h3 className="text-base font-bold text-black uppercase tracking-wide">
              Export Warnings ({warnings.length})
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 transition-colors"
          >
            <X size={20} className="text-black" />
          </button>
        </div>
        
        {/* 警告列表 */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-2">
            {warnings.map((warning, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 border border-t-0 border-r-0 border-b-0 border-l-4 border-amber-500 text-sm font-mono text-gray-800"
              >
                <div className="flex-1 break-words">{warning}</div>
              </div>
            ))}
          </div>
          
          {/* 详细信息（如果有） */}
          {warningDetails && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-bold text-black mb-3">Details</h4>
              
              {warningDetails.style_extraction_failed?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">
                    Style Extraction Failed ({warningDetails.style_extraction_failed.length})
                  </p>
                  <div className="text-xs text-xs font-mono text-gray-600 bg-gray-50 p-3 border border-gray-200 max-h-32 overflow-y-auto">
                    {warningDetails.style_extraction_failed.slice(0, 10).map((item: any, idx: number) => (
                      <div key={idx} className="truncate mb-1 last:mb-0" title={item.reason}>
                        [{item.element_id}] {item.reason}
                      </div>
                    ))}
                    {warningDetails.style_extraction_failed.length > 10 && (
                      <div className="text-gray-400 mt-2 italic">
                        ... plus {warningDetails.style_extraction_failed.length - 10} more
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              {warningDetails.text_render_failed?.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-500 mb-2 uppercase">
                    Text Render Failed ({warningDetails.text_render_failed.length})
                  </p>
                  <div className="text-xs font-mono text-gray-600 bg-gray-50 p-3 border border-gray-200 max-h-32 overflow-y-auto">
                    {warningDetails.text_render_failed.slice(0, 10).map((item: any, idx: number) => (
                      <div key={idx} className="truncate mb-1 last:mb-0" title={item.reason}>
                        "{item.text}": {item.reason}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-black hover:bg-gray-800 text-white text-sm font-bold uppercase tracking-wide transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const TaskItem: React.FC<{ task: ExportTask; pages: Page[]; onRemove: () => void }> = ({ task, pages, onRemove }) => {
  const [showWarningsModal, setShowWarningsModal] = useState(false);
  
  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
  };

  const pageRangeText = getPageRangeText(task.pageIds, pages);

  // 计算进度百分比
  const getProgressPercent = () => {
    if (!task.progress) return 0;
    if (task.progress.percent !== undefined) return task.progress.percent;
    if (task.progress.total > 0) {
      return Math.round((task.progress.completed / task.progress.total) * 100);
    }
    return 0;
  };

  const progressPercent = getProgressPercent();
  const isProcessing = task.status === 'PROCESSING' || task.status === 'RUNNING' || task.status === 'PENDING';
  
  const hasWarnings = task.status === 'COMPLETED' && task.progress?.warnings && task.progress.warnings.length > 0;

  return (
    <div className="flex items-start gap-4 py-3 px-4 border-b border-border hover:bg-gray-50 transition-colors last:border-b-0">
      <div className="mt-1">
        <TaskStatusIcon status={task.status} />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-sm font-bold text-black truncate uppercase tracking-tight">
            {taskTypeLabels[task.type]}
          </span>
          <span className="text-xs text-gray-500 font-mono border border-gray-200 px-1 py-0.5">
            {pageRangeText}
          </span>
          <span className="text-xs text-gray-400 font-mono ml-auto">
            {formatTime(task.createdAt)}
          </span>
        </div>
        
        {/* 进度条 - 显示在进行中的任务 */}
        {isProcessing && (
          <div className="mt-3 space-y-2">
            {task.progress ? (
              <>
                {/* 进度百分比和当前步骤 */}
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-black">
                    {progressPercent > 0 ? `${progressPercent}%` : 'PREPARING...'}
                  </span>
                  {task.progress.current_step && (
                    <span className="text-gray-500 truncate max-w-[140px]" title={task.progress.current_step}>
                      {task.progress.current_step}
                    </span>
                  )}
                </div>
                
                {/* 进度条 */}
                <div className="h-1.5 bg-gray-100 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-black transition-all duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                
                {/* 显示消息日志（如果有） */}
                {task.progress.messages && task.progress.messages.length > 0 && (
                  <div className="mt-1 space-y-0.5">
                    {task.progress.messages.slice(-2).map((msg, idx) => (
                      <div key={idx} className="text-[10px] text-gray-400 truncate font-mono" title={msg}>
                        {'>'} {msg}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-full bg-gray-100 rounded-none overflow-hidden">
                  <div className="h-full bg-black animate-pulse" style={{ width: '30%' }} />
                </div>
                <span className="text-xs text-gray-400 whitespace-nowrap uppercase">Pending...</span>
              </div>
            )}
          </div>
        )}
        
        {task.status === 'FAILED' && task.errorMessage && (
          <p className="text-xs text-red-600 mt-2 font-mono border-l-2 border-red-500 pl-2 py-1 bg-red-50 truncate" title={task.errorMessage}>
            ERROR: {task.errorMessage}
          </p>
        )}
        
        {/* 显示完成后的警告信息（点击查看详情） */}
        {hasWarnings && (
          <>
            <button
              onClick={() => setShowWarningsModal(true)}
              className="mt-2 w-full text-left px-3 py-2 bg-amber-50/50 border border-amber-200 hover:border-amber-400 hover:bg-amber-50 transition-all group"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle size={14} className="text-amber-600 flex-shrink-0" />
                <span className="text-xs font-bold text-amber-800 uppercase tracking-wide">
                  {task.progress?.warnings?.length ?? 0} Warnings
                </span>
                <span className="text-[10px] text-amber-500 ml-auto uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                  View Details
                </span>
              </div>
            </button>
            
            <WarningsModal
              isOpen={showWarningsModal}
              onClose={() => setShowWarningsModal(false)}
              warnings={task.progress?.warnings ?? []}
              warningDetails={task.progress?.warning_details}
            />
          </>
        )}
      </div>
      
      <div className="flex items-center gap-1 flex-shrink-0">
        {task.status === 'COMPLETED' && task.downloadUrl && (
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={() => window.open(task.downloadUrl, '_blank')}
            className="text-xs px-2 py-1"
          >
            下载
          </Button>
        )}
        
        <button
          onClick={onRemove}
          className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
          title="移除"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
};

interface ExportTasksPanelProps {
  projectId?: string;
  pages?: Page[];
  className?: string;
}

export const ExportTasksPanel: React.FC<ExportTasksPanelProps> = ({ projectId, pages = [], className }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { tasks, removeTask, clearCompleted, restoreActiveTasks } = useExportTasksStore();
  
  // Filter tasks for current project if projectId is provided
  const filteredTasks = projectId 
    ? tasks.filter(task => task.projectId === projectId)
    : tasks;
  
  const activeTasks = filteredTasks.filter(
    task => task.status === 'PENDING' || task.status === 'PROCESSING' || task.status === 'RUNNING'
  );
  const completedTasks = filteredTasks.filter(
    task => task.status === 'COMPLETED' || task.status === 'FAILED'
  );
  
  // 当组件挂载时，恢复所有正在进行的任务并重新开始轮询
  useEffect(() => {
    restoreActiveTasks();
  }, []); // 只在组件挂载时执行一次
  
  // 当有进行中的任务时，自动展开面板
  useEffect(() => {
    if (activeTasks.length > 0 && !isExpanded) {
      setIsExpanded(true);
    }
  }, [activeTasks.length, isExpanded]);
  
  if (filteredTasks.length === 0) {
    return null;
  }
  
  return (
    <div className={cn(
      "bg-white shadow-xl border border-border overflow-hidden",
      className
    )}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center bg-white hover:bg-gray-50 transition-colors border-b border-border"
      >
        <div className="flex items-center gap-2">
          <FileText size={18} className="text-primary" />
          <span className="text-sm font-medium text-primary">
            导出任务
          </span>
          {activeTasks.length > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-black text-white font-mono">
              {activeTasks.length} RUNNING
            </span>
          )}
        </div>
      </button>
      
      {/* Content */}
      {isExpanded && (
        <div className="max-h-96 overflow-y-auto bg-white">
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="p-0 border-b border-border">
              {activeTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task}
                  pages={pages}
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          )}
          
          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="p-0">
              <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b border-border">
                <span className="text-xs text-secondary font-medium uppercase tracking-wider">History</span>
                <button
                  onClick={clearCompleted}
                  className="text-xs text-secondary hover:text-black flex items-center gap-1 transition-colors"
                >
                  <Trash2 size={12} />
                  Clear
                </button>
              </div>
              {completedTasks.map(task => (
                <TaskItem 
                  key={task.id} 
                  task={task}
                  pages={pages}
                  onRemove={() => removeTask(task.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

