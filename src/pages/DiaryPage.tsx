import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Star,
  Send,
  X,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  FileText,
  Search,
  ImagePlus,
} from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MarkdownView } from '@/components/common/MarkdownView';
import { MediaImage } from '@/components/common/MediaImage';
import { usePageFind } from '@/components/search/usePageFind';
import { PageFindBar } from '@/components/search/PageFindBar';
import { useGlobalFocus } from '@/lib/focusRequest';
import { putFile } from '@/lib/db';
import { compressImage, uid, formatDate, todayKey, clsx } from '@/lib/utils';
import type { FragmentEntry } from '@/types';

/** 碎片按天分组的时间线日期标签（与动态页一致） */
function dateLabel(key: string): string {
  const today = todayKey();
  if (key === today) return '今天';
  const d = new Date();
  d.setDate(d.getDate() - 1);
  if (key === todayKey(d)) return '昨天';
  const [y, m, dd] = key.split('-');
  return `${Number(m)} 月 ${Number(dd)} 日${y !== String(new Date().getFullYear()) ? ` · ${y}` : ''}`;
}

function dayKeyOf(ts: number): string {
  return formatDate(ts, 'YYYY-MM-DD');
}

/** 从正文里解析 #标签（中文、字母数字均可，不含空格） */
function parseTags(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/#([^\s#，。！？、,.!?]+)/g)) {
    const t = m[1].trim();
    if (t && !/^\d+$/.test(t)) out.add(t);
  }
  return Array.from(out).slice(0, 6);
}

