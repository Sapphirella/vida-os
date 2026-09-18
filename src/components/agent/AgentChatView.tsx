import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Brain,
  Settings,
  Download,
  Send,
  Square,
  Copy,
  RefreshCw,
  Trash2,
  X,
  FileUp,
  Plug,
  Unplug,
  Loader2,
  ArchiveRestore,
  Pencil,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MarkdownView } from '@/components/common/MarkdownView';
import { saveText, formatDate, relativeTime, clsx } from '@/lib/utils';
import {
  AgentContext,
  ChatMessage,
  buildMessages,
  hasApiConfig,
  streamChatCompletion,
  demoReply,
  demoStream,
  scanMarkers,
  extractWriteMemory,
  resolveDoc,
  resolveMemory,
  snippetFor,
  sessionToTxt,
  MAX_TOOL_ROUNDS,
  DOC_MAX_BYTES,
} from '@/lib/agentEngine';
import type { AgentMessage, AgentDoc } from '@/types';

export function AgentChatView({ sessionId }: { sessionId: string }) {
  const session = useAppStore((s) => s.agentSessions.find((x) => x.id === sessionId));
  const config = useAppStore((s) => s.agentConfig);
  const memories = useAppStore((s) => s.agentMemories);
  const appendAgentMessage = useAppStore((s) => s.appendAgentMessage);
  const replaceAgentMessage = useAppStore((s) => s.replaceAgentMessage);
  const removeAgentMessage = useAppStore((s) => s.removeAgentMessage);
  const updateAgentSession = useAppStore((s) => s.updateAgentSession);
  const addAgentDoc = useAppStore((s) => s.addAgentDoc);
  const addAgentMemory = useAppStore((s) => s.addAgentMemory);
  const markAgentMemoriesRead = useAppStore((s) => s.markAgentMemoriesRead);
  const setAgentSessionId = useUIStore((s) => s.setAgentSessionId);
  const showModal = useUIStore((s) => s.showModal);
  const showToast = useUIStore((s) => s.showToast);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamMsgId, setStreamMsgId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [testing, setTesting] = useState(false);
  const [docsBusy, setDocsBusy] = useState(false);
  const stopRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  const messages = session?.messages ?? [];
  const unreadMemories = memories.filter((m) => !m.read).length;
  const isStreamingThis = (m: AgentMessage) => m.id === streamMsgId && streaming;

  // 新消息滚到底部
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streamMsgId, streaming]);

  // 打开面板时把新记忆标为已读
  const openPanel = () => {
    setPanelOpen(true);
    if (unreadMemories > 0) markAgentMemoriesRead();
  };

  /** 执行一轮回复：可带工具标记循环（读文档/记忆 → 回填 → 续写） */
  const runTurn = useCallback(
    async (userText: string, replaceMsgId?: string) => {
      const st = useAppStore.getState();
      const sess = st.agentSessions.find((x) => x.id === sessionId);
      if (!sess) return;
      const ctx: AgentContext = {
        config: st.agentConfig,
        docs: st.agentDocs,
        memories: st.agentMemories,
        fragments: st.fragments,
      };
      const ctrl = new AbortController();
      stopRef.current = ctrl;
      setStreaming(true);
      const msgId = replaceMsgId ?? st.appendAgentMessage(sessionId, { role: 'assistant', content: '' });
      setStreamMsgId(msgId);
      if (replaceMsgId) {
        st.replaceAgentMessage(sessionId, msgId, { content: '' });
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
            const reply = rounds === 0 ? demoReply(userText) : '（演示模式下不执行工具标记，继续。配置 API 后此步会真正读取。）';
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
              st.appendAgentMessage(sessionId, { role: 'sys', content: `读取资料库「${doc.name}」…` });
              pendingTool = {
                role: 'user',
                content: `【资料库·${doc.name}】\n${snippetFor(doc.content, userText)}`,
              };
            } else {
              st.appendAgentMessage(sessionId, { role: 'sys', content: `未找到文档「${reads[0]}」` });
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
        st.replaceAgentMessage(sessionId, msgId, { content: finalText || '（无内容）' });
      } catch (e: any) {
        if (e?.name === 'AbortError') return;
        const msg = e?.message ? String(e.message) : '未知错误';
        useAppStore.getState().appendAgentMessage(sessionId, { role: 'sys', content: `请求出错：${msg}` });
        const cur = useAppStore.getState().agentSessions.find((x) => x.id === sessionId)?.messages;
        const acc = cur?.find((m) => m.id === msgId);
        if (acc && !acc.content) {
          useAppStore.getState().removeAgentMessage(sessionId, msgId);
        }
      } finally {
        setStreaming(false);
        setStreamMsgId(null);
        stopRef.current = null;
      }
    },
    [sessionId, appendAgentMessage, replaceAgentMessage, removeAgentMessage, addAgentMemory],
  );

  const send = () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    const st = useAppStore.getState();
    st.appendAgentMessage(sessionId, { role: 'user', content: text });
    // 自动命名会话
    const sess = st.agentSessions.find((x) => x.id === sessionId);
    if (sess && (sess.title === '' || sess.title === '新会话')) {
      st.updateAgentSession(sessionId, { title: text.length > 20 ? `${text.slice(0, 20)}…` : text });
    }
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) {
        ta.focus();
        ta.style.height = 'auto';
      }
    });
    void runTurn(text);
  };

  const stop = () => {
    stopRef.current?.abort();
    setStreaming(false);
  };

  const regen = (m: AgentMessage) => {
    if (streaming || m.greet) return;
    const st = useAppStore.getState();
    const sess = st.agentSessions.find((x) => x.id === sessionId);
    if (!sess) return;
    const i = sess.messages.findIndex((x) => x.id === m.id);
    const prevUser = [...sess.messages.slice(0, i)].reverse().find((x) => x.role === 'user');
    if (!prevUser) return;
    void runTurn(prevUser.content, m.id);
  };

  const copyMsg = async (m: AgentMessage) => {
    try {
      await navigator.clipboard.writeText(m.content);
      showToast('已复制', 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  const delMsg = (m: AgentMessage) => {
    if (confirm('删除这条消息？')) removeAgentMessage(sessionId, m.id);
  };

  const exportTxt = () => {
    if (!session) return;
    void saveText(sessionToTxt(session.title, messages), `Agent-${session.title}.txt`, 'text/plain');
    showToast('已导出会话文本', 'success');
  };

  const uploadDocs = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setDocsBusy(true);
    const list = Array.from(files);
    let ok = 0;
    let long = 0;
    for (const file of list) {
      if (file.size > DOC_MAX_BYTES) {
        showToast(`「${file.name}」超过 400KB，未载入`, 'error');
        continue;
      }
      try {
        const text = await file.text();
        if (!text.trim()) continue;
        addAgentDoc(file.name, text);
        ok++;
        if (text.length > 8000) long++;
      } catch {
        showToast(`读取「${file.name}」失败`, 'error');
      }
    }
    if (ok) showToast(`已载入 ${ok} 份文档`, 'success');
    if (long) showToast(`${long} 份超过 8000 字，按需读取时将截取`, 'info');
    setDocsBusy(false);
  };

  const testConnection = async () => {
    setTesting(true);
    try {
      const { agentConfig: cfg } = useAppStore.getState();
      if (!hasApiConfig(cfg)) {
        showToast('请先填写 Base URL / API Key / 模型名', 'error');
        return;
      }
      const { streamChatCompletion } = await import('@/lib/agentEngine');
      await streamChatCompletion(
        cfg.baseUrl,
        cfg.apiKey,
        cfg.model,
        [{ role: 'user', content: '试一试' }],
        new AbortController().signal,
        () => {},
      );
      showToast('连接正常，模型可响应', 'success');
    } catch (e: any) {
      showToast(`连接失败：${e?.message ?? e}`, 'error');
    } finally {
      setTesting(false);
    }
  };

  const renameSession = () => {
    if (!session) return;
    showModal({
      title: '重命名会话',
      inputMode: { placeholder: '会话标题', initialValue: session.title },
      onInputConfirm: (v) => {
        if (v.trim()) updateAgentSession(sessionId, { title: v.trim() });
      },
    });
  };

  if (!session) return null;
  const apiMode = hasApiConfig(config);

  return (
    <div className="view-enter h-full">
      {/* 头部：返回 + 标题 + 操作 */}
      <div
        className="fixed inset-x-0 z-30 border-b border-bronze/10"
        style={{
          top: 'calc(56px + env(safe-area-inset-top))',
          background: 'var(--bar-bg)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        }}
      >
        <div className="max-w-5xl mx-auto h-11 px-2 sm:px-4 flex items-center gap-1.5">
          <button
            onClick={() => setAgentSessionId(null)}
            className="flex items-center gap-0.5 h-8 px-1.5 rounded-lg text-bronze hover:text-candle transition-colors"
            aria-label="返回会话列表"
          >
            <ChevronLeft size={17} strokeWidth={1.6} />
            <span className="font-mono text-[11px] tracking-wider">会话</span>
          </button>
          <button
            onClick={renameSession}
            className="min-w-0 flex-1 text-left group flex items-center gap-1.5"
            title="点击重命名"
          >
            <span className="font-serif text-title text-headline truncate">{session.title}</span>
            <Pencil size={11} strokeWidth={1.5} className="text-bronze-deep opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
          <span
            className={clsx(
              'font-mono text-[9px] tracking-widest px-2 py-0.5 rounded-pill flex-none',
              apiMode ? 'text-[color:var(--find-fg)] bg-wine/20' : 'text-bronze-deep bg-bronze/10',
            )}
          >
            {apiMode ? 'API' : '演示'}
          </span>
          <button
            onClick={openPanel}
            className="relative w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="记忆馆与配置"
          >
            <Brain size={17} strokeWidth={1.5} />
            {unreadMemories > 0 && (
              <span
                className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full text-[9px] font-mono flex items-center justify-center"
                style={{ background: 'var(--wine-bright)', color: 'var(--moon)' }}
              >
                {unreadMemories}
              </span>
            )}
          </button>
          <button
            onClick={exportTxt}
            className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="导出会话"
            title="导出为 txt"
          >
            <Download size={16} strokeWidth={1.5} />
          </button>
          <button
            onClick={openPanel}
            className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="配置"
            title="配置（连接 / 人格 / 资料库 / 记忆馆 / 归档）"
          >
            <Settings size={17} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 消息流 */}
      <div
        ref={logRef}
        className="pt-[calc(100px+env(safe-area-inset-top))] pb-[calc(120px+env(safe-area-inset-bottom)+56px)] overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-6 space-y-4">
          {messages.length === 0 && (
            <div className="py-24 text-center text-bronze italic text-sm">
              说点什么，开始你们的对话吧。
            </div>
          )}
          {messages.map((m) =>
            m.role === 'sys' ? (
              <div key={m.id} className="flex justify-center">
                <span className="font-mono text-[10px] tracking-wider text-bronze-deep bg-bronze/10 px-2.5 py-1 rounded-pill">
                  {m.content}
                </span>
              </div>
            ) : m.role === 'user' ? (
              <div key={m.id} className="flex justify-end group">
                <div
                  className="max-w-[86%] sm:max-w-[75%] rounded-2xl rounded-br-md px-3.5 py-2.5"
                  style={{ background: 'var(--wine)', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}
                >
                  <p className="font-serif text-reading text-moon whitespace-pre-wrap break-words" style={{ lineHeight: 1.65 }}>
                    {m.content}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="font-mono text-[10px] tracking-wider text-moon/70">
                      {formatDate(m.createdAt, 'HH:mm')}
                    </span>
                    <span className="flex-1" />
                    <button onClick={() => void copyMsg(m)} className="text-moon/70 hover:text-moon" aria-label="复制">
                      <Copy size={11} strokeWidth={1.6} />
                    </button>
                    <button onClick={() => delMsg(m)} className="text-moon/70 hover:text-moon" aria-label="删除">
                      <Trash2 size={11} strokeWidth={1.6} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div key={m.id} className="flex justify-start group">
                <div className="max-w-[92%] sm:max-w-[85%] min-w-0">
                  {!m.content && isStreamingThis(m) ? (
                    <div className="flex items-center gap-1.5 py-1.5">
                      <Dot className="animate-bounce" delay={0} />
                      <Dot className="animate-bounce" delay={120} />
                      <Dot className="animate-bounce" delay={240} />
                    </div>
                  ) : (
                    <div className="flex items-start gap-0.5">
                      <MarkdownView
                        markdown={m.content}
                        className="agent-reply"
                      />
                      {isStreamingThis(m) && (
                        <span
                          className="inline-block w-[2px] self-stretch mt-1 animate-pulse flex-none"
                          style={{ background: 'var(--caret)' }}
                        />
                      )}
                    </div>
                  )}
                  {!m.greet && (
                    <div className="mt-1 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pl-1">
                      <span className="font-mono text-[10px] tracking-wider text-bronze-deep">
                        {formatDate(m.createdAt, 'HH:mm')}
                      </span>
                      <span className="flex-1" />
                      <button onClick={() => void copyMsg(m)} className="text-bronze hover:text-candle" aria-label="复制">
                        <Copy size={11} strokeWidth={1.6} />
                      </button>
                      {!streaming && (
                        <button onClick={() => regen(m)} className="text-bronze hover:text-candle" aria-label="重新生成">
                          <RefreshCw size={11} strokeWidth={1.6} />
                        </button>
                      )}
                      <button onClick={() => delMsg(m)} className="text-bronze hover:text-wine-bright" aria-label="删除">
                        <Trash2 size={11} strokeWidth={1.6} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* 底部输入区 */}
      <div
        className="fixed inset-x-0 z-30 px-3 sm:px-6"
        style={{ bottom: 'calc(56px + env(safe-area-inset-bottom) + 8px)' }}
      >
        <div
          className="mx-auto max-w-2xl rounded-card border border-bronze/15 px-3 py-2.5 shadow-card-elevated"
          style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(20px) saturate(140%)' }}
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={taRef}
              value={input}
              rows={1}
              onChange={(e) => {
                setInput(e.target.value);
                const ta = e.target;
                ta.style.height = 'auto';
                ta.style.height = Math.min(ta.scrollHeight, 140) + 'px';
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder={streaming ? 'Agent 正在回复…' : '和 Agent 说点什么…（Enter 发送 / Shift+Enter 换行）'}
              disabled={streaming}
              className="flex-1 min-w-0 bg-transparent resize-none font-serif text-reading text-paper placeholder:text-bronze-deep outline-none py-1.5"
              style={{ lineHeight: 1.6, maxHeight: 140 }}
            />
            {streaming ? (
              <button
                onClick={stop}
                className="w-9 h-9 flex-none flex items-center justify-center rounded-full transition-all"
                style={{ background: 'var(--wine)' }}
                aria-label="停止生成"
              >
                <Square size={13} strokeWidth={2} className="text-moon" />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim()}
                className="w-9 h-9 flex-none flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                style={{ background: 'var(--wine)' }}
                aria-label="发送"
              >
                <Send size={15} strokeWidth={1.6} className="text-moon" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 配置 / 记忆 / 归档 面板 */}
      {panelOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            style={{ background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setPanelOpen(false)}
          />
          <div
            className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-sm overflow-y-auto border-l border-bronze/15"
            style={{ background: 'var(--card-bg-elevated)', backdropFilter: 'blur(20px) saturate(140%)' }}
          >
            <PanelInner
              sessionId={sessionId}
              onClose={() => setPanelOpen(false)}
              testing={testing}
              onTest={testConnection}
              docsBusy={docsBusy}
              onUpload={(files) => void uploadDocs(files)}
              docFileRef={docFileRef}
            />
          </div>
        </>
      )}
    </div>
  );
}

function Dot({ className, delay }: { className: string; delay: number }) {
  return (
    <span
      className={clsx('w-1.5 h-1.5 rounded-full', className)}
      style={{ background: 'var(--bronze)', animationDelay: `${delay}ms` }}
    />
  );
}

/** 配置面板：连接 / 人格 / 资料库 / 记忆馆 / 归档 */
function PanelInner({
  sessionId,
  onClose,
  testing,
  onTest,
  docsBusy,
  onUpload,
  docFileRef,
}: {
  sessionId: string;
  onClose: () => void;
  testing: boolean;
  onTest: () => void;
  docsBusy: boolean;
  onUpload: (files: FileList | null) => void;
  docFileRef: React.MutableRefObject<HTMLInputElement | null>;
}) {
  const config = useAppStore((s) => s.agentConfig);
  const docs = useAppStore((s) => s.agentDocs);
  const memories = useAppStore((s) => s.agentMemories);
  const sessions = useAppStore((s) => s.agentSessions);
  const updateAgentConfig = useAppStore((s) => s.updateAgentConfig);
  const deleteAgentDoc = useAppStore((s) => s.deleteAgentDoc);
  const deleteAgentMemory = useAppStore((s) => s.deleteAgentMemory);
  const updateAgentSession = useAppStore((s) => s.updateAgentSession);
  const deleteAgentSession = useAppStore((s) => s.deleteAgentSession);
  const setAgentSessionId = useUIStore((s) => s.setAgentSessionId);
  const showModal = useUIStore((s) => s.showModal);
  const showToast = useUIStore((s) => s.showToast);
  const [expandedMem, setExpandedMem] = useState<string | null>(null);
  const archived = sessions.filter((s) => s.archived).sort((a, b) => b.updatedAt - a.updatedAt);

  const apiMode = hasApiConfig(config);

  const exportArchived = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    void saveText(sessionToTxt(s.title, s.messages), `Agent-${s.title}.txt`, 'text/plain');
  };

  const renameArchived = (id: string) => {
    const s = sessions.find((x) => x.id === id);
    if (!s) return;
    showModal({
      title: '重命名会话',
      inputMode: { placeholder: '会话标题', initialValue: s.title },
      onInputConfirm: (v) => {
        if (v.trim()) updateAgentSession(id, { title: v.trim() });
      },
    });
  };

  return (
    <div className="p-4 sm:p-5 space-y-6">
      <div className="flex items-center gap-2">
        <span className="flex-1 font-mono text-[12px] tracking-[0.2em] uppercase text-headline">
          Agent 配置
        </span>
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle" aria-label="关闭">
          <X size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* 连接 */}
      <section>
        <h3 className="font-mono text-[11px] tracking-widest text-bronze-deep uppercase mb-2 flex items-center gap-1.5">
          <Plug size={12} strokeWidth={1.6} /> 连接
        </h3>
        <div className={clsx('rounded-pill px-2.5 py-1 text-[10px] font-mono tracking-wider inline-flex mb-3', apiMode ? 'text-[color:var(--find-fg)] bg-wine/20' : 'text-bronze-deep bg-bronze/10')}>
          {apiMode ? '真实 API 模式（数据仅发送必要上下文）' : '演示模式（内置回复，无需配置）'}
        </div>
        <div className="space-y-2">
          <input
            value={config.baseUrl}
            onChange={(e) => updateAgentConfig({ baseUrl: e.target.value })}
            placeholder="Base URL，如 https://api.openai.com"
            className="w-full px-3 py-2 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/15 focus:border-candle/40 bg-transparent"
          />
          <input
            value={config.apiKey}
            onChange={(e) => updateAgentConfig({ apiKey: e.target.value })}
            placeholder="API Key（只存本机）"
            type="password"
            className="w-full px-3 py-2 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/15 focus:border-candle/40 bg-transparent"
          />
          <input
            value={config.model}
            onChange={(e) => updateAgentConfig({ model: e.target.value })}
            placeholder="模型名，如 gpt-4o-mini"
            className="w-full px-3 py-2 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/15 focus:border-candle/40 bg-transparent"
          />
          <div className="flex gap-2">
            <button onClick={onTest} disabled={testing} className="btn-primary flex-1 justify-center" style={{ padding: '8px 12px', fontSize: '0.8125rem' }}>
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />} 自检连接
            </button>
            {apiMode && (
              <button onClick={() => { updateAgentConfig({ baseUrl: '', apiKey: '', model: '' }); showToast('已清除连接，回到演示模式', 'info'); }} className="btn-ghost" style={{ padding: '8px 12px', fontSize: '0.8125rem' }}>
                <Unplug size={13} /> 清除
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 人格 */}
      <section>
        <h3 className="font-mono text-[11px] tracking-widest text-bronze-deep uppercase mb-2">人格 / System Prompt</h3>
        <textarea
          value={config.persona}
          onChange={(e) => updateAgentConfig({ persona: e.target.value })}
          rows={4}
          placeholder="给 Agent 设定一个人格（可选）。留空使用默认人格：能读碎片与资料库、可聊天可整理。"
          className="w-full px-3 py-2 rounded-card text-sm font-serif text-paper placeholder:text-bronze-deep outline-none border border-bronze/15 focus:border-candle/40 bg-transparent resize-none"
          style={{ lineHeight: 1.7 }}
        />
        <div className="flex gap-2 mt-2">
          <label className="btn-ghost cursor-pointer flex items-center gap-1" style={{ padding: '8px 12px', fontSize: '0.8125rem' }}>
            <FileUp size={13} /> 上传覆盖
            <input
              type="file"
              accept=".md,.txt,text/markdown,text/plain"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void f.text().then((t) => updateAgentConfig({ persona: t }));
                e.target.value = '';
              }}
            />
          </label>
          {config.persona && (
            <button onClick={() => updateAgentConfig({ persona: '' })} className="btn-text">
              清空
            </button>
          )}
        </div>
      </section>

      {/* 资料库 */}
      <section>
        <h3 className="font-mono text-[11px] tracking-widest text-bronze-deep uppercase mb-2 flex items-center gap-1.5">
          资料库
          <span className="font-mono text-[9px] normal-case text-bronze-deep/70">（按需 [[读:文档名]]）</span>
        </h3>
        <input
          ref={docFileRef}
          type="file"
          accept=".md,.txt,.json,.yaml,text/markdown,text/plain,application/json"
          multiple
          hidden
          onChange={(e) => {
            onUpload(e.target.files);
            e.target.value = '';
          }}
        />
        <button
          onClick={() => docFileRef.current?.click()}
          disabled={docsBusy}
          className="btn-ghost w-full justify-center"
          style={{ padding: '9px 12px', fontSize: '0.8125rem' }}
        >
          {docsBusy ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
          上传文档（.md / .txt / .json / .yaml，≤400KB）
        </button>
        {docs.length === 0 ? (
          <p className="text-bronze-deep italic text-xs mt-2 px-1">暂无文档。上传后 Agent 就能按需读取并帮你整理。</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {docs.map((d: AgentDoc) => (
              <li key={d.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bronze/8">
                <span className="flex-1 min-w-0 font-serif text-sm text-paper truncate">{d.name}</span>
                <span className="font-mono text-[9px] text-bronze-deep flex-none">{d.content.length} 字</span>
                <button onClick={() => deleteAgentDoc(d.id)} className="text-bronze hover:text-wine-bright flex-none" aria-label="删除文档">
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 记忆馆 */}
      <section>
        <h3 className="font-mono text-[11px] tracking-widest text-bronze-deep uppercase mb-2 flex items-center gap-1.5">
          <Brain size={12} strokeWidth={1.6} /> 记忆馆
          <span className="font-mono text-[9px] normal-case text-bronze-deep/70">（Agent 自写 · [[忆:标题]] 读取）</span>
        </h3>
        {memories.length === 0 ? (
          <p className="text-bronze-deep italic text-xs mt-2 px-1">暂无记忆。Agent 遇到值得长期记住的信息会用 [[记:标题]] 自动写入。</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {memories.map((m) => (
              <li key={m.id} className="px-2.5 py-2 rounded-lg bg-bronze/8">
                <button
                  onClick={() => setExpandedMem(expandedMem === m.id ? null : m.id)}
                  className="w-full text-left flex items-center gap-2"
                >
                  <span className="flex-1 min-w-0 font-serif text-sm text-paper truncate">{m.title}</span>
                  <span className="font-mono text-[9px] text-bronze-deep flex-none">{relativeTime(m.createdAt)}</span>
                </button>
                {expandedMem === m.id && (
                  <div className="mt-2 pt-2 border-t border-bronze/10">
                    <p className="font-serif text-xs text-paper/80 whitespace-pre-wrap" style={{ lineHeight: 1.7 }}>
                      {m.content}
                    </p>
                    <div className="flex justify-end gap-3 mt-2">
                      <button
                        onClick={() => void navigator.clipboard.writeText(m.content).then(() => showToast('已复制', 'success'))}
                        className="text-bronze hover:text-candle"
                        aria-label="复制记忆"
                      >
                        <Copy size={12} strokeWidth={1.5} />
                      </button>
                      <button onClick={() => deleteAgentMemory(m.id)} className="text-bronze hover:text-wine-bright" aria-label="删除记忆">
                        <Trash2 size={12} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 归档 */}
      <section>
        <h3 className="font-mono text-[11px] tracking-widest text-bronze-deep uppercase mb-2">归档会话（{archived.length}）</h3>
        {archived.length === 0 ? (
          <p className="text-bronze-deep italic text-xs mt-2 px-1">没有已归档的会话。</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {archived.map((s) => (
              <li key={s.id} className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-bronze/8">
                <span className="flex-1 min-w-0 font-serif text-sm text-paper truncate">{s.title}</span>
                <button onClick={() => { updateAgentSession(s.id, { archived: false }); showToast('已恢复会话', 'success'); }} className="text-bronze hover:text-candle flex-none" aria-label="恢复" title="恢复">
                  <ArchiveRestore size={13} strokeWidth={1.5} />
                </button>
                <button onClick={() => renameArchived(s.id)} className="text-bronze hover:text-candle flex-none" aria-label="重命名" title="重命名">
                  <Pencil size={12} strokeWidth={1.5} />
                </button>
                <button onClick={() => exportArchived(s.id)} className="text-bronze hover:text-candle flex-none" aria-label="导出" title="导出 txt">
                  <Download size={13} strokeWidth={1.5} />
                </button>
                <button
                  onClick={() => { if (confirm(`删除会话「${s.title}」？`)) { deleteAgentSession(s.id); if (sessionId === s.id) setAgentSessionId(null); } }}
                  className="text-bronze hover:text-wine-bright flex-none"
                  aria-label="删除"
                >
                  <Trash2 size={12} strokeWidth={1.5} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
