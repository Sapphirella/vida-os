import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Download,
  Send,
  Square,
  Copy,
  RefreshCw,
  Trash2,
  X,
  Loader2,
  Pencil,
  ImagePlus,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { applyReplace, cancelReplace, type PendingReplace } from '@/lib/agentTools';
import { MarkdownView } from '@/components/common/MarkdownView';
import { MediaImage } from '@/components/common/MediaImage';
import { saveText, formatDate, clsx } from '@/lib/utils';
import { copyText } from '@/lib/clipboard';
import { deleteFile } from '@/lib/db';
import { storeImage } from '@/lib/media';
// 逐轮回复的实现已抽到 lib/agentTurn.ts（与馆藏「共读」抽屉共用），
// 这里只留这个组件自己还要用的几个（导出 / 人设默认值）
import { hasApiConfig, sessionToTxt } from '@/lib/agentEngine';
import { runAgentTurn } from '@/lib/agentTurn';
import type { AgentMessage } from '@/types';

/**
 * 是否窄屏（< 640px）。只用来切换输入框提示语的长度。
 * 用 matchMedia 而不是读一次 window.innerWidth：旋转屏幕 / 分屏时
 * 宽度会变，只在挂载时读一次会拿到过期的值。
 */
function useNarrowScreen(): boolean {
  const [narrow, setNarrow] = useState(() => window.matchMedia('(max-width: 639px)').matches);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return narrow;
}

