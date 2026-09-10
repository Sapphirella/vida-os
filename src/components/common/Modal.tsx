import { useUIStore } from '@/stores/useUIStore';
import { X } from 'lucide-react';

export function Modal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);

  if (!modal.open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 12, 14, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={close}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card glass-card-elevated w-full max-w-md p-6 animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-moon tracking-tight">
            {modal.title || '提示'}
          </h2>
          <button
            onClick={close}
            className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle"
            aria-label="关闭"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>
        <div className="text-paper text-reading font-serif">{modal.content}</div>
        {modal.onConfirm && (
          <div className="flex gap-2 justify-end mt-6">
            <button className="btn-ghost" onClick={close}>
              取消
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                modal.onConfirm?.();
                close();
              }}
            >
              确认
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
