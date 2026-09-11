// 导入导出工具
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AppState } from '@/types';
import { listFiles, getFile } from './db';
import { blobToBase64, plainText, formatDate } from './utils';
import { renderMarkdown } from './markdown';

// ============================================================
// JSON 导出（含图片 base64 内嵌）
// ============================================================

export interface ExportBundle {
  meta: {
    appName: string;
    version: number;
    exportedAt: number;
  };
  state: AppState;
  files: Array<{ id: string; mime: string; name: string; dataUrl: string; size: number }>;
}

export async function exportJSON(state: AppState, scope: ExportScopes = ['all']): Promise<string> {
  const scoped = scopedState(state, scope);
  const files = await listFiles();
  const usedFileIds = collectFileIds(scoped);
  const fileData = await Promise.all(
    files
      .filter((f) => usedFileIds.has(f.id))
      .map(async (f) => ({
        id: f.id,
        mime: f.mime,
        name: f.name,
        size: f.size,
        dataUrl: await blobToBase64(f.blob),
      })),
  );

  const bundle: ExportBundle = {
    meta: {
      appName: 'VidaOS',
      version: 3,
      exportedAt: Date.now(),
    },
    state: scoped,
    files: fileData,
  };

  return JSON.stringify(bundle, null, 2);
}

// ============================================================
// 导出范围（支持多选）
// ============================================================

export type ExportScopeKey =
  | 'articles'
  | 'moments'
  | 'letters'
  | 'notes'
  | 'favorites'
  | 'profile';

/** 'all' 是「全选」的简写；实际参与筛选的是 ExportScopeKey */
export type ExportScope = ExportScopeKey | 'all';
export type ExportScopes = ExportScope[];

export const ALL_SCOPE_KEYS: ExportScopeKey[] = [
  'articles',
  'moments',
  'letters',
  'notes',
  'favorites',
  'profile',
];

/** 把「单选/多选/'all'」统一成实际生效的范围集合 */
export function normalizeScopes(scope: ExportScopes | ExportScope): Set<ExportScopeKey> {
  const arr = Array.isArray(scope) ? scope : [scope];
  if (arr.includes('all')) return new Set(ALL_SCOPE_KEYS);
  return new Set(arr.filter((s): s is ExportScopeKey => s !== 'all'));
}

/** 用于文件名：全选时返回 all，否则按固定顺序拼接 */
export function scopeSlug(scope: ExportScopes | ExportScope): string {
  const set = normalizeScopes(scope);
  if (set.size === ALL_SCOPE_KEYS.length) return 'all';
  if (set.size === 0) return 'none';
  return ALL_SCOPE_KEYS.filter((k) => set.has(k)).join('+');
}

export function scopedState(state: AppState, scope: ExportScopes | ExportScope): AppState {
  const has = normalizeScopes(scope);
  if (has.size === ALL_SCOPE_KEYS.length) return state;

  // 收藏夹导出：除收藏记录本身，也带上被收藏的内容，否则导出的收藏夹是空壳
  let favArticles: typeof state.articles = [];
  let favMoments: typeof state.moments = [];
  let favLetters: typeof state.letters = [];
  if (has.has('favorites')) {
    const refIds = (t: string) =>
      new Set(state.favorites.filter((f) => f.refType === t).map((f) => f.refId));
    favArticles = state.articles.filter((a) => refIds('article').has(a.id));
    favMoments = state.moments.filter((m) => refIds('moment').has(m.id));
    favLetters = state.letters.filter((l) => refIds('letter').has(l.id));
  }

  const articles = has.has('articles') ? state.articles : favArticles;
  const moments = has.has('moments') ? state.moments : favMoments;
  const letters = has.has('letters') ? state.letters : favLetters;

  return {
    ...state,
    profile: has.has('profile') ? state.profile : { name: '', signature: '' },
    // 只导出文章时才带合集；收藏夹导出的文章也尽量带上其所属合集
    collections: has.has('articles')
      ? state.collections
      : state.collections.filter((c) => articles.some((a) => a.collectionId === c.id)),
    articles,
    moments,
    letters,
    favorites: has.has('favorites') ? state.favorites : [],
    notes: has.has('notes') ? state.notes : { inspiration: [], schedule: [], todo: [] },
    categories: state.categories,
    tracks: [],
    settings: state.settings,
  };
}

export function collectFileIds(state: AppState): Set<string> {
  const ids = new Set<string>();
  // 正文里的 ![x](fileRef:<id>) 也算引用，否则内嵌图片不会被导出/备份
  const scanText = (text: string) => {
    for (const m of text.matchAll(/fileRef:([A-Za-z0-9_-]+)/g)) ids.add(m[1]);
  };
  state.articles.forEach((a) => {
    a.imageIds.forEach((id) => ids.add(id));
    if (a.coverId) ids.add(a.coverId);
    scanText(a.content);
  });
  state.moments.forEach((m) => {
    m.imageIds.forEach((id) => ids.add(id));
    scanText(m.content);
  });
  state.letters.forEach((l) => {
    l.imageIds.forEach((id) => ids.add(id));
    scanText(l.content);
  });
  if (state.profile.avatarId) ids.add(state.profile.avatarId);
  if (state.profile.backgroundFileId) ids.add(state.profile.backgroundFileId);
  return ids;
}

// ============================================================
// Markdown 导出
// ============================================================

export function exportMarkdown(state: AppState, scope: ExportScopes = ['articles']): string {
  const s = scopedState(state, scope);
  const has = normalizeScopes(scope);
  const lines: string[] = [];
  lines.push(`# VidaOS 导出`);
  lines.push(`> 导出时间：${formatDate(new Date(), 'YYYY-MM-DD HH:mm')}`);
  lines.push('');

  // 选了「个人资料」范围时输出昵称/签名
  if (has.has('profile')) {
    lines.push(`## 个人资料`);
    lines.push(`- 昵称：${state.profile.name || '(未填写)'}`);
    if (state.profile.signature) lines.push(`- 签名：${state.profile.signature}`);
    lines.push('');
  }

  if (has.has('articles')) {
    if (s.collections.length > 0) {
      lines.push(`## 合集`);
      s.collections.forEach((c) => lines.push(`- **${c.name}**${c.desc ? `：${c.desc}` : ''}`));
      lines.push('');
    }
    if (s.articles.length > 0) {
      lines.push(`## 文章`);
      s.articles.forEach((a) => {
        lines.push(`### ${a.title}`);
        lines.push(`*${formatDate(a.createdAt, 'YYYY-MM-DD')}*`);
        if (a.tags.length) lines.push(a.tags.map((t) => `#${t}`).join(' '));
        lines.push('');
        lines.push(a.content);
        lines.push('');
        lines.push('---');
        lines.push('');
      });
    }
  }

  if (has.has('moments')) {
    if (s.moments.length > 0) {
      lines.push(`## 动态`);
      s.moments.forEach((m) => {
        lines.push(`> ${formatDate(m.createdAt, 'YYYY-MM-DD HH:mm')}`);
        lines.push('');
        lines.push(m.content);
        lines.push('');
      });
    }
  }

  if (has.has('letters')) {
    if (s.letters.length > 0) {
      lines.push(`## 信件`);
      s.letters.forEach((l) => {
        lines.push(`### ${l.title || '(无题)'}`);
        lines.push(`*${formatDate(l.createdAt, 'YYYY-MM-DD')}*`);
        lines.push('');
        lines.push(l.content);
        lines.push('');
        lines.push('---');
        lines.push('');
      });
    }
  }

  if (has.has('favorites') && s.favorites.length > 0) {
    lines.push(`## 收藏`);
    s.favorites.forEach((f) => {
      if (f.refType === 'article') {
        const a = state.articles.find((x) => x.id === f.refId);
        lines.push(`- [文章] ${a ? a.title : '(已删除)'}`);
      } else if (f.refType === 'moment') {
        const m = state.moments.find((x) => x.id === f.refId);
        lines.push(`- [动态] ${m ? plainText(m.content).slice(0, 40) : '(已删除)'}`);
      } else {
        const l = state.letters.find((x) => x.id === f.refId);
        lines.push(`- [信件] ${l ? l.title || '(无题)' : '(已删除)'}`);
      }
    });
    lines.push('');
  }

  if (has.has('notes')) {
    if (s.notes.inspiration.length > 0) {
      lines.push(`## 灵感`);
      s.notes.inspiration.forEach((n) => {
        lines.push(`- [${n.category}] ${n.content}`);
      });
      lines.push('');
    }
    if (s.notes.schedule.length > 0) {
      lines.push(`## 日程`);
      s.notes.schedule.forEach((n) => {
        lines.push(
          `- [${n.done ? 'x' : ' '}] ${n.date}${n.time ? ' ' + n.time : ''} **${n.title}**${n.note ? ' - ' + n.note : ''}`,
        );
      });
      lines.push('');
    }
    if (s.notes.todo.length > 0) {
      lines.push(`## 待办`);
      s.notes.todo.forEach((n) => {
        lines.push(`- [${n.done ? 'x' : ' '}] [${n.category}] ${n.content}`);
      });
      lines.push('');
    }
  }

  return lines.join('\n');
}