export function DiaryPage() {
  const navigate = useNavigate();
  const fragments = useAppStore((s) => s.fragments);
  const addFragment = useAppStore((s) => s.addFragment);
  const updateFragment = useAppStore((s) => s.updateFragment);
  const deleteFragment = useAppStore((s) => s.deleteFragment);
  const toggleFragmentStar = useAppStore((s) => s.toggleFragmentStar);
  const addArticle = useAppStore((s) => s.addArticle);
  const showToast = useUIStore((s) => s.showToast);

  const [text, setText] = useState('');
  const [pendingImages, setPendingImages] = useState<string[]>([]);
  const [starredOnly, setStarredOnly] = useState(false);
  const [menuFor, setMenuFor] = useState<FragmentEntry | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pressTimer = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => (starredOnly ? fragments.filter((f) => f.starred) : fragments),
    [fragments, starredOnly],
  );
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => a.createdAt - b.createdAt),
    [filtered],
  );

  // 分组：按天
  const groups = useMemo(() => {
    const out: { key: string; items: FragmentEntry[] }[] = [];
    for (const f of sorted) {
      const k = dayKeyOf(f.createdAt);
      const last = out[out.length - 1];
      if (last && last.key === k) last.items.push(f);
      else out.push({ key: k, items: [f] });
    }
    return out;
  }, [sorted]);

  // 页内查找：碎片即目标（title 为空，只匹配正文）
  const targets = useMemo(
    () =>
      sorted.map((f) => ({
        id: f.id,
        title: '',
        content: f.content,
        replaceContent: (next: string) => updateFragment(f.id, { content: next }),
      })),
    [sorted, updateFragment],
  );
  const find = usePageFind<HTMLUListElement>(targets, {
    onToast: (msg, type) => showToast(msg, type),
  });
  useGlobalFocus('fragment', undefined, () => find.listRef.current);

  // 新碎片 / 首次进入滚到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [fragments.length]);

  // 空态自动聚焦
  useEffect(() => {
    if (fragments.length === 0) taRef.current?.focus();
  }, [fragments.length]);

  const autosize = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
  };

  const handlePickImages = async (files: FileList | null) => {
    if (!files) return;
    const list = Array.from(files).slice(0, 6 - pendingImages.length);
    for (const file of list) {
      try {
        const blob = await compressImage(file, 1600, 0.82);
        const id = uid('fimg_');
        await putFile({ id, blob, mime: blob.type || 'image/jpeg', name: file.name, size: blob.size });
        setPendingImages((p) => [...p, id]);
      } catch {
        showToast('图片处理失败', 'error');
      }
    }
  };

  const send = () => {
    const content = text.trim();
    if (!content && pendingImages.length === 0) return;
    addFragment({ content, imageIds: pendingImages, tags: parseTags(content) });
    setText('');
    setPendingImages([]);
    requestAnimationFrame(() => {
      taRef.current?.focus();
      autosize();
    });
  };

  const startEdit = (f: FragmentEntry) => {
    setMenuFor(null);
    setEditingId(f.id);
    setEditDraft(f.content);
  };

  const saveEdit = (f: FragmentEntry) => {
    const next = editDraft.trim();
    if (!next) {
      deleteFragment(f.id);
      showToast('已删除空碎片', 'info');
    } else {
      updateFragment(f.id, { content: next, tags: parseTags(next) });
      showToast('已更新', 'success');
    }
    setEditingId(null);
  };

  const copyFragment = async (f: FragmentEntry) => {
    setMenuFor(null);
    try {
      await navigator.clipboard.writeText(f.content || '（无文字内容）');
      showToast('已复制', 'success');
    } catch {
      showToast('复制失败', 'error');
    }
  };

  const toArticle = (f: FragmentEntry) => {
    setMenuFor(null);
    const firstLine = f.content
      .split('\n')
      .map((s) => s.trim())
      .find(Boolean);
    const title =
      (firstLine ? firstLine.replace(/^#+\s*/, '') : '').slice(0, 24) ||
      `碎片 · ${dateLabel(dayKeyOf(f.createdAt))}`;
    const id = addArticle({ title, content: f.content, tags: f.tags, imageIds: [] });
    showToast(`已转为文章「${title}」`, 'success');
    navigate(`/space/article/${id}`);
  };

  const longPressProps = (f: FragmentEntry) => ({
    onPointerDown: () => {
      pressTimer.current = window.setTimeout(() => setMenuFor(f), 500);
    },
    onPointerUp: () => {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    },
    onPointerLeave: () => {
      if (pressTimer.current) {
        window.clearTimeout(pressTimer.current);
        pressTimer.current = null;
      }
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      setMenuFor(f);
    },
  });

  return (
    <div className="flex-1 min-h-0 flex flex-col px-3 sm:px-6">
      <div className="max-w-2xl mx-auto w-full flex-1 min-h-0 flex flex-col">
        <PageFindBar find={find} />

        {/* 工具行：只看星标 + 查找替换 */}
        <div className="pb-3 flex items-center gap-2 flex-none">
          <button
            onClick={() => setStarredOnly((v) => !v)}
            className={clsx(
              'px-2.5 py-1 rounded-pill text-[11px] font-mono tracking-wider transition-colors flex items-center gap-1',
              starredOnly
                ? 'text-[color:var(--find-fg)] bg-wine/30'
                : 'text-[color:var(--find-fg-dim)] hover:text-[color:var(--find-fg)] bg-bronze/10',
            )}
          >
            <Star size={11} strokeWidth={1.6} className={starredOnly ? 'fill-current' : ''} />
            只看星标
          </button>
          <button
            onClick={() => find.toggleOpen()}
            className="px-2.5 py-1 rounded-pill text-[11px] font-mono tracking-wider transition-colors flex items-center gap-1 text-[color:var(--find-fg-dim)] hover:text-[color:var(--find-fg)] bg-bronze/10"
          >
            <Search size={11} strokeWidth={1.6} />
            查找替换
          </button>
          <span className="flex-1" />
          <span className="font-mono text-[10px] text-bronze-deep tracking-wider">
            {starredOnly ? `${sorted.length} 条星标` : `共 ${fragments.length} 条`}
          </span>
        </div>

        {/* 消息流 —— flex-1 自动占满 */}
        {fragments.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center gap-3 min-h-0 overflow-y-auto">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center border border-bronze/20"
              style={{ background: 'rgba(106, 8, 14, 0.15)' }}
            >
              <Star size={18} strokeWidth={1.4} className="text-wine-light" />
            </div>
            <p className="font-serif text-headline text-lg">今天想说点什么？</p>
            <p className="text-bronze text-sm leading-relaxed max-w-xs">
              像发微信一样记录此刻——碎片会按时间排成一条流，之后随时可以整理。
            </p>
          </div>
        ) : groups.length === 0 ? (
          <div className="flex-1 flex items-center justify-center min-h-0 overflow-y-auto">
            <p className="text-bronze italic text-sm">暂无星标碎片</p>
          </div>
        ) : (
          <ul
            ref={find.listRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-4 pb-4"
          >
            {groups.map((g) => (
              <li key={g.key}>
                <div className="flex justify-center mb-4">
                  <span className="px-3 py-1 rounded-pill text-[11px] font-mono tracking-widest text-bronze-deep bg-bronze/10">
                    {dateLabel(g.key)}
                  </span>
                </div>
                <ul className="space-y-2.5">
                  {g.items.map((f) =>
                    editingId === f.id ? (
                      <li key={f.id} className="flex justify-end">
                        <div className="w-full max-w-[92%] rounded-card border border-bronze/15 p-3"
                          style={{ background: 'var(--card-bg-elevated)' }}>
                          <textarea
                            autoFocus
                            value={editDraft}
                            onChange={(e) => setEditDraft(e.target.value)}
                            className="w-full bg-transparent resize-none font-serif text-reading text-paper outline-none"
                            rows={4}
                            style={{ lineHeight: 1.8 }}
                          />
                          <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-bronze/10">
                            <button onClick={() => setEditingId(null)} className="btn-text">
                              取消
                            </button>
                            <button onClick={() => saveEdit(f)} className="btn-primary">
                              保存
                            </button>
                          </div>
                        </div>
                      </li>
                    ) : (
                      <li key={f.id} {...find.findCardProps(f.id)} {...longPressProps(f)}>
                        <div className="flex justify-end group">
                          <div className="frag-bubble max-w-[86%] sm:max-w-[78%] rounded-2xl rounded-br-md px-3.5 py-2.5"
                            style={{ background: 'var(--wine)', boxShadow: '0 2px 10px rgba(0,0,0,0.14)' }}>
                            {f.content && (
                              <MarkdownView
                                markdown={f.content}
                                className="frag-prose"
                                htmlTransform={(h) => find.hl(h, f.id)}
                              />
                            )}
                            {f.imageIds.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {f.imageIds.map((id) => (
                                  <MediaImage
                                    key={id}
                                    fileId={id}
                                    alt="碎片图片"
                                    className="w-24 h-24 rounded-lg object-cover"
                                  />
                                ))}
                              </div>
                            )}
                            <div className="mt-1.5 flex items-center gap-2.5">
                              <span className="font-mono text-[10px] tracking-wider text-moon/70">
                                {formatDate(f.createdAt, 'HH:mm')}
                              </span>
                              {f.tags.length > 0 && (
                                <span className="font-mono text-[10px] tracking-wider text-moon/70 truncate">
                                  {f.tags.map((t) => `#${t}`).join(' ')}
                                </span>
                              )}
                              <span className="flex-1" />
                              <button
                                onClick={() => toggleFragmentStar(f.id)}
                                aria-label="星标"
                                className="text-moon/70 hover:text-moon transition-colors"
                              >
                                <Star
                                  size={12}
                                  strokeWidth={1.6}
                                  className={f.starred ? 'fill-current' : ''}
                                />
                              </button>
                              <button
                                onClick={() => setMenuFor(f)}
                                aria-label="更多操作"
                                className="text-moon/70 hover:text-moon transition-colors"
                              >
                                <MoreVertical size={12} strokeWidth={1.6} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </li>
                    ),
                  )}
                </ul>
              </li>
            ))}
            <div ref={bottomRef} />
          </ul>
        )}

        {/* 长按 / 更多操作菜单 */}
        {menuFor && (
          <>
            <div
              className="fixed inset-0 z-40"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => setMenuFor(null)}
            />
            <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom)+10px)] z-50 px-4 sm:px-6">
              <div
                className="mx-auto max-w-md rounded-card border border-bronze/15 p-2 animate-slide-up"
                style={{ background: 'var(--card-bg-elevated)' }}
              >
                <div className="grid grid-cols-4 gap-1">
                  <MenuBtn icon={Pencil} label="编辑" onClick={() => startEdit(menuFor)} />
                  <MenuBtn
                    icon={Star}
                    label={menuFor.starred ? '取消星标' : '星标'}
                    filled={menuFor.starred}
                    onClick={() => {
                      toggleFragmentStar(menuFor.id);
                      setMenuFor(null);
                      showToast(menuFor.starred ? '已取消星标' : '已星标 · 待整理', 'success');
                    }}
                  />
                  <MenuBtn icon={Copy} label="复制" onClick={() => void copyFragment(menuFor)} />
                  <MenuBtn
                    icon={FileText}
                    label="转为文章"
                    onClick={() => toArticle(menuFor)}
                  />
                  <MenuBtn
                    icon={Trash2}
                    label="删除"
                    danger
                    onClick={() => {
                      const f = menuFor;
                      setMenuFor(null);
                      if (confirm('删除这条碎片？')) {
                        deleteFragment(f.id);
                        showToast('已删除', 'info');
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {/* 底部输入区 —— flex-none 贴底 */}
        <div className="flex-none z-30 pb-2">
          <div
            className="mx-auto max-w-2xl rounded-card border border-bronze/15 px-3 py-2.5 shadow-card-elevated"
            style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(20px) saturate(140%)' }}
          >
            {pendingImages.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {pendingImages.map((id) => (
                  <div key={id} className="relative">
                    <MediaImage fileId={id} alt="待发送" className="w-14 h-14 rounded-lg object-cover" />
                    <button
                      onClick={() => setPendingImages((p) => p.filter((x) => x !== id))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-moon"
                      style={{ background: 'var(--wine-deep)' }}
                      aria-label="移除图片"
                    >
                      <X size={10} strokeWidth={2} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex items-end gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={(e) => {
                  void handlePickImages(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-9 h-9 flex-none flex items-center justify-center text-bronze hover:text-candle transition-colors"
                aria-label="添加图片"
              >
                <ImagePlus size={20} strokeWidth={1.5} />
              </button>
              <textarea
                ref={taRef}
                value={text}
                rows={1}
                onChange={(e) => {
                  setText(e.target.value);
                  autosize();
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    send();
                  }
                }}
                placeholder="碎片化记录此刻…（支持 [[双链]] 与 #标签）"
                className="flex-1 min-w-0 bg-transparent resize-none font-serif text-reading text-paper placeholder:text-bronze-deep outline-none py-1.5"
                style={{ lineHeight: 1.6, maxHeight: 160 }}
              />
              <button
                onClick={send}
                disabled={!text.trim() && pendingImages.length === 0}
                className="w-9 h-9 flex-none flex items-center justify-center rounded-full transition-all disabled:opacity-30"
                style={{ background: 'var(--wine)' }}
                aria-label="发送"
              >
                <Send size={16} strokeWidth={1.6} className="text-moon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MenuBtn({
  icon: Icon,
  label,
  onClick,
  danger,
  filled,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  danger?: boolean;
  filled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 py-3 rounded-lg transition-colors hover:bg-bronze/10"
    >
      <Icon
        size={17}
        strokeWidth={1.5}
        className={danger ? 'text-wine-bright' : filled ? 'text-candle fill-current' : 'text-candle'}
      />
      <span className={clsx('font-mono text-[10px] tracking-wider', danger ? 'text-wine-bright' : 'text-bronze')}>
        {label}
      </span>
    </button>
  );
}
