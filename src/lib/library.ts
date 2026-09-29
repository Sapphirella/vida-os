// 馆藏：正文切块 + 划线/高亮的锚点数学
//
// 锚点设计（借鉴参考项目 IB 的共读/批注做法，用本项目的 React 架构重写）：
//   正文切成「块」渲染成 <div data-block-idx="N">，标注只存 {块索引, 块内字符偏移}，
//   **不往正文 HTML 里插标记**。好处：
//   - 换主题、改字号、重新渲染之后锚点依然有效（偏移是相对块内纯文本算的）；
//   - 渲染 Markdown 时不会破坏文档结构（标注是在渲染完成后用 DOM Range 包 <mark>）。
//   代价：偏移依赖「同一份正文渲染出的 textContent 稳定」—— 只要 parseBook 是确定性的就成立。
import { marked } from 'marked';
import type { Token, TokensList } from 'marked';
import { sanitizeHtml } from './markdown';
import { plainText } from './utils';
import type { BookMark } from '@/types';

/** 单本建议上限：再长渲染与标注都会明显卡顿（导入时会提示） */
export const RECOMMENDED_MAX_CHARS = 10000;

/** 最多允许导入的字数（超过直接拒绝，避免把浏览器拖死） */
export const HARD_MAX_CHARS = 200000;

export type BlockKind = 'h1' | 'h2' | 'h3' | 'p' | 'quote' | 'list' | 'code' | 'hr';

export interface BookBlock {
  /** 块索引，标注锚点用它，必须与 DOM 上的 data-block-idx 一致 */
  index: number;
  /** 已净化的 HTML */
  html: string;
  /** 该块渲染后的纯文本（用于跨块选择的截断与校验） */
  text: string;
  kind: BlockKind;
}

/** 选区在某本书里对应的锚点（跨块选择会产出多条） */
export interface BookAnchor {
  blockIndex: number;
  start: number;
  end: number;
  text: string;
}

/** 正文纯净字数（剥掉 Markdown 标记，口径与编辑器字数统计一致） */
export function bookCharCount(content: string): number {
  return plainText(content ?? '').replace(/\s/g, '').length;
}

/** 从书名/文件名推标题：去扩展名、去首尾空白 */
export function titleFromFilename(filename: string): string {
  return filename.replace(/\.(txt|md|markdown|text)$/i, '').trim() || '未命名';
}

/** 导入时的格式判定：按扩展名，不认识的一律当 txt */
export function formatFromFilename(filename: string): 'txt' | 'md' {
  return /\.(md|markdown)$/i.test(filename) ? 'md' : 'txt';
}

// ============================================================
// 正文 → 块
// ============================================================

