// 页内查找替换面板：fixed 钉在顶栏下方（滚动/跳转时不消失）。
// 被动态页 / 空间页 / 收藏夹页复用；状态与动作来自 usePageFind。
// 配色遵循 VidaOS 主题色板（:root 暗夜 / [data-theme='day'] 白昼自动切换）。
import { useEffect, useRef } from 'react';
import { ArrowUp, ArrowDown, X } from 'lucide-react';
import { usePageFind } from './usePageFind';

type PageFind = ReturnType<typeof usePageFind>;

interface Props {
  find: PageFind;
  /** 查找计数高亮色（各页可传 text-amber 等） */
  activeClass?: string;
}

export function PageFindBar({ find, activeClass = 'text-amber' }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开时聚焦查找框
  useEffect(() => {
    if (find.open) {
      const t = window.setTimeout(() => inputRef.current?.focus(), 50);
      return () => window.clearTimeout(t);
    }
  }, [find.open]);

  if (!find.open) return null;

  const canReplace = find.matchCount > 0;

  return (
    <div
      className="fixed inset-x-0 z-30 px-3 sm:px-6"
      style={{ top: 'calc(56px + env(safe-area-inset-top) + 8px)' }}
      data-testid="page-find-bar"
    >
      <div className="mx-auto max-w-2xl rounded-card border border-bronze/15 bg-charcoal/95 px-3 py-2.5 shadow-card-elevated backdrop-blur-glass">
        {/* 查找行 */}
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            value={find.query}
            onChange={(e) => {
              find.setQuery(e.target.value);
              find.setActiveHit(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                find.step(e.shiftKey ? -1 : 1);
              } else if (e.key === 'Escape') {
                find.close();
              }
            }}
            placeholder="查找…"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/15 focus:border-candle/40 transition-colors"
            style={{ background: 'rgba(27,26,31,0.55)' }}
          />
          <span
            className={`shrink-0 font-mono text-[10px] whitespace-nowrap ${
              canReplace ? activeClass : 'text-bronze-deep'
            }`}
          >
            {canReplace ? `${find.activeHit + 1} / ${find.matchCount}` : '0'}
          </span>
          <button
            type="button"
            aria-label="上一个"
            className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle disabled:opacity-30 transition-colors"
            disabled={!canReplace}
            onClick={() => find.step(-1)}
          >
            <ArrowUp size={15} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            aria-label="下一个"
            className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle disabled:opacity-30 transition-colors"
            disabled={!canReplace}
            onClick={() => find.step(1)}
          >
            <ArrowDown size={15} strokeWidth={1.6} />
          </button>
          <button
            type="button"
            aria-label="关闭查找替换"
            className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            onClick={() => find.close()}
          >
            <X size={15} strokeWidth={1.6} />
          </button>
        </div>
        {/* 替换行 */}
        <div className="flex items-center gap-2 mt-2">
          <input
            value={find.replaceWith}
            onChange={(e) => find.setReplaceWith(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                find.replaceCurrent();
              }
            }}
            placeholder="替换为…"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/15 focus:border-candle/40 transition-colors"
            style={{ background: 'rgba(27,26,31,0.55)' }}
          />
          <button
            type="button"
            className="btn-primary disabled:opacity-40 flex-none"
            disabled={!canReplace}
            onClick={() => find.replaceCurrent()}
          >
            替换
          </button>
          <button
            type="button"
            className="btn-ghost disabled:opacity-40 flex-none"
            disabled={!canReplace}
            onClick={() => find.replaceAll()}
          >
            全部替换
          </button>
        </div>
      </div>
    </div>
  );
}