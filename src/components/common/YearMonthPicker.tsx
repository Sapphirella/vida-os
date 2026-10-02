// 年月选择器（放在应用内 Modal 里，由 CalendarNav 打开）
//
// 为什么不用原生 `<select>`：v4.7.1 试过，用户反馈「手机端弹窗占满整个屏幕、又没有取消键」——
// iOS / 部分安卓浏览器会把原生 select 拉成全屏滚轮，那个界面我们既改不了样式也加不了取消按钮。
// 所以改成自绘：12 年一屏 + 月份两行，配 Modal 自带的「取消 / 确认」，三套主题都适配。
import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from '@/lib/utils';

/** 一屏显示多少年（4 列 × 3 行） */
const YEAR_COLS = 4;
const YEARS_PER_PAGE = 12;

export function YearMonthPicker({
  year,
  /** 0 起的月份 */
  month,
  onChange,
}: {
  year: number;
  month: number;
  /** 每次点选都把最新值抛给调用方（由 Modal 的「确认」决定是否采纳） */
  onChange: (year: number, month: number) => void;
}) {
  const [y, setY] = useState(year);
  const [m, setM] = useState(month);
  /** 最新草稿的 ref —— 理由同 TimePicker：同一帧内连点「年」「月」要能正确叠加 */
  const latest = useRef({ y: year, m: month });
  /** 年份窗口的起点（12 年一页） */
  const [start, setStart] = useState(() => year - Math.floor(YEARS_PER_PAGE / 2));

  const years = Array.from({ length: YEARS_PER_PAGE }, (_, i) => start + i);
  const pick = (ny: number, nm: number) => {
    latest.current = { y: ny, m: nm };
    setY(ny);
    setM(nm);
    onChange(ny, nm);
  };

  const chip = (on: boolean) =>
    clsx(
      'h-9 rounded-card font-mono text-[12px] tabular-nums transition-colors',
      on ? 'vd-selected' : 'text-paper hover:bg-bronze/10',
    );

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            year
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setStart((v) => v - YEARS_PER_PAGE)}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="往前 12 年"
            >
              <ChevronLeft size={14} strokeWidth={1.6} />
            </button>
            <span className="font-mono text-[10px] text-bronze-deep tabular-nums">
              {years[0]}–{years[years.length - 1]}
            </span>
            <button
              onClick={() => setStart((v) => v + YEARS_PER_PAGE)}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="往后 12 年"
            >
              <ChevronRight size={14} strokeWidth={1.6} />
            </button>
          </div>
        </div>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${YEAR_COLS}, 1fr)` }}>
          {years.map((v) => (
            <button
              key={v}
              onClick={() => pick(v, latest.current.m)}
              className={chip(v === y)}
              aria-label={`选择 ${v} 年`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="block font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-2">
          month
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 12 }, (_, i) => i).map((v) => (
            <button
              key={v}
              onClick={() => pick(latest.current.y, v)}
              className={chip(v === m)}
              aria-label={`选择 ${v + 1} 月`}
            >
              {v + 1}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
