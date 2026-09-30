// Agent 对话引擎：OpenAI 兼容接口流式对话 + 演示模式 + 资料库/馆藏/记忆馆按需读取
// 移植自「参考文件ventana」的 app.js 核心约定：
// - 三项配置（Base URL + API Key + 模型名）齐全才走真实 API，否则演示模式
// - 资料库索引随请求下发，正文用 [[读:文档名]] 按需读取（>6000 字按相关性截取）
// - 记忆馆用 [[忆:标题]] 读、[[记:标题]]正文 写
// - 所有数据只存在本机 IndexedDB，调用外部 API 时仅发送必要上下文
// v4.4：碎片流已整体移除，它的生态位由「馆藏」接手（索引列书名，[[读:书名]] 读正文）
import type {
  AgentMessage,
  AgentConfig,
  AgentDoc,
  AgentMemory,
  LibraryBook,
  Article,
  Moment,
  InspirationNote,
  Favorite,
  Album,
  AlbumGroup,
  ScheduleNote,
  TodoNote,
} from '@/types';
import { formatDate } from '@/lib/utils';

export const MAX_TOOL_ROUNDS = 3;
export const DOC_SNIPPET_LIMIT = 6000;
export const DOC_MAX_BYTES = 400 * 1024;

/** 默认人格：空人格时兜底，让 Agent 知道它能读馆藏/资料库 */
export const DEFAULT_PERSONA =
  '你是 VidaOS 的 Agent，一个住在用户本地生活库里的助手。你能读取用户的馆藏书籍、相册、资料库文档、记忆馆，' +
  '也能读取空间文章、动态、灵感、日程、待办与收藏夹，帮助整理成结构化文章，也擅长聊生活、学习与身边的事。' +
  '保持自然、亲切、简洁；需要资料时按约定读取，不要编造用户记录中不存在的内容。回复使用简体中文，段落之间空一行。';

export const GREETING =
  '你好，我是 **VidaOS Agent**。\n\n我可以读取你的空间文章、动态、灵感、便签、馆藏与收藏夹，帮你归纳整理、生成空间文章，也能像朋友一样聊生活、学习和身边的事。' +
  '需要读哪块内容，说 `[[读:模块名]]` 即可（如 `[[读:文章]]`、`[[读:动态]]`）；一切只保存在本机。';

