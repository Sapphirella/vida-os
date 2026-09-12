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
// 排版设计（暗夜书房 · 纸质版，2026-09-12 重做）：
//   - 内容在 720px 宽、左右 80px 内边距的容器里连续排版，整篇一次渲染成
//     一张长图，再按页切片贴到各页 —— 内容连续流动，无「图片独占一页、
//     下半页空白」问题；
//   - **页边距由贴图位置统一控制**：每页顶部留 MARGIN_TOP、底部留
//     MARGIN_BOTTOM，中间页不再顶格、末页内容不足时**垂直居中**，
//     解决「文字整体偏上、不在正中间」；
//   - **分页切点只落在行间隙中点**：先把碎片矩形按视觉行聚合，再取相邻
//     两行间隙的中点（间隙 >= 6px 才允许切），并对 html2canvas 的 1-2px
//     排版偏差留出余量，解决「一行字被劈到两页」；
//   - 底部绘制居中页码（· n ·），配色沿用暗夜书房羊皮纸风：米底 + 酒红
//     标题 + 古铜辅助 + EB Garamond 衬线。
//
// 保留用户认可的基础：米色羊皮纸底、衬线正文、酒红小标题、图片内嵌。
// ============================================================

const A4_W = 595.28;
const A4_H = 841.89;
/** 渲染容器宽度（内容横向布局的依据） */
const PDF_RENDER_W = 720;
/** 容器 px → PDF pt：720px 铺满整页宽度 */
const PT_PER_PX = A4_W / PDF_RENDER_W;
/** 页面上边距（pt） */
const MARGIN_TOP = 64;
/** 页面下边距（pt），留出页码位置 */
const MARGIN_BOTTOM = 48;
/** 每页内容可用高度（CSS px）—— 分页与图片高度的上限依据 */
const PAGE_CONTENT_PX = (A4_H - MARGIN_TOP - MARGIN_BOTTOM) / PT_PER_PX;
const PDF_BG = '#F2EBE0';
const PDF_FONT = '"EB Garamond", "Lora", Georgia, serif';

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

/** 等待容器内所有图片解码完成，否则 html2canvas 会漏画 */
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
 * 计算「不会切断文字行」的分页位置 —— **在渲染完成后的画布像素上寻找切点**。
 *
 * 为什么不用浏览器布局坐标（getClientRects）预测？
 *   html2canvas 在把整张超长图（2x 时可达两万像素高）渲染进画布时，其实际
 *   排版与浏览器实测坐标存在系统性偏差，偏差沿页面累积。若按浏览器坐标切片，
 *   切点即使「数学上」落在行间隙，落到渲染图上时已经偏到一行文字的中间。
 *
 * 做法（2026-09-12 重做，像素级）：
 *   1. 对渲染好的画布按行扫描采样列，标记「有内容行 / 纯背景行」；
 *   2. 候选切点 = 每段连续背景行（行间空白带）的**中点**——空白的中心天然
 *      离上下两行最远，任何精度下都不可能切到文字；
 *   3. 空白带不足（图片贴行、行高内缩等）时保守放大，仍找不到再硬切页容量，
 *      避免死循环。
 *
 * 切点坐标与渲染结果出自**同一张画布**，因此与最终 PDF 内容完全一致。
 */
