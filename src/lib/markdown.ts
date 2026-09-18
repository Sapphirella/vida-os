// Markdown 渲染（marked + DOMPurify）
import { marked, type Tokens } from 'marked';
import DOMPurify from 'dompurify';

marked.setOptions({
  gfm: true,
  breaks: true,
});

/** Obsidian 风格双链的 href 协议（渲染后由 MarkdownView 拦截点击做跳转/新建） */
export const WIKI_SCHEME = 'wiki:';

/** 双链语法：[[目标标题]] 或 [[目标标题|显示文字]] */
const WIKI_PATTERN = /^\[\[([^\[\]\n]+)\]\]/;

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** 行内扩展：把 [[...]] 解析成带 vd-wiki-link 标记的链接。
 *  只作用于行内解析，代码块/行内代码里的 [[...]] 不会被误解析。 */
const wikiLinkExtension = {
  name: 'wikilink',
  level: 'inline' as const,
  start(src: string): number | undefined {
    const i = src.indexOf('[[');
    return i < 0 ? undefined : i;
  },
  tokenizer(src: string): Tokens.Generic | undefined {
    const m = WIKI_PATTERN.exec(src);
    if (!m) return undefined;
    const [target, ...aliasParts] = m[1].split('|');
    const name = target.trim();
    if (!name) return undefined;
    return {
      type: 'wikilink',
      raw: m[0],
      target: name,
      label: aliasParts.length ? aliasParts.join('|').trim() : name,
    } as Tokens.Generic;
  },
  renderer(token: Tokens.Generic): string {
    const t = token as unknown as { target: string; label: string };
    return `<a href="${WIKI_SCHEME}${encodeURIComponent(t.target)}" class="vd-wiki-link">${escapeHtml(t.label)}</a>`;
  },
};

marked.use({ extensions: [wikiLinkExtension] });

export function renderMarkdown(md: string): string {
  if (!md) return '';
  const html = marked.parse(md, { async: false }) as string;
  return DOMPurify.sanitize(html, {
    ADD_ATTR: ['target', 'rel'],
    // 允许 fileRef: 与 wiki: 协议，否则 DOMPurify 会把正文内嵌图片 / 双链 href 直接删掉
    // （其余部分与 DOMPurify 默认规则一致）
    ALLOWED_URI_REGEXP:
      /^(?:(?:https?|mailto|tel|callto|sms|cid|xmpp|fileRef|wiki):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export { plainText } from './utils';
