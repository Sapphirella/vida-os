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
  const articles = useAppStore((s) => s.articles);
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
          addMoment({ content, imageIds, ...(createdAt ? { createdAt } : {}) });
          showToast('动态已发布', 'success');
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
  // 新建文章时的归属合集：从 openEditor({collectionId}) 取（v1.0.1 修）。
  // 之前这里没有初值，只有「编辑已存在文章」那条分支才会赋值 —— 于是在合集页点「写文章」
  // 新建出来的文章 collectionId 永远是 undefined，不会被加进当前合集。
  let initialCollectionId: string | undefined = initialCollectionOf({
    editorCollectionId: editor.collectionId,
    editingId,
  });
  let initialTags: string[] = editor.tags ?? EMPTY_TAGS;
  let initialCreatedAt = editor.initialCreatedAt;

  if (editingId) {
    if (mode === 'article') {
      const art = articles.find((a) => a.id === editingId);
      if (art) {
        initialTitle = art.title;
        initialContent = art.content;
        initialImageIds = art.imageIds;
        initialCollectionId = initialCollectionOf({
          editorCollectionId: editor.collectionId,
          editingId,
          articleCollectionId: art.collectionId,
        });
        initialTags = art.tags;
      }
    } else if (mode === 'moment') {
      const m = moments.find((x) => x.id === editingId);
      if (m) {
        initialContent = m.content;
        initialImageIds = m.imageIds;
        initialCreatedAt = m.createdAt;
      }
    }
  }

  // 收藏星标只对「已存在」的文章有意义：新建时还没有 id 可收藏
  const favoriteId =
    editingId && mode === 'article'
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

/**
 * 编辑器初值里的「归属合集」。
 *
 * 抽成纯函数是为了能被**直接验证**（本轮真机 bug 就出在这里）：
 *   - 新建文章：取 openEditor({ collectionId }) 传进来的那个（否则合集页点「写文章」白点）；
 *   - 编辑既有文章：以文章自己存的 collectionId 为准；
 *   - 编辑但文章已不存在（数据被清/并发删除）：退回传进来的那个，不要丢。
 */
export function initialCollectionOf(args: {
  editorCollectionId?: string;
  editingId?: string;
  articleCollectionId?: string;
}): string | undefined {
  if (args.editingId) return args.articleCollectionId ?? args.editorCollectionId;
  return args.editorCollectionId;
}

function getEditorTitle(mode: 'article' | 'moment', isEdit: boolean): string {
  const map: Record<'article' | 'moment', [string, string]> = {
    article: ['长文 · Space', '空间 · 编辑'],
    moment: ['动态 · Moments', '动态 · 发布'],
  };
  const [create, edit] = map[mode];
  return isEdit ? edit : create;
}
