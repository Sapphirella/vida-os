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

/**
 * 便签 · 一条碎片（v4.7 重新启用）
 *
 * 与 v4.2 时代的 FragmentEntry 完全不同：
 *   - **没有图片 / 评论 / 收藏 / 星标**（碎片是「当下此刻的一句话」，不是社交流）
 *   - **没有分类桶**（用户原话只说「按天储存」，不引入 InspirationNote 那种 category 系统）
 *   - **自动记录当下时间**：加号按下就是 `createdAt = now`、`date = todayKey()`
 *   - **可选 tag**：单字符串（不是桶），用户可以打「待办 / 日记 / 打卡」之类的轻量标签
 *
 * 拆成 `date` 字段单独存本地日历日（而不是只用 createdAt 推断）有两个理由：
 *   1. 时区：createdAt 在 UTC 零点附近换日时，截 `YYYY-MM-DD` 可能跨日；`date` 直接
 *      在写入时用本地日历定下；
 *   2. 「补录」：允许用户点日历按钮选历史日期，往过去的某天追加碎片（按那张日历
 *      来定 date，createdAt 是「补录时的当下时间」—— 这两个不一致是预期的）。
 */
export interface FragmentEntry {
  id: string;
  /** 用户输入的正文（一段） */
  content: string;
  /** 创建时间戳（加号按下的当下时间，可用于时间轴的 HH:MM 显示） */
  createdAt: number;
  /** 关联日期 YYYY-MM-DD（写入时由 todayKey() 给出；补录时由用户选） */
  date: string;
  /** 可选标签（单字符串；不要塞进 categories.* 系统，碎片不长生命周期） */
  tag?: string;
  /**
   * 时间胶囊（v4.7.7）：补记到**未来**的碎片。
   *
   * 为什么需要一个显式标记，而不是每次靠 `createdAt > now` 现算：
   *   - 现算的话，等那天真的来了，它就变回普通碎片 —— 可用户要的是
   *     「等未来的这天来临，内容仍然在时间胶囊栏目里」（胶囊是永久身份，不是倒计时状态）；
   *   - 也顺便记下「什么时候种下的」（plantedAt），那是 createdAt 表达不了的。
   * 可选字段：旧数据没有它就是普通碎片，不需要迁移。
   */
  capsule?: boolean;
  /** 种下这颗胶囊的真实时间（只有 capsule 为真时有意义） */
  plantedAt?: number;
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
 * 正文直接存进主数据（state）：单本建议 ≤5 万字（超长会分批挂载，见 lib/library.ts 的实测注释）。
 */
/**
 * 馆藏 · 一个章节
 *
 * ⚠️ 章节**只是正文的目录条目，正文本身仍完整存在书里**。
 * 这样设计有两个硬理由：
 *   1. 划线锚点是「块索引」（见 lib/library.ts），删掉正文会让后面所有块索引位移，
 *      整本书的标注全部错位；
 *   2. Agent 没有删除能力（代码层面就没有 delete 路径），
 *      所以「删章节」在语义上就只能是「从目录里撤掉这一条」。
 * 用户在目录页删除章节时只是移除条目，正文一个字都不会少。
 */
export interface BookChapter {
  id: string;
  /** 章节标题（自动解析时取标题行原文；手动新建时用户输入） */
  title: string;
  /** 起始块索引（含） */
  from: number;
  /** 结束块索引（含） */
  to: number;
  /** 本章净字数（不含标题行） */
  charCount: number;
  createdAt: number;
  updatedAt: number;
}

export interface LibraryBook {  id: string;
  title: string;
  /** 来源格式，决定阅读器是否按 Markdown 渲染 */
  format: 'txt' | 'md';
  /** 正文原文（md 保留标记，渲染时再解析） */
  content: string;
  /** 纯文本字数（口径与编辑器一致：剥掉 Markdown 标记后统计） */
  charCount: number;
  /** 上次读到的块索引 —— 连续滚动，下次打开接着读 */
  lastBlockIndex?: number;
  /** 最近阅读时间戳（打开阅读器时更新；书架默认按此排序） */
  lastReadAt?: number;
  /** 置顶（可多本；置顶区内部仍按最近阅读排序） */
  pinned?: boolean;
  /** 标签（一本书可有多个；标签名集合见 categories.book） */
  tags?: string[];
  /** 本书的划线 / 高亮（阅读器右上角「书签」面板的数据源） */
  marks: BookMark[];
  /**
   * 本书的目录（章节）。导入时由 splitChapters 自动解析，也可手动增删改。
   * 未解析出任何标题时仍会有一条兜底章节（标题 = 书名），目录页不会空白。
   */
  chapters?: BookChapter[];
  /**
   * 标记为「Agent 专属书」：书架上固定存在、不可删除、不默认置顶；
   * 设置里关掉 Agent 开关时在书架隐藏。
   * 走 db.ts 的兜底创建（与星标集同范式），换设备导入备份也会被补回来。
   */
  agentBook?: boolean;
  createdAt: number;
  updatedAt: number;
}

/** 相册 · 图集（馆藏 v4.5：书架收文档，相册收照片） */
export interface Album {
  id: string;
  name: string;
  /** 星标集标记：全应用唯一、置顶显示，不可改名 / 删除 */
  starred: boolean;
  createdAt: number;
  updatedAt: number;
  /** 最近阅读时间（图集列表排序依据，打开图集时更新） */
  lastReadAt?: number;
}

/** 相册 · 图集中的一组照片（一次上传发布 = 一组） */
export interface AlbumGroup {
  id: string;
  albumId: string;
  /** 这组照片的文案 */
  caption: string;
  /** 照片 fileId 列表（顺序即展示顺序） */
  imageIds: string[];
  /** 发布时间：时间轴排序依据；更新不算发布，不改这个字段 */
  createdAt: number;
  /** 最近编辑时间 */
  updatedAt: number;
}

/** 星标集条目（单张图 + 来源） */
export interface AlbumStar {
  id: string;
  /** 图片 fileId */
  imageId: string;
  /** 固定标签：文章 / 动态 / 灵感 / 相册 */
  tag: 'article' | 'moment' | 'inspiration' | 'album';
  /** 来源引用（双链跳转；tag=album 时没有来源） */
  refType?: 'article' | 'moment' | 'inspiration';
  refId?: string;
  /** 可选备注 */
  caption?: string;
  createdAt: number;
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
  /** 书籍标签（书架分类，一本书可多标签） */
  book: string[];
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
  /** Agent 入口开关（v4.5.3 新增）。缺省视为开启，保持旧用户行为不变 */
  agentEnabled?: boolean;
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
    /** 便签 · 碎片（v4.7 重新启用；详见 FragmentEntry 注释） */
    fragments: FragmentEntry[];
  };
  categories: Categories;
  tracks: Track[];
  /** 馆藏（v4.4 新增，取代已移除的碎片流） */
  books: LibraryBook[];
  /** 相册（馆藏 v4.5）：图集 + 图片组 + 星标集 */
  albums: Album[];
  albumGroups: AlbumGroup[];
  albumStars: AlbumStar[];
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

export type NoteTabKey = 'fragment' | 'inspiration' | 'schedule' | 'todo';

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
