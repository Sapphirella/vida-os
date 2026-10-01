// VidaOS 数据持久化 - Dexie 封装
import Dexie, { type Table } from 'dexie';
import type { AppState, MediaFile, TabKey, Album } from '@/types';
import { isTabKey } from '@/types';
import { DEFAULT_BACKGROUND_PRESET } from './backgrounds';

class VidaDB extends Dexie {
  state!: Table<{ id: string; data: AppState }, string>;
  files!: Table<MediaFile, string>;
  /** 杂项（如本地备份文件夹句柄）；只放可结构化克隆的值 */
  meta!: Table<{ id: string; value: unknown }, string>;

  constructor() {
    super('vidaos');
    this.version(1).stores({
      state: 'id',
      files: 'id, createdAt',
    });
    // v2 仅新增 meta 表，已有 state/files 数据自动保留
    this.version(2).stores({
      state: 'id',
      files: 'id, createdAt',
      meta: 'id',
    });
  }
}

export const db = new VidaDB();

const STATE_KEY = 'root';

export async function loadState(): Promise<AppState | null> {
  try {
    const row = await db.state.get(STATE_KEY);
    if (!row?.data) return null;
    return normalizeState(row.data);
  } catch (err) {
    console.error('[VidaOS] loadState failed', err);
    return null;
  }
}

/**
 * 把「旧版本 / 外部来源」的 state 归一化成当前数据模型。
 *
 * ⚠️ 三条恢复路径都必须走这里，不能只在 loadState 里做迁移：
 *   ① IndexedDB 启动加载（loadState）
 *   ② 导入 JSON / Markdown / TXT（`useAppStore.importState`）
 *   ③ WebDAV 云端取回、本地文件夹快照恢复（同样经 importState 落地）
 * 只在 ① 做兜底的话，导入一份 v4.2 及更早的备份会绕过迁移、把旧字段直接灌进
 * store —— 打开「便签 · 灵感」立刻因 `item.imageIds.length` 抛 TypeError，
 * 错误边界接管且「重试」无效（内存里仍是旧数据），只有刷新才好（v4.3.3 修）。
 */
export function normalizeState(raw: Partial<AppState> | null | undefined): AppState {
  const d = defaultState();
  const r = (raw ?? {}) as Partial<AppState>;
  // lastTab 归一化：旧数据可能持久化了已不存在的 tab（如 'notes'），回退 'desk'
  const lastTab: TabKey = isTabKey(r.settings?.lastTab) ? r.settings!.lastTab : 'desk';
  return {
    ...d,
    ...r,
    version: 3,
    // 旧版本含内置音景轨道（WebAudio 合成，无实体文件），新版已移除
    categories: {
      ...d.categories,
      ...(r.categories ?? {}),
      // v4.4.2：书籍标签桶 —— 旧数据没有时补空数组
      book: [...(r.categories?.book ?? d.categories.book ?? [])],
    },
    tracks: (r.tracks ?? []).filter((t) => !(t as { builtin?: unknown }).builtin),
    // 信箱功能已移除（v4 数据模型）：清理指向已删除信件的收藏
    favorites: (r.favorites ?? []).filter((f) => (f.refType as string) !== 'letter'),
    notes: {
      ...d.notes,
      ...(r.notes ?? {}),
      // v4.3：灵感支持星标与多图，旧灵感数据逐条补默认值
      inspiration: (r.notes?.inspiration ?? []).map((n) => ({
        ...n,
        starred: (n as { starred?: boolean }).starred ?? false,
        imageIds: (n as { imageIds?: string[] }).imageIds ?? [],
      })),
      schedule: r.notes?.schedule ?? [],
      todo: r.notes?.todo ?? [],
    },
    // 馆藏（v4.4）：碎片流已移除，旧数据里的 fragments 字段**故意不迁移**
    // （用户确认彻底删除）；逐本兜底 marks / charCount，防止历史数据缺字段炸渲染
    books: (r.books ?? []).map((b) => ({
      ...b,
      marks: b.marks ?? [],
      charCount: b.charCount ?? b.content?.length ?? 0,
      format: b.format === 'md' ? 'md' : 'txt',
      pinned: b.pinned ?? false,
      tags: b.tags ?? [],
    })),
    // 相册（v4.5）：旧数据没有时补默认星标集；任何情况下都保证星标集存在
    albums: (() => {
      const raw = r.albums ?? [];
      return raw.some((a) => a.starred) ? raw : [STARRED_ALBUM, ...raw];
    })(),
    albumGroups: (r.albumGroups ?? []).map((g) => ({
      ...g,
      caption: g.caption ?? '',
      imageIds: g.imageIds ?? [],
    })),
    albumStars: r.albumStars ?? [],
    agentSessions: r.agentSessions ?? [],
    agentConfig: { ...d.agentConfig, ...(r.agentConfig ?? {}) },
    agentDocs: r.agentDocs ?? [],
    agentMemories: r.agentMemories ?? [],
    settings: { ...d.settings, ...(r.settings ?? {}), lastTab },
  };
}

export async function saveState(state: AppState): Promise<void> {
  try {
    await db.state.put({ id: STATE_KEY, data: state });
  } catch (err) {
    console.error('[VidaOS] saveState failed', err);
  }
}

// 文件（图片/音频）
export async function putFile(file: Omit<MediaFile, 'createdAt'>): Promise<string> {
  const id = file.id;
  await db.files.put({ ...file, createdAt: Date.now() });
  return id;
}

export async function getFile(id: string): Promise<MediaFile | undefined> {
  return db.files.get(id);
}

export async function deleteFile(id: string): Promise<void> {
  await db.files.delete(id);
}

export async function listFiles(): Promise<MediaFile[]> {
  return db.files.orderBy('createdAt').reverse().toArray();
}

// ============================================================
// 初始状态
// ============================================================

/** 星标集：全应用唯一、置顶显示、不可改名/删除（相册 v4.5） */
export const STARRED_ALBUM_ID = 'album-starred';
const STARRED_ALBUM: Album = {
  id: STARRED_ALBUM_ID,
  name: '星标集',
  starred: true,
  createdAt: 0,
  updatedAt: 0,
};

export function defaultState(): AppState {
  return {
    version: 3,
    profile: {
      name: '匿名旅人',
      signature: '在安静的日子里，慢慢写下自己的生活。',
      backgroundPreset: DEFAULT_BACKGROUND_PRESET,
    },
    collections: [],
    articles: [],
    moments: [],
    favorites: [],
    notes: {
      inspiration: [],
      schedule: [],
      todo: [],
    },
    categories: {
      inspiration: ['随想', '句子', '梦'],
      schedule: ['生活', '工作', '学习'],
      todo: ['生活', '工作', '学习'],
      book: [],
    },
    tracks: [],
    // 馆藏（v4.4）：碎片流已整体移除，这一格换成书架
    books: [],
    // 相册（v4.5）：预置星标集，其余图集由用户新建
    albums: [STARRED_ALBUM],
    albumGroups: [],
    albumStars: [],
    agentSessions: [],
    agentConfig: {
      baseUrl: '',
      apiKey: '',
      model: '',
      persona: '',
    },
    agentDocs: [],
    agentMemories: [],
    settings: {
      lastTab: 'desk',
      // v4.5.3：Agent 入口开关，默认开启（不用 AI 的用户可在设置页关掉，
      // 底栏会从 5 格变 4 格自动重排）。旧数据没有该字段时按开启处理。
      agentEnabled: true,
    },
  };
}
