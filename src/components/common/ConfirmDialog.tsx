// 全局确认对话框：替代 window.confirm
// 微信内置浏览器等环境里原生 confirm 没有「取消」按钮，这里提供取消/确认双按钮
import { useUIStore } from '@/stores/useUIStore';

export function ConfirmDialog() {
  const req = useUIStore((s) => s.confirmRequest);
  const respond = useUIStore((s) => s.confirmRespond);

  if (!req) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(15, 12, 14, 0.7)', backdropFilter: 'blur(8px)' }}
      onClick={() => respond(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="glass-card glass-card-elevated w-full max-w-md p-6 animate-slide-up"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-serif text-xl text-headline tracking-tight">确认</h2>
          <button
            onClick={() => respond(false)}
            className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle"
            aria-label="关闭"
          >
            ×
          </button>
        </div>
        <div className="text-paper text-reading font-serif whitespace-pre-wrap leading-relaxed">
          {req.message}
        </div>
        <div className="flex gap-2 justify-end mt-6">
          <button className="btn-ghost" onClick={() => respond(false)}>
            取消
          </button>
          <button className="btn-primary" onClick={() => respond(true)}>
            确认
          </button>
        </div>
      </div>
    </div>
  );
}
