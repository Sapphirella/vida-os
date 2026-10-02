// 日历的「年 / 月」标题栏（主页日历与便签·碎片日历共用）
//
// 为什么抽出来：两个日历的标题栏本来各写一份、只有 eyebrow 不同，
// 加了年份选择之后要是再各写一份，迟早会两边不一致。
//
// 年份与月份都用**原生 `<select>`**：
//   - 手机上点开会拉起系统滚轮，比自绘的下拉面板好用得多（年份列表本来就很长）；
//   - 桌面端就是普通下拉；
//   - 本项目的日程编辑器已经在用原生 `type="date"` / `type="time"`，这里沿用同一路线。
// 外观上把它压成「看起来像标题文字」：无边框、透明底、跟随主题色。
import { useMemo } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { clsx } from '@/lib/utils';

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
  /**
   * 年份候选：以「今天」为中心往前 80 年、往后 10 年。
   * 用今天的年份而不是当前视图年份，这样列表长度固定、不会随着翻月抖动
   * （往前 80 年是留给补记旧日子的：生活记录类应用经常会往回填）。
   */
  const years = useMemo(() => {
    const base = new Date().getFullYear();
    const out: number[] = [];
    for (let y = base - 80; y <= base + 10; y++) out.push(y);
    return out;
  }, []);

  // appearance-none 之后原生箭头会消失，必须自己给一个「这里可以点」的提示 ——
  // 否则用户根本不知道年份是能选的（这是本轮需求的目的）。
  const selectCls = clsx(
    'appearance-none bg-transparent border-0 outline-none cursor-pointer',
    'font-serif text-headline text-lg leading-tight',
    'pl-1 pr-5 rounded-card hover:bg-bronze/10 transition-colors',
  );
  const wrapCls = 'relative inline-flex items-center';

  return (
    <div className={clsx('flex items-center justify-between gap-2 mb-4', className)}>
      <div className="min-w-0">
        <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
          {eyebrow}
        </p>
        <div className="flex items-center mt-0.5 -ml-1">
          {/* 选项文案里带「年 / 月」：这样单位字符也在可点区域内
              （否则「年」是独立 span，点它没反应，用户会以为坏了） */}
          <span className={wrapCls}>
            <select
              value={year}
              onChange={(e) => onPick(Number(e.target.value), month)}
              className={selectCls}
              aria-label="选择年份"
              title="选择年份"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y} 年
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              strokeWidth={2}
              className="pointer-events-none absolute right-1 text-bronze-deep"
            />
          </span>
          <span className={clsx(wrapCls, 'ml-0.5')}>
            <select
              value={month + 1}
              onChange={(e) => onPick(year, Number(e.target.value) - 1)}
              className={clsx(selectCls, 'tabular-nums')}
              aria-label="选择月份"
              title="选择月份"
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {m} 月
                </option>
              ))}
            </select>
            <ChevronDown
              size={12}
              strokeWidth={2}
              className="pointer-events-none absolute right-1 text-bronze-deep"
            />
          </span>
        </div>
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
