import { getImageUrl } from '@/api/client';
import type { Project, Page, DescriptionContent } from '@/types';
import { downloadFile } from './index';

/**
 * 获取项目标题
 */
export const getProjectTitle = (project: Project): string => {
  // 如果有 idea_prompt，优先使用
  if (project.idea_prompt) {
    return project.idea_prompt;
  }
  
  // 如果没有 idea_prompt，尝试从第一个页面获取标题
  if (project.pages && project.pages.length > 0) {
    // 按 order_index 排序，找到第一个页面
    const sortedPages = [...project.pages].sort((a, b) => 
      (a.order_index || 0) - (b.order_index || 0)
    );
    const firstPage = sortedPages[0];
    
    // 如果第一个页面有 outline_content 和 title，使用它
    if (firstPage?.outline_content?.title) {
      return firstPage.outline_content.title;
    }
  }
  
  // 默认返回未命名项目
  return '未命名项目';
};

const parseJsonSafe = (raw: unknown): any => {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
  return null;
};

const parseMaterialNote = (note?: string | null): Record<string, any> | null => {
  if (!note) return null;
  try {
    return JSON.parse(note);
  } catch {
    return null;
  }
};

const getGeneratedMaterials = (project: Project) => {
  const materials = (project as Project & { materials?: Array<{ url?: string; note?: string; updated_at?: string; created_at?: string }> }).materials || [];
  if (!materials.length) return [];
  const isInfographic = project.product_type === 'infographic';
  const isXhs = project.product_type === 'xiaohongshu';
  if (!isInfographic && !isXhs) return [];

  const filtered = materials.filter((m) => {
    if (!m.url) return false;
    const note = parseMaterialNote(m.note);
    if (!note) return true;
    if (isInfographic) return note.type === 'infographic';
    if (isXhs) return note.type === 'xhs';
    return true;
  });

  return filtered.length ? filtered : materials.filter((m) => m.url);
};

const getGeneratedPages = (project: Project) => {
  const pages = project.pages || [];
  return pages.filter((p) => p.generated_image_url);
};

const getGeneratedImageCount = (project: Project): number => {
  const materials = getGeneratedMaterials(project);
  if (materials.length > 0) return materials.length;
  const pages = getGeneratedPages(project);
  return pages.length;
};

/**
 * 获取第一页图片URL（PPT 用 pages，信息图/小红书优先用生成图）
 */
export const getFirstPageImage = (project: Project): string | null => {
  const isInfographic = project.product_type === 'infographic';
  const isXhs = project.product_type === 'xiaohongshu';

  if (isInfographic || isXhs) {
    const materials = getGeneratedMaterials(project);
    if (materials.length) {
      const sorted = [...materials].sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at || 0).getTime();
        const tb = new Date(b.updated_at || b.created_at || 0).getTime();
        return tb - ta;
      });
      const firstWithUrl = sorted[0];
      if (firstWithUrl?.url) {
        return getImageUrl(firstWithUrl.url, firstWithUrl.updated_at || firstWithUrl.created_at);
      }
    }
    const pagesWithImage = getGeneratedPages(project).sort((a, b) => (a.order_index || 0) - (b.order_index || 0));
    const firstPageWithImage = pagesWithImage[0];
    if (firstPageWithImage?.generated_image_url) {
      return getImageUrl(firstPageWithImage.generated_image_url, firstPageWithImage.updated_at);
    }
    return null;
  }

  if (!project.pages || project.pages.length === 0) {
    return null;
  }

  const firstPageWithImage = project.pages.find(p => p.generated_image_url);
  if (firstPageWithImage?.generated_image_url) {
    return getImageUrl(firstPageWithImage.generated_image_url, firstPageWithImage.updated_at);
  }

  return null;
};

/**
 * 格式化日期
 */
export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
};

/**
 * 获取项目状态文本（PPT 用 pages，信息图/小红书用 materials）
 */
export const getStatusText = (project: Project): string => {
  const isInfographic = project.product_type === 'infographic';
  const isXhs = project.product_type === 'xiaohongshu';

  if (isInfographic || isXhs) {
    const generatedCount = getGeneratedImageCount(project);
    if (generatedCount > 0) return '已完成';
    if (isInfographic) return '待生成图片';
    if (isXhs) {
      const payload = parseJsonSafe(project.product_payload);
      const hasBlueprint =
        Array.isArray(payload?.cards) && payload.cards.length > 0 ||
        (payload?.copywriting && Object.keys(payload.copywriting).length > 0);
      return hasBlueprint ? '待生成图片' : '待生成文案';
    }
    return '待生成图片';
  }

  if (!project.pages || project.pages.length === 0) {
    return '未开始';
  }
  const hasImages = project.pages.some(p => p.generated_image_path);
  if (hasImages) {
    return '已完成';
  }
  const hasDescriptions = project.pages.some(p => p.description_content);
  if (hasDescriptions) {
    return '待生成图片';
  }
  return '待生成描述';
};

/**
 * 获取项目展示数量（PPT 用页数，信息图/小红书用张数）
 */