function computePageCuts(
  canvas: HTMLCanvasElement,
  pageCapPx: number,
  scale: number,
): Array<[number, number]> {
  const W = canvas.width;
  const H = canvas.height;
  const cap = Math.round(pageCapPx * scale);
  const minGap = Math.max(4, Math.round(4 * scale)); // 最小空白带（CSS px）
  const ctx = canvas.getContext('2d');
  if (!ctx) return [[0, H]];

  // 逐行判断是否纯背景（分块读取，避免大画布一次 getImageData 的内存峰值）
  // 注意：行判定必须**全宽扫描**——只采样少数几列会把「短行」（段落末行、
  // 列表项等字数少的行）漏判成空白带：若采样列恰巧全部落在字的缝隙里，
  // 该行会被当成空白，切点随之落进文字中间。全宽扫描只要有一个像素偏离
  // 背景即视为内容行，短行再多字少也不会计入空白带。
  const hasContent = new Uint8Array(H);
  const CHUNK = 512;
  const bg = [242, 235, 224]; // PDF_BG
  for (let y0 = 0; y0 < H; y0 += CHUNK) {
    const h = Math.min(CHUNK, H - y0);
    const img = ctx.getImageData(0, y0, W, h).data;
    for (let y = 0; y < h; y += 1) {
      const rowBase = y * W * 4;
      let content = false;
      // 隔一个像素采样（字宽数十像素，2px 步进不可能穿进字缝漏检）
      for (let x = 0; x < W; x += 2) {
        const i = rowBase + x * 4;
        const dr = Math.abs(img[i] - bg[0]);
        const dg = Math.abs(img[i + 1] - bg[1]);
        const db = Math.abs(img[i + 2] - bg[2]);
        if (dr > 10 || dg > 10 || db > 10) {
          content = true;
          break;
        }
      }
      hasContent[y0 + y] = content ? 1 : 0;
    }
  }

  // 空白带中点 = 候选切点
  const cands: number[] = [];
  let y = 0;
  while (y < H) {
    if (hasContent[y] === 0) {
      let y2 = y;
      while (y2 < H && hasContent[y2] === 0) y2 += 1;
      if (y2 - y >= minGap) cands.push(Math.floor((y + y2) / 2));
      y = y2;
    } else {
      y += 1;
    }
  }

  // 贪心分页：每页取「不超过页容量」的最后一个空白带中点
  const ranges: Array<[number, number]> = [];
  let start = 0;
  let guard = 0;
  while (start < H - 1 && guard++ < 5000) {
    const limit = start + cap;
    if (limit >= H) {
      ranges.push([start, H]);
      break;
    }
    let end = 0;
    for (const c of cands) {
      if (c > start && c <= limit) end = c;
      else if (c > limit) break;
    }
    if (end <= start) end = limit; // 兜底：超高的图片等场景硬切，避免死循环
    ranges.push([start, end]);
    start = end;
  }
  if (ranges.length === 0) ranges.push([0, H]);
  return ranges;
}

