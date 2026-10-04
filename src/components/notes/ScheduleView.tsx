import { useState } from 'react';
import { Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { CategoryChips } from './CategoryChips';
import { ScheduleEditor, type ScheduleDraft } from './ScheduleEditor';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { todayKey, sortSchedules } from '@/lib/utils';
import type { ScheduleNote } from '@/types';

export function ScheduleView() {
  const schedule = useAppStore((s) => s.notes.schedule);
  const addSchedule = useAppStore((s) => s.addSchedule);
  const updateSchedule = useAppStore((s) => s.updateSchedule);
  const deleteSchedule = useAppStore((s) => s.deleteSchedule);
  const toggleDone = useAppStore((s) => s.toggleScheduleDone);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [composing, setComposing] = useState<Partial<ScheduleNote> | null>(null);

  const filtered = selectedCat
    ? schedule.filter((s) => s.category === selectedCat)
    : schedule;

  // 按日期分组（组内按时间排序：有时间在前升序，无时间按添加时间排后）
  const grouped = filtered.reduce<Record<string, ScheduleNote[]>>((acc, it) => {
    (acc[it.date] = acc[it.date] || []).push(it);
    return acc;
  }, {});
  for (const k of Object.keys(grouped)) {
    grouped[k] = sortSchedules(grouped[k]);
  }
  const sortedDates = Object.keys(grouped).sort();
  const today = todayKey();
  const futureDates = sortedDates.filter((d) => d >= today);
  const pastDates = sortedDates.filter((d) => d < today);

  return (
    <div>
      <CategoryChips which="schedule" selected={selectedCat} onSelect={setSelectedCat} />

      {composing && (
        <ScheduleEditor
          initial={composing}
          onCancel={() => setComposing(null)}
          onSave={(data) => {
            addSchedule(data);
            setComposing(null);
            showToast('日程已添加', 'success');
          }}
        />
      )}

      {filtered.length === 0 && !composing ? (
        <EmptyState
          title="还没有日程"
          hint="给未来的日子安排一些重要的事"
          action={
            <button
              onClick={() =>
                setComposing({
                  title: '',
                  date: todayKey(),
                  category: selectedCat || '生活',
                })
              }
              className="btn-primary"
            >
              <Plus size={14} strokeWidth={1.6} /> 新建日程
            </button>
          }
        />
      ) : (
        <div className="space-y-6">
          {/* 未来的 */}
          {futureDates.map((date) => (
            <div key={date}>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
                  {date === today ? 'today' : formatDateLabel(date)}
                </span>
                <div className="flex-1 h-px bg-bronze/10" />
              </div>
              <ul className="space-y-2">
                {grouped[date].map((it) => (
                  <ScheduleItem
                    key={it.id}
                    item={it}
                    isEditing={editingId === it.id}
                    onEdit={() => setEditingId(it.id)}
                    onCancel={() => setEditingId(null)}
                    onSave={(data) => {
                      updateSchedule(it.id, data);
                      setEditingId(null);
                    }}
                    onDelete={async () => {
                      if (await useUIStore.getState().confirmDialog('删除该日程？')) deleteSchedule(it.id);
                    }}
                    onToggle={() => toggleDone(it.id)}
                  />
                ))}
              </ul>
            </div>
          ))}

          {/* 过去的 */}
          {pastDates.length > 0 && (
            <div>
              <div className="flex items-center gap-3 mb-2 px-1">
                <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
                  past
                </span>
                <div className="flex-1 h-px bg-bronze/10" />
              </div>
              <div className="space-y-4 opacity-60">
                {pastDates.map((date) => (
                  <div key={date}>
                    <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase mb-2 px-1">
                      {formatDateLabel(date)}
                    </p>
                    <ul className="space-y-2">
                      {grouped[date].map((it) => (
                        <ScheduleItem
                          key={it.id}
                          item={it}
                          isEditing={editingId === it.id}
                          onEdit={() => setEditingId(it.id)}
                          onCancel={() => setEditingId(null)}
                          onSave={(data) => {
                            updateSchedule(it.id, data);
                            setEditingId(null);
                          }}
                          onDelete={async () => {
                            if (await useUIStore.getState().confirmDialog('删除该日程？')) deleteSchedule(it.id);
                          }}
                          onToggle={() => toggleDone(it.id)}
                        />
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!composing && (
        <button
          onClick={() =>
            setComposing({
              title: '',
              date: todayKey(),
              category: selectedCat || '生活',
            })
          }
          className="vd-fab fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'var(--wine)',
            boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)',
          }}
          aria-label="新建日程"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      )}
    </div>
  );
}

function formatDateLabel(d: string): string {
  const dt = new Date(d);
  return `${dt.getMonth() + 1}月${dt.getDate()}日`;
}

interface ItemProps {
  item: ScheduleNote;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (data: ScheduleDraft) => void;
  onDelete: () => void;
  onToggle: () => void;
}

function ScheduleItem({ item, isEditing, onEdit, onCancel, onSave, onDelete, onToggle }: ItemProps) {
  if (isEditing) {
    // 必须包 <li>：本组件渲染在 <ul> 内，编辑态直接返回 <Card>（div）
    // 会造成 ul > div 非法嵌套。
    return (
      <li>
        <Card className="p-4 animate-slide-up">
          <ScheduleEditor
            initial={item}
            inline
            onCancel={onCancel}
            onSave={(data) => onSave(data)}
          />
        </Card>
      </li>
    );
  }
  return (
    <li>
      <Card className="p-4 group hover:scale-[1.005] transition-transform">
        <div className="flex items-start gap-3">
          <button
            onClick={onToggle}
            aria-label={item.done ? '标记为未完成' : '标记完成'}
            title={item.done ? '标记为未完成' : '标记完成'}
            className={`mt-0.5 w-6 h-6 rounded-full border-2 border-solid flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
              item.done
                ? 'bg-wine/50 border-wine/60'
                : 'bg-bronze/10 border-candle/70 hover:border-candle hover:bg-bronze/20'
            }`}
          >
            {item.done && <Check size={14} strokeWidth={2.6} className="text-moon" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline gap-2 flex-wrap">
              {item.time && (
                <span className="font-mono text-[11px] text-bronze tracking-wider">
                  {item.time}
                </span>
              )}
              <p
                className={`font-serif text-paper text-base ${
                  item.done ? 'line-through text-bronze-deep' : ''
                }`}
              >
                {item.title}
              </p>
            </div>
            {item.note && (
              <p className="font-sans text-bronze text-xs mt-1 line-clamp-2">
                {item.note}
              </p>
            )}
            {/* 标签与编辑/删除放在主体文字下方，不再挤占正文一行 */}
            <div className="flex items-center gap-1.5 mt-1.5">
              <Tag>{item.category}</Tag>
              <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                <button
                  onClick={onEdit}
                  aria-label="编辑"
                  title="编辑"
                  className="w-5 h-5 flex items-center justify-center text-bronze hover:text-candle"
                >
                  <Edit2 size={11} strokeWidth={1.5} />
                </button>
                <button
                  onClick={onDelete}
                  aria-label="删除"
                  title="删除"
                  className="w-5 h-5 flex items-center justify-center text-bronze hover:text-wine-light"
                >
                  <Trash2 size={11} strokeWidth={1.5} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </li>
  );
}
