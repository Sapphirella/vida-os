import { useEffect, useState } from 'react';

/**
 * 软键盘可见性检测
 *
 * 为什么不用 100dvh / <meta viewport> 的 interactive-widget：
 * 各家内核行为不一致 —— iOS Safari 会把整个视口顶上去，Android 默认
 * interactive-widget=resizes-visual 只缩「视觉视口」、布局视口不动。
 * 靠 dvh 推断键盘高度在两边都会失灵（Android 上 dvh 压根不变）。
 *
 * visualViewport 是两边都有的稳定信号：键盘弹出时视觉视口变矮，而布局视口
 * （window.innerHeight）不动，两者差值就是键盘遮挡的高度。
 *
 * 对外暴露两样东西：
 *   1. <html data-kbd="open|closed"> —— 给 CSS 用，收起底栏 + 收回内容区
 *      为底栏预留的 80px（这条光靠 JS 改 class 会和 Tailwind 的
 *      pb-[calc(80px+...)] 打架，交给 CSS 选择器更稳）
 *   2. useKeyboardOpen() —— 给 React 组件用
 */

/** px。地址栏收缩、下拉回弹最多几十像素；软键盘至少 200px，取中间值。 */
const THRESHOLD = 120;

let open = false;
let bound = false;
const listeners = new Set<(v: boolean) => void>();

/**
 * 「没键盘时能看见多高」的基准 + 当时的窗口宽度。
 *
 * ⚠️ 为什么不能只看 `window.innerHeight - visualViewport.height`（v4.7.3 修）：
 * 那种算法只在「布局视口不变、只有视觉视口变矮」的内核模型下成立
 * （Android 默认的 interactive-widget=resizes-visual）。
 * 而 **iOS Safari 与 resizes-content 模式下，`window.innerHeight` 自己也会变矮** ——
 * 两个数一起减，差值接近 0，于是判不出键盘，底栏就留在原位被键盘顶上去了
 * （用户反馈：手机端在灵感页打字时底栏被顶到键盘上方）。
 * 现在改成统一拿「基准可见高度 − 当前可见高度」判断，两种模型都覆盖。
 */
let baseVisible = 0;
let baseWidth = 0;

/** 当前真正可见的高度：两个信号里取小的那个 */
function visibleHeight(): number {
  const vv = window.visualViewport;
  return vv ? Math.min(vv.height, window.innerHeight) : window.innerHeight;
}

function measure(): boolean {
  const v = visibleHeight();
  // 窗口宽度变了（转屏 / 桌面拖窗口）→ 之前的高度基准作废，重新取
  if (Math.abs(window.innerWidth - baseWidth) > 50) {
    baseWidth = window.innerWidth;
    baseVisible = v;
    return false;
  }
  if (baseVisible === 0) {
    baseVisible = v;
    return false;
  }
  const shrink = baseVisible - v;
  // 没键盘时把基准往上顶（地址栏收起会让可见高度变大），这样地址栏来回伸缩
  // 只有几十像素、不会误判成键盘
  if (shrink <= THRESHOLD) baseVisible = Math.max(baseVisible, v);
  return shrink > THRESHOLD;
}

function emit() {
  const next = measure();
  if (next === open) return;
  open = next;
  document.documentElement.dataset.kbd = next ? 'open' : 'closed';
  listeners.forEach((fn) => fn(next));
}

function bind() {
  if (bound) return;
  bound = true;
  const vv = window.visualViewport;
  // 老内核没有 visualViewport：保持 closed，底栏照常显示（退化成现状，不会坏）
  if (!vv) return;
  vv.addEventListener('resize', emit);
  vv.addEventListener('scroll', emit);
  window.addEventListener('resize', emit);
  window.addEventListener('orientationchange', emit);
  // 先落一个初始值：attribute 缺席时 CSS 视为 closed（行为一样），
  // 但显式写出来便于排查问题（探针/真机上都能直接读）
  document.documentElement.dataset.kbd = open ? 'open' : 'closed';
  emit();
}

/** 当前是否认为软键盘可见（命令式读取，供非 React 场景用） */
export function isKeyboardOpen(): boolean {
  return open;
}

/**
 * 软键盘是否可见。
 *
 * 注意：visualViewport 的 resize 在 iOS 上还有「键盘收起动画」这一串中间态，
 * 这里靠 THRESHOLD 把它们滤掉了；调用方不需要自己做去抖。
 */
export function useKeyboardOpen(): boolean {
  const [v, setV] = useState(open);
  useEffect(() => {
    bind();
    listeners.add(setV);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}
