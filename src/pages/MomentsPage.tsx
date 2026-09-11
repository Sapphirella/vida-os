import { Plus } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { renderMarkdown } from '@/lib/markdown';
import { formatDate } from '@/lib/utils';

export function MomentsPage() {
  const moments = useAppStore((s) => s.moments);
  const deleteMoment = useAppStore((s) => s.deleteMoment);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-6">
        {moments.length === 0 ? (
          <EmptyState
            title="动态是生活的切片"
            hint="发一条此刻的心情"
            action={
              <button
                onClick={() => openEditor({ mode: 'moment', open: true })}
                className="btn-primary"
              >
                <Plus size={14} strokeWidth={1.6} /> 写一条
              </button>
            }
          />
        ) : (
          <ul className="space-y-3">
            {moments.map((m) => (
              <li key={m.id}>
                <Card className="p-4 sm:p-5 group">
                  {/* 动态正文支持 Markdown（与文章/信件一致） */}
                  <div
                    className="prose-vidaos prose-moment"
                    dangerouslySetInnerHTML={{ __html: renderMarkdown(m.content) }}
                  />
                  {m.imageIds.length > 0 && (
                    <div
                      className={`mt-3 grid gap-1.5 ${
                        m.imageIds.length === 1
                          ? 'grid-cols-1'
                          : m.imageIds.length === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-3'
                      }`}
                    >
                      {m.imageIds.map((id) => (
                        <div
                          key={id}
                          className="rounded-card overflow-hidden border border-bronze/10"
                          style={{ aspectRatio: m.imageIds.length === 1 ? '16/10' : '1/1' }}
                        >
                          <MediaImage fileId={id} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-bronze/10">
                    <span className="font-mono text-[10px] text-bronze-deep tracking-wider">
                      {formatDate(m.createdAt, 'YYYY.MM.DD HH:mm')}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm('删除该动态？')) {
                          deleteMoment(m.id);
                          showToast('已删除', 'success');
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 font-mono text-[10px] text-bronze hover:text-wine-light tracking-wider transition-opacity"
                    >
                      删除
                    </button>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}

        <button
          onClick={() => openEditor({ mode: 'moment', open: true })}
          className="fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'var(--wine)',
            boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)',
          }}
          aria-label="写动态"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      </div>
    </div>
  );
}
