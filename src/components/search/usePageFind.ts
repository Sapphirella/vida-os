// 页内查找替换 hook：为动态页 / 空间页 / 收藏夹页提供统一的
// 「查找 → 高亮 → 上一个/下一个 → 替换当前 / 全部替换」状态与动作。
// 面板 UI 由 PageFindBar 渲染（fixed 钉在顶栏下方，滚动/跳转不消失）。
import { useEffect, useRef, useState } from 'react';

export const escapeRegPageFind = (s: string) =>
  String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * 把元素滚动到可视区域垂直居中。
 * 不用 scrollIntoView：真机（iOS Safari / 夸克）与部分 Chromium 移动仿真下
 * 它对已部分可见的元素经常不产生滚动（尤其嵌套容器时），且 smooth 动画
 * 在输入合成期间会打断键盘，这里统一改为手算滚动位置，行为可预期。
 */
export function scrollElIntoCenter(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  let parent: HTMLElement | null = el.parentElement;
  let scroller: HTMLElement | null = null;
  while (parent) {
    const cs = getComputedStyle(parent);
    if (
      parent.scrollHeight > parent.clientHeight + 2 &&
      /(auto|scroll|overlay)/.test(cs.overflowY)
    ) {
      scroller = parent;
      break;
    }
    parent = parent.parentElement;
  }
  if (!scroller) {
    const vh = window.innerHeight;
    // 元素中心对齐视口中心：元素在视口中心下方 → 向下滚（scrollY 增大）
    const top = window.scrollY + (r.top + r.height / 2) - vh / 2;
    window.scrollTo({
      top: Math.max(0, Math.min(top, document.documentElement.scrollHeight - vh)),
      behavior: 'smooth',
    });
  } else {
    const pr = scroller.getBoundingClientRect();
    const top =
      scroller.scrollTop + (r.top + r.height / 2) - (pr.top + scroller.clientHeight / 2);
    scroller.scrollTo({
      top: Math.max(0, Math.min(top, scroller.scrollHeight - scroller.clientHeight)),
      behavior: 'smooth',
    });
  }
}

const escText = (s: string) =>
  String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

export interface FindTarget {
  /** 文档 id（也是 mark 的 data-find-target） */
  id: string;
  /** 标题段文本（可为空串，空串不参与匹配） */
  title: string;
  /** 正文段文本 */
  content: string;
  replaceTitle?: (next: string) => void;
  replaceContent: (next: string) => void;
}

