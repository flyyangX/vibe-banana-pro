import type { Material, UserTemplate } from '@/api/endpoints';

export type XhsAspectRatio = '4:5' | '3:4' | 'auto';

export type MaterialWithNote = Material & {
  noteData?: {
    type?: string;
    mode?: string;
    index?: number;
    role?: string;
    aspect_ratio?: string;
  };
};

export type XhsVersionItem = {
  source: 'page' | 'xhs';
  version_id: string;
  version_number: number;
  is_current: boolean;
  created_at?: string;
  image_url?: string;
  material_url?: string;
  material_created_at?: string;
  index?: number;
};

export type XhsPayload = {
  product_type?: string;
  mode?: string;
  aspect_ratio?: string;
  image_count?: number;
  copywriting?: {
    title?: string;
    body?: string;
    hashtags?: string[];
  };
  materials?: Array<{
    index?: number;
    material_id?: string;
    url?: string;
    display_name?: string;
    role?: string;
  }>;
  material_plan?: Array<{
    material_ids?: string[];
    locked?: boolean;
    reason?: string;
  }>;
};

export type XhsDisplayCard = {
  index: number;
  label: string;
  imageUrl: string | null;
  source: 'page' | 'material' | 'none';
  pageId?: string;
  material?: MaterialWithNote;
  sizeLabel?: string;
};

export type XhsPreviewState = {
  aspectRatio: XhsAspectRatio;
  setAspectRatio: (ratio: XhsAspectRatio) => void;
  imageCount: number;
  materials: MaterialWithNote[];
  isLoading: boolean;
  isGenerating: boolean;
  progress: { total?: number; completed?: number; failed?: number } | null;
  generationStartedAt: number | null;
  now: number;
  regeneratingIndex: Record<number, boolean>;
  regeneratingStartedAt: Record<number, number>;
  xhsMaterials: MaterialWithNote[];
  assetMaterials: MaterialWithNote[];
  xhsDisplayCards: XhsDisplayCard[];
  xhsPayload: XhsPayload | null;
  materialPlanByIndex: Map<number, { material_ids?: string[]; locked?: boolean; reason?: string }>;
  materialById: Map<string, MaterialWithNote>;
  assetMaterialIdSet: Set<string>;
  assetMaterialIdByUrl: Map<string, string>;
  copywritingText: string;
  hasTemplateResource: boolean;
  userTemplates: UserTemplate[];
  selectedTemplateId: string | null;
  selectedPresetTemplateId: string | null;
  templateUsageMode: 'auto' | 'template' | 'style';
  extraRequirements: string;
  templateStyle: string;
  xhsMaxConcurrent: number;
};

export type XhsPreviewActions = {
  loadMaterials: () => Promise<void>;
  handleGenerate: () => Promise<void>;
  handleRegenerateCard: (index: number) => Promise<void>;
  handleRegenerateAll: () => Promise<void>;
  handleCopy: () => Promise<void>;
  handleTemplateSelect: (templateFile: File | null, templateId?: string) => Promise<void>;
  handleClearTemplate: () => void;
  handleSaveExtraRequirements: () => Promise<void>;
  handleSaveTemplateStyle: () => Promise<void>;
  openMaterialPlanModal: (index: number) => void;
  handleClearMaterials: (index: number) => Promise<void>;
  handleToggleMaterialLock: (index: number, locked: boolean) => Promise<void>;
  formatElapsed: (start?: number | null) => string;
  extractImageUrlsFromDescription: (descriptionContent: any) => string[];
};
