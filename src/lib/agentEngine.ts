// Agent 对话引擎：OpenAI 兼容接口流式对话 + 演示模式 + 资料库/碎片/记忆馆按需读取
// 移植自「参考文件ventana」的 app.js 核心约定：
// - 三项配置（Base URL + API Key + 模型名）齐全才走真实 API，否则演示模式
// - 资料库索引随请求下发，正文用 [[读:文档名]] 按需读取（>6000 字按相关性截取）
// - 记忆馆用 [[忆:标题]] 读、[[记:标题]]正文 写
// - 所有数据只存在本机 IndexedDB，调用外部 API 时仅发送必要上下文
import type { AgentMessage, AgentConfig, AgentDoc, AgentMemory, FragmentEntry } from '@/types';
import { formatDate } from '@/lib/utils';

export const MAX_TOOL_ROUNDS = 3;
export const DOC_SNIPPET_LIMIT = 6000;
export const DOC_MAX_BYTES = 400 * 1024;

/** 默认人格：空人格时兜底，让 Agent 知道它能读碎片/资料库 */
export const DEFAULT_PERSONA =
  '你是 VidaOS 的 Agent，一个住在用户本地生活库里的助手。你能读取用户的碎片流（碎片）、资料库文档与记忆馆，' +
  '帮助整理成结构化文章，也擅长聊生活、学习与身边的事。保持自然、亲切、简洁；需要资料时按约定读取，' +
  '不要编造用户记录中不存在的内容。回复使用简体中文，段落之间空一行。';

export const GREETING =
  '你好，我是 **VidaOS Agent**。\n\n我可以帮你整理碎片流和资料库、生成空间文章，也能像朋友一样聊生活、学习和身边的事。' +
  '需要读你最近的碎片时，说一句 `[[读:碎片]]` 即可；资料与记忆也都按需读取，一切只保存在本机。';

export interface AgentContext {
  config: AgentConfig;
  docs: AgentDoc[];
  memories: AgentMemory[];
  fragments: FragmentEntry[];
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

/** 碎片流时间线文本（最近 40 条，旧→新） */
export function fragmentsIndexText(fragments: FragmentEntry[]): string {
  const recent = [...fragments].sort((a, b) => a.createdAt - b.createdAt).slice(-40);
  return recent
    .map((f) => {
      const imgs = f.imageIds.length ? ` [图片×${f.imageIds.length}]` : '';
      const tags = f.tags.length ? ` #${f.tags.join(' #')}` : '';
      return `[${formatDate(f.createdAt, 'YYYY-MM-DD HH:mm')}] ${plainHead(f.content, 120)}${imgs}${tags}`;
    })
    .join('\n');
}

/** 资料库索引（含内置「碎片」虚拟文档），随每次请求下发 */
export function docsIndexText(ctx: AgentContext): string {
  const lines: string[] = [];
  for (const d of ctx.docs) lines.push(`- ${d.name}：${plainHead(d.content, 60)}`);
  const fragText = fragmentsIndexText(ctx.fragments);
  lines.push(`- 碎片：${plainHead(fragText, 60)}（我的碎片流时间线，用 [[读:碎片]] 读取正文）`);
  return lines.join('\n');
}

/** 构造发给模型的 messages：system = 人格 + 资料库索引 + 使用约定 + 对话历史 */
export function buildMessages(persona: string, history: ChatMessage[], ctx: AgentContext): ChatMessage[] {
  const parts: string[] = [];
  const p = persona.trim() || DEFAULT_PERSONA;
  parts.push(p);
  const idx = docsIndexText(ctx).trim();
  if (idx) parts.push(`【资料库索引】\n${idx}`);
  parts.push(
    '【使用约定】需要资料/碎片详细内容时，在回复中直接输出 [[读:文档名]]（文档名可以是「碎片」或资料库文档名）；' +
      '需要读取记忆正文用 [[忆:标题]]；需要长期记住一条信息用 [[记:标题]]正文。' +
      '工具标记单独成行输出即可，不要解释。',
  );
  const msgs: ChatMessage[] = [{ role: 'system', content: parts.join('\n\n') }, ...history];
  return msgs;
}

/** 按需读取文档（含内置「碎片」）；先精确匹配，再大小写不敏感包含匹配 */
export function resolveDoc(name: string, ctx: AgentContext): { name: string; content: string } | null {
  const n = name.trim();
  if (!n) return null;
  if (n === '碎片' || n.includes('碎片')) {
    const text = fragmentsIndexText(ctx.fragments);
    if (!text) return null;
    return { name: '碎片', content: text };
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
      max_tokens: 500,
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
  let acc = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') continue;
      try {
        const j = JSON.parse(data);
        const d = j.choices?.[0]?.delta?.content;
        if (d) {
          acc += d;
          onAcc(acc);
        }
      } catch {
        /* 非 JSON 行忽略 */
      }
    }
  }
  // 兼容非流式响应（一次返回完整 JSON）
  if (!acc) {
    try {
      const j = JSON.parse(buf);
      acc = j.choices?.[0]?.message?.content ?? '';
    } catch {
      /* 忽略 */
    }
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
    return '你好呀。我是 VidaOS 的 Agent——你的碎片流、资料库和记忆馆都对我开放。想让我帮你整理点什么，或者随便聊聊，都行。';
  }
  if (/整理|总结|归纳/.test(t)) {
    return '好，我来整理。\n\n我可以先 `[[读:碎片]]` 读取最近的碎片流，再按主题归纳主线、生成结构化文案，还能一键存成空间文章。\n\n（当前是演示模式，配置 API 后我就能真正读取你的数据了。）';
  }
  if (/碎片/.test(t)) {
    return '碎片流是我的重要输入。让我 `[[读:碎片]]` 读取最近 40 条，按日期或主题归纳；需要的话还能把整理结果生成一篇文章存进空间。\n\n（演示模式下我先不真正读取，配置 API 后即可生效。）';
  }
  if (/谢谢|感谢|辛苦/.test(t)) {
    return '不客气。随时需要整理、回忆或只是聊聊天，我都在。';
  }
  if (/你(是|叫|是谁|叫什么)/.test(t)) {
    return '我是 VidaOS 的 Agent——你本地生活库的整理助手。我读得到你的碎片、资料库和记忆馆，一切数据都只留在本机。';
  }
  if (t.length <= 24) {
    return `收到：「${t}」。\n\n想让我继续深入这个话题，或者帮你把相关碎片整理成文章，随时说。`;
  }
  return `关于「${trunc(t, 20)}」——\n\n我可以从三个角度帮你：\n1. 检索碎片流里相关的内容（说一声 \`[[读:碎片]]\`）；\n2. 结合资料库整理成结构化文章；\n3. 就当作聊天，陪你理清思路。\n\n（当前是演示模式：在 Agent 配置里填入 API 后，我才能真正读到你的数据。）`;
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
