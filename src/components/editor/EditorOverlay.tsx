// 编辑器全局入口
import { useUIStore } from '@/stores/useUIStore';
import { useAppStore } from '@/stores/useAppStore';
import { MarkdownEditor } from './MarkdownEditor';
import { uid } from '@/lib/utils';

export function EditorOverlay() {
  const editor = useUIStore((s) => s.editor);
  const closeEditor = useUIStore((s) => s.closeEditor);
  const showToast = useUIStore((s) => s.showToast);
  const addArticle = useAppStore((s) => s.addArticle);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const addMoment = useAppStore((s) => s.addMoment);
  const addLetter = useAppStore((s) => s.addLetter);
  const updateLetter = useAppStore((s) => s.updateLetter);
  const addInspiration = useAppStore((s) => s.addInspiration);
  const updateInspiration = useAppStore((s) => s.updateInspiration);
  const addSchedule = useAppStore((s) => s.addSchedule);
  const addTodo = useAppStore((s) => s.addTodo);
  const articles = useAppStore((s) => s.articles);
  const letters = useAppStore((s) => s.letters);

  if (!editor.open) return null;

  const handleSave = (data: {
    title: string;
    content: string;
    imageIds: string[];
    collectionId?: string;
    tags?: string[];
  }) => {
    const { title, content, imageIds, collectionId } = data;
    const tags = data.tags ?? [];
    const editingId = editor.editingId;

    switch (editor.mode) {
      case 'article': {
        if (editingId) {
          updateArticle(editingId, { title, content, imageIds, collectionId, tags });
          showToast('已更新', 'success');
        } else {
          const id = addArticle({ title, content, imageIds, collectionId, tags });
          showToast('已发布', 'success');
        }
        break;
      }
      case 'moment': {
        addMoment({ content, imageIds });
        showToast('动态已发布', 'success');
        break;
      }
      case 'letter': {
        if (editingId) {
          updateLetter(editingId, { title, content, imageIds });
          showToast('已保存', 'success');
        } else {
          addLetter({ title, content, imageIds });
          showToast('信件已存入', 'success');
        }
        break;
      }
      case 'inspiration': {
        if (editingId) {
          updateInspiration(editingId, { content });
          showToast('已更新', 'success');
        } else {
          addInspiration(content, editor.category || '随想');
          showToast('已记录', 'success');
        }
        break;
      }
    }
    closeEditor();
  };

  // 找到当前编辑项的初值
  let initialTitle = editor.initialTitle || '';
  let initialContent = editor.initialContent || '';
  let initialImageIds: string[] = editor.imageIds || [];
  let initialCollectionId: string | undefined = undefined;
  let initialTags: string[] = editor.tags ?? [];

  if (editor.editingId) {
    if (editor.mode === 'article') {
      const art = articles.find((a) => a.id === editor.editingId);
      if (art) {
        initialTitle = art.title;
        initialContent = art.content;
        initialImageIds = art.imageIds;
        initialCollectionId = art.collectionId;
        initialTags = art.tags;
      }
    } else if (editor.mode === 'letter') {
      const l = letters.find((x) => x.id === editor.editingId);
      if (l) {
        initialTitle = l.title;
        initialContent = l.content;
        initialImageIds = l.imageIds;
      }
    } else if (editor.mode === 'inspiration') {
      const ins = useAppStore.getState().notes.inspiration.find((n) => n.id === editor.editingId);
      if (ins) {
        initialContent = ins.content;
      }
    }
  }

  return (
    <MarkdownEditor
      open={editor.open}
      title={getEditorTitle(editor.mode, !!editor.editingId)}
      initialContent={initialContent}
      initialTitle={initialTitle}
      mode={editor.mode}
      imageIds={initialImageIds}
      collectionId={initialCollectionId}
      tags={initialTags}
      onSave={handleSave}
      onClose={closeEditor}
    />
  );
}

function getEditorTitle(mode: string, isEdit: boolean): string {
  const map: Record<string, [string, string]> = {
    article: ['长文 · Space', '空间 · 编辑'],
    moment: ['动态 · Moments', '动态 · 发布'],
    letter: ['信件 · Mailbox', '信件 · 编辑'],
    inspiration: ['灵感 · Note', '便签 · 编辑'],
  };
  const [create, edit] = map[mode] || ['编辑', '编辑'];
  return isEdit ? edit : create;
}
