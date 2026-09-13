import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Star, Calendar } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { MarkdownView, collectInlineImageIds } from '@/components/common/MarkdownView';
import { Tag } from '@/components/common/Tag';
import { formatDate, chineseWeekday } from '@/lib/utils';
import { clsx } from '@/lib/utils';

export function ArticleReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const article = useAppStore((s) => s.articles.find((a) => a.id === id));
  const collection = useAppStore((s) =>
    s.collections.find((c) => c.id === article?.collectionId),
  );
  const deleteArticle = useAppStore((s) => s.deleteArticle);
  const isFavorited = useAppStore((s) =>
    id ? s.isFavorited('article', id) : false,
  );
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  if (!article) {
    return (
      <div className="px-4 sm:px-6 view-enter">
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-bronze">文章不存在</p>
        </div>
      </div>
    );
  }

  // 图片统一放在正文下方（不再有任何图片出现在全文上方）；
  // 已经用 fileRef: 插进正文的图片不在这里重复显示。
  const inlineIds = new Set(collectInlineImageIds(article.content));
  const galleryIds = Array.from(
    new Set([article.coverId, ...article.imageIds].filter((x): x is string => !!x)),
  ).filter((id) => !inlineIds.has(id));

  return (
    <article className="px-4 sm:px-6 view-enter">
      <div className="max-w-3xl mx-auto pb-12">
        {/* 标题区 */}
        <header className="pt-2 pb-6 text-center">
          {collection && (
            <button
              onClick={() => navigate(`/space/collection/${collection.id}`)}
              className="font-mono text-[10px] tracking-[0.2em] text-wine-light uppercase hover:text-candle transition-colors mb-3"
            >
              {collection.name}
            </button>
          )}
          <h1 className="font-serif text-headline text-[1.75rem] sm:text-[2rem] leading-snug tracking-tight">
            {article.title}
          </h1>
          <div className="flex items-center justify-center gap-3 mt-4 text-bronze text-xs font-mono">
            <span className="flex items-center gap-1">
              <Calendar size={11} strokeWidth={1.5} />
              {formatDate(article.createdAt, 'YYYY 年 M 月 D 日')} · 周{chineseWeekday(article.createdAt)}
            </span>
          </div>

          {/* 操作按钮：横排在标题下方，无需滚动到正文底部 */}
          <div className="flex items-center justify-center gap-2 mt-5">
            <button
              onClick={() => toggleFavorite('article', article.id)}
              className={clsx(
                'btn-ghost',
                isFavorited && 'tag-wine',
              )}
            >
              <Star size={14} strokeWidth={1.5} fill={isFavorited ? 'currentColor' : 'none'} />
              {isFavorited ? '已收藏' : '收藏'}
            </button>
            <button
              onClick={() => {
                openEditor({
                  mode: 'article',
                  editingId: article.id,
                  initialTitle: article.title,
                  initialContent: article.content,
                  imageIds: article.imageIds,
                  collectionId: article.collectionId,
                  tags: article.tags,
                  open: true,
                });
              }}
              className="btn-ghost"
            >
              <Edit2 size={14} strokeWidth={1.5} /> 编辑
            </button>
            <button
              onClick={() => {
                if (confirm('删除该文章？此操作无法撤销。')) {
                  deleteArticle(article.id);
                  navigate('/space');
                  showToast('文章已删除', 'success');
                }
              }}
              className="btn-ghost"
            >
              <Trash2 size={14} strokeWidth={1.5} /> 删除
            </button>
          </div>
        </header>

        {/* 正文（支持 fileRef: 内嵌本地图片） */}
        <MarkdownView markdown={article.content} />

        {/* 配图：放在正文**下方**；已用 fileRef: 插入正文的图不在这里重复。
            注意顺序：本块必须写在 <MarkdownView> 之后，否则配图会跑到正文上方
            （与 EditorOverlay 的「留在文章下方」以及 PDF 导出的排版保持一致）。 */}
        {galleryIds.length > 0 && (
          <div className="mt-8 space-y-4">
            {galleryIds.map((id, i) => (
              <figure
                key={id}
                className="rounded-card-lg overflow-hidden border border-bronze/15"
              >
                <MediaImage
                  fileId={id}
                  alt={`${article.title} 配图 ${i + 1}`}
                  className="w-full"
                />
              </figure>
            ))}
          </div>
        )}

        {/* 标签 */}
        {article.tags.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 mt-10 pt-6 border-t border-bronze/10">
            {article.tags.map((t) => (
              <Tag key={t} variant="wine">#{t}</Tag>
            ))}
          </div>
        )}
      </div>
    </article>
  );
}
