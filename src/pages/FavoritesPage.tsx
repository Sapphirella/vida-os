import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, BookOpen, MessageCircle, Search } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { relativeTime, excerpt, plainText } from '@/lib/utils';
import { usePageFind } from '@/components/search/usePageFind';
import { PageFindBar } from '@/components/search/PageFindBar';
import type { Favorite } from '@/types';

/** 收藏项的展示模型（避免在渲染里对联合类型做 any 断言） */
interface FavoriteEntry {
  favId: string;
  refType: Favorite['refType'];
  refId: string;
  type: 'article' | 'moment';
  title: string;
  excerpt: string;
  createdAt: number;
}

/** 收藏类型 → 显示名。目前只有文章与动态两种（灵感用的是自己的「星标」，不在这里）。 */
const TYPE_LABEL: Record<Favorite['refType'], string> = {
  article: '文章',
  moment: '动态',
};

export function FavoritesPage() {
  const navigate = useNavigate();
  const favorites = useAppStore((s) => s.favorites);
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const updateMoment = useAppStore((s) => s.updateMoment);
  const showToast = useUIStore((s) => s.showToast);
  const setFocusRequest = useUIStore((s) => s.setFocusRequest);

  // ── 查找 / 替换：作用于收藏引用的底层文档（替换写回 store） ──
  const findTargets = useMemo(() => {
    const out: Array<{
      id: string;
      title: string;
      content: string;
      replaceTitle?: (next: string) => void;
      replaceContent: (next: string) => void;
    }> = [];
    for (const f of favorites) {
      if (f.refType === 'article') {
        const a = articles.find((x) => x.id === f.refId);
        if (a)
          out.push({
            id: a.id,
            title: a.title || '(无题)',
            content: a.content,
            replaceTitle: (next) => updateArticle(a.id, { title: next }),
            replaceContent: (next) => updateArticle(a.id, { content: next }),
          });
      } else if (f.refType === 'moment') {
        const m = moments.find((x) => x.id === f.refId);
        if (m)
          out.push({
            id: m.id,
            title: '',
            content: m.content,
            replaceContent: (next) => updateMoment(m.id, { content: next }),
          });
      }
    }
    return out;
  }, [favorites, articles, moments, updateArticle, updateMoment]);
  const find = usePageFind<HTMLUListElement>(findTargets, {
    onToast: (msg) => showToast(msg, 'success'),
  });

  const grouped: FavoriteEntry[] = [];
  for (const f of favorites) {
    if (f.refType === 'article') {
      const a = articles.find((x) => x.id === f.refId);
      if (a) {
        grouped.push({
          favId: f.id,
          refType: f.refType,
          refId: a.id,
          type: 'article',
          title: a.title || '(无题)',
          excerpt: excerpt(plainText(a.content), 100),
          createdAt: f.createdAt,
        });
      }
    } else if (f.refType === 'moment') {
      const m = moments.find((x) => x.id === f.refId);
      if (m) {
        grouped.push({
          favId: f.id,
          refType: f.refType,
          refId: m.id,
          type: 'moment',
          title: excerpt(m.content, 60),
          excerpt: '',
          createdAt: f.createdAt,
        });
      }
    }
  }

  /**
   * 点开一条收藏。
   *
   * 文章有独立详情页（`/space/article/:id`），天然是精确位置；
   * 动态没有独立页面，只能跳到 `/moments` —— 光 navigate 会停在列表顶部/上次位置，
   * 用户反馈「点了却找不到那一条」。所以要带一个 focusRequest，
   * 由动态页的 `useGlobalFocus` 按 id 把那张卡片滚进视野并高亮（v4.7.5 修）。
   */
  const openFavorite = (g: FavoriteEntry) => {
    if (g.type === 'article') {
      navigate(`/space/article/${g.refId}`);
      return;
    }
    setFocusRequest({
      kind: 'moment',
      id: g.refId,
      query: '',
      ignoreCase: true,
      index: 0,
      inTitle: false,
      ts: Date.now(),
    });
    navigate('/moments');
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-3xl mx-auto pb-6">
        {grouped.length === 0 ? (
          <EmptyState
            title="还没有收藏"
            hint="在空间或动态中点星，就能在这里看到"
          />
        ) : (
          <>
            {/* 页内查找替换入口（面板钉在顶栏下方） */}
            <div className="flex items-center justify-end mb-3">
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
            <ul className="space-y-3" ref={find.listRef}>
              {grouped.map((g) => {
                const Icon =
                  g.type === 'article' ? BookOpen : MessageCircle;
                return (
                  <li key={g.favId} {...find.findCardProps(g.refId)}>
                    <Card
                      onClick={() => openFavorite(g)}
                      className="p-4 group hover:scale-[1.005] transition-transform"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                          style={{ background: 'rgba(106, 8, 14, 0.15)' }}
                        >
                          <Icon size={14} strokeWidth={1.4} className="text-wine-light" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3
                            className="font-serif text-headline text-base leading-snug truncate-1 group-hover:text-candle transition-colors"
                            dangerouslySetInnerHTML={{
                              // 动态收藏：标题即摘录，命中算作 content；文章：标题算 title
                              __html: find.hlText(
                                g.title,
                                g.refId,
                                g.type === 'moment' ? 'content' : 'title',
                              ),
                            }}
                          />
                          {g.excerpt && (
                            <p
                              className="font-serif text-bronze text-sm line-clamp-2 mt-1 leading-relaxed"
                              dangerouslySetInnerHTML={{
                                __html: find.hlText(g.excerpt, g.refId, 'content'),
                              }}
                            />
                          )}
                          <p className="flex items-center gap-2 mt-2">
                            {/* 类型标签：一眼看出这条收藏是文章还是动态
                                （两种类型在列表里长得很像，光看图标不好区分） */}
                            <span className="tag" style={{ fontSize: 9, padding: '2px 8px' }}>
                              {TYPE_LABEL[g.refType]}
                            </span>
                            <span className="font-mono text-[10px] text-bronze-deep">
                              {relativeTime(g.createdAt)}
                            </span>
                          </p>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFavorite(g.refType, g.refId);
                          }}
                          className="w-7 h-7 flex items-center justify-center text-candle"
                          aria-label="取消收藏"
                        >
                          <Star size={14} strokeWidth={1.5} fill="currentColor" />
                        </button>
                      </div>
                    </Card>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}
