// ============================================================
// 本地文件夹快照备份
//
// 用 File System Access API 让用户指定一个本地文件夹，点「保存快照」就把当前
// 全部数据写进去；最多保留 MAX_SNAPSHOTS 份，超出自动删除最早的一份。
// 手动导出的文件（走下载）不落在这个文件夹里，因此不占用快照额度。
//
// 体积优化（参考 Nookery 的 .backup 做法）：
//   - state 用原生 CompressionStream('gzip') 压缩（gzip 后的 JSON 通常只剩 ~15%）
//   - 图片/音频直接以原始 Blob 写成独立文件，**不做 base64**（省掉 33% 膨胀）
//   - 每份快照是一个文件夹：manifest.json + data.json.gz + files/<fileId>
// ============================================================
import { db, putFile } from './db';
import { collectFileIds } from './exportImport';
import type { AppState } from '@/types';

export const MAX_SNAPSHOTS = 10;
const SNAP_PREFIX = 'vidaos-snapshot-';
const HANDLE_KEY = 'dataFolderHandle';

/** 最小化的目录/文件句柄结构，便于测试时注入内存实现 */
export interface DirHandle {
  name: string;
  kind: 'directory';
  getDirectoryHandle(name: string, opts?: { create?: boolean }): Promise<DirHandle>;
  getFileHandle(name: string, opts?: { create?: boolean }): Promise<FileHandle>;
  removeEntry(name: string, opts?: { recursive?: boolean }): Promise<void>;
  entries(): AsyncIterableIterator<[string, DirHandle | FileHandle]>;
  queryPermission?(d: { mode: string }): Promise<PermissionState>;
  requestPermission?(d: { mode: string }): Promise<PermissionState>;
}

export interface FileHandle {
  name: string;
  kind: 'file';
  getFile(): Promise<File>;
  createWritable(): Promise<{ write(data: Blob | string): Promise<void>; close(): Promise<void> }>;
}

export interface SnapshotInfo {
  name: string;
  createdAt: number;
  bytes: number;
  fileCount: number;
  counts: { articles: number; moments: number; letters: number; notes: number };
}

export const supportsFolderPicker = (): boolean =>
  typeof (window as unknown as { showDirectoryPicker?: unknown }).showDirectoryPicker === 'function';

// ── gzip ──────────────────────────────────────────────────────
async function gzip(text: string): Promise<Blob> {
  const stream = new Blob([text]).stream().pipeThrough(new CompressionStream('gzip'));
  return new Response(stream).blob();
}

async function gunzip(blob: Blob): Promise<string> {
  const stream = blob.stream().pipeThrough(new DecompressionStream('gzip'));
  return new Response(stream).text();
}

