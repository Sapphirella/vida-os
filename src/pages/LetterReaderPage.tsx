import { useParams, useNavigate } from 'react-router-dom';
import { Edit2, Trash2, Star, Mail } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { MarkdownView } from '@/components/common/MarkdownView';
import { formatDate, chineseWeekday, clsx } from '@/lib/utils';

export function LetterReaderPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const letter = useAppStore((s) => s.letters.find((l) => l.id === id));
  const deleteLetter = useAppStore((s) => s.deleteLetter);
  const isFavorited = useAppStore((s) =>
    id ? s.isFavorited('letter', id) : false,
  );
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  if (!letter) {
    return (
      <div className="px-4 sm:px-6 view-enter">
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-bronze">信件不存在</p>
        </div>
      </div>
    );
  }

  return (
    <article className="px-4 sm:px-6 view-enter">
      <div className="max-w-3xl mx-auto pb-12">
        <header className="pt-2 pb-6">
          <div className="flex items-center gap-2 mb-2">
            <Mail size={14} strokeWidth={1.4} className="text-wine-light" />
            <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
              letter
            </p>
            {letter.unread && (
              <span className="font-mono text-[9px] text-wine-light tracking-widest">
                NEW
              </span>
            )}
          </div>
          <h1 className="font-serif text-moon text-huge leading-tight tracking-tight">
            {letter.title || '(无题)'}
          </h1>
          <p className="font-mono text-[11px] text-bronze mt-3">
            {formatDate(letter.createdAt, 'YYYY 年 M 月 D 日')} · 周{chineseWeekday(letter.createdAt)}
          </p>
        </header>

        {letter.imageIds.length > 0 && (
          <div
            className={`mb-8 grid gap-2 ${
              letter.imageIds.length === 1
                ? 'grid-cols-1'
                : letter.imageIds.length === 2
                  ? 'grid-cols-2'
                  : 'grid-cols-3'
            }`}
          >
            {letter.imageIds.map((id) => (
              <div
                key={id}
                className="rounded-card overflow-hidden border border-bronze/10"
              >
                <MediaImage fileId={id} className="w-full" />
              </div>
            ))}
          </div>
        )}

        <MarkdownView markdown={letter.content} />

        <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-bronze/10">
          <button
            onClick={() => toggleFavorite('letter', letter.id)}
            className={clsx('btn-ghost', isFavorited && 'tag-wine')}
          >
            <Star size={14} strokeWidth={1.5} fill={isFavorited ? 'currentColor' : 'none'} />
            {isFavorited ? '已收藏' : '收藏'}
          </button>
          <button
            onClick={() => {
              openEditor({
                mode: 'letter',
                editingId: letter.id,
                initialTitle: letter.title,
                initialContent: letter.content,
                imageIds: letter.imageIds,
                open: true,
              });
            }}
            className="btn-ghost"
          >
            <Edit2 size={14} strokeWidth={1.5} /> 编辑
          </button>
          <button
            onClick={() => {
              if (confirm('删除该信件？')) {
                deleteLetter(letter.id);
                navigate('/mailbox');
                showToast('已删除', 'success');
              }
            }}
            className="btn-ghost"
          >
            <Trash2 size={14} strokeWidth={1.5} /> 删除
          </button>
        </div>
      </div>
    </article>
  );
}
