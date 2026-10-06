// ============================================================
// WebDAV 云同步（坚果云等）
//
// 逻辑：把当前全部数据（含图片/音频，媒体以 base64 内嵌）整理成
// 一份 JSON，通过 WebDAV MKCOL + PUT 上传到用户指定的目录。
//
// 版本保留（v4.7.12）：**最新一份固定叫 vidaos-backup.json**，每次同步前把云端
// 现有的那份 MOVE 成带时间戳的历史文件（vidaos-backup-<时间戳>.json），
// 同步后再按数量裁掉最旧的 —— 云端最多保留 DAV_MAX_BACKUPS 份（含最新那份）。
// 于是「删除的内容同步后不在最新备份里」，但**旧份里还在，可以从云端历史恢复**。
// 若服务端不支持 PROPFIND/MOVE（拿不到列表或不能改名），就退回旧的「只留一份」行为，
// 并在结果里带上 warning 让 UI 如实告诉用户（绝不假装有历史）。
//
// 云端默认存明文 JSON（v4.5.1 起不再 gzip，方便在坚果云里直接查看/管理）；
// 可选端到端加密：开启后上传前用「口令 + PBKDF2 派生密钥 + AES-256-GCM」
// 加密整份 JSON（加密前仍会 gzip 压缩体积），云端只存密文；
// 取回时用同一口令解密。密文文件头带 VDOS1 魔数 + salt + iv，
// 解密所需信息全部随文件走，口令只在本机保存、绝不随备份上传。
//
// 兼容旧备份：早期版本云端存的是 vidaos-backup.json.gz，下载时会
// 先尝试新文件名、404 再回退旧文件名，并自动识别 gzip/明文/密文。
//
// 注意：纯浏览器直连 WebDAV 可能被跨域（CORS）策略拦截（坚果云未开放
// 浏览器跨域头），失败时错误信息会如实归因；桌面版（Tauri 壳）下
// 本模块可无缝复用。
// ============================================================
import { db } from './db';
import { collectFileIds } from './exportImport';
import type { AppState, WebDavConfig } from '@/types';

/** 云端「最新一份」的固定文件名（同步时覆盖写入；明文 JSON） */
export const BACKUP_FILENAME = 'vidaos-backup.json';
/** 旧版文件名（gzip 快照），下载时回退兼容 */
const BACKUP_FILENAME_LEGACY = 'vidaos-backup.json.gz';
/** 历史份文件名前缀（同步前把上一份改名成这个） */
const HISTORY_PREFIX = 'vidaos-backup-';
/**
 * 云端最多保留几份（**含最新那份**）—— 用户明确要求 5 份。
 * 想改保留份数就改这一个数字。
 */
export const DAV_MAX_BACKUPS = 5;

/** 云端一份备份文件 */
export interface DavBackupEntry {
  /** 文件名（不含目录） */
  name: string;
  /** 服务端给的最后修改时间（拿不到时用名字里的时间戳兜底） */
  mtime: number;
  /** 字节数（拿不到 0） */
  size: number;
  /** 是不是「最新那一份」（固定文件名那份） */
  isLatest: boolean;
  /** 旧版 gzip 文件名 */
  isLegacy: boolean;
}

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
    books: s.books,
    albums: s.albums,
    albumGroups: s.albumGroups,
    albumStars: s.albumStars,
    agentSessions: s.agentSessions,
    // 备份不携带本机密钥：API Key 只存本机，不随备份上传
    agentConfig: { ...s.agentConfig, apiKey: '' },
    agentDocs: s.agentDocs,
    agentMemories: s.agentMemories,
    // 备份不携带本机 WebDAV 配置（含密码），避免分享备份时泄露；
    // 其余设置项要带上 —— 之前只留 lastTab，于是「云备份 → 换机恢复」后
    // 「关掉 Agent」与「存原图」这两个开关会被悄悄重置（v4.7.11 修）
    settings: {
      lastTab: s.settings.lastTab,
      agentEnabled: s.settings.agentEnabled,
      keepOriginalImages: s.settings.keepOriginalImages,
    },
  };
}