export function AgentChatView({ sessionId }: { sessionId: string }) {
  const session = useAppStore((s) => s.agentSessions.find((x) => x.id === sessionId));
  const config = useAppStore((s) => s.agentConfig);
  const updateAgentSession = useAppStore((s) => s.updateAgentSession);
  const setAgentSessionId = useUIStore((s) => s.setAgentSessionId);
  const showModal = useUIStore((s) => s.showModal);
  const showToast = useUIStore((s) => s.showToast);

  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamMsgId, setStreamMsgId] = useState<string | null>(null);
  /** Agent 提出的查找替换，等用户确认后才落盘 */
  const [pendingReplace, setPendingReplace] = useState<PendingReplace | null>(null);
  const stopRef = useRef<AbortController | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const imgFileRef = useRef<HTMLInputElement>(null);
  const [imgBusy, setImgBusy] = useState(false);
  /** 已选待发图片（压缩入库，等文字输入后随消息一并发送） */
  const [picked, setPicked] = useState<{ id: string; url: string | null }[]>([]);
  /** 窄屏：输入框提示语要缩短，见下面 placeholder 处的注释 */
  const narrow = useNarrowScreen();

  const messages = session?.messages ?? [];
  const isStreamingThis = (m: AgentMessage) => m.id === streamMsgId && streaming;

  // 新消息滚到底部。
  // ⚠️ 依赖里必须带**最后一条的正文长度**：流式内容是用 replaceAgentMessage 逐块写进去的，
  // messages.length 全程不变，只盯条数的话整个流式期间这个 effect 都不会重跑，
  // 长回复会一路长到屏幕外、用户得手动追（v4.7.11 修）。
  const lastMsgLen = messages.length ? (messages[messages.length - 1].content?.length ?? 0) : 0;
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, lastMsgLen, streamMsgId, streaming]);

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
          // 查找替换要用户点头才生效，这里接住 Agent 的替换提案弹确认卡
          onPendingReplace: (p) => setPendingReplace(p),
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
          // Agent 的图是发给模型看的，不需要原图（省空间）
          const { id } = await storeImage(file, { name: file.name });
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
    // 必须走 copyText：直接调 navigator.clipboard 在明文 http（局域网 IP
    // 访问）下是 undefined，会一律提示「复制失败」。见 lib/clipboard.ts
    const ok = await copyText(m.content);
    showToast(ok ? '已复制' : '复制失败', ok ? 'success' : 'error');
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
      {/* 头部：返回 + 标题 + 操作 —— 随 flex 流定位，不再 fixed。
          渲染在全局 TopBar 之下，故不重复 safe-top；左右方向兜底横屏刘海。 */}
      <div
        className="flex-none z-30 border-b border-bronze/10 safe-left safe-right"
        style={{
          background: 'var(--bar-bg)',
          backdropFilter: 'blur(20px) saturate(140%)',
          WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        }}
      >
        <div className="max-w-5xl mx-auto h-11 px-2 sm:px-4 flex items-center gap-1.5 min-w-0">
          <button
            onClick={() => setAgentSessionId(null)}
            className="flex items-center gap-0.5 h-8 px-1.5 rounded-lg text-bronze hover:text-candle transition-colors flex-none"
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
            <Pencil
              size={11}
              strokeWidth={1.5}
              className="text-bronze-deep opacity-0 group-hover:opacity-100 transition-opacity"
            />
          </button>
          <span
            className={clsx(
              'font-mono text-[9px] tracking-widest px-2 py-0.5 rounded-pill flex-none',
              apiMode ? 'text-[color:var(--find-fg)] bg-wine/20' : 'text-bronze-deep bg-bronze/10',
            )}
          >
            {apiMode ? 'API' : '演示'}
          </span>
          {/* v4.5.3：顶栏减法。
              v4.5.4 用户反馈：溢出菜单里的「记忆馆」和「全部会话与配置」都要先退回
              会话页才能生效，交互绕且功能重复 —— 整个菜单下线，顶栏只留返回 / 标题 / 导出。
              记忆馆与配置统一在 Agent 页的「配置」入口里管理。 */}
          <button
            onClick={exportTxt}
            className="w-9 h-9 flex-none flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="导出会话"
            title="导出为 txt"
          >
            <Download size={16} strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {/* 消息流 —— flex-1 自动占满剩余空间，scroll 内部 */}
      <div
        ref={logRef}
        className="flex-1 min-h-0 overflow-y-auto safe-left safe-right"
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
              <div key={m.id} className="flex justify-end">
                {/* v4.5.3：操作区移出气泡，并改为常态可见
                    —— 原来塞在气泡内部且 opacity-0 + group-hover，
                       手机没有 hover，复制/删除在移动端完全点不到 */}
                <div className="max-w-[86%] sm:max-w-[75%] flex flex-col items-end">
                  <div
                    className="rounded-2xl rounded-br-md px-3.5 py-2.5"
                    style={{
                      background: 'var(--wine)',
                      boxShadow: '0 2px 10px rgba(0,0,0,0.14)',
                    }}
                  >
                    <UserBubbleContent text={m.content} />
                  </div>
                  <MsgActions
                    time={formatDate(m.createdAt, 'HH:mm')}
                    tone="bubble"
                    onCopy={() => void copyMsg(m)}
                    onDelete={() => delMsg(m)}
                  />
                </div>
              </div>
            ) : (
              <div key={m.id}>
                <div className="max-w-[92%] sm:max-w-[85%] min-w-0">
                  {!m.content && isStreamingThis(m) ? (
                    <StreamingStatus />
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
                    <MsgActions
                      time={formatDate(m.createdAt, 'HH:mm')}
                      tone="plain"
                      onCopy={() => void copyMsg(m)}
                      onRegen={streaming ? undefined : () => regen(m)}
                      onDelete={() => delMsg(m)}
                    />
                  )}
                </div>
              </div>
            ),
          )}
        </div>
      </div>

      {/* 查找替换确认卡：Agent 改了用户内容之前必须先过这一关。
          这是「写入能力」和「用户控制权」之间的闸门 —— 不点确认就不落盘。 */}
      {pendingReplace && (
        <div className="flex-none z-30 px-3 sm:px-6 pb-2 safe-left safe-right">
          <div
            className="mx-auto max-w-2xl rounded-card overflow-hidden"
            style={{ border: '1px solid var(--agent-accent-line)', background: 'var(--card-bg-elevated)' }}
          >
            <div
              className="px-3.5 py-2.5 flex items-center gap-2"
              style={{ background: 'var(--agent-accent-soft)' }}
            >
              <AlertTriangle size={15} strokeWidth={1.6} style={{ color: 'var(--agent-accent)' }} />
              <span className="font-serif text-sm font-semibold" style={{ color: 'var(--headline)' }}>
                Agent 想改一处内容
              </span>
            </div>
            <div className="px-3.5 py-3 space-y-2.5">
              <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-bronze)' }}>
                在「{pendingReplace.targetTitle}」里把
                <span className="font-mono px-1 mx-0.5 rounded" style={{ color: 'var(--wine-bright)' }}>
                  {pendingReplace.from.slice(0, 18)}
                  {pendingReplace.from.length > 18 ? '…' : ''}
                </span>
                替换成
                <span className="font-mono px-1 mx-0.5 rounded" style={{ color: 'var(--agent-accent)' }}>
                  {pendingReplace.to.slice(0, 18)}
                  {pendingReplace.to.length > 18 ? '…' : ''}
                </span>
                ，共 {pendingReplace.count} 处。
              </p>
              {pendingReplace.dropsMarks && (
                <p
                  className="font-sans text-[11px] leading-relaxed px-2.5 py-2 rounded-card"
                  style={{ background: 'var(--agent-accent-soft)', color: 'var(--text-bronze)' }}
                >
                  <AlertTriangle size={11} strokeWidth={1.8} className="inline -mt-px mr-1" />
                  {typeof pendingReplace.marksDropped === 'number' ? (
                    pendingReplace.marksDropped === 0 ? (
                      <>
                        这本书里有 {pendingReplace.marksKept} 处划线 / 高亮，改动后原文都还对得上，
                        <span className="text-candle">会原样保留</span>。
                      </>
                    ) : (
                      <>
                        这本书里有{' '}
                        <span className="text-candle">
                          {(pendingReplace.marksKept ?? 0) + pendingReplace.marksDropped} 处
                        </span>
                        划线 / 高亮：对得上原文的 {pendingReplace.marksKept} 处会保留，
                        另外 {pendingReplace.marksDropped} 处的原文正好被这次改动改掉了、无法定位，
                        会被移除（改完会把是哪几句告诉你，能照着重新划）。
                      </>
                    )
                  ) : (
                    <>这次改动会重排正文，书里原有的划线可能对不上位置，改完后会逐条核对。</>
                  )}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const r = applyReplace(pendingReplace.id);
                    showToast(r.message, r.ok ? 'success' : 'error');
                    // 落盘结果同时记一条 sys 消息：toast 几秒就没了，而「这次改动移除了
                    // 哪几条划线」是用户之后可能要照着重新划的依据，得留在会话里
                    // （写书/其它工具的落盘结果本来也是这么记的）。
                    if (r.ok) {
                      useAppStore.getState().appendAgentMessage(sessionId, { role: 'sys', content: r.message });
                    }
                    setPendingReplace(null);
                  }}
                  className="btn-primary flex-1 justify-center"
                  style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                >
                  <Check size={14} strokeWidth={1.8} /> 确认替换
                </button>
                <button
                  onClick={() => {
                    cancelReplace(pendingReplace.id);
                    showToast('已取消，没有改动任何内容', 'info');
                    setPendingReplace(null);
                  }}
                  className="btn-ghost"
                  style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 底部输入区 —— flex-none 贴底，随容器流定位。
          safe-left/right：横屏刘海在侧面时，输入框与发送键不会被切掉。
          底部间距交给 main 的 pb-[calc(80px+env(safe-area-inset-bottom))] 让位底栏。 */}
      <div className="flex-none z-30 px-3 sm:px-6 pb-2 safe-left safe-right">
        <div
          className="vd-composer mx-auto max-w-2xl rounded-card px-3 py-2.5"
          style={{
            // 输入区走专用变量：猩红书房下只有这一块（和配置页的输入框）变深色，
            // 面板/卡片仍用 --agent-panel-bg
            background: 'var(--agent-composer-bg)',
            border: '1px solid var(--agent-panel-border)',
          }}
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
              /* 窄屏放不下「（Enter 发送 / Shift+Enter 换行）」，整句折成两行
                 撑高输入框、盖住发送键（用户实拍）。窄屏只留前半句，
                 回车即发送是手机上唯一可能的操作，不需要提示。 */
              placeholder={
                streaming ? 'Agent 正在回复…' : narrow ? '和 Agent 说点什么…' : '和 Agent 说点什么…（Enter 发送 / Shift+Enter 换行）'
              }
              disabled={streaming}
              className="vd-composer-input flex-1 min-w-0 resize-none font-serif text-reading outline-none py-1"
              style={{ lineHeight: 1.6, maxHeight: 140, color: 'var(--text-paper)', caretColor: 'var(--caret)' }}
            />
            {streaming ? (
              <button
                onClick={stop}
                className="w-9 h-9 flex-none flex items-center justify-center rounded-full transition-all"
                style={{ background: 'var(--agent-send-bg)' }}
                aria-label="停止生成"
              >
                <Square size={13} strokeWidth={2} style={{ color: 'var(--agent-send-fg)' }} />
              </button>
            ) : (
              <button
                onClick={send}
                disabled={!input.trim() && picked.length === 0}
                className="w-9 h-9 flex-none flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                style={{ background: 'var(--agent-send-bg)' }}
                aria-label="发送"
              >
                <Send size={15} strokeWidth={1.6} style={{ color: 'var(--agent-send-fg)' }} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* v4.5.3：配置 / 记忆馆 / 归档 已整体上提到 Agent 页（AgentConfigPage），
          聊天页不再挂右侧抽屉 —— 与 Agent 页入口重复，且顶栏已减到 3 个控件。 */}
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

/* ============================================================
 *  v4.5.3：消息操作区
 *  常驻可见（40% 透明度，悬停升到 85%）—— 不再依赖 group-hover。
 *  这是功能性修复：手机没有 hover，opacity-0 意味着复制/重生成/删除在移动端不可达。
 * ============================================================ */
function MsgActions({
  time,
  tone,
  onCopy,
  onRegen,
  onDelete,
}: {
  time: string;
  /** bubble = 用户消息（时间与按钮靠右排）；plain = Agent 消息（靠左排） */
  tone: 'bubble' | 'plain';
  onCopy: () => void;
  onRegen?: () => void;
  onDelete: () => void;
}) {
  const [hover, setHover] = useState(false);
  const dim = 0.4;
  const lit = 0.88;
  const alpha = hover ? lit : dim;
  const timeColor = tone === 'bubble' ? 'var(--text-ash)' : 'var(--text-ash)';

  return (
    <div
      className={clsx(
        'flex items-center gap-3 mt-1.5 transition-opacity duration-200',
        tone === 'bubble' ? 'justify-end pl-1' : 'justify-start pl-1',
      )}
      style={{ opacity: alpha }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <span className="font-mono text-[10px] tracking-wider" style={{ color: timeColor }}>
        {time}
      </span>
      {/* 操作按钮：p-2.5 撑出 32×32 的命中区，-m-2.5 把外边距原样还回去 ——
          命中区从 12×12 变成 32×32（手机可点区域下限是 44，这里受限于
          三个按钮并排的密集排布取折中），而占位与视觉完全不变。 */}
      <button
        onClick={onCopy}
        className="-m-2.5 p-2.5 transition-colors"
        style={{ color: hover ? 'var(--candle)' : 'var(--text-bronze)' }}
        aria-label="复制"
        title="复制"
      >
        <Copy size={12} strokeWidth={1.6} />
      </button>
      {onRegen && (
        <button
          onClick={onRegen}
          className="-m-2.5 p-2.5 transition-colors"
          style={{ color: hover ? 'var(--candle)' : 'var(--text-bronze)' }}
          aria-label="重新生成"
          title="重新生成"
        >
          <RefreshCw size={12} strokeWidth={1.6} />
        </button>
      )}
      <button
        onClick={onDelete}
        className="-m-2.5 p-2.5 transition-colors"
        style={{ color: hover ? 'var(--wine-bright)' : 'var(--text-bronze)' }}
        aria-label="删除"
        title="删除"
      >
        <Trash2 size={12} strokeWidth={1.6} />
      </button>
    </div>
  );
}

/* ============================================================
 *  v4.5.3：流式状态
 *  原来只有三个弹跳点，信息量为零。改成「旋转图标 + 状态文案」，
 *  告诉用户 Agent 此刻在做什么，而不是让它干等着。
 * ============================================================ */
function StreamingStatus() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), 2600);
    return () => window.clearInterval(id);
  }, []);

  const STEPS = [
    '正在思考…',
    '正在检索资料馆…',
    '正在组织语言…',
    '正在写下来…',
  ];
  const label = STEPS[tick % STEPS.length];

  return (
    <div
      className="flex items-center gap-2 py-1.5"
      style={{ color: 'var(--candle)' }}
      role="status"
      aria-live="polite"
    >
      <Loader2 size={13} strokeWidth={1.8} className="animate-spin flex-none" />
      <span className="font-sans text-xs" style={{ color: 'var(--text-bronze)' }}>
        {label}
      </span>
    </div>
  );
}

