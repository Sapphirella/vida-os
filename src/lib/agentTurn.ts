// 一轮 Agent 回复：流式输出 + 记忆写入 + 工具标记（读资料库/馆藏/记忆）循环
//
// 从 AgentChatView 里原样抽出来单独成模块：这段逻辑包含流式续写、`[[记:]]` 记忆写入、
// `[[读:]]`/`[[忆:]]` 工具循环与错误兜底，混在组件里既难读也难复用。
// （v4.4 它曾被馆藏阅读器的「共读」抽屉共用；v4.4.1 用户反馈该入口体感差、已整体下线，
//   现在只有 Agent 会话页一个调用方 —— 保留模块是因为它把「一轮回复」讲清楚了。）
//
// 本模块只通过 `useAppStore.getState()` 读写数据，不持有任何 React 状态；
// UI 需要的状态（流式光标、停止按钮）由调用方通过回调/AbortController 接管。
import {
  type AgentContext,
  type ChatMessage,
  MAX_TOOL_ROUNDS,
  buildMessages,
  demoReply,
  demoStream,
  extractWriteMemory,
  hasApiConfig,
  resolveDoc,
  resolveMemory,
  scanMarkers,
  snippetFor,
  streamChatCompletion,
} from './agentEngine';
import { useAppStore } from '@/stores/useAppStore';

export interface RunAgentTurnOptions {
  sessionId: string;
  /** 当轮用户输入（演示话术与资料截取的相关性打分都用它） */
  userText: string;
  /** 重试时复用已有气泡，不新建 */
  replaceMsgId?: string;
  /** 调用方持有它来实现「停止」；不传则内部自建（无法中途停止） */
  signal?: AbortSignal;
  /** 助手气泡创建后回调 —— 调用方据此显示流式光标 */
  onAssistantCreated?: (msgId: string) => void;
}

/**
 * 跑完一轮回复。异常在内部处理（写入 sys 消息 + 清掉空气泡），不往外抛，
 * 这样两个调用点的行为完全一致。
 */
export async function runAgentTurn(opts: RunAgentTurnOptions): Promise<void> {
  const { sessionId, userText, replaceMsgId, signal, onAssistantCreated } = opts;
  const st = useAppStore.getState();
  const sess = st.agentSessions.find((x) => x.id === sessionId);
  if (!sess) return;

  const ctx: AgentContext = {
    config: st.agentConfig,
    docs: st.agentDocs,
    memories: st.agentMemories,
    books: st.books,
  };
  const ctrl = new AbortController();
  if (signal) {
    if (signal.aborted) ctrl.abort();
    else signal.addEventListener('abort', () => ctrl.abort(), { once: true });
  }

  const msgId =
    replaceMsgId ??
    useAppStore.getState().appendAgentMessage(sessionId, { role: 'assistant', content: '' });
  onAssistantCreated?.(msgId);
  if (replaceMsgId) {
    useAppStore.getState().replaceAgentMessage(sessionId, msgId, { content: '' });
  }

  try {
    let history: ChatMessage[] = (
      useAppStore.getState().agentSessions.find((x) => x.id === sessionId)?.messages ?? []
    )
      .filter((m) => m.id !== msgId && !m.greet && m.content)
      .map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.content }));

    let finalText = '';
    let rounds = 0;
    for (;;) {
      const messages = buildMessages(ctx.config.persona, history, ctx);
      const onAcc = (acc: string) => {
        useAppStore.getState().replaceAgentMessage(sessionId, msgId, { content: acc });
      };
      let out: string;
      if (hasApiConfig(ctx.config)) {
        out = await streamChatCompletion(
          ctx.config.baseUrl,
          ctx.config.apiKey,
          ctx.config.model,
          messages,
          ctrl.signal,
          onAcc,
        );
      } else {
        const reply =
          rounds === 0
            ? demoReply(userText)
            : '（演示模式下不执行工具标记，继续。配置 API 后此步会真正读取。）';
        out = await demoStream(reply, ctrl.signal, onAcc);
      }

      // 记忆写入：[[记:标题]]正文 → 存入记忆馆并从对话中剥离
      const wm = extractWriteMemory(out);
      if (wm) {
        st.addAgentMemory(wm.title, wm.body);
        st.appendAgentMessage(sessionId, { role: 'sys', content: `已记入记忆馆「${wm.title}」` });
        out = wm.rest;
      }

      const { display, reads, memReads } = scanMarkers(out);
      let pendingTool: ChatMessage | null = null;
      if (reads.length > 0) {
        const doc = resolveDoc(reads[0], ctx);
        if (doc) {
          st.appendAgentMessage(sessionId, { role: 'sys', content: `读取「${doc.name}」…` });
          pendingTool = {
            role: 'user',
            content: `【资料·${doc.name}】\n${snippetFor(doc.content, userText)}`,
          };
        } else {
          st.appendAgentMessage(sessionId, { role: 'sys', content: `未找到「${reads[0]}」` });
        }
      } else if (memReads.length > 0) {
        const mem = resolveMemory(memReads[0], ctx);
        if (mem) {
          st.appendAgentMessage(sessionId, { role: 'sys', content: `读取记忆「${mem.title}」…` });
          pendingTool = { role: 'user', content: `【记忆馆·${mem.title}】\n${mem.content}` };
        } else {
          st.appendAgentMessage(sessionId, { role: 'sys', content: `未找到记忆「${memReads[0]}」` });
        }
      }

      finalText += display;
      if (pendingTool) {
        history = [...history, { role: 'assistant', content: out }, pendingTool];
        rounds++;
        if (rounds >= MAX_TOOL_ROUNDS) break;
        continue;
      }
      break;
    }
    const final = finalText.trim();
    if (!final) {
      // 别再静默写「（无内容）」：说明白发生了什么，用户才知道下一步怎么办
      useAppStore
        .getState()
        .appendAgentMessage(sessionId, {
          role: 'sys',
          content: '模型这轮只输出了工具标记、没有正文（已按标记去读取资料）。可以再问一次，或换个模型。',
        });
    }
    useAppStore.getState().replaceAgentMessage(sessionId, msgId, { content: final || '（无内容）' });
  } catch (e) {
    const err = e as { name?: string; message?: string };
    if (err?.name === 'AbortError') return;
    const msg = err?.message ? String(err.message) : '未知错误';
    useAppStore.getState().appendAgentMessage(sessionId, { role: 'sys', content: `请求出错：${msg}` });
    const cur = useAppStore.getState().agentSessions.find((x) => x.id === sessionId)?.messages;
    const acc = cur?.find((m) => m.id === msgId);
    if (acc && !acc.content) {
      useAppStore.getState().removeAgentMessage(sessionId, msgId);
    }
  }
}
