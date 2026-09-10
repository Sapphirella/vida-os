import { useState } from 'react';
import { Plus, Check, Trash2, Edit2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { CategoryChips } from './CategoryChips';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import type { TodoNote } from '@/types';

export function TodoView() {
  const todo = useAppStore((s) => s.notes.todo);
  const addTodo = useAppStore((s) => s.addTodo);
  const updateTodo = useAppStore((s) => s.updateTodo);
  const deleteTodo = useAppStore((s) => s.deleteTodo);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ content: string; category: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  const filtered = (selectedCat ? todo.filter((t) => t.category === selectedCat) : todo).filter(
    (t) => showCompleted || !t.done,
  );

  const remaining = todo.filter((t) => !t.done).length;
  const total = todo.length;

  return (
    <div>
      <CategoryChips which="todo" selected={selectedCat} onSelect={setSelectedCat} />

      {/* 顶部统计 */}
      {total > 0 && (
        <div className="flex items-center gap-3 mb-4 px-1">
          <p className="font-serif text-paper">
            <span className="text-2xl text-candle mr-1">{remaining}</span>
            <span className="text-bronze text-sm">/ {total} 项待办</span>
          </p>
          <div className="flex-1" />
          <button
            onClick={() => setShowCompleted((s) => !s)}
            className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase hover:text-bronze transition-colors"
          >
            {showCompleted ? '▾ 隐藏已完成' : '▴ 显示已完成'}
          </button>
        </div>
      )}

      {composing && (
        <Card className="p-4 mb-4 animate-slide-up">
          <input
            autoFocus
            value={composing.content}
            onChange={(e) => setComposing({ ...composing, content: e.target.value })}
            placeholder="要做的事..."
            className="w-full bg-transparent font-serif text-lg text-paper placeholder:text-bronze-deep outline-none"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && composing.content.trim()) {
                addTodo(composing.content.trim(), composing.category);
                setComposing(null);
                showToast('已添加', 'success');
              }
            }}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-bronze/10">
            <input
              value={composing.category}
              onChange={(e) =>
                setComposing({ ...composing, category: e.target.value })
              }
              placeholder="分类"
              className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper outline-none w-20"
            />
            <div className="flex gap-2">
              <button onClick={() => setComposing(null)} className="btn-text">
                取消
              </button>
              <button
                onClick={() => {
                  if (composing.content.trim()) {
                    addTodo(composing.content.trim(), composing.category);
                    setComposing(null);
                    showToast('已添加', 'success');
                  }
                }}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              >
                添加
              </button>
            </div>
          </div>
        </Card>
      )}

      {filtered.length === 0 && !composing ? (
        <EmptyState
          title={total === 0 ? '没有待办' : '所有待办都已完成'}
          hint={total === 0 ? '把该做的事记下来吧' : '给自己泡杯茶吧'}
          action={
            total === 0 ? (
              <button
                onClick={() => setComposing({ content: '', category: selectedCat || '生活' })}
                className="btn-primary"
              >
                <Plus size={14} strokeWidth={1.6} /> 新建待办
              </button>
            ) : null
          }
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((t) => (
            <TodoItem
              key={t.id}
              item={t}
              isEditing={editingId === t.id}
              onEdit={() => setEditingId(t.id)}
              onCancel={() => setEditingId(null)}
              onSave={(content) => {
                updateTodo(t.id, { content });
                setEditingId(null);
              }}
              onToggle={() => toggleTodo(t.id)}
              onDelete={() => {
                if (confirm('删除该待办？')) deleteTodo(t.id);
              }}
            />
          ))}
        </ul>
      )}

      {!composing && (
        <button
          onClick={() => setComposing({ content: '', category: selectedCat || '生活' })}
          className="fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'var(--wine)',
            boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)',
          }}
          aria-label="新建待办"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      )}
    </div>
  );
}

interface ItemProps {
  item: TodoNote;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (content: string) => void;
  onToggle: () => void;
  onDelete: () => void;
}

function TodoItem({ item, isEditing, onEdit, onCancel, onSave, onToggle, onDelete }: ItemProps) {
  const [draft, setDraft] = useState(item.content);

  if (isEditing) {
    return (
      <Card className="p-4 animate-slide-up">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="w-full bg-transparent font-serif text-base text-paper outline-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.trim()) onSave(draft.trim());
          }}
        />
        <div className="flex justify-end gap-2 mt-2">
          <button onClick={onCancel} className="btn-text">
            取消
          </button>
          <button
            onClick={() => draft.trim() && onSave(draft.trim())}
            className="btn-primary"
            style={{ padding: '4px 12px', fontSize: '0.75rem' }}
          >
            保存
          </button>
        </div>
      </Card>
    );
  }

  return (
    <li>
      <Card className="p-3.5 sm:p-4 group hover:scale-[1.005] transition-transform">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            className={`w-5 h-5 rounded-full border flex items-center justify-center flex-shrink-0 transition-all ${
              item.done
                ? 'bg-wine/40 border-wine/50'
                : 'border-bronze/40 hover:border-candle'
            }`}
          >
            {item.done && <Check size={12} strokeWidth={2.4} className="text-moon" />}
          </button>
          <p
            className={`flex-1 font-serif text-paper ${
              item.done ? 'line-through text-bronze-deep' : ''
            }`}
          >
            {item.content}
          </p>
          <Tag>{item.category}</Tag>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
            >
              <Edit2 size={11} strokeWidth={1.5} />
            </button>
            <button
              onClick={onDelete}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-wine-light"
            >
              <Trash2 size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </Card>
    </li>
  );
}
