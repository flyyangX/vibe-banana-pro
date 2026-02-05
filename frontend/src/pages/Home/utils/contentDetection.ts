import type { CreationType } from '../hooks/useHomeState';

const slidePagePattern = /第\s*\d+\s*页/;
const slideKeywordPattern = /Slide\s*\d+/i;
const titlePattern = /标题\s*[:：]/;
const contentPattern = /内容\s*[:：]/;

const outlineSectionPattern = /^(第[一二三四五六七八九十]+(部分|章|节)|第\d+(部分|章|节)|[一二三四五六七八九十]+[、.])/;
const bulletPattern = /^([-*•]|\d+\.)\s+/;

const getNonEmptyLines = (text: string) =>
  text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

const isSlideScript = (text: string) => {
  if (slidePagePattern.test(text) || slideKeywordPattern.test(text)) {
    return true;
  }

  return titlePattern.test(text) && contentPattern.test(text);
};

const isOutline = (text: string) => {
  const lines = getNonEmptyLines(text);
  if (lines.length === 0) return false;

  const sectionLines = lines.filter((line) => outlineSectionPattern.test(line));
  const bulletLines = lines.filter((line) => bulletPattern.test(line));

  return sectionLines.length > 0 && bulletLines.length >= 2;
};

export const detectCreationType = (content: string): CreationType => {
  const trimmedContent = content.trim();
  if (!trimmedContent) return 'idea';

  if (isSlideScript(trimmedContent)) {
    return 'description';
  }

  if (isOutline(trimmedContent)) {
    return 'outline';
  }

  return 'idea';
};
