import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Check, ArrowRight } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';

/** 主页待办卡片最多展示的未完成条数，超出显示「去便签查看全部」 */
const MAX_VISIBLE = 6;

/** 主页待办模块：展示所有未完成待办，支持快速添加与勾选完成 */
export function TodoSummaryCard() {
  const navigate = useNavigate();
  const todo = useAppStore((s) => s.notes.todo);
  const addTodo = useAppStore((s) => s.addTodo);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const showToast = useUIStore((s) => s.showToast);
  const [draft, setDraft] = useState('');

  const pending = todo.filter((t) => !t.done);
  const shown = pending.slice(0, MAX_VISIBLE);
  const rest = pending.length - shown.length;

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    addTodo(text);
    setDraft('');
    showToast('待办已添加', 'success');
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            todo
          </p>
          <h3 className="font-serif text-headline text-lg mt-0.5">待办</h3>
          <p className="font-sans text-bronze text-xs mt-0.5">
            {pending.length > 0 ? `${pending.length} 项未完成` : '都完成啦'}
          </p>
        </div>
        <button
          onClick={() => navigate('/notes')}
          className="flex items-center gap-1 font-mono text-[10px] tracking-widest text-bronze-deep hover:text-bronze uppercase transition-colors"
        >
          全部 <ArrowRight size={12} strokeWidth={1.8} />
        </button>
      </div>

      {/* 快速添加 */}
      <div className="flex items-center gap-2 mb-3">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submit();
          }}
          placeholder="添加待办，回车确认"
          className="flex-1 min-w-0 bg-transparent border-b border-bronze/20 focus:border-candle/60 outline-none font-serif text-sm text-paper placeholder:text-bronze-deep py-1 transition-colors"
        />
        <button
          onClick={submit}
          className="w-7 h-7 flex items-center justify-center text-candle hover:bg-bronze/10 rounded transition-colors"
          aria-label="添加待办"
        >
          <Plus size={16} strokeWidth={1.6} />
        </button>
      </div>

      {shown.length === 0 ? (
        <div className="py-8 text-center">
          <p className="font-serif text-bronze text-sm">没有待办</p>
          <p className="font-sans text-bronze-deep text-xs mt-1">在上方输入框随手记下一件要做的事</p>
        </div>
      ) : (
        <>
          <ul className="space-y-1">
            {shown.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-bronze/5 transition-colors"
              >
                <button
                  onClick={() => toggleTodo(t.id)}
                  aria-label="标记完成"
                  className="w-5 h-5 flex-shrink-0 rounded-full border border-solid flex items-center justify-center transition-all active:scale-90 bg-bronze/10 border-candle/70 hover:border-candle hover:bg-bronze/20"
                >
                  {t.done && <Check size={12} strokeWidth={2.4} className="text-moon" />}
                </button>
                <button
                  onClick={() => navigate('/notes')}
                  className="flex-1 min-w-0 text-left"
                  title="去便签页查看"
                >
                  <p className="font-serif text-sm text-paper truncate">{t.content}</p>
                </button>
                <Tag>{t.category}</Tag>
              </li>
            ))}
          </ul>
          {rest > 0 && (
            <button
              onClick={() => navigate('/notes')}
              className="mt-2 w-full text-center font-mono text-[10px] tracking-widest text-bronze-deep hover:text-bronze uppercase transition-colors"
            >
              还有 {rest} 项 · 去便签查看
            </button>
          )}
        </>
      )}
    </Card>
  );
}
