import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { X } from 'lucide-react';

export function Modal() {
  const modal = useUIStore((s) => s.modal);
  const close = useUIStore((s) => s.closeModal);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // 打开/切换时初始化输入值；模态栏等待动画结束再聚焦，避免触屏键盘抖动
  useEffect(() => {
    if (modal.open && modal.inputMode) {
      setValue(modal.inputMode.initialValue ?? '');
    }
  }, [modal.open, modal.inputMode]);

  useEffect(() => {
    if (modal.open && modal.inputMode) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 120);
      return () => window.clearTimeout(id);
    }
  }, [modal.open, modal.inputMode]);

  if (!modal.open) return null;

  const handleConfirm = () => {
    if (modal.inputMode) {
      const v = value.trim();
      if (!v) return; // 空输入不允许确认
      modal.onInputConfirm?.(v);
    } else {
      modal.onConfirm?.();
    }
    close();
  };

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
          <h2 className="font-serif text-xl text-headline tracking-tight">
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
        {modal.inputMode && (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleConfirm();
              }
            }}
            placeholder={modal.inputMode.placeholder}
            maxLength={40}
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            enterKeyHint="done"
            className="w-full mt-4 px-3 py-2 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/20 focus:border-bronze/50 transition-colors"
            style={{ background: 'var(--card-bg)' }}
          />
        )}
        {(modal.onConfirm || modal.onInputConfirm) && (
          <div className="flex gap-2 justify-end mt-6">
            <button className="btn-ghost" onClick={close}>
              取消
            </button>
            <button className="btn-primary" onClick={handleConfirm}>
              确认
            </button>
          </div>
        )}
      </div>
    </div>
  );
}