import { useMemo, useState } from 'react';
import { Plus, BookOpen, FolderPlus, Search } from 'lucide-react';
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

export function SpacePage() {
  const navigate = useNavigate();
  const articles = useAppStore((s) => s.articles);
  const collections = useAppStore((s) => s.collections);
  const addCollection = useAppStore((s) => s.addCollection);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');

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
    if (!newName.trim()) return;
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

        {/* 文章列表 */}
        <section>
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
              articles
            </span>
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
              {articles.map((a) => (
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