// ============================================================
// TXT 导出（纯文本）
// ============================================================

export function exportTXT(state: AppState, scope: ExportScopes = ['all']): string {
  const s = scopedState(state, scope);
  const has = normalizeScopes(scope);
  const lines: string[] = [];
  lines.push(`VidaOS 导出`);
  lines.push(`导出时间：${formatDate(new Date(), 'YYYY-MM-DD HH:mm')}`);
  lines.push('');

  if (has.has('profile')) {
    lines.push(`【个人资料】`);
    lines.push(`昵称：${state.profile.name || '(未填写)'}`);
    if (state.profile.signature) lines.push(`签名：${state.profile.signature}`);
    lines.push('');
  }

  s.articles.forEach((a) => {
    lines.push(`【文章】${a.title}`);
    lines.push(formatDate(a.createdAt, 'YYYY-MM-DD'));
    lines.push('');
    lines.push(plainText(a.content));
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  s.moments.forEach((m) => {
    lines.push(`【动态】${formatDate(m.createdAt, 'YYYY-MM-DD HH:mm')}`);
    lines.push(plainText(m.content));
    lines.push('');
  });

  s.letters.forEach((l) => {
    lines.push(`【信件】${l.title || '(无题)'}`);
    lines.push(formatDate(l.createdAt, 'YYYY-MM-DD'));
    lines.push('');
    lines.push(plainText(l.content));
    lines.push('');
    lines.push('---');
    lines.push('');
  });

  return lines.join('\n');
}

// ============================================================
// PDF 导出
//
// 采用「逐页渲染」而不是「渲成一张长图再按像素切」：
// 先把内容按页装进固定尺寸的页面容器（每页自己量高度），再对每一页单独
// html2canvas —— 量到的就是渲染出来的，从根上避免把一行字切到两页里。
// ============================================================

const A4_W = 595.28;
const A4_H = 841.89;
/** 页面容器的渲染尺寸（CSS px）—— 沿用上一版观感：720 宽 + 64/80 内边距 */
const PDF_PAGE_W = 720;
const PDF_PAGE_H = 1018; // 720 × (297/210)，即整页 A4 等比
const PDF_PAD = '64px 80px';
/** 内容区可用高度（去掉上下内边距） */
const PDF_INNER_H = PDF_PAGE_H - 128;

const PDF_BG = '#F2EBE0';
const PDF_FONT =
  '"EB Garamond", "Lora", Georgia, serif';

/** 页面容器的基础样式（量测与渲染都用它，保证一致） */
const pageCss = (full?: boolean) =>
  `box-sizing:border-box;width:${PDF_PAGE_W}px;` +
  (full ? `height:${PDF_PAGE_H}px;padding:${PDF_PAD};overflow:hidden;` : '') +
  `background:${PDF_BG};color:#1B1A1F;font-family:${PDF_FONT};line-height:1.85;`;

/** 把一批 fileId 从 IndexedDB 取出并转成 data URL（PDF 里必须内嵌图片） */
async function buildImageDataUrls(ids: Set<string>): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await Promise.all(
    Array.from(ids).map(async (id) => {
      try {
        const f = await getFile(id);
        if (f) map.set(id, await blobToBase64(f.blob));
      } catch {
        /* 单个文件缺失不影响整体导出 */
      }
    }),
  );
  return map;
}

/** 等待容器内所有图片解码完成，否则量高度/渲染都会漏 */
async function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll('img'));
  await Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalWidth > 0) return resolve();
          img.addEventListener('load', () => resolve(), { once: true });
          img.addEventListener('error', () => resolve(), { once: true });
          setTimeout(resolve, 3000);
        }),
    ),
  );
}