/**
 * 只读出云端备份里的 files（上传前用来补齐本机缺失的媒体）。
 * 加密备份需要口令；拿不到就抛错，让上传方中止 —— 宁可这次没备份，也不能覆盖好副本。
 */
async function readRemoteFiles(
  cfg: WebDavConfig,
): Promise<Record<string, { mime: string; name: string; size: number; data: string }>> {
  const info = await downloadFromWebDav(cfg, cfg.passphrase);
  return info.files ?? {};
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

/** 探测 Blob 是否为 gzip（魔数 1f 8b），用于兼容旧版 .json.gz 备份 */
async function isGzipBlob(blob: Blob): Promise<boolean> {
  const head = new Uint8Array(await blob.slice(0, 2).arrayBuffer());
  return head[0] === 0x1f && head[1] === 0x8b;
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
 * 列出云端目录里的 VidaOS 备份文件（PROPFIND Depth:1）。
 *
 * 为什么需要它：要保留历史就必须知道「云端现在有哪几份、哪份最旧」。
 * 服务端不支持 PROPFIND（405/501）或返回解析不出内容时抛 `DavListError`，
 * 调用方据此退回「只留一份」的老行为。
 */
export class DavListError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DavListError';
  }
}

/** 文件名 → 备份条目（认不出返回 null） */
function parseBackupName(name: string): Omit<DavBackupEntry, 'mtime' | 'size'> | null {
  if (name === BACKUP_FILENAME) return { name, isLatest: true, isLegacy: false };
  if (name === BACKUP_FILENAME_LEGACY) return { name, isLatest: false, isLegacy: true };
  if (name.startsWith(HISTORY_PREFIX) && name.endsWith('.json')) {
    return { name, isLatest: false, isLegacy: false };
  }
  return null;
}

/** 历史文件名：vidaos-backup-20261006-1530.json（同一分钟内重名时补序号） */
function historyName(stamp: number, taken: Set<string>): string {
  const d = new Date(stamp);
  const p = (n: number) => String(n).padStart(2, '0');
  const base = `${HISTORY_PREFIX}${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(
    d.getHours(),
  )}${p(d.getMinutes())}${p(d.getSeconds())}`;
  let name = `${base}.json`;
  let n = 2;
  while (taken.has(name)) {
    name = `${base}-${n}.json`;
    n += 1;
  }
  return name;
}

export async function listDavBackups(cfg: WebDavConfig): Promise<DavBackupEntry[]> {
  const base = normalizeDavUrl(cfg.url);
  const auth = basicAuth(cfg);
  let res: Response;
  try {
    res = await fetch(base, {
      method: 'PROPFIND',
      headers: { Authorization: auth, Depth: '1', 'Content-Type': 'application/xml' },
    });
  } catch (e) {
    throw new DavListError(`无法读取云端目录列表（${e instanceof Error ? e.message : '网络错误'}）`);
  }
  if (!res.ok) {
    // 405/501 = 服务端不实现 PROPFIND；403/404 之类也算读不到列表
    throw new DavListError(`云端不支持列出目录（HTTP ${res.status}）`);
  }
  const xml = await res.text();
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    throw new DavListError('云端目录列表解析失败');
  }
  const nodes = [...doc.getElementsByTagNameNS('*', 'response')];
  const out: DavBackupEntry[] = [];
  for (const node of nodes) {
    const href = node.getElementsByTagNameNS('*', 'href')[0]?.textContent?.trim() ?? '';
    if (!href) continue;
    // href 可能是完整 URL 或绝对路径，取最后一段并解码
    const raw = href.replace(/\/+$/, '').split('/').pop() ?? '';
    let name = raw;
    try {
      name = decodeURIComponent(raw);
    } catch {
      /* 保持原样 */
    }
    const parsed = parseBackupName(name);
    if (!parsed) continue;
    const lm = node.getElementsByTagNameNS('*', 'getlastmodified')[0]?.textContent?.trim();
    const len = node.getElementsByTagNameNS('*', 'getcontentlength')[0]?.textContent?.trim();
    const mtime = lm ? new Date(lm).getTime() : NaN;
    out.push({
      ...parsed,
      mtime: Number.isNaN(mtime) ? 0 : mtime,
      size: len ? Number(len) || 0 : 0,
    });
  }
  // 新的在前；mtime 相同时按文件名（时间戳命名天然有序）
  out.sort((a, b) => (b.mtime || 0) - (a.mtime || 0) || b.name.localeCompare(a.name));
  return out;
}

/** Basic 认证头（邮箱/密码可能含非 ASCII，用 encodeURIComponent 兜一层） */
function basicAuth(cfg: WebDavConfig): string {
  return 'Basic ' + btoa(unescape(encodeURIComponent(`${cfg.username}:${cfg.password}`)));
}

/**
 * 把云端「最新那份」改名为历史文件（保留旧版本用）。
 * @returns 新的历史文件名；服务端不支持改名时抛错，由调用方决定是否降级
 */
async function rotateLatestToHistory(
  cfg: WebDavConfig,
  auth: string,
  latestMtime: number,
  taken: Set<string>,
): Promise<string> {
  const base = normalizeDavUrl(cfg.url);
  const dest = historyName(latestMtime || Date.now(), taken);
  const res = await fetch(base + BACKUP_FILENAME, {
    method: 'MOVE',
    headers: {
      Authorization: auth,
      // Destination 必须是绝对 URL
      Destination: base + encodeURIComponent(dest),
      Overwrite: 'T',
    },
  });
  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`云端不支持改名（HTTP ${res.status}）`);
  }
  return dest;
}

/** 删除云端某份备份（裁剪旧份用；失败只当没删成） */
async function deleteDavFile(cfg: WebDavConfig, auth: string, name: string): Promise<boolean> {
  const base = normalizeDavUrl(cfg.url);
  try {
    const res = await fetch(base + encodeURIComponent(name), {
      method: 'DELETE',
      headers: { Authorization: auth },
    });
    return res.ok || res.status === 404;
  } catch {
    return false;
  }
}

/**
 * 执行一次全量云备份。
 * @returns 上传的 gzip 体积（字节）与完成时间
 */
export async function syncToWebDav(
  cfg: WebDavConfig,
  state: AppState,
): Promise<{
  bytes: number;
  createdAt: number;
  url: string;
  /** 本次同步后云端保留的备份份数（列表不可用时为 1） */
  backups: number;
  /** 本次被裁掉的旧份文件名 */
  pruned: string[];
  /** 降级说明（服务端不支持列目录/改名时），UI 要如实告诉用户 */
  warning?: string;
}> {
  const base = normalizeDavUrl(cfg.url);
  // 邮箱/密码可能含非 ASCII 字符，用 unescape(encodeURIComponent()) 兼容
  const auth = basicAuth(cfg);
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
        const missing: string[] = [];
        for (const id of collectFileIds(state)) {
          const f = await db.files.get(id);
          if (!f) {
            missing.push(id);
            continue;
          }
          files[id] = {
            mime: f.mime,
            name: f.name,
            size: f.size,
            data: await blobToBase64(f.blob),
          };
        }
        if (!missing.length) return files;

        // v4.7.11：本机缺文件（换了设备 / 清过缓存 / 从云端恢复时旧版本没带回媒体）。
        // 直接用这份「缺文件的」覆盖云端，会把云端唯一的好副本也毁掉 —— 这是不可逆的数据丢失，
        // 所以：先试着把云端已有的同名文件补回来；拿不到就**中止上传**，绝不覆盖。
        try {
          const remote = await readRemoteFiles(cfg);
          let kept = 0;
          for (const id of missing) {
            const r = remote[id];
            if (r) {
              files[id] = r;
              kept += 1;
            }
          }
          if (kept === 0) {
            throw new Error('云端备份里也没有这些文件');
          }
          missing.forEach((id) => {
            if (!files[id]) missing.splice(missing.indexOf(id), 1);
          });
        } catch (e) {
          throw new Error(
            `本机缺少 ${missing.length} 个媒体文件，且无法从云端补齐（${
              e instanceof Error ? e.message : '未知原因'
            }）。为避免覆盖云端那份完整备份，本次上传已中止。请先在本机恢复文件（数据页 → 从云端恢复），再重试。`,
          );
        }
        return files;
      })(),
    });

    const gz = await gzipBlob(payload);

    // 开启加密时：先 gzip 再加密为密文容器（压缩防泄露体积）；
    // 未加密时直接上传明文 JSON（v4.5.1 起云端默认存 JSON，方便查看）
    const encrypted = hasEncryption(cfg);
    const body = encrypted ? await encryptBlob(gz, cfg.passphrase!) : new Blob([payload], { type: 'application/json' });

    // ── 保留最近 N 份（v4.7.12）──
    // 顺序：先列出云端 → 把现有「最新那份」改名成历史 → 上传新的一份 → 裁掉超出的旧份。
    // 任何一步失败都不影响「这次备份成功」，但要在结果里如实说清楚（绝不假装有历史）。
    let backups = 1;
    let pruned: string[] = [];
    let warning: string | undefined;
    let existing: DavBackupEntry[] = [];
    try {
      existing = await listDavBackups(cfg);
    } catch (e) {
      warning = `${e instanceof Error ? e.message : '云端列表不可用'}，本次仍是「只保留一份」的旧行为`;
    }

    if (!warning) {
      const latest = existing.find((x) => x.isLatest);
      if (latest) {
        try {
          const taken = new Set(existing.map((x) => x.name));
          const moved = await rotateLatestToHistory(cfg, auth, latest.mtime, taken);
          existing = [...existing.filter((x) => x.name !== latest.name), {
            name: moved, mtime: Date.now(), size: latest.size, isLatest: false, isLegacy: false,
          }];
        } catch (e) {
          warning = `${e instanceof Error ? e.message : '云端改名失败'}，本次未能保留历史份`;
        }
      }
    }

    const res = await fetch(target, {
      method: 'PUT',
      headers: {
        Authorization: auth,
        'Content-Type': encrypted ? 'application/octet-stream' : 'application/json',
        'Content-Length': String(body.size),
      },
      body,
    });
    if (!res.ok) throw new Error(davError(res.status));

    if (!warning) {
      // 云端现有份数（含刚上传这份）= 原列表（含被改名那份）
      const names = existing.map((x) => x.name);
      const total = names.length + 1;
      if (total > DAV_MAX_BACKUPS) {
        // 最旧的先删；按 mtime 升序（拿不到 mtime 的排最前，优先删）
        const removable = [...existing]
          .filter((x) => !x.isLatest)
          .sort((a, b) => (a.mtime || 0) - (b.mtime || 0));
        const need = total - DAV_MAX_BACKUPS;
        const victims = removable.slice(0, need);
        const done: string[] = [];
        for (const v of victims) {
          if (await deleteDavFile(cfg, auth, v.name)) done.push(v.name);
        }
        pruned = done;
      }
      backups = Math.min(total, DAV_MAX_BACKUPS);
    }

    return { bytes: body.size, createdAt: Date.now(), url: target, backups, pruned, warning };
  } catch (e) {
    if (e instanceof TypeError) {
      // v4.7.11：把原始消息带上 —— 之前这里把 TypeError 一律当成 CORS/断网，
      // 真正的错因（例如序列化失败）被吞掉，用户和排查的人都只能看到一句「网络不可达」。
      throw new Error(
        '无法连接 WebDAV 服务器：网络不可达，或浏览器直连被跨域（CORS）策略拦截（桌面版可正常使用）' +
          `。原始错误：${e.message}`,
      );
    }
    throw e;
  }
}

// ── 云端取回 ──────────────────────────────────────────────────

/** 下载云端备份：先试新文件名（明文 JSON），404 再回退旧文件名（gzip 快照） */
async function fetchBackupBlob(cfg: WebDavConfig, auth: string): Promise<Blob> {
  const base = normalizeDavUrl(cfg.url);
  for (const name of [BACKUP_FILENAME, BACKUP_FILENAME_LEGACY]) {
    const res = await fetch(base + name, { method: 'GET', headers: { Authorization: auth } });
    if (res.status === 404) continue;
    if (!res.ok) throw new Error(davError(res.status));
    return res.blob();
  }
  throw new Error('云端还没有备份文件：请先执行一次「云备份」');
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
  /** 这份备份在云端的文件名（历史份恢复时用来显示是哪一份） */
  name: string;
  /** 云端这份备份是否为加密存储 */
  encrypted: boolean;
  /** 快照内的纯数据状态（不含本机 webdav 配置） */
  state: AppState;
  /**
   * 云端备份里的媒体文件（v4.7.11 之前这里根本没有，恢复时把 files 整段丢掉 ——
   * 换机/清过缓存后恢复，所有图片音频只剩悬空 id；而且下一次同步会用「本机没有文件」
   * 的空 files 覆盖云端那份，把唯一的好备份也毁掉）。
   * 值是**原始 base64**（不含 `data:` 前缀，见本文件 blobToBase64）。
   */
  files: Record<string, { mime: string; name: string; size: number; data: string }>;
}

/**
 * 解析一份云端备份 blob（密文/明文 gzip/明文 JSON 都认）。
 * 抽出来是因为「取回最新那份」和「取回指定某一份历史」要走同一套解析。
 */
async function parseDavBlob(
  blob: Blob,
  cfg: WebDavConfig,
  passphrase: string | undefined,
  name: string,
  url?: string,
): Promise<DavBackupInfo> {
  const encrypted = await isEncryptedContainer(blob);

  let payload: Blob;
  if (encrypted) {
    const pass = (passphrase ?? cfg.passphrase ?? '').trim();
    if (!pass) throw new NeedPassphraseError();
    const plain = await decryptBlob(blob, pass);
    if (!plain) {
      throw new Error('解密失败：口令错误或备份数据已损坏。口令无法找回，该备份视为不可用');
    }
    payload = plain;
  } else {
    payload = blob;
  }

  // 兼容新旧两种云端格式：gzip 快照（旧版）解压，明文 JSON 直接读
  const text = (await isGzipBlob(payload)) ? await gunzipBlob(payload) : await payload.text();
  let data: {
    kind?: string;
    createdAt?: number;
    state?: AppState;
    files?: Record<string, { mime: string; name: string; size: number; data: string }>;
  };
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
    url: url ?? normalizeDavUrl(cfg.url) + encodeURIComponent(name),
    name,
    encrypted,
    state: data.state,
    // 旧备份可能没有 files 字段（早期版本只存文本）
    files: data.files ?? {},
  };
}

/**
 * 从 WebDAV 取回云端备份。
 * 若备份已加密：需要提供口令（本机已存则自动使用）；未提供时抛 NeedPassphraseError。
 */
export async function downloadFromWebDav(
  cfg: WebDavConfig,
  passphrase?: string,
  /** 指定要取回哪一份（云端历史里挑）；不传 = 最新那份 */
  onlyName?: string,
): Promise<DavBackupInfo> {
  const base = normalizeDavUrl(cfg.url);
  const target = base + BACKUP_FILENAME;
  const auth = basicAuth(cfg);

  try {
    // 指定了具体某一份（从「云端历史」里挑）就只取它
    if (onlyName) {
      const res = await fetch(normalizeDavUrl(cfg.url) + encodeURIComponent(onlyName), {
        method: 'GET',
        headers: { Authorization: auth },
      });
      if (!res.ok) throw new Error(`取回「${onlyName}」失败：${davError(res.status)}`);
      const one = await res.blob();
      return await parseDavBlob(one, cfg, passphrase, onlyName);
    }
    const blob = await fetchBackupBlob(cfg, auth);
    return await parseDavBlob(blob, cfg, passphrase, BACKUP_FILENAME, target);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new Error(
        '无法连接 WebDAV 服务器：网络不可达，或浏览器直连被跨域（CORS）策略拦截（桌面版可正常使用）',
      );
    }
    throw e;
  }
}