export function usePageFind<T extends HTMLElement = HTMLDivElement>(
  targets: FindTarget[],
  opts?: {
    /** 替换动作后的轻量反馈，由页面注入 showToast */
    onToast?: (msg: string, type?: 'success' | 'info') => void;
  },
) {
  const onToast = opts?.onToast;

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [activeHit, setActiveHit] = useState(0);
  const [matchCount, setMatchCount] = useState(0);

  /** 页面内容根容器（用于收集 mark 与滚动定位） */
  const listRef = useRef<T | null>(null);
  const marksRef = useRef<HTMLElement[]>([]);

  // 收集 mark 并刷新计数：query 每次击键都会触发。
  // 刻意不在此滚动页面——真机（尤其 iOS）输入过程中页面被 smooth
  // scrollIntoView 持续滚动会打断输入合成/闪烁键盘，导致「查找框打不进字」。
  useEffect(() => {
    if (!open || !listRef.current) return;
    marksRef.current = Array.from(
      listRef.current.querySelectorAll<HTMLElement>('mark.vd-mark'),
    );
    setMatchCount(marksRef.current.length);
  }, [query, open, targets]);

  // 仅当跳转命中（activeHit 变化）或打开面板时才滚动定位，输入过程中不打扰
  useEffect(() => {
    if (!open) return;
    const marks = marksRef.current;
    marks.forEach((el, i) => el.classList.toggle('vd-mark-active', i === activeHit));
    const el = marks[activeHit];
    if (el) {
      scrollElIntoCenter(el);
    } else if (marks.length > 0) {
      // 当前命中不可见（可能被摘要截断），滚到所属卡片
      const id = marks[Math.min(activeHit, marks.length - 1)].dataset.findTarget;
      if (id) {
        const card = listRef.current?.querySelector<HTMLElement>(
          `[data-find-card="${id}"]`,
        );
        if (card) scrollElIntoCenter(card);
      }
    }
  }, [activeHit, open, targets]);

  const close = () => {
    setOpen(false);
    setQuery('');
    setReplaceWith('');
    setActiveHit(0);
    setMatchCount(0);
    marksRef.current = [];
  };

  const toggleOpen = () => {
    if (open) close();
    else setOpen(true);
  };

  const step = (dir: 1 | -1) => {
    if (matchCount === 0) return;
    setActiveHit((i) => (i + dir + matchCount) % matchCount);
  };

  /** 给 HTML 中的文本外包 mark（用于 MarkdownView 的 htmlTransform） */
  const hl = (html: string, targetId: string): string => {
    const q = query.trim();
    if (!q) return html;
    const re = new RegExp(escapeRegPageFind(q), 'gi');
    return html.replace(/>([^<]*)</g, (_m, text: string) => {
      if (!re.test(text)) return '>' + text + '<';
      re.lastIndex = 0;
      return (
        '>' +
        text.replace(re, (hit) => {
          if (!hit.trim()) return hit; // 空格命中不参与，避免高亮排版字符
          return `<mark class="vd-mark" data-find-target="${targetId}" data-find-part="content">${hit}</mark>`;
        }) +
        '<'
      );
    });
  };

  /** 给纯文本外包 mark（用于列表页的标题 / 摘要渲染），返回可注入的 HTML */
  const hlText = (text: string, targetId: string, part: 'title' | 'content'): string => {
    const q = query.trim();
    const esc = escText(text);
    if (!q) return esc;
    const re = new RegExp(escapeRegPageFind(q), 'gi');
    return esc.replace(re, (hit) => {
      if (!hit.trim()) return hit;
      return `<mark class="vd-mark" data-find-target="${targetId}" data-find-part="${part}">${hit}</mark>`;
    });
  };

  /** 供列表项使用：让整卡在有需求时可显式滚入视野 */
  const findCardProps = (id: string) => ({ 'data-find-card': id });

  /** 替换当前命中（第 activeHit 个可见 mark） */
  const replaceCurrent = () => {
    const q = query.trim();
    if (!q) return;
    const el = marksRef.current[activeHit];
    if (!el) return;
    const targetId = el.dataset.findTarget;
    const part = el.dataset.findPart || 'content';
    const t = targets.find((x) => x.id === targetId);
    if (!t) return;
    const partText = part === 'title' ? t.title : t.content;
    if (!partText) return;
    const partIndex = marksRef.current.filter(
      (m, i) => i < activeHit && m.dataset.findTarget === targetId && (m.dataset.findPart || 'content') === part,
    ).length;
    const re = new RegExp(escapeRegPageFind(q), 'gi');
    let i = -1;
    const next = partText.replace(re, (hit) => {
      i += 1;
      return i === partIndex ? replaceWith : hit;
    });
    if (part === 'title') t.replaceTitle?.(next);
    else t.replaceContent(next);
    setActiveHit((x) => Math.max(0, x)); // 触发收集刷新
    onToast?.('已替换 1 处', 'success');
  };

  /** 全部替换：对每个 target 的 title / content 段全文替换 word，返回替换处数 */
  const replaceAll = () => {
    const q = query.trim();
    if (!q) return 0;
    const re = new RegExp(escapeRegPageFind(q), 'gi');
    let n = 0;
    targets.forEach((t) => {
      if (t.title) {
        re.lastIndex = 0;
        const hit = (t.title.match(re) || []).length;
        if (hit > 0) {
          re.lastIndex = 0;
          t.replaceTitle?.(t.title.replace(re, () => replaceWith));
          n += hit;
        }
      }
      re.lastIndex = 0;
      if (!t.content) return;
      const hit = (t.content.match(re) || []).length;
      if (hit > 0) {
        re.lastIndex = 0;
        t.replaceContent(t.content.replace(re, () => replaceWith));
        n += hit;
      }
    });
    setActiveHit(0);
    if (n > 0) onToast?.(`已替换 ${n} 处`, 'success');
    return n;
  };

  return {
    open,
    toggleOpen,
    close,
    query,
    setQuery,
    replaceWith,
    setReplaceWith,
    activeHit,
    setActiveHit,
    matchCount,
    step,
    hl,
    hlText,
    replaceCurrent,
    replaceAll,
    listRef,
    findCardProps,
  };
}