export interface AgentContext {
  config: AgentConfig;
  docs: AgentDoc[];
  memories: AgentMemory[];
  books: LibraryBook[];
  articles: Article[];
  moments: Moment[];
  inspiration: InspirationNote[];
  schedule: ScheduleNote[];
  todo: TodoNote[];
  favorites: Favorite[];
  albums: Album[];
  albumGroups: AlbumGroup[];
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function hasApiConfig(cfg: AgentConfig): boolean {
  return !!(cfg.baseUrl.trim() && cfg.apiKey.trim() && cfg.model.trim());
}

/** 规范化聊天补全端点：已含 /chat/completions 原样用；以 /v1 结尾补 /chat/completions；否则补 /v1/chat/completions */
export function chatEndpoint(baseUrl: string): string {
  const u = baseUrl.trim().replace(/\/+$/, '');
  if (!u) return '';
  if (/\/chat\/completions$/i.test(u)) return u;
  if (/\/v\d+$/i.test(u)) return `${u}/chat/completions`;
  return `${u}/v1/chat/completions`;
}

function plainHead(s: string, n: number): string {
  return s.replace(/\s+/g, ' ').slice(0, n);
}

/** 馆藏书架索引：书名 + 字数 + 读到哪（正文用 [[读:书名]] 按需读取） */
export function booksIndexText(books: LibraryBook[]): string {
  if (!books.length) return '';
  return books
    .map((b) => {
      const marks = b.marks?.length ? ` 划线/高亮 ${b.marks.length} 处` : '';
      return `《${b.title}》 ${b.charCount} 字${marks}`;
    })
    .join('\n');
}

/** 资料库索引（含内置「馆藏」虚拟文档），随每次请求下发 */
export function docsIndexText(ctx: AgentContext): string {
  const lines: string[] = [];
  for (const d of ctx.docs) lines.push(`- ${d.name}：${plainHead(d.content, 60)}`);
  const bookText = booksIndexText(ctx.books ?? []);
  if (bookText) {
    lines.push(`- 馆藏：${plainHead(bookText, 60)}（我的书架，用 [[读:书名]] 读取某本书正文）`);
  }
  return lines.join('\n');
}

/** 生活内容索引：空间文章 / 动态 / 灵感 / 日程 / 待办 / 收藏夹 / 相册（随请求下发） */
export function lifeIndexText(ctx: AgentContext): string {
  const lines: string[] = [];
  const { articles, moments, inspiration, schedule, todo, favorites, albums, albumGroups } = ctx;
  if (articles.length) {
    const list = articles
      .slice(0, 40)
      .map((a) => `- 《${a.title}》${a.tags?.length ? `（标签：${a.tags.join('、')}）` : ''}`)
      .join('\n');
    lines.push(
      `- 空间文章 ${articles.length} 篇（用 [[读:文章·标题]] 读取某篇正文）：\n${list}${
        articles.length > 40 ? `\n…另有 ${articles.length - 40} 篇未列出` : ''
      }`,
    );
  }
  if (moments.length) {
    const recent = [...moments]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 5)
      .map((m) => `- [${formatDate(m.createdAt, 'MM-DD HH:mm')}] ${plainHead(m.content, 40)}${m.imageIds?.length ? '（含图）' : ''}`)
      .join('\n');
    lines.push(`- 动态 ${moments.length} 条（用 [[读:动态]] 查看完整列表）：\n${recent}`);
  }
  if (inspiration.length) {
    const recent = [...inspiration]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 5)
      .map((n) => `- [${n.category || '未分类'}] ${plainHead(n.content, 40)}${n.starred ? '（星标）' : ''}`)
      .join('\n');
    lines.push(`- 灵感 ${inspiration.length} 条（用 [[读:灵感]] 查看完整列表）：\n${recent}`);
  }
  if (schedule.length || todo.length) {
    lines.push(`- 便签：日程 ${schedule.length} 条 / 待办 ${todo.length} 条（用 [[读:日程]] 或 [[读:待办]] 查看）`);
  }
  if (favorites.length) {
    lines.push(`- 收藏夹 ${favorites.length} 条（用 [[读:收藏夹]] 查看）`);
  }
  if (albums.length) {
    lines.push(
      `- 相册 ${albums.length} 个图集${albumGroups.length ? `、共 ${albumGroups.length} 组照片` : ''}（用 [[读:相册]] 查看）`,
    );
  }
  return lines.join('\n');
}

/**
 * 按模块名读取（文章 / 动态 / 灵感 / 便签 / 日程 / 待办 / 收藏夹 / 相册 / 星标集）。
 * 返回结构化文本，超长由调用方按相关性截取。
 */
