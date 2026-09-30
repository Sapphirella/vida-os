// 馆藏 · 书架
// v4.4：取代底栏原来的「碎片」生态位（底栏让给便签，主页宫格的便签位改成这里）
// 只做两件事：把本地 txt / md 文本导入成「书」，以及进入阅读器。
import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LibraryBig,
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  ArrowRight,
  Pin,
  Tag as TagIcon,
  Check,
  X,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { CategoryChips } from '@/components/notes/CategoryChips';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  bookCharCount,
  formatFromFilename,
  parseBook,
  progressOf,
  titleFromFilename,
  HARD_MAX_CHARS,
  RECOMMENDED_MAX_CHARS,
} from '@/lib/library';
import { formatDate, relativeTime } from '@/lib/utils';
import { LibraryTabBar } from '@/pages/album/AlbumPage';
import type { LibraryBook } from '@/types';

export function LibraryPage() {
  const books = useAppStore((s) => s.books);
  const addBook = useAppStore((s) => s.addBook);
  const updateBook = useAppStore((s) => s.updateBook);
  const deleteBook = useAppStore((s) => s.deleteBook);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);

  // 书架排序：最近阅读优先（没读过的按上架时间兜底）；置顶的书进「置顶区」
  const sorted = useMemo(() => {
    const byRecent = (a: LibraryBook, b: LibraryBook) =>
      (b.lastReadAt ?? b.createdAt) - (a.lastReadAt ?? a.createdAt);
    return [...books].sort(byRecent);
  }, [books]);
  const visible = useMemo(
    () =>
      selectedTag
        ? sorted.filter((b) => b.tags?.includes(selectedTag))
        : sorted,
    [sorted, selectedTag],
  );
  const pinnedBooks = visible.filter((b) => b.pinned);
  const restBooks = visible.filter((b) => !b.pinned);

  /** 导入：逐个文件读成文本；超长按「建议 / 硬上限」两级处理，避免把浏览器拖死 */
  const handlePick = async (files: FileList | null) => {
    if (!files?.length) return;
    setImporting(true);
    try {
      for (const file of Array.from(files)) {
        const title = titleFromFilename(file.name);
        try {
          const text = await file.text();
          const charCount = bookCharCount(text);
          if (charCount === 0) {
            showToast(`「${title}」里没有可读的文字`, 'error');
            continue;
          }
          if (charCount > HARD_MAX_CHARS) {
            showToast(
              `「${title}」约 ${charCount} 字，超出上限 ${HARD_MAX_CHARS} 字，未导入`,
              'error',
            );
            continue;
          }
          if (
            charCount > RECOMMENDED_MAX_CHARS &&
            !(await useUIStore.getState().confirmDialog(
              `「${title}」约 ${charCount} 字，超过建议的 1 万字，阅读与划线可能会卡。\n仍要导入吗？`,
            ))
          ) {
            continue;
          }
          addBook({
            title,
            format: formatFromFilename(file.name),
            content: text,
            charCount,
          });
          showToast(`已上架「${title}」`, 'success');
        } catch {
          showToast(`「${title}」读取失败`, 'error');
        }
      }
    } finally {
      setImporting(false);
    }
  };

  const openBookMenu = (book: LibraryBook) => {
    showModal({
      title: book.title,
      content: (
        <div className="space-y-3">
          <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
            {book.format} · {book.charCount} 字 · {book.marks.length} 处标注 · 上架于{' '}
            {formatDate(book.createdAt, 'YYYY-MM-DD')}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-ghost"
              onClick={() => {
                useUIStore.getState().closeModal();
                updateBook(book.id, { pinned: !book.pinned });
                showToast(book.pinned ? '已取消置顶' : '已置顶', 'success');
              }}
            >
              <Pin size={13} strokeWidth={1.5} /> {book.pinned ? '取消置顶' : '置顶'}
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                useUIStore.getState().closeModal();
                openBookTags(book);
              }}
            >
              <TagIcon size={13} strokeWidth={1.5} /> 标签
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                useUIStore.getState().closeModal();
                openRename(book);
              }}
            >
              <Pencil size={13} strokeWidth={1.5} /> 重命名
            </button>
            <button
              className="btn-ghost text-wine-light"
              onClick={async () => {
                useUIStore.getState().closeModal();
                if (await useUIStore.getState().confirmDialog(`把《${book.title}》从书架移除？划线记录会一起删掉。`)) {
                  deleteBook(book.id);
                  showToast('已移出书架', 'info');
                }
              }}
            >
              <Trash2 size={13} strokeWidth={1.5} /> 移出书架
            </button>
          </div>
        </div>
      ),
    });
  };

  const openRename = (book: LibraryBook) => {
    showModal({
      title: '重命名',
      content: (
        <RenameField
          initial={book.title}
          onDone={(next) => {
            updateBook(book.id, { title: next });
            useUIStore.getState().closeModal();
            showToast('已重命名', 'success');
          }}
        />
      ),
    });
  };

  /** 标签面板：列出全部标签，点一下切换本书的标签（多选）；新建的标签直接赋给本书 */
  const openBookTags = (book: LibraryBook) => {
    showModal({
      title: `《${book.title}》的标签`,
      content: <BookTagsPanel bookId={book.id} />,
    });
  };

  return (
    <div className="px-4 sm:px-6">
      <div className="max-w-5xl mx-auto pb-6">
        <LibraryTabBar active="library" />
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.md,.markdown,text/plain,text/markdown"
          multiple
          hidden
          onChange={(e) => {
            void handlePick(e.target.files);
            e.target.value = '';
          }}
        />
        {/* 头部：说明 + 导入 */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border border-bronze/20 flex-none"
            style={{ background: 'rgba(106, 8, 14, 0.15)' }}
          >
            <LibraryBig size={20} strokeWidth={1.4} className="text-wine-light" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-headline text-lg leading-tight">书架</h2>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
              {books.length} 本 · 按最近阅读排序 · 可划线
            </p>
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
            style={{ padding: '9px 16px' }}
          >
            <Plus size={15} strokeWidth={1.8} />
            {importing ? '导入中…' : '导入'}
          </button>
        </div>

        <p className="text-bronze text-xs leading-relaxed mb-5">
          从本地导入 <span className="text-candle">txt / md</span> 文本，就能像读书一样读它：
          长按选中一段可以<span className="text-candle">划线 / 高亮</span>，也可以
          <span className="text-candle">引用这段去问 AI</span>。标注都收在书里右上角的「书签」。
          <br />
          <span className="text-bronze-deep">
            单本建议 1 万字以内（上限 {HARD_MAX_CHARS} 字），太长会卡。
          </span>
        </p>

        {/* 标签栏：创建 / 删除 / 点击筛选（与灵感页一致） */}
        {books.length > 0 && (
          <div className="mb-4">
            <CategoryChips which="book" selected={selectedTag} onSelect={setSelectedTag} />
          </div>
        )}

        {books.length === 0 ? (
          <EmptyState
            title="书架还空着"
            hint="导入一本 txt 或 md 文本，开始你的第一本书"
            action={
              <button onClick={() => fileRef.current?.click()} className="btn-primary">
                <BookOpen size={14} strokeWidth={1.6} /> 导入第一本书
              </button>
            }
          />
        ) : visible.length === 0 ? (
          <EmptyState
            title="这个标签下还没有书"
            hint={`「${selectedTag}」里暂时没有书，换个标签看看，或给书加上这个标签`}
          />
        ) : (
          <>
            {/* 置顶区：置顶的书按最近阅读排序 */}
            {pinnedBooks.length > 0 && (
              <div className="mb-6">
                <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-3">
                  <Pin size={11} strokeWidth={1.6} /> 置顶 · {pinnedBooks.length}
                </p>
                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {pinnedBooks.map((book) => (
                    <BookCard key={book.id} book={book} onMenu={openBookMenu} />
                  ))}
                </ul>
              </div>
            )}
            {/* 最近阅读区 */}
            <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {restBooks.map((book) => (
                <BookCard key={book.id} book={book} onMenu={openBookMenu} />
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

/** 书架单本书卡片（置顶区与最近阅读区共用） */
function BookCard({ book, onMenu }: { book: LibraryBook; onMenu: (book: LibraryBook) => void }) {
  const navigate = useNavigate();
  // 进度按本书真实段落数算（之前写死传 1，导致进度条要么短条要么满格、读一半和读完一个样）
  const blocks = useMemo(() => parseBook(book.content, book.format), [book.content, book.format]);
  const progress = progressOf(book, blocks.length);
  return (
    <li>
      <Card className="group p-0 overflow-hidden h-full flex flex-col">
        {/* 封面：酒红渐层 + 书名（点它进阅读器）；置顶的书右上角有图钉 */}
        <button
          onClick={() => navigate(`/library/book/${book.id}`)}
          className="relative flex-1 min-h-[132px] text-left p-4 flex flex-col justify-between"
          style={{
            background:
              'linear-gradient(155deg, rgba(106,8,14,0.55), rgba(42,41,46,0.35))',
          }}
        >
          {book.pinned && (
            <span className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(233,196,106,0.18)' }}>
              <Pin size={11} strokeWidth={1.6} className="text-amber" />
            </span>
          )}
          <BookOpen size={18} strokeWidth={1.3} className="text-moon/70" />
          <span className="font-serif text-title text-moon leading-snug line-clamp-3">
            {book.title}
          </span>
        </button>
        <div className="px-3 pt-2.5 pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] tracking-wider text-bronze-deep">
              {book.charCount} 字
            </span>
            {book.marks.length > 0 && (
              <span className="font-mono text-[10px] tracking-wider text-amber">
                标注 {book.marks.length}
              </span>
            )}
            <span className="flex-1" />
            <button
              onClick={() => onMenu(book)}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="更多操作"
            >
              <MoreHorizontal size={14} strokeWidth={1.6} />
            </button>
          </div>
          <div className="mt-2 h-[3px] rounded-full bg-bronze/15 overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{ width: `${Math.max(2, progress * 100)}%`, background: 'var(--wine)' }}
            />
          </div>
          {book.tags && book.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {book.tags.map((t) => (
                <span key={t} className="tag" style={{ fontSize: 9 }}>
                  #{t}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={() => navigate(`/library/book/${book.id}`)}
            className="mt-2 flex items-center gap-1 font-mono text-[10px] tracking-wider text-bronze hover:text-candle transition-colors"
          >
            {book.lastBlockIndex ? '继续读' : '开始读'}
            <ArrowRight size={11} strokeWidth={1.6} />
            <span className="flex-1" />
            <span className="text-bronze-deep">
              {book.lastReadAt ? `最近阅读 ${relativeTime(book.lastReadAt)}` : `上架 ${relativeTime(book.createdAt)}`}
            </span>
          </button>
        </div>
      </Card>
    </li>
  );
}

/** 标签面板：全部标签多选（点一下切换）；「+」新建的标签直接赋给本书。
 * 数据实时订阅 store（不传快照）——新建的标签立刻出现在列表里，避免误以为没建上而重复创建。 */
function BookTagsPanel({ bookId }: { bookId: string }) {
  const book = useAppStore((s) => s.books.find((b) => b.id === bookId));
  const allTags = useAppStore((s) => s.categories.book);
  const updateBook = useAppStore((s) => s.updateBook);
  const addCategory = useAppStore((s) => s.addCategory);
  const renameCategory = useAppStore((s) => s.renameCategory);
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');
  const [editingTag, setEditingTag] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  if (!book) return null;
  const tags = book.tags ?? [];

  const toggle = (tag: string) => {
    const has = tags.includes(tag);
    updateBook(book.id, { tags: has ? tags.filter((t) => t !== tag) : [...tags, tag] });
  };
  const create = (name: string) => {
    addCategory('book', name);
    updateBook(book.id, { tags: [...tags, name] });
  };
  return (
    <div className="space-y-3">
      <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
        一本书可以有多个标签 · 点一下选中 / 取消
      </p>
      <div className="flex flex-wrap gap-2">
        {allTags.length === 0 && (
          <p className="text-bronze text-xs">还没有标签，点右下角的 + 建一个。</p>
        )}
        {allTags.map((t) => {
          const on = tags.includes(t);
          if (editingTag === t) {
            return (
              <div key={t} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editValue.trim()) {
                      renameCategory('book', t, editValue.trim());
                      setEditingTag(null);
                    } else if (e.key === 'Escape') {
                      setEditingTag(null);
                    }
                  }}
                  className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper outline-none w-24"
                />
                <button
                  onClick={() => {
                    if (editValue.trim()) {
                      renameCategory('book', t, editValue.trim());
                      setEditingTag(null);
                    }
                  }}
                  className="w-5 h-5 flex items-center justify-center text-candle"
                  aria-label="确认重命名"
                >
                  <Check size={11} strokeWidth={2} />
                </button>
              </div>
            );
          }
          return (
            <button
              key={t}
              onClick={() => toggle(t)}
              onDoubleClick={() => {
                setEditingTag(t);
                setEditValue(t);
              }}
              className={on ? 'tag tag-wine' : 'tag hover:brightness-110'}
              title="双击重命名"
            >
              <TagIcon size={10} strokeWidth={1.6} />
              {t}
            </button>
          );
        })}
      </div>
      {adding ? (
        <div className="flex items-center gap-2">
          <input
            autoFocus
            value={newValue}
            placeholder="新标签"
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newValue.trim()) {
                create(newValue.trim());
                setNewValue('');
                setAdding(false);
              } else if (e.key === 'Escape') {
                setAdding(false);
                setNewValue('');
              }
            }}
            className="flex-1 px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm focus:border-wine/60 focus:outline-none"
          />
          <button
            onClick={() => {
              if (newValue.trim()) {
                create(newValue.trim());
                setNewValue('');
                setAdding(false);
              }
            }}
            className="w-8 h-8 flex items-center justify-center text-candle"
            aria-label="确认新建"
          >
            <Check size={15} strokeWidth={2} />
          </button>
          <button
            onClick={() => {
              setAdding(false);
              setNewValue('');
            }}
            className="w-8 h-8 flex items-center justify-center text-bronze"
            aria-label="取消"
          >
            <X size={15} strokeWidth={1.6} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="tag opacity-50 hover:opacity-100 transition-opacity"
        >
          <Plus size={10} strokeWidth={1.6} />
        </button>
      )}
      <p className="font-mono text-[10px] text-bronze-deep tracking-wider">
        删除标签请回书架顶部的标签栏（点标签右侧的 ×）
      </p>
    </div>
  );
}

/** 重命名输入框：放在应用内 Modal 里（手机上是 prompt() 不可用，v3.10 的结论） */
function RenameField({
  initial,
  onDone,
}: {
  initial: string;
  onDone: (value: string) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div className="space-y-3">
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim()) onDone(value.trim());
        }}
        className="w-full px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm focus:border-wine/60 focus:outline-none"
      />
      <div className="flex justify-end gap-2">
        <button className="btn-text" onClick={() => useUIStore.getState().closeModal()}>
          取消
        </button>
        <button
          className="btn-primary"
          disabled={!value.trim()}
          onClick={() => value.trim() && onDone(value.trim())}
        >
          保存
        </button>
      </div>
    </div>
  );
}
