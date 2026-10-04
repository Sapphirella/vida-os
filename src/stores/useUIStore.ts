// UI 状态：toast、modal、editor 状态等
import { create } from 'zustand';
import { uid, todayKey } from '@/lib/utils';
import type { ReactNode } from 'react';
import type { TabKey } from '@/types';

export interface ToastItem {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'error';
}

export interface EditorState {
  open: boolean;
  mode: 'article' | 'moment';
  editingId?: string;
  initialContent?: string;
  initialTitle?: string;
  /** 动态可顺带修改发布时间 */
  initialCreatedAt?: number;
  // 文章专用
  collectionId?: string;
  tags?: string[];
  imageIds?: string[];
}

interface UIStore {
  // Tab
  currentTab: TabKey;
  setTab: (tab: TabKey) => void;

  // 笔记内 tab
  notesTab: 'fragment' | 'inspiration' | 'schedule' | 'todo';
  /**
   * 待办是否显示已完成（v4.7.7 从 TodoView 的局部 state 搬过来）。
   * 便签页的分页是条件渲染：切到「日程」会把 TodoView 整个卸载，局部 state 随之丢失 ——
   * 用户点的「隐藏已完成」于是被重置（用户反馈）。放进 UI store 就跨分页保持了。
   */
  showCompletedTodos: boolean;
  setNotesTab: (tab: 'fragment' | 'inspiration' | 'schedule' | 'todo') => void;
  setShowCompletedTodos: (v: boolean) => void;

  // Agent 当前打开的会话（临时 UI 状态，不持久化）
  agentSessionId: string | null;
  setAgentSessionId: (id: string | null) => void;

  // 首页选中的日期（YYYY-MM-DD）：月历与当日日程卡共用，保证两卡联动
  selectedDate: string;
  setSelectedDate: (date: string) => void;

  // 编辑器
  editor: EditorState;
  openEditor: (e: Partial<EditorState>) => void;
  closeEditor: () => void;

  // 全局查找替换面板（桌面/移动两端共用入口）
  findPanelOpen: boolean;
  setFindPanelOpen: (v: boolean) => void;

  // 评价输入聚焦中（动态页评论输入框）：聚焦期间隐藏底部 Tab 栏与 FAB，避免键盘弹出时遮挡
  commentInputFocused: boolean;
  setCommentInputFocused: (v: boolean) => void;

  // 全局查找「跳转到命中处」：目标页挂载后读取并定位/高亮
  focusRequest: {
    kind: 'article' | 'moment' | 'inspiration';
    id: string;
    query: string;
    ignoreCase: boolean;
    /** 该文档正文中的命中序号（只计算正文，即 content 部分） */
    index: number;
    /** 命中是否落在标题（article 的 title 段） */
    inTitle: boolean;
    ts: number;
  } | null;
  setFocusRequest: (r: UIStore['focusRequest']) => void;

  // 图片放大预览（文章/动态/灵感/相册里的图片点击后全屏查看 + 保存/下载）
  lightbox: {
    fileId: string;
    /** 星标集分类标签（固定：文章/动态/灵感/相册）；不传则不显示「存入星标集」按钮 */
    starTag?: 'article' | 'moment' | 'inspiration' | 'album';
    /** 来源引用（文章/动态/灵感才有，星标集内双链跳转用） */
    refType?: 'article' | 'moment' | 'inspiration';
    refId?: string;
  } | null;
  setLightbox: (r: UIStore['lightbox']) => void;

  // Toast
  toasts: ToastItem[];
  showToast: (message: string, kind?: ToastItem['kind']) => void;

  // Modal
  modal: {
    open: boolean;
    title?: string;
    content?: ReactNode;
    onConfirm?: () => void;
    /** 输入模式：渲染带输入框的确认框，确认时将输入值回传 */
    inputMode?: { placeholder?: string; initialValue?: string };
    onInputConfirm?: (value: string) => void;
  };
  showModal: (m: Partial<UIStore['modal']>) => void;
  closeModal: () => void;

  // 确认对话框（Promise 风格，替代 window.confirm）
  // 微信内置浏览器等环境里原生 confirm 没有「取消」按钮，必须用应用内弹窗
  confirmRequest: { message: string; resolve: (ok: boolean) => void } | null;
  confirmDialog: (message: string) => Promise<boolean>;
  confirmRespond: (ok: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentTab: 'desk',
  setTab: (tab) => set({ currentTab: tab }),

  // v4.7.3：便签默认落在「碎片」（导航第一格，也是「最快记一笔」的入口）
  notesTab: 'fragment',
  setNotesTab: (tab) => set({ notesTab: tab }),
  showCompletedTodos: true,
  setShowCompletedTodos: (v) => set({ showCompletedTodos: v }),

  agentSessionId: null,
  setAgentSessionId: (id) => set({ agentSessionId: id }),

  selectedDate: todayKey(),
  setSelectedDate: (date) => set({ selectedDate: date }),

  editor: { open: false, mode: 'article' },
  openEditor: (e) =>
    set((s) => ({
      editor: { ...s.editor, ...e, open: true },
    })),
  closeEditor: () => set({ editor: { open: false, mode: 'article' } }),

  findPanelOpen: false,
  setFindPanelOpen: (v) => set({ findPanelOpen: v }),

  commentInputFocused: false,
  setCommentInputFocused: (v) => set({ commentInputFocused: v }),

  focusRequest: null,
  setFocusRequest: (r) => set({ focusRequest: r }),

  lightbox: null,
  setLightbox: (r) => set({ lightbox: r }),

  toasts: [],
  showToast: (message, kind = 'info') => {
    const id = uid('tst_');
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2400);
  },

  modal: { open: false },
  showModal: (m) => set((s) => ({ modal: { ...s.modal, ...m, open: true } })),
  closeModal: () => set({ modal: { open: false } }),

  confirmRequest: null,
  confirmDialog: (message) =>
    new Promise((resolve) => {
      set({ confirmRequest: { message, resolve } });
    }),
  confirmRespond: (ok) => {
    set((s) => {
      s.confirmRequest?.resolve(ok);
      return { confirmRequest: null };
    });
  },
}));