export const getProjectDisplayCount = (project: Project): { count: number; unit: string } => {
  const isInfographic = project.product_type === 'infographic';
  const isXhs = project.product_type === 'xiaohongshu';

  if (isInfographic || isXhs) {
    const count = getGeneratedImageCount(project);
    return { count, unit: '张' };
  }

  const count = project.pages?.length ?? 0;
  return { count, unit: '页' };
};

/**
 * 获取项目状态颜色样式
 */
export const getStatusColor = (project: Project): string => {
  const status = getStatusText(project);
  if (status === '已完成') return 'text-green-600 bg-green-50';
  if (status === '待生成图片') return 'text-yellow-600 bg-yellow-50';
  if (status === '待生成描述') return 'text-blue-600 bg-blue-50';
  return 'text-gray-600 bg-gray-50';
};

/**
 * 获取项目路由路径
 */
export const getProjectRoute = (project: Project): string => {
  const projectId = project.id || project.project_id;
  if (!projectId) return '/';
  const isInfographic = project.product_type === 'infographic';
  const isXhs = project.product_type === 'xiaohongshu';
  const isNonPpt = isInfographic || isXhs;

  if (isNonPpt) {
    // 已在出图中或完成，进入对应预览页
    if (project.status === 'GENERATING_INFOGRAPHIC' || project.status === 'GENERATING_XHS' || project.status === 'COMPLETED') {
      return isInfographic ? `/project/${projectId}/infographic` : `/project/${projectId}/xhs`;
    }
    // 否则按照编辑链路进入
    if (project.pages && project.pages.length > 0) {
      const hasDescriptions = project.pages.some(p => p.description_content);
      if (hasDescriptions) {
        return `/project/${projectId}/detail`;
      }
      return `/project/${projectId}/outline`;
    }
    return `/project/${projectId}/outline`;
  }

  if (project.pages && project.pages.length > 0) {
    const hasImages = project.pages.some(p => p.generated_image_path);
    if (hasImages) {
      return `/project/${projectId}/preview`;
    }
    const hasDescriptions = project.pages.some(p => p.description_content);
    if (hasDescriptions) {
      return `/project/${projectId}/detail`;
    }
    return `/project/${projectId}/outline`;
  }
  return `/project/${projectId}/outline`;
};

// ========== Markdown 导出相关函数 ==========

/**
 * 从描述内容中提取文本
 */
export const getDescriptionText = (descContent: DescriptionContent | undefined | null): string => {
  if (!descContent) return '';
  if ('text' in descContent) {
    return (descContent.text as string) || '';
  } else if ('text_content' in descContent && Array.isArray(descContent.text_content)) {
    return descContent.text_content.join('\n');
  }
  return '';
};

/**
 * 将页面大纲转换为 Markdown 格式
 */
export const pageOutlineToMarkdown = (page: Page, index: number): string => {
  const title = page.outline_content?.title || `第 ${index + 1} 页`;
  const points = page.outline_content?.points || [];
  
  let markdown = `## 第 ${index + 1} 页: ${title}\n\n`;
  
  if (points.length > 0) {
    points.forEach((point) => {
      markdown += `- ${point}\n`;
    });
    markdown += '\n';
  } else {
    markdown += `*暂无要点*\n\n`;
  }
  
  return markdown;
};

/**
 * 将页面描述转换为 Markdown 格式
 */
export const pageDescriptionToMarkdown = (page: Page, index: number): string => {
  const title = page.outline_content?.title || `第 ${index + 1} 页`;
  const descText = getDescriptionText(page.description_content);
  
  let markdown = `## 第 ${index + 1} 页: ${title}\n\n`;
  
  if (descText) {
    markdown += `${descText}\n\n`;
  } else {
    markdown += `*暂无描述*\n\n`;
  }
  
  markdown += `---\n\n`;
  
  return markdown;
};

/**
 * 将项目大纲导出为 Markdown 文件
 */
export const exportOutlineToMarkdown = (project: Project): void => {
  const projectTitle = getProjectTitle(project);
  
  let markdown = `# ${projectTitle}\n\n`;
  markdown += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  markdown += `---\n\n`;
  
  project.pages.forEach((page, index) => {
    markdown += pageOutlineToMarkdown(page, index);
  });
  
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const filename = `大纲_${project.id?.slice(0, 8) || 'export'}.md`;
  downloadFile(blob, filename);
};

/**
 * 将项目页面描述导出为 Markdown 文件
 */
export const exportDescriptionsToMarkdown = (project: Project): void => {
  const projectTitle = getProjectTitle(project);
  
  let markdown = `# ${projectTitle}\n\n`;
  markdown += `> 生成时间: ${new Date().toLocaleString('zh-CN')}\n\n`;
  markdown += `---\n\n`;
  
  project.pages.forEach((page, index) => {
    markdown += pageDescriptionToMarkdown(page, index);
  });
  
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const filename = `页面描述_${project.id?.slice(0, 8) || 'export'}.md`;
  downloadFile(blob, filename);
};

