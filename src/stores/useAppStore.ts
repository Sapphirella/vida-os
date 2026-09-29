// VidaOS 全局状态 - Zustand
import { create } from 'zustand';
import type {
  AppState,
  Profile,
  Collection,
  Article,
  Moment,
  Favorite,
  InspirationNote,
  ScheduleNote,
  TodoNote,
  Categories,
  Track,
  Settings,
  TabKey,
  FragmentEntry,
  AgentSession,
  AgentMessage,
  AgentConfig,
} from '@/types';
import { defaultState, loadState, saveState } from '@/lib/db';
import { debounce, uid, now } from '@/lib/utils';

// ============================================================
// 持久化（防抖）
// ============================================================

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
  addMomentComment: (momentId: string, content: string, author?: string) => string;
  deleteMomentComment: (momentId: string, commentId: string) => void;

  // 收藏
  toggleFavorite: (refType: Favorite['refType'], refId: string) => void;
  isFavorited: (refType: Favorite['refType'], refId: string) => boolean;

  // 灵感
  addInspiration: (content: string, category?: string, imageIds?: string[]) => string;
  updateInspiration: (id: string, patch: Partial<InspirationNote>) => void;
  deleteInspiration: (id: string) => void;
  toggleInspirationStar: (id: string) => void;
  convertInspirationToArticle: (id: string) => string;

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
  reorderTodo: (ids: string[]) => void;

  // 分类
  addCategory: (which: keyof Categories, name: string) => void;
  removeCategory: (which: keyof Categories, name: string) => void;
  renameCategory: (which: keyof Categories, oldName: string, newName: string) => void;

  // 音乐
  addTrack: (track: Omit<Track, 'id' | 'createdAt'>) => string;
  deleteTrack: (id: string) => void;

  // 碎片
  addFragment: (f: { content: string; imageIds?: string[]; tags?: string[] }) => string;
  updateFragment: (id: string, patch: Partial<FragmentEntry>) => void;
  deleteFragment: (id: string) => void;
  toggleFragmentStar: (id: string) => void;

  // Agent：会话
  createAgentSession: (title?: string) => string;
  updateAgentSession: (id: string, patch: Partial<AgentSession>) => void;
  deleteAgentSession: (id: string) => void;
  appendAgentMessage: (sessionId: string, msg: Omit<AgentMessage, 'id' | 'createdAt'>) => string;
  replaceAgentMessage: (sessionId: string, messageId: string, patch: Partial<AgentMessage>) => void;
  removeAgentMessage: (sessionId: string, messageId: string) => void;

  // Agent：配置 / 资料库 / 记忆馆
  updateAgentConfig: (patch: Partial<AgentConfig>) => void;
  addAgentDoc: (name: string, content: string) => string;
  deleteAgentDoc: (id: string) => void;
  addAgentMemory: (title: string, content: string) => void;
  deleteAgentMemory: (id: string) => void;
  markAgentMemoriesRead: () => void;

  // 设置
  setLastTab: (tab: TabKey) => void;
  updateSettings: (patch: Partial<Settings>) => void;

  // 导入
  importState: (incoming: Partial<AppState>, mode: 'merge' | 'overwrite') => void;
}

// 运行时标记：是否已完成首次从 IndexedDB 载入（不持久化，不入 AppState）
interface RuntimeFlags {
  hydrated: boolean;
}

type Store = AppState & Actions & RuntimeFlags;

/**
 * 只取「纯数据」字段做持久化快照。
 * 关键：不能直接把 get() 交给 IndexedDB —— store 里混着 action 函数，
 * 结构化克隆会因函数而抛 DataCloneError，导致每次保存都静默失败（数据全丢）。
 */
function snapshot(s: Store): AppState {
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
    agentConfig: s.agentConfig,
    agentDocs: s.agentDocs,
    agentMemories: s.agentMemories,
    settings: s.settings,
  };
}

// 防抖持久化：写入「纯数据」快照（绝不能把 action 函数交给 IndexedDB）
const persist = debounce((s: Store) => {
  saveState(snapshot(s));
}, 400);