function htmlToText(html: string): string {
  if (typeof document === 'undefined') return '';
  const d = document.createElement('div');
  d.innerHTML = html;
  return d.textContent ?? '';
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function kindOfMarkdownToken(token: Token): BlockKind {
  switch (token.type) {
    case 'heading': {
      const depth = (token as { depth?: number }).depth ?? 1;
      return depth === 1 ? 'h1' : depth === 2 ? 'h2' : 'h3';
    }
    case 'blockquote':
      return 'quote';
    case 'list':
      return 'list';
    case 'code':
      return 'code';
    case 'hr':
      return 'hr';
    default:
      return 'p';
  }
}

/** txt：按空行切段；段内换行原样保留（渲染时用 white-space: pre-wrap，textContent 与原文一致） */
function blocksFromText(content: string): BookBlock[] {
  return content
    .split(/\n{2,}/)
    .map((s) => s.replace(/\s+$/, ''))
    .filter((s) => s.trim().length > 0)
    .map((s, i) => {
      const html = escapeHtml(s);
      return { index: i, html, text: s, kind: 'p' as const };
    });
}

/** md：用 marked 的词法分析逐 token 渲染成块 —— 一个 token = 一个块，块界与文档结构一致 */
function blocksFromMarkdown(content: string): BookBlock[] {
  let tokens: TokensList;
  try {
    tokens = marked.lexer(content);
  } catch {
    return blocksFromText(content);
  }
  const out: BookBlock[] = [];
  for (const token of tokens) {
    if (token.type === 'space') continue;
    let html = '';
    try {
      html = sanitizeHtml(marked.parser([token]));
    } catch {
      html = sanitizeHtml(escapeHtml((token as { raw?: string }).raw ?? ''));
    }
    if (!html.trim()) continue;
    out.push({
      index: out.length,
      html,
      text: htmlToText(html),
      kind: kindOfMarkdownToken(token),
    });
  }
  return out;
}

export function parseBook(content: string, format: 'txt' | 'md'): BookBlock[] {
  if (!content?.trim()) return [];
  return format === 'md' ? blocksFromMarkdown(content) : blocksFromText(content);
}

// ============================================================
// 选区 → 锚点
// ============================================================

function blockOf(node: Node, root: HTMLElement): HTMLElement | null {
  let cur: Node | null = node;
  while (cur && cur !== root) {
    if (cur instanceof HTMLElement && cur.dataset.blockIdx !== undefined) return cur;
    cur = cur.parentNode;
  }
  return null;
}

/** 块内字符偏移：用 Range 从块首量到 (node, offset) —— 天然处理嵌套的行内标签 */
function textOffsetWithin(blockEl: HTMLElement, node: Node, offset: number): number {
  const r = document.createRange();
  try {
    r.setStart(blockEl, 0);
    r.setEnd(node, offset);
  } catch {
    return 0;
  }
  return r.toString().length;
}

/** 两个点谁在前（用两个折叠 Range 比较文档顺序，避免 compareBoundaryPoints 的语义坑） */
function pointBefore(
  a: Node, ao: number, b: Node, bo: number,
): boolean {
  const ra = document.createRange();
  ra.setStart(a, ao);
  ra.collapse(true);
  const rb = document.createRange();
  rb.setStart(b, bo);
  rb.collapse(true);
  return ra.compareBoundaryPoints(Range.START_TO_START, rb) <= 0;
}

/**
 * 读取当前选区 → 锚点数组（跨块会拆成多条，每条锚在自己那一块）。
 * 读不到（无选区 / 选区不在本书内 / 全是空白）返回空数组。
 */
export function anchorsFromSelection(root: HTMLElement): BookAnchor[] {
  const sel = typeof window !== 'undefined' ? window.getSelection() : null;
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return [];
  const range = sel.getRangeAt(0);
  if (!root.contains(range.commonAncestorContainer)) return [];

  const blocks = Array.from(root.querySelectorAll<HTMLElement>('[data-block-idx]'));
  if (!blocks.length) return [];
  const startEl = blockOf(range.startContainer, root);
  const endEl = blockOf(range.endContainer, root);
  if (!startEl || !endEl) return [];
  const i0 = blocks.indexOf(startEl);
  const i1 = blocks.indexOf(endEl);
  if (i0 < 0 || i1 < 0) return [];

  // 归一化方向：用户可能反向拖选
  const forward = pointBefore(
    range.startContainer, range.startOffset, range.endContainer, range.endOffset,
  );
  const sN = forward ? range.startContainer : range.endContainer;
  const sO = forward ? range.startOffset : range.endOffset;
  const eN = forward ? range.endContainer : range.startContainer;
  const eO = forward ? range.endOffset : range.startOffset;

  const from = Math.min(i0, i1);
  const to = Math.max(i0, i1);
  const startBlock = blockOf(sN, root);
  const endBlock = blockOf(eN, root);

  const out: BookAnchor[] = [];
  for (let i = from; i <= to; i++) {
    const el = blocks[i];
    const full = el.textContent ?? '';
    const start = el === startBlock ? textOffsetWithin(el, sN, sO) : 0;
    const end = el === endBlock ? textOffsetWithin(el, eN, eO) : full.length;
    if (end <= start) continue;
    const text = full.slice(start, end);
    if (!text.trim()) continue;
    out.push({ blockIndex: i, start, end, text });
  }
  return out;
}

// ============================================================
// 锚点 → DOM（把 <mark> 包回去）
// ============================================================

/** 在块内定位「第 offset 个字符」所在的文本节点与节点内偏移 */
function locate(root: HTMLElement, offset: number): { node: Text; offset: number } | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let last: Text | null = null;
  let n: Node | null = walker.nextNode();
  while (n) {
    const t = n as Text;
    last = t;
    if (acc + t.data.length >= offset) return { node: t, offset: offset - acc };
    acc += t.data.length;
    n = walker.nextNode();
  }
  return last ? { node: last, offset: last.data.length } : null;
}

