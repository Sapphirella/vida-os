import { useEffect, useRef, useState } from 'react';
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
  const reorderTodo = useAppStore((s) => s.reorderTodo);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ content: string; category: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);
  const listRef = useRef<HTMLUListElement>(null);

  // 统计与列表共用同一分类范围，否则过滤后会出现「列表为空却显示 0 / 5 项待办」
  const scoped = selectedCat ? todo.filter((t) => t.category === selectedCat) : todo;
  // 已完成自动置底：稳定排序保证未完成保持原相对顺序，取消完成即可按原顺序恢复原位
  const filtered = scoped
    .filter((t) => showCompleted || !t.done)
    .sort((a, b) => Number(a.done) - Number(b.done));

  // ===== 长按拖动排序（参照 Nookery 排序模式）=====
  // 250ms 长按判定；>10px 位移取消；拖动中行跟手 + 显示插入指示线；松手落位写回 store
  const dragState = useRef<{
    id: string;
    row: HTMLLIElement;
    startY: number;
    held: boolean;
    timer: number;
    indicator: HTMLLIElement | null;
  } | null>(null);
  const pendingCleanup = useRef<(() => void) | null>(null);

  const clearDrag = () => {
    pendingCleanup.current?.();
    pendingCleanup.current = null;
    dragState.current = null;
  };

  // 组件卸载时清理拖拽产生的临时监听（防泄漏）
  useEffect(() => {
    return () => clearDrag();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    // 按钮 / 编辑态 / 非行元素不触发
    if (target.closest('button')) return;
    const row = target.closest('li[data-todo-id]') as HTMLLIElement | null;
    if (!row) return;

    const id = row.dataset.todoId!;
    const startY = e.clientY;
    let held = false;
    let finished = false;

    const placeIndicator = (y: number) => {
      const root = listRef.current;
      if (!root) return;
      const ds = dragState.current;
      if (!ds) return;
      let target: HTMLLIElement | null = null;
      root.querySelectorAll<HTMLLIElement>('li[data-todo-id]:not(.vd-dragging)').forEach((r) => {
        const rect = r.getBoundingClientRect();
        if (!target && y < rect.top + rect.height / 2) target = r;
      });
      let ind = ds.indicator;
      if (!ind) {
        ind = document.createElement('li');
        ind.className = 'vd-sort-indicator';
        ind.setAttribute('aria-hidden', 'true');
        ind.style.pointerEvents = 'none';
        ds.indicator = ind;
      }
      if (target) root.insertBefore(ind, target);
      else root.appendChild(ind);
    };

    const onMove = (ev: PointerEvent) => {
      const ds = dragState.current;
      if (!ds || finished) return;
      if (!held) {
        if (Math.abs(ev.clientY - startY) > 10) {
          clearTimeout(ds.timer);
          clearDrag();
        }
        return;
      }
      ev.preventDefault();
      const dy = ev.clientY - startY;
      ds.row.style.transform = `translateY(${dy}px)`;
      placeIndicator(ev.clientY);
    };

    const onUp = () => {
      const ds = dragState.current;
      if (finished) return;
      finished = true;
      if (ds) clearTimeout(ds.timer);
      if (held && ds) {
        // 落位：根据指示线当前 DOM 位置计算目标索引
        const root = listRef.current;
        const ind = ds.indicator;
        let to = -1;
        if (root && ind && ind.isConnected) {
          const rows = Array.from(root.querySelectorAll<HTMLLIElement>('li[data-todo-id]'));
          const prev = ind.previousElementSibling as HTMLElement | null;
          if (prev && prev.hasAttribute('data-todo-id')) {
            const i = rows.indexOf(prev as HTMLLIElement);
            to = i >= 0 ? i + 1 : rows.length;
          } else {
            to = 0;
          }
        }
        const ids = filtered.map((t) => t.id);
        const from = ids.indexOf(ds.id);
        if (from >= 0 && to >= 0) {
          ids.splice(from, 1);
          let insert = to;
          if (to > from) insert = to - 1;
          ids.splice(insert, 0, ds.id);
          reorderTodo(ids);
        }
      }
      clearDrag();
    };

    const cleanup = () => {
      const ds = dragState.current;
      if (!ds) return;
      if (ds.indicator) ds.indicator.remove();
      ds.row.style.transform = '';
      ds.row.style.touchAction = '';
      ds.row.classList.remove('vd-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };

    pendingCleanup.current = cleanup;
    dragState.current = {
      id,
      row,
      startY,
      held: false,
      timer: window.setTimeout(() => {
        const ds = dragState.current;
        if (!ds || finished) return;
        held = true;
        ds.held = true;
        // 移动端长按时锁定该行的触摸滚动，避免拖拽与滚动手势打架
        ds.row.style.touchAction = 'none';
        ds.row.classList.add('vd-dragging');
      }, 250),
      indicator: null,
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
  };

  const remaining = scoped.filter((t) => !t.done).length;
  const total = scoped.length;

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
          <textarea
            autoFocus
            value={composing.content}
            onChange={(e) => setComposing({ ...composing, content: e.target.value })}
            placeholder="要做的事..."
            rows={2}
            className="w-full bg-transparent font-serif text-lg text-paper placeholder:text-bronze-deep outline-none resize-none leading-normal"
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
        <ul ref={listRef} className="space-y-2" onPointerDown={onPointerDown}>
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
    // 必须包 <li>：本组件渲染在 <ul> 内，编辑态直接返回 <Card>（div）
    // 会造成 ul > div 非法嵌套。
    return (
      <li>
        <Card className="p-4 animate-slide-up">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="w-full bg-transparent font-serif text-base text-paper outline-none resize-none leading-normal"
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
      </li>
    );
  }

  return (
    <li data-todo-id={item.id}>
      <Card className="p-3.5 sm:p-4 group hover:scale-[1.005] transition-transform">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggle}
            aria-label={item.done ? '标记为未完成' : '标记完成'}
            title={item.done ? '标记为未完成' : '标记完成'}
            className={`w-6 h-6 rounded-full border-2 border-solid flex items-center justify-center flex-shrink-0 transition-all active:scale-90 ${
              item.done
                ? 'bg-wine/50 border-wine/60'
                : 'bg-bronze/10 border-candle/70 hover:border-candle hover:bg-bronze/20'
            }`}
          >
            {item.done && <Check size={14} strokeWidth={2.6} className="text-moon" />}
          </button>
          <p
            className={`flex-1 font-serif text-paper ${
              item.done ? 'line-through text-bronze-deep' : ''
            }`}
          >
            {item.content}
          </p>
          <Tag>{item.category}</Tag>
          <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
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