/**
 * 把 nodes 依次放进 target，直到放不下为止。
 * 返回「没能放进去的节点」（含被拆开的后半截）。
 *
 * 注意：这里必须按「节点」拆分，不能把块压成纯文本 —— 早先用 textContent
 * 切分会把块内的 <img> 和段落结构全部抹掉，导致 PDF 丢图而且排版被压扁。
 */
function fillNodes(
  nodes: Node[],
  target: HTMLElement,
  page: HTMLElement,
  maxH: number,
): Node[] {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i];
    const added = node.cloneNode(true);
    target.appendChild(added);
    if (page.scrollHeight <= maxH) continue;

    // 放不下：撤掉，尝试只放一部分
    target.removeChild(added);
    const rest = splitInto(node, target, page, maxH);
    const remaining = nodes.slice(i + 1).map((n) => n.cloneNode(true));
    if (rest) remaining.unshift(rest);
    return remaining;
  }
  return [];
}

/**
 * 尽量把 node 的一部分放进 target，返回剩下的部分（null ＝ 全部放得下）。
 * - 文本节点：二分找最长可放下的前缀，并尽量在空白/句读处断开
 * - 元素节点：保留标签与其样式，递归处理子节点（图片、段落结构都不会丢）
 * - 空元素（如 <img>）：无法拆分，整体留到下一页
 */
function splitInto(
  node: Node,
  target: HTMLElement,
  page: HTMLElement,
  maxH: number,
): Node | null {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.nodeValue ?? '';
    if (!text) return null;
    const holder = document.createTextNode('');
    target.appendChild(holder);
    let lo = 1;
    let hi = text.length;
    let best = 0;
    while (lo <= hi) {
      const mid = (lo + hi) >> 1;
      holder.nodeValue = text.slice(0, mid);
      if (page.scrollHeight <= maxH) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    let cut = best;
    const soft = Math.max(
      text.lastIndexOf(' ', cut),
      text.lastIndexOf('\n', cut),
      text.lastIndexOf('。', cut),
      text.lastIndexOf('，', cut),
      text.lastIndexOf('、', cut),
    );
    if (soft > cut * 0.6) cut = soft + 1;
    holder.nodeValue = text.slice(0, cut);
    const rest = text.slice(cut);
    if (!rest) return null;
    return document.createTextNode(rest);
  }

  if (node.nodeType === Node.ELEMENT_NODE) {
    const el = node as HTMLElement;

    // 无子节点（<img>/<hr> 等）或整体不可拆 → 整块留到下一页
    if (el.childNodes.length === 0) return el.cloneNode(true);

    const holder = el.cloneNode(false) as HTMLElement;
    target.appendChild(holder);
    if (page.scrollHeight > maxH) {
      // 连空壳都放不下（超大边距等）→ 整块留到下一页
      target.removeChild(holder);
      return el.cloneNode(true);
    }
    const restChildren = fillNodes(Array.from(el.childNodes), holder, page, maxH);
    if (restChildren.length === 0) return null;
    const restEl = el.cloneNode(false) as HTMLElement;
    restChildren.forEach((c) => restEl.appendChild(c));
    return restEl;
  }

  // 注释等其他节点：整体留到下一页
  return node.cloneNode(true);
}

