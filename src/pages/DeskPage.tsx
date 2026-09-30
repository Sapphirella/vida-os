import { ClockHeader } from '@/components/home/ClockHeader';
import { FeatureGrid } from '@/components/home/FeatureGrid';
import { CalendarCard } from '@/components/home/CalendarCard';
import { DayScheduleCard } from '@/components/home/DayScheduleCard';
import { DayOutputCard } from '@/components/home/DayOutputCard';
import { ViewStatsCard } from '@/components/home/ViewStatsCard';
import { TodoSummaryCard } from '@/components/home/TodoSummaryCard';
import { MusicPlayerCard } from '@/components/home/MusicPlayerCard';

export function DeskPage() {
  return (
    <div className="view-enter">
      <ClockHeader />
      <FeatureGrid />

      {/* 日历 + 当日产出：双卡式（日程卡在其下方） */}
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
            <DayOutputCard />
          </div>

          {/* 当日日程：选中日期的日程（跟随 selected 联动） */}
          <div className="mt-3">
            <DayScheduleCard />
          </div>
        </div>
      </section>

      {/* 待办：展示所有未完成待办（无标题分隔线） */}
      <section className="px-4 sm:px-6 pb-4">
        <div className="max-w-5xl mx-auto">
          <TodoSummaryCard />
        </div>
      </section>

      {/* 视图：内容数据一览 */}
      <section className="px-4 sm:px-6 pb-4">
        <div className="max-w-5xl mx-auto">
          <ViewStatsCard />
        </div>
      </section>

      {/* 音乐播放器 */}
      <section className="px-4 sm:px-6 pb-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-3 mb-3 px-1">
            <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
              soundscape
            </span>
            <div className="flex-1 h-px bg-bronze/10" />
          </div>
          <MusicPlayerCard />
        </div>
      </section>
    </div>
  );
}
