// VidaOS 数据持久化 - Dexie 封装
import Dexie, { type Table } from 'dexie';
import type { AppState, MediaFile } from '@/types';
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
    return row?.data ?? null;
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
    letters: [],
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
    tracks: [
      {
        id: 'builtin-rain',
        title: '夜雨',
        builtin: 'rain',
        createdAt: Date.now(),
      },
      {
        id: 'builtin-candle',
        title: '烛光',
        builtin: 'candle',
        createdAt: Date.now(),
      },
    ],
    settings: {
      lastTab: 'desk',
    },
  };
}
