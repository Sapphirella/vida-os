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

export interface Letter {
  id: string;
  title: string;
  content: string;
  imageIds: string[];
  unread: boolean;
  createdAt: number;
}

export interface Favorite {
  id: string;
  refType: 'article' | 'moment' | 'letter';
  refId: string;
  createdAt: number;
}

export interface InspirationNote {
  id: string;
  content: string;
  category: string;
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
  builtin?: 'rain' | 'candle' | 'silence'; // 内置音景
  createdAt: number;
}

export interface Categories {
  inspiration: string[];
  schedule: string[];
  todo: string[];
}

export interface Settings {
  lastTab: 'desk' | 'notes' | 'data' | 'settings';
  /** 皮肤 key（见 src/lib/skins.ts）；缺省＝暗夜书房 */
  skin?: string;
}

export interface AppState {
  version: 3;
  profile: Profile;
  collections: Collection[];
  articles: Article[];
  moments: Moment[];
  letters: Letter[];
  favorites: Favorite[];
  notes: {
    inspiration: InspirationNote[];
    schedule: ScheduleNote[];
    todo: TodoNote[];
  };
  categories: Categories;
  tracks: Track[];
  settings: Settings;
}

// ============================================================
// 运行时辅助
// ============================================================

export type TabKey = 'desk' | 'notes' | 'data' | 'settings';

export type NoteTabKey = 'inspiration' | 'schedule' | 'todo';

export type FeatureKey = 'space' | 'moments' | 'mailbox' | 'favorites';

export interface MediaFile {
  id: string;
  blob: Blob;
  mime: string;
  name: string;
  size: number;
  createdAt: number;
}