function resolveModule(bare: string, ctx: AgentContext): { name: string; content: string } | null {
  const { articles, moments, inspiration, schedule, todo, favorites, albums, albumGroups } = ctx;
  const fmt = (ts: number) => formatDate(ts, 'MM-DD HH:mm');

  const head = (s: string, n: number) => s.replace(/\s+/g, ' ').slice(0, n);

  if (bare === '文章' || bare === '空间文章') {
    if (!articles.length) return { name: '空间文章', content: '空间文章为空。' };
    const list = [...articles]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((a) => `- 《${a.title}》｜${a.content?.length ?? 0} 字｜更新于 ${fmt(a.updatedAt)}${a.tags?.length ? `｜标签：${a.tags.join('、')}` : ''}`)
      .join('\n');
    return { name: `空间文章（${articles.length} 篇）`, content: list };
  }
  if (bare === '动态') {
    if (!moments.length) return { name: '动态', content: '动态为空。' };
    const list = [...moments]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 30)
      .map((m) => `- [${fmt(m.createdAt)}] ${head(m.content, 80)}${m.imageIds?.length ? `（图 ${m.imageIds.length} 张）` : ''}`)
      .join('\n');
    return { name: `动态（共 ${moments.length} 条，展示最近 30 条）`, content: list };
  }
  if (bare === '灵感') {
    if (!inspiration.length) return { name: '灵感', content: '灵感为空。' };
    const list = [...inspiration]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30)
      .map((n) => `- [${n.category || '未分类'}] ${head(n.content, 80)}${n.starred ? '（星标）' : ''}${n.convertedArticleId ? '（已转文章）' : ''}｜${fmt(n.updatedAt)}`)
      .join('\n');
    return { name: `灵感（共 ${inspiration.length} 条，展示最近 30 条）`, content: list };
  }
  if (bare === '便签') {
    const parts: string[] = [`灵感 ${inspiration.length} 条｜日程 ${schedule.length} 条｜待办 ${todo.length} 条`];
    if (inspiration.length)
      parts.push(
        `\n【灵感】\n${[...inspiration]
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .slice(0, 20)
          .map((n) => `- [${n.category || '未分类'}] ${head(n.content, 60)}`)
          .join('\n')}`,
      );
    if (schedule.length)
      parts.push(
        `\n【日程】\n${[...schedule]
          .sort((a, b) => (a.date < b.date ? -1 : 1))
          .slice(0, 20)
          .map((s) => `- ${s.date}${s.time ? ` ${s.time}` : ''} ${s.title}${s.done ? '（已完成）' : ''}`)
          .join('\n')}`,
      );
    if (todo.length)
      parts.push(
        `\n【待办】\n${[...todo]
          .sort((a, b) => Number(a.done) - Number(b.done))
          .slice(0, 20)
          .map((t) => `- ${t.done ? '[x]' : '[ ]'} ${head(t.content, 60)}${t.category ? `（${t.category}）` : ''}`)
          .join('\n')}`,
      );
    return { name: '便签', content: parts.join('\n') };
  }
  if (bare === '日程') {
    const list = [...schedule]
      .sort((a, b) => (a.date < b.date ? -1 : 1))
      .map((s) => `- ${s.date}${s.time ? ` ${s.time}` : ''} ${s.title}${s.done ? '（已完成）' : ''}${s.category ? `（${s.category}）` : ''}`)
      .join('\n');
    return { name: `日程（${schedule.length} 条）`, content: list || '暂无日程。' };
  }
  if (bare === '待办') {
    const list = [...todo]
      .sort((a, b) => Number(a.done) - Number(b.done))
      .map((t) => `- ${t.done ? '[x]' : '[ ]'} ${head(t.content, 80)}${t.category ? `（${t.category}）` : ''}`)
      .join('\n');
    return { name: `待办（${todo.length} 条）`, content: list || '暂无待办。' };
  }
  if (bare === '收藏夹') {
    if (!favorites.length) return { name: '收藏夹', content: '收藏夹为空。' };
    const refText = (f: Favorite): string => {
      if (f.refType === 'article') {
        const a = articles.find((x) => x.id === f.refId);
        return a ? `文章《${a.title}》` : '文章（已删除）';
      }
      const m = moments.find((x) => x.id === f.refId);
      return m ? `动态：${head(m.content, 50)}` : '动态（已删除）';
    };
    const list = [...favorites]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((f) => `- [${fmt(f.createdAt)}] ${refText(f)}`)
      .join('\n');
    return { name: `收藏夹（${favorites.length} 条）`, content: list };
  }
  if (bare === '相册') {
    if (!albums.length) return { name: '相册', content: '相册为空。' };
    const list = albums.map((a) => {
      const n = albumGroups.filter((g) => g.albumId === a.id).length;
      return `- ${a.starred ? '【星标集】' : '图集'}《${a.name}》：${n} 组照片`;
    });
    return { name: `相册（${albums.length} 个图集）`, content: list.join('\n') };
  }
  if (bare === '星标集') {
    const starred = albums.find((a) => a.starred);
    if (!starred) return { name: '星标集', content: '星标集为空。' };
    const n = albumGroups.filter((g) => g.albumId === starred.id).length;
    return { name: '星标集', content: `星标集《${starred.name}》：${n} 组照片。这里收藏了来自文章、动态、灵感与相册的图片，并带有来源双链。` };
  }
  return null;
}

/** 构造发给模型的 messages：system = 人格 + 可读内容索引 + 使用约定 + 对话历史 */
export function buildMessages(persona: string, history: ChatMessage[], ctx: AgentContext): ChatMessage[] {
  const parts: string[] = [];
  const p = persona.trim() || DEFAULT_PERSONA;
  parts.push(p);
  const docIdx = docsIndexText(ctx).trim();
  const lifeIdx = lifeIndexText(ctx).trim();
  const idx = [docIdx, lifeIdx].filter(Boolean).join('\n');
  if (idx) parts.push(`【可读内容索引】\n${idx}`);
  parts.push(
    '【使用约定】需要资料/书籍/内容详细资料时，在回复中直接输出 [[读:名称]]：' +
      '可以是资料库文档名、《书名》、文章标题（[[读:文章·标题]]）或模块名（文章 / 动态 / 灵感 / 便签 / 日程 / 待办 / 收藏夹 / 相册 / 馆藏）；' +
      '需要读取记忆正文用 [[忆:标题]]；需要长期记住一条信息用 [[记:标题]]正文。' +
      '工具标记单独成行输出即可，不要解释。',
  );
  const msgs: ChatMessage[] = [{ role: 'system', content: parts.join('\n\n') }, ...history];
  return msgs;
}

