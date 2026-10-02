import { useCallback, useEffect, useRef, useState } from 'react';
import { useUIStore } from '@/stores/useUIStore';
import { useAppStore } from '@/stores/useAppStore';
import { clsx, todayKey } from '@/lib/utils';
import type { NoteTabKey } from '@/types';

const TABS: { key: NoteTabKey; label: string; en: string }[] = [
  // v4.7：碎片重新启用，放最左 —— 它是「当下此刻记一句」的最快入口。
  // 用户原话「碎片 灵感 日程 待办」就是这个顺序。
  { key: 'fragment', label: '碎片', en: 'Fragments' },
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
  const fragments = useAppStore((s) => s.notes.fragments);
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const counts = {
    // 碎片的计数用「今日条数」而非总数：导航栏挂在所有日期的累加值上没意义，
    // 用户每天看自己的当下；今天写了 0 条 = 一个温和的提醒「今天还没记一笔」。
    fragment: fragments.filter((f) => f.date === todayKey()).length,
    inspiration: inspiration.length,
    schedule: schedule.length,
    todo: todo.filter((t) => !t.done).length,
  };

  // 量出当前分区的位置/宽度，用来摆放滑块。
  // setState 前做值比较：ResizeObserver 的首次回调也会触发一次测量，
  // 若无条件写入新对象会让 React 每次都重渲染，容易自激。
  const measure = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const el = container.querySelector<HTMLButtonElement>(`[data-tab="${current}"]`);
    if (!el) return;
    const cRect = container.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    const left = eRect.left - cRect.left;
    const width = eRect.width;
    setIndicator((prev) =>
      prev.left === left && prev.width === width ? prev : { left, width },
    );
  }, [current]);

  useEffect(() => {
    measure();
  }, [measure]);

  // 只在 current 变化时测量是不够的：窗口 resize / 手机转屏 / 字体加载完成
  // 都会改变按钮宽度，滑块会停在旧位置（曾实测移动端偏差达 218px）。
  // 这里同时观察容器与三个按钮，任何尺寸变化都重新测量。
  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(container);
    container
      .querySelectorAll('button[data-tab]')
      .forEach((btn) => ro.observe(btn));
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div className="px-4 sm:px-6 pt-2 pb-4">
      <div className="max-w-5xl mx-auto">
        <div
          ref={containerRef}
          className="relative flex items-center gap-0 p-1 rounded-pill glass-card"
          style={{ background: 'var(--seg-track, rgba(20, 18, 22, 0.5))' }}
        >
          {/* 滑块指示器：去渐变，用主题强调色实色（跟随 --wine 主题变量） */}
          <div
            className="absolute top-1 bottom-1 rounded-pill transition-all duration-300 ease-out seg-indicator"
            style={{
              left: indicator.left,
              width: indicator.width,
              background: 'var(--wine)',
              boxShadow: '0 0 16px rgb(var(--wine-rgb) / 0.3)',
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
                  // v4.7.1：四个分页在 390px 上原来会挤到换行 ——
                  // 每个按钮 px-4(32) + 两个汉字(28) + gap-2(8) + 计数(20) = 88px，
                  // 而 4 等分只有 87.5px，于是「碎片」被压成一列一个字竖着排。
                  // 现在：窄屏收紧内边距与间距，并给文字加 whitespace-nowrap
                  // 兜底（宁可略挤也不许断成竖排）。
                  'relative z-10 flex-1 min-w-0 px-1.5 sm:px-4 py-2.5 rounded-pill font-serif text-sm transition-colors flex items-center justify-center gap-1 sm:gap-2',
                  active ? 'text-moon' : 'seg-tab text-bronze hover:text-paper',
                )}
              >
                <span className="whitespace-nowrap leading-none">{t.label}</span>
                <span
                  className={clsx(
                    'flex-none font-mono text-[10px] tracking-wider px-1.5 py-0.5 rounded-full tabular-nums',
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