export const useAppStore = create<Store>((set, get) => ({
  ...defaultState(),
  hydrated: false,

  hydrate: async () => {
    const loaded = await loadState();
    if (loaded) {
      set({ ...defaultState(), ...loaded, version: 3, hydrated: true });
    } else {
      set({ hydrated: true });
      persist(get());
    }
  },

  resetAll: async () => {
    const fresh = defaultState();
    set({ ...fresh, hydrated: true });
    persist(get());
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
  // 动态评论
  addMomentComment: (momentId, content, author) => {
    const id = uid('cmt_');
    set((s) => ({
      moments: s.moments.map((m) =>
        m.id === momentId
          ? {
              ...m,
              comments: [...(m.comments ?? []), { id, content, createdAt: now(), author }],
            }
          : m,
      ),
    }));
    persist(get());
    return id;
  },
  deleteMomentComment: (momentId, commentId) => {
    set((s) => ({
      moments: s.moments.map((m) =>
        m.id === momentId
          ? { ...m, comments: (m.comments ?? []).filter((c) => c.id !== commentId) }
          : m,
      ),
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
  addInspiration: (content, category = '随想', imageIds = []) => {
    const id = uid('ins_');
    set((s) => ({
      notes: {
        ...s.notes,
        inspiration: [
          { id, content, category, starred: false, imageIds, createdAt: now(), updatedAt: now() },
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
  toggleInspirationStar: (id) => {
    set((s) => ({
      notes: {
        ...s.notes,
        inspiration: s.notes.inspiration.map((n) =>
          n.id === id ? { ...n, starred: !n.starred, updatedAt: now() } : n,
        ),
      },
    }));
    persist(get());
  },
  convertInspirationToArticle: (id) => {
    const ins = get().notes.inspiration.find((n) => n.id === id);
    if (!ins) return '';
    const artId = uid('art_');
    const title = ins.content.split('\n')[0].slice(0, 50) || '来自灵感的文章';
    set((s) => ({
      articles: [
        {
          id: artId,
          title,
          content: ins.content,
          excerpt: ins.content.slice(0, 120),
          tags: ins.category ? [ins.category] : [],
          imageIds: ins.imageIds,
          collectionId: undefined,
          createdAt: now(),
          updatedAt: now(),
        },
        ...s.articles,
      ],
    }));
    persist(get());
    return artId;
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
  // 长按拖动排序：ids 为新的完整顺序（TODO 列表全量 id），未列出的保持不变并追加在后
  reorderTodo: (ids) => {
    set((s) => {
      const byId = new Map(s.notes.todo.map((n) => [n.id, n]));
      const ordered: TodoNote[] = [];
      const seen = new Set<string>();
      for (const id of ids) {
        const it = byId.get(id);
        if (it && !seen.has(id)) {
          ordered.push(it);
          seen.add(id);
        }
      }
      const rest = s.notes.todo.filter((n) => !seen.has(n.id));
      return { notes: { ...s.notes, todo: [...ordered, ...rest] } };
    });
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

  // 碎片
  addFragment: (f) => {
    const id = uid('frg_');
    set((s) => ({
      fragments: [
        ...s.fragments,
        {
          id,
          content: f.content,
          imageIds: f.imageIds ?? [],
          tags: f.tags ?? [],
          starred: false,
          createdAt: now(),
          updatedAt: now(),
        },
      ],
    }));
    persist(get());
    return id;
  },
  updateFragment: (id, patch) => {
    set((s) => ({
      fragments: s.fragments.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
      ),
    }));
    persist(get());
  },
  deleteFragment: (id) => {
    set((s) => ({
      fragments: s.fragments.filter((x) => x.id !== id),
    }));
    persist(get());
  },
  toggleFragmentStar: (id) => {
    set((s) => ({
      fragments: s.fragments.map((x) =>
        x.id === id ? { ...x, starred: !x.starred, updatedAt: now() } : x,
      ),
    }));
    persist(get());
  },

  // Agent：会话
  createAgentSession: (title) => {
    const id = uid('ags_');
    const t = Date.now();
    set((s) => ({
      agentSessions: [
        {
          id,
          title: title ?? '新会话',
          createdAt: t,
          updatedAt: t,
          archived: false,
          messages: [],
        },
        ...s.agentSessions,
      ],
    }));
    persist(get());
    return id;
  },
  updateAgentSession: (id, patch) => {
    set((s) => ({
      agentSessions: s.agentSessions.map((x) =>
        x.id === id ? { ...x, ...patch, updatedAt: now() } : x,
      ),
    }));
    persist(get());
  },
  deleteAgentSession: (id) => {
    set((s) => ({
      agentSessions: s.agentSessions.filter((x) => x.id !== id),
    }));
    persist(get());
  },
  appendAgentMessage: (sessionId, msg) => {
    const id = uid('agm_');
    set((s) => ({
      agentSessions: s.agentSessions.map((x) =>
        x.id === sessionId
          ? {
              ...x,
              updatedAt: now(),
              messages: [...x.messages, { ...msg, id, createdAt: now() }],
            }
          : x,
      ),
    }));
    persist(get());
    return id;
  },
  replaceAgentMessage: (sessionId, messageId, patch) => {
    set((s) => ({
      agentSessions: s.agentSessions.map((x) =>
        x.id === sessionId
          ? {
              ...x,
              updatedAt: now(),
              messages: x.messages.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
            }
          : x,
      ),
    }));
    persist(get());
  },
  removeAgentMessage: (sessionId, messageId) => {
    set((s) => ({
      agentSessions: s.agentSessions.map((x) =>
        x.id === sessionId
          ? {
              ...x,
              updatedAt: now(),
              messages: x.messages.filter((m) => m.id !== messageId),
            }
          : x,
      ),
    }));
    persist(get());
  },

  // Agent：配置 / 资料库 / 记忆馆
  updateAgentConfig: (patch) => {
    set((s) => ({ agentConfig: { ...s.agentConfig, ...patch } }));
    persist(get());
  },
  addAgentDoc: (name, content) => {
    const id = uid('agd_');
    set((s) => ({
      agentDocs: [...s.agentDocs, { id, name, content, createdAt: now() }],
    }));
    persist(get());
    return id;
  },
  deleteAgentDoc: (id) => {
    set((s) => ({
      agentDocs: s.agentDocs.filter((x) => x.id !== id),
    }));
    persist(get());
  },
  addAgentMemory: (title, content) => {
    const id = uid('agm_');
    set((s) => ({
      agentMemories: [
        { id, title, content, createdAt: now(), read: false },
        ...s.agentMemories,
      ],
    }));
    persist(get());
  },
  deleteAgentMemory: (id) => {
    set((s) => ({
      agentMemories: s.agentMemories.filter((x) => x.id !== id),
    }));
    persist(get());
  },
  markAgentMemoriesRead: () => {
    set((s) => ({
      agentMemories: s.agentMemories.map((x) => ({ ...x, read: true })),
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
      set({ ...defaultState(), ...incoming, version: 3, hydrated: true });
    } else {
      // 合并：保留现有数据，追加 incoming 中不存在的新项
      const cur = get();
      const merged: AppState = {
        ...cur,
        profile: incoming.profile ?? cur.profile,
        collections: mergeById(cur.collections, incoming.collections),
        articles: mergeById(cur.articles, incoming.articles),
        moments: mergeById(cur.moments, incoming.moments),
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
        fragments: mergeById(cur.fragments, incoming.fragments),
        agentSessions: mergeById(cur.agentSessions, incoming.agentSessions),
        // 备份不带 API Key：合并时若 incoming 为空 key，保留本机已有的 key
        agentConfig: {
          ...cur.agentConfig,
          ...(incoming.agentConfig ?? {}),
          apiKey: incoming.agentConfig?.apiKey
            ? incoming.agentConfig.apiKey
            : cur.agentConfig.apiKey,
        },
        agentDocs: mergeById(cur.agentDocs, incoming.agentDocs),
        agentMemories: mergeById(cur.agentMemories, incoming.agentMemories),
        settings: cur.settings,
      };
      set(merged);
    }
    persist(get());
  },
}));
