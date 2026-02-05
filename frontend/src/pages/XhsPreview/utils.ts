import type { XhsPayload } from './types';

export const normalizeFilesUrl = (url?: string | null) => {
  if (!url) return '';
  const u = String(url).trim();
  if (!u) return '';
  return u.split('#')[0].split('?')[0].trim();
};

export const parseNote = (note?: string | null) => {
  if (!note) return undefined;
  try {
    return JSON.parse(note);
  } catch {
    return undefined;
  }
};

export const parsePayload = (raw?: string | null): XhsPayload | null => {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const getAspectRatioClass = (aspectRatio: string): string => {
  const effectiveRatio = aspectRatio === 'auto' ? '3:4' : aspectRatio;
  switch (effectiveRatio) {
    case '3:4':
      return 'aspect-[3/4]';
    case '4:5':
    default:
      return 'aspect-[4/5]';
  }
};

export const extractImageUrlsFromDescription = (descriptionContent: any): string[] => {
  if (!descriptionContent) return [];
  let text = '';
  if ('text' in descriptionContent) {
    text = descriptionContent.text as string;
  } else if ('text_content' in descriptionContent && Array.isArray(descriptionContent.text_content)) {
    text = descriptionContent.text_content.join('\n');
  }
  if (!text) return [];
  const pattern = /!\[.*?\]\((.*?)\)/g;
  const matches: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const url = match[1]?.trim();
    if (url && (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/files/'))) {
      matches.push(url);
    }
  }
  return matches;
};

export const formatElapsed = (start: number | null | undefined, now: number): string => {
  if (!start) return '';
  const seconds = Math.max(0, Math.floor((now - start) / 1000));
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
