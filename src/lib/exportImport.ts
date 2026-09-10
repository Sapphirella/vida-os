// 导入导出工具
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { AppState } from '@/types';
import { listFiles } from './db';
import { blobToBase64, base64ToBlob, plainText, formatDate } from './utils';
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

export async function exportJSON(state: AppState, scope: ExportScope = 'all'): Promise<string> {
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
// 导出范围
// ============================================================

export type ExportScope =
  | 'all'
  | 'articles'
  | 'moments'
  | 'letters'
  | 'notes'
  | 'profile';

export function scopedState(state: AppState, scope: ExportScope): AppState {
  if (scope === 'all') return state;
  const base: AppState = {
    ...state,
    profile: scope === 'profile' ? state.profile : { name: '', signature: '' },
    collections: scope === 'articles' ? state.collections : [],
    articles: scope === 'articles' ? state.articles : [],
    moments: scope === 'moments' ? state.moments : [],
    letters: scope === 'letters' ? state.letters : [],
    favorites: [],
    notes:
      scope === 'notes'
        ? state.notes
        : { inspiration: [], schedule: [], todo: [] },
    categories: state.categories,
    tracks: [],
    settings: state.settings,
  };
  return base;
}

function collectFileIds(state: AppState): Set<string> {
  const ids = new Set<string>();
  state.articles.forEach((a) => {
    a.imageIds.forEach((id) => ids.add(id));
    if (a.coverId) ids.add(a.coverId);
  });
  state.moments.forEach((m) => m.imageIds.forEach((id) => ids.add(id)));
  state.letters.forEach((l) => l.imageIds.forEach((id) => ids.add(id)));
  if (state.profile.avatarId) ids.add(state.profile.avatarId);
  if (state.profile.backgroundFileId) ids.add(state.profile.backgroundFileId);
  return ids;
}

// ============================================================
// Markdown 导出
// ============================================================

export function exportMarkdown(state: AppState, scope: ExportScope = 'articles'): string {
  const s = scopedState(state, scope);
  const lines: string[] = [];
  lines.push(`# VidaOS 导出`);
  lines.push(`> 导出时间：${formatDate(new Date(), 'YYYY-MM-DD HH:mm')}`);
  lines.push('');

  if (scope === 'articles' || scope === 'all') {
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

  if (scope === 'moments' || scope === 'all') {
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

  if (scope === 'letters' || scope === 'all') {
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

  if (scope === 'notes' || scope === 'all') {
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

export function exportTXT(state: AppState, scope: ExportScope = 'all'): string {
  const s = scopedState(state, scope);
  const lines: string[] = [];
  lines.push(`VidaOS 导出`);
  lines.push(`导出时间：${formatDate(new Date(), 'YYYY-MM-DD HH:mm')}`);
  lines.push('');

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
// ============================================================

export async function exportPDF(state: AppState, scope: ExportScope = 'articles'): Promise<void> {
  const s = scopedState(state, scope);

  // 构造临时 DOM
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    top: -10000px;
    left: -10000px;
    width: 720px;
    padding: 64px 80px;
    background: #F2EBE0;
    color: #1B1A1F;
    font-family: "EB Garamond", "Lora", Georgia, serif;
    line-height: 1.85;
  `;

  let html = `
    <h1 style="font-family: 'EB Garamond', serif; font-size: 36px; text-align: center; margin: 0 0 8px; color: #1B1A1F; letter-spacing: -0.01em;">
      VidaOS
    </h1>
    <p style="text-align: center; color: #947D75; font-size: 12px; letter-spacing: 0.1em; margin: 0 0 48px; text-transform: uppercase;">
      ${formatDate(new Date(), 'YYYY · MM · DD')}
    </p>
  `;

  if (s.articles.length > 0 && (scope === 'articles' || scope === 'all')) {
    html += `<h2 style="font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #6A080E; margin: 32px 0 16px; border-bottom: 1px solid #947D75; padding-bottom: 8px;">文章</h2>`;
    s.articles.forEach((a) => {
      html += `
        <article style="margin: 32px 0; page-break-inside: avoid;">
          <h3 style="font-size: 24px; color: #1B1A1F; margin: 0 0 8px; font-weight: 500;">${escapeHTML(a.title)}</h3>
          <p style="color: #947D75; font-size: 11px; margin: 0 0 16px; letter-spacing: 0.05em;">${formatDate(a.createdAt, 'YYYY · MM · DD')}${a.tags.length ? ' · ' + a.tags.map((t) => '#' + t).join(' ') : ''}</p>
          <div style="font-size: 14px;">${renderMarkdown(a.content)}</div>
        </article>
      `;
    });
  }

  if (s.moments.length > 0 && (scope === 'moments' || scope === 'all')) {
    html += `<h2 style="font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #6A080E; margin: 32px 0 16px; border-bottom: 1px solid #947D75; padding-bottom: 8px;">动态</h2>`;
    s.moments.forEach((m) => {
      html += `
        <div style="margin: 24px 0; padding-left: 16px; border-left: 2px solid #6A080E;">
          <p style="color: #947D75; font-size: 11px; margin: 0 0 6px; letter-spacing: 0.05em;">${formatDate(m.createdAt, 'YYYY · MM · DD HH:mm')}</p>
          <p style="margin: 0; font-size: 14px;">${escapeHTML(m.content)}</p>
        </div>
      `;
    });
  }

  if (s.letters.length > 0 && (scope === 'letters' || scope === 'all')) {
    html += `<h2 style="font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #6A080E; margin: 32px 0 16px; border-bottom: 1px solid #947D75; padding-bottom: 8px;">信件</h2>`;
    s.letters.forEach((l) => {
      html += `
        <article style="margin: 32px 0; page-break-inside: avoid;">
          <h3 style="font-size: 22px; color: #1B1A1F; margin: 0 0 8px; font-weight: 500;">${escapeHTML(l.title || '(无题)')}</h3>
          <p style="color: #947D75; font-size: 11px; margin: 0 0 16px;">${formatDate(l.createdAt, 'YYYY · MM · DD')}</p>
          <div style="font-size: 14px;">${renderMarkdown(l.content)}</div>
        </article>
      `;
    });
  }

  if (s.notes.inspiration.length > 0 && (scope === 'notes' || scope === 'all')) {
    html += `<h2 style="font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #6A080E; margin: 32px 0 16px; border-bottom: 1px solid #947D75; padding-bottom: 8px;">灵感</h2><ul style="list-style: none; padding: 0;">`;
    s.notes.inspiration.forEach((n) => {
      html += `<li style="margin: 8px 0; padding-left: 16px; border-left: 1px solid #947D75;"><span style="color: #947D75; font-size: 11px; letter-spacing: 0.05em;">[${escapeHTML(n.category)}]</span> ${escapeHTML(n.content)}</li>`;
    });
    html += `</ul>`;
  }

  if (s.notes.schedule.length > 0 && (scope === 'notes' || scope === 'all')) {
    html += `<h2 style="font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #6A080E; margin: 32px 0 16px; border-bottom: 1px solid #947D75; padding-bottom: 8px;">日程</h2>`;
    s.notes.schedule.forEach((n) => {
      html += `<p style="margin: 6px 0; font-size: 13px;"><span style="color: #947D75; font-size: 11px;">[${n.date}${n.time ? ' ' + n.time : ''}]</span> <strong>${escapeHTML(n.title)}</strong>${n.done ? ' ✓' : ''}</p>`;
    });
  }

  if (s.notes.todo.length > 0 && (scope === 'notes' || scope === 'all')) {
    html += `<h2 style="font-size: 16px; letter-spacing: 0.2em; text-transform: uppercase; color: #6A080E; margin: 32px 0 16px; border-bottom: 1px solid #947D75; padding-bottom: 8px;">待办</h2>`;
    s.notes.todo.forEach((n) => {
      html += `<p style="margin: 6px 0; font-size: 13px;">${n.done ? '☑' : '☐'} ${escapeHTML(n.content)}</p>`;
    });
  }

  container.innerHTML = html;
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      backgroundColor: '#F2EBE0',
      scale: 2,
      useCORS: true,
      logging: false,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.92);
    const pdf = new jsPDF({
      unit: 'pt',
      format: 'a4',
      orientation: 'portrait',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pdfWidth;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
    heightLeft -= pdfHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight);
      heightLeft -= pdfHeight;
    }

    pdf.save(`vidaos-${scope}-${formatDate(new Date(), 'YYYYMMDD-HHmm')}.pdf`);
  } finally {
    document.body.removeChild(container);
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
