// VidaOS 数据持久化 - Dexie 封装
import Dexie, { type Table } from 'dexie';
import type { AppState, MediaFile, TabKey } from '@/types';
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
    // 兼容迁移：
    // 1) 旧版本含内置音景轨道（WebAudio 合成，无实体文件），
    //    新版已移除内置音频，只保留用户自己导入的本地文件曲目。
    // 2) 信箱功能已移除（v4 数据模型）：剥离旧 letters 数据，并清理指向
    //    已删除信件的收藏记录，避免收藏夹出现「已删除」空项。
    // 3) lastTab 归一化：旧数据可能持久化了已不存在的 tab（如 'notes'），
    //    恢复时回退到 'desk'，防止启动后 setTab 到无效 key。
    const lastTab: TabKey = isTabKey(row.data.settings?.lastTab)
      ? row.data.settings!.lastTab
      : 'desk';
    const data: AppState = {
      ...row.data,
      tracks: (row.data.tracks ?? []).filter(
        (t) => !(t as { builtin?: unknown }).builtin,
      ),
      favorites: (row.data.favorites ?? []).filter(
        // 运行时旧数据可能含 letter 收藏（类型已收窄，需按 string 比较）
        (f) => (f.refType as string) !== 'letter',
      ),
      // v4.2：碎片流 + Agent 会话/配置/资料库/记忆馆（旧数据无这些字段，给默认空值）
      fragments: (row.data as { fragments?: unknown }).fragments as AppState['fragments'] ?? [],
      // v4.3：灵感支持星标与多图（旧灵感数据无 starred/imageIds，逐条补默认值，避免 item.imageIds.length 运行时崩溃）
      notes: {
        ...((row.data as { notes?: AppState['notes'] }).notes ?? {
          inspiration: [],
          schedule: [],
          todo: [],
        }),
        inspiration: (
          ((row.data as { notes?: AppState['notes'] }).notes?.inspiration ?? []) as AppState['notes']['inspiration']
        ).map((n) => ({
          ...n,
          starred: (n as { starred?: boolean }).starred ?? false,
          imageIds: (n as { imageIds?: string[] }).imageIds ?? [],
        })),
      } as AppState['notes'],
      agentSessions:
        ((row.data as { agentSessions?: unknown }).agentSessions as AppState['agentSessions'] | undefined) ?? [],
      agentConfig: {
        baseUrl: '',
        apiKey: '',
        model: '',
        persona: '',
        ...((row.data as { agentConfig?: unknown }).agentConfig as Partial<AppState['agentConfig']> | undefined),
      },
      agentDocs: ((row.data as { agentDocs?: unknown }).agentDocs as AppState['agentDocs'] | undefined) ?? [],
      agentMemories: ((row.data as { agentMemories?: unknown }).agentMemories as AppState['agentMemories'] | undefined) ?? [],
      settings: { ...row.data.settings, lastTab },
    };
    return data;
  } catch (err) {
    console.error('[VidaOS] loadState failed', err);
    return null;
  }
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
    },
    tracks: [],
    fragments: [],
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
    },
  };
}
