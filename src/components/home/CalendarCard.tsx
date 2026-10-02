import { useMemo, useState } from 'react';
import { Card } from '@/components/common/Card';
import { CalendarNav } from '@/components/common/CalendarNav';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { todayKey, chineseDate, chineseWeekday } from '@/lib/utils';
import { clsx } from '@/lib/utils';

// 月历卡片
export function CalendarCard() {
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  // 选中日期与「当日日程」卡共用（useUIStore），因此点日期会真正联动右侧
  const selected = useUIStore((s) => s.selectedDate);
  const setSelected = useUIStore((s) => s.setSelectedDate);
  const schedule = useAppStore((s) => s.notes.schedule);


  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const last = new Date(view.year, view.month + 1, 0);
    const startDay = first.getDay();
    const total = last.getDate();
    const arr: Array<{ date?: string; day?: number; isToday?: boolean; hasEvent?: boolean }> = [];

    // 前面补位
    for (let i = 0; i < startDay; i++) {
      arr.push({});
    }
    for (let d = 1; d <= total; d++) {
      const date = new Date(view.year, view.month, d);
      const k = todayKey(date);
      const isToday = k === todayKey();
      const hasEvent = schedule.some(
        (s) => s.date === k && !s.done,
      );
      arr.push({ day: d, date: k, isToday, hasEvent });
    }
    return arr;
  }, [view, schedule]);

  return (
    <Card className="p-4 sm:p-5 h-full flex flex-col">
      {/* 头部：年 / 月可直接选（v4.7.1），只改「看哪个月」，不动选中日期 */}
      <CalendarNav
        eyebrow="calendar"
        year={view.year}
        month={view.month}
        onPick={(y, m) => setView({ year: y, month: m })}
        onToday={() => {
          const d = new Date();
          setView({ year: d.getFullYear(), month: d.getMonth() });
          setSelected(todayKey());
        }}
        onStepMonth={(delta) => {
          const d = new Date(view.year, view.month + delta, 1);
          setView({ year: d.getFullYear(), month: d.getMonth() });
        }}
      />

      {/* 星期行 */}
      <div className="grid grid-cols-7 mb-1.5">
        {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => (
          <div
            key={w}
            className={clsx(
              'text-center font-mono text-[10px] tracking-widest',
              i === 0 || i === 6 ? 'text-wine-light' : 'text-bronze-deep',
            )}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 日期格子 */}
      <div className="grid grid-cols-7 gap-y-1 flex-1">
        {days.map((d, idx) => {
          if (!d.day) return <div key={idx} />;
          const isSelected = d.date === selected;
          return (
            <button
              key={idx}
              onClick={() => d.date && setSelected(d.date)}
              className={clsx(
                'aspect-square flex flex-col items-center justify-center relative rounded-full transition-all',
                isSelected
                  ? 'vd-selected'
                  : d.isToday
                    ? 'text-candle'
                    : 'text-paper hover:bg-bronze/10',
              )}
            >
              <span
                className={clsx(
                  'font-mono text-[13px] leading-none',
                  d.isToday && !isSelected && 'font-semibold',
                )}
              >
                {d.day}
              </span>
              {d.hasEvent && (
                <span
                  className="absolute bottom-1 w-1 h-1 rounded-full"
                  style={{
                    background: isSelected ? 'var(--moon)' : 'var(--wine-light)',
                    boxShadow: isSelected ? '0 0 4px var(--moon)' : '0 0 4px var(--wine-light)',
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-3 pt-3 border-t border-bronze/10">
        <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
          selected
        </p>
        <p className="font-serif text-paper text-sm mt-1">
          {chineseDate(new Date(selected))} · 周{chineseWeekday(new Date(selected))}
        </p>
      </div>
    </Card>
  );
}
