// Markdown 渲染（marked + DOMPurify）
import { marked } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
});

export function renderMarkdown(md: string): string {
  if (!md) return '';
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
  });
}

export { plainText } from './utils';
