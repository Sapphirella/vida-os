// Agent 配置页（v4.5.3）
// 从「点进会话 → 点配置按钮 → 右侧抽屉」上提到 Agent 页独立入口。
//
// 为什么这样改：所有会话共享同一套 API 设置 / 人设 / 资料库 / 记忆馆，
// 之前藏在单条会话里既难找，语义上也说不通（这不是"这条会话的配置"）。
//
// UI 重做要点（对应「配置页边界不清晰、字色区分度弱」）：
//   1. 每个分区是一张独立卡片，卡片有实色描边 + 圆角，分区之间不再靠空行分隔
//   2. 标题层级用 --headline（主文字色），不再是 --text-bronze-deep（灰褐色）
//   3. 每个输入框都有常驻 label，不再只靠 placeholder 提示
//   4. 运行模式（API / 演示）用实色状态条，一眼看出当前状态
//   5. 空状态有独立容器，不再是一行灰色斜体
import { useRef, useState } from 'react';
import {
  Plug,
  Unplug,
  Loader2,
  FileUp,
  Brain,
  Archive,
  ArchiveRestore,
  Download,
  Trash2,
  Pencil,
  Copy,
  ChevronLeft,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { hasApiConfig, DOC_MAX_BYTES, sessionToTxt } from '@/lib/agentEngine';
import { saveText, errMsg, relativeTime, clsx } from '@/lib/utils';
import type { AgentDoc, AgentMemory } from '@/types';

/* ============================================================
 *  基础组件
 * ============================================================ */

/** 分区卡片：实色描边 + 明确边界，替代原来"一串 section 靠空行分隔" */
function Section({
  icon,
  title,
  desc,
  action,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  desc?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      className="rounded-card overflow-hidden"
      style={{ border: '1px solid var(--card-border)', background: 'var(--card-bg)' }}
    >
      {/* 卡片头：实色底条 + 强对比标题 */}
      <div
        className="flex items-center gap-2.5 px-4 py-3"
        style={{ borderBottom: '1px solid var(--card-border)', background: 'var(--charcoal)' }}
      >
        <span
          className="w-7 h-7 flex items-center justify-center rounded-lg flex-none"
          style={{ background: 'var(--agent-accent-soft)', color: 'var(--agent-accent)' }}
        >
          {icon}
        </span>
        <div className="flex-1 min-w-0">
          <h3
            className="font-serif font-semibold leading-tight"
            style={{ color: 'var(--headline)' }}
          >
            {title}
          </h3>
          {desc && (
            <p className="font-sans text-xs leading-snug mt-0.5" style={{ color: 'var(--text-bronze)' }}>
              {desc}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

/** 带常驻 label 的输入框（原来全靠 placeholder，无 label） */
function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span
        className="font-mono text-[10px] tracking-widest uppercase block mb-1.5"
        style={{ color: 'var(--text-bronze)' }}
      >
        {label}
      </span>
      {children}
      {hint && (
        <span className="block font-sans text-[11px] leading-snug mt-1" style={{ color: 'var(--text-ash)' }}>
          {hint}
        </span>
      )}
    </label>
  );
}

const inputCls =
  'w-full px-3 py-2.5 rounded-card font-serif text-sm outline-none transition-colors';
const inputStyle: React.CSSProperties = {
  color: 'var(--paper)',
  background: 'rgb(var(--ink-rgb) / 0.28)',
  border: '1px solid var(--card-border)',
};

/** 空状态：独立容器 + 边框，不再是一行灰字 */
function Empty({ text, action }: { text: string; action?: React.ReactNode }) {
  return (
    <div
      className="rounded-card px-4 py-5 text-center"
      style={{ border: '1px dashed var(--card-border)', background: 'rgb(var(--bronze-rgb) / 0.05)' }}
    >
      <p className="font-sans text-xs leading-relaxed" style={{ color: 'var(--text-bronze)' }}>
        {text}
      </p>
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

/** 列表行：统一结构，标题与次要信息分层 */
function Row({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children?: React.ReactNode;
}) {
  return (
    <li
      className="flex items-center gap-2 px-3 py-2.5 rounded-card"
      style={{ background: 'rgb(var(--bronze-rgb) / 0.1)', border: '1px solid var(--card-border)' }}
    >
      <div className="flex-1 min-w-0">
        <div className="font-serif text-sm truncate" style={{ color: 'var(--paper)' }}>
          {title}
        </div>
        {meta && (
          <div className="font-mono text-[10px] mt-0.5" style={{ color: 'var(--text-ash)' }}>
            {meta}
          </div>
        )}
      </div>
      {children && <div className="flex items-center gap-1.5 flex-none">{children}</div>}
    </li>
  );
}

/** 行内小图标按钮 */
function MiniBtn({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors"
      style={{ color: danger ? 'var(--wine-bright)' : 'var(--text-bronze)' }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'rgb(var(--bronze-rgb) / 0.16)';
        e.currentTarget.style.color = danger ? 'var(--wine-bright)' : 'var(--candle)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent';
        e.currentTarget.style.color = danger ? 'var(--wine-bright)' : 'var(--text-bronze)';
      }}
    >
      {children}
    </button>
  );
}

/* ============================================================
 *  主体
 * ============================================================ */

export function AgentConfigPage({ onBack }: { onBack: () => void }) {
  const config = useAppStore((s) => s.agentConfig);
  const docs = useAppStore((s) => s.agentDocs);
  const memories = useAppStore((s) => s.agentMemories);
  const sessions = useAppStore((s) => s.agentSessions);
  const updateAgentConfig = useAppStore((s) => s.updateAgentConfig);
  const addAgentDoc = useAppStore((s) => s.addAgentDoc);
  const deleteAgentDoc = useAppStore((s) => s.deleteAgentDoc);
  const deleteAgentMemory = useAppStore((s) => s.deleteAgentMemory);
  const markAgentMemoriesRead = useAppStore((s) => s.markAgentMemoriesRead);
  const updateAgentSession = useAppStore((s) => s.updateAgentSession);
  const deleteAgentSession = useAppStore((s) => s.deleteAgentSession);
  const showModal = useUIStore((s) => s.showModal);
  const showToast = useUIStore((s) => s.showToast);
  const confirmDialog = useUIStore((s) => s.confirmDialog);

  const [testing, setTesting] = useState(false);
  const [docsBusy, setDocsBusy] = useState(false);
  const [expandedMem, setExpandedMem] = useState<string | null>(null);
  const docFileRef = useRef<HTMLInputElement>(null);

  const apiMode = hasApiConfig(config);
  const archived = sessions.filter((s) => s.archived).sort((a, b) => b.updatedAt - a.updatedAt);

  // 进入配置页即把记忆标记为已读（原来是在聊天页点开面板时才标记）
  if (memories.some((m) => !m.read)) markAgentMemoriesRead();

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
    <div className="flex-1 min-h-0 flex flex-col view-enter">
      {/* 顶部：返回 + 标题。
          注意不要加 safe-top —— 本页渲染在全局 TopBar 之下，
          main 已经用 pt-[calc(56px+env(safe-area-inset-top))] 把刘海区让掉了，
          这里再加一次会变成双重内边距。左右方向加 safe-* 兜底横屏刘海。 */}
      <div
        className="flex-none z-30 safe-left safe-right"
        style={{ background: 'var(--bar-bg)', borderBottom: '1px solid var(--card-border)' }}
      >
        <div className="max-w-2xl mx-auto h-12 px-3 flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-9 h-9 -ml-1 flex items-center justify-center rounded-lg transition-colors flex-none"
            style={{ color: 'var(--text-bronze)' }}
            aria-label="返回会话列表"
          >
            <ChevronLeft size={20} strokeWidth={1.6} />
          </button>
          {/* 标题用 text-base 而非 text-title：text-title(1.5rem) 在 48px 顶栏里
              行高会把「Agent 配置」顶到被上一层的全局 TopBar 压住 */}
          <div className="flex-1 min-w-0">
            <h2
              className="font-serif text-base leading-none truncate"
              style={{ color: 'var(--headline)' }}
            >
              Agent 配置
            </h2>
            <p
              className="font-mono text-[10px] tracking-widest uppercase leading-none mt-1.5"
              style={{ color: 'var(--text-ash)' }}
            >
              所有会话共享
            </p>
          </div>
        </div>
      </div>

      {/* 内容 */}
      <div
        className="flex-1 min-h-0 overflow-y-auto safe-left safe-right"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div className="max-w-2xl mx-auto px-3 sm:px-4 py-4 space-y-4 pb-10">

          {/* 运行模式状态条：实色，一眼看出当前状态 */}
          <div
            className="rounded-card px-3.5 py-3 flex items-center gap-2.5"
            style={{
              border: `1px solid ${apiMode ? 'var(--agent-accent-line)' : 'var(--card-border)'}`,
              background: apiMode ? 'var(--agent-accent-soft)' : 'rgb(var(--bronze-rgb) / 0.08)',
            }}
          >
            <span
              className="w-2 h-2 rounded-full flex-none"
              style={{
                background: apiMode ? 'var(--agent-accent)' : 'var(--bronze)',
                boxShadow: apiMode ? '0 0 8px var(--agent-accent)' : 'none',
              }}
            />
            <div className="min-w-0 flex-1">
              <div className="font-serif text-sm font-semibold" style={{ color: 'var(--headline)' }}>
                {apiMode ? '真实 API 模式' : '演示模式'}
              </div>
              <div className="font-sans text-[11px] leading-snug mt-0.5" style={{ color: 'var(--text-bronze)' }}>
                {apiMode
                  ? '对话会发送必要上下文到下方填写的服务，API Key 仅存本机。'
                  : '使用内置回复，无需配置任何东西。想接入自己的模型请在下方填写连接。'}
              </div>
            </div>
          </div>

          {/* 连接 */}
          <Section
            icon={<Plug size={14} strokeWidth={1.7} />}
            title="连接"
            desc="接入你自己的模型服务"
          >
            <div className="space-y-3">
              <Field label="Base URL" hint="形如 https://api.openai.com">
                <input
                  value={config.baseUrl}
                  onChange={(e) => updateAgentConfig({ baseUrl: e.target.value })}
                  placeholder="https://api.openai.com"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <Field label="API Key" hint="只保存在本机，不会上传到任何服务器">
                <input
                  value={config.apiKey}
                  onChange={(e) => updateAgentConfig({ apiKey: e.target.value })}
                  placeholder="sk-..."
                  type="password"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <Field label="模型名" hint="填写服务商提供的模型标识">
                <input
                  value={config.model}
                  onChange={(e) => updateAgentConfig({ model: e.target.value })}
                  placeholder="gpt-4o-mini"
                  className={inputCls}
                  style={inputStyle}
                />
              </Field>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={testConnection}
                  disabled={testing}
                  className="btn-primary flex-1 justify-center"
                  style={{ padding: '9px 12px', fontSize: '0.8125rem' }}
                >
                  {testing ? <Loader2 size={13} className="animate-spin" /> : <Plug size={13} />}
                  自检连接
                </button>
                {apiMode && (
                  <button
                    onClick={() => {
                      updateAgentConfig({ baseUrl: '', apiKey: '', model: '' });
                      showToast('已清除连接，回到演示模式', 'info');
                    }}
                    className="btn-ghost"
                    style={{ padding: '9px 12px', fontSize: '0.8125rem' }}
                  >
                    <Unplug size={13} /> 清除
                  </button>
                )}
              </div>
            </div>
          </Section>

          {/* 人格 */}
          <Section
            icon={<Pencil size={14} strokeWidth={1.7} />}
            title="人格 / System Prompt"
            desc="给 Agent 设定它的说话方式与身份"
          >
            <textarea
              value={config.persona}
              onChange={(e) => updateAgentConfig({ persona: e.target.value })}
              rows={5}
              placeholder="留空使用默认人格：能读馆藏与资料库、可聊天可整理。"
              className={clsx(inputCls, 'resize-none')}
              style={{ ...inputStyle, lineHeight: 1.75 }}
            />
            <div className="flex gap-2 mt-3">
              <label className="btn-ghost cursor-pointer" style={{ padding: '7px 12px', fontSize: '0.8125rem' }}>
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
          </Section>

          {/* 资料库 */}
          <Section
            icon={<FileUp size={14} strokeWidth={1.7} />}
            title="资料库"
            desc={`${docs.length} 份 · 对话里用 [[读:文档名]] 按需读取`}
          >
            <input
              ref={docFileRef}
              type="file"
              accept=".md,.txt,.json,.yaml,text/markdown,text/plain,application/json"
              multiple
              hidden
              onChange={(e) => {
                void uploadDocs(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => docFileRef.current?.click()}
              disabled={docsBusy}
              className="btn-ghost w-full justify-center mb-3"
              style={{ padding: '9px 12px', fontSize: '0.8125rem' }}
            >
              {docsBusy ? <Loader2 size={13} className="animate-spin" /> : <FileUp size={13} />}
              上传文档（.md / .txt / .json / .yaml，≤400KB）
            </button>
            {docs.length === 0 ? (
              <Empty text="还没有文档。上传后 Agent 就能按需读取并帮你整理。" />
            ) : (
              <ul className="space-y-1.5">
                {docs.map((d: AgentDoc) => (
                  <Row key={d.id} title={d.name} meta={`${d.content.length} 字`}>
                    <MiniBtn label="删除文档" danger onClick={() => deleteAgentDoc(d.id)}>
                      <Trash2 size={13} strokeWidth={1.5} />
                    </MiniBtn>
                  </Row>
                ))}
              </ul>
            )}
          </Section>

          {/* 记忆馆 */}
          <Section
            icon={<Brain size={14} strokeWidth={1.7} />}
            title="记忆馆"
            desc={`${memories.length} 条 · Agent 自动写入，对话里用 [[忆:标题]] 读取`}
          >
            {memories.length === 0 ? (
              <Empty text="还没有记忆。Agent 遇到值得长期记住的信息会自动写入。" />
            ) : (
              <ul className="space-y-1.5">
                {memories.map((m: AgentMemory) => (
                  <li key={m.id}>
                    <div
                      className="rounded-card overflow-hidden"
                      style={{ background: 'rgb(var(--bronze-rgb) / 0.1)', border: '1px solid var(--card-border)' }}
                    >
                      <button
                        onClick={() => setExpandedMem(expandedMem === m.id ? null : m.id)}
                        className="w-full text-left flex items-center gap-2 px-3 py-2.5"
                      >
                        <span className="flex-1 min-w-0 font-serif text-sm truncate" style={{ color: 'var(--paper)' }}>
                          {m.title}
                        </span>
                        <span className="font-mono text-[10px] flex-none" style={{ color: 'var(--text-ash)' }}>
                          {relativeTime(m.createdAt)}
                        </span>
                        <span
                          className={clsx(
                            'flex-none transition-transform',
                            expandedMem === m.id && 'rotate-180',
                          )}
                          style={{ color: 'var(--text-bronze)' }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </span>
                      </button>
                      {expandedMem === m.id && (
                        <div
                          className="px-3 pb-3 pt-1"
                          style={{ borderTop: '1px solid var(--card-border)' }}
                        >
                          <p
                            className="font-serif text-xs whitespace-pre-wrap"
                            style={{ color: 'var(--text-paper)', lineHeight: 1.75 }}
                          >
                            {m.content}
                          </p>
                          <div className="flex justify-end gap-1.5 mt-2.5">
                            <MiniBtn
                              label="复制记忆"
                              onClick={() =>
                                void navigator.clipboard
                                  .writeText(m.content)
                                  .then(() => showToast('已复制', 'success'))
                              }
                            >
                              <Copy size={13} strokeWidth={1.5} />
                            </MiniBtn>
                            <MiniBtn label="删除记忆" danger onClick={() => deleteAgentMemory(m.id)}>
                              <Trash2 size={13} strokeWidth={1.5} />
                            </MiniBtn>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          {/* 归档 */}
          <Section
            icon={<Archive size={14} strokeWidth={1.7} />}
            title="归档会话"
            desc={`${archived.length} 个已归档`}
          >
            {archived.length === 0 ? (
              <Empty text="没有已归档的会话。" />
            ) : (
              <ul className="space-y-1.5">
                {archived.map((s) => (
                  <Row key={s.id} title={s.title} meta={relativeTime(s.updatedAt)}>
                    <MiniBtn
                      label="恢复"
                      onClick={() => {
                        updateAgentSession(s.id, { archived: false });
                        showToast('已恢复会话', 'success');
                      }}
                    >
                      <ArchiveRestore size={13} strokeWidth={1.5} />
                    </MiniBtn>
                    <MiniBtn label="重命名" onClick={() => renameArchived(s.id)}>
                      <Pencil size={13} strokeWidth={1.5} />
                    </MiniBtn>
                    <MiniBtn
                      label="导出 txt"
                      onClick={() =>
                        void saveText(
                          sessionToTxt(s.title, s.messages),
                          `Agent-${s.title}.txt`,
                          'text/plain',
                        )
                      }
                    >
                      <Download size={13} strokeWidth={1.5} />
                    </MiniBtn>
                    <MiniBtn
                      label="删除"
                      danger
                      onClick={async () => {
                        if (await confirmDialog(`删除会话「${s.title}」？`)) {
                          deleteAgentSession(s.id);
                        }
                      }}
                    >
                      <Trash2 size={13} strokeWidth={1.5} />
                    </MiniBtn>
                  </Row>
                ))}
              </ul>
            )}
          </Section>

          <p className="font-sans text-[11px] text-center leading-relaxed px-4 pt-1" style={{ color: 'var(--text-ash)' }}>
            以上设置由所有会话共享，修改后立即对新对话生效。
          </p>
        </div>
      </div>
    </div>
  );
}
