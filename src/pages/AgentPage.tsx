import { useState } from 'react';
import { Plus, Archive, ArchiveRestore, Download, Trash2, ChevronDown, Bot, Sparkles } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { AgentChatView } from '@/components/agent/AgentChatView';
import { GREETING } from '@/lib/agentEngine';
import { plainText, excerpt, relativeTime, saveText, clsx } from '@/lib/utils';
import { sessionToTxt } from '@/lib/agentEngine';
import type { AgentSession } from '@/types';

export function AgentPage() {
  const sessions = useAppStore((s) => s.agentSessions);
  const createAgentSession = useAppStore((s) => s.createAgentSession);
  const appendAgentMessage = useAppStore((s) => s.appendAgentMessage);
  const updateAgentSession = useAppStore((s) => s.updateAgentSession);
  const deleteAgentSession = useAppStore((s) => s.deleteAgentSession);
  const agentSessionId = useUIStore((s) => s.agentSessionId);
  const setAgentSessionId = useUIStore((s) => s.setAgentSessionId);
  const showToast = useUIStore((s) => s.showToast);
  const [showArchived, setShowArchived] = useState(false);

  const current = sessions.find((s) => s.id === agentSessionId);
  if (current) return <AgentChatView sessionId={current.id} />;

  const active = sessions
    .filter((s) => !s.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  const archived = sessions
    .filter((s) => s.archived)
    .sort((a, b) => b.updatedAt - a.updatedAt);

  const newSession = () => {
    const id = createAgentSession();
    appendAgentMessage(id, { role: 'assistant', content: GREETING, greet: true });
    setAgentSessionId(id);
  };

  const previewOf = (s: AgentSession) => {
    const last = [...s.messages].reverse().find((m) => m.content);
    if (!last) return '空白会话';
    return excerpt(plainText(last.content).replace(/\s+/g, ' '), 60);
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border border-bronze/20 flex-none"
            style={{ background: 'rgba(106, 8, 14, 0.15)' }}
          >
            <Bot size={20} strokeWidth={1.4} className="text-wine-light" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-headline text-lg leading-tight">会话</h2>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
              多会话 · 可整理可聊天 · 全本地
            </p>
          </div>
          <button
            onClick={newSession}
            className="btn-primary flex items-center gap-1.5"
            style={{ padding: '9px 16px' }}
          >
            <Plus size={15} strokeWidth={1.8} /> 新建会话
          </button>
        </div>

        {active.length === 0 ? (
          <div className="py-20 flex flex-col items-center text-center gap-4">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center border border-bronze/20"
              style={{ background: 'rgba(106, 8, 14, 0.15)' }}
            >
              <Sparkles size={22} strokeWidth={1.4} className="text-wine-light" />
            </div>
            <p className="font-serif text-headline text-xl">和 Agent 聊点什么</p>
            <p className="text-bronze text-sm leading-relaxed max-w-xs">
              它可以帮你整理馆藏与资料、生成文章，也能聊生活、学习和身边的事。数据只存在本机。
            </p>
            <button onClick={newSession} className="btn-primary">
              <Plus size={14} strokeWidth={1.6} /> 开启第一个会话
            </button>
          </div>
        ) : (
          <ul className="space-y-2.5">
            {active.map((s) => (
              <li key={s.id}>
                <div
                  onClick={() => setAgentSessionId(s.id)}
                  className="group rounded-card border border-bronze/15 px-4 py-3.5 cursor-pointer transition-all hover:scale-[1.005] hover:border-wine/30"
                  style={{ background: 'var(--card-bg)' }}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-serif text-title text-headline truncate">{s.title}</span>
                        {s.messages.some((m) => m.greet) && (
                          <span className="font-mono text-[9px] tracking-widest text-bronze-deep bg-bronze/10 px-1.5 py-0.5 rounded-pill flex-none">
                            新
                          </span>
                        )}
                      </div>
                      <p className="font-serif text-xs text-bronze truncate mt-0.5">
                        {previewOf(s)}
                      </p>
                    </div>
                    <div className="flex-none flex items-center gap-2">
                      <span className="font-mono text-[10px] text-bronze-deep">
                        {relativeTime(s.updatedAt)}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateAgentSession(s.id, { archived: true });
                          showToast('已归档', 'info');
                        }}
                        className="w-7 h-7 flex items-center justify-center text-bronze opacity-0 group-hover:opacity-100 hover:text-candle transition-all"
                        aria-label="归档会话"
                        title="归档"
                      >
                        <Archive size={14} strokeWidth={1.5} />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {archived.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowArchived((v) => !v)}
              className="flex items-center gap-1.5 text-bronze hover:text-candle transition-colors"
            >
              <ChevronDown
                size={14}
                strokeWidth={1.6}
                className={clsx('transition-transform', showArchived && 'rotate-180')}
              />
              <span className="font-mono text-[11px] tracking-widest uppercase">
                已归档（{archived.length}）
              </span>
            </button>
            {showArchived && (
              <ul className="mt-3 space-y-2">
                {archived.map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center gap-2 rounded-card border border-bronze/10 px-3 py-2.5"
                    style={{ background: 'var(--card-bg)' }}
                  >
                    <div className="flex-1 min-w-0">
                      <span className="font-serif text-sm text-headline truncate block">{s.title}</span>
                      <span className="font-mono text-[10px] text-bronze-deep">{relativeTime(s.updatedAt)}</span>
                    </div>
                    <button
                      onClick={() => {
                        updateAgentSession(s.id, { archived: false });
                        showToast('已恢复会话', 'success');
                      }}
                      className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
                      aria-label="恢复"
                      title="恢复"
                    >
                      <ArchiveRestore size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => void saveText(sessionToTxt(s.title, s.messages), `Agent-${s.title}.txt`, 'text/plain')}
                      className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
                      aria-label="导出"
                      title="导出 txt"
                    >
                      <Download size={14} strokeWidth={1.5} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`删除会话「${s.title}」？此操作不可恢复。`)) {
                          deleteAgentSession(s.id);
                          showToast('已删除', 'info');
                        }
                      }}
                      className="w-7 h-7 flex items-center justify-center text-bronze hover:text-wine-bright"
                      aria-label="删除"
                      title="删除"
                    >
                      <Trash2 size={14} strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
