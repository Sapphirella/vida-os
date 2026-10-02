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
import { plainText, uid } from './utils';
import type { BookChapter, BookMark } from '@/types';

/**
 * 单本「建议上限」：超过它在导入时会弹一句确认（不是硬性拒绝）。
 *
 * 这个数字来自实测（v4.6.3，无头 Chrome，桌面 + 6× CPU 降速粗略模拟手机）：
 *   1 万字 / 170 块 → 打开约 130ms；4 万字 / 680 块 → 约 120ms；
 *   23 万字 / 4840 块 / 1.7 万 DOM 节点 → 桌面 1.0s，6× 降速 5.6s 且滚动掉帧。
 * 所以真正的分水岭在**十万字量级**，原先写 1 万字比实际能力保守了一个数量级，
 * 白白在导入时打扰用户（旧值 10000 已按数据放宽到 5 万，见第 12 节教训 27）。
 */
export const RECOMMENDED_MAX_CHARS = 50000;

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
  /**
   * 该块若是一行「章节标题」，这里放标题纯文本 —— buildChapters 靠它切目录。
   * 在切块阶段就定好（而不是事后回正文里搜），是因为 txt 的代码块 / md 的围栏代码
   * 里也可能有 `#` 或「第X章」，事后按行找会误判；块级判定天然不会命中。
   */
  heading?: string;
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

/**
 * txt 章节标题行识别
 *
 * 保守优先：只认明确的中文章回 / 阿拉伯序号 / 英文 Chapter。
 * 二级兜底（单行短段）风险更高 —— 诗、短句、对话都可能被误判 ——
 * 但误判的后果只是目录里多一条可以删掉的条目，**正文永远不动**，所以可以放宽。
 */
const CHAPTER_HEADING = new RegExp(
  [
    // 第 3 章 / 第三章 / 第十二回 / 第 5 节（含中文数字与阿拉伯数字）
    '^第\\s*[0-9０-９一二三四五六七八九十百千万零两]+\\s*[章回节卷部篇集话幕折]',
    // Chapter 12 / CHAPTER XII
    '^chapter\\s+[0-9ivxlc]+',
    // 12、标题 / 12. 标题（列表序数当章节）
    '^[0-9]{1,3}\\s*[、.．]\\s*\\S',
    // 序 / 前言 / 楔子 / 尾声 …
    '^(序章|序言|序幕|自序|楔子|引子|引言|前言|后记|尾声|终章|终局|后序|附录|番外)',
  ].join('|'),
  'i',
);

/** 句子结尾标点：出现即认为这段是正文而非标题 */
const SENTENCE_TAIL = /[。！？…；：，,.!?;:]$/;

/** 一段是否可当作章节标题：单行、够短、不像正文 */
function isShorthandHeading(para: string): boolean {
  if (/\n/.test(para.trim())) return false;
  const t = para.trim();
  return t.length > 0 && t.length <= 24 && !SENTENCE_TAIL.test(t);
}

function headingOfText(para: string): string | undefined {
  const t = para.trim();
  if (!t) return undefined;
  return CHAPTER_HEADING.test(t) || isShorthandHeading(t) ? t : undefined;
}

