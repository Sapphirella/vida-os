// UI 状态：toast、modal、editor 状态等
import { create } from 'zustand';
import { uid, todayKey } from '@/lib/utils';
import type { ReactNode } from 'react';

export interface ToastItem {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'error';
}

export interface EditorState {
  open: boolean;
  mode: 'article' | 'moment' | 'letter';
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
  currentTab: 'desk' | 'notes' | 'data' | 'settings';
  setTab: (tab: 'desk' | 'notes' | 'data' | 'settings') => void;

  // 笔记内 tab
  notesTab: 'inspiration' | 'schedule' | 'todo';
  setNotesTab: (tab: 'inspiration' | 'schedule' | 'todo') => void;

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

  // 全局查找「跳转到命中处」：目标页挂载后读取并定位/高亮
  focusRequest: {
    kind: 'article' | 'moment' | 'letter';
    id: string;
    query: string;
    ignoreCase: boolean;
    /** 该文档正文中的命中序号（只计算正文，即 content 部分） */
    index: number;
    /** 命中是否落在标题（article/letter 的 title 段） */
    inTitle: boolean;
    ts: number;
  } | null;
  setFocusRequest: (r: UIStore['focusRequest']) => void;

  // Toast
  toasts: ToastItem[];
  showToast: (message: string, kind?: ToastItem['kind']) => void;

  // Modal
  modal: { open: boolean; title?: string; content?: ReactNode; onConfirm?: () => void };
  showModal: (m: Partial<UIStore['modal']>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentTab: 'desk',
  setTab: (tab) => set({ currentTab: tab }),

  notesTab: 'inspiration',
  setNotesTab: (tab) => set({ notesTab: tab }),

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

  focusRequest: null,
  setFocusRequest: (r) => set({ focusRequest: r }),

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
}));