/** 按需读取：模块 / 文章·标题 → 馆藏书籍 → 资料库文档；先精确匹配，再包含匹配 */
export function resolveDoc(name: string, ctx: AgentContext): { name: string; content: string } | null {
  const n = name.trim();
  if (!n) return null;
  // 1) 文章正文：[[读:文章·标题]]
  if (n.startsWith('文章·')) {
    const bare = n.slice(3).trim();
    const a =
      ctx.articles.find((x) => x.title === bare) ??
      ctx.articles.find((x) => x.title.includes(bare)) ??
      ctx.articles.find((x) => bare.includes(x.title));
    if (a) {
      const meta = `标题：${a.title}\n标签：${a.tags?.join('、') || '无'}\n创建：${formatDate(a.createdAt, 'YYYY-MM-DD')}｜更新：${formatDate(a.updatedAt, 'YYYY-MM-DD')}\n\n`;
      return { name: `文章《${a.title}》`, content: meta + a.content };
    }
    return null;
  }
  // 2) 模块名读取（文章 / 动态 / 灵感 / 便签 / 日程 / 待办 / 收藏夹 / 相册 / 星标集）
  const mod = resolveModule(n, ctx);
  if (mod) return mod;
  // 3) 书名（允许《书名》或直接书名；「馆藏」= 书架索引）
  const bare = n.replace(/^《|》$/g, '').trim();
  const books = ctx.books ?? [];
  const book =
    books.find((b) => b.title === bare) ??
    books.find((b) => b.title.includes(bare)) ??
    books.find((b) => bare.includes(b.title));
  if (book) return { name: `《${book.title}》`, content: book.content };
  // 「馆藏」是书架索引（不是某一本书）
  if (bare === '馆藏') {
    const text = booksIndexText(books);
    if (!text) return null;
    return { name: '馆藏', content: text };
  }
  const exact = ctx.docs.find((d) => d.name === n);
  if (exact) return { name: exact.name, content: exact.content };
  const fuzzy = ctx.docs.find((d) => d.name.toLowerCase().includes(n.toLowerCase()));
  if (fuzzy) return { name: fuzzy.name, content: fuzzy.content };
  return null;
}

/** 按需读取记忆 */
export function resolveMemory(title: string, ctx: AgentContext): { title: string; content: string } | null {
  const t = title.trim();
  if (!t) return null;
  const m = ctx.memories.find((x) => x.title === t) ?? ctx.memories.find((x) => x.title.includes(t));
  return m ? { title: m.title, content: m.content } : null;
}

/** 从正文提取查询词：中文按 2~4 字连续片段切分（提升长文档相关性截取命中率），ASCII 整词；最多 12 个，去重 */
function extractTerms(query: string): string[] {
  const terms: string[] = [];
  const seen = new Set<string>();
  const add = (t: string) => {
    const s = t.trim();
    if (s.length >= 2 && !seen.has(s)) {
      seen.add(s);
      terms.push(s);
    }
  };
  for (const part of query.split(/[\s，。！？、,.!?;；:：""''()（）【】\[\]]+/)) {
    const s = part.trim();
    if (!s) continue;
    if (/[\u4e00-\u9fff]/.test(s)) {
      for (let n = 4; n >= 2; n--) {
        for (let i = 0; i + n <= s.length; i++) add(s.slice(i, i + n));
      }
    } else {
      add(s);
    }
  }
  return terms.slice(0, 12);
}

/** 长文按相关性截取：>6000 字时用滑窗按查询词打分，取最相关窗口 */
export function snippetFor(content: string, query: string, maxLen = DOC_SNIPPET_LIMIT): string {
  if (content.length <= maxLen) return content;
  const terms = extractTerms(query);
  if (terms.length === 0) return content.slice(0, maxLen);
  const step = Math.floor(maxLen / 2);
  let bestStart = 0;
  let bestScore = -1;
  for (let start = 0; start < content.length; start += step) {
    const win = content.slice(start, start + maxLen);
    let score = 0;
    for (const t of terms) {
      const i = win.indexOf(t);
      if (i >= 0) score += t.length + Math.max(0, 6 - i / 100);
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = start;
    }
  }
  const head = bestStart > 0 ? `（长文截取，从第 ${bestStart} 字附近开始）\n` : '';
  return head + content.slice(bestStart, bestStart + maxLen);
}

