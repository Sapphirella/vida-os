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
  importState: (incoming: AppState, mode: 'merge' | 'overwrite') => void;
}

type Store = AppState & Actions;

export const useAppStore = create<Store>((set, get) => ({
  ...defaultState(),

  hydrate: async () => {
    const loaded = await loadState();
    if (loaded) {
      set({ ...defaultState(), ...loaded, version: 3 } as any);
    } else {
      persist(get());
    }
  },

  resetAll: async () => {
    const fresh = defaultState();
    set(fresh as any);
    persist(fresh);
  },

  updateProfile: (patch) => {
    set((s) => ({ profile: { ...s.profile, ...patch } } as any));
    persist(get());
  },

  // 合集
  addCollection: (name, desc = '') => {
    const id = uid('col_');
    set((s) => ({
      collections: [...s.collections, { id, name, desc, createdAt: now() }],
    } as any));
    persist(get());
    return id;
  },
  updateCollection: (id, patch) => {
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    } as any));
    persist(get());
  },
  deleteCollection: (id) => {
    set((s) => ({
      collections: s.collections.filter((c) => c.id !== id),
      articles: s.articles.map((a) =>
        a.collectionId === id ? { ...a, collectionId: undefined } : a,
      ),
    } as any));
    persist(get());
  },

  // 文章
  addArticle: (article) => {
    const id = uid('art_');
    set((s) => ({
      articles: [{ ...article, id, createdAt: now(), updatedAt: now() }, ...s.articles],
    } as any));
    persist(get());
    return id;
  },
  updateArticle: (id, patch) => {
    set((s) => ({
      articles: s.articles.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: now() } : a,
      ),
    } as any));
    persist(get());
  },
  deleteArticle: (id) => {
    set((s) => ({
      articles: s.articles.filter((a) => a.id !== id),
      favorites: s.favorites.filter((f) => !(f.refType === 'article' && f.refId === id)),
    } as any));
    persist(get());
  },

  // 动态
  addMoment: (moment) => {
    const id = uid('mom_');
    set((s) => ({
      moments: [{ ...moment, id, createdAt: now() }, ...s.moments],
    } as any));
    persist(get());
    return id;
  },
  updateMoment: (id, patch) => {
    set((s) => ({
      moments: s.moments.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    } as any));
    persist(get());
  },
  deleteMoment: (id) => {
    set((s) => ({
      moments: s.moments.filter((m) => m.id !== id),
      favorites: s.favorites.filter((f) => !(f.refType === 'moment' && f.refId === id)),
    } as any));
    persist(get());
  },

  // 信件
  addLetter: (letter) => {
    const id = uid('let_');
    set((s) => ({
      letters: [{ ...letter, id, unread: true, createdAt: now() }, ...s.letters],
    } as any));
    persist(get());
    return id;
  },
  updateLetter: (id, patch) => {
    set((s) => ({
      letters: s.letters.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    } as any));
    persist(get());
  },
  deleteLetter: (id) => {
    set((s) => ({
      letters: s.letters.filter((l) => l.id !== id),
      favorites: s.favorites.filter((f) => !(f.refType === 'letter' && f.refId === id)),
    } as any));
    persist(get());
  },
  markLetterRead: (id) => {
    set((s) => ({
      letters: s.letters.map((l) => (l.id === id ? { ...l, unread: false } : l)),
    } as any));
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
      } as any));
    } else {
      const id = uid('fav_');
      set((s) => ({
        favorites: [
          ...s.favorites,
          { id, refType, refId, createdAt: now() },
        ],
      } as any));
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
    } as any));
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
    } as any));
    persist(get());
  },
  deleteInspiration: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        inspiration: s.notes.inspiration.filter((n) => n.id !== id),
      },
    } as any));
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
    } as any));
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
    } as any));
    persist(get());
  },
  deleteSchedule: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        schedule: s.notes.schedule.filter((n) => n.id !== id),
      },
    } as any));
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
    } as any));
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
    } as any));
    persist(get());
    return id;
  },
  updateTodo: (id, patch) => {
    set((s) => ({
      notes: {
        ...s.notes,
        todo: s.notes.todo.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      },
    } as any));
    persist(get());
  },
  deleteTodo: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        todo: s.notes.todo.filter((n) => n.id !== id),
      },
    } as any));
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
    } as any));
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
      } as any;
    });
    persist(get());
  },
  removeCategory: (which, name) => {
    set((s) => ({
      categories: {
        ...s.categories,
        [which]: s.categories[which].filter((c) => c !== name),
      },
    } as any));
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
      } as any;
    });
    persist(get());
  },

  // 音乐
  addTrack: (track) => {
    const id = uid('trk_');
    set((s) => ({
      tracks: [{ ...track, id, createdAt: now() }, ...s.tracks],
    } as any));
    persist(get());
    return id;
  },
  deleteTrack: (id) => {
    set((s) => ({
      tracks: s.tracks.filter((t) => t.id !== id),
    } as any));
    persist(get());
  },

  // 设置
  setLastTab: (tab) => {
    set((s) => ({ settings: { ...s.settings, lastTab: tab } } as any));
    persist(get());
  },
  updateSettings: (patch) => {
    set((s) => ({ settings: { ...s.settings, ...patch } } as any));
    persist(get());
  },

  // 导入
  importState: (incoming, mode) => {
    if (mode === 'overwrite') {
      set({ ...defaultState(), ...incoming, version: 3 } as any);
    } else {
      // 合并
      const cur = get();
      const merged: AppState = {
        ...cur,
        profile: incoming.profile || cur.profile,
        collections: [
          ...cur.collections,
          ...incoming.collections.filter(
            (c) => !cur.collections.find((x) => x.id === c.id),
          ),
        ],
        articles: [
          ...cur.articles,
          ...incoming.articles.filter(
            (a) => !cur.articles.find((x) => x.id === a.id),
          ),
        ],
        moments: [
          ...cur.moments,
          ...incoming.moments.filter(
            (m) => !cur.moments.find((x) => x.id === m.id),
          ),
        ],
        letters: [
          ...cur.letters,
          ...incoming.letters.filter(
            (l) => !cur.letters.find((x) => x.id === l.id),
          ),
        ],
        favorites: [
          ...cur.favorites,
          ...incoming.favorites.filter(
            (f) =>
              !cur.favorites.find(
                (x) => x.refType === f.refType && x.refId === f.refId,
              ),
          ),
        ],
        notes: {
          inspiration: [
            ...cur.notes.inspiration,
            ...incoming.notes.inspiration.filter(
              (n) => !cur.notes.inspiration.find((x) => x.id === n.id),
            ),
          ],
          schedule: [
            ...cur.notes.schedule,
            ...incoming.notes.schedule.filter(
              (n) => !cur.notes.schedule.find((x) => x.id === n.id),
            ),
          ],
          todo: [
            ...cur.notes.todo,
            ...incoming.notes.todo.filter(
              (n) => !cur.notes.todo.find((x) => x.id === n.id),
            ),
          ],
        },
        categories: cur.categories,
        tracks: [
          ...cur.tracks,
          ...incoming.tracks.filter(
            (t) => !cur.tracks.find((x) => x.id === t.id),
          ),
        ],
        settings: cur.settings,
      };
      set(merged as any);
    }
    persist(get());
  },
}));

// 便捷选择器
export const useProfile = () => useAppStore((s) => s.profile);
export const useArticles = () => useAppStore((s) => s.articles);
export const useMoments = () => useAppStore((s) => s.moments);
export const useLetters = () => useAppStore((s) => s.letters);
export const useFavorites = () => useAppStore((s) => s.favorites);
export const useNotes = () => useAppStore((s) => s.notes);
export const useCollections = () => useAppStore((s) => s.collections);
export const useTracks = () => useAppStore((s) => s.tracks);
export const useCategories = () => useAppStore((s) => s.categories);
export const useSettings = () => useAppStore((s) => s.settings);
