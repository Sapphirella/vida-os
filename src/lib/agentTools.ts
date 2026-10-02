// Agent 写入工具执行层（v4.5.4）
//
// 与 agentEngine 的分工：
//   agentEngine  —— 只负责「模型输出什么标记、标记是什么意思」
//   agentTools    —— 只负责「拿到标记后真的去改数据」
//
// 三条硬约束（用户明确要求）：
//   1. 写入类操作一律走 add*，不提供任何 delete* / 移除入口
//      —— Agent 永远不能删除用户内容，代码层面就没有删除路径
//   2. 查找替换必须先产出「待确认变更清单」，由用户确认后才落盘
//   3. 所有变更都会回一条 sys 消息，让用户看见 Agent 到底动了什么
import { useAppStore } from '@/stores/useAppStore';
import { errMsg } from '@/lib/utils';
import { AGENT_BOOK_ID, bookCharCount } from '@/lib/library';

/** 单条写入结果 */
export interface ToolResult {
  ok: boolean;
  /** 写给用户的说明，会进 sys 消息 */
  message: string;
}

/** 查找替换：待确认的变更 */
export interface PendingReplace {
  id: string;
  /** 命中的条目类型 */
  target: 'article' | 'inspiration' | 'todo' | 'schedule' | 'moment' | 'book';
  targetId: string;
  targetTitle: string;
  field: string;
  from: string;
  to: string;
  /** 命中次数 */
  count: number;
  /** 改写后的完整正文（确认后直接写入） */
  next: string;
  /**
   * 这次替换会动正文，块索引整体位移 → 本书已有的划线锚点会指错段落。
   * 确认卡片据此预告「标注会被清空」，不装作什么都没发生。
   * （只有写书工具的「书末追加」不会触发它：已有块索引不变。）
   */
  dropsMarks?: boolean;
}

let pendingSeq = 0;
/** 待确认的替换清单。刻意放在模块内、不进 store —— 它是"草稿态"，
 *  刷新页面即失效，避免用户几天后误确认一份陈旧改动。 */
const pending = new Map<string, PendingReplace>();

/* ============================================================
 *  写入工具
 * ============================================================ */

type WriteTarget = '灵感' | '待办' | '日程' | '动态' | '文章' | '书';

/**
 * 章节标题去重
 *
 * 同名时**不覆盖、不报错**，自动加「 · 2」「 · 3」后缀再新建一条。
 * 理由见 writeBookChapter 的注释：章节正文是就地拼接的，覆盖会抹掉旧内容，
 * 而 Agent 没有删除能力 —— 宁可多一条目录，也不能让它静默弄丢用户已有的章节。
 */
function uniqueChapterTitle(taken: string[], wanted: string): string {
  if (!taken.includes(wanted)) return wanted;
  for (let n = 2; n < 200; n++) {
    const t = `${wanted} · ${n}`;
    if (!taken.includes(t)) return t;
  }
  return `${wanted} · ${Date.now()}`;
}

/**
 * 往《Agent》专属书的**书末**追加一个新章节。
 *
 * ⚠️ 为什么坚持「追加到书末」而不是「插到指定章节中间」：
 *    划线锚点是「块索引」（lib/library.ts），块索引由「正文的切块顺序」决定。
 *    在文末追加不会改变任何已有块的索引，因此**书里已有的划线一条都不会错位**；
 *    而就地插入 / 替换正文必然让后面的块整体位移，标注会悄悄指向错误的段落。
 *    这个取舍是刻意的：保住用户的划线，比让章节插在中间更重要。
 */
