import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/common/Card';
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

  const monthLabel = `${view.year} 年 ${view.month + 1} 月`;

  return (
    <Card className="p-4 sm:p-5 h-full flex flex-col">
      {/* 头部 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            calendar
          </p>
          <h3 className="font-serif text-headline text-lg mt-0.5">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const d = new Date();
              setView({ year: d.getFullYear(), month: d.getMonth() });
              setSelected(todayKey());
            }}
            className="h-7 px-2.5 rounded-full font-mono text-[11px] tracking-widest text-bronze hover:text-candle hover:bg-bronze/10 transition-colors"
            aria-label="回到今天"
          >
            今
          </button>
          <button
            onClick={() => {
              const d = new Date(view.year, view.month - 1, 1);
              setView({ year: d.getFullYear(), month: d.getMonth() });
            }}
            className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="上个月"
          >
            <ChevronLeft size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={() => {
              const d = new Date(view.year, view.month + 1, 1);
              setView({ year: d.getFullYear(), month: d.getMonth() });
            }}
            className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="下个月"
          >
            <ChevronRight size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

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
                  ? 'bg-wine/30 text-moon'
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
