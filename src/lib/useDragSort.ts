// 拖动排序引擎（共享 hook，v4.7.9 从 TodoView 抽出来）
//
// 为什么抽出来：待办那套「长按 / 起手即拖 + 插入指示线 + 落位写回」是踩了很多坑才调稳的
// （见 PROJECT_MEMORY 教训 29 与 §4-17），音乐列表再抄一遍必然又踩一遍。
//
// 两处差异都用参数表达：
//   - `itemAttr`：行元素上标记 id 的属性名（待办 `data-todo-id`、音乐 `data-track-id`）；
//   - `allowFromButton`：待办的行主体是普通 div（按钮要跳过），音乐的行主体**本身是按钮**
//     （整行可点即选中），所以音乐这边必须允许从按钮上起手。
//
// 移动端注意事项（都在这里解决了，别在调用方重复做）：
//   - 列表在排序模式挂 `ul.vd-sort-mode`（锁 touch-action、禁长按复制与 -webkit-touch-callout）；
//   - 本 hook 再提供 `onContextMenu`，调用方挂上即可屏蔽安卓的长按菜单；
//   - 长按成立后改用原生 touchmove(passive:false) 驱动，避免浏览器把手势判成滚动而 pointercancel。
import { useEffect, useRef } from 'react';

export interface DragSortOptions {
  listRef: React.RefObject<HTMLUListElement | null>;
  /** 行元素上标记 id 的属性名，如 'data-todo-id' / 'data-track-id' */
  itemAttr: string;
  /** 是否处于排序模式（true = 起手即拖；false = 长按 250ms） */
  sortMode: boolean;
  /** 当前展示（也就是可拖）的条目顺序 */
  items: { id: string }[];
  /** 落位后写回新顺序 */
  onReorder: (ids: string[]) => void;
  /** 允许从按钮上起手拖（行主体本身是按钮时必须开） */
  allowFromButton?: boolean;
}

export function useDragSort({
  listRef,
  itemAttr,
  sortMode,
  items,
  onReorder,
  allowFromButton = false,
}: DragSortOptions) {
  /** 最新一轮的数据放进 ref：拖拽回调是命令式的，不能依赖闭包里的旧值 */
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const onReorderRef = useRef(onReorder);
  onReorderRef.current = onReorder;
  const sortModeRef = useRef(sortMode);
  sortModeRef.current = sortMode;

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
  useEffect(() => () => clearDrag(), []);

  const onPointerDown = (e: React.PointerEvent<HTMLUListElement>) => {
    const target = e.target as HTMLElement;
    // 按钮不触发（除非调用方说明整行就是按钮）；编辑态、非行元素同样跳过
    if (!allowFromButton && target.closest('button')) return;
    const row = target.closest(`li[${itemAttr}]`) as HTMLLIElement | null;
    if (!row) return;
    const id = row.getAttribute(itemAttr);
    if (!id) return;

    const startY = e.clientY;
    let held = false;
    let finished = false;

    const placeIndicator = (y: number) => {
      const root = listRef.current;
      if (!root) return;
      const ds = dragState.current;
      if (!ds) return;
      let targetRow: HTMLLIElement | null = null;
      root.querySelectorAll<HTMLLIElement>(`li[${itemAttr}]:not(.vd-dragging)`).forEach((r) => {
        const rect = r.getBoundingClientRect();
        if (!targetRow && y < rect.top + rect.height / 2) targetRow = r;
      });
      let ind = ds.indicator;
      if (!ind) {
        ind = document.createElement('li');
        ind.className = 'vd-sort-indicator';
        ind.setAttribute('aria-hidden', 'true');
        ind.style.pointerEvents = 'none';
        ds.indicator = ind;
      }
      if (targetRow) root.insertBefore(ind, targetRow);
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

    // 长按成立后，浏览器可能对手势发 pointercancel（触摸滚动竞争），pointermove 随即失效。
    // 改用 passive:false 的原生 touchmove 驱动并 preventDefault 阻止滚动。
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
            const rows = Array.from(root.querySelectorAll<HTMLLIElement>(`li[${itemAttr}]`));
            const prev = ind.previousElementSibling as HTMLElement | null;
            if (prev && prev.hasAttribute(itemAttr)) {
              const i = rows.indexOf(prev as HTMLLIElement);
              to = i >= 0 ? i + 1 : rows.length;
            } else {
              to = 0;
            }
          }
          const ids = itemsRef.current.map((t) => t.id);
          const from = ids.indexOf(ds.id);
          if (from >= 0 && to >= 0) {
            ids.splice(from, 1);
            let insert = to;
            if (to > from) insert = to - 1;
            ids.splice(insert, 0, ds.id);
            onReorderRef.current(ids);
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
      window.removeEventListener('pointercancel', onUp);
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
    if (sortModeRef.current) {
      // 排序模式：起手即拖（列表已锁 touch-action，无手势竞争）
      held = true;
      ds.held = true;
      ds.row.classList.add('vd-dragging');
    } else {
      ds.timer = window.setTimeout(() => {
        const cur = dragState.current;
        if (!cur || finished) return;
        held = true;
        cur.held = true;
        cur.row.classList.add('vd-dragging');
        // 长按成立后接管原生 touch 事件（passive:false）
        window.addEventListener('touchmove', onTouchMove, { passive: false });
        window.addEventListener('touchend', onTouchEnd);
        window.addEventListener('touchcancel', onTouchEnd);
      }, 250);
    }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    // v4.7.11：安卓把手势判成滚动时会发 pointercancel（本文件注释里点名的那个竞争）。
    // 之前没人接它 —— 已抬起的行会保持样式、幽灵指示线留在列表里，直到下一次 pointerup。
    window.addEventListener('pointercancel', onUp);
  };

  /** 屏蔽长按菜单（安卓）：挂在列表容器上 */
  const onContextMenu = (e: React.MouseEvent) => {
    if (sortModeRef.current) e.preventDefault();
  };

  return { onPointerDown, onContextMenu, clearDrag };
}
