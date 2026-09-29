// VidaOS 数据类型定义（v3.0）

export interface Profile {
  name: string;
  signature: string;
  avatarId?: string; // file id
  backgroundPreset?: string;
  backgroundFileId?: string;
}

export interface Collection {
  id: string;
  name: string;
  desc: string;
  createdAt: number;
}

export interface Article {
  id: string;
  title: string;
  content: string; // markdown
  excerpt?: string;
  coverId?: string;
  collectionId?: string;
  tags: string[];
  imageIds: string[];
  createdAt: number;
  updatedAt: number;
}

/** 动态下的一条评论（本应用为单人使用，作者默认就是自己） */
export interface MomentComment {
  id: string;
  content: string;
  createdAt: number;
  /** 可选署名；留空则显示个人资料里的昵称 */
  author?: string;
}

export interface Moment {
  id: string;
  content: string;
  imageIds: string[];
  createdAt: number;
  /** 旧数据可能没有这个字段，读取时请用 ?? [] 兜底 */
  comments?: MomentComment[];
}

export interface Favorite {
  id: string;
  refType: 'article' | 'moment';
  refId: string;
  createdAt: number;
}

export interface InspirationNote {
  id: string;
  content: string;
  category: string;
  /** 星标 = 值得整理 */
  starred: boolean;
  /** 图片 fileId 列表（复用 files 表） */
  imageIds: string[];
  /**
   * 「转文章」生成的 Article id（可选）。用于防重复：连点不会生成第二篇；
   * 灵感内容被改动后（updateInspiration 传了 content）会被清空，允许重新生成。
   * 目标文章被删除后该字段失效，转换时会重新创建。
   */
  convertedArticleId?: string;
  createdAt: number;
  updatedAt: number;
}

export interface ScheduleNote {
  id: string;
  title: string;
  note?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:MM
  category: string;
  done: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface TodoNote {
  id: string;
  content: string;
  category: string;
  done: boolean;
  createdAt: number;
  completedAt?: number;
}

export interface Track {
  id: string;
  title: string;
  artist?: string;
  fileId?: string; // 导入的本地音频
  createdAt: number;
}

/** 馆藏 · 一条划线或高亮（锚点 = 块索引 + 块内字符偏移） */
export interface BookMark {
  id: string;
  kind: 'underline' | 'highlight';
  /** 选中的原文（存下来，书签面板直接展示，不必回正文再取） */
  text: string;
  /** 所在块索引（与 lib/library.ts parseBook 产出的块顺序一致） */
  blockIndex: number;
  /** 块内字符偏移，相对该块渲染后的 textContent */
  start: number;
  end: number;
  createdAt: number;
}

/**
 * 馆藏 · 一本书（用户从本地导入的 txt / md 文本）
 * 正文直接存进主数据（state）：单本建议 ≤1 万字，再长渲染与标注都会卡。
 */
export interface LibraryBook {
  id: string;
  title: string;
  /** 来源格式，决定阅读器是否按 Markdown 渲染 */
  format: 'txt' | 'md';
  /** 正文原文（md 保留标记，渲染时再解析） */
  content: string;
  /** 纯文本字数（口径与编辑器一致：剥掉 Markdown 标记后统计） */
  charCount: number;
  /** 上次读到的块索引 —— 连续滚动，下次打开接着读 */
  lastBlockIndex?: number;
  /** 本书的划线 / 高亮（阅读器右上角「书签」面板的数据源） */
  marks: BookMark[];
  /** 共读抽屉上次用的 Agent 会话 id（下次直接续上） */
  coreadSessionId?: string;
  createdAt: number;
  updatedAt: number;
}

/** Agent 会话消息 */
export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'sys';
  content: string;
  createdAt: number;
  /** 开场白：渲染但不出现在发送给模型的上下文里 */
  greet?: boolean;
}

/** Agent 会话（多会话：列表 → 点进聊天） */
export interface AgentSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  archived: boolean;
  messages: AgentMessage[];
}

/** Agent 连接配置（Key 只存本机 IndexedDB） */
export interface AgentConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
  /** 人格 / system prompt */
  persona: string;
}

/** Agent 资料库文档（文本，≤400KB） */
export interface AgentDoc {
  id: string;
  name: string;
  content: string;
  createdAt: number;
}

/** Agent 记忆馆条目（AI 自写摘要） */
export interface AgentMemory {
  id: string;
  title: string;
  content: string;
  createdAt: number;
  /** 新记忆标记，看过即消 */
  read: boolean;
}

export interface Categories {
  inspiration: string[];
  schedule: string[];
  todo: string[];
}

/** WebDAV 云同步配置（如坚果云 dav.jianguoyun.com） */
export interface WebDavConfig {
  /** 接口地址，如 https://dav.jianguoyun.com/dav/vidaos/ */
  url: string;
  /** 账号（坚果云为注册邮箱） */
  username: string;
  /** 应用密码（坚果云需在官网单独生成，非网页登录密码） */
  password: string;
  /** 是否启用端到端加密：上传前用口令派生密钥加密快照 */
  encrypted?: boolean;
  /** 加密口令（仅存本机，用于派生 AES 密钥；绝不随备份上传） */
  passphrase?: string;
}

export interface Settings {
  lastTab: TabKey;
  webdav?: WebDavConfig;
}

export interface AppState {
  version: 3;
  profile: Profile;
  collections: Collection[];
  articles: Article[];
  moments: Moment[];
  favorites: Favorite[];
  notes: {
    inspiration: InspirationNote[];
    schedule: ScheduleNote[];
    todo: TodoNote[];
  };
  categories: Categories;
  tracks: Track[];
  /** 馆藏（v4.4 新增，取代已移除的碎片流） */
  books: LibraryBook[];
  agentSessions: AgentSession[];
  agentConfig: AgentConfig;
  agentDocs: AgentDoc[];
  agentMemories: AgentMemory[];
  settings: Settings;
}

// ============================================================
// 运行时辅助
// ============================================================

/** 底栏 Tab（v4.4：碎片移除，便签上位到第三格） */
export const TAB_KEYS = ['desk', 'notes', 'agent', 'data', 'settings'] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const isTabKey = (v: unknown): v is TabKey =>
  typeof v === 'string' && (TAB_KEYS as readonly string[]).includes(v);

export type NoteTabKey = 'inspiration' | 'schedule' | 'todo';

/** 主页宫格入口（v4.4：便签上位到底栏，宫格位置改为馆藏） */
export type FeatureKey = 'space' | 'moments' | 'library' | 'favorites';

export interface MediaFile {
  id: string;
  blob: Blob;
  mime: string;
  name: string;
  size: number;
  createdAt: number;
}
