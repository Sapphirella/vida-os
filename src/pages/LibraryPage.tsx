// 馆藏 · 书架
// v4.4：取代底栏原来的「碎片」生态位（底栏让给便签，主页宫格的便签位改成这里）
// 只做两件事：把本地 txt / md 文本导入成「书」，以及进入阅读器。
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  LibraryBig,
  MoreHorizontal,
  Plus,
  Trash2,
  Pencil,
  ArrowRight,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import {
  bookCharCount,
  formatFromFilename,
  progressOf,
  titleFromFilename,
  HARD_MAX_CHARS,
  RECOMMENDED_MAX_CHARS,
} from '@/lib/library';
import { formatDate, relativeTime } from '@/lib/utils';
import type { LibraryBook } from '@/types';

export function LibraryPage() {
  const books = useAppStore((s) => s.books);
  const addBook = useAppStore((s) => s.addBook);
  const updateBook = useAppStore((s) => s.updateBook);
  const deleteBook = useAppStore((s) => s.deleteBook);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

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
            !confirm(
              `「${title}」约 ${charCount} 字，超过建议的 1 万字，阅读与划线可能会卡。\n仍要导入吗？`,
            )
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
                openRename(book);
              }}
            >
              <Pencil size={13} strokeWidth={1.5} /> 重命名
            </button>
            <button
              className="btn-ghost text-wine-light"
              onClick={() => {
                useUIStore.getState().closeModal();
                if (confirm(`把《${book.title}》从书架移除？划线记录会一起删掉。`)) {
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

  return (
    <div className="px-4 sm:px-6">
      <div className="max-w-5xl mx-auto pb-6">
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
              {books.length} 本 · 可划线 · 可共读
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
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {books.map((book) => {
              const progress = progressOf(book, 1);
              return (
                <li key={book.id}>
                  <Card className="group p-0 overflow-hidden h-full flex flex-col">
                    {/* 封面：酒红渐层 + 书名（点它进阅读器） */}
                    <button
                      onClick={() => navigate(`/library/book/${book.id}`)}
                      className="relative flex-1 min-h-[132px] text-left p-4 flex flex-col justify-between"
                      style={{
                        background:
                          'linear-gradient(155deg, rgba(106,8,14,0.55), rgba(42,41,46,0.35))',
                      }}
                    >
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
                          onClick={() => openBookMenu(book)}
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
                      <button
                        onClick={() => navigate(`/library/book/${book.id}`)}
                        className="mt-2 flex items-center gap-1 font-mono text-[10px] tracking-wider text-bronze hover:text-candle transition-colors"
                      >
                        {book.lastBlockIndex ? '继续读' : '开始读'}
                        <ArrowRight size={11} strokeWidth={1.6} />
                        <span className="flex-1" />
                        <span className="text-bronze-deep">{relativeTime(book.updatedAt)}</span>
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
