// 馆藏 · 共读抽屉
// 选中一段正文 → 「问 AI」→ 从底部弹出本抽屉：挑一个 Agent 会话（或新建「共读 · 书名」），
// 把这段引用发进去继续聊。阅读位置不丢，回来接着读。
//
// 与 Agent 会话页共用 lib/agentTurn.ts 的同一套回复流程（流式 + 记忆 + 工具标记），
// 所以「共读」里的行为和你平时在 Agent 页聊天完全一致，只是入口不同。
import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Send, Plus, StopCircle, Bot, MessageSquareQuote, ChevronLeft } from 'lucide-react';
import { MarkdownView } from '@/components/common/MarkdownView';
import { useAppStore } from '@/stores/useAppStore';
import { runAgentTurn } from '@/lib/agentTurn';
import { GREETING } from '@/lib/agentEngine';
import { excerpt, formatDate, plainText } from '@/lib/utils';
import type { AgentMessage, LibraryBook } from '@/types';

interface Props {
  book: LibraryBook;
  /** 本次要引用的原文（空字符串表示只是打开抽屉聊天） */
  quote: string;
  onClose: () => void;
  /** 引用已经带进输入框，父组件清掉它免得重复引用 */
  onQuoteConsumed: () => void;
}

export function CoreadDrawer({ book, quote, onClose, onQuoteConsumed }: Props) {
  const sessions = useAppStore((s) => s.agentSessions);
  const createAgentSession = useAppStore((s) => s.createAgentSession);
  const appendAgentMessage = useAppStore((s) => s.appendAgentMessage);
  const updateBook = useAppStore((s) => s.updateBook);

  const hasApi = useAppStore((s) => !!s.agentConfig.baseUrl);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [picking, setPicking] = useState(true);
  const [input, setInput] = useState(quote);
  const [streaming, setStreaming] = useState(false);
  const [streamMsgId, setStreamMsgId] = useState<string | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

  const active = sessions.find((s) => s.id === sessionId) ?? null;
  const messages = active?.messages ?? [];

  // 打开时续上本书上次用的会话（还在的话）
  useEffect(() => {
    if (book.coreadSessionId && sessions.some((s) => s.id === book.coreadSessionId)) {
      setSessionId(book.coreadSessionId);
      setPicking(false);
    }
  }, [book.coreadSessionId, sessions]);

  // 引用被带进来后通知父组件清空（输入框里已经有一份了）
  useEffect(() => {
    if (quote) onQuoteConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streamMsgId, picking]);

  const activeSessions = useMemo(
    () => sessions.filter((s) => !s.archived).sort((a, b) => b.updatedAt - a.updatedAt),
    [sessions],
  );

  const startNew = () => {
    const id = createAgentSession(`共读 · ${book.title}`);
    appendAgentMessage(id, { role: 'assistant', content: GREETING, greet: true });
    updateBook(book.id, { coreadSessionId: id });
    setSessionId(id);
    setPicking(false);
  };

  const pick = (id: string) => {
    updateBook(book.id, { coreadSessionId: id });
    setSessionId(id);
    setPicking(false);
  };

  const send = async () => {
    if (!sessionId || streaming) return;
    const question = input.trim();
    if (!question && !quote) return;
    // 引用以 Markdown 引用块的形式进消息：既显示得清楚，也留在会话历史里
    const content = quote
      ? `> 引自《${book.title}》：\n> ${quote.replace(/\n/g, '\n> ')}\n\n${question || '请解释这一段。'}`
      : question;
    appendAgentMessage(sessionId, { role: 'user', content });
    setInput('');
    onQuoteConsumed();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setStreaming(true);
    setStreamMsgId(null);
    try {
      await runAgentTurn({
        sessionId,
        userText: question || quote,
        signal: ctrl.signal,
        onAssistantCreated: setStreamMsgId,
      });
    } finally {
      setStreaming(false);
      setStreamMsgId(null);
      ctrlRef.current = null;
    }
  };

  return (
    <>
      {/* 遮罩：点空白处收起 */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.42)' }}
        onClick={onClose}
      />
      <div
        className="fixed inset-x-0 bottom-0 z-50 max-h-[76vh] flex flex-col rounded-t-card border-t border-bronze/15"
        style={{ background: 'var(--card-bg-elevated)', backdropFilter: 'blur(18px) saturate(140%)' }}
      >
        {/* 头部 */}
        <div className="flex-none flex items-center gap-2 px-4 py-3 border-b border-bronze/10">
          <MessageSquareQuote size={15} strokeWidth={1.5} className="text-amber flex-none" />
          <div className="flex-1 min-w-0">
            <p className="font-serif text-title text-headline truncate">
              {active ? active.title : '共读'}
            </p>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase truncate">
              {active ? `《${book.title}》 · 已聊 ${messages.filter((m) => m.role === 'user').length} 句` : `选择要一起读《${book.title}》的会话`}
            </p>
          </div>
          {!picking && (
            <button
              onClick={() => setPicking(true)}
              className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="切换会话"
              title="切换会话"
            >
              <ChevronLeft size={16} strokeWidth={1.6} />
            </button>
          )}
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
            aria-label="收起"
          >
            <X size={16} strokeWidth={1.6} />
          </button>
        </div>

        {picking ? (
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3">
            <button
              onClick={startNew}
              className="w-full mb-2 flex items-center gap-2 px-3 py-2.5 rounded-card border border-wine/40 text-candle hover:bg-wine/15 transition-colors"
            >
              <Plus size={14} strokeWidth={1.8} />
              <span className="font-serif text-sm">新建共读会话（共读 · {book.title}）</span>
            </button>
            {activeSessions.length === 0 ? (
              <p className="text-bronze text-xs leading-relaxed px-1 py-2">
                还没有任何 Agent 会话。新建一个就能开始共读；也可以在 Agent 页先配好 API。
              </p>
            ) : (
              <ul className="space-y-1.5">
                {activeSessions.map((s) => {
                  const last = [...s.messages].reverse().find((m) => m.content && !m.greet);
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => pick(s.id)}
                        className="w-full text-left px-3 py-2.5 rounded-card border border-bronze/15 hover:border-wine/30 transition-colors"
                        style={{ background: 'var(--card-bg)' }}
                      >
                        <span className="flex items-center gap-2">
                          <Bot size={13} strokeWidth={1.5} className="text-bronze flex-none" />
                          <span className="font-serif text-sm text-headline truncate">{s.title}</span>
                          {s.id === book.coreadSessionId && (
                            <span className="font-mono text-[9px] tracking-widest text-amber flex-none">
                              本次共读
                            </span>
                          )}
                        </span>
                        <span className="block font-serif text-[11px] text-bronze truncate mt-0.5">
                          {last ? excerpt(plainText(last.content).replace(/\s+/g, ' '), 48) : '空白会话'}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        ) : (
          <>
            <div ref={logRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">
              {messages.length === 0 && (
                <p className="text-bronze text-xs leading-relaxed">
                  在下方输入框里问点什么，或者回到正文选中一段再点「问 AI」。
                </p>
              )}
              {messages.map((m: AgentMessage) => {
                if (m.role === 'sys') {
                  return (
                    <div key={m.id} className="flex justify-center">
                      <span className="px-2.5 py-1 rounded-pill text-[10px] font-mono tracking-wider text-bronze-deep bg-bronze/10">
                        {m.content}
                      </span>
                    </div>
                  );
                }
                if (m.role === 'user') {
                  return (
                    <div key={m.id} className="flex justify-end">
                      <div className="max-w-[85%] min-w-0">
                        <div
                          className="rounded-2xl rounded-br-md px-3.5 py-2.5"
                          style={{ background: 'var(--wine)' }}
                        >
                          <MarkdownView markdown={m.content} className="prose-vidaos" />
                        </div>
                        <span className="block text-right font-mono text-[10px] tracking-wider text-bronze-deep mt-1">
                          {formatDate(m.createdAt, 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[92%] min-w-0">
                      <div className="flex items-start gap-0.5">
                        <MarkdownView markdown={m.content} className="agent-reply" />
                        {streaming && m.id === streamMsgId && (
                          <span
                            className="inline-block w-[2px] self-stretch mt-1 animate-pulse flex-none"
                            style={{ background: 'var(--caret)' }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 引用预览 */}
            {quote && (
              <div className="flex-none px-3">
                <div
                  className="rounded-card border-l-2 border-amber px-3 py-2 mb-1"
                  style={{ background: 'rgba(201,160,99,0.10)' }}
                >
                  <p className="font-mono text-[9px] tracking-widest text-amber uppercase mb-1">
                    引用 · 《{book.title}》
                  </p>
                  <p className="font-serif text-[12px] text-paper line-clamp-3 leading-relaxed">
                    {quote}
                  </p>
                </div>
              </div>
            )}

            {/* 输入区 */}
            <div className="flex-none px-3 pb-3 pt-1">
              <div
                className="flex items-end gap-2 rounded-card border border-bronze/15 px-3 py-2"
                style={{ background: 'var(--editor-bar-bg)' }}
              >
                <textarea
                  value={input}
                  rows={1}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder={quote ? '想就这一段问点什么？' : '和 AI 聊聊这本书…（Enter 发送）'}
                  className="flex-1 min-w-0 bg-transparent resize-none font-serif text-reading text-paper placeholder:text-bronze-deep outline-none py-1.5"
                  style={{ lineHeight: 1.6, maxHeight: 120 }}
                />
                {streaming ? (
                  <button
                    onClick={() => ctrlRef.current?.abort()}
                    className="w-9 h-9 flex-none flex items-center justify-center rounded-full"
                    style={{ background: 'var(--wine-deep)' }}
                    aria-label="停止"
                  >
                    <StopCircle size={16} strokeWidth={1.6} className="text-moon" />
                  </button>
                ) : (
                  <button
                    onClick={() => void send()}
                    disabled={!input.trim() && !quote}
                    className="w-9 h-9 flex-none flex items-center justify-center rounded-full disabled:opacity-30"
                    style={{ background: 'var(--wine)' }}
                    aria-label="发送"
                  >
                    <Send size={16} strokeWidth={1.6} className="text-moon" />
                  </button>
                )}
              </div>
              <p className="mt-1.5 font-mono text-[9px] tracking-wider text-bronze-deep">
                {hasApi ? '已连接你的 API' : '未配置 API 时走演示模式'}
              </p>
            </div>
          </>
        )}
      </div>
    </>
  );
}