export async function exportPDF(state: AppState, scope: ExportScopes = ['articles']): Promise<void> {
  const s = scopedState(state, scope);
  const has = normalizeScopes(scope);

  // 先把要内嵌的图片转成 data URL（Blob 存在 IndexedDB，PDF 必须自带图）
  const dataUrls = await buildImageDataUrls(collectFileIds(s));
  const imgTag = (id: string) =>
    `<img src="${dataUrls.get(id)}" alt="" style="display:block;max-width:100%;margin:14px auto;border-radius:8px;" />`;
  const imagesOf = (ids: Array<string | undefined>) =>
    Array.from(new Set(ids.filter((x): x is string => !!x && dataUrls.has(x))))
      .map((id) => imgTag(id))
      .join('');
  /** 正文里的 fileRef:<id> 换成 data URL */
  const resolveInline = (html: string) =>
    html.replace(
      /<img[^>]*src="fileRef:([A-Za-z0-9_-]+)"[^>]*>/g,
      (_m, id: string) =>
        dataUrls.has(id)
          ? imgTag(id)
          : '<p style="color:#947D75;font-size:12px;text-align:center;">（图片已丢失）</p>',
    );

  let html = `
    <h1 style="font-family:${PDF_FONT};font-size:36px;text-align:center;margin:0 0 8px;color:#1B1A1F;letter-spacing:-0.01em;">
      VidaOS
    </h1>
    <p style="text-align:center;color:#947D75;font-size:12px;letter-spacing:0.1em;margin:0 0 32px;text-transform:uppercase;">
      ${formatDate(new Date(), 'YYYY · MM · DD')}
    </p>
  `;

  // 个人资料（选了「个人资料」范围时输出）
  if (has.has('profile')) {
    const avatar = s.profile.avatarId ? dataUrls.get(s.profile.avatarId) : undefined;
    html += `
      <section style="margin:0 0 32px;padding:20px 0;border-top:1px solid #947D75;border-bottom:1px solid #947D75;text-align:center;">
        ${avatar ? `<img src="${avatar}" alt="" style="width:88px;height:88px;border-radius:50%;object-fit:cover;margin:0 auto 12px;display:block;" />` : ''}
        <p style="font-size:22px;margin:0 0 6px;color:#1B1A1F;">${escapeHTML(s.profile.name || '(未填写昵称)')}</p>
        ${s.profile.signature ? `<p style="font-size:13px;margin:0;color:#7A675F;font-style:italic;">—— ${escapeHTML(s.profile.signature)}</p>` : ''}
      </section>
    `;
  }

  const h2 = (t: string) =>
    `<h2 style="font-size:16px;letter-spacing:0.2em;text-transform:uppercase;color:#6A080E;margin:32px 0 16px;border-bottom:1px solid #947D75;padding-bottom:8px;">${t}</h2>`;

  if (s.articles.length > 0 && has.has('articles')) {
    html += h2('文章');
    s.articles.forEach((a) => {
      html += `
        <article style="margin:32px 0;">
          <h3 style="font-size:24px;color:#1B1A1F;margin:0 0 8px;font-weight:500;">${escapeHTML(a.title)}</h3>
          <p style="color:#947D75;font-size:11px;margin:0 0 16px;letter-spacing:0.05em;">${formatDate(a.createdAt, 'YYYY · MM · DD')}${a.tags.length ? ' · ' + a.tags.map((t) => '#' + t).join(' ') : ''}</p>
          <div style="font-size:14px;">${resolveInline(renderMarkdown(a.content))}</div>
          ${imagesOf([a.coverId, ...a.imageIds])}
        </article>
      `;
    });
  }

  if (s.moments.length > 0 && has.has('moments')) {
    html += h2('动态');
    s.moments.forEach((m) => {
      html += `
        <div style="margin:24px 0;padding-left:16px;border-left:2px solid #6A080E;">
          <p style="color:#947D75;font-size:11px;margin:0 0 6px;letter-spacing:0.05em;">${formatDate(m.createdAt, 'YYYY · MM · DD HH:mm')}</p>
          <div style="font-size:14px;">${resolveInline(renderMarkdown(m.content))}</div>
          ${imagesOf(m.imageIds)}
          ${(m.comments ?? []).map((c) => `<p style="margin:6px 0 0 12px;font-size:12px;color:#7A675F;">— ${escapeHTML(c.content)}</p>`).join('')}
        </div>
      `;
    });
  }

  if (s.letters.length > 0 && has.has('letters')) {
    html += h2('信件');
    s.letters.forEach((l) => {
      html += `
        <article style="margin:32px 0;">
          <h3 style="font-size:22px;color:#1B1A1F;margin:0 0 8px;font-weight:500;">${escapeHTML(l.title || '(无题)')}</h3>
          <p style="color:#947D75;font-size:11px;margin:0 0 16px;">${formatDate(l.createdAt, 'YYYY · MM · DD')}</p>
          <div style="font-size:14px;">${resolveInline(renderMarkdown(l.content))}</div>
          ${imagesOf(l.imageIds)}
        </article>
      `;
    });
  }

  if (s.notes.inspiration.length > 0 && has.has('notes')) {
    html += h2('灵感') + '<ul style="list-style:none;padding:0;">';
    s.notes.inspiration.forEach((n) => {
      html += `<li style="margin:8px 0;padding-left:16px;border-left:1px solid #947D75;"><span style="color:#947D75;font-size:11px;letter-spacing:0.05em;">[${escapeHTML(n.category)}]</span> ${escapeHTML(n.content)}</li>`;
    });
    html += '</ul>';
  }

  if (s.notes.schedule.length > 0 && has.has('notes')) {
    html += h2('日程');
    s.notes.schedule.forEach((n) => {
      html += `<p style="margin:6px 0;font-size:13px;"><span style="color:#947D75;font-size:11px;">[${n.date}${n.time ? ' ' + n.time : ''}]</span> <strong>${escapeHTML(n.title)}</strong>${n.done ? ' ✓' : ''}</p>`;
    });
  }

  if (s.notes.todo.length > 0 && has.has('notes')) {
    html += h2('待办');
    s.notes.todo.forEach((n) => {
      html += `<p style="margin:6px 0;font-size:13px;">${n.done ? '☑' : '☐'} ${escapeHTML(n.content)}</p>`;
    });
  }

  if (has.has('favorites') && s.favorites.length > 0) {
    html += h2('收藏');
    s.favorites.forEach((f) => {
      const label =
        f.refType === 'article'
          ? state.articles.find((x) => x.id === f.refId)?.title ?? '(已删除)'
          : f.refType === 'moment'
            ? plainText(state.moments.find((x) => x.id === f.refId)?.content ?? '').slice(0, 30)
            : state.letters.find((x) => x.id === f.refId)?.title ?? '(无题)';
      html += `<p style="margin:6px 0;font-size:13px;">★ ${escapeHTML(label)}</p>`;
    });
  }

  // ── 分页：把内容装进固定尺寸的页面容器（在容器里量，量到的就是渲染的）──
  const stage = document.createElement('div');
  stage.style.cssText = `position:fixed;top:-20000px;left:-20000px;${pageCss()}`;
  stage.innerHTML = html;
  document.body.appendChild(stage);
  stage.querySelectorAll('img').forEach((img) => {
    img.style.maxHeight = `${PDF_INNER_H - 24}px`;
    img.style.width = 'auto';
    img.style.maxWidth = '100%';
    img.style.objectFit = 'contain';
  });
  await waitForImages(stage);

  const blocks = Array.from(stage.children) as HTMLElement[];
  const pages: HTMLElement[] = [];
  let cur = document.createElement('div');
  cur.style.cssText = `position:fixed;top:-20000px;left:-20000px;${pageCss(true)}`;
  pages.push(cur);
  document.body.appendChild(cur);

  const realPage = () => {
    const el = document.createElement('div');
    el.style.cssText = `position:fixed;top:-20000px;left:-20000px;${pageCss(true)}`;
    document.body.appendChild(el);
    return el;
  };

  const queue: Node[] = blocks.map((b) => b.cloneNode(true));
  let guard = 0;
  while (queue.length > 0 && guard++ < 20000) {
    const block = queue.shift()!;
    cur.appendChild(block);
    if (cur.scrollHeight <= PDF_PAGE_H) continue;

    // 放不下
    cur.removeChild(block);
    const hadContent = cur.childElementCount > 0;
    if (hadContent) {
      // 当前页已有内容 → 换页重试
      cur = realPage();
      pages.push(cur);
      queue.unshift(block);
      continue;
    }

    // 空页也放不下 → 按节点拆分
    const rest = splitInto(block, cur, cur, PDF_PAGE_H);
    if (rest) {
      if (cur.childElementCount === 0) {
        // 拆不动（例如单张超高图片）：直接放上去，接受溢出，保证能前进
        cur.appendChild(block);
        if (queue.length > 0) {
          cur = realPage();
          pages.push(cur);
        }
        continue;
      }
      queue.unshift(rest);
    }
    if (queue.length > 0) {
      cur = realPage();
      pages.push(cur);
    }
  }

  try {
    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    for (let i = 0; i < pages.length; i += 1) {
      const canvas = await html2canvas(pages[i], {
        backgroundColor: PDF_BG,
        scale: 2,
        useCORS: true,
        logging: false,
        width: PDF_PAGE_W,
        height: PDF_PAGE_H,
        windowWidth: PDF_PAGE_W,
        windowHeight: PDF_PAGE_H,
      });
      if (i > 0) pdf.addPage();
      pdf.setFillColor(242, 235, 224);
      pdf.rect(0, 0, A4_W, A4_H, 'F');
      // 页容器已含 64/80 内边距，直接铺满整页，观感与上一版一致
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, A4_W, A4_H);
    }
    pdf.save(`vidaos-${scopeSlug(scope)}-${formatDate(new Date(), 'YYYYMMDD-HHmm')}.pdf`);
  } finally {
    stage.remove();
    pages.forEach((el) => el.remove());
  }
}

