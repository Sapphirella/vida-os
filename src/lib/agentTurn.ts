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
  hasApiConfig,
  resolveDoc,
  scanTools,
  snippetFor,
  streamChatCompletion,
} from './agentEngine';
import { proposeReplace, writeContent, type PendingReplace } from './agentTools';
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
  /**
   * Agent 发起查找替换时回调，调用方弹确认卡片。
   * 替换**不会**自动执行，必须用户在卡片上点确认才落盘。
   */
  onPendingReplace?: (p: PendingReplace) => void;
}

/** 查找替换确认卡片的出口：模块内无 React 状态，由调用方接管 */
let pendingReplaceSink: ((p: PendingReplace) => void) | null = null;

/**
 * 跑完一轮回复。异常在内部处理（写入 sys 消息 + 清掉空气泡），不往外抛，
 * 这样两个调用点的行为完全一致。
 */
export async function runAgentTurn(opts: RunAgentTurnOptions): Promise<void> {
  const { sessionId, userText, replaceMsgId, signal, onAssistantCreated, onPendingReplace } = opts;
  const st = useAppStore.getState();
  const sess = st.agentSessions.find((x) => x.id === sessionId);
  if (!sess) return;

  const ctx: AgentContext = {
    config: st.agentConfig,
    docs: st.agentDocs,
    memories: st.agentMemories,
    books: st.books,
    articles: st.articles,
    moments: st.moments,
    inspiration: st.notes.inspiration,
    schedule: st.notes.schedule,
    todo: st.notes.todo,
    favorites: st.favorites,
    albums: st.albums,
    albumGroups: st.albumGroups,
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

  pendingReplaceSink = onPendingReplace ?? null;
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

      // v4.5.4：一次解析全部工具标记。读 / 搜 / 写 / 替统一走这里。
      // 「写」与「替」直接落盘或产出待确认清单；「读」「搜」把结果作为下一轮上下文回灌。
      const { display, tools, brokenKinds } = scanTools(out);
      const pendingTool: ChatMessage[] = [];
      const sysNotes: string[] = [];

      // 格式写坏的标记不会执行，但**必须让用户知道** —— 静默丢弃会让人
      // 以为已经存进去了。告诉模型哪几条没跑，让它下一轮自己重发。
      if (brokenKinds?.length) {
        sysNotes.push(
          `有 ${brokenKinds.length} 处标记格式不对，没有执行：${brokenKinds
            .map((k) => `[[${k}:…]]`)
            .join(' ')}。` +
            '（写标记要写成 [[写:模块【限定】|内容]]，【】要闭合；正文里若出现 ]( 链接，请把结尾的 ]] 换成全角 ］］）',
        );
        pendingTool.push({
          role: 'user',
          content:
            `【标记未执行】你上一轮输出的 ${brokenKinds
              .map((k) => `[[${k}:…]]`)
              .join('、')} 格式无法解析，所以**没有执行**。` +
            '请检查格式后重新输出；写标记必须是 [[写:模块【限定】|内容]]，其中【】成对出现。',
        });
      }

      for (const t of tools) {
        if (t.kind === 'read') {
          const doc = resolveDoc(t.arg, ctx);
          if (doc) {
            sysNotes.push(`读取「${doc.name}」…`);
            pendingTool.push({
              role: 'user',
              content: `【资料·${doc.name}】\n${snippetFor(doc.content, userText)}`,
            });
          } else {
            sysNotes.push(`未找到「${t.arg}」`);
          }
        } else if (t.kind === 'search') {
          // 联网搜索：需要用户自备搜索 API 才能真正联网（见 settings 里的搜索配置）。
          // 未配置时如实告知模型「搜不了」，让模型改用自己的知识回答，而不是伪造搜索结果。
          sysNotes.push(`需要联网搜索「${t.arg}」，但未配置搜索服务`);
          pendingTool.push({
            role: 'user',
            content:
              `【搜索不可用】用户想查「${t.arg}」。当前应用没有配置联网搜索服务，` +
              `你无法获取实时信息。请基于已有知识回答，并明确告诉用户这条信息可能不是最新的。`,
          });
        } else if (t.kind === 'write') {
          const r = writeContent(t.arg as never, t.payload ?? '', t.extra);
          sysNotes.push(r.message);
        } else if (t.kind === 'replace') {
          const { result, pending } = proposeReplace(t.arg as never, t.from ?? '', t.payload ?? '');
          sysNotes.push(result.message);
          if (pending) {
            // 交给 UI 弹确认卡片；这里不落盘
            pendingReplaceSink?.(pending);
          }
        }
      }

      for (const n of sysNotes) {
        useAppStore.getState().appendAgentMessage(sessionId, { role: 'sys', content: n });
      }

      finalText += display;
      if (pendingTool.length > 0) {
        history = [...history, { role: 'assistant', content: out }, ...pendingTool];
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
  } finally {
    pendingReplaceSink = null;
  }
}
