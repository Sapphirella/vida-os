import { NotebookPen } from 'lucide-react';

export function DiaryPage() {
  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto py-20 flex flex-col items-center text-center gap-4">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center border border-bronze/20"
          style={{ background: 'rgba(106, 8, 14, 0.15)' }}
        >
          <NotebookPen size={22} strokeWidth={1.4} className="text-wine-light" />
        </div>
        <h2 className="font-serif text-headline text-xl">日记</h2>
        <p className="text-bronze text-sm leading-relaxed max-w-xs">
          记录每一天的想法与心情。这里即将开放。
        </p>
      </div>
    </div>
  );
}