function escapeHTML(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// 导入
// ============================================================

export async function parseJSONImport(text: string): Promise<{ state: AppState; files: ExportBundle['files'] }> {
  const bundle: ExportBundle = JSON.parse(text);
  if (!bundle.state || !bundle.meta) {
    throw new Error('不是有效的 VidaOS 备份文件');
  }
  // 恢复 fileId 引用：因为 state 已包含 fileId，直接用
  return { state: bundle.state, files: bundle.files || [] };
}

export async function parseMarkdownImport(text: string): Promise<Partial<AppState>> {
  // 简单解析：每段以 # 开头的为标题，下面到下一个 # 为内容
  const articles: any[] = [];
  const lines = text.split('\n');
  let current: { title?: string; content: string[] } | null = null;

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (current && current.title) {
        articles.push({
          id: `imported_${Date.now()}_${articles.length}`,
          title: current.title,
          content: current.content.join('\n'),
          tags: [],
          imageIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      }
      current = { title: line.slice(2).trim(), content: [] };
    } else if (current) {
      current.content.push(line);
    }
  }
  if (current && current.title) {
    articles.push({
      id: `imported_${Date.now()}_${articles.length}`,
      title: current.title,
      content: current.content.join('\n'),
      tags: [],
      imageIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return { articles };
}

export async function parseTXTImport(text: string): Promise<Partial<AppState>> {
  // 解析为单篇文章
  return {
    articles: [
      {
        id: `imported_${Date.now()}`,
        title: '导入的文本',
        content: text,
        tags: [],
        imageIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      },
    ],
  };
}
