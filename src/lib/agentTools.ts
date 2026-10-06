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
import { errMsg, todayKey } from '@/lib/utils';
import { AGENT_BOOK_ID, bookCharCount, markPreview, parseBook, remapMarks } from '@/lib/library';

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
   * 这次替换会动书正文，标注锚点可能失效。确认卡片据此预告结果。
   * `marksKept` / `marksDropped` 是**确认前就预测出来的**数字（用同一套重锚定逻辑
   * 先跑一遍），让用户在看到「会丢掉几条」之后再决定，而不是事后才被告知。
   */
  dropsMarks?: boolean;
  marksKept?: number;
  marksDropped?: number;
  /** 会被丢掉的那几条原文（最多 3 条），写进结果消息里，用户能照着重新划 */
  droppedTexts?: string[];
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
/**
 * Agent 给的日程日期可能是空、也可能是「明天」这类自由文本。
 * 只接受能解析成 YYYY-MM-DD 的输入，否则回落到今天 —— 宁可日子不对，也别出现 NaN月NaN日。
 */
function normalizeScheduleDate(raw?: string): string {
  const t = (raw ?? '').trim();
  const m = /^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/.exec(t);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (!Number.isNaN(d.getTime())) return todayKey(d);
  }
  return todayKey();
}

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
        // v4.7.11：date 之前直接取 extra 的原文（可能为空或「明天」这种自由文本）——
        // 空串会让这条日程落进「过去」分组、并显示成 NaN月NaN日。
        // 这里只接受能解析的日期，否则落到今天；顺便去掉越权传进来的 done
        // （addSchedule 的签名不允许 done，之前用 as never 绕过了类型检查）。
        st.addSchedule({
          title: text,
          date: normalizeScheduleDate(extra),
          note: '',
          time: '',
          category: '生活',
        });
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
        // 书正文被改写会让锚点（块索引 + 块内偏移）可能失效 → 确认卡片会带上
        // 「能保住几条 / 会丢几条」的预测（见下面 proposeReplace 里的 remapMarks 预演）
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
  // 改书正文时，先按同一套重锚定逻辑预演一遍：能保住几条、会丢几条。
  // 只预测、不落盘 —— 用户在卡片上看到数字后才决定要不要改。
  if (first.target === 'book') {
    const book = st.books.find((b) => b.id === first.targetId);
    if (book) {
      const { marks: kept, dropped } = remapMarks(book.marks, parseBook(first.next, book.format));
      first.marksKept = kept.length;
      first.marksDropped = dropped.length;
      first.droppedTexts = dropped.slice(0, 3).map((m) => markPreview(m.text, 16));
    }
  }
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
    let marksKept = 0;
    let marksDropped: string[] = [];
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
        // 正文一变，锚点（块索引 + 块内偏移）就可能失效。逐条重新锚定：
        // 对得上原文的保留，对不上的才丢掉并如实报出来 —— 不再一见改动就清空全书划线。
        const { marks, dropped } = remapMarks(book?.marks ?? [], parseBook(p.next, book?.format ?? 'txt'));
        marksKept = marks.length;
        marksDropped = dropped.map((m) => markPreview(m.text, 16));
        if (book && marks.length !== book.marks.length) {
          st.updateBook(p.targetId, { marks });
        }
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
        (p.target === 'book'
          ? marksKept + marksDropped.length > 0
            ? `。书里 ${marksKept} 处标注仍然对得上、已保留` +
              (marksDropped.length
                ? `；${marksDropped.length} 处因为原文被这次改动改掉了、无法定位，已移除：${marksDropped
                    .map((t) => `「${t}」`)
                    .join('、')}${marksDropped.length > 3 ? ' 等' : ''}（可按上面的原文重新划）`
                : '')
            : ''
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
