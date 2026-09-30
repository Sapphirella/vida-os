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
  ImagePlus,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MarkdownView } from '@/components/common/MarkdownView';
import { MediaImage } from '@/components/common/MediaImage';
import { saveText, formatDate, relativeTime, clsx, errMsg, compressImage, uid } from '@/lib/utils';
import { putFile, deleteFile } from '@/lib/db';
// 逐轮回复的实现已抽到 lib/agentTurn.ts（与馆藏「共读」抽屉共用），
// 这里只留这个组件自己还要用的几个（自检连通性 / 导出 / 资料库上传大小限制）
import { hasApiConfig, sessionToTxt, DOC_MAX_BYTES } from '@/lib/agentEngine';
import { runAgentTurn } from '@/lib/agentTurn';
import type { AgentMessage, AgentDoc } from '@/types';

export function AgentChatView({ sessionId }: { sessionId: string }) {
  const session = useAppStore((s) => s.agentSessions.find((x) => x.id === sessionId));
  const config = useAppStore((s) => s.agentConfig);
  const memories = useAppStore((s) => s.agentMemories);
  const updateAgentSession = useAppStore((s) => s.updateAgentSession);
  const addAgentDoc = useAppStore((s) => s.addAgentDoc);
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
  const imgFileRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);
  /** 已选待发图片（压缩入库，等文字输入后随消息一并发送） */
  const [picked, setPicked] = useState<{ id: string; url: string | null }[]>([]);

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

  /** 执行一轮回复（流式 + 记忆写入 + 工具标记循环）
   *  具体流程抽在 lib/agentTurn.ts —— 与馆藏阅读器的「共读」抽屉共用同一份实现，
   *  避免两处各写一份走样。这里只负责 UI 状态（流式光标、停止按钮）。 */
  const runTurn = useCallback(
    async (userText: string, replaceMsgId?: string) => {
      const ctrl = new AbortController();
      stopRef.current = ctrl;
      setStreaming(true);
      try {
        await runAgentTurn({
          sessionId,
          userText,
          replaceMsgId,
          signal: ctrl.signal,
          onAssistantCreated: setStreamMsgId,
        });
      } finally {
        setStreaming(false);
        setStreamMsgId(null);
        stopRef.current = null;
      }
    },
    [sessionId],
  );

  const sendContent = (text: string, imgMarkdown?: string) => {
    const content = [text, imgMarkdown].filter(Boolean).join('\n\n');
    if (!content || streaming) return;
    setInput('');
    setPicked([]);
    const st = useAppStore.getState();
    st.appendAgentMessage(sessionId, { role: 'user', content });
    // 自动命名会话
    const sess = st.agentSessions.find((x) => x.id === sessionId);
    if (sess && (sess.title === '' || sess.title === '新会话')) {
      const titleText = text || (imgMarkdown ? '[图片]' : '');
      st.updateAgentSession(sessionId, {
        title: titleText.length > 20 ? `${titleText.slice(0, 20)}…` : titleText,
      });
    }
    requestAnimationFrame(() => {
      const ta = taRef.current;
      if (ta) {
        ta.focus();
        ta.style.height = 'auto';
      }
    });
    void runTurn(content);
  };

  const send = () => {
    const text = input.trim();
    const imgMarkdown = picked.map((p) => `![图片](fileRef:${p.id})`).join('\n');
    sendContent(text, imgMarkdown || undefined);
  };

  /** 图片按钮：选图只压缩入库进入待发区，等文字输完随消息一并发送；
   *  不支持图片识别的模型会自行略过图片标记 */
  const pickImages = async (files: FileList | null) => {
    if (!files?.length || streaming) return;
    setImgBusy(true);
    try {
      const ids: string[] = [];
      for (const file of Array.from(files).slice(0, 9 - picked.length)) {
        try {
          const blob = await compressImage(file);
          const id = uid('img_');
          await putFile({ id, blob, mime: 'image/jpeg', name: file.name, size: blob.size });
          ids.push(id);
        } catch {
          showToast(`「${file.name}」处理失败，已跳过`, 'error');
        }
      }
      if (ids.length === 0) return;
      const add: { id: string; url: string | null }[] = ids.map((id) => ({ id, url: null }));
      setPicked((prev) => [...prev, ...add].slice(0, 9));
      // 异步取缩略图 URL 回填
      void Promise.all(
        ids.map(async (id) => {
          const { fileURL } = await import('@/lib/fileUrl');
          const u = await fileURL(id);
          if (u) setPicked((prev) => prev.map((p) => (p.id === id ? { ...p, url: u } : p)));
        }),
      );
    } finally {
      setImgBusy(false);
    }
  };

  /** 移除待发图片（还没发送，从库中一并删掉，不留垃圾文件） */
  const removePicked = (id: string) => {
    setPicked((prev) => prev.filter((p) => p.id !== id));
    void deleteFile(id);
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

  const delMsg = async (m: AgentMessage) => {
    if (await useUIStore.getState().confirmDialog('删除这条消息？')) {
      useAppStore.getState().removeAgentMessage(sessionId, m.id);
    }
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
    } catch (e) {
      showToast(`连接失败：${errMsg(e)}`, 'error');
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
    <div className="flex-1 min-h-0 flex flex-col">
      {/* 头部：返回 + 标题 + 操作 —— 随 flex 流定位，不再 fixed */}
      <div
        className="flex-none z-30 border-b border-bronze/10"
        style={{
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

      {/* 消息流 —— flex-1 自动占满剩余空间，scroll 内部 */}
      <div
        ref={logRef}
        className="flex-1 min-h-0 overflow-y-auto"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-6 space-y-4 pb-6">
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
                  <UserBubbleContent text={m.content} />
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

      {/* 底部输入区 —— flex-none 贴底，随容器流定位 */}
      <div className="flex-none z-30 px-3 sm:px-6 pb-2">
        <div
          className="mx-auto max-w-2xl rounded-card border border-bronze/15 px-3 py-2.5 shadow-card-elevated"
          style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(20px) saturate(140%)' }}
        >
          {/* 待发图片条：选图后先停在这里，等文字输完一起发送 */}
          {picked.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-1.5 -mx-0.5 px-0.5">
              {picked.map((p) => (
                <div
                  key={p.id}
                  className="relative w-11 h-11 flex-none rounded-lg overflow-hidden border border-bronze/20"
                  onClick={() => useUIStore.getState().setLightbox({ fileId: p.id, starTag: 'album' })}
                >
                  {p.url ? (
                    <div
                      className="absolute inset-0 bg-no-repeat bg-cover bg-center"
                      style={{ backgroundImage: `url("${p.url}")` }}
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'var(--charcoal)' }}>
                      <Loader2 size={13} className="animate-spin text-bronze" />
                    </div>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePicked(p.id);
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-moon border border-moon/20"
                    style={{ background: 'var(--wine-deep)' }}
                    aria-label="移除这张图片"
                  >
                    <X size={9} strokeWidth={2.2} />
                  </button>
                </div>
              ))}
              <span className="flex-none font-mono text-[9px] text-bronze-deep pl-1">
                {picked.length}/9 张，随文字一同发送
              </span>
            </div>
          )}
          <div className="flex items-end gap-2">
            {/* 图片按钮：压缩后随文字一并发送；不支持图片识别的模型自动略过 */}
            <input
              ref={imgFileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void pickImages(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => imgFileRef.current?.click()}
              disabled={streaming || imgBusy || picked.length >= 9}
              className="w-9 h-9 flex-none flex items-center justify-center rounded-full text-bronze hover:text-candle transition-colors disabled:opacity-30"
              aria-label="附带图片"
              title="附带图片：选图后先停在输入区，随文字一同发送（不支持图片识别的模型会自动略过）"
            >
              {imgBusy ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={17} strokeWidth={1.6} />}
            </button>
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
                disabled={!input.trim() && picked.length === 0}
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

const IMG_MARK_RE = /^!\[([^\]]*)\]\((fileRef:[^)]+)\)$/;

/** 用户消息内容：文字段落 + 图片标记渲染为缩略图（点击放大） */
function UserBubbleContent({ text }: { text: string }) {
  const setLightbox = useUIStore((s) => s.setLightbox);
  const parts = text.split(/(!\[[^\]]*\]\(fileRef:[^)]+\))/g).filter(Boolean);
  return (
    <div className="space-y-0.5">
      {parts.map((part, i) => {
        const m = IMG_MARK_RE.exec(part);
        if (m) {
          const fileId = m[2].slice('fileRef:'.length);
          return (
            <MediaImage
              key={i}
              fileId={fileId}
              className="mt-1.5 w-full max-w-[220px] aspect-square object-cover rounded-card border border-moon/20"
              onOpen={() => setLightbox({ fileId, starTag: 'album' })}
            />
          );
        }
        return (
          <p
            key={i}
            className="font-serif text-reading text-moon whitespace-pre-wrap break-words"
            style={{ lineHeight: 1.65 }}
          >
            {part}
          </p>
        );
      })}
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
          placeholder="给 Agent 设定一个人格（可选）。留空使用默认人格：能读馆藏与资料库、可聊天可整理。"
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
                  onClick={async () => { if (await useUIStore.getState().confirmDialog(`删除会话「${s.title}」？`)) { deleteAgentSession(s.id); if (sessionId === s.id) setAgentSessionId(null); } }}
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
