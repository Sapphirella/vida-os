import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { formatDate, clsx, plainText, excerpt } from '@/lib/utils';

export function MailboxPage() {
  const navigate = useNavigate();
  const letters = useAppStore((s) => s.letters);
  const deleteLetter = useAppStore((s) => s.deleteLetter);
  const markRead = useAppStore((s) => s.markLetterRead);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-6">
        {letters.length === 0 ? (
          <EmptyState
            title="信箱在等一封信"
            hint="写一封给未来的自己，或留一张重要的照片"
            action={
              <button
                onClick={() => openEditor({ mode: 'letter', open: true })}
                className="btn-primary"
              >
                <Plus size={14} strokeWidth={1.6} /> 写一封
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {letters.map((l) => (
              <li key={l.id}>
                <Card
                  onClick={() => {
                    markRead(l.id);
                    navigate(`/mailbox/letter/${l.id}`);
                  }}
                  className="p-4 sm:p-5 group hover:scale-[1.005] transition-transform"
                >
                  <div className="flex items-start gap-3">
                    {/* 火漆标记 */}
                    <div className="flex-shrink-0 mt-1">
                      <div
                        className={clsx(
                          'w-3 h-3 rounded-full transition-all',
                          l.unread ? 'animate-pulse' : 'opacity-30',
                        )}
                        style={{
                          background: l.unread ? 'var(--wine-light)' : 'var(--bronze)',
                          boxShadow: l.unread ? '0 0 10px var(--wine-light)' : 'none',
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1">
                        <h3
                          className={clsx(
                            'font-serif text-lg leading-snug truncate-1',
                            l.unread ? 'text-headline' : 'text-paper-dim',
                          )}
                        >
                          {l.title || '(无题)'}
                        </h3>
                        {l.unread && (
                          <span className="font-mono text-[9px] text-wine-light tracking-widest">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="font-serif text-bronze text-sm line-clamp-2 leading-relaxed">
                        {excerpt(plainText(l.content), 100)}
                      </p>
                      {l.imageIds.length > 0 && (
                        <div className="flex gap-1.5 mt-2">
                          {l.imageIds.slice(0, 4).map((id) => (
                            <div
                              key={id}
                              className="w-12 h-12 rounded overflow-hidden border border-bronze/10"
                            >
                              <MediaImage fileId={id} className="w-full h-full object-cover" />
                            </div>
                          ))}
                          {l.imageIds.length > 4 && (
                            <div className="w-12 h-12 rounded bg-bronze/10 flex items-center justify-center text-bronze text-xs font-mono">
                              +{l.imageIds.length - 4}
                            </div>
                          )}
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="font-mono text-[10px] text-bronze-deep tracking-wider">
                          {formatDate(l.createdAt, 'YYYY.MM.DD')}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            if (confirm('删除该信件？')) {
                              deleteLetter(l.id);
                              showToast('已删除', 'success');
                            }
                          }}
                          className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-bronze hover:text-wine-light tracking-wider transition-opacity"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => openEditor({ mode: 'letter', open: true })}
          className="fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'var(--wine)',
            boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)',
          }}
          aria-label="写信"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      </div>
    </div>
  );
}
