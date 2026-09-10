import { useNavigate } from 'react-router-dom';
import { Star, BookOpen, MessageCircle, Mail } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import { relativeTime } from '@/lib/utils';

export function FavoritesPage() {
  const navigate = useNavigate();
  const favorites = useAppStore((s) => s.favorites);
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const letters = useAppStore((s) => s.letters);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);

  const grouped = favorites.map((f) => {
    if (f.refType === 'article') {
      const a = articles.find((x) => x.id === f.refId);
      return a ? { fav: f, ref: a, type: 'article' as const } : null;
    }
    if (f.refType === 'moment') {
      const m = moments.find((x) => x.id === f.refId);
      return m ? { fav: f, ref: m, type: 'moment' as const } : null;
    }
    if (f.refType === 'letter') {
      const l = letters.find((x) => x.id === f.refId);
      return l ? { fav: f, ref: l, type: 'letter' as const } : null;
    }
    return null;
  }).filter(Boolean) as Array<{
    fav: typeof favorites[0];
    ref: any;
    type: 'article' | 'moment' | 'letter';
  }>;

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
            {grouped.map(({ fav, ref, type }) => {
              const Icon = type === 'article' ? BookOpen : type === 'moment' ? MessageCircle : Mail;
              const path =
                type === 'article'
                  ? `/space/article/${ref.id}`
                  : type === 'letter'
                    ? `/mailbox/letter/${ref.id}`
                    : '/moments';
              return (
                <li key={fav.id}>
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
                          {type === 'moment' ? ref.content.slice(0, 60) : ref.title || '(无题)'}
                        </h3>
                        <p className="font-serif text-bronze text-sm line-clamp-2 mt-1 leading-relaxed">
                          {type === 'moment' ? '' : ref.content.slice(0, 100)}
                        </p>
                        <p className="font-mono text-[10px] text-bronze-deep mt-2">
                          {relativeTime(fav.createdAt)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(fav.refType, fav.refId);
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
