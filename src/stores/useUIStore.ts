// UI 状态：toast、modal、editor 状态等
import { create } from 'zustand';
import { uid } from '@/lib/utils';

export interface ToastItem {
  id: string;
  message: string;
  kind: 'info' | 'success' | 'error';
}

export interface EditorState {
  open: boolean;
  mode: 'article' | 'moment' | 'letter' | 'inspiration';
  editingId?: string;
  initialContent?: string;
  initialTitle?: string;
  // 文章专用
  collectionId?: string;
  tags?: string[];
  imageIds?: string[];
  // 信件专用
  date?: string; // 适用 schedule
  time?: string;
  category?: string;
}

interface UIStore {
  // Tab
  currentTab: 'desk' | 'notes' | 'data' | 'settings';
  setTab: (tab: 'desk' | 'notes' | 'data' | 'settings') => void;

  // 笔记内 tab
  notesTab: 'inspiration' | 'schedule' | 'todo';
  setNotesTab: (tab: 'inspiration' | 'schedule' | 'todo') => void;

  // 编辑器
  editor: EditorState;
  openEditor: (e: Partial<EditorState>) => void;
  closeEditor: () => void;
  updateEditor: (patch: Partial<EditorState>) => void;

  // Toast
  toasts: ToastItem[];
  showToast: (message: string, kind?: ToastItem['kind']) => void;
  removeToast: (id: string) => void;

  // Modal
  modal: { open: boolean; title?: string; content?: any; onConfirm?: () => void };
  showModal: (m: Partial<UIStore['modal']>) => void;
  closeModal: () => void;
}

export const useUIStore = create<UIStore>((set) => ({
  currentTab: 'desk',
  setTab: (tab) => set({ currentTab: tab }),

  notesTab: 'inspiration',
  setNotesTab: (tab) => set({ notesTab: tab }),

  editor: { open: false, mode: 'article' },
  openEditor: (e) =>
    set((s) => ({
      editor: { ...s.editor, ...e, open: true },
    })),
  closeEditor: () => set({ editor: { open: false, mode: 'article' } }),
  updateEditor: (patch) =>
    set((s) => ({ editor: { ...s.editor, ...patch } })),

  toasts: [],
  showToast: (message, kind = 'info') => {
    const id = uid('tst_');
    set((s) => ({ toasts: [...s.toasts, { id, message, kind }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 2400);
  },
  removeToast: (id) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  modal: { open: false },
  showModal: (m) => set((s) => ({ modal: { ...s.modal, ...m, open: true } })),
  closeModal: () => set({ modal: { open: false } }),
}));
