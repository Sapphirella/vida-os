import { useRef, useState } from 'react';
import { Plus, Check, Trash2, Edit2, GripVertical } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { CategoryChips } from './CategoryChips';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { clsx } from '@/lib/utils';
import { useDragSort } from '@/lib/useDragSort';
import type { TodoNote } from '@/types';

export function TodoView() {
  const todo = useAppStore((s) => s.notes.todo);
  const addTodo = useAppStore((s) => s.addTodo);
  const updateTodo = useAppStore((s) => s.updateTodo);
  const deleteTodo = useAppStore((s) => s.deleteTodo);
  const toggleTodo = useAppStore((s) => s.toggleTodo);
  const reorderTodo = useAppStore((s) => s.reorderTodo);
  const showToast = useUIStore((s) => s.showToast);
  // 放 UI store：分栏切走会卸载组件，局部 state 的筛选会被重置（v4.7.11 修）
  const selectedCat = useUIStore((s) => s.noteCategory.todo);
  const setSelectedCat = (v: string | null) => useUIStore.getState().setNoteCategory('todo', v);
  const [composing, setComposing] = useState<{ content: string; category: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // 放 UI store：分页切走会卸载本组件，局部 state 会被重置（v4.7.7 修）
  const showCompleted = useUIStore((s) => s.showCompletedTodos);
  const setShowCompleted = useUIStore((s) => s.setShowCompletedTodos);
  // 排序模式：进入后禁长按复制 + 缩短长按判定，按住行即可拖动排序
  const [sortMode, setSortMode] = useState(false);
  const listRef = useRef<HTMLUListElement>(null);

  // 统计与列表共用同一分类范围，否则过滤后会出现「列表为空却显示 0 / 5 项待办」
  const scoped = selectedCat ? todo.filter((t) => t.category === selectedCat) : todo;
  // 已完成自动置底：稳定排序保证未完成保持原相对顺序，取消完成即可按原顺序恢复原位
  const filtered = scoped
    .filter((t) => showCompleted || !t.done)
    .sort((a, b) => Number(a.done) - Number(b.done));

  // ===== 长按拖动排序（参照 Nookery 排序模式）=====
  // 普通模式：250ms 长按判定；>10px 位移取消；拖动中行跟手 + 插入指示线；松手落位写回 store。
  // 拖动排序：引擎已抽到 src/lib/useDragSort.ts（v4.7.9），这里只提供列表引用与写回。
  // 排序模式起手即拖；普通模式长按 250ms —— 细节与移动端注意事项都在那个 hook 里。
  const { onPointerDown, onContextMenu, clearDrag } = useDragSort({
    listRef,
    itemAttr: 'data-todo-id',
    sortMode,
    items: filtered,
    onReorder: reorderTodo,
  });

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
            onClick={() => {
              if (sortMode) clearDrag();
              setSortMode((s) => !s);
              showToast(sortMode ? '已保存排序' : '已进入排序，按住待办拖动调整顺序', 'success');
            }}
            className={`flex items-center gap-1 font-mono text-[10px] tracking-widest uppercase transition-colors ${
              sortMode
                ? 'text-candle'
                : 'text-bronze-deep hover:text-bronze'
            }`}
            aria-pressed={sortMode}
          >
            <GripVertical size={12} strokeWidth={2} />
            {sortMode ? '完成' : '排序'}
          </button>
          <button
            onClick={() => setShowCompleted(!showCompleted)}
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
                  // 空内容时以前什么都不做 → 现在明确说一声（v4.7.7）
                  if (!composing.content.trim()) {
                    showToast('请先写点什么', 'error');
                    return;
                  }
                  addTodo(composing.content.trim(), composing.category);
                  setComposing(null);
                  showToast('已添加', 'success');
                }}
                className={clsx('btn-primary', !composing.content.trim() && 'opacity-40')}
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
        <ul
          ref={listRef}
          className={`space-y-2 ${sortMode ? 'vd-sort-mode' : ''}`}
          onPointerDown={onPointerDown}
          onContextMenu={onContextMenu}
        >
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
              onDelete={async () => {
                if (await useUIStore.getState().confirmDialog('删除该待办？')) deleteTodo(t.id);
              }}
            />
          ))}
        </ul>
      )}

      {!composing && (
        <button
          onClick={() => setComposing({ content: '', category: selectedCat || '生活' })}
          className="vd-fab fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
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
              onClick={() => {
                // 空内容时以前直接不保存也不提示（v4.7.11 修：变暗 + 说明）
                if (!draft.trim()) {
                  useUIStore.getState().showToast('内容不能为空', 'error');
                  return;
                }
                onSave(draft.trim());
              }}
              className={clsx('btn-primary', !draft.trim() && 'opacity-40')}
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
          <div className="flex-1 min-w-0">
            <p
              className={`font-serif text-paper leading-relaxed ${
                item.done ? 'line-through text-bronze-deep' : ''
              }`}
            >
              {item.content}
            </p>
            {/* 标签与编辑/删除放在主体文字下方，不再挤占正文一行 */}
            <div className="mt-1.5 flex items-center gap-1.5">
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
