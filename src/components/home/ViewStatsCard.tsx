import { useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { plainText } from '@/lib/utils';

const fmt = (n: number) => n.toLocaleString('zh-CN');

/** 主页 · 视图：文章/动态/灵感/书 的数量与字数统计（字数口径与编辑器一致：剥掉 Markdown 标记） */
export function ViewStatsCard() {
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const inspirations = useAppStore((s) => s.notes.inspiration);
  const books = useAppStore((s) => s.books);

  const stats = useMemo(() => {
    const articleChars = articles.reduce((n, a) => n + plainText(a.content).length, 0);
    const momentChars = moments.reduce((n, m) => n + plainText(m.content).length, 0);
    const inspirationChars = inspirations.reduce((n, i) => n + plainText(i.content).length, 0);
    const bookChars = books.reduce((n, b) => n + (b.charCount ?? plainText(b.content).length), 0);
    return {
      articleCount: articles.length,
      momentCount: moments.length,
      inspirationCount: inspirations.length,
      bookCount: books.length,
      articleChars,
      momentChars,
      inspirationChars,
      bookChars,
      totalChars: articleChars + momentChars + inspirationChars + bookChars,
    };
  }, [articles, moments, inspirations, books]);

  const counts = [
    { label: '文章', value: stats.articleCount },
    { label: '动态', value: stats.momentCount },
    { label: '灵感', value: stats.inspirationCount },
    { label: '书', value: stats.bookCount },
  ];
  const charRows = [
    { label: '文章', value: stats.articleChars },
    { label: '动态', value: stats.momentChars },
    { label: '灵感', value: stats.inspirationChars },
    { label: '书', value: stats.bookChars },
  ];

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-center gap-3 mb-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            view
          </p>
          <h3 className="font-serif text-headline text-lg mt-0.5">视图</h3>
        </div>
        <div className="flex-1 h-px bg-bronze/10" />
      </div>

      {/* 数量 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {counts.map((c) => (
          <div
            key={c.label}
            className="rounded-xl bg-bronze/5 border border-bronze/10 px-3 py-3 text-center"
          >
            <p className="font-serif text-headline text-xl leading-none">{fmt(c.value)}</p>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mt-1.5">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* 字数 */}
      <div className="rounded-xl border border-bronze/10 px-4 py-3">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-bronze-deep uppercase mb-2">
          <span>字数统计</span>
          <span>合计 {fmt(stats.totalChars)} 字</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4">
          {charRows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-2">
              <span className="font-serif text-bronze text-xs">{r.label}</span>
              <span className="font-mono text-sm text-paper">{fmt(r.value)}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