export function markClassOf(kind: BookMark['kind']): string {
  return kind === 'underline' ? 'vd-mk-underline' : 'vd-mk-highlight';
}

/** 还原成原始 HTML（去掉所有 <mark> 包裹）—— 重新套标注前必须先还原 */
export function resetBlockDom(blockEl: HTMLElement, html: string): void {
  if (blockEl.innerHTML !== html) blockEl.innerHTML = html;
}

/**
 * 把本书在该块上的标注包成 <mark>。
 * 从后往前包：包完后面的不会改变前面锚点的偏移（textContent 长度不变），
 * 所以只需要正序算好的 start/end 就够，不会互相污染。
 */
export function applyMarksToDom(blockEl: HTMLElement, marks: BookMark[]): void {
  if (!marks.length) return;
  const total = (blockEl.textContent ?? '').length;
  const ordered = [...marks].sort((a, b) => b.start - a.start);
  for (const m of ordered) {
    const start = Math.max(0, Math.min(m.start, total));
    const end = Math.max(start, Math.min(m.end, total));
    if (end <= start) continue;
    const s = locate(blockEl, start);
    const e = locate(blockEl, end);
    if (!s || !e) continue;
    const range = document.createRange();
    try {
      range.setStart(s.node, s.offset);
      range.setEnd(e.node, e.offset);
    } catch {
      continue;
    }
    const el = document.createElement('mark');
    el.className = markClassOf(m.kind);
    el.dataset.markId = m.id;
    try {
      range.surroundContents(el);
    } catch {
      // 选区跨了元素边界（比如包着链接）时 surroundContents 会抛，改成先摘出来再包
      el.appendChild(range.extractContents());
      range.insertNode(el);
    }
  }
}

// ============================================================
// 小工具
// ============================================================

/** 书签面板用：按「在书里的先后」排标注 */
export function sortMarks(marks: BookMark[]): BookMark[] {
  return [...marks].sort((a, b) => a.blockIndex - b.blockIndex || a.start - b.start);
}

export function marksByBlock(marks: BookMark[]): Map<number, BookMark[]> {
  const map = new Map<number, BookMark[]>();
  for (const m of marks) {
    const list = map.get(m.blockIndex);
    if (list) list.push(m);
    else map.set(m.blockIndex, [m]);
  }
  return map;
}

/** 标注在面板里的预览文本（压缩空白、限长） */
export function markPreview(text: string, max = 60): string {
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > max ? `${t.slice(0, max)}…` : t;
}

/** 阅读进度（0~1）：按「上次读到的块」算 */
export function progressOf(book: { lastBlockIndex?: number }, blockCount: number): number {
  if (!blockCount) return 0;
  const idx = Math.min(book.lastBlockIndex ?? 0, blockCount - 1);
  // 索引按「块」算：第 0 块 = 0%（刚打开），最后一块 = 100%。
  // 不能用 (idx+1)/count —— 那会让刚打开的书显示 25% 这种假进度。
  if (blockCount === 1) return idx === 0 ? 0 : 1;
  return Math.min(1, Math.max(0, idx / (blockCount - 1)));
}
