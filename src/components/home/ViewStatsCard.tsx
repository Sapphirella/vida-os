import { useMemo } from 'react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { plainText } from '@/lib/utils';

const fmt = (n: number) => n.toLocaleString('zh-CN');

/** 主页 · 视图：文章/动态/灵感/书 的数量与字数统计
 *  数量与字数分开展示，且单位显式（篇/条/本、字），避免把字数误读成条数。
 *  字数口径与编辑器一致：剥掉 Markdown 标记后统计 */
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
    { label: '文章', value: stats.articleCount, unit: '篇' },
    { label: '动态', value: stats.momentCount, unit: '条' },
    { label: '灵感', value: stats.inspirationCount, unit: '条' },
    { label: '书', value: stats.bookCount, unit: '本' },
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

      {/* 数量：数字带单位（篇 / 条 / 本） */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {counts.map((c) => (
          <div
            key={c.label}
            className="rounded-xl bg-bronze/5 border border-bronze/10 px-3 py-3 text-center"
          >
            <p className="font-serif text-headline text-xl leading-none">
              {fmt(c.value)}
              <span className="text-sm text-bronze ml-0.5">{c.unit}</span>
            </p>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mt-1.5">
              {c.label}
            </p>
          </div>
        ))}
      </div>

      {/* 字数：每项显式「字」，底部合计 */}
      <div className="rounded-xl border border-bronze/10 px-4 py-3">
        <div className="flex items-center justify-between font-mono text-[10px] tracking-widest text-bronze-deep uppercase mb-2">
          <span>字数统计</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-y-2 gap-x-4 mb-3">
          {charRows.map((r) => (
            <div key={r.label} className="flex items-baseline justify-between gap-2">
              <span className="font-serif text-bronze text-xs">{r.label}</span>
              <span className="font-mono text-sm text-paper">{fmt(r.value)} 字</span>
            </div>
          ))}
        </div>
        <div className="border-t border-bronze/10 pt-2.5 flex items-baseline justify-between">
          <span className="font-serif text-bronze text-sm">合计</span>
          <span className="font-mono text-lg text-headline">{fmt(stats.totalChars)} 字</span>
        </div>
      </div>
    </Card>
  );
}
