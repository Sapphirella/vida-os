import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { excerpt, plainText, relativeTime } from '@/lib/utils';

export function CollectionPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const collection = useAppStore((s) => s.collections.find((c) => c.id === id));
  const articles = useAppStore((s) =>
    s.articles.filter((a) => a.collectionId === id),
  );
  const updateCollection = useAppStore((s) => s.updateCollection);
  const deleteCollection = useAppStore((s) => s.deleteCollection);
  const showToast = useUIStore((s) => s.showToast);
  const openEditor = useUIStore((s) => s.openEditor);

  if (!collection) {
    return (
      <div className="px-4 sm:px-6 view-enter">
        <div className="max-w-5xl mx-auto py-12 text-center">
          <p className="text-bronze">合集不存在</p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-5xl mx-auto pb-6">
        {/* 合集头部 */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1">
              <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-1">
                collection
              </p>
              <h2 className="font-serif text-moon text-huge">{collection.name}</h2>
              {collection.desc && (
                <p className="font-serif italic text-bronze mt-2 leading-relaxed">
                  {collection.desc}
                </p>
              )}
              <p className="font-mono text-[10px] text-bronze-deep mt-2">
                {articles.length} 篇 · 创建于 {new Date(collection.createdAt).toLocaleDateString('zh-CN')}
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <button
                onClick={() =>
                  openEditor({ mode: 'article', collectionId: collection.id })
                }
                className="btn-primary"
                style={{ padding: '6px 12px', fontSize: '0.75rem' }}
              >
                写一篇
              </button>
              <button
                onClick={() => {
                  const name = prompt('新名称', collection.name);
                  if (name && name.trim()) {
                    updateCollection(collection.id, { name: name.trim() });
                    showToast('已重命名', 'success');
                  }
                }}
                className="btn-text"
              >
                重命名
              </button>
              <button
                onClick={() => {
                  if (
                    confirm(
                      `删除合集「${collection.name}」？\n合集下的文章不会被删除，但会移出此合集。`,
                    )
                  ) {
                    deleteCollection(collection.id);
                    navigate('/space');
                    showToast('合集已删除', 'success');
                  }
                }}
                className="btn-text wine"
              >
                删除
              </button>
            </div>
          </div>
        </div>

        {articles.length === 0 ? (
          <EmptyState
            title="合集还空着"
            hint="把属于这里的第一篇文章放进来"
            action={
              <button
                onClick={() => openEditor({ mode: 'article', collectionId: collection.id })}
                className="btn-primary"
              >
                写一篇
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {articles.map((a) => (
              <li key={a.id}>
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
                      <h3 className="font-serif text-moon text-lg leading-snug mb-1 truncate-2 group-hover:text-candle transition-colors">
                        {a.title}
                      </h3>
                      <p className="font-serif text-bronze text-sm line-clamp-2 leading-relaxed">
                        {excerpt(plainText(a.content), 100)}
                      </p>
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
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
      </div>
    </div>
  );
}

// 重新导入 useUIStore
import { useUIStore } from '@/stores/useUIStore';
