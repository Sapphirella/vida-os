// 日程编辑表单（便签页与首页日程卡共用）
import { useState } from 'react';
import { todayKey } from '@/lib/utils';
import type { ScheduleNote } from '@/types';

/** 新建日程所需的完整字段（id/时间戳/done 由 store 生成） */
export type ScheduleDraft = Omit<ScheduleNote, 'id' | 'createdAt' | 'updatedAt' | 'done'>;

interface ScheduleEditorProps {
  initial: Partial<ScheduleNote>;
  /** true 时不再自带 glass-card 外壳（用于列表内联编辑） */
  inline?: boolean;
  onCancel: () => void;
  onSave: (data: ScheduleDraft) => void;
}

export function ScheduleEditor({ initial, inline, onCancel, onSave }: ScheduleEditorProps) {
  const [title, setTitle] = useState(initial.title || '');
  const [note, setNote] = useState(initial.note || '');
  const [date, setDate] = useState(initial.date || todayKey());
  const [time, setTime] = useState(initial.time || '');
  const [category, setCategory] = useState(initial.category || '生活');

  return (
    <div className={inline ? '' : 'glass-card p-4 mb-4 animate-slide-up'}>
      <input
        autoFocus={!inline}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="日程标题"
        className="w-full bg-transparent font-serif text-lg text-paper placeholder:text-bronze-deep outline-none"
      />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="备注（可选）"
        className="w-full bg-transparent mt-2 resize-none font-serif text-sm text-bronze placeholder:text-bronze-deep outline-none"
        rows={2}
      />
      <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-bronze/10">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="px-2 py-1 text-xs bg-bronze/10 rounded text-paper outline-none font-mono"
        />
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          className="px-2 py-1 text-xs bg-bronze/10 rounded text-paper outline-none font-mono"
        />
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="分类"
          className="px-2 py-1 text-xs bg-bronze/10 rounded text-paper outline-none w-20"
        />
        <div className="ml-auto flex gap-2">
          <button onClick={onCancel} className="btn-text">
            取消
          </button>
          <button
            onClick={() => {
              if (title.trim() && date) {
                onSave({
                  title: title.trim(),
                  note: note.trim(),
                  date,
                  time,
                  category: category.trim() || '生活',
                });
              }
            }}
            className="btn-primary"
            style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
