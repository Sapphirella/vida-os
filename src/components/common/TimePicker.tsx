// 时间选择器（放在应用内 Modal 里，碎片补记用）
//
// 为什么不用原生 `<input type="time">`：v4.7.1 试过，用户反馈那个弹窗「做得很差」——
// 安卓拉起的是时钟表盘、iOS 是滚轮，我们改不了样式、也没法跟应用主题一致。
// 自绘以后：小时 / 分钟一次点选，配 Modal 的「取消 / 确认」，还有「此刻」一键回到现在。
//
// 分钟格是 5 分钟一档（12 个），另配 −1 / +1 分钟微调 ——
// 既好点（不会挤 60 个格子），又能精确到分。
import { useRef, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { clsx } from '@/lib/utils';

/** 分钟快捷档位（每 5 分钟一个） */
const MINUTE_STEPS = Array.from({ length: 12 }, (_, i) => i * 5);

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function TimePicker({
  /** "HH:MM" */
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [hh, mm] = (() => {
    const m = /^(\d{1,2}):(\d{2})$/.exec(value);
    if (!m) {
      const d = new Date();
      return [d.getHours(), d.getMinutes()];
    }
    return [Number(m[1]), Number(m[2])];
  })();
  const [h, setH] = useState(hh);
  const [mi, setMi] = useState(mm);
  /**
   * 最新值的 ref。
   *
   * 为什么需要：点「7 点」和点「5 分」是两个独立事件，但如果它们落在同一次渲染里
   * （手速快、或程序化连点），第二个回调拿到的还是**旧闭包**里的 h ——
   * 于是「先点 7 点再点 5 分」会拼出「23:05」（用旧的 23 覆盖掉刚点的 7）。
   * 实测踩过：探针同一帧内连点两格，结果小时没变。
   * 用 ref 读最新值 + 立刻写回，连续点选才能正确叠加。
   */
  const latest = useRef({ h: hh, m: mm });

  const emit = (nh: number, nm: number) => {
    const h2 = (nh + 24) % 24;
    const m2 = (nm + 60) % 60;
    latest.current = { h: h2, m: m2 };
    setH(h2);
    setMi(m2);
    onChange(`${pad(h2)}:${pad(m2)}`);
  };

  const chip = (on: boolean) =>
    clsx(
      'h-8 rounded-card font-mono text-[12px] tabular-nums transition-colors',
      on ? 'vd-selected' : 'text-paper hover:bg-bronze/10',
    );

  return (
    <div className="space-y-4">
      {/* 当前值 + 回到此刻 */}
      <div className="flex items-center justify-between">
        <span className="font-serif text-headline text-3xl tabular-nums tracking-tight">
          {pad(h)}
          <span className="text-bronze mx-0.5">:</span>
          {pad(mi)}
        </span>
        <button
          onClick={() => {
            const d = new Date();
            emit(d.getHours(), d.getMinutes());
          }}
          className="btn-ghost"
          style={{ padding: '5px 12px', fontSize: '0.8125rem' }}
        >
          此刻
        </button>
      </div>

      <div>
        <span className="block font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-2">
          hour
        </span>
        <div className="grid grid-cols-6 gap-1.5">
          {Array.from({ length: 24 }, (_, i) => i).map((v) => (
            <button
              key={v}
              onClick={() => emit(v, latest.current.m)}
              className={chip(v === h)}
              aria-label={`${v} 点`}
            >
              {pad(v)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            minute
          </span>
          {/* 精确到分：5 分钟档位之间的零头用这两个键调 */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => emit(latest.current.h, latest.current.m - 1)}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="减 1 分钟"
            >
              <Minus size={13} strokeWidth={1.8} />
            </button>
            <button
              onClick={() => emit(latest.current.h, latest.current.m + 1)}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="加 1 分钟"
            >
              <Plus size={13} strokeWidth={1.8} />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-6 gap-1.5">
          {MINUTE_STEPS.map((v) => (
            <button
              key={v}
              onClick={() => emit(latest.current.h, v)}
              className={chip(v === mi)}
              aria-label={`${v} 分`}
            >
              {pad(v)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
