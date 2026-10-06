import { useEffect, useMemo, useState } from 'react';
import { Plus, BookOpen, FolderPlus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { plainText, excerpt, relativeTime } from '@/lib/utils';
import { usePageFind } from '@/components/search/usePageFind';
import { PageFindBar } from '@/components/search/PageFindBar';
import { ArticleTags, type ArticleTag } from '@/components/space/ArticleTags';

export function SpacePage() {
  const navigate = useNavigate();
  const articles = useAppStore((s) => s.articles);
  const collections = useAppStore((s) => s.collections);
  const addCollection = useAppStore((s) => s.addCollection);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const renameArticleTag = useAppStore((s) => s.renameArticleTag);
  const deleteArticleTag = useAppStore((s) => s.deleteArticleTag);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  /** 当前用于筛选文章的标签（null = 全部） */
  const [activeTag, setActiveTag] = useState<string | null>(null);

  /**
   * 标签列表 = 所有文章 tags 的并集（带使用次数），按用得多的排前面。
   * **刻意不做「标签注册表」**：列表完全由文章派生，所以不会出现
   * 「注册表里有、没有任何文章在用」的幽灵标签（灵感/日程/待办那套分类桶就有这个毛病）。
   */
  const tagList = useMemo<ArticleTag[]>(() => {
    const m = new Map<string, number>();
    for (const a of articles) {
      for (const t of a.tags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
    }
    return [...m.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((x, y) => y.count - x.count || x.name.localeCompare(y.name));
  }, [articles]);

  // 正在筛选的标签没了吗（被删掉 / 改名了 / 最后一篇用它的文章删了）→ 自动退出筛选，
  // 否则会卡在一个不存在的标签上：列表空白、也没有入口清掉
  useEffect(() => {
    if (activeTag && !tagList.some((t) => t.name === activeTag)) setActiveTag(null);
  }, [activeTag, tagList]);

  const shownArticles = useMemo(
    () => (activeTag ? articles.filter((a) => (a.tags ?? []).includes(activeTag)) : articles),
    [articles, activeTag],
  );

  // ── 查找 / 替换（作用于文章标题 + 正文，替换写回 store） ──
  const findTargets = useMemo(
    () =>
      articles.map((a) => ({
        id: a.id,
        title: a.title,
        content: a.content,
        replaceTitle: (next: string) => updateArticle(a.id, { title: next }),
        replaceContent: (next: string) => updateArticle(a.id, { content: next }),
      })),
    [articles, updateArticle],
  );
  const find = usePageFind<HTMLUListElement>(findTargets, {
    onToast: (msg) => showToast(msg, 'success'),
  });

  const handleCreateCollection = () => {
    // 留空点「创建」以前什么都不发生（v4.7.11 修：说清原因）
    if (!newName.trim()) {
      showToast('请填写合集名', 'error');
      return;
    }
    addCollection(newName.trim(), newDesc.trim());
    setNewName('');
    setNewDesc('');
    setCreating(false);
    showToast('合集已创建', 'success');
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-5xl mx-auto pb-6">
        {/* 操作行 */}
        <div className="flex items-center gap-2 mt-6 mb-4">
          <button
            onClick={() =>
              openEditor({ mode: 'article', open: true })
            }
            className="btn-primary"
            style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
          >
            <Plus size={14} strokeWidth={1.6} /> 写文章
          </button>
          <button onClick={() => setCreating(true)} className="btn-ghost">
            <FolderPlus size={14} strokeWidth={1.5} /> 新建合集
          </button>
          <div className="flex-1" />
          {/* 页内查找替换入口（面板钉在顶栏下方） */}
          <button
            onClick={() => find.toggleOpen()}
            aria-expanded={find.open}
            className={`flex items-center gap-1.5 font-mono text-[11px] tracking-wider transition-colors ${
              find.open ? 'text-amber' : 'text-bronze hover:text-candle'
            }`}
          >
            <Search size={14} strokeWidth={1.6} />
            查找替换
          </button>
        </div>

        {/* 页内查找替换面板：fixed 钉在顶栏下方，滚动/跳转不消失 */}
        <PageFindBar find={find} activeClass="text-[color:var(--find-fg)]" />

        {creating && (
          <Card className="p-4 mb-4 animate-slide-up">
            <input
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="合集名"
              className="w-full bg-transparent font-serif text-lg text-paper placeholder:text-bronze-deep outline-none"
            />
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="简介（可选）"
              className="w-full bg-transparent mt-2 font-sans text-sm text-bronze placeholder:text-bronze-deep outline-none"
            />
            <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-bronze/10">
              <button onClick={() => setCreating(false)} className="btn-text">
                取消
              </button>
              <button onClick={handleCreateCollection} className="btn-primary" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                创建
              </button>
            </div>
          </Card>
        )}

        {/* 合集 */}
        {collections.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-3 mb-3 px-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
                collections
              </span>
              <div className="flex-1 h-px bg-bronze/10" />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {collections.map((c) => {
                const count = articles.filter((a) => a.collectionId === c.id).length;
                return (
                  <Card
                    key={c.id}
                    onClick={() => navigate(`/space/collection/${c.id}`)}
                    className="p-4 hover:scale-[1.02] transition-transform"
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center mb-3"
                      style={{ background: 'rgba(106, 8, 14, 0.2)' }}
                    >
                      <BookOpen size={14} strokeWidth={1.4} className="text-wine-light" />
                    </div>
                    <h3 className="font-serif text-headline text-base leading-tight mb-1 truncate-1">
                      {c.name}
                    </h3>
                    {c.desc && (
                      <p className="font-sans text-bronze text-xs truncate-2 leading-relaxed">
                        {c.desc}
                      </p>
                    )}
                    <p className="font-mono text-[10px] text-bronze-deep tracking-wider mt-2">
                      {count} 篇
                    </p>
                  </Card>
                );
              })}
            </div>
          </section>
        )}

        {/* 标签（合集与文章之间）：点一下筛选下面的文章 */}
        {tagList.length > 0 && (
          <section className="mb-6">
            <div className="flex items-center gap-3 mb-3 px-1">
              <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
                tags · {tagList.length}
              </span>
              <div className="flex-1 h-px bg-bronze/10" />
            </div>
            <ArticleTags
              tags={tagList}
              active={activeTag}
              onSelect={setActiveTag}
              onRename={(from, to) => {
                const n = renameArticleTag(from, to);
                // 正在按它筛选时跟着改名，别把筛选条件变成失效的旧名字
                setActiveTag((cur) => (cur === from ? to.trim() : cur));
                showToast(`已把 #${from} 改成 #${to.trim()}（${n} 篇）`, 'success');
              }}
              onDelete={async (tag) => {
                const n = tagList.find((t) => t.name === tag)?.count ?? 0;
                const ok = await useUIStore
                  .getState()
                  .confirmDialog(
                    `删除标签 #${tag}？\n\n会从 ${n} 篇文章上摘掉这个标签，文章本身不会被删除。`,
                  );
                if (!ok) return;
                const done = deleteArticleTag(tag);
                showToast(`已删除标签 #${tag}（${done} 篇）`, 'info');
              }}
            />
          </section>
        )}

        {/* 文章列表 */}
        <section>
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
              articles{activeTag ? ` · #${activeTag}` : ''}
            </span>
            {activeTag && (
              <button
                onClick={() => setActiveTag(null)}
                className="tag tag-wine"
                style={{ fontSize: 9, padding: '2px 8px' }}
                aria-label="清除标签筛选"
              >
                #{activeTag}
                <X size={9} strokeWidth={2.4} />
              </button>
            )}
            <div className="flex-1 h-px bg-bronze/10" />
          </div>
          {articles.length === 0 ? (
            <EmptyState
              title="空间还空着"
              hint="写下你的第一篇长文，把想法安放"
              action={
                <button
                  onClick={() => openEditor({ mode: 'article', open: true })}
                  className="btn-primary"
                >
                  <Plus size={14} strokeWidth={1.6} /> 写文章
                </button>
              }
            />
          ) : (
            <ul className="space-y-3" ref={find.listRef}>
              {shownArticles.map((a) => (
                <li key={a.id} {...find.findCardProps(a.id)}>
                  <Card
                    onClick={() => navigate(`/space/article/${a.id}`)}
                    className="p-4 sm:p-5 group hover:scale-[1.005] transition-transform"
                  >
                    <div className="flex gap-3">
                      {a.coverId && (
                        <div className="w-20 h-20 rounded-card overflow-hidden flex-shrink-0">
                          <MediaImage fileId={a.coverId} className="w-full h-full object-cover" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <h3
                          className="font-serif text-headline text-lg leading-snug mb-1 truncate-2 group-hover:text-candle transition-colors"
                          dangerouslySetInnerHTML={{
                            __html: find.hlText(a.title, a.id, 'title'),
                          }}
                        />
                        <p
                          className="font-serif text-bronze text-sm line-clamp-2 leading-relaxed"
                          dangerouslySetInnerHTML={{
                            __html: find.hlText(excerpt(plainText(a.content), 100), a.id, 'content'),
                          }}
                        />
                        <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                          {a.collectionId &&
                            collections.find((c) => c.id === a.collectionId) && (
                              <Tag variant="wine">
                                {collections.find((c) => c.id === a.collectionId)!.name}
                              </Tag>
                            )}
                          {a.tags.slice(0, 3).map((t) => (
                            <Tag key={t}>#{t}</Tag>
                          ))}
                          <span className="font-mono text-[10px] text-bronze-deep ml-auto">
                            {relativeTime(a.updatedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
