/* ============================================================
   猩红书房 · 液态玻璃指针跟踪
   - 参考 rdev/liquid-glass-react 的核心观感（边缘高光/水光跟随光照方向、
     frosty blur、弹性），用 document 级 pointermove + CSS 变量实现，
     不引入 WebGL 依赖（移动端 Safari/Firefox 不支持位移折射，CSS 方案的
     高光跟随 + 渐变描边是通用可靠实现）。
   - 作用：把指针（鼠标/触摸）相对卡片的位置写入 --mx/--my（px），
     globals.css 中 [data-theme='scarlet'] 下的 radial-gradient 以此为锚。
   - 仅 data-theme === 'scarlet' 时写变量；其余主题零开销。
   - 回退：删除本文件 + main.tsx 中的初始化调用 + globals.css 内
     「猩红书房 · 液态玻璃」注释块即可恢复原样。
   ============================================================ */

let raf = 0;

export function initLiquidGlass() {
  if (typeof document === 'undefined') return;

  const onPointerMove = (e: PointerEvent) => {
    const card = (e.target as Element | null)?.closest?.('.glass-card') as HTMLElement | null;
    if (!card || card.isConnected === false) return;
    if (raf) return; // rAF 节流：同一帧只处理一次
    const x = e.clientX;
    const y = e.clientY;
    raf = requestAnimationFrame(() => {
      raf = 0;
      // 非猩红主题直接跳过（pointerenter 后切换主题的高光残留由该判断避免）
      if (document.documentElement.dataset.theme !== 'scarlet') return;
      if (!card.isConnected) return;
      const r = card.getBoundingClientRect();
      card.style.setProperty('--mx', `${x - r.left}px`);
      card.style.setProperty('--my', `${y - r.top}px`);
    });
  };

  document.addEventListener('pointermove', onPointerMove, { passive: true });
}