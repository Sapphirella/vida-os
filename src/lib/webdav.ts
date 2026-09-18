// ============================================================
// WebDAV 云同步（坚果云等）
//
// 逻辑：把当前全部数据（含图片/音频，媒体以 base64 内嵌）压缩成
// 一个 gzip JSON 快照，通过 WebDAV MKCOL + PUT 上传到用户指定的
// 目录，固定文件名覆盖写入（后写覆盖，天然符合「单设备编辑」语义）。
//
// 可选端到端加密：开启后上传前用「口令 + PBKDF2 派生密钥 + AES-256-GCM」
// 加密整个 gzip，云端只存密文；取回时用同一口令解密。密文文件头
// 带 VDOS1 魔数 + salt + iv，解密所需信息全部随文件走，口令只在
// 本机保存、绝不随备份上传。
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

/** 是否需要用户输入口令（下载时发现已加密但未提供口令） */
export class NeedPassphraseError extends Error {
  constructor() {
    super('云端备份已加密，请输入加密口令');
    this.name = 'NeedPassphraseError';
  }
}

/** 当前环境是否支持 Web Crypto（非 https/localhost 下 crypto.subtle 不可用） */
export const supportsCrypto = (): boolean =>
  typeof crypto !== 'undefined' && typeof crypto.subtle !== 'undefined';

// ── 端到端加密（AES-256-GCM + PBKDF2） ────────────────────────

const ENC_MAGIC = new Uint8Array([0x56, 0x44, 0x4f, 0x53, 0x31]); // "VDOS1"
const SALT_LEN = 16;
const IV_LEN = 12;
const PBKDF2_ITERATIONS = 150000;

async function deriveKey(passphrase: string, salt: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: new Uint8Array(salt), iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** 加密 gzip Blob：返回「VDOS1 + salt + iv + 密文」容器 */
export async function encryptBlob(blob: Blob, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LEN));
  const iv = crypto.getRandomValues(new Uint8Array(IV_LEN));
  const key = await deriveKey(passphrase, salt);
  const data = new Uint8Array(await blob.arrayBuffer());
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data));
  const out = new Uint8Array(ENC_MAGIC.length + SALT_LEN + IV_LEN + cipher.length);
  out.set(ENC_MAGIC, 0);
  out.set(salt, ENC_MAGIC.length);
  out.set(iv, ENC_MAGIC.length + SALT_LEN);
  out.set(cipher, ENC_MAGIC.length + SALT_LEN + IV_LEN);
  return new Blob([out], { type: 'application/octet-stream' });
}

/** 检查 Blob 是否是我们的加密容器 */
async function isEncryptedContainer(blob: Blob): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, ENC_MAGIC.length).arrayBuffer());
  return ENC_MAGIC.every((b, i) => head[i] === b);
}

/** 解密加密容器；口令错误或数据损坏返回 null */
async function decryptBlob(blob: Blob, passphrase: string): Promise<Blob | null> {
  const buf = new Uint8Array(await blob.arrayBuffer());
  if (buf.length < ENC_MAGIC.length + SALT_LEN + IV_LEN + 16) return null;
  const salt = buf.subarray(ENC_MAGIC.length, ENC_MAGIC.length + SALT_LEN);
  const iv = buf.subarray(ENC_MAGIC.length + SALT_LEN, ENC_MAGIC.length + SALT_LEN + IV_LEN);
  const data = buf.subarray(ENC_MAGIC.length + SALT_LEN + IV_LEN);
  try {
    const key = await deriveKey(passphrase, salt);
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
    return new Blob([plain], { type: 'application/gzip' });
  } catch {
    return null;
  }
}

/** 是否已填写可用配置（三项齐全才算） */
export function hasWebDavConfig(cfg?: WebDavConfig): cfg is WebDavConfig {
  return !!cfg && !!cfg.url.trim() && !!cfg.username.trim() && !!cfg.password.trim();
}

