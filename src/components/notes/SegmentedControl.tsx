import { useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useAppStore } from '@/stores/useAppStore';
import { clsx } from '@/lib/utils';
import type { NoteTabKey } from '@/types';

const TABS: { key: NoteTabKey; label: string; en: string }[] = [
  { key: 'inspiration', label: '灵感', en: 'Inspiration' },
  { key: 'schedule', label: '日程', en: 'Schedule' },
  { key: 'todo', label: '待办', en: 'To-do' },
];

// 顶部分区滑块
export function SegmentedControl() {
  const current = useUIStore((s) => s.notesTab);
  const setTab = useUIStore((s) => s.setNotesTab);
  const inspiration = useAppStore((s) => s.notes.inspiration);
  const schedule = useAppStore((s) => s.notes.schedule);
  const todo = useAppStore((s) => s.notes.todo);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const counts = {
    inspiration: inspiration.length,
    schedule: schedule.length,
    todo: todo.filter((t) => !t.done).length,
  };

  useEffect(() => {
    const el = containerRef.current?.querySelector<HTMLButtonElement>(
      `[data-tab="${current}"]`,
    );
    if (el && containerRef.current) {
      const cRect = containerRef.current.getBoundingClientRect();
      const eRect = el.getBoundingClientRect();
      setIndicator({
        left: eRect.left - cRect.left,
        width: eRect.width,
      });
    }
  }, [current]);

  return (
    <div className="px-4 sm:px-6 pt-2 pb-4">
      <div className="max-w-5xl mx-auto">
        <div
          ref={containerRef}
          className="relative flex items-center gap-0 p-1 rounded-pill glass-card"
          style={{ background: 'rgba(20, 18, 22, 0.5)' }}
        >
          {/* 滑块指示器 */}
          <div
            className="absolute top-1 bottom-1 rounded-pill transition-all duration-300 ease-out"
            style={{
              left: indicator.left,
              width: indicator.width,
              background:
                'linear-gradient(135deg, rgba(106, 8, 14, 0.7), rgba(106, 8, 14, 0.5))',
              boxShadow: '0 0 16px rgba(106, 8, 14, 0.3)',
            }}
          />
          {TABS.map((t) => {
            const active = current === t.key;
            return (
              <button
                key={t.key}
                data-tab={t.key}
                onClick={() => setTab(t.key)}
                className={clsx(
                  'relative z-10 flex-1 px-4 py-2.5 rounded-pill font-serif text-sm transition-colors flex items-center justify-center gap-2',
                  active ? 'text-moon' : 'text-bronze hover:text-paper',
                )}
              >
                <span>{t.label}</span>
                <span
                  className={clsx(
                    'font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-full',
                    active
                      ? 'bg-moon/20 text-moon'
                      : 'bg-bronze/10 text-bronze-deep',
                  )}
                >
                  {counts[t.key]}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
