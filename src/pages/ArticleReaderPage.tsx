import { useParams, useNavigate } from 'react-router-dom';
import { useMemo, useRef } from 'react';
import { Edit2, Trash2, Star, Calendar, Waypoints } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { MarkdownView, collectInlineImageIds } from '@/components/common/MarkdownView';
import { Tag } from '@/components/common/Tag';
import { formatDate, chineseWeekday, plainText, excerpt } from '@/lib/utils';
import { clsx } from '@/lib/utils';
import { useGlobalFocus } from '@/lib/focusRequest';

export function ArticleReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const article = useAppStore((s) => s.articles.find((a) => a.id === id));
  const collection = useAppStore((s) =>
    s.collections.find((c) => c.id === article?.collectionId),
  );
  const deleteArticle = useAppStore((s) => s.deleteArticle);
  const addArticle = useAppStore((s) => s.addArticle);
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const isFavorited = useAppStore((s) =>
    id ? s.isFavorited('article', id) : false,
  );
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);
  const setLightbox = useUIStore((s) => s.setLightbox);

  const bodyRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  useGlobalFocus(
    'article',
    id,
    () => bodyRef.current?.querySelector('.prose-vidaos') ?? null,
    () => titleRef.current,
  );

  // 反向链接：其它文章 / 动态里用 [[本文标题]] 或 [[本文标题|别名]] 引用本文
  const backlinks = useMemo(() => {
    if (!article) return [] as Array<{ kind: 'article' | 'moment'; id: string; title: string }>;
    const esc = article.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(`\\[\\[\\s*${esc}\\s*(?:\\||\\]\\])`);
    const out: Array<{ kind: 'article' | 'moment'; id: string; title: string }> = [];
    for (const a of articles) {
      if (a.id === article.id) continue;
      if (pattern.test(a.content)) out.push({ kind: 'article', id: a.id, title: a.title || '(无题)' });
    }
    for (const m of moments) {
      if (pattern.test(m.content)) out.push({ kind: 'moment', id: m.id, title: excerpt(plainText(m.content), 40) || '(动态)' });
    }
    return out;
  }, [article, articles, moments]);

  // 正向链接：本文 [[...]] 引用的目标（存在与否）
  const outgoing = useMemo(() => {
    if (!article) return [] as Array<{ title: string; exists: boolean }>;
    const seen: string[] = [];
    for (const m of article.content.matchAll(/\[\[([^\[\]\n]+)\]\]/g)) {
      const name = m[1].split('|')[0].trim();
      if (name && !seen.includes(name)) seen.push(name);
    }
    return seen.map((t) => ({
      title: t,
      exists: articles.some((a) => a.title === t),
    }));
  }, [article, articles]);

  /** 双链跳转：目标文章存在则跳转，不存在则自动创建 */
  const openWiki = (title: string) => {
    const target =
      articles.find((x) => x.title === title) ??
      articles.find((x) => x.title.toLowerCase() === title.toLowerCase());
    if (target) {
      navigate(`/space/article/${target.id}`);
    } else {
      const id = addArticle({ title, content: '', tags: [], imageIds: [] });
      showToast(`已创建新文章「${title}」`, 'success');
      navigate(`/space/article/${id}`);
    }
  };

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
          <h1
            ref={titleRef}
            className="font-serif text-headline text-[1.75rem] sm:text-[2rem] leading-snug tracking-tight"
          >
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
        <div ref={bodyRef}>
          <MarkdownView markdown={article.content} />
        </div>

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
                  onOpen={(id) => setLightbox({ fileId: id })}
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

        {/* 双链：反向链接（谁引用了我）+ 正向链接（我引用了谁） */}
        <div className="mt-10 pt-6 border-t border-bronze/10 space-y-6">
          <section>
            <h2 className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-3">
              <Waypoints size={12} strokeWidth={1.6} /> 反向链接 · Backlinks
            </h2>
            {backlinks.length === 0 ? (
              <p className="font-sans text-bronze text-sm leading-relaxed">
                还没有内容链接到这篇文章。在其它文章里写{' '}
                <code
                  className="px-1.5 py-0.5 rounded text-xs font-mono"
                  style={{ background: 'rgb(var(--bronze-rgb) / 0.12)', color: 'var(--candle)' }}
                >
                  [[{article.title}]]
                </code>{' '}
                即可建立双向链接。
              </p>
            ) : (
              <ul className="space-y-1.5">
                {backlinks.map((b) => (
                  <li key={`${b.kind}-${b.id}`}>
                    <button
                      onClick={() =>
                        navigate(b.kind === 'article' ? `/space/article/${b.id}` : '/moments')
                      }
                      className="w-full text-left px-3 py-2 rounded-lg border border-bronze/15 hover:border-candle/40 bg-bronze/5 hover:bg-bronze/10 transition-all"
                    >
                      <p className="font-serif text-sm text-paper truncate">{b.title}</p>
                      <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mt-0.5">
                        {b.kind === 'article' ? '空间 · 文章' : '动态'}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {outgoing.length > 0 && (
            <section>
              <h2 className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-3">
                正向链接 · Outgoing
              </h2>
              <ul className="flex flex-wrap gap-2">
                {outgoing.map((o) => (
                  <li key={o.title}>
                    <button
                      onClick={() => openWiki(o.title)}
                      className={clsx(
                        'px-3 py-1 rounded-full border text-xs font-serif transition-all',
                        o.exists
                          ? 'border-candle/30 text-candle hover:border-candle hover:bg-candle/5'
                          : 'border-bronze/25 text-bronze-deep hover:border-bronze hover:text-bronze',
                      )}
                    >
                      {!o.exists && '· '}
                      {o.title}
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </article>
  );
}
