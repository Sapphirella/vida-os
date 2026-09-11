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
    // 允许 fileRef: 协议，否则 DOMPurify 会把正文内嵌图片的 src 直接删掉
    // （其余部分与 DOMPurify 默认规则一致）
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|callto|sms|cid|xmpp|fileRef):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export { plainText } from './utils';
