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
  FragmentEntry,
  Categories,
  Track,
  Settings,
  TabKey,
  LibraryBook,
  BookMark,
  BookChapter,
  Album,
  AlbumGroup,
  AlbumStar,
  AgentSession,
  AgentMessage,
  AgentConfig,
} from '@/types';
import { defaultState, loadState, saveState, normalizeState } from '@/lib/db';
import { debounce, uid, now, todayKey } from '@/lib/utils';
import { bookCharCount, buildChapters, parseBook, retargetChapters, AGENT_BOOK_ID } from '@/lib/library';

// ============================================================
// 持久化（防抖）
// ============================================================

/** 按 id 合并两个列表（保留现有项，追加 incoming 中不存在的新项） */
function mergeById<T extends { id: string }>(cur: T[], incoming?: T[]): T[] {
  if (!incoming || incoming.length === 0) return cur;
  return [...cur, ...incoming.filter((x) => !cur.some((c) => c.id === x.id))];
}

/** 合并标签桶（灵感 / 日程 / 待办 / 书籍）：保留现有 + 追加 incoming 中新标签，去重 */
function mergeCategories(cur: Categories, incoming?: Partial<Categories>): Categories {
  const mergeList = (a: string[], b?: string[]) => {
    if (!b || b.length === 0) return a;
    return [...new Set([...a, ...b])];
  };
  return {
    inspiration: mergeList(cur.inspiration, incoming?.inspiration),
    schedule: mergeList(cur.schedule, incoming?.schedule),
    todo: mergeList(cur.todo, incoming?.todo),
    book: mergeList(cur.book, incoming?.book),
  };
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
  /**
   * 重命名文章标签：所有用到它的文章一起改。
   * 标签是**从文章派生**的（没有独立注册表），所以改名只能改文章；
   * 目标名已存在于同一篇时自动去重。返回被改动的文章数。
   */
  renameArticleTag: (from: string, to: string) => number;
  /** 删除文章标签：从所有文章上摘掉（同样因为是派生数据）。返回被改动的文章数 */
  deleteArticleTag: (tag: string) => number;
  deleteArticle: (id: string) => void;

  // 动态
  addMoment: (moment: Omit<Moment, 'id' | 'createdAt'> & { createdAt?: number }) => string;
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

  /**
   * 碎片（v4.7 重新启用）：
   *   - 默认自动写入 createdAt = now()、date = todayKey()（本地日历日）
   *   - 补录时调用方传 date（选了历史日期）
   *   - v4.7.1：再给一个 `at` —— 补记时用户可以指定**具体时刻**（时间轴上的 HH:MM），
   *     不传则仍用「按下加号的当下时间」。`at` 只在**创建**时生效
   *     （updateFragment 依旧不改 createdAt：改文字不该顺手改时间）
   */
  addFragment: (content: string, tag?: string, date?: string, at?: number) => string;
  updateFragment: (id: string, patch: Partial<FragmentEntry>) => void;
  deleteFragment: (id: string) => void;

  // 分类
  addCategory: (which: keyof Categories, name: string) => void;
  removeCategory: (which: keyof Categories, name: string) => void;
  renameCategory: (which: keyof Categories, oldName: string, newName: string) => void;

  // 音乐
  addTrack: (track: Omit<Track, 'id' | 'createdAt'>) => string;
  deleteTrack: (id: string) => void;

  // 馆藏（v4.4：取代已移除的碎片流）
  addBook: (b: { title: string; format: 'txt' | 'md'; content: string; charCount: number }) => string;
  updateBook: (id: string, patch: Partial<LibraryBook>) => void;
  deleteBook: (id: string) => void;
  /** 改写正文（Agent 写入 / 查找替换落盘后调用）：同步重算字数与目录 */
  setBookContent: (id: string, content: string) => void;
  /** 重新解析全书目录（导入新正文后用） */
  rebuildBookChapters: (id: string) => void;
  /** 在指定块之前插入一条新章节（目录页「+」用）；该块已有章节开头时返回 false */
  addBookChapter: (id: string, ch: { title: string; from: number }) => boolean;
  /** 只改章节标题，不动正文与边界 */
  renameBookChapter: (id: string, chapterId: string, title: string) => void;
  /** 从目录里撤掉一条章节（正文保留 —— 见 BookChapter 注释） */
  removeBookChapter: (id: string, chapterId: string) => void;
  /** 划线 / 高亮：写入本书 marks 并返回新标注 id */
  addBookMark: (bookId: string, mark: Omit<BookMark, 'id' | 'createdAt'>) => string;
  deleteBookMark: (bookId: string, markId: string) => void;
  /** 记录阅读位置（连续滚动，下次接着读） */
  setBookProgress: (bookId: string, lastBlockIndex: number) => void;
  /** 打开阅读器时更新「最近阅读时间」（书架排序依据），不触碰 updatedAt */
  touchBookLastRead: (bookId: string) => void;

  // 相册（馆藏 v4.5）：图集 / 图片组 / 星标集
  addAlbum: (name: string) => string;
  updateAlbum: (id: string, patch: Partial<Album>) => void;
  /** 删除图集（连带删它的全部图片组；星标集不可删） */
  deleteAlbum: (id: string) => void;
  /** 打开图集时更新「最近阅读时间」（图集列表排序依据） */
  touchAlbumLastRead: (id: string) => void;
  /** 发布一组照片（图集内一次上传 = 一组） */
  addAlbumGroup: (albumId: string, group: { caption: string; imageIds: string[] }) => string;
  /** 编辑一组照片（只改文案/图片顺序，不动 createdAt —— 更新不算发布） */
  updateAlbumGroup: (id: string, patch: Partial<Pick<AlbumGroup, 'caption' | 'imageIds'>>) => void;
  deleteAlbumGroup: (id: string) => void;
  /** 存入星标集（单张图 + 标签 + 来源引用） */
  addAlbumStar: (star: Omit<AlbumStar, 'id' | 'createdAt'>) => void;
  deleteAlbumStar: (id: string) => void;

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
    books: s.books,
    albums: s.albums,
    albumGroups: s.albumGroups,
    albumStars: s.albumStars,
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
      articles: [
        {
          ...article,
          id,
          // 数组字段兜底：Agent 的 [[写:文章|…]] 只给 title/content/tags，
          // 少了 imageIds 会让动态页渲染与导出/备份一起炸（v4.7.5 修）
          imageIds: article.imageIds ?? [],
          tags: article.tags ?? [],
          createdAt: now(),
          updatedAt: now(),
        },
        ...s.articles,
      ],
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
  renameArticleTag: (from, to) => {
    const next = to.trim();
    if (!next || next === from) return 0;
    let hit = 0;
    set((s) => ({
      articles: s.articles.map((a) => {
        if (!a.tags?.includes(from)) return a;
        hit += 1;
        return {
          ...a,
          tags: [...new Set(a.tags.map((t) => (t === from ? next : t)))],
          updatedAt: now(),
        };
      }),
    }));
    if (hit) persist(get());
    return hit;
  },
  deleteArticleTag: (tag) => {
    let hit = 0;
    set((s) => ({
      articles: s.articles.map((a) => {
        if (!a.tags?.includes(tag)) return a;
        hit += 1;
        return { ...a, tags: a.tags.filter((t) => t !== tag), updatedAt: now() };
      }),
    }));
    if (hit) persist(get());
    return hit;
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
      moments: [
        {
          ...moment,
          id,
          // 同上：Agent 的 [[写:动态|…]] 不带 imageIds，缺了会让动态页直接崩
          imageIds: moment.imageIds ?? [],
          createdAt: moment.createdAt ?? now(),
        },
        ...s.moments,
      ],
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
          n.id === id
            ? {
                ...n,
                ...patch,
                // 正文改了 → 之前转出的文章已不是这份内容，解除「已转过」标记，
                // 允许重新转（也覆盖页内查找替换写回正文的情况）
                ...(patch.content !== undefined && patch.content !== n.content
                  ? { convertedArticleId: undefined }
                  : {}),
                updatedAt: now(),
              }
            : n,
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
    // 已经转过、且那篇文章还在 → 直接复用，避免连点/重复点击生成内容相同的第二篇
    // （灵感正文改动后 updateInspiration 会清掉这个标记，那时可以重新转）
    if (
      ins.convertedArticleId &&
      get().articles.some((a) => a.id === ins.convertedArticleId)
    ) {
      return ins.convertedArticleId;
    }
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
      notes: {
        ...s.notes,
        inspiration: s.notes.inspiration.map((n) =>
          n.id === id ? { ...n, convertedArticleId: artId } : n,
        ),
      },
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

  // 碎片（v4.7 重新启用）
  addFragment: (content, tag, date, at) => {
    const id = uid('frag_');
    const t = now();
    set((s) => ({
      notes: {
        ...s.notes,
        fragments: [
          ...s.notes.fragments,
          {
            id,
            content: content.trim(),
            // at 是「补记时用户挑的具体时刻」；不传就是此刻
            createdAt: at ?? t,
            // 不传 date 就默认今天（本地日历日）；传了则用调用方给的日期（补录）
            date: date || todayKey(),
            ...(tag ? { tag } : {}),
          },
        ],
      },
    }));
    persist(get());
    return id;
  },
  updateFragment: (id, patch) => {
    set((s) => ({
      notes: {
        ...s.notes,
        fragments: s.notes.fragments.map((f) =>
          // id / createdAt 不动（碎片的时间戳是事实，不是用户可改的字段）；
          // date 只能通过「补录到某天」接口改，不开放给 patch，避免误改
          f.id === id
            ? { ...f, ...patch, id: f.id, createdAt: f.createdAt, date: f.date }
            : f,
        ),
      },
    }));
    persist(get());
  },
  deleteFragment: (id) => {
    set((s) => ({
      notes: { ...s.notes, fragments: s.notes.fragments.filter((f) => f.id !== id) },
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
    set((s) => {
      const base = {
        categories: {
          ...s.categories,
          [which]: s.categories[which].filter((c) => c !== name),
        },
      };
      // 删除书籍标签时，把书里的该标签一并清掉（筛选结果与数据一致）
      if (which === 'book') {
        return {
          ...base,
          books: s.books.map((b) =>
            b.tags?.includes(name) ? { ...b, tags: b.tags.filter((t) => t !== name) } : b,
          ),
        };
      }
      return base;
    });
    persist(get());
  },
  renameCategory: (which, oldName, newName) => {
    set((s) => {
      if (!s.categories[which].includes(oldName)) return s;
      const list = s.categories[which].map((c) => (c === oldName ? newName : c));
      if (which === 'book') {
        // 书籍标签重命名：同步每本书 tags 里的旧名
        return {
          categories: { ...s.categories, [which]: list },
          books: s.books.map((b) =>
            b.tags?.includes(oldName)
              ? { ...b, tags: b.tags.map((t) => (t === oldName ? newName : t)) }
              : b,
          ),
        };
      }
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

  // 馆藏（v4.4：取代已移除的碎片流）
  addBook: (b) => {
    const id = uid('book_');
    const t = now();
    set((s) => ({
      books: [
        {
          id,
          title: b.title,
          format: b.format,
          content: b.content,
          charCount: b.charCount,
          marks: [],
          // 导入时就解析目录：用户点开书就能看到章节，不必先进设置手动拆一次
          chapters: buildChapters(b.content, b.format, b.title, { now: t }),
          createdAt: t,
          updatedAt: t,
        },
        ...s.books,
      ],
    }));
    persist(get());
    return id;
  },
  updateBook: (id, patch) => {
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: now() } : b,
      ),
    }));
    persist(get());
  },
  deleteBook: (id) => {
    // Agent 专属书不可删：用户要求它固定存在。没有这一层的话，
    // 只要有一条旧备份里带了 agentBook:false（或字段缺失），这里就会把它删掉。
    if (id === AGENT_BOOK_ID) return;
    set((s) => ({ books: s.books.filter((b) => b.id !== id) }));
    persist(get());
  },
  setBookContent: (id, content) => {
    set((s) => ({
      books: s.books.map((b) => {
        if (b.id !== id) return b;
        return {
          ...b,
          content,
          charCount: bookCharCount(content),
          // 正文变了，目录必须跟着重算，否则 Agent 写完新章节目录里根本看不到
          chapters: buildChapters(content, b.format, b.title, { existing: b.chapters, now: now() }),
          updatedAt: now(),
        };
      }),
    }));
    persist(get());
  },
  rebuildBookChapters: (id) => {
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id
          ? { ...b, chapters: buildChapters(b.content, b.format, b.title, { existing: b.chapters, now: now() }), updatedAt: now() }
          : b,
      ),
    }));
    persist(get());
  },
  addBookChapter: (id, ch) => {
    const t = now();
    let created = false;
    set((s) => ({
      books: s.books.map((b) => {
        if (b.id !== id) return b;
        const blocks = parseBook(b.content, b.format);
        if (!blocks.length) return b;
        const from = Math.max(0, Math.min(ch.from, blocks.length - 1));
        const old = b.chapters ?? [];
        // 这一块已经是一条章节的开头了：不再叠一条。
        // 叠上去会得到两条 from 相同的章节，chapterIndexOfBlock 永远只认后面那条，
        // 前一条就成了目录里点不开、也高亮不到的死条目。
        if (old.some((c) => c.from === from)) return b;
        const next: BookChapter = {
          id: uid('chp_'),
          title: ch.title.trim() || '新章节',
          from,
          to: from,
          charCount: 0,
          createdAt: t,
          updatedAt: t,
        };
        // ⚠️ 只追加一条「起点」，区间与字数全部由 retargetChapters 按正文重算。
        // 绝不能把已有章节的 from/to 整体 +1 —— 正文一块都没动，见 library.ts 的注释。
        created = true;
        return { ...b, chapters: retargetChapters([...old, next], blocks), updatedAt: t };
      }),
    }));
    persist(get());
    return created;
  },
  renameBookChapter: (id, chapterId, title) => {
    set((s) => ({
      books: s.books.map((b) =>
        b.id === id
          ? {
              ...b,
              chapters: (b.chapters ?? []).map((c) =>
                c.id === chapterId ? { ...c, title: title.trim() || c.title, updatedAt: now() } : c,
              ),
              updatedAt: now(),
            }
          : b,
      ),
    }));
    persist(get());
  },
  removeBookChapter: (id, chapterId) => {
    set((s) => ({
      books: s.books.map((b) => {
        if (b.id !== id) return b;
        const old = b.chapters ?? [];
        const left = old.filter((c) => c.id !== chapterId);
        if (left.length === old.length) return b;
        // 撤掉一条目录条目 = 它占的正文并回上一章，所以区间要重算：
        // 只 filter 不重算的话，被撤那一章的正文会落在所有章节之外（谁都不认领）。
        return { ...b, chapters: retargetChapters(left, parseBook(b.content, b.format)), updatedAt: now() };
      }),
    }));
    persist(get());
  },
  addBookMark: (bookId, mark) => {
    const id = uid('bmk_');
    set((s) => ({
      books: s.books.map((b) =>
        b.id === bookId
          ? { ...b, marks: [...b.marks, { ...mark, id, createdAt: now() }], updatedAt: now() }
          : b,
      ),
    }));
    persist(get());
    return id;
  },
  deleteBookMark: (bookId, markId) => {
    set((s) => ({
      books: s.books.map((b) =>
        b.id === bookId
          ? { ...b, marks: b.marks.filter((m) => m.id !== markId), updatedAt: now() }
          : b,
      ),
    }));
    persist(get());
  },
  setBookProgress: (bookId, lastBlockIndex) => {
    // 阅读位置变化很频繁（滚动即写），只更新内存 + 走既有的 debounce 落库，
    // 不要在这里动 updatedAt —— 否则书架排序会被「翻了几页」刷成最新
    set((s) => ({
      books: s.books.map((b) => (b.id === bookId ? { ...b, lastBlockIndex } : b)),
    }));
    persist(get());
  },
  touchBookLastRead: (bookId) => {
    set((s) => ({
      books: s.books.map((b) =>
        b.id === bookId ? { ...b, lastReadAt: now() } : b,
      ),
    }));
    persist(get());
  },

  // ── 相册（馆藏 v4.5）──
  addAlbum: (name) => {
    const id = uid('alb_');
    const t = now();
    set((s) => ({
      albums: [
        { id, name, starred: false, createdAt: t, updatedAt: t },
        ...s.albums,
      ],
    }));
    persist(get());
    return id;
  },
  updateAlbum: (id, patch) => {
    set((s) => ({
      albums: s.albums.map((a) =>
        a.id === id ? { ...a, ...patch, updatedAt: now() } : a,
      ),
    }));
    persist(get());
  },
  deleteAlbum: (id) => {
    // 星标集不可删（UI 上也不给入口，这里再兜一道）
    if (id === 'album-starred') return;
    set((s) => ({
      albums: s.albums.filter((a) => a.id !== id),
      albumGroups: s.albumGroups.filter((g) => g.albumId !== id),
    }));
    persist(get());
  },
  touchAlbumLastRead: (id) => {
    set((s) => ({
      albums: s.albums.map((a) => (a.id === id ? { ...a, lastReadAt: now() } : a)),
    }));
    persist(get());
  },
  addAlbumGroup: (albumId, group) => {
    const id = uid('alg_');
    const t = now();
    set((s) => ({
      albumGroups: [
        { id, albumId, caption: group.caption, imageIds: group.imageIds, createdAt: t, updatedAt: t },
        ...s.albumGroups,
      ],
    }));
    persist(get());
    return id;
  },
  updateAlbumGroup: (id, patch) => {
    // 只改文案 / 图片顺序；createdAt（发布时间）不动 —— 更新不算发布
    set((s) => ({
      albumGroups: s.albumGroups.map((g) =>
        g.id === id ? { ...g, ...patch, updatedAt: now() } : g,
      ),
    }));
    persist(get());
  },
  deleteAlbumGroup: (id) => {
    set((s) => ({
      albumGroups: s.albumGroups.filter((g) => g.id !== id),
    }));
    persist(get());
  },
  addAlbumStar: (star) => {
    // 同一张图在同一标签下只留一条，防止连点重复
    const dup = get().albumStars.find(
      (x) => x.imageId === star.imageId && x.tag === star.tag,
    );
    if (dup) return;
    const id = uid('als_');
    set((s) => ({
      albumStars: [{ ...star, id, createdAt: now() }, ...s.albumStars],
    }));
    persist(get());
  },
  deleteAlbumStar: (id) => {
    set((s) => ({
      albumStars: s.albumStars.filter((x) => x.id !== id),
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
      // 外部来源一律先归一化：旧备份缺 starred / imageIds 等字段，
      // 原样灌进 store 会让「便签 · 灵感」渲染即崩（v4.3.3 修，见 db.ts normalizeState）
      set({ ...normalizeState(incoming), hydrated: true });
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
          // v4.7：碎片也走 mergeById（旧备份没有这个字段会 fallback 到 []，
          // 不会破坏老数据；新备份 + 老机器合并时两边碎片会并入）
          fragments: mergeById(cur.notes.fragments, incoming.notes?.fragments),
        },
        // v4.5.1：合并导入时标签桶必须一起合 —— 此前直接丢 incoming 的 categories，
        // 换机导入后书/灵感条目在（tags 字段随对象保留）但标签桶（categories.book /
        // categories.inspiration）是空的，筛选与标签列表全部丢失，用户只能手动重建
        categories: mergeCategories(cur.categories, incoming.categories),
        tracks: mergeById(cur.tracks, incoming.tracks),
        books: mergeById(cur.books, incoming.books),
        // v4.5.1：相册三件此前也未在 merge 里合入（albums/albumGroups/albumStars
        // 只靠 ...cur 保留本机旧值，incoming 的相册数据被静默丢弃）
        albums: mergeById(cur.albums, incoming.albums),
        albumGroups: mergeById(cur.albumGroups, incoming.albumGroups),
        albumStars: mergeById(cur.albumStars, incoming.albumStars),
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
      // merged 是从 cur（完整）构造出来的，再过一次归一化即可补齐 incoming 里
      // 旧条目的缺字段 —— 注意不能直接归一化 incoming：那会用默认资料覆盖现有数据
      set(normalizeState(merged));
    }
    persist(get());
  },
}));

// 兜底持久化：任何 set 都触发防抖保存（与 action 内手动 persist 共用同一防抖、
// 最终合并为一次写库，不会重复写），防止未来新增 action 忘记调用 persist
// 导致改动不落盘。hydrate 完成前不写（初始默认态无需入库）。
useAppStore.subscribe((s) => {
  if (s.hydrated) persist(s);
});