/** 加密配置是否齐全（开关开启且已设口令） */
export function hasEncryption(cfg?: WebDavConfig): boolean {
  return !!cfg?.encrypted && !!cfg.passphrase?.trim();
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
    fragments: s.fragments,
    agentSessions: s.agentSessions,
    // 备份不携带本机密钥：API Key 只存本机，不随备份上传
    agentConfig: { ...s.agentConfig, apiKey: '' },
    agentDocs: s.agentDocs,
    agentMemories: s.agentMemories,
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

    // 开启加密时：上传前用口令加密为密文容器
    const encrypted = hasEncryption(cfg);
    const body = encrypted ? await encryptBlob(gz, cfg.passphrase!) : gz;

    const res = await fetch(target, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        'Content-Type': encrypted ? 'application/octet-stream' : 'application/gzip',
        'Content-Length': String(body.size),
      },
      body,
    });
    if (!res.ok) throw new Error(davError(res.status));

    return { bytes: body.size, createdAt: Date.now(), url: target };
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        '无法连接 WebDAV 服务器：网络不可达，或浏览器直连被跨域（CORS）策略拦截（桌面版可正常使用）',
      );
    }
    throw e;
  }
}

// ── 云端取回 ──────────────────────────────────────────────────

/** 下载、解压并校验云端快照 */
async function fetchBackupBlob(cfg: WebDavConfig, auth: string): Promise<Blob> {
  const target = normalizeDavUrl(cfg.url) + BACKUP_FILENAME;
  const res = await fetch(target, { method: 'GET', headers: { Authorization: auth } });
  if (res.status === 404) throw new Error('云端还没有备份文件：请先执行一次「云备份」');
  if (!res.ok) throw new Error(davError(res.status));
  return res.blob();
}

async function gunzipBlob(blob: Blob): Promise<string> {
  try {
    const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
    return await new Response(stream).text();
  } catch {
    throw new Error('云端备份内容不是有效的压缩文件（可能已加密但未提供口令，或文件损坏）');
  }
}

export interface DavBackupInfo {
  bytes: number;
  createdAt: number;
  url: string;
  /** 云端这份备份是否为加密存储 */
  encrypted: boolean;
  /** 快照内的纯数据状态（不含本机 webdav 配置） */
  state: AppState;
}

/**
 * 从 WebDAV 取回云端备份。
 * 若备份已加密：需要提供口令（本机已存则自动使用）；未提供时抛 NeedPassphraseError。
 */
export async function downloadFromWebDav(
  cfg: WebDavConfig,
  passphrase?: string,
): Promise<DavBackupInfo> {
  const base = normalizeDavUrl(cfg.url);
  const target = base + BACKUP_FILENAME;
  const auth = 'Basic ' + btoa(unescape(encodeURIComponent(`${cfg.username}:${cfg.password}`)));

  try {
    const blob = await fetchBackupBlob(cfg, auth);
    const encrypted = await isEncryptedContainer(blob);

    let gz: Blob;
    if (encrypted) {
      const pass = (passphrase ?? cfg.passphrase ?? '').trim();
      if (!pass) throw new NeedPassphraseError();
      const plain = await decryptBlob(blob, pass);
      if (!plain) {
        throw new Error('解密失败：口令错误或备份数据已损坏。口令无法找回，该备份视为不可用');
      }
      gz = plain;
    } else {
      gz = blob;
    }

    const text = await gunzipBlob(gz);
    let data: { kind?: string; createdAt?: number; state?: AppState };
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('云端备份 JSON 解析失败：文件可能已损坏');
    }
    if (data?.kind !== 'webdav-backup' || !data.state) {
      throw new Error('云端备份不符合 VidaOS 快照格式');
    }
    return {
      bytes: blob.size,
      createdAt: data.createdAt ?? Date.now(),
      url: target,
      encrypted,
      state: data.state,
    };
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        '无法连接 WebDAV 服务器：网络不可达，或浏览器直连被跨域（CORS）策略拦截（桌面版可正常使用）',
      );
    }
    throw e;
  }
}