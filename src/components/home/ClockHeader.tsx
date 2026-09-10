import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { greetingByHour, chineseWeekday, chineseDate } from '@/lib/utils';

// 大时间日期标题区 - 桌面 hero
export function ClockHeader() {
  const [now, setNow] = useState(new Date());
  const profile = useAppStore((s) => s.profile);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(t);
  }, []);

  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  const greeting = greetingByHour(now.getHours());
  const dateStr = `${now.getFullYear()} 年 ${chineseDate(now)} · 周${chineseWeekday(now)}`;

  return (
    <section className="px-4 sm:px-6 pt-2 pb-6 sm:pt-4 sm:pb-8">
      <div className="max-w-5xl mx-auto">
        {/* 顶部小字：问候 */}
        <div className="flex items-center gap-2 mb-3 sm:mb-4">
          <div
            className="w-1 h-1 rounded-full"
            style={{
              background: 'var(--candle)',
              boxShadow: '0 0 8px var(--candle)',
              animation: 'pulse-slow 3s ease-in-out infinite',
            }}
          />
          <p className="font-mono text-[11px] tracking-[0.2em] text-bronze uppercase">
            {greeting}
          </p>
        </div>

        {/* 大时间 - 打字机风格 */}
        <div className="flex items-end gap-2 sm:gap-3 mb-4 sm:mb-5">
          <span
            className="font-mono text-moon leading-none tracking-tighter"
            style={{
              fontSize: 'clamp(3.5rem, 14vw, 7.5rem)',
              fontWeight: 300,
              letterSpacing: '-0.04em',
              textShadow: '0 0 40px rgba(232, 195, 158, 0.15)',
            }}
          >
            {hh}
          </span>
          <span
            className="font-mono leading-none mb-2 sm:mb-3"
            style={{
              fontSize: 'clamp(2rem, 8vw, 4.5rem)',
              fontWeight: 200,
              color: 'var(--bronze)',
              animation: 'breathe 2s ease-in-out infinite',
            }}
          >
            :
          </span>
          <span
            className="font-mono text-moon leading-none tracking-tighter"
            style={{
              fontSize: 'clamp(3.5rem, 14vw, 7.5rem)',
              fontWeight: 300,
              letterSpacing: '-0.04em',
              textShadow: '0 0 40px rgba(232, 195, 158, 0.15)',
            }}
          >
            {mm}
          </span>
        </div>

        {/* 日期 */}
        <p className="font-serif text-paper-dim text-base sm:text-lg tracking-wide">
          {dateStr}
        </p>

        {/* 个性签名 */}
        {profile.signature && (
          <p className="font-serif italic text-bronze text-sm sm:text-base mt-2 sm:mt-3 max-w-2xl leading-relaxed">
            —— {profile.signature}
          </p>
        )}
      </div>
    </section>
  );
}
