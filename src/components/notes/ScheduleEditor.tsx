// 日程编辑表单（便签页与首页日程卡共用）
import { useState } from 'react';
import { Clock } from 'lucide-react';
import { clsx } from '@/lib/utils';
import { todayKey } from '@/lib/utils';
import { useUIStore } from '@/stores/useUIStore';
import { TimePicker } from '@/components/common/TimePicker';
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
  const showModal = useUIStore((s) => s.showModal);
  const showToast = useUIStore((s) => s.showToast);

  /** 能不能保存（按钮据此变暗 —— 但**不禁用**，点了要说明原因） */
  const canSave = Boolean(title.trim() && date);

  /**
   * 保存。
   *
   * ⚠️ v4.7.7 修：以前是 `if (title.trim() && date) onSave(...)` —— 标题为空时点了
   * **什么都不发生**（既不保存也不提示）。用户报「手机端无法点击保存，过一会儿又可以了」，
   * 十有八九就是踩了这个：静默失败跟按钮坏了没法区分。
   * 现在：按钮变暗 + 点了用 toast 说清缺什么。
   */
  const submit = () => {
    if (!title.trim()) {
      showToast('请先填写日程标题', 'error');
      return;
    }
    if (!date) {
      showToast('请先选择日期', 'error');
      return;
    }
    onSave({
      title: title.trim(),
      note: note.trim(),
      date,
      time,
      category: category.trim() || '生活',
    });
  };

  /**
   * 时间选择：走应用内的 TimePicker 弹窗（与碎片页同一个组件），
   * 不再用原生 `<input type="time">` —— 安卓是时钟表盘、iOS 是滚轮，
   * 样式改不了、跟主题也不一致（v4.7.3 按要求统一）。
   * 日期仍保留原生 `<input type="date">`：它的系统弹窗自带取消/确定，没有上面的问题。
   */
  const openTimePicker = () => {
    let draft = time || '09:00';
    showModal({
      title: '选择时间',
      content: <TimePicker value={draft} onChange={(v) => { draft = v; }} />,
      onConfirm: () => setTime(draft),
    });
  };

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
        <button
          onClick={openTimePicker}
          className="flex items-center gap-1.5 px-2 py-1 rounded-card text-xs bg-bronze/10 hover:bg-bronze/20 text-paper transition-colors"
          aria-label="选择时间"
          title="选择时间"
        >
          <Clock size={11} strokeWidth={1.8} className="text-bronze-deep" />
          <span className="font-mono tabular-nums">{time || '选时间'}</span>
        </button>
        <input
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="分类"
          className="px-2 py-1 text-xs bg-bronze/10 rounded text-paper outline-none w-20"
        />
        {/* 操作区：**手机上单独占一整行**（v4.7.7）。
            以前放在 meta 那行的末尾（ml-auto），窄屏 + 软键盘弹起时位置会飘，
            点不到就只能干瞪眼；现在固定为表单最后一行、右对齐，位置可预期。
            顺带把点按目标调大（9px 内边距 ≈ 40px 高）。 */}
        <div className="flex gap-2 ml-auto max-sm:w-full max-sm:justify-end max-sm:mt-1">
          <button onClick={onCancel} className="btn-text" style={{ padding: '9px 16px' }}>
            取消
          </button>
          <button
            onClick={submit}
            className={clsx('btn-primary', !canSave && 'opacity-40')}
            style={{ padding: '9px 16px', fontSize: '0.8125rem' }}
          >
            保存
          </button>
        </div>
      </div>
    </div>
  );
}