/** txt：按空行切段；段内换行原样保留（渲染时用 white-space: pre-wrap，textContent 与原文一致） */
function blocksFromText(content: string): BookBlock[] {
  return content
    .split(/\n{2,}/)
    .map((s) => s.replace(/\s+$/, ''))
    .filter((s) => s.trim().length > 0)
    .map((s, i) => {
      const html = escapeHtml(s);
      return { index: i, html, text: s, kind: 'p' as const, heading: headingOfText(s) };
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
    const rendered = htmlToText(html);
    // md 里 1~3 级标题算章节起点；4~6 级是标题下的细分，再切会把目录切得过碎
    const depth = (token as { depth?: number }).depth ?? 1;
    const isHeading = token.type === 'heading' && depth <= 3;
    // 标题文本优先取渲染后的 textContent；htmlToText 在无 DOM 环境（SSR / 单测）会返回空串，
    // 这时退回 token.text（marked 的行内原文），否则章节标题会整段消失。
    const inlineText = ((token as { text?: string }).text ?? '').trim();
    out.push({
      index: out.length,
      html,
      text: rendered || inlineText,
      kind: kindOfMarkdownToken(token),
      ...(isHeading ? { heading: rendered.trim() || inlineText || undefined } : {}),
    });
  }
  return out;
}

export function parseBook(content: string, format: 'txt' | 'md'): BookBlock[] {
  if (!content?.trim()) return [];
  const key = format;
  const hit = parseCache.find((c) => c.format === key && c.content === content);
  if (hit) {
    // 命中就把它挪到队首（LRU），下次同本书再解析直接返回
    parseCache.splice(parseCache.indexOf(hit), 1);
    parseCache.unshift(hit);
    return hit.blocks;
  }
  const blocks = format === 'md' ? blocksFromMarkdown(content) : blocksFromText(content);
  parseCache.unshift({ format: key, content, blocks });
  if (parseCache.length > PARSE_CACHE_SIZE) parseCache.length = PARSE_CACHE_SIZE;
  return blocks;
}

/**
 * `parseBook` 的小 LRU 缓存。
 *
 * 为什么值得缓存：md 书的解析里 **`sanitizeHtml`（DOMPurify）逐块调用占了约 89%**
 * —— 实测 23 万字 / 4840 块的书，解析总耗时 297ms（1×）/ 1886ms（6× CPU 降速），
 * 其中 DOMPurify 一项就是 264ms / 1638ms。而同一本书在一次浏览里会被解析好几遍：
 * 书架的 `BookCard` 为了算进度解析一次、进阅读器再解析一次、正文没变时的重渲染也算。
 * 缓存命中后这几处直接返回同一份块数组（6× 降速下省掉约 1.9 秒）。
 *
 * 两条安全性说明：
 *   - **比较用 `===` 比字符串本身，不用哈希** —— 哈希碰撞会返回「别的书的正文」，
 *     这是数据正确性不能接受的；字符串全等比较只会慢几十微秒。
 *   - 块数组是只读的：阅读器只读 `html`/`text`，标注是往 DOM 上包 `<mark>`（不改 block），
 *     所以多处分发同一个数组是安全的。
 */
const PARSE_CACHE_SIZE = 4;
const parseCache: { format: 'txt' | 'md'; content: string; blocks: BookBlock[] }[] = [];

// ============================================================
// 章节（目录）
// ============================================================

/** Agent 专属书的固定 id —— 换设备 / 导入备份后靠这个 id 认回来 */
export const AGENT_BOOK_ID = 'book-agent';

/** 纯字数（不含空白），章节统计用 */
function pureLen(s: string): number {
  return s.replace(/\s/g, '').length;
}

/**
 * 从正文解析目录。
 *
 * 规则：
 *   - 标题块（blocks[i].heading）当作章节起点；
 *   - 第一个标题之前若有正文，单独归成一条「开篇」，标题用书名 —— 否则书的前几段会无家可归；
 *   - 一个标题都没解析出来时，返回一条覆盖全书、标题为书名的兜底章节，
 *     这样目录页永远不会空白，用户也能直接从这里手动拆第一章。
 *
 * `existing` 传入上一版目录：按「标题 + 起点」匹配上就沿用原 id 与创建时间，
 * 避免用户每读一次书、每被 Agent 写一次，全书章节 id 就抖一轮。
 */
export function buildChapters(
  content: string,
  format: 'txt' | 'md',
  bookTitle: string,
  opts?: { existing?: BookChapter[]; now?: number },
): BookChapter[] {
  const blocks = parseBook(content, format);
  if (!blocks.length) return [];
  const now = opts?.now ?? Date.now();
  const prev = opts?.existing ?? [];

  const starts: number[] = [];
  blocks.forEach((b, i) => {
    if (b.heading) starts.push(i);
  });

  // 标题之前的正文：并进一条「开篇」
  const marks: { from: number; title: string }[] = [];
  if (starts.length === 0 || starts[0] > 0) {
    marks.push({ from: 0, title: bookTitle || '开篇' });
  }
  for (const i of starts) {
    marks.push({ from: i, title: blocks[i].heading || bookTitle || '未命名' });
  }

  const takeId = (title: string, from: number, createdAt: number) => {
    const hit = prev.find((c) => c.title === title && c.from === from)
      ?? prev.find((c) => c.title === title);
    return { id: hit?.id ?? uid('chp_'), createdAt: hit?.createdAt ?? createdAt };
  };

  return retargetChapters(
    marks.map((m) => {
      const { id, createdAt } = takeId(m.title, m.from, now);
      return { id, title: m.title, from: m.from, createdAt, updatedAt: now };
    }),
    blocks,
  );
}

/** 只描述「章节从哪一块开始」的最小信息；to 与 charCount 一律由正文推出来 */
export type ChapterSkeleton = Pick<BookChapter, 'id' | 'title' | 'from' | 'createdAt' | 'updatedAt'>;

/**
 * 按「起点集合」重算每条章节的 `to` 与字数。
 *
 * ⚠️ 目录是正文的**投影**：`from` 是块索引，`to` 只由**下一条章节的起点**决定，
 * 与「什么时候建的、按什么顺序建的」毫无关系。所以增删一条章节只改 `from` 的集合，
 * **绝不能加减块索引**——正文一块都没动。
 *
 * 这条纪律来自一个实测缺陷（v4.6.1 修）：`addBookChapter` 早先把已有章节的
 * from/to 整体 +1（误以为「插一条章节」= 「插一块正文」），而 `removeBookChapter`
 * 又没有减回去。结果「新建章节 → 再删掉」之后，后面每条章节永久晚一块：
 * 实测一本 3 章 9 块的书，章首 `from` 从 [0,3,7] 变成 [0,4,8] ——
 * 目录点击跳到下一段、正文里「正在读」也高亮错章，而且每操作一轮就再偏一块。
 * 另一个后果是区间重叠：新章节 to=7 与上一章 to=7 同时声称拥有第 7 块。
 */
export function retargetChapters(skeletons: ChapterSkeleton[], blocks: BookBlock[]): BookChapter[] {
  if (!blocks.length) return [];
  const last = blocks.length - 1;
  const seen = new Set<number>();
  const ordered = [...skeletons]
    .filter((c) => Number.isFinite(c.from) && c.from >= 0 && c.from <= last)
    .sort((a, b) => a.from - b.from)
    .filter((c) => {
      // 同一块上只留一条（先来的赢）：两条 from 相同的章节里，
      // chapterIndexOfBlock 只会认后面那条，前一条就成了看不见的死条目
      if (seen.has(c.from)) return false;
      seen.add(c.from);
      return true;
    });
  return ordered.map((c, i) => {
    const to = (ordered[i + 1]?.from ?? blocks.length) - 1;
    // 章节字数不含标题行本身，目录里显示的就是「这一章有多少字」
    let charCount = 0;
    for (let k = c.from + 1; k <= to; k++) charCount += pureLen(blocks[k].text ?? '');
    return { ...c, to, charCount };
  });
}

/** 某一块落在第几章（0 起；没有目录时返回 0） */
export function chapterIndexOfBlock(chapters: BookChapter[] | undefined, blockIndex: number): number {
  if (!chapters?.length) return 0;
  for (let i = chapters.length - 1; i >= 0; i--) {
    if (blockIndex >= chapters[i].from) return i;
  }
  return 0;
}

/** 目录页顶部汇总：本章序号文案 + 全书总字数 */
export function chapterCountText(chapters: BookChapter[] | undefined): string {
  const n = chapters?.length ?? 0;
  if (!n) return '暂无章节';
  return n === 1 ? '1 章' : `${n} 章`;
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

export function markClassOf(kind: BookMark['kind']): string {
  return kind === 'underline' ? 'vd-mk-underline' : 'vd-mk-highlight';
}

/** 还原成原始 HTML（去掉所有 <mark> 包裹）—— 重新套标注前必须先还原 */
export function resetBlockDom(blockEl: HTMLElement, html: string): void {
  if (blockEl.innerHTML !== html) blockEl.innerHTML = html;
}

/**
 * 把块内 [start,end) 这段**按文本节点切开、逐段包 <mark>**。
 *
 * 为什么不直接用 `range.surroundContents`（v4.4.1 修掉的真实缺陷）：
 *   - `marked` 配了 `breaks: true`，md 书里的软换行会渲染成 `<br>`；列表块还有 `<li>`。
 *     选区一旦跨过这类元素边界，`surroundContents` 就抛异常；
 *   - 兜底的 `range.extractContents()` 会把**块级结构整段克隆**出来再塞进 mark 里 ——
 *     用户在电脑端看到的「高亮后下一行文本缩进」就是这个（移动端长按往往只选到一行，所以没暴露）。
 * 逐文本节点包裹只做 splitText + 换父节点，永远不碰元素结构，因此：
 *   - 不会缩进、不会丢段落结构；
 *   - 跨 `<br>` / `<strong>` / `<li>` 都能正确上色；
 *   - 一条标注可能对应多个 <mark>（都带同一个 data-mark-id），查询时要 findAll 而不是 findOne。
 */
function wrapRange(blockEl: HTMLElement, start: number, end: number, m: BookMark): void {
  const targets: { node: Text; from: number; to: number }[] = [];
  const walker = document.createTreeWalker(blockEl, NodeFilter.SHOW_TEXT);
  let acc = 0;
  let n: Node | null = walker.nextNode();
  while (n) {
    const t = n as Text;
    const nodeStart = acc;
    const nodeEnd = acc + t.data.length;
    const from = Math.max(start, nodeStart);
    const to = Math.min(end, nodeEnd);
    if (to > from) targets.push({ node: t, from: from - nodeStart, to: to - nodeStart });
    acc = nodeEnd;
    if (acc >= end) break;
    n = walker.nextNode();
  }
  for (const t of targets) {
    try {
      let node = t.node;
      // splitText(n) 把节点切成 [0,n) 与 [n,…)，返回后半段
      if (t.to < node.data.length) node.splitText(t.to);
      const piece = t.from > 0 ? node.splitText(t.from) : node;
      const el = document.createElement('mark');
      el.className = markClassOf(m.kind);
      el.dataset.markId = m.id;
      piece.parentNode?.replaceChild(el, piece);
      el.appendChild(piece);
    } catch {
      /* 单个文本节点失败不影响其它节点 */
    }
  }
}

/**
 * 把本书在该块上的标注包成 <mark>。
 * 从后往前包：包裹只拆 Text 节点、不改 textContent 长度，所以先包的不会影响后包的偏移。
 */
export function applyMarksToDom(blockEl: HTMLElement, marks: BookMark[]): void {
  if (!marks.length) return;
  const total = (blockEl.textContent ?? '').length;
  const ordered = [...marks].sort((a, b) => b.start - a.start);
  for (const m of ordered) {
    const start = Math.max(0, Math.min(m.start, total));
    const end = Math.max(start, Math.min(m.end, total));
    if (end <= start) continue;
    wrapRange(blockEl, start, end, m);
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

/**
 * 唯一匹配重锚定时，原文短于这个长度就不去全书检索。
 * 定成 2 而不是更大：**安全性由「全书唯一」这条保证，不靠长度**（检索到的位置必须逐字相同），
 * 长度只影响代价。中文里三四个字的划线很常见，门槛定高了会把它们白白丢掉（实测过 3 字的
 * 「第三段」因为门槛是 4 而被丢弃）。
 */
const REMAP_MIN_CHARS = 2;

/**
 * 正文被改写后，把书里的标注重新锚定到新正文上。
 *
 * 背景：标注锚点是「块索引 + 块内字符偏移」（见本文件开头）。Agent 的查找替换
 * （`[[替:馆藏|原文→新文]]`）会改写正文，于是偏移可能失效。早先的做法是
 * **一发现书正文被改就清空全书标注** —— 确实安全，但代价过大：在一本书里改一个
 * 错别字，会把用户所有划线一起抹掉；而《Agent》这本书的定位恰恰是「Agent 经常改、
 * 用户会在上面划线」，两个一等功能互相打架。
 *
 * 判定规则（**逐条**判定，宁可丢一条，绝不把标注留在猜出来的位置上）：
 *   1. 快路径：新正文里同一块、同一偏移处仍然正好是这段原文 → 原样保留
 *      （改动发生在这条标注**之后**时命中，最常见）；
 *   2. 唯一匹配：这段原文在全书里**恰好只出现一次** → 重新锚定到那一处
 *      （改动发生在这条标注**之前**、导致块内偏移变化或后面所有块位移时命中）；
 *   3. 找不到、或出现多次（无法判断是哪一处）→ 丢弃，交给调用方如实告诉用户。
 *
 * 注意「唯一匹配」不引入指错位置的风险：只有原文在新正文里逐字出现、且全书仅此一处时
 * 才会重新锚定 —— 最坏情况就是退回第 3 条（丢弃），不会比原行为更差。
 */
export function remapMarks(
  marks: BookMark[],
  blocks: BookBlock[],
): { marks: BookMark[]; dropped: BookMark[] } {
  if (!marks.length || !blocks.length) return { marks: [], dropped: [...marks] };
  const texts = blocks.map((b) => b.text ?? '');
  const kept: BookMark[] = [];
  const dropped: BookMark[] = [];

  for (const m of marks) {
    // 1) 快路径
    const same = texts[m.blockIndex];
    if (same !== undefined && m.end <= same.length && same.slice(m.start, m.end) === m.text) {
      kept.push(m);
      continue;
    }
    // 2) 全文找唯一一处相同原文
    const needle = m.text ?? '';
    let found: { blockIndex: number; start: number } | null = null;
    let ambiguous = false;
    if (needle.length >= REMAP_MIN_CHARS) {
      for (let i = 0; i < texts.length && !ambiguous; i++) {
        let at = texts[i].indexOf(needle);
        while (at >= 0) {
          if (found) {
            ambiguous = true;
            break;
          }
          found = { blockIndex: i, start: at };
          at = texts[i].indexOf(needle, at + 1);
        }
      }
    }
    if (found && !ambiguous) {
      kept.push({
        ...m,
        blockIndex: found.blockIndex,
        start: found.start,
        end: found.start + needle.length,
      });
    } else {
      dropped.push(m);
    }
  }
  return { marks: kept, dropped };
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
