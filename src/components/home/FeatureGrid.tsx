import { useNavigate } from 'react-router-dom';
import { BookOpen, MessageCircle, LibraryBig, Star } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { clsx } from '@/lib/utils';
import type { FeatureKey } from '@/types';

const FEATURES: {
  key: FeatureKey;
  label: string;
  en: string;
  icon: typeof BookOpen;
  path: string;
  desc: string;
}[] = [
  { key: 'space', label: '空间', en: 'Space', icon: BookOpen, path: '/space', desc: '长文与合集' },
  { key: 'moments', label: '动态', en: 'Moments', icon: MessageCircle, path: '/moments', desc: '朋友圈碎片' },
  // v4.4：便签上位到底栏，这一格改成馆藏（书架 + 阅读器）
  { key: 'library', label: '馆藏', en: 'Library', icon: LibraryBig, path: '/library', desc: '书架 · 划线 · 共读' },
  { key: 'favorites', label: '收藏夹', en: 'Favorites', icon: Star, path: '/favorites', desc: '收藏的项目' },
];

export function FeatureGrid() {
  const navigate = useNavigate();

  return (
    <section className="px-4 sm:px-6 pb-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center gap-3 mb-3 px-1">
          <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            navigate
          </span>
          <div className="flex-1 h-px bg-bronze/10" />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {FEATURES.map(({ key, label, en, icon: Icon, path, desc }) => (
            <Card
              key={key}
              onClick={() => navigate(path)}
              className="group p-4 sm:p-5 transition-all hover:scale-[1.02]"
            >
              <div className="flex flex-col h-full">
                <div
                  className={clsx(
                    'w-9 h-9 rounded-full flex items-center justify-center mb-3',
                    'border border-bronze/20 transition-all',
                    'group-hover:border-wine/40 group-hover:bg-wine/10',
                  )}
                >
                  <Icon
                    size={18}
                    strokeWidth={1.4}
                    className="text-bronze-light group-hover:text-candle transition-colors"
                  />
                </div>
                <h3 className="font-serif text-headline text-lg leading-none mb-0.5">
                  {label}
                </h3>
                <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mb-2">
                  {en}
                </p>
                <p className="font-sans text-bronze text-xs mt-auto leading-relaxed">
                  {desc}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
