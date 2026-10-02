// 日历的「年 / 月」标题栏（主页日历与便签·碎片日历共用）
//
// 为什么抽出来：两个日历的标题栏本来各写一份、只有 eyebrow 不同，
// 加了年份选择之后要是再各写一份，迟早会两边不一致
// （v4.7.1 已经因为「同一块 UI 写两份」踩过一次，见 PROJECT_MEMORY 教训 30）。
//
// 年月怎么选（v4.7.2 改）：标题本身是个按钮，点开**应用内弹窗**（YearMonthPicker）。
// 不再用原生 `<select>` —— 用户反馈「手机端弹窗占满整个屏幕、又没有取消键」：
// 那是系统给原生 select 的界面，样式改不了、取消键也加不上。
// 自绘之后三套主题一致、永远有「取消 / 确认」、也不会盖满屏。
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { YearMonthPicker } from './YearMonthPicker';

export function CalendarNav({
  eyebrow,
  year,
  /** 0 起的月份（与 Date.getMonth() 一致） */
  month,
  onPick,
  onToday,
  onStepMonth,
  className,
}: {
  eyebrow: string;
  year: number;
  month: number;
  /** 选了年份或月份（只改「正在看哪个月」，不动选中日期） */
  onPick: (year: number, month: number) => void;
  onToday: () => void;
  onStepMonth: (delta: number) => void;
  className?: string;
}) {
  const showModal = useUIStore((s) => s.showModal);

  const openPicker = () => {
    // 草稿态：点选只改 draft，「确认」才真的跳过去（「取消」= 什么都不做）
    let draft = { year, month };
    showModal({
      title: '选择年月',
      content: (
        <YearMonthPicker
          year={year}
          month={month}
          onChange={(y, m) => {
            draft = { year: y, month: m };
          }}
        />
      ),
      onConfirm: () => onPick(draft.year, draft.month),
    });
  };

  return (
    <div className={clsx('flex items-center justify-between gap-2 mb-4', className)}>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
          {eyebrow}
        </p>
        {/* 标题即入口：点它选年月 */}
        <button
          onClick={openPicker}
          className="flex items-center gap-1 mt-0.5 pl-1 pr-1.5 rounded-card hover:bg-bronze/10 transition-colors"
          aria-label="选择年份和月份"
          title="选择年份和月份"
        >
          <span className="font-serif text-headline text-lg tabular-nums">
            {year} 年 {month + 1} 月
          </span>
          <ChevronDown size={13} strokeWidth={2} className="text-bronze-deep" />
        </button>
      </div>

      <div className="flex items-center gap-1 flex-none">
        <button
          onClick={onToday}
          className="h-7 px-2.5 rounded-full font-mono text-[11px] tracking-widest text-bronze hover:text-candle hover:bg-bronze/10 transition-colors"
          aria-label="回到今天"
        >
          今
        </button>
        <button
          onClick={() => onStepMonth(-1)}
          className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="上个月"
        >
          <ChevronLeft size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => onStepMonth(1)}
          className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="下个月"
        >
          <ChevronRight size={16} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
