// 馆藏 · 阅读器
// 连续滚动阅读 + 长按选中 → 划线 / 高亮 / 引用问 AI；所有划线高亮收进右上角「书签」。
// 标注锚点见 lib/library.ts（块索引 + 块内字符偏移），这里只负责渲染与交互。
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Bookmark,
  Check,
  Copy,
  Highlighter,
  ListTree,
  Pencil,
  Plus,
  Trash2,
  Underline,
  X,
} from 'lucide-react';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  type BookAnchor,
  anchorsFromSelection,
  applyMarksToDom,
  chapterIndexOfBlock,
  markPreview,
  marksByBlock,
  parseBook,
  progressOf,
  resetBlockDom,
  sortMarks,
} from '@/lib/library';
import { clsx } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';
import type { BookChapter, BookMark } from '@/types';

export function ReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const book = useAppStore((s) => s.books.find((b) => b.id === id));
  /** Agent 关掉时，它的专属书在书架隐藏；直接敲 URL 进来看也不该放行 */
  const agentEnabled = useAppStore((s) => s.settings.agentEnabled !== false);
  const addBookMark = useAppStore((s) => s.addBookMark);
  const deleteBookMark = useAppStore((s) => s.deleteBookMark);
  const addBookChapter = useAppStore((s) => s.addBookChapter);
  const renameBookChapter = useAppStore((s) => s.renameBookChapter);
  const removeBookChapter = useAppStore((s) => s.removeBookChapter);
  const touchBookLastRead = useAppStore((s) => s.touchBookLastRead);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);

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
  const [tocOpen, setTocOpen] = useState(false);
  /** 视口最靠上的块 —— 目录页据此高亮「正在读这一章」 */
  const [curBlock, setCurBlock] = useState(0);
  const [flashId, setFlashId] = useState<string | null>(null);

  // book.marks 缺失时要兜一个空数组 —— 但不能每次渲染都新建一个字面量：
  // 那会让下面「还原 + 重套标注」的 useLayoutEffect 每渲染一次就跑一遍
  // （滚动改变 curBlock 也会触发渲染），在长文上白白重扫全部块。
  const marks = useMemo(() => book?.marks ?? [], [book?.marks]);
  const chapters = useMemo(() => book?.chapters ?? [], [book?.chapters]);
  const curChapter = chapterIndexOfBlock(chapters, curBlock);

  // 老数据（v4.6 之前导入的书）可能没有目录：进页面时补解析一次，只补一次，
  // 否则 set → 重新渲染 → 再补 的循环会一直转
  const rebuiltRef = useRef(false);
  useEffect(() => {
    if (rebuiltRef.current || !book || chapters.length || !blocks.length) return;
    rebuiltRef.current = true;
    useAppStore.getState().rebuildBookChapters(book.id);
  }, [book?.id, chapters.length, blocks.length]);

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
      // 一条标注可能被拆成多个 <mark>（跨行内元素），要全部闪
      const targets = root.querySelectorAll<HTMLElement>(`[data-mark-id="${flashId}"]`);
      targets.forEach((t) => t.classList.add('vd-mk-flash'));
      window.setTimeout(() => targets.forEach((t) => t.classList.remove('vd-mk-flash')), 1200);
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
      // 触屏设备（手机/平板）一律放到选区**下方**：安卓长按会弹出原生选择工具条，
      // 它就长在选区上方，我们的工具条放上面会被挡住（用户实测反馈）。
      // 触屏判定用两个信号：maxTouchPoints（安卓/平板一定 > 0）与 pointer:coarse
      // （无头仿真里只有后者可能不准，两个取或更稳）
      const touch =
        (navigator.maxTouchPoints ?? 0) > 0 ||
        (window.matchMedia?.('(pointer: coarse)').matches ?? false);
      const below = touch || above < need;
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

  // ── 打开这本书：记「最近阅读时间」（书架按此排序/置顶区排序） ──
  useEffect(() => {
    if (!book) return;
    touchBookLastRead(book.id);
  }, [book?.id, touchBookLastRead]);

  // ── 恢复上次读到的位置（只在进页面时执行一次） ──
  useEffect(() => {
    if (!book || restoredRef.current || !blocks.length) return;
    const idx = Math.min(book.lastBlockIndex ?? 0, blocks.length - 1);
    setCurBlock(idx);
    if (idx > 0) {
      const el = bookRef.current?.querySelector(`[data-block-idx="${idx}"]`);
      el?.scrollIntoView({ block: 'start' });
    }
    restoredRef.current = true;
  }, [book, blocks.length]);

  // ── 记录阅读位置 ──
  // 常规情况：谁在视口里就记最小的那个块（= 你正在看的位置）。
  // 例外（v4.4.1 修）：滑到最底部时，最后一屏里「最靠上的块」并不是最后一块，
  // 于是进度永远差几个百分点（实测 44 块的书停在 93%）。所以到底部就直接记最后一块。
  const progressTimer = useRef<number | null>(null);
  useEffect(() => {
    const root = bookRef.current;
    if (!root || !book || !blocks.length) return;
    const scroller = (scrollRef.current?.closest('.overflow-y-auto') ?? null) as HTMLElement | null;
    const visible = new Set<number>();
    const write = (idx: number) => {
      const st = useAppStore.getState();
      const cur = st.books.find((b) => b.id === book.id);
      if (cur && cur.lastBlockIndex !== idx) st.setBookProgress(book.id, idx);
    };
    const atBottom = () => {
      if (!scroller) return false;
      return scroller.scrollTop + scroller.clientHeight >= scroller.scrollHeight - 8;
    };
    const flush = () => {
      if (atBottom()) {
        write(blocks.length - 1);
        setCurBlock(blocks.length - 1);
        return;
      }
      if (!visible.size) return;
      const top = Math.min(...visible);
      write(top);
      setCurBlock(top);
    };
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const idx = Number((e.target as HTMLElement).dataset.blockIdx);
          if (e.isIntersecting) visible.add(idx);
          else visible.delete(idx);
        }
        if (progressTimer.current) window.clearTimeout(progressTimer.current);
        progressTimer.current = window.setTimeout(flush, 300);
      },
      { threshold: 0.01 },
    );
    root.querySelectorAll('[data-block-idx]').forEach((el) => io.observe(el));
    // 滚动到底的那一刻 IntersectionObserver 可能不再变化，所以自己也听一次 scroll
    const onScroll = () => {
      if (!atBottom()) return;
      if (progressTimer.current) window.clearTimeout(progressTimer.current);
      progressTimer.current = window.setTimeout(flush, 120);
    };
    scroller?.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      io.disconnect();
      scroller?.removeEventListener('scroll', onScroll);
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

  const copySelection = async () => {
    if (!toolbar) return;
    const ok = await copyText(toolbar.anchors.map((a) => a.text).join('\n'));
    showToast(ok ? '已复制' : '复制失败', ok ? 'success' : 'error');
  };

  /** 从书签跳到正文对应位置：优先定位到标注本身（同一段内多条标注也能精确分开），兜底段落 */
  const jumpTo = (m: BookMark) => {
    const root = bookRef.current;
    const markEl = root?.querySelector<HTMLElement>(`[data-mark-id="${m.id}"]`);
    const el = markEl ?? root?.querySelector<HTMLElement>(`[data-block-idx="${m.blockIndex}"]`);
    if (!el) return;
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    setFlashId(null);
    window.setTimeout(() => setFlashId(m.id), 320);
    setMarksOpen(false);
  };

  /** 跳到某章开头：块索引就是章节边界，滚动后目录会自动高亮到那一章 */
  const gotoChapter = (c: BookChapter) => {
    const el = bookRef.current?.querySelector<HTMLElement>(`[data-block-idx="${c.from}"]`);
    if (!el) {
      showToast('这一章的正文已经不在了', 'error');
      return;
    }
    el.scrollIntoView({ block: 'start', behavior: 'smooth' });
    setCurBlock(c.from);
    setTocOpen(false);
  };

  /** 新建章节：以「当前阅读位置」为起点 —— 语义是「我读到这里，往后另起一章」 */
  const openAddChapter = () => {
    if (!book) return;
    showModal({
      title: '新建章节',
      content: (
        <ChapterTitleField
          initial=""
          hint={`将从你当前读到的位置（第 ${curBlock + 1} 段）开始新的一章。`}
          placeholder="章节标题"
          onDone={(title) => {
            const ok = addBookChapter(book.id, { title, from: curBlock });
            useUIStore.getState().closeModal();
            showToast(ok ? '已新建章节' : '这一段已经是章节开头了', ok ? 'success' : 'info');
          }}
        />
      ),
    });
  };

  const openRenameChapter = (c: BookChapter) => {
    if (!book) return;
    showModal({
      title: '重命名章节',
      content: (
        <ChapterTitleField
          initial={c.title}
          hint="只改目录里显示的标题，正文一个字都不会动。"
          placeholder="章节标题"
          onDone={(title) => {
            renameBookChapter(book.id, c.id, title);
            useUIStore.getState().closeModal();
            showToast('已重命名', 'success');
          }}
        />
      ),
    });
  };

  /**
   * 从目录里移除章节。
   *
   * ⚠️ 刻意**不动正文**：划线锚点是块索引，删掉正文会让后面所有块索引位移、
   * 整本书的标注全部错位；而 Agent 也没有删除能力。目录条目随时可以重建。
   */
  const openRemoveChapter = async (c: BookChapter) => {
    if (!book) return;
    useUIStore.getState().closeModal();
    const ok = await useUIStore
      .getState()
      .confirmDialog(
        `把《${c.title}》从目录里移除？\n\n正文会原封不动保留在书里，划线也不受影响。` +
          `如果只是标题识别错了，可以重命名或回书架重建目录。`,
      );
    if (!ok) return;
    removeBookChapter(book.id, c.id);
    showToast('已从目录移除，正文保留', 'info');
  };

  if (!book || (book.agentBook && !agentEnabled)) {
    return (
      <div className="px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <EmptyState
            title={book ? 'Agent 已经关上了' : '这本书不在书架上了'}
            hint={
              book
                ? '《Agent》是专门给 Agent 写的书。设置里重新打开 Agent 开关，它就会回到书架。书里的内容一个字都没少。'
                : '可能已经被移出书架，回书架看看其它书'
            }
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
        {/* 本页工具行：书名 + 书签（右上角）；返回箭头统一走顶栏 */}
        <div
          className="sticky top-0 z-30 -mx-4 sm:-mx-6 px-4 sm:px-6 py-2 mb-2 flex items-center gap-2"
          style={{ background: 'var(--bar-bg)', backdropFilter: 'blur(16px) saturate(140%)' }}
        >
          <div className="flex-1 min-w-0">
            <p className="font-serif text-headline text-sm truncate">{book.title}</p>
            <p className="font-mono text-[9px] tracking-widest text-bronze-deep uppercase">
              {book.charCount} 字 · 读到 {Math.round(progress * 100)}%
            </p>
          </div>
          <button
            onClick={() => setTocOpen(true)}
            className={clsx(
              'relative flex items-center gap-1 px-2.5 py-1.5 rounded-pill text-[11px] font-mono tracking-wider transition-colors',
              chapters.length
                ? 'bg-wine/25 text-candle'
                : 'bg-bronze/10 text-bronze hover:text-candle',
            )}
            aria-label="目录"
            title={`目录 · ${chapters.length} 章`}
          >
            <ListTree size={12} strokeWidth={1.6} />
            目录
            {chapters.length > 0 && (
              <span className="font-mono text-[9px] text-amber">{chapters.length}</span>
            )}
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
          // 屏蔽原生上下文菜单/长按菜单（安卓的「复制 / 全选 / 网页搜索」浮层会挡住我们自己的
          // 工具条）；配合 globals.css 里 .vd-book 的 -webkit-touch-callout: none
          onContextMenu={(e) => e.preventDefault()}
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

      {/* 选中后的浮动工具条（划线 / 高亮 / 复制） */}
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
            <ToolBtn icon={Copy} label="复制" onClick={() => void copySelection()} />
          </div>
        </div>
      )}

      {/* 目录页（顶栏「目录」打开）：章节列表 + 跳转 + 增删改 */}
      {tocOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.42)' }}
            onClick={() => setTocOpen(false)}
          />
          <aside
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md overflow-y-auto border-l border-bronze/15"
            style={{ background: 'var(--card-bg-elevated)' }}
          >
            <div
              className="sticky top-0 z-10 flex items-center gap-2 px-4 py-3 border-b border-bronze/10"
              style={{ background: 'var(--card-bg-elevated)' }}
            >
              <ListTree size={15} strokeWidth={1.5} className="text-amber" />
              <div className="flex-1 min-w-0">
                <p className="font-serif text-title text-headline">目录</p>
                <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
                  {chapters.length} 章 · 《{book.title}》
                </p>
              </div>
              <button
                onClick={() => setTocOpen(false)}
                className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
                aria-label="关闭目录"
              >
                <X size={16} strokeWidth={1.6} />
              </button>
            </div>

            {chapters.length === 0 ? (
              <p className="px-4 py-6 text-bronze text-xs leading-relaxed">
                这本还没有目录。回到正文读一段，再用下面的
                <span className="text-candle">「在当前阅读位置新建章节」</span>
                就能把长文拆开。
              </p>
            ) : (
              <ul className="p-3 space-y-1.5">
                {chapters.map((c, i) => {
                  const on = i === curChapter;
                  return (
                    <li key={c.id}>
                      <div
                        className={clsx(
                          'group flex items-stretch rounded-card border transition-colors',
                          on
                            ? 'border-wine/45 bg-wine/12'
                            : 'border-bronze/12 hover:border-bronze/25',
                        )}
                        style={on ? undefined : { background: 'var(--card-bg)' }}
                      >
                        <button
                          onClick={() => gotoChapter(c)}
                          className="flex-1 min-w-0 text-left px-3 py-2.5 flex items-start gap-2.5"
                          title="跳到这一章"
                        >
                          <span
                            className={clsx(
                              'font-mono text-[10px] tabular-nums leading-5 flex-none w-5 text-right',
                              on ? 'text-amber' : 'text-bronze-deep',
                            )}
                          >
                            {String(i + 1).padStart(2, '0')}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span
                              className={clsx(
                                'block font-serif text-[14px] leading-snug',
                                on ? 'text-candle' : 'text-paper',
                              )}
                            >
                              {c.title}
                            </span>
                            <span className="mt-0.5 block font-mono text-[9px] tracking-wider text-bronze-deep">
                              {c.charCount} 字
                              {on && <span className="text-amber"> · 正在读</span>}
                            </span>
                          </span>
                        </button>
                        <div className="flex items-center flex-none pr-1.5 gap-0.5">
                          <button
                            onClick={() => openRenameChapter(c)}
                            className="w-7 h-7 flex items-center justify-center text-bronze-deep hover:text-candle"
                            aria-label={`重命名「${c.title}」`}
                          >
                            <Pencil size={12} strokeWidth={1.6} />
                          </button>
                          <button
                            onClick={() => void openRemoveChapter(c)}
                            className="w-7 h-7 flex items-center justify-center text-bronze-deep hover:text-wine-bright"
                            aria-label={`从目录移除「${c.title}」`}
                          >
                            <Trash2 size={12} strokeWidth={1.6} />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="px-3 pb-8 pt-1 space-y-3">
              <button onClick={openAddChapter} className="btn-ghost w-full justify-center">
                <Plus size={13} strokeWidth={1.6} />
                在当前阅读位置新建章节
              </button>
              <p className="px-1 font-mono text-[10px] tracking-wider text-bronze-deep leading-relaxed">
                导入时会按 md 标题或「第 X 章 / Chapter N」自动拆章，识别不准的地方可以在
                这里重命名或移除。目录只存位置，正文始终完整保留。
              </p>
            </div>
          </aside>
        </>
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

/** 章节标题输入框（新建 / 重命名共用）。放应用内 Modal —— 手机上 prompt() 不可用。 */
function ChapterTitleField({
  initial,
  hint,
  placeholder,
  onDone,
}: {
  initial: string;
  hint?: string;
  placeholder: string;
  onDone: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-3">
      {hint && <p className="font-mono text-[10px] tracking-wider text-bronze-deep">{hint}</p>}
      <input
        autoFocus
        value={value}
        placeholder={placeholder}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onDone(value.trim());
          if (e.key === 'Escape') useUIStore.getState().closeModal();
        }}
        className="w-full px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm focus:border-wine/60 focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button
          onClick={() => useUIStore.getState().closeModal()}
          className="btn-ghost"
        >
          取消
        </button>
        <button
          onClick={() => value.trim() && onDone(value.trim())}
          disabled={!value.trim()}
          className="btn-primary disabled:opacity-40"
        >
          <Check size={13} strokeWidth={2} /> 确定
        </button>
      </div>
    </div>
  );
}
