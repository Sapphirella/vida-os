import { ClockHeader } from '@/components/home/ClockHeader';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { CalendarCard } from '@/components/home/CalendarCard';
import { DayScheduleCard } from '@/components/home/DayScheduleCard';
import { MusicPlayerCard } from '@/components/home/MusicPlayerCard';
import { GlobalFindReplaceCard } from '@/components/search/GlobalFindReplaceCard';

export function DeskPage() {
  return (
    <div className="view-enter">
      <ClockHeader />
      <FeatureGrid />

      {/* 全局查找替换（位于 navigate 横线下方） */}
      <GlobalFindReplaceCard />

      {/* 日历 + 日程：双卡式 */}
      <section className="px-4 sm:px-6 pb-4">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
              today
            </span>
            <div className="flex-1 h-px bg-bronze/10" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <CalendarCard />
            <DayScheduleCard />
          </div>
        </div>
      </section>

      {/* 音乐播放器 */}
      <section className="px-4 sm:px-6 pb-6">
        <div className="max-w-5xl mx-auto">
          <MusicPlayerCard />
        </div>
      </section>
    </div>
  );
}
