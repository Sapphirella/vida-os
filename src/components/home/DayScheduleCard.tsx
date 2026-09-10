import { useMemo, useState } from 'react';
import { Plus, Check, Trash2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { todayKey, chineseWeekday, chineseDate } from '@/lib/utils';

export function DayScheduleCard() {
  const [selected, setSelected] = useState(todayKey());
  const schedule = useAppStore((s) => s.notes.schedule);
  const toggleDone = useAppStore((s) => s.toggleScheduleDone);
  const del = useAppStore((s) => s.deleteSchedule);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  const items = useMemo(() => {
    return schedule
      .filter((s) => s.date === selected)
      .sort((a, b) => {
        if (a.done !== b.done) return a.done ? 1 : -1;
        return (a.time || '').localeCompare(b.time || '');
      });
  }, [schedule, selected]);

  return (
    <Card className="p-4 sm:p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            schedule
          </p>
          <h3 className="font-serif text-moon text-lg mt-0.5">
            {chineseDate(new Date(selected))}
          </h3>
          <p className="font-sans text-bronze text-xs mt-0.5">
            周{chineseWeekday(new Date(selected))} · {items.length} 项
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Plus size={14} strokeWidth={1.6} />}
          onClick={() => {
            openEditor({
              mode: 'inspiration', // schedule editor 复用
              date: selected,
            });
            // 直接打开 schedule 编辑
            setTimeout(() => {
              const ev = new CustomEvent('open-schedule-editor', { detail: { date: selected } });
              window.dispatchEvent(ev);
            }, 50);
            showToast('请填写日程信息', 'info');
          }}
        >
          新增
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto -mx-1 px-1">
        {items.length === 0 ? (
          <EmptyState
            title="今天还空着"
            hint="点击右上角添加你的日程"
          />
        ) : (
          <ul className="space-y-2">
            {items.map((it) => (
              <li
                key={it.id}
                className="group flex items-start gap-3 p-2.5 -mx-1 rounded-lg hover:bg-bronze/5 transition-colors"
              >
                <button
                  onClick={() => toggleDone(it.id)}
                  className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${
                    it.done
                      ? 'bg-wine/40 border-wine/50'
                      : 'border-bronze/40 hover:border-candle'
                  }`}
                  aria-label="完成"
                >
                  {it.done && <Check size={12} strokeWidth={2.4} className="text-moon" />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    {it.time && (
                      <span className="font-mono text-[11px] text-bronze tracking-wider">
                        {it.time}
                      </span>
                    )}
                    <p
                      className={`font-serif text-paper ${
                        it.done ? 'line-through text-bronze-deep' : ''
                      }`}
                    >
                      {it.title}
                    </p>
                  </div>
                  {it.note && (
                    <p className="font-sans text-bronze text-xs mt-1 line-clamp-2">
                      {it.note}
                    </p>
                  )}
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <Tag>{it.category}</Tag>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (confirm('确认删除该日程？')) del(it.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center text-bronze hover:text-wine-light transition-all"
                  aria-label="删除"
                >
                  <Trash2 size={12} strokeWidth={1.4} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