export async function exportPDF(state: AppState, scope: ExportScopes = ['articles']): Promise<void> {
  const s = scopedState(state, scope);
  const has = normalizeScopes(scope);

  const dataUrls = await buildImageDataUrls(collectFileIds(s));
  const imgTag = (id: string) =>
    `<img src="${dataUrls.get(id)}" alt="" style="display:block;max-width:100%;margin:14px auto;border-radius:8px;" />`;
  const imagesOf = (ids: Array<string | undefined>) =>
    Array.from(new Set(ids.filter((x): x is string => !!x && dataUrls.has(x))))
      .map((id) => imgTag(id))
      .join('');
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
    <p style="text-align:center;color:#947D75;font-size:12px;letter-spacing:0.1em;margin:0 0 48px;text-transform:uppercase;">
      ${formatDate(new Date(), 'YYYY · MM · DD')}
    </p>
  `;

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
          <div style="font-size:16px;">${resolveInline(renderMarkdown(a.content))}</div>
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
          <div style="font-size:16px;">${resolveInline(renderMarkdown(m.content))}</div>
          ${imagesOf(m.imageIds)}
          ${(m.comments ?? []).map((c) => `<p style="margin:6px 0 0 12px;font-size:12px;color:#7A675F;">— ${escapeHTML(c.content).replace(/\n/g, '<br />')}</p>`).join('')}
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
          <div style="font-size:16px;">${resolveInline(renderMarkdown(l.content))}</div>
          ${imagesOf(l.imageIds)}
        </article>
      `;
    });
  }

  if (s.notes.inspiration.length > 0 && has.has('notes')) {
    html += h2('灵感') + '<ul style="list-style:none;padding:0;">';
    s.notes.inspiration.forEach((n) => {
      html += `<li style="margin:10px 0;padding-left:16px;border-left:1px solid #947D75;"><span style="color:#947D75;font-size:11px;letter-spacing:0.05em;">[${escapeHTML(n.category)}]</span> <span style="font-size:16px;">${resolveInline(renderMarkdown(n.content))}</span></li>`;
    });
    html += '</ul>';
  }

  if (s.notes.schedule.length > 0 && has.has('notes')) {
    html += h2('日程');
    s.notes.schedule.forEach((n) => {
      html += `<div style="margin:8px 0;font-size:15px;"><span style="color:#947D75;font-size:11px;">[${n.date}${n.time ? ' ' + n.time : ''}]</span> <strong>${escapeHTML(n.title)}</strong>${n.done ? ' ✓' : ''}${n.note ? `<div style="color:#7A675F;font-size:13px;margin-top:2px;">${resolveInline(renderMarkdown(n.note))}</div>` : ''}</div>`;
    });
  }

  if (s.notes.todo.length > 0 && has.has('notes')) {
    html += h2('待办');
    s.notes.todo.forEach((n) => {
      html += `<div style="margin:6px 0;font-size:15px;">${n.done ? '☑' : '☐'} ${escapeHTML(n.content).replace(/\n/g, '<br />')}</div>`;
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
      html += `<p style="margin:6px 0;font-size:14px;">★ ${escapeHTML(label)}</p>`;
    });
  }

  // 连续排版容器：整篇渲染成一张长图，再按页切片
  // 注意：上下内边距为 0 —— 页面留白统一由 MARGIN_TOP / MARGIN_BOTTOM 控制
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -10000px;
    left: -10000px;
    width: ${PDF_RENDER_W}px;
    padding: 0 80px;
    background: ${PDF_BG};
    color: #1B1A1F;
    font-family: ${PDF_FONT};
    line-height: 1.85;
  `;
  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    // 单张图片不超过一页的内容区（留 24px 安全余量，避免贴图溢出页边距）
    container.querySelectorAll('img').forEach((img) => {
      img.style.maxHeight = `${Math.floor(PAGE_CONTENT_PX) - 24}px`;
      img.style.width = 'auto';
      img.style.maxWidth = '100%';
      img.style.objectFit = 'contain';
    });
    await waitForImages(container);

    const totalH = container.scrollHeight;
    const RENDER_SCALE = 2;
    const canvas = await html2canvas(container, {
      backgroundColor: PDF_BG,
      scale: RENDER_SCALE,
      useCORS: true,
      logging: false,
      windowHeight: totalH,
      height: totalH,
    });
    // 分页切点直接从渲染画布像素中取「行间空白带中点」——
    // 切点与最终贴图出自同一张画布，杜绝「测量坐标 ≠ 渲染坐标」导致的切字
    const ranges = computePageCuts(canvas, PAGE_CONTENT_PX, RENDER_SCALE);
    const pageCapPt = A4_H - MARGIN_TOP - MARGIN_BOTTOM;

    const pdf = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    ranges.forEach(([a, b], idx) => {
      const sy = Math.max(0, a);
      const sh = Math.max(1, Math.min(canvas.height - sy, b - a));
      const slice = document.createElement('canvas');
      slice.width = canvas.width;
      slice.height = sh;
      const ctx = slice.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = PDF_BG;
      ctx.fillRect(0, 0, slice.width, slice.height);
      ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);

      // 本页内容实际高度（pt）
      const contentH = (sh / RENDER_SCALE) * PT_PER_PX;
      // 垂直位置：固定上边距；末页内容不足一页时垂直居中，避免「悬在页面顶部」
      let y = MARGIN_TOP;
      const isLast = idx === ranges.length - 1;
      if (isLast && contentH < pageCapPt) y = MARGIN_TOP + (pageCapPt - contentH) / 2;

      if (idx > 0) pdf.addPage();
      pdf.setFillColor(242, 235, 224);
      pdf.rect(0, 0, A4_W, A4_H, 'F');
      pdf.addImage(slice.toDataURL('image/jpeg', 0.9), 'JPEG', 0, y, A4_W, contentH);

      // 页码（· n ·）居中于页脚边距区，古铜色
      pdf.setFont('times', 'italic');
      pdf.setFontSize(10);
      pdf.setTextColor(148, 125, 117);
      pdf.text(`· ${idx + 1} ·`, A4_W / 2, A4_H - MARGIN_BOTTOM / 2 - 8, {
        align: 'center',
      });
    });

    pdf.save(`vidaos-${scopeSlug(scope)}-${formatDate(new Date(), 'YYYYMMDD-HHmm')}.pdf`);
  } finally {
    container.remove();
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
