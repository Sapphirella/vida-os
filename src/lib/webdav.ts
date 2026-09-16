// ============================================================
// WebDAV 云同步（坚果云等）
//
// 逻辑：把当前全部数据（含图片/音频，媒体以 base64 内嵌）压缩成
// 一个 gzip JSON 快照，通过 WebDAV MKCOL + PUT 上传到用户指定的
// 目录，固定文件名覆盖写入（后写覆盖，天然符合「单设备编辑」语义）。
//
// 注意：纯浏览器直连 WebDAV 可能被跨域（CORS）策略拦截（坚果云未开放
// 浏览器跨域头），失败时错误信息会如实归因；桌面版（Tauri 壳）下
// 本模块可无缝复用。
// ============================================================
import { db } from './db';
import { collectFileIds } from './exportImport';
import type { AppState, WebDavConfig } from '@/types';

/** 云端固定文件名（幂等覆盖，只保留最新一份） */
export const BACKUP_FILENAME = 'vidaos-backup.json.gz';

/** 是否已填写可用配置（三项齐全才算） */
export function hasWebDavConfig(cfg?: WebDavConfig): cfg is WebDavConfig {
  return !!cfg && !!cfg.url.trim() && !!cfg.username.trim() && !!cfg.password.trim();
}

/** 规范化接口地址：补协议、补末尾斜杠，保证是「目录」地址 */
export function normalizeDavUrl(raw: string): string {
  let u = raw.trim();
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  if (!u.endsWith('/')) u += '/';
  return u;
}

/** 只取纯数据字段（剥离 action/运行时标志/本机配置密码），供备份序列化 */
function pickState(s: AppState): AppState {
  return {
    version: 3,
    profile: s.profile,
    collections: s.collections,
    articles: s.articles,
    moments: s.moments,
    favorites: s.favorites,
    notes: s.notes,
    categories: s.categories,
    tracks: s.tracks,
    // 备份不携带本机 WebDAV 配置（含密码），避免分享备份时泄露
    settings: { lastTab: s.settings.lastTab },
  };
}

// ── 工具 ──────────────────────────────────────────────────────

/** Blob → base64（分块拼接，避免超长字符串卡死） */
async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    bin += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(bin);
}

async function gzipBlob(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

/** 把 HTTP 状态码转成用户能看懂的中文归因 */
function davError(status: number): string {
  if (status === 401 || status === 403) {
    return '认证失败：请检查账号与应用密码（应用密码需在服务商官网单独生成，不是网页登录密码）';
  }
  if (status === 404) {
    return '目标路径不存在（404）：请检查接口地址是否正确';
  }
  if (status === 409) {
    return '目标目录或其上级目录不存在（409）：请填一个已存在的目录地址';
  }
  if (status === 413) {
    return '备份体积超过服务端限制（413）';
  }
  if (status === 507) {
    return '服务端拒绝写入（507）：可能存储空间或本月流量配额已用尽';
  }
  if (status >= 500) {
    return `WebDAV 服务器错误（HTTP ${status}）`;
  }
  return `WebDAV 请求失败（HTTP ${status}）`;
}

// ── 上传 ──────────────────────────────────────────────────────

/** 确认目标目录存在；目录已存在或不可创建（如根目录）时视为通过 */
async function ensureDir(base: string, auth: string): Promise<void> {
  const res = await fetch(base, {
    method: 'MKCOL',
    headers: { Authorization: auth },
  });
  // 201/204 创建成功；405/409/403 表示已存在或根目录无需创建
  if (![201, 204, 301, 302, 405, 409, 403].includes(res.status)) {
    throw new Error(davError(res.status));
  }
}

/**
 * 执行一次全量云备份。
 * @returns 上传的 gzip 体积（字节）与完成时间
 */
export async function syncToWebDav(
  cfg: WebDavConfig,
  state: AppState,
): Promise<{ bytes: number; createdAt: number; url: string }> {
  const base = normalizeDavUrl(cfg.url);
  // 邮箱/密码可能含非 ASCII 字符，用 unescape(encodeURIComponent()) 兼容
  const auth = 'Basic ' + btoa(unescape(encodeURIComponent(`${cfg.username}:${cfg.password}`)));
  const target = base + BACKUP_FILENAME;

  try {
    await ensureDir(base, auth);

    // 组装全量备份（文本状态 + 媒体 base64）
    const payload = JSON.stringify({
      app: 'VidaOS',
      kind: 'webdav-backup',
      createdAt: Date.now(),
      version: state.version,
      state: pickState(state),
      files: await (async () => {
        const files: Record<
          string,
          { mime: string; name: string; size: number; data: string }
        > = {};
        for (const id of collectFileIds(state)) {
          const f = await db.files.get(id);
          if (!f) continue;
          files[id] = {
            mime: f.mime,
            name: f.name,
            size: f.size,
            data: await blobToBase64(f.blob),
          };
        }
        return files;
      })(),
    });

    const gz = await gzipBlob(payload);

    const res = await fetch(target, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        'Content-Type': 'application/gzip',
        'Content-Length': String(gz.size),
      },
      body: gz,
    });
    if (!res.ok) throw new Error(davError(res.status));

    return { bytes: gz.size, createdAt: Date.now(), url: target };
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        '无法连接 WebDAV 服务器：网络不可达，或浏览器直连被跨域（CORS）策略拦截（桌面版可正常使用）',
      );
    }
    throw e;
  }
}