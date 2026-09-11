// VidaOS 全局状态 - Zustand
import { create } from 'zustand';
import type {
  AppState,
  Profile,
  Collection,
  Article,
  Moment,
  Letter,
  Favorite,
  InspirationNote,
  ScheduleNote,
  TodoNote,
  Categories,
  Track,
  Settings,
  TabKey,
} from '@/types';
import { defaultState, loadState, saveState } from '@/lib/db';
import { debounce, uid, now } from '@/lib/utils';

// ============================================================
// 持久化（防抖）
// ============================================================

const persist = debounce((state: AppState) => {
  saveState(state);
}, 400);

/** 按 id 合并两个列表（保留现有项，追加 incoming 中不存在的新项） */
function mergeById<T extends { id: string }>(cur: T[], incoming?: T[]): T[] {
  if (!incoming || incoming.length === 0) return cur;
  return [...cur, ...incoming.filter((x) => !cur.some((c) => c.id === x.id))];
}

// ============================================================
// Store
// ============================================================

interface Actions {
  // 全局
  hydrate: () => Promise<void>;
  resetAll: () => Promise<void>;

  // 档案
  updateProfile: (patch: Partial<Profile>) => void;

  // 合集
  addCollection: (name: string, desc?: string) => string;
  updateCollection: (id: string, patch: Partial<Collection>) => void;
  deleteCollection: (id: string) => void;

  // 文章
  addArticle: (article: Omit<Article, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateArticle: (id: string, patch: Partial<Article>) => void;
  deleteArticle: (id: string) => void;

  // 动态
  addMoment: (moment: Omit<Moment, 'id' | 'createdAt'>) => string;
  updateMoment: (id: string, patch: Partial<Moment>) => void;
  deleteMoment: (id: string) => void;

  // 信件
  addLetter: (letter: Omit<Letter, 'id' | 'createdAt' | 'unread'>) => string;
  updateLetter: (id: string, patch: Partial<Letter>) => void;
  deleteLetter: (id: string) => void;
  markLetterRead: (id: string) => void;

  // 收藏
  toggleFavorite: (refType: Favorite['refType'], refId: string) => void;
  isFavorited: (refType: Favorite['refType'], refId: string) => boolean;

  // 灵感
  addInspiration: (content: string, category?: string) => string;
  updateInspiration: (id: string, patch: Partial<InspirationNote>) => void;
  deleteInspiration: (id: string) => void;

  // 日程
  addSchedule: (item: Omit<ScheduleNote, 'id' | 'createdAt' | 'updatedAt' | 'done'>) => string;
  updateSchedule: (id: string, patch: Partial<ScheduleNote>) => void;
  deleteSchedule: (id: string) => void;
  toggleScheduleDone: (id: string) => void;

  // 待办
  addTodo: (content: string, category?: string) => string;
  updateTodo: (id: string, patch: Partial<TodoNote>) => void;
  deleteTodo: (id: string) => void;
  toggleTodo: (id: string) => void;

  // 分类
  addCategory: (which: keyof Categories, name: string) => void;
  removeCategory: (which: keyof Categories, name: string) => void;
  renameCategory: (which: keyof Categories, oldName: string, newName: string) => void;

  // 音乐
  addTrack: (track: Omit<Track, 'id' | 'createdAt'>) => string;
  deleteTrack: (id: string) => void;

  // 设置
  setLastTab: (tab: TabKey) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  // 导入
  importState: (incoming: Partial<AppState>, mode: 'merge' | 'overwrite') => void;
}

type Store = AppState & Actions;

export const useAppStore = create<Store>((set, get) => ({
  ...defaultState(),

  hydrate: async () => {
    const loaded = await loadState();
    if (loaded) {
      set({ ...defaultState(), ...loaded, version: 3 });
    } else {
      persist(get());
    }
  },

  resetAll: async () => {
    const fresh = defaultState();
    set(fresh);
    persist(fresh);
  },

  updateProfile: (patch) => {
    set((s) => ({ profile: { ...s.profile, ...patch } }));
    persist(get());
  },

  // 合集
  addCollection: (name, desc = '') => {
    const id = uid('col_');
    set((s) => ({
      collections: [...s.collections, { id, name, desc, createdAt: now() }],
    }));
    persist(get());
    return id;
  },
  updateCollection: (id, patch) => {
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
    persist(get());
  },
  deleteCollection: (id) => {
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      articles: s.articles.map((a) =>
        a.collectionId === id ? { ...a, collectionId: undefined } : a,
      ),
    }));
    persist(get());
  },

