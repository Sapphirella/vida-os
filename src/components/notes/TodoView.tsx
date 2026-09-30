import { useEffect, useRef, useState } from 'react';
import { Plus, Check, Trash2, Edit2, GripVertical } from 'lucide-react';
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
  // 排序模式：列表已锁 touch-action（CSS），起手即拖、无中途属性变更（中途改 touch-action
  // 会被浏览器判定为手势切换并触发 pointercancel，导致真机拖动中断）。
  const dragState = useRef<{
    id: string;
    row: HTMLLIElement;
    startY: number;
    held: boolean;
    timer: number;
    lastY: number;
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

  /** 立即进入拖拽态（排序模式起手即拖；普通模式由 timer 触发） */
  const startDrag = (ds: NonNullable<typeof dragState.current>) => {
    ds.held = true;
    ds.row.classList.add('vd-dragging');
    // 不在此处动态设置 touch-action：手势中途变更会被浏览器判定为切换并触发
    // pointercancel（真机拖动中断）。排序模式列表已由 CSS 整体锁定 touch-action；
    // 普通模式长按成立后改用原生 touchmove（passive:false）接管，preventDefault 阻止滚动。
  };

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

    /** 拖拽行跟手 + 更新插入指示线（pointer / touch 共用） */
    const applyDrag = (clientY: number) => {
      const ds = dragState.current;
      if (!ds || !ds.held || finished) return;
      ds.lastY = clientY;
      const dy = clientY - ds.startY;
      // 行跟手 + 轻微放大抬起（scale 由 JS 与 translateY 组合，避免被 class 覆盖）
      ds.row.style.transform = `translateY(${dy}px) scale(1.03)`;
      placeIndicator(clientY);
    };

    const onMove = (ev: PointerEvent) => {
      const ds = dragState.current;
      if (!ds || finished) return;
      if (!ds.held) {
        // 普通模式长按等待期：位移过大视为滚动意图，取消本次长按
        if (Math.abs(ev.clientY - startY) > 10) {
          clearTimeout(ds.timer);
          clearDrag();
        }
        return;
      }
      ev.preventDefault();
      applyDrag(ev.clientY);
    };

    // 普通模式长按成立后，浏览器可能对手势发 pointercancel（触摸滚动竞争），
    // pointermove 随即失效。改用 passive:false 的原生 touchmove 驱动拖拽并
    // preventDefault 阻止滚动；touchend / touchcancel 复用 onUp 落位。
    const onTouchMove = (ev: TouchEvent) => {
      if (finished) return;
      ev.preventDefault();
      applyDrag(ev.touches[0].clientY);
    };
    const onTouchEnd = () => onUp();

    const onUp = () => {
      const ds = dragState.current;
      if (finished) return;
      finished = true;
      if (ds) clearTimeout(ds.timer);
      if (held && ds) {
        // 轻点（位移 < 6px）不视为排序，避免误写回 store
        const dyFinal = ds.lastY - ds.startY;
        if (Math.abs(dyFinal) >= 6) {
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
      }
      clearDrag();
    };

    const cleanup = () => {
      const ds = dragState.current;
      if (!ds) return;
      if (ds.indicator) ds.indicator.remove();
      ds.row.style.transform = '';
      ds.row.classList.remove('vd-dragging');
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
    };

    pendingCleanup.current = cleanup;
    const ds: NonNullable<typeof dragState.current> = {
      id,
      row,
      startY,
      held: false,
      timer: 0,
      lastY: startY,
      indicator: null,
    };
    dragState.current = ds;
    if (sortMode) {
      // 排序模式：起手即拖（列表已锁 touch-action，无手势竞争）
      held = true;
      startDrag(ds);
    } else {
      ds.timer = window.setTimeout(() => {
        const cur = dragState.current;
        if (!cur || finished) return;
        held = true;
        startDrag(cur);
        // 长按成立后接管原生 touch 事件（passive:false）：浏览器可能已判定
        // 手势竞争而准备发 pointercancel，touch 事件不受 touch-action 变更影响，
        // touchmove + preventDefault 是移动端拖动排序的唯一可靠驱动。
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
      }, 250);
    }
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
        <ul
          ref={listRef}
          className={`space-y-2 ${sortMode ? 'vd-sort-mode' : ''}`}
          onPointerDown={onPointerDown}
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
