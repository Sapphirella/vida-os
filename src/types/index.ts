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

/** 碎片（日记页的微信式碎片流条目） */
export interface FragmentEntry {
  id: string;
  content: string;
  /** 图片 fileId 列表（复用 files 表） */
  imageIds: string[];
  /** 可选标签（# 开头自动解析） */
  tags: string[];
  /** 星标 = 值得整理 */
  starred: boolean;
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
  fragments: FragmentEntry[];
  agentSessions: AgentSession[];
  agentConfig: AgentConfig;
  agentDocs: AgentDoc[];
  agentMemories: AgentMemory[];
  settings: Settings;
}

// ============================================================
// 运行时辅助
// ============================================================

export const TAB_KEYS = ['desk', 'diary', 'agent', 'data', 'settings'] as const;
export type TabKey = (typeof TAB_KEYS)[number];

export const isTabKey = (v: unknown): v is TabKey =>
  typeof v === 'string' && (TAB_KEYS as readonly string[]).includes(v);

export type NoteTabKey = 'inspiration' | 'schedule' | 'todo';

export type FeatureKey = 'space' | 'moments' | 'notes' | 'favorites';

export interface MediaFile {
  id: string;
  blob: Blob;
  mime: string;
  name: string;
  size: number;
  createdAt: number;
}
