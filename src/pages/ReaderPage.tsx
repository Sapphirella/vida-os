// 馆藏 · 阅读器
// 连续滚动阅读 + 长按选中 → 划线 / 高亮 / 引用问 AI；所有划线高亮收进右上角「书签」。
// 标注锚点见 lib/library.ts（块索引 + 块内字符偏移），这里只负责渲染与交互。
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Bookmark,
  Copy,
  Highlighter,
  MessageSquareQuote,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { CoreadDrawer } from '@/components/library/CoreadDrawer';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  type BookAnchor,
  anchorsFromSelection,
  applyMarksToDom,
  markPreview,
  marksByBlock,
  parseBook,
  progressOf,
  resetBlockDom,
  sortMarks,
} from '@/lib/library';
import { clsx } from '@/lib/utils';
import type { BookMark } from '@/types';

export function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const book = useAppStore((s) => s.books.find((b) => b.id === id));
  const addBookMark = useAppStore((s) => s.addBookMark);
  const deleteBookMark = useAppStore((s) => s.deleteBookMark);
  const showToast = useUIStore((s) => s.showToast);

  const content = book?.content ?? '';
  const format = book?.format ?? 'txt';
  const blocks = useMemo(() => parseBook(content, format), [content, format]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const bookRef = useRef<HTMLDivElement>(null);
  const restoredRef = useRef(false);
  const [toolbar, setToolbar] = useState<{
    x: number;
    y: number;
    /** true = 浮在选区下方（上方被顶栏挡住时的翻转） */
    below: boolean;
    anchors: BookAnchor[];
  } | null>(null);
  const [marksOpen, setMarksOpen] = useState(false);
  /** null = 未打开；'' = 打开但没带引用；非空 = 携带这段引用打开 */
  const [coreadQuote, setCoreadQuote] = useState<string | null>(null);
  const [flashId, setFlashId] = useState<string | null>(null);

  const marks = book?.marks ?? [];

  // ── 标注渲染：先还原块 HTML，再把本块的标注包成 <mark> ──
  // 用 useLayoutEffect：在浏览器绘制前完成，避免「先看到无标注的正文再闪一下」
  useLayoutEffect(() => {
    const root = bookRef.current;
    if (!root) return;
    const byBlock = marksByBlock(marks);
    root.querySelectorAll<HTMLElement>('[data-block-idx]').forEach((el) => {
      const idx = Number(el.dataset.blockIdx);
      resetBlockDom(el, blocks[idx]?.html ?? el.innerHTML);
      applyMarksToDom(el, byBlock.get(idx) ?? []);
    });
    if (flashId) {
      const target = root.querySelector<HTMLElement>(`[data-mark-id="${flashId}"]`);
      if (target) {
        target.classList.add('vd-mk-flash');
        window.setTimeout(() => target.classList.remove('vd-mk-flash'), 1200);
      }
    }
  }, [marks, blocks, flashId]);

  // ── 选区 → 浮动工具条 ──
  useEffect(() => {
    const onSelectionChange = () => {
      const root = bookRef.current;
      if (!root) return;
      const anchors = anchorsFromSelection(root);
      if (!anchors.length) {
        setToolbar(null);
        return;
      }
      const sel = window.getSelection();
      if (!sel || !sel.rangeCount) {
        setToolbar(null);
        return;
      }
      const rect = sel.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) {
        setToolbar(null);
        return;
      }
      // 工具条默认浮在选区上方；上方放不下就翻到选区下方（否则会盖住固定顶栏）。
      // 顶栏底边现场量、工具条高度取实测值（4 个按钮一行约 63px）——
      // 之前拍 44px，结果移动端贴顶选中时工具条压住顶栏 8px（已实测到）。
      const half = 132;
      const x = Math.min(Math.max(rect.left + rect.width / 2, half), window.innerWidth - half);
      const barBottom = document.querySelector('header')?.getBoundingClientRect().bottom ?? 56;
      const TOOLBAR_H = 66;
      const need = barBottom + TOOLBAR_H + 8;
      const above = rect.top - 10;
      const below = above < need;
      const y = below ? Math.min(rect.bottom + 46, window.innerHeight - 12) : above;
      setToolbar({ x, y, anchors, below });
    };
    document.addEventListener('selectionchange', onSelectionChange);
    return () => document.removeEventListener('selectionchange', onSelectionChange);
  }, []);

  // 滚动/切页时收起工具条（选区还在但位置已经不对了）
  useEffect(() => {
    const onScroll = () => setToolbar(null);
    const scroller = scrollRef.current?.closest('.overflow-y-auto') ?? window;
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, []);

  // ── 恢复上次读到的位置（只在进页面时执行一次） ──
  useEffect(() => {
    if (!book || restoredRef.current || !blocks.length) return;
    const idx = Math.min(book.lastBlockIndex ?? 0, blocks.length - 1);
    if (idx > 0) {
      const el = bookRef.current?.querySelector(`[data-block-idx="${idx}"]`);
      el?.scrollIntoView({ block: 'start' });
    }
    restoredRef.current = true;
  }, [book, blocks.length]);

  // ── 记录阅读位置：谁在视口里，就记最小的那个块 ──
  const progressTimer = useRef<number | null>(null);
  useEffect(() => {
    const root = bookRef.current;
    if (!root || !book || !blocks.length) return;
    const visible = new Set<number>();
    const flush = () => {
      if (!visible.size) return;
      const idx = Math.min(...visible);
      const st = useAppStore.getState();
      const cur = st.books.find((b) => b.id === book.id);
      if (cur && cur.lastBlockIndex !== idx) st.setBookProgress(book.id, idx);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.blockIdx);
          if (e.isIntersecting) visible.add(idx);
          else visible.delete(idx);
        }
        if (progressTimer.current) window.clearTimeout(progressTimer.current);
        progressTimer.current = window.setTimeout(flush, 500);
      },
      { threshold: 0.01 },
    );
    root.querySelectorAll('[data-block-idx]').forEach((el) => io.observe(el));
    return () => {
      io.disconnect();
      if (progressTimer.current) window.clearTimeout(progressTimer.current);
    };
  }, [book?.id, blocks.length]);

  const clearSelection = useCallback(() => {
    window.getSelection()?.removeAllRanges();
    setToolbar(null);
  }, []);

  /** 划线 / 高亮：跨块的选区会拆成多条锚点，各自落在自己那一块 */
  const applyMark = (kind: BookMark['kind']) => {
    if (!book || !toolbar) return;
    const { anchors } = toolbar;
    anchors.forEach((a) =>
      addBookMark(book.id, {
        kind,
        text: a.text,
        blockIndex: a.blockIndex,
        start: a.start,
        end: a.end,
      }),
    );
    clearSelection();
    showToast(
      anchors.length > 1
        ? `已${kind === 'underline' ? '划线' : '高亮'}（跨 ${anchors.length} 段）`
        : `已${kind === 'underline' ? '划线' : '高亮'}，收进书签了`,
      'success',
    );
  };

  const askAi = () => {
    if (!toolbar) return;
    const text = toolbar.anchors.map((a) => a.text).join('\n');
    setCoreadQuote(text);
    clearSelection();
  };

  const copySelection = async () => {
    if (!toolbar) return;
    try {
      await navigator.clipboard.writeText(toolbar.anchors.map((a) => a.text).join('\n'));
      showToast('已复制', 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  /** 从书签跳到正文对应位置 */
  const jumpTo = (m: BookMark) => {
    const el = bookRef.current?.querySelector<HTMLElement>(`[data-block-idx="${m.blockIndex}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setFlashId(null);
    window.setTimeout(() => setFlashId(m.id), 320);
    setMarksOpen(false);
  };

  if (!book) {
    return (
      <div className="px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <EmptyState
            title="这本书不在书架上了"
            hint="可能已经被移出书架，回书架看看其它书"
            action={
              <button className="btn-primary" onClick={() => navigate('/library')}>
                回书架
              </button>
            }
          />
        </div>
      </div>
    );
  }

  const progress = progressOf(book, blocks.length);
  const sortedMarks = sortMarks(marks);

  return (
    <div className="px-4 sm:px-6">
      <div className="max-w-3xl mx-auto pb-8">
        {/* 本页工具行：返回 + 共读 + 书签（右上角） */}
        <div
          className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-2 flex items-center gap-2"
          style={{ background: 'var(--bar-bg)', backdropFilter: 'blur(16px) saturate(140%)' }}
        >
          <button
            onClick={() => navigate('/library')}
            className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle"
            aria-label="回书架"
          >
            <ArrowLeft size={16} strokeWidth={1.6} />
          </button>
          <div className="flex-1 min-w-0">
            <p className="font-serif text-headline text-sm truncate">{book.title}</p>
            <p className="font-mono text-[9px] tracking-widest text-bronze-deep uppercase">
              {book.charCount} 字 · 读到 {Math.round(progress * 100)}%
            </p>
          </div>
          <button
            onClick={() => setCoreadQuote('')}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-mono tracking-wider bg-bronze/10 text-bronze hover:text-candle transition-colors"
            aria-label="共读"
          >
            <MessageSquareQuote size={12} strokeWidth={1.6} /> 共读
          </button>
          <button
            onClick={() => setMarksOpen(true)}
            className={clsx(
              'relative flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-mono tracking-wider transition-colors',
              marks.length
                ? 'bg-wine/25 text-candle'
                : 'bg-bronze/10 text-bronze hover:text-candle',
            )}
            aria-label="书签"
          >
            <Bookmark size={12} strokeWidth={1.6} />
            书签
            {marks.length > 0 && (
              <span className="font-mono text-[9px] text-amber">{marks.length}</span>
            )}
          </button>
        </div>

        {/* 正文 */}
        <div
          ref={scrollRef}
          className={clsx('vd-book prose-vidaos select-text', book.format === 'txt' && 'vd-book-txt')}
        >
          <div ref={bookRef}>
            {blocks.map((b) => (
              <div
                key={b.index}
                data-block-idx={b.index}
                className="vd-block"
                dangerouslySetInnerHTML={{ __html: b.html }}
              />
            ))}
          </div>
        </div>

        {blocks.length === 0 && (
          <p className="text-bronze text-sm mt-6">这本没有可显示的正文。</p>
        )}
      </div>

      {/* 选中后的浮动工具条 */}
      {toolbar && (
        <div
          className={clsx(
            'fixed z-40 -translate-x-1/2',
            toolbar.below ? 'translate-y-0' : '-translate-y-full',
          )}
          style={{ left: toolbar.x, top: toolbar.y }}
          onMouseDown={(e) => e.preventDefault()}
        >
          <div
            className="flex items-center gap-0.5 rounded-pill px-1.5 py-1 shadow-card-elevated border border-bronze/20"
            style={{ background: 'var(--card-bg-elevated)', backdropFilter: 'blur(14px)' }}
          >
            <ToolBtn icon={Underline} label="划线" onClick={() => applyMark('underline')} />
            <ToolBtn icon={Highlighter} label="高亮" onClick={() => applyMark('highlight')} />
            <ToolBtn icon={MessageSquareQuote} label="问 AI" onClick={askAi} />
            <ToolBtn icon={Copy} label="复制" onClick={() => void copySelection()} />
          </div>
        </div>
      )}

      {/* 书签面板（右上角按钮打开） */}
      {marksOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.42)' }}
            onClick={() => setMarksOpen(false)}
          />
          <aside
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm overflow-y-auto border-l border-bronze/15"
            style={{ background: 'var(--card-bg-elevated)' }}
          >
            <div className="sticky top-0 flex items-center gap-2 px-4 py-3 border-b border-bronze/10"
              style={{ background: 'var(--card-bg-elevated)' }}>
              <Bookmark size={15} strokeWidth={1.5} className="text-amber" />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-title text-headline">书签</p>
                <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
                  {marks.length} 处划线 / 高亮 · 《{book.title}》
                </p>
              </div>
              <button
                onClick={() => setMarksOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
                aria-label="关闭"
              >
                <X size={16} strokeWidth={1.6} />
              </button>
            </div>

            {sortedMarks.length === 0 ? (
              <p className="px-4 py-6 text-bronze text-xs leading-relaxed">
                还没有划线。回到正文<span className="text-candle">长按选中一段</span>，
                点「划线」或「高亮」，就会收进这里。
              </p>
            ) : (
              <ul className="p-3 space-y-2">
                {sortedMarks.map((m) => (
                  <li key={m.id}>
                    <div
                      className="rounded-card border border-bronze/15 px-3 py-2.5"
                      style={{ background: 'var(--card-bg)' }}
                    >
                      <div className="flex items-start gap-2">
                        <button
                          onClick={() => jumpTo(m)}
                          className="flex-1 min-w-0 text-left"
                          title="跳到正文"
                        >
                          <span className="flex items-center gap-1.5 mb-1">
                            {m.kind === 'underline' ? (
                              <Underline size={11} strokeWidth={1.8} className="text-candle" />
                            ) : (
                              <Highlighter size={11} strokeWidth={1.8} className="text-amber" />
                            )}
                            <span className="font-mono text-[9px] tracking-widest text-bronze-deep uppercase">
                              第 {m.blockIndex + 1} 段
                            </span>
                          </span>
                          <span className="block font-serif text-[13px] text-paper leading-relaxed">
                            {markPreview(m.text)}
                          </span>
                        </button>
                        <button
                          onClick={() => {
                            deleteBookMark(book.id, m.id);
                            showToast('已删除标注', 'info');
                          }}
                          className="w-6 h-6 flex-none flex items-center justify-center text-bronze hover:text-wine-bright"
                          aria-label="删除标注"
                        >
                          <Trash2 size={12} strokeWidth={1.6} />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-4 pb-6 font-mono text-[10px] tracking-wider text-bronze-deep leading-relaxed">
              标注存在本机，也会随 JSON / WebDAV / 快照备份一起走。
            </p>
          </aside>
        </>
      )}

      {/* 共读抽屉 */}
      {coreadQuote !== null && (
        <CoreadDrawer
          book={book}
          quote={coreadQuote}
          onClose={() => setCoreadQuote(null)}
          onQuoteConsumed={() => setCoreadQuote('')}
        />
      )}
    </div>
  );
}

function ToolBtn({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof Underline;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-mono tracking-wider text-paper hover:bg-bronze/15 transition-colors"
    >
      <Icon size={12} strokeWidth={1.6} />
      {label}
    </button>
  );
}
