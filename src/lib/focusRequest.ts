// 全局查找「跳转到命中处」：目标页挂载后按 query 在正文 DOM 中定位第 N 个命中
// 并做短暂高亮（闪烁 3 次后自动还原文本结构），避免破坏 React 的 innerHTML 渲染。
import { useEffect, useRef } from 'react';
import { useUIStore } from '@/stores/useUIStore';

export function escapeReg(s: string): string {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 在 root 内找到第 index 个（0-based）query 命中，把命中片段包成
 * <mark class="vd-mark vd-focus-flash"> 并滚动到视野，3s 后还原为纯文本节点。
 * 找不到时返回 false。
 */
export function focusNthQuery(
  root: HTMLElement,
  query: string,
  index: number,
  ignoreCase: boolean,
): boolean {
  const q = query.trim();
  if (!q) return false;
  const re = new RegExp(escapeReg(q), ignoreCase ? 'gi' : 'g');
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let seen = 0;
  let textNode: Text | null = null;
  let offset = -1;
  let matchLen = 0;

  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (node.nodeType !== Node.TEXT_NODE) continue;
    const t = node.nodeValue ?? '';
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(t)) !== null) {
      if (seen === index) {
        textNode = node as Text;
        offset = m.index;
        matchLen = m[0].length || q.length;
        break;
      }
      seen++;
      if (m[0].length === 0) re.lastIndex++;
    }
    if (textNode) break;
  }
  if (!textNode || offset < 0) return false;

  // 切出命中片段：textNode → [前文] [命中] [后文]
  const after = textNode.splitText(offset); // after 从命中开始
  const remainder = offset + matchLen;
  const hitPart =
    remainder < after.nodeValue!.length
      ? after.splitText(matchLen) // hitPart = 命中之后的文本
      : null;
  const hitText = after.nodeValue ?? '';

  const mark = document.createElement('mark');
  mark.className = 'vd-mark vd-focus-flash';
  mark.textContent = hitText;
  const parent = after.parentNode;
  if (!parent) return false;
  parent.replaceChild(mark, after);

  mark.scrollIntoView({ block: 'center', behavior: 'smooth' });

  // 3s 后还原为文本节点，避免残留 mark 干扰后续操作
  setTimeout(() => {
    const p = mark.parentNode;
    if (!p) return;
    const tn = document.createTextNode(mark.textContent ?? '');
    p.replaceChild(tn, mark);
    if (hitPart) {
      p.normalize?.();
    }
  }, 3000);
  return true;
}

type FocusKind = 'article' | 'moment' | 'letter';

/** 目标页全局聚焦 hook：匹配 kind+id 的 focusRequest 时，把命中处滚入视野并高亮 */
export function useGlobalFocus(
  kind: FocusKind,
  id: string | undefined,
  getRoot: () => HTMLElement | null,
  getTitleEl?: () => HTMLElement | null,
) {
  const focusRequest = useUIStore((s) => s.focusRequest);
  const setFocusRequest = useUIStore((s) => s.setFocusRequest);

  // 闭包用 ref 固定，避免每次渲染都重建 effect
  const getRootRef = useRef(getRoot);
  const getTitleRef = useRef(getTitleEl);
  getRootRef.current = getRoot;
  getTitleRef.current = getTitleEl;

  useEffect(() => {
    const fr = focusRequest;
    if (!fr || fr.kind !== kind) return;
    if (id !== undefined && fr.id !== id) return;
    const raf = requestAnimationFrame(() => {
      if (fr.inTitle) {
        const titleEl = getTitleRef.current?.();
        if (titleEl) {
          titleEl.scrollIntoView({ block: 'start', behavior: 'smooth' });
          titleEl.classList.add('vd-focus-title');
          setTimeout(() => titleEl.classList.remove('vd-focus-title'), 3000);
        }
      } else {
        const root = getRootRef.current?.();
        if (root) focusNthQuery(root, fr.query, fr.index, fr.ignoreCase);
      }
      // 处理完就清除，避免之后跳转到其他文档时误触发旧请求
      setFocusRequest(null);
    });
    return () => cancelAnimationFrame(raf);
  }, [focusRequest, kind, id, setFocusRequest]);
}