function writeBookChapter(title: string, body: string): ToolResult {
  const st = useAppStore.getState();
  const book = st.books.find((b) => b.id === AGENT_BOOK_ID);
  if (!book) {
    return { ok: false, message: '写入失败：书架上找不到《Agent》这本书（它可能被重置过，刷新页面即可补回）' };
  }
  const finalTitle = uniqueChapterTitle((book.chapters ?? []).map((c) => c.title), title);
  const chunk = `\n\n## ${finalTitle}\n\n${body}\n`;
  st.setBookContent(book.id, book.content.replace(/\s+$/, '') + chunk);
  return {
    ok: true,
    message: `已在《${book.title}》书末新建章节「${finalTitle}」（${bookCharCount(body)} 字），去书架打开就能读到`,
  };
}

/** 写入一条内容到指定模块 */
export function writeContent(target: WriteTarget, body: string, extra?: string): ToolResult {
  const text = body.trim();
  if (!text) return { ok: false, message: '写入失败：内容为空' };
  const st = useAppStore.getState();
  try {
    switch (target) {
      case '书':
        return writeBookChapter(extra?.trim() || text.slice(0, 24), text);
      case '灵感':
        st.addInspiration(text, extra?.trim() || '随想');
        return { ok: true, message: `已写入灵感「${text.slice(0, 20)}${text.length > 20 ? '…' : ''}」` };
      case '待办':
        st.addTodo(text, extra?.trim() || '生活');
        return { ok: true, message: `已加入待办「${text.slice(0, 20)}${text.length > 20 ? '…' : ''}」` };
      case '日程':
        st.addSchedule({
          title: text,
          date: extra?.trim() || '',
          category: '生活',
          done: false,
        } as never);
        return { ok: true, message: `已加入日程「${text.slice(0, 20)}${text.length > 20 ? '…' : ''}」` };
      case '动态':
        st.addMoment({ content: text } as never);
        return { ok: true, message: `已发布动态「${text.slice(0, 20)}${text.length > 20 ? '…' : ''}」` };
      case '文章': {
        const id = st.addArticle({ title: extra?.trim() || text.slice(0, 24), content: text, tags: [] } as never);
        void id;
        return { ok: true, message: `已创建文章「${extra?.trim() || text.slice(0, 24)}」` };
      }
      default:
        return { ok: false, message: `写入失败：不认识的模块「${target}」` };
    }
  } catch (e) {
    return { ok: false, message: `写入失败：${errMsg(e)}` };
  }
}

/* ============================================================
 *  查找替换
 * ============================================================ */

/** 在指定模块里找 from，产出变更清单（不落盘，等用户确认） */
export function proposeReplace(
  target: WriteTarget | '馆藏',
  from: string,
  to: string,
): { result: ToolResult; pending?: PendingReplace } {
  const f = from.trim();
  const t = to.trim();
  if (!f) return { result: { ok: false, message: '查找替换失败：查找内容为空' } };
  if (!t) return { result: { ok: false, message: '查找替换失败：替换为的内容为空' } };
  if (f === t) return { result: { ok: false, message: '查找替换失败：查找与替换内容相同' } };

  const st = useAppStore.getState();
  const hits: PendingReplace[] = [];

  const scan = (
    list: { get: () => { id: string; title: string; content: string } }[],
    targetKind: PendingReplace['target'],
    field: string,
    /** 命中后额外标记（如「这次会清空划线」） */
    flag?: (v: { marks?: unknown[] }) => boolean,
  ) => {
    for (const item of list) {
      const v = item.get();
      if (!v.content.includes(f)) continue;
      const count = v.content.split(f).length - 1;
      hits.push({
        id: `rp_${++pendingSeq}`,
        target: targetKind,
        targetId: v.id,
        targetTitle: v.title || '（无标题）',
        field,
        from: f,
        to: t,
        count,
        next: v.content.split(f).join(t),
        ...(flag?.(v as { marks?: unknown[] }) ? { dropsMarks: true } : {}),
      });
    }
  };

  try {
    if (target === '文章') {
      scan(st.articles.map((a) => ({ get: () => a })), 'article', 'content');
    } else if (target === '灵感') {
      scan(st.notes.inspiration.map((n) => ({ get: () => ({ ...n, title: n.category }) })), 'inspiration', 'content');
    } else if (target === '待办') {
      scan(st.notes.todo.map((n) => ({ get: () => ({ ...n, title: n.category }) })), 'todo', 'content');
    } else if (target === '日程') {
      // 日程正文在 note 上，标题在 title 上；这里只扫 note
      scan(st.notes.schedule.map((n) => ({ get: () => ({ ...n, title: n.title, content: n.note ?? '' }) })), 'schedule', 'note');
    } else if (target === '动态') {
      scan(st.moments.map((m) => ({ get: () => ({ ...m, title: '动态' }) })), 'moment', 'content');
    } else if (target === '馆藏') {
      scan(
        st.books.map((b) => ({ get: () => b })),
        'book',
        'content',
        // 书正文被改写会让块索引位移，划线锚点会指错段落 → 明确预告会清空标注
        (v) => (v.marks?.length ?? 0) > 0,
      );
    } else {
      return { result: { ok: false, message: `查找替换失败：不认识的模块「${target}」` } };
    }
  } catch (e) {
    return { result: { ok: false, message: `查找替换失败：${errMsg(e)}` } };
  }

  if (hits.length === 0) {
    return { result: { ok: true, message: `查找替换：在「${target}」里没有找到「${f}」，未做任何改动` } };
  }

  // 只保留第一处作为待确认项（一次改一处，够安全也够清楚）
  const first = hits[0];
  pending.set(first.id, first);
  const total = hits.reduce((n, h) => n + h.count, 0);
  return {
    result: {
      ok: true,
      message: `查找替换：在「${first.targetTitle}」找到 ${first.count} 处「${f}」，共扫描到 ${total} 处。等待你确认后再改。`,
    },
    pending: first,
  };
}

/** 用户确认后真正落盘 */
export function applyReplace(id: string): ToolResult {
  const p = pending.get(id);
  if (!p) return { ok: false, message: '该替换已失效（页面可能刷新过），请让 Agent 重新发起' };
  pending.delete(id);
  const st = useAppStore.getState();
  try {
    let clearedMarks = 0;
    switch (p.target) {
      case 'article':
        st.updateArticle(p.targetId, { content: p.next });
        break;
      case 'inspiration':
        st.updateInspiration(p.targetId, { content: p.next });
        break;
      case 'todo':
        st.updateTodo(p.targetId, { content: p.next });
        break;
      case 'schedule':
        st.updateSchedule(p.targetId, { note: p.next });
        break;
      case 'moment':
        st.updateMoment(p.targetId, { content: p.next });
        break;
      case 'book': {
        const book = st.books.find((b) => b.id === p.targetId);
        clearedMarks = book?.marks.length ?? 0;
        // 正文一变，块索引就整体位移，旧的划线锚点会指到别的段落上去。
        // 与其留一批悄悄指错的标注，不如清掉并如实告诉用户 —— 书签里存的原文还在，
        // 需要的话可以重新划。
        if (clearedMarks > 0) st.updateBook(p.targetId, { marks: [] });
        st.setBookContent(p.targetId, p.next);
        break;
      }
      default:
        return { ok: false, message: '替换失败：不认识的条目类型' };
    }
    return {
      ok: true,
      message:
        `已在「${p.targetTitle}」替换 ${p.count} 处` +
        (clearedMarks > 0
          ? `。正文改动会让原有 ${clearedMarks} 处划线错位，已一并清空（书签里存的原文还在，可以重新划）`
          : ''),
    };
  } catch (e) {
    return { ok: false, message: `替换失败：${errMsg(e)}` };
  }
}

/** 取消一条待确认替换（只是不执行，不是删除数据） */
export function cancelReplace(id: string): void {
  pending.delete(id);
}

/** 供 UI 读取待确认项 */
export function getPendingReplace(id: string): PendingReplace | undefined {
  return pending.get(id);
}