async function writeFile(dir: DirHandle, name: string, data: Blob | string): Promise<void> {
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

// ── 文件夹选择与权限 ──────────────────────────────────────────

/** 让用户选一个本地文件夹，并把句柄存进 IndexedDB 以便下次直接用 */
export async function pickDataFolder(): Promise<string> {
  if (!supportsFolderPicker()) {
    throw new Error('当前浏览器不支持选择本地文件夹（请用 Chrome 或 Edge 打开）');
  }
  const picker = (window as unknown as {
    showDirectoryPicker: (o?: unknown) => Promise<DirHandle>;
  }).showDirectoryPicker;
  const handle = await picker({ mode: 'readwrite', id: 'vidaos-data' });
  await handle.requestPermission?.({ mode: 'readwrite' });
  await db.meta.put({ id: HANDLE_KEY, value: handle });
  return handle.name;
}

/** 取回上次选择的文件夹（可能需要在写入时重新授权） */
export async function getSavedFolder(): Promise<DirHandle | null> {
  const row = await db.meta.get(HANDLE_KEY);
  return (row?.value as DirHandle | undefined) ?? null;
}

export async function folderPermission(handle: DirHandle): Promise<PermissionState> {
  if (!handle.queryPermission) return 'granted';
  return handle.queryPermission({ mode: 'readwrite' });
}

/** 写入前确保有权限；需要时向用户重新请求 */
async function ensureWritable(handle: DirHandle): Promise<void> {
  if ((await folderPermission(handle)) === 'granted') return;
  const res = await handle.requestPermission?.({ mode: 'readwrite' });
  if (res !== 'granted') throw new Error('文件夹权限被拒绝，请重新选择文件夹');
}

export function stamp(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return (
    `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}` +
    `-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`
  );
}

/** 列出文件夹里属于本应用的快照目录（时间戳命名 → 字典序即时间序） */
export async function listSnapshotNames(root: DirHandle): Promise<string[]> {
  const names: string[] = [];
  for await (const [name, h] of root.entries()) {
    if (h.kind === 'directory' && name.startsWith(SNAP_PREFIX)) names.push(name);
  }
  return names.sort();
}

/** 只清理本应用写下的快照目录，手动导出的文件不受影响 */
async function pruneSnapshots(root: DirHandle): Promise<string[]> {
  const names = await listSnapshotNames(root);
  const removed: string[] = [];
  while (names.length - removed.length > MAX_SNAPSHOTS) {
    const oldest = names[removed.length];
    await root.removeEntry(oldest, { recursive: true });
    removed.push(oldest);
  }
  return removed;
}

// ── 保存快照 ──────────────────────────────────────────────────

/** 目录是否已存在（File System Access 在不带 create 且不存在时会抛错） */
async function dirExists(root: DirHandle, name: string): Promise<boolean> {
  try {
    await root.getDirectoryHandle(name);
    return true;
  } catch {
    return false;
  }
}

/** 同一秒内连续保存时追加序号，避免互相覆盖 */
async function uniqueSnapshotName(root: DirHandle): Promise<string> {
  const base = SNAP_PREFIX + stamp();
  if (!(await dirExists(root, base))) return base;
  for (let n = 2; n < 1000; n += 1) {
    const candidate = `${base}-${n}`;
    if (!(await dirExists(root, candidate))) return candidate;
  }
  throw new Error('同一秒内快照过多，请稍后再试');
}

/** 把一份快照写进指定文件夹（可注入 root，便于测试） */
export async function saveSnapshotTo(
  root: DirHandle,
  state: AppState,
): Promise<{ info: SnapshotInfo; removed: string[] }> {
  const name = await uniqueSnapshotName(root);
  const dir = await root.getDirectoryHandle(name, { create: true });

  const payload = JSON.stringify({ app: 'VidaOS', kind: 'snapshot', createdAt: Date.now(), state });
  const gz = await gzip(payload);
  await writeFile(dir, 'data.json.gz', gz);

  // 媒体文件：原始 Blob 直存，不做 base64
  let fileCount = 0;
  let bytes = gz.size;
  const used = collectFileIds(state);
  if (used.size > 0) {
    const filesDir = await dir.getDirectoryHandle('files', { create: true });
    for (const id of used) {
      const f = await db.files.get(id);
      if (!f) continue;
      await writeFile(filesDir, id, f.blob);
      fileCount += 1;
      bytes += f.blob.size;
    }
  }

  const counts = {
    articles: state.articles.length,
    moments: state.moments.length,
    letters: state.letters.length,
    notes:
      state.notes.inspiration.length + state.notes.schedule.length + state.notes.todo.length,
  };
  const info: SnapshotInfo = { name, createdAt: Date.now(), bytes, fileCount, counts };
  // manifest 最后写：作为「这份快照已写完」的标记
  await writeFile(
    dir,
    'manifest.json',
    new Blob([JSON.stringify(info, null, 2)], { type: 'application/json' }),
  );

  const removed = await pruneSnapshots(root);
  return { info, removed };
}

/** 用已保存的文件夹写一份快照 */
export async function saveSnapshot(
  state: AppState,
): Promise<{ info: SnapshotInfo; removed: string[] }> {
  const root = await getSavedFolder();
  if (!root) throw new Error('还没有选择备份文件夹');
  await ensureWritable(root);
  return saveSnapshotTo(root, state);
}

/** 列出全部快照（新的在前） */
export async function listSnapshots(root: DirHandle): Promise<SnapshotInfo[]> {
  const names = (await listSnapshotNames(root)).reverse();
  const out: SnapshotInfo[] = [];
  for (const name of names) {
    try {
      const dir = await root.getDirectoryHandle(name);
      const fh = await dir.getFileHandle('manifest.json');
      const file = await fh.getFile();
      out.push(JSON.parse(await file.text()) as SnapshotInfo);
    } catch {
      // 没有 manifest 说明那次写入没完成，跳过
    }
  }
  return out;
}

export async function listSavedSnapshots(): Promise<SnapshotInfo[]> {
  const root = await getSavedFolder();
  if (!root) return [];
  return listSnapshots(root);
}

export async function deleteSnapshot(name: string): Promise<void> {
  const root = await getSavedFolder();
  if (!root) throw new Error('还没有选择备份文件夹');
  await ensureWritable(root);
  await root.removeEntry(name, { recursive: true });
}

/** 从快照读回 AppState，并把其中的媒体文件写回 IndexedDB */
export async function restoreSnapshotTo(root: DirHandle, name: string): Promise<AppState> {
  const dir = await root.getDirectoryHandle(name);
  const dataFile = await (await dir.getFileHandle('data.json.gz')).getFile();
  const parsed = JSON.parse(await gunzip(dataFile)) as { state: AppState };

  try {
    const filesDir = await dir.getDirectoryHandle('files');
    for await (const [fname, h] of filesDir.entries()) {
      if (h.kind !== 'file') continue;
      const file = await h.getFile();
      await putFile({
        id: fname,
        blob: file,
        mime: file.type || 'application/octet-stream',
        name: fname,
        size: file.size,
      });
    }
  } catch {
    // 没有 files 目录＝这份快照只含文本
  }
  return parsed.state;
}

export async function restoreSnapshot(name: string): Promise<AppState> {
  const root = await getSavedFolder();
  if (!root) throw new Error('还没有选择备份文件夹');
  await ensureWritable(root);
  return restoreSnapshotTo(root, name);
}

/** 人类可读体积 */
export function humanBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(2)} MB`;
}
