import { useNavigate } from 'react-router-dom';
import { Star, BookOpen, MessageCircle, Mail } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import { relativeTime, excerpt, plainText } from '@/lib/utils';
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
          <ul className="space-y-3">
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
                <li key={g.favId}>
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
                        <h3 className="font-serif text-moon text-base leading-snug truncate-1 group-hover:text-candle transition-colors">
                          {g.title}
                        </h3>
                        {g.excerpt && (
                          <p className="font-serif text-bronze text-sm line-clamp-2 mt-1 leading-relaxed">
                            {g.excerpt}
                          </p>
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
        )}
      </div>
    </div>
  );
}