/** 提取 [[记:标题]]正文 → 记忆；返回记忆与剩余显示文本 */
export function extractWriteMemory(text: string): { title: string; body: string; rest: string } | null {
  const m = /\[\[记:([^\]]+)\]\]([\s\S]*?)(?:\n*$)/.exec(text);
  if (!m) return null;
  const title = m[1].trim();
  const body = m[2].trim();
  if (!title || !body) return null;
  return { title, body, rest: text.replace(m[0], '').trim() };
}

/** 消费工具标记，返回 { 显示文本, 待处理工具 } */
export function scanMarkers(
  text: string,
): { display: string; reads: string[]; memReads: string[] } {
  const reads: string[] = [];
  const memReads: string[] = [];
  let display = text;
  display = display.replace(/\[\[读:([^\]]+)\]\]/g, (_m, name) => {
    reads.push(name);
    return '';
  });
  display = display.replace(/\[\[忆:([^\]]+)\]\]/g, (_m, title) => {
    memReads.push(title);
    return '';
  });
  display = display.replace(/\n{3,}/g, '\n\n').trim();
  return { display, reads, memReads };
}

// ============================================================
// 流式请求（OpenAI 兼容 SSE）
// ============================================================

export async function streamChatCompletion(
  baseUrl: string,
  apiKey: string,
  model: string,
  messages: ChatMessage[],
  signal: AbortSignal,
  onAcc: (acc: string) => void,
): Promise<string> {
  const url = chatEndpoint(baseUrl);
  if (!url) throw new Error('未配置 API 地址');
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.9,
      // 500 太小：推理型模型（deepseek-reasoner / o1 类）可能把额度全花在推理上，
      // 最终正文一个字符都没有 —— 以前会静默变成「（无内容）」（v4.4.1 修）
      max_tokens: 2048,
      presence_penalty: 0.3,
    }),
    signal,
  });
  if (!res.ok) {
    let msg = `请求失败（HTTP ${res.status}）`;
    try {
      const j = await res.json();
      if (j?.error?.message) msg = j.error.message;
    } catch {
      /* 忽略解析失败 */
    }
    throw new Error(msg);
  }
  if (!res.body) throw new Error('响应没有内容');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  /** 原始响应全文：非流式（或 SSE 行里没有可识别字段）时用它兜底 */
  let raw = '';
  let acc = '';
  /** 推理型模型把内容放在 reasoning_content —— 只用来解释「正文为什么是空的」 */
  let reasoning = '';

  /** 从一条 JSON 里尽量把正文抠出来（兼容 OpenAI / 类 OpenAI / Ollama 几种形状） */
  const pickContent = (j: unknown): { text?: string; think?: string } => {
    const o = j as {
      choices?: Array<{
        delta?: { content?: unknown; reasoning_content?: unknown };
        message?: { content?: unknown };
        text?: unknown;
      }>;
      message?: { content?: unknown };
      response?: unknown;
      content?: unknown;
    };
    const c = o?.choices?.[0];
    const delta = c?.delta;
    const text =
      (typeof delta?.content === 'string' && delta.content) ||
      (typeof c?.message?.content === 'string' && c.message.content) ||
      (typeof c?.text === 'string' && c.text) ||
      (typeof o?.message?.content === 'string' && o.message.content) ||
      (typeof o?.response === 'string' && o.response) ||
      (typeof o?.content === 'string' && o.content) ||
      '';
    const think =
      (typeof delta?.reasoning_content === 'string' && delta.reasoning_content) || '';
    return { text: text || undefined, think: think || undefined };
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    raw += chunk;
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const picked = pickContent(JSON.parse(data));
        if (picked.think) reasoning += picked.think;
        if (picked.text) {
          acc += picked.text;
          onAcc(acc);
        }
      } catch {
        /* 非 JSON 行忽略 */
      }
    }
  }

  // 兜底：整段响应可能是一次性 JSON（服务不支持流式），或用了别的字段名
  if (!acc) {
    try {
      const picked = pickContent(JSON.parse(raw));
      if (picked.think) reasoning += picked.think;
      if (picked.text) {
        acc = picked.text;
        onAcc(acc);
      }
    } catch {
      /* 忽略 */
    }
  }

  if (!acc.trim()) {
    // 绝不静默返回空串：上层会把它显示成「（无内容）」，用户完全不知道哪里出了问题
    if (reasoning.trim()) {
      throw new Error(
        '接口只返回了推理内容、没有正文。多半用了推理型模型（如 deepseek-reasoner）—— 换成对话模型（如 deepseek-chat）再试。',
      );
    }
    throw new Error(
      '接口返回了空内容（HTTP 200 但没有可识别的正文）。检查模型名是否正确、该服务是否支持 stream 流式返回。',
    );
  }
  return acc;
}

// ============================================================
// 演示模式（未配置 API 时的内置回复，走完整流式节奏）
// ============================================================

function trunc(s: string, n: number): string {
  return s.length > n ? s.slice(0, n) + '…' : s;
}

export function demoReply(userText: string): string {
  const t = userText.trim();
  if (/^(你好|嗨|hi|hello|哈喽|在吗)/i.test(t)) {
    return '你好呀。我是 VidaOS 的 Agent——你的馆藏、资料库和记忆馆都对我开放。想让我帮你整理点什么，或者随便聊聊，都行。';
  }
  if (/整理|总结|归纳/.test(t)) {
    return '好，我来整理。\n\n我读得到你的空间文章、动态、灵感、便签、馆藏与收藏夹——可以按主题归纳主线、生成结构化文案，还能一键存成空间文章。\n\n（当前是演示模式，配置 API 后我就能真正读取你的数据了。）';
  }
  if (/馆藏|书|阅读|划线/.test(t)) {
    return '馆藏是我的重要输入。让我 `[[读:书名]]` 读取某本书的正文，可以按章节归纳、解释难句，也能把读书笔记整理成文章存进空间。\n\n（演示模式下我先不真正读取，配置 API 后即可生效。）';
  }
  if (/文章|动态|灵感|便签|收藏夹|相册/.test(t)) {
    return '这些内容我都能读到。说一声 `[[读:文章]]`、`[[读:动态]]` 或 `[[读:灵感]]`，我就能按需查看并帮你梳理。\n\n（演示模式下我先不真正读取，配置 API 后即可生效。）';
  }
  if (/谢谢|感谢|辛苦/.test(t)) {
    return '不客气。随时需要整理、回忆或只是聊聊天，我都在。';
  }
  if (/你(是|叫|是谁|叫什么)/.test(t)) {
    return '我是 VidaOS 的 Agent——你本地生活库的整理助手。我读得到你的馆藏、资料库和记忆馆，一切数据都只留在本机。';
  }
  if (t.length <= 24) {
    return `收到：「${t}」。\n\n想让我继续深入这个话题，或者帮你把相关藏书整理成文章，随时说。`;
  }
  return `关于「${trunc(t, 20)}」——\n\n我可以从三个角度帮你：\n1. 检索馆藏里相关的内容（说一声 \`[[读:书名]]\`）；\n2. 结合资料库整理成结构化文章；\n3. 就当作聊天，陪你理清思路。\n\n（当前是演示模式：在 Agent 配置里填入 API 后，我才能真正读到你的数据。）`;
}

/** 演示模式：按流式节奏逐字吐出 */
export async function demoStream(
  reply: string,
  signal: AbortSignal,
  onAcc: (acc: string) => void,
): Promise<string> {
  let acc = '';
  for (const ch of reply) {
    if (signal.aborted) throw new DOMException('aborted', 'AbortError');
    acc += ch;
    onAcc(acc);
    await new Promise((r) => setTimeout(r, 14 + Math.random() * 30));
  }
  return acc;
}

// ============================================================
// 会话导出
// ============================================================

export function sessionToTxt(title: string, messages: AgentMessage[]): string {
  const head = `VidaOS Agent 会话导出\n标题：${title}\n开始：${formatDate(messages[0]?.createdAt ?? Date.now(), 'YYYY-MM-DD HH:mm')}` +
    `\n结束：${formatDate(Date.now(), 'YYYY-MM-DD HH:mm')}\n${'='.repeat(36)}\n\n`;
  const body = messages
    .map((m) => {
      const who = m.role === 'user' ? '我' : m.role === 'assistant' ? 'Agent' : '系统';
      const label = m.greet ? '（开场白）' : '';
      return `[${formatDate(m.createdAt, 'MM-DD HH:mm')}] ${who}${label}\n${m.content}\n`;
    })
    .join('\n');
  return head + body;
}
