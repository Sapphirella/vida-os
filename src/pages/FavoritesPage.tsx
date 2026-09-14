import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, BookOpen, MessageCircle, Mail, Search } from 'lucide-react';
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
  type: 'article' | 'moment' | 'letter';
  title: string;
  excerpt: string;
  createdAt: number;
}

export function FavoritesPage() {
  const navigate = useNavigate();
  const favorites = useAppStore((s) => s.favorites);
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const letters = useAppStore((s) => s.letters);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const updateMoment = useAppStore((s) => s.updateMoment);
  const updateLetter = useAppStore((s) => s.updateLetter);
  const showToast = useUIStore((s) => s.showToast);

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
      } else {
        const l = letters.find((x) => x.id === f.refId);
        if (l)
          out.push({
            id: l.id,
            title: l.title || '(无题)',
            content: l.content,
            replaceTitle: (next) => updateLetter(l.id, { title: next }),
            replaceContent: (next) => updateLetter(l.id, { content: next }),
          });
      }
    }
    return out;
  }, [favorites, articles, moments, letters, updateArticle, updateMoment, updateLetter]);
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
    } else {
      const l = letters.find((x) => x.id === f.refId);
      if (l) {
        grouped.push({
          favId: f.id,
          refType: f.refType,
          refId: l.id,
          type: 'letter',
          title: l.title || '(无题)',
          excerpt: excerpt(plainText(l.content), 100),
          createdAt: f.createdAt,
        });
      }
    }
  }

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-3xl mx-auto pb-6">
        {grouped.length === 0 ? (
          <EmptyState
            title="还没有收藏"
            hint="在空间、动态或信箱中点星，就能在这里看到"
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
                  g.type === 'article' ? BookOpen : g.type === 'moment' ? MessageCircle : Mail;
                const path =
                  g.type === 'article'
                    ? `/space/article/${g.refId}`
                    : g.type === 'letter'
                      ? `/mailbox/letter/${g.refId}`
                      : '/moments';
                return (
                  <li key={g.favId} {...find.findCardProps(g.refId)}>
                    <Card
                      onClick={() => navigate(path)}
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
                              // 动态收藏：标题即摘录，命中算作 content；文章/信件：标题算 title
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
                          <p className="font-mono text-[10px] text-bronze-deep mt-2">
                            {relativeTime(g.createdAt)}
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