  // 文章
  addArticle: (article) => {
    const id = uid('art_');
    set((s) => ({
      articles: [{ ...article, id, createdAt: now(), updatedAt: now() }, ...s.articles],
    }));
    persist(get());
    return id;
  },
  updateArticle: (id, patch) => {
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: now() } : a,
      ),
    }));
    persist(get());
  },
  deleteArticle: (id) => {
    set((s) => ({
      articles: s.articles.filter((a) => a.id !== id),
      favorites: s.favorites.filter((f) => !(f.refType === 'article' && f.refId === id)),
    }));
    persist(get());
  },

  // 动态
  addMoment: (moment) => {
    const id = uid('mom_');
    set((s) => ({
      moments: [{ ...moment, id, createdAt: now() }, ...s.moments],
    }));
    persist(get());
    return id;
  },
  updateMoment: (id, patch) => {
    set((s) => ({
      moments: s.moments.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    }));
    persist(get());
  },
  deleteMoment: (id) => {
    set((s) => ({
      moments: s.moments.filter((m) => m.id !== id),
      favorites: s.favorites.filter((f) => !(f.refType === 'moment' && f.refId === id)),
    }));
    persist(get());
  },

  // 信件
  addLetter: (letter) => {
    const id = uid('let_');
    set((s) => ({
      letters: [{ ...letter, id, unread: true, createdAt: now() }, ...s.letters],
    }));
    persist(get());
    return id;
  },
  updateLetter: (id, patch) => {
    set((s) => ({
      letters: s.letters.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
    persist(get());
  },
  deleteLetter: (id) => {
    set((s) => ({
      letters: s.letters.filter((l) => l.id !== id),
      favorites: s.favorites.filter((f) => !(f.refType === 'letter' && f.refId === id)),
    }));
    persist(get());
  },
  markLetterRead: (id) => {
    set((s) => ({
      letters: s.letters.map((l) => (l.id === id ? { ...l, unread: false } : l)),
    }));
    persist(get());
  },

  // 收藏
  toggleFavorite: (refType, refId) => {
    const exists = get().favorites.find(
      (f) => f.refType === refType && f.refId === refId,
    );
    if (exists) {
      set((s) => ({
        favorites: s.favorites.filter((f) => f.id !== exists.id),
      }));
    } else {
      const id = uid('fav_');
      set((s) => ({
        favorites: [
          ...s.favorites,
          { id, refType, refId, createdAt: now() },
        ],
      }));
    }
    persist(get());
  },
  isFavorited: (refType, refId) => {
    return get().favorites.some(
      (f) => f.refType === refType && f.refId === refId,
    );
  },

  // 灵感
  addInspiration: (content, category = '随想') => {
    const id = uid('ins_');
    set((s) => ({
      notes: {
        ...s.notes,
        inspiration: [
          { id, content, category, createdAt: now(), updatedAt: now() },
          ...s.notes.inspiration,
        ],
      },
    }));
    persist(get());
    return id;
  },
  updateInspiration: (id, patch) => {
    set((s) => ({
      notes: {
        ...s.notes,
        inspiration: s.notes.inspiration.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: now() } : n,
        ),
      },
    }));
    persist(get());
  },
  deleteInspiration: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        inspiration: s.notes.inspiration.filter((n) => n.id !== id),
      },
    }));
    persist(get());
  },

  // 日程
  addSchedule: (item) => {
    const id = uid('sch_');
    set((s) => ({
      notes: {
        ...s.notes,
        schedule: [
          { ...item, id, done: false, createdAt: now(), updatedAt: now() },
          ...s.notes.schedule,
        ],
      },
    }));
    persist(get());
    return id;
  },
  updateSchedule: (id, patch) => {
    set((s) => ({
      notes: {
        ...s.notes,
        schedule: s.notes.schedule.map((n) =>
          n.id === id ? { ...n, ...patch, updatedAt: now() } : n,
        ),
      },
    }));
    persist(get());
  },
  deleteSchedule: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        schedule: s.notes.schedule.filter((n) => n.id !== id),
      },
    }));
    persist(get());
  },
  toggleScheduleDone: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        schedule: s.notes.schedule.map((n) =>
          n.id === id ? { ...n, done: !n.done, updatedAt: now() } : n,
        ),
      },
    }));
    persist(get());
  },

  // 待办
  addTodo: (content, category = '生活') => {
    const id = uid('td_');
    set((s) => ({
      notes: {
        ...s.notes,
        todo: [
          { id, content, category, done: false, createdAt: now() },
          ...s.notes.todo,
        ],
      },
    }));
    persist(get());
    return id;
  },
  updateTodo: (id, patch) => {
    set((s) => ({
      notes: {
        ...s.notes,
        todo: s.notes.todo.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      },
    }));
    persist(get());
  },
  deleteTodo: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        todo: s.notes.todo.filter((n) => n.id !== id),
      },
    }));
    persist(get());
  },
  toggleTodo: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        todo: s.notes.todo.map((n) =>
          n.id === id
            ? {
                ...n,
                done: !n.done,
                completedAt: !n.done ? now() : undefined,
              }
            : n,
        ),
      },
    }));
    persist(get());
  },

  // 分类
  addCategory: (which, name) => {
    set((s) => {
      if (s.categories[which].includes(name)) return s;
      return {
        categories: {
          ...s.categories,
          [which]: [...s.categories[which], name],
        },
      };
    });
    persist(get());
  },
  removeCategory: (which, name) => {
    set((s) => ({
      categories: {
        ...s.categories,
        [which]: s.categories[which].filter((c) => c !== name),
      },
    }));
    persist(get());
  },
  renameCategory: (which, oldName, newName) => {
    set((s) => {
      if (!s.categories[which].includes(oldName)) return s;
      const list = s.categories[which].map((c) => (c === oldName ? newName : c));
      // 同步 note.category
      const noteKey = which as 'inspiration' | 'schedule' | 'todo';
      const updatedNotes = s.notes[noteKey].map((n: any) =>
        n.category === oldName ? { ...n, category: newName } : n,
      );
      return {
        categories: { ...s.categories, [which]: list },
        notes: { ...s.notes, [noteKey]: updatedNotes },
      };
    });
    persist(get());
  },

  // 音乐
  addTrack: (track) => {
    const id = uid('trk_');
    set((s) => ({
      tracks: [{ ...track, id, createdAt: now() }, ...s.tracks],
    }));
    persist(get());
    return id;
  },
  deleteTrack: (id) => {
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
    }));
    persist(get());
  },

  // 设置
  setLastTab: (tab) => {
    set((s) => ({ settings: { ...s.settings, lastTab: tab } }));
    persist(get());
  },
  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    persist(get());
  },

  // 导入（incoming 允许是 Partial：Markdown/TXT 导入只带 articles）
  importState: (incoming, mode) => {
    if (mode === 'overwrite') {
      set({ ...defaultState(), ...incoming, version: 3 });
    } else {
      // 合并：保留现有数据，追加 incoming 中不存在的新项
      const cur = get();
      const merged: AppState = {
        ...cur,
        profile: incoming.profile ?? cur.profile,
        collections: mergeById(cur.collections, incoming.collections),
        articles: mergeById(cur.articles, incoming.articles),
        moments: mergeById(cur.moments, incoming.moments),
        letters: mergeById(cur.letters, incoming.letters),
        favorites: [
          ...cur.favorites,
          ...(incoming.favorites ?? []).filter(
            (f) =>
              !cur.favorites.find(
                (x) => x.refType === f.refType && x.refId === f.refId,
              ),
          ),
        ],
        notes: {
          inspiration: mergeById(cur.notes.inspiration, incoming.notes?.inspiration),
          schedule: mergeById(cur.notes.schedule, incoming.notes?.schedule),
          todo: mergeById(cur.notes.todo, incoming.notes?.todo),
        },
        categories: cur.categories,
        tracks: mergeById(cur.tracks, incoming.tracks),
        settings: cur.settings,
      };
      set(merged);
    }
    persist(get());
  },
}));
