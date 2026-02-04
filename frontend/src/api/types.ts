/**
 * API 类型定义文件
 * 包含所有 API 相关的 interface 和 type 定义
 */

// ===== 输出语言相关类型 =====

export type OutputLanguage = 'zh' | 'ja' | 'en' | 'auto';

export interface OutputLanguageOption {
  value: OutputLanguage;
  label: string;
}

// ===== 小红书卡片图片版本 =====

export interface XhsCardImageVersion {
  version_id: string;
  project_id: string;
  index: number;
  material_id: string;
  version_number: number;
  is_current: boolean;
  created_at?: string;
  material_url?: string;
  display_name?: string;
  material_created_at?: string;
}

// ===== 素材相关类型 =====

export interface Material {
  id: string;
  project_id?: string | null;
  filename: string;
  display_name?: string | null;
  note?: string | null;
  url: string;
  relative_path: string;
  created_at: string;
  // 可选的附加信息：用于展示友好名称
  prompt?: string;
  original_filename?: string;
  source_filename?: string;
  name?: string;
}

// ===== 用户模板相关类型 =====

export interface UserTemplate {
  template_id: string;
  name?: string;
  template_image_url: string;
  thumb_url?: string;  // Thumbnail URL for faster loading
  product_tags?: string[];
  created_at?: string;
  updated_at?: string;
}

// ===== 参考文件相关类型 =====

export type ReferenceFileParseStatus = 'pending' | 'parsing' | 'completed' | 'failed';

export interface ReferenceFile {
  id: string;
  project_id: string | null;
  filename: string;
  file_size: number;
  file_type: string;
  parse_status: ReferenceFileParseStatus;
  markdown_content: string | null;
  error_message: string | null;
  image_caption_failed_count?: number;  // Optional, calculated dynamically
  created_at: string;
  updated_at: string;
}

// ===== 模板变体类型 =====

export type TemplateVariantType = 'cover' | 'content' | 'transition' | 'ending';

// ===== 小红书宽高比类型 =====

export type XhsAspectRatio = '4:5' | '3:4' | '9:16';

// ===== 模板使用模式类型 =====

export type TemplateUsageMode = 'auto' | 'template' | 'style';

// ===== 生成模式类型 =====

export type InfographicMode = 'single' | 'series';

// ===== 请求参数类型 =====

export interface GenerateTemplateVariantsOptions {
  extraRequirements?: string;
}

export interface GenerateOutlineOptions {
  pageCount?: number;
}

export interface GenerateInfographicOptions {
  mode?: InfographicMode;
  pageIds?: string[];
  language?: OutputLanguage;
  aspectRatio?: string;
  resolution?: string;
  maxWorkers?: number;
  useTemplate?: boolean;
}

export interface GenerateXhsOptions {
  imageCount?: number; // 6-9
  aspectRatio?: XhsAspectRatio;
  resolution?: string;
  maxWorkers?: number;
  useTemplate?: boolean;
  templateUsageMode?: TemplateUsageMode;
  language?: OutputLanguage;
}

export interface GenerateXhsCardOptions {
  index: number;
  aspectRatio?: XhsAspectRatio;
  resolution?: string;
  useTemplate?: boolean;
  templateUsageMode?: TemplateUsageMode;
  language?: OutputLanguage;
}

export interface EditXhsCardImageOptions {
  index: number;
  editInstruction: string;
  aspectRatio?: XhsAspectRatio;
  resolution?: string;
  templateUsageMode?: TemplateUsageMode;
  descImageUrls?: string[];
  uploadedFiles?: File[];
}

export interface GenerateXhsBlueprintOptions {
  aspectRatio?: XhsAspectRatio;
  language?: OutputLanguage;
  copywritingOnly?: boolean;
}

export interface GeneratePageImageOptions {
  useTemplate?: boolean;
  extraRequirements?: string;
  refImageUrls?: string[]; // /files/... 或 http(s)...
  uploadedFiles?: File[];
}

export interface EditPageImageContextImages {
  useTemplate?: boolean;
  descImageUrls?: string[];
  uploadedFiles?: File[];
}

export interface RegenerateTemplateVariantOptions {
  extraRequirements?: string;
  refImageUrls?: string[];
  uploadedFiles?: File[];
}

export interface UpdateXhsCardMaterialsPayload {
  material_ids: string[];
  locked?: boolean;
}

export interface UploadMaterialMetadata {
  displayName?: string | null;
  note?: string | null;
}

export interface UpdateMaterialMetaPayload {
  display_name?: string | null;
  note?: string | null;
}

// ===== API 响应类型 =====

export interface TemplateUploadResponse {
  template_image_url: string;
}

export interface GenerateTemplateVariantsResponse {
  task_id: string;
  status: string;
  total: number;
}

export interface ProjectListResponse {
  projects: import('@/types').Project[];
  total: number;
}

export interface RefineResponse {
  pages: import('@/types').Page[];
  message: string;
}

export interface XhsCardImageVersionsResponse {
  versions: XhsCardImageVersion[];
}

export interface PageImageVersionsResponse {
  versions: any[];
}

export interface ExportResponse {
  download_url: string;
  download_url_absolute?: string;
}

export interface ExportTaskResponse {
  task_id: string;
}

export interface GenerateMaterialResponse {
  task_id: string;
  status: string;
}

export interface MaterialListResponse {
  materials: Material[];
  count: number;
}

export interface MaterialResponse {
  material: Material;
}

export interface DeleteMaterialResponse {
  id: string;
}

export interface AssociateMaterialsResponse {
  updated_ids: string[];
  count: number;
}

export interface UserTemplateListResponse {
  templates: UserTemplate[];
}

export interface ReferenceFileResponse {
  file: ReferenceFile;
}

export interface ReferenceFileListResponse {
  files: ReferenceFile[];
}

export interface ReferenceFileParseResponse {
  file: ReferenceFile;
  message: string;
}

export interface ReferenceFileMessageResponse {
  message: string;
}

export interface LanguageResponse {
  language: OutputLanguage;
}

export interface TestBaiduOcrResponse {
  recognized_text: string;
}

export interface TestTextModelResponse {
  reply: string;
}

export interface TestCaptionModelResponse {
  caption: string;
}

export interface TestImageModelResponse {
  image_size: [number, number];
}

export interface TestBaiduInpaintResponse {
  image_size: [number, number];
}

export interface TestMineruPdfResponse {
  batch_id: string;
  extract_id: string;
  content_preview: string;
}

// ===== 常量 =====

export const OUTPUT_LANGUAGE_OPTIONS: OutputLanguageOption[] = [
  { value: 'zh', label: '中文' },
  { value: 'ja', label: '日本語' },
  { value: 'en', label: 'English' },
  { value: 'auto', label: '自动' },
];
