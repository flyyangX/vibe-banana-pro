import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/components/shared';
import { useProjectStore } from '@/store/useProjectStore';
import {
  listUserTemplates,
  type UserTemplate,
  uploadReferenceFile,
  type ReferenceFile,
  associateFileToProject,
  triggerFileParse,
  uploadMaterial,
  associateMaterialsToProject,
  listProjects,
  type Material,
  copyMaterial,
  updateMaterialMeta
} from '@/api/endpoints';
import { getTemplateFile } from '@/components/shared/TemplateSelector/index';

export type CreationType = 'idea' | 'outline' | 'description';
export type ProductType = 'ppt' | 'infographic' | 'xiaohongshu';

export interface MaterialItem {
  id?: string;
  projectId?: string | null;
  url: string;
  name?: string;
}

export const useHomeState = () => {
  const navigate = useNavigate();
  const { initializeProject, isGlobalLoading } = useProjectStore();
  const { show, ToastContainer } = useToast();

  // Tab and content state
  const [activeTab, setActiveTab] = useState<CreationType>('idea');
  const [content, setContent] = useState('');
  const [productType, setProductType] = useState<ProductType>('ppt');

  // Template state
  const [selectedTemplate, setSelectedTemplate] = useState<File | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [selectedPresetTemplateId, setSelectedPresetTemplateId] = useState<string | null>(null);
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [useTemplateStyle, setUseTemplateStyle] = useState(false);
  const [templateStyle, setTemplateStyle] = useState('');
  const [hoveredPresetId, setHoveredPresetId] = useState<string | null>(null);

  // Material state
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isMaterialSelectorOpen, setIsMaterialSelectorOpen] = useState(false);
  const [materialItems, setMaterialItems] = useState<MaterialItem[]>([]);

  // Reference files state
  const [referenceFiles, setReferenceFiles] = useState<ReferenceFile[]>([]);
  const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
  const [previewFileId, setPreviewFileId] = useState<string | null>(null);

  // Upload state
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [isDocDragOver, setIsDocDragOver] = useState(false);
  const [isImageDragOver, setIsImageDragOver] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<'doc' | 'image' | null>(null);
  const [docUploadProgress, setDocUploadProgress] = useState<number | null>(null);
  const [imageUploadProgress, setImageUploadProgress] = useState<number | null>(null);
  const [isUploadExpanded, setIsUploadExpanded] = useState(false);

  // Project state
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);

  // Refs
  const docInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Constants
  const imageExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'];
  const docExtensions = ['pdf', 'docx', 'pptx', 'doc', 'ppt', 'xlsx', 'xls', 'csv', 'txt', 'md'];
  const allowedReferenceExtensions = [...docExtensions, ...imageExtensions];
  const imageAccept = '.png,.jpg,.jpeg,.gif,.webp,.heic';
  const docAccept = '.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.txt,.md';
  const maxImageUploadsPerSelect = 10;
  const isXhs = productType === 'xiaohongshu';
  const xhsMaterialNote = JSON.stringify({ type: 'asset', source: 'upload', product: 'xiaohongshu' });

  // Load project ID and user templates
  useEffect(() => {
    const projectId = localStorage.getItem('currentProjectId');
    setCurrentProjectId(projectId);

    const loadTemplates = async () => {
      try {
        const response = await listUserTemplates();
        if (response.data?.templates) {
          setUserTemplates(response.data.templates);
        }
      } catch (error) {
        console.error('加载用户模板失败:', error);
      }
    };
    loadTemplates();
  }, []);

  // Material helper functions
  const addMaterialItem = (item: MaterialItem) => {
    setMaterialItems(prev => (prev.some(existing => existing.url === item.url) ? prev : [...prev, item]));
  };

  const getMaterialDisplayName = (material: Material) =>
    material.display_name?.trim() ||
    material.prompt?.trim() ||
    material.name?.trim() ||
    material.original_filename?.trim() ||
    material.source_filename?.trim() ||
    material.filename ||
    material.url;

  const parseMaterialNote = (note?: string | null) => {
    if (!note) return null;
    try {
      const parsed = JSON.parse(note);
      return parsed && typeof parsed === 'object' ? parsed : null;
    } catch {
      return null;
    }
  };

  const ensureAssetMaterialNote = async (material: Material, source: string) => {
    if (!material?.id) return;
    const noteData = parseMaterialNote(material.note);
    if (noteData?.type && noteData.type !== 'asset') return;
    if (noteData?.type === 'asset') return;
    const nextNote = JSON.stringify({ type: 'asset', source }, null, 0);
    try {
      await updateMaterialMeta(material.id, { note: nextNote });
    } catch (error) {
      console.warn('更新素材类型失败，继续流程:', error);
    }
  };

  const handleMaterialsSelected = (materials: Material[]) => {
    if (materials.length === 0) return;
    materials.forEach(material => {
      ensureAssetMaterialNote(material, 'material_library');
      addMaterialItem({
        id: material.id,
        projectId: material.project_id ?? null,
        url: material.url,
        name: getMaterialDisplayName(material)
      });
    });
    show({ message: `已添加 ${materials.length} 张素材图片`, type: 'success' });
  };

  const handleRemoveMaterial = (imageUrl: string) => {
    setMaterialItems(prev => prev.filter(item => item.url !== imageUrl));
    show({ message: '已移除素材', type: 'success' });
  };

  // Upload functions
  const uploadMaterialImage = async (file: File, sourceLabel: string, onProgress?: (progress: number) => void) => {
    try {
      show({ message: `${sourceLabel}图片上传中...`, type: 'info' });
      const response = await uploadMaterial(file, null, {
        displayName: file.name,
        note: JSON.stringify({ type: 'asset', source: 'material_upload' })
      }, onProgress);
      const material = response?.data;
      if (material?.url) {
        ensureAssetMaterialNote(material, 'material_upload');
        addMaterialItem({
          id: material.id,
          projectId: material.project_id ?? null,
          url: material.url,
          name: file.name
        });
        show({ message: `${sourceLabel}图片已加入素材列表`, type: 'success' });
        return true;
      }
      show({ message: `${sourceLabel}图片上传失败：未返回图片信息`, type: 'error' });
      return false;
    } catch (error: any) {
      console.error('图片上传失败:', error);
      show({
        message: `${sourceLabel}图片上传失败: ${error?.response?.data?.error?.message || error.message || '未知错误'}`,
        type: 'error'
      });
      return false;
    }
  };

  const uploadXhsMaterial = async (file: File, sourceLabel: string, onProgress?: (progress: number) => void) => {
    try {
      show({ message: `${sourceLabel}图片上传中...`, type: 'info' });
      const response = await uploadMaterial(file, null, {
        displayName: file.name,
        note: xhsMaterialNote
      }, onProgress);
      const material = response?.data;
      if (material?.url) {
        addMaterialItem({
          id: material.id,
          projectId: material.project_id ?? null,
          url: material.url,
          name: file.name
        });
        show({ message: `${sourceLabel}图片已加入素材`, type: 'success' });
        return true;
      }
      show({ message: `${sourceLabel}图片上传失败：未返回图片信息`, type: 'error' });
      return false;
    } catch (error: any) {
      console.error('图片上传失败:', error);
      show({
        message: `${sourceLabel}图片上传失败: ${error?.response?.data?.error?.message || error.message || '未知错误'}`,
        type: 'error'
      });
      return false;
    }
  };

  const handleImageUpload = async (file: File, sourceLabel: string) => {
    if (isUploadingFile) return;

    setUploadingTarget('image');
    setImageUploadProgress(0);
    setIsUploadingFile(true);
    try {
      if (isXhs) {
        await uploadXhsMaterial(file, sourceLabel, setImageUploadProgress);
      } else {
        await uploadMaterialImage(file, sourceLabel, setImageUploadProgress);
      }
    } finally {
      setIsUploadingFile(false);
      setUploadingTarget(null);
      setImageUploadProgress(null);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (isUploadingFile) return;

    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      show({
        message: `文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持 200MB`,
        type: 'error'
      });
      return;
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase();
    if (fileExt === 'ppt' || fileExt === 'pptx')
      show({ message: '提示：建议将PPT转换为PDF格式上传，可获得更好的解析效果', type: 'info' });

    const isImage = fileExt ? imageExtensions.includes(fileExt) : false;
    if (isImage) {
      await handleImageUpload(file, '');
      return;
    }

    setUploadingTarget('doc');
    setDocUploadProgress(0);
    setIsUploadingFile(true);
    try {
      const response = await uploadReferenceFile(file, null, setDocUploadProgress);
      if (response?.data?.file) {
        const uploadedFile = response.data.file;
        setReferenceFiles(prev => [...prev, uploadedFile]);
        show({ message: '文件上传成功', type: 'success' });

        const uploadedFileExt = file.name.split('.').pop()?.toLowerCase() || '';
        const isUploadedImage = imageExtensions.includes(uploadedFileExt);

        if (isUploadedImage && uploadedFile.parse_status === 'completed' && uploadedFile.markdown_content) {
          show({
            message: `图片识别完成！内容：${uploadedFile.markdown_content.slice(0, 50)}...`,
            type: 'success'
          });
        }

        if (uploadedFile.parse_status === 'pending') {
          try {
            const parseResponse = await triggerFileParse(uploadedFile.id);
            if (parseResponse?.data?.file) {
              const parsedFile = parseResponse.data.file;
              setReferenceFiles(prev =>
                prev.map(f => f.id === uploadedFile.id ? parsedFile : f)
              );
            } else {
              setReferenceFiles(prev =>
                prev.map(f => f.id === uploadedFile.id ? { ...f, parse_status: 'parsing' as const } : f)
              );
            }
          } catch (parseError: any) {
            console.error('触发文件解析失败:', parseError);
          }
        }
      } else {
        show({ message: '文件上传失败：未返回文件信息', type: 'error' });
      }
    } catch (error: any) {
      console.error('文件上传失败:', error);

      if (error?.response?.status === 413) {
        show({
          message: `文件过大：${(file.size / 1024 / 1024).toFixed(1)}MB，最大支持 200MB`,
          type: 'error'
        });
      } else {
        show({
          message: `文件上传失败: ${error?.response?.data?.error?.message || error.message || '未知错误'}`,
          type: 'error'
        });
      }
    } finally {
      setIsUploadingFile(false);
      setUploadingTarget(null);
      setDocUploadProgress(null);
    }
  };

  const handleFileRemove = (fileId: string) => {
    setReferenceFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const handleFileStatusChange = (updatedFile: ReferenceFile) => {
    setReferenceFiles(prev =>
      prev.map(f => f.id === updatedFile.id ? updatedFile : f)
    );
  };

  const handleFilesSelected = (selectedFiles: ReferenceFile[]) => {
    setReferenceFiles(prev => {
      const existingIds = new Set(prev.map(f => f.id));
      const newFiles = selectedFiles.filter(f => !existingIds.has(f.id));
      const updated = prev.map(f => {
        const updatedFile = selectedFiles.find(sf => sf.id === f.id);
        return updatedFile || f;
      });
      return [...updated, ...newFiles];
    });
    show({ message: `已添加 ${selectedFiles.length} 个参考文件`, type: 'success' });
  };

  const selectedFileIds = useMemo(() => {
    return referenceFiles.map(f => f.id);
  }, [referenceFiles]);

  // Input handlers
  const handleImageSelect = () => {
    imageInputRef.current?.click();
  };

  const handleDocInputSelect = () => {
    docInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);
    const imageFiles = fileList.filter(file => {
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      return imageExtensions.includes(ext);
    });

    if (imageFiles.length > maxImageUploadsPerSelect) {
      show({ message: `单次最多上传 ${maxImageUploadsPerSelect} 张图片，将只处理前 ${maxImageUploadsPerSelect} 张`, type: 'info' });
    }

    let imageCount = 0;
    for (const file of fileList) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = imageExtensions.includes(fileExt);
      const isAllowed = allowedReferenceExtensions.includes(fileExt);

      if (!isAllowed) {
        show({ message: `不支持的文件类型: ${fileExt || '未知'}`, type: 'info' });
        continue;
      }

      if (isImage) {
        imageCount += 1;
        if (imageCount > maxImageUploadsPerSelect) {
          continue;
        }
      }

      if (!isImage) {
        show({ message: '图片素材仅支持上传图片文件', type: 'info' });
        continue;
      }
      await handleImageUpload(file, '');
    }

    e.target.value = '';
  };

  const handleDocInputSelectChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileList = Array.from(files);

    for (const file of fileList) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!docExtensions.includes(fileExt)) {
        show({ message: `仅支持上传文档：${fileExt || '未知'}`, type: 'info' });
        continue;
      }
      await handleFileUpload(file);
    }

    e.target.value = '';
  };

  const handleDocDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDocDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    for (const file of files) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      if (!docExtensions.includes(fileExt)) {
        show({ message: `仅支持上传文档：${fileExt || '未知'}`, type: 'info' });
        continue;
      }
      await handleFileUpload(file);
    }
  };

  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsImageDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    if (files.length === 0) return;

    let imageCount = 0;
    for (const file of files) {
      const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
      const isImage = imageExtensions.includes(fileExt);
      if (!isImage) {
        show({ message: `仅支持上传图片：${fileExt || '未知'}`, type: 'info' });
        continue;
      }
      imageCount += 1;
      if (imageCount > maxImageUploadsPerSelect) {
        show({ message: `单次最多上传 ${maxImageUploadsPerSelect} 张图片，将只处理前 ${maxImageUploadsPerSelect} 张`, type: 'info' });
        break;
      }
      await handleImageUpload(file, '');
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    console.log('Paste event triggered');
    const items = e.clipboardData?.items;
    if (!items) {
      console.log('No clipboard items');
      return;
    }

    console.log('Clipboard items:', items.length);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      console.log(`Item ${i}:`, { kind: item.kind, type: item.type });

      if (item.kind === 'file') {
        const file = item.getAsFile();
        console.log('Got file:', file);

        if (file) {
          console.log('File details:', { name: file.name, type: file.type, size: file.size });

          if (file.type.startsWith('image/')) {
            console.log('Image detected, uploading...');
            e.preventDefault();
            await handleImageUpload(file, '');
            return;
          }

          const allowedExtensions = ['pdf', 'docx', 'pptx', 'doc', 'ppt', 'xlsx', 'xls', 'csv', 'txt', 'md'];
          const fileExt = file.name.split('.').pop()?.toLowerCase();

          console.log('File extension:', fileExt);

          if (fileExt && allowedExtensions.includes(fileExt)) {
            console.log('File type allowed, uploading...');
            e.preventDefault();
            await handleFileUpload(file);
          } else {
            console.log('File type not allowed');
            show({ message: `不支持的文件类型: ${fileExt}`, type: 'info' });
          }
        }
      }
    }
  };

  // Template handlers
  const handleTemplateSelect = async (templateFile: File | null, templateId?: string) => {
    if (templateFile) {
      setSelectedTemplate(templateFile);
    }

    if (templateId) {
      if (templateId.length <= 3 && /^\d+$/.test(templateId)) {
        setSelectedPresetTemplateId(templateId);
        setSelectedTemplateId(null);
      } else {
        setSelectedTemplateId(templateId);
        setSelectedPresetTemplateId(null);
      }
    } else {
      setSelectedTemplate(null);
      setSelectedTemplateId(null);
      setSelectedPresetTemplateId(null);
    }
  };

  const handleUseTemplateStyleChange = (checked: boolean) => {
    setUseTemplateStyle(checked);
    if (checked) {
      setSelectedTemplate(null);
      setSelectedTemplateId(null);
      setSelectedPresetTemplateId(null);
    }
  };

  // Navigation handlers
  const handleOpenMaterialModal = () => {
    setIsMaterialModalOpen(true);
  };

  const handleOpenMaterialsLibrary = () => {
    const pid = localStorage.getItem('currentProjectId');
    if (!pid) {
      show({ message: '请先创建或打开一个项目，再进入素材库', type: 'info' });
      return;
    }
    navigate(`/project/${pid}/materials`);
  };

  // Submit handler
  const handleSubmit = async () => {
    if (!content.trim()) {
      show({ message: '请输入内容', type: 'error' });
      return;
    }

    const parsingFiles = referenceFiles.filter(f =>
      f.parse_status === 'pending' || f.parse_status === 'parsing'
    );
    if (parsingFiles.length > 0) {
      show({
        message: `还有 ${parsingFiles.length} 个参考文件正在解析中，请等待解析完成`,
        type: 'info'
      });
      return;
    }

    try {
      try {
        const historyResponse = await listProjects(1, 0);
        if ((historyResponse.data?.projects || []).length === 0) {
          show({
            message: '建议先到设置页底部进行服务测试，避免后续功能异常',
            type: 'info'
          });
        }
      } catch (error) {
        console.warn('检查历史项目失败，跳过提示:', error);
      }

      let templateFile = productType === 'ppt' ? selectedTemplate : null;
      if (productType === 'ppt' && !templateFile && (selectedTemplateId || selectedPresetTemplateId)) {
        const templateId = selectedTemplateId || selectedPresetTemplateId;
        if (templateId) {
          templateFile = await getTemplateFile(templateId, userTemplates);
        }
      }

      const styleDesc = templateStyle.trim() ? templateStyle.trim() : undefined;

      await initializeProject(activeTab, content, templateFile || undefined, styleDesc, productType);

      const projectId = localStorage.getItem('currentProjectId');
      if (!projectId) {
        show({ message: '项目创建失败', type: 'error' });
        return;
      }

      if (referenceFiles.length > 0) {
        console.log(`Associating ${referenceFiles.length} reference files to project ${projectId}:`, referenceFiles);
        try {
          const results = await Promise.all(
            referenceFiles.map(async file => {
              const response = await associateFileToProject(file.id, projectId);
              console.log(`Associated file ${file.id}:`, response);
              return response;
            })
          );
          console.log('Reference files associated successfully:', results);
        } catch (error) {
          console.error('Failed to associate reference files:', error);
        }
      } else {
        console.log('No reference files to associate');
      }

      const globalMaterialUrls = materialItems
        .filter(item => !item.projectId)
        .map(item => item.url);
      const boundMaterialIds = materialItems
        .filter(item => item.projectId && item.id)
        .map(item => item.id as string);

      if (globalMaterialUrls.length > 0 || boundMaterialIds.length > 0) {
        try {
          if (globalMaterialUrls.length > 0) {
            console.log(`Associating ${globalMaterialUrls.length} global materials to project ${projectId}:`, globalMaterialUrls);
            await associateMaterialsToProject(projectId, globalMaterialUrls);
          }
          if (boundMaterialIds.length > 0) {
            console.log(`Copying ${boundMaterialIds.length} bound materials to project ${projectId}:`, boundMaterialIds);
            await Promise.all(boundMaterialIds.map((materialId) => copyMaterial(materialId, projectId)));
          }
        } catch (error) {
          console.error('Failed to attach materials:', error);
        }
      } else {
        console.log('No materials to attach');
      }

      if (productType === 'infographic' || productType === 'xiaohongshu') {
        navigate(`/project/${projectId}/outline`);
      } else if (activeTab === 'idea' || activeTab === 'outline') {
        navigate(`/project/${projectId}/outline`);
      } else if (activeTab === 'description') {
        navigate(`/project/${projectId}/detail`);
      }
    } catch (error: any) {
      console.error('创建项目失败:', error);
    }
  };

  return {
    // Navigation
    navigate,

    // Toast
    show,
    ToastContainer,

    // Loading state
    isGlobalLoading,

    // Tab and content
    activeTab,
    setActiveTab,
    content,
    setContent,
    productType,
    setProductType,

    // Template state
    selectedTemplate,
    selectedTemplateId,
    selectedPresetTemplateId,
    userTemplates,
    useTemplateStyle,
    templateStyle,
    setTemplateStyle,
    hoveredPresetId,
    setHoveredPresetId,
    handleTemplateSelect,
    handleUseTemplateStyleChange,

    // Material state
    isMaterialModalOpen,
    setIsMaterialModalOpen,
    isMaterialSelectorOpen,
    setIsMaterialSelectorOpen,
    materialItems,
    handleMaterialsSelected,
    handleRemoveMaterial,
    handleOpenMaterialModal,
    handleOpenMaterialsLibrary,

    // Reference files
    referenceFiles,
    isFileSelectorOpen,
    setIsFileSelectorOpen,
    previewFileId,
    setPreviewFileId,
    handleFileRemove,
    handleFileStatusChange,
    handleFilesSelected,
    selectedFileIds,

    // Upload state
    isUploadingFile,
    isDocDragOver,
    setIsDocDragOver,
    isImageDragOver,
    setIsImageDragOver,
    uploadingTarget,
    docUploadProgress,
    imageUploadProgress,
    isUploadExpanded,
    setIsUploadExpanded,

    // Refs
    docInputRef,
    imageInputRef,
    textareaRef,

    // Constants
    imageAccept,
    docAccept,
    isXhs,

    // Project
    currentProjectId,

    // Handlers
    handlePaste,
    handleImageSelect,
    handleDocInputSelect,
    handleFileSelect,
    handleDocInputSelectChange,
    handleDocDrop,
    handleImageDrop,
    handleSubmit,
  };
};
