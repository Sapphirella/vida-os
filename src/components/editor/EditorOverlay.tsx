// 编辑器全局入口
import { useUIStore } from '@/stores/useUIStore';
import { useAppStore } from '@/stores/useAppStore';
import { MarkdownEditor } from './MarkdownEditor';

// 稳定的空数组常量：若在渲染中写 `editor.imageIds || []`，每次渲染都会产生新数组，
// 会让 MarkdownEditor 的初值同步逻辑误判为「初值变了」从而重置用户输入。
const EMPTY_IDS: string[] = [];
const EMPTY_TAGS: string[] = [];

export function EditorOverlay() {
  const editor = useUIStore((s) => s.editor);
  const closeEditor = useUIStore((s) => s.closeEditor);
  const showToast = useUIStore((s) => s.showToast);
  const addArticle = useAppStore((s) => s.addArticle);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const addMoment = useAppStore((s) => s.addMoment);
  const updateMoment = useAppStore((s) => s.updateMoment);
  const addLetter = useAppStore((s) => s.addLetter);
  const updateLetter = useAppStore((s) => s.updateLetter);
  const articles = useAppStore((s) => s.articles);
  const letters = useAppStore((s) => s.letters);
  const moments = useAppStore((s) => s.moments);

  if (!editor.open) return null;

  const { mode, editingId } = editor;

  const handleSave = (data: {
    title: string;
    content: string;
    imageIds: string[];
    collectionId?: string;
    tags?: string[];
    createdAt?: number;
  }) => {
    const { title, content, imageIds, collectionId, createdAt } = data;
    const tags = data.tags ?? [];

    switch (mode) {
      case 'article': {
        // 封面不再自动取首图：图片默认作为正文配图显示在文章下方，
        // 需要插在正文里可以用编辑器缩略图上的「插入」按钮生成 fileRef: 引用。
        if (editingId) {
          updateArticle(editingId, { title, content, imageIds, collectionId, tags });
          showToast('已更新', 'success');
        } else {
          addArticle({ title, content, imageIds, collectionId, tags });
          showToast('已发布', 'success');
        }
        break;
      }
      case 'moment': {
        if (editingId) {
          updateMoment(editingId, {
            content,
            imageIds,
            ...(createdAt ? { createdAt } : {}),
          });
          showToast('已保存', 'success');
        } else {
          addMoment({ content, imageIds });
          showToast('动态已发布', 'success');
        }
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
    }
    closeEditor();
  };

  // 找到当前编辑项的初值
  let initialTitle = editor.initialTitle || '';
  let initialContent = editor.initialContent || '';
  let initialImageIds: string[] = editor.imageIds ?? EMPTY_IDS;
  let initialCollectionId: string | undefined;
  let initialTags: string[] = editor.tags ?? EMPTY_TAGS;
  let initialCreatedAt = editor.initialCreatedAt;

  if (editingId) {
    if (mode === 'article') {
      const art = articles.find((a) => a.id === editingId);
      if (art) {
        initialTitle = art.title;
        initialContent = art.content;
        initialImageIds = art.imageIds;
        initialCollectionId = art.collectionId;
        initialTags = art.tags;
      }
    } else if (mode === 'moment') {
      const m = moments.find((x) => x.id === editingId);
      if (m) {
        initialContent = m.content;
        initialImageIds = m.imageIds;
        initialCreatedAt = m.createdAt;
      }
    } else if (mode === 'letter') {
      const l = letters.find((x) => x.id === editingId);
      if (l) {
        initialTitle = l.title;
        initialContent = l.content;
        initialImageIds = l.imageIds;
      }
    }
  }

  // 收藏星标只对「已存在」的文章/信件有意义：新建时还没有 id 可收藏
  const favoriteId =
    editingId && (mode === 'article' || mode === 'letter')
      ? { refType: mode, refId: editingId }
      : undefined;

  return (
    <MarkdownEditor
      // mode/editingId 变化时重挂载，初值由 useState 初始化取得（不再依赖副作用重置）
      key={`${mode}-${editingId ?? 'new'}`}
      open={editor.open}
      title={getEditorTitle(mode, !!editingId)}
      initialContent={initialContent}
      initialTitle={initialTitle}
      initialCreatedAt={initialCreatedAt}
      mode={mode}
      imageIds={initialImageIds}
      collectionId={initialCollectionId}
      tags={initialTags}
      favoriteId={favoriteId}
      onSave={handleSave}
      onClose={closeEditor}
    />
  );
}

function getEditorTitle(mode: 'article' | 'moment' | 'letter', isEdit: boolean): string {
  const map: Record<'article' | 'moment' | 'letter', [string, string]> = {
    article: ['长文 · Space', '空间 · 编辑'],
    moment: ['动态 · Moments', '动态 · 发布'],
    letter: ['信件 · Mailbox', '信件 · 编辑'],
  };
  const [create, edit] = map[mode];
  return isEdit ? edit : create;
}
