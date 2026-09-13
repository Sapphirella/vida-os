import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Star, MessageCircle, Trash2, Send, Search, X, ChevronUp, ChevronDown, Edit2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MarkdownView } from '@/components/common/MarkdownView';
import { formatDate, relativeTime, todayKey } from '@/lib/utils';
import { useGlobalFocus } from '@/lib/focusRequest';
import type { Profile } from '@/types';

/** 头像：有图用图，没有就用昵称首字 */
function Avatar({
  profile,
  size = 36,
  label,
}: {
  profile: Profile;
  size?: number;
  label?: string;
}) {
  const text = label || profile.name || '我';
  return (
    <div
      className="rounded-full overflow-hidden flex items-center justify-center flex-shrink-0 border border-line/60"
      style={{ width: size, height: size, background: 'var(--charcoal)' }}
    >
      {profile.avatarId ? (
        <MediaImage fileId={profile.avatarId} alt={text} className="w-full h-full object-cover" />
      ) : (
        <span className="font-serif text-candle" style={{ fontSize: size * 0.44 }}>
          {text.slice(0, 1)}
        </span>
      )}
    </div>
  );
}

const escapeReg = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** 只在标签之外把命中词包成 <mark>，避免破坏 Markdown 生成的 HTML */
function highlightHtml(html: string, query: string): string {
  if (!query.trim()) return html;
  const re = new RegExp(escapeReg(query.trim()), 'gi');
  return html.replace(/>([^<]*)</g, (_m, text: string) =>
    '>' + text.replace(re, (hit) => `<mark class="vd-mark">${hit}</mark>`) + '<',
  );
}

/** 时间线用的日期标签 */
function dateLabel(key: string): string {
  const today = todayKey();
  if (key === today) return '今天';
  const d = new Date();
  d.setDate(d.getDate() - 1);
  if (key === todayKey(d)) return '昨天';
  const [y, m, dd] = key.split('-');
  return `${Number(m)} 月 ${Number(dd)} 日${y !== String(new Date().getFullYear()) ? ` · ${y}` : ''}`;
}

export function MomentsPage() {
  const moments = useAppStore((s) => s.moments);
  const profile = useAppStore((s) => s.profile);
  const favorites = useAppStore((s) => s.favorites);
  const deleteMoment = useAppStore((s) => s.deleteMoment);
  const updateMoment = useAppStore((s) => s.updateMoment);
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const addMomentComment = useAppStore((s) => s.addMomentComment);
  const deleteMomentComment = useAppStore((s) => s.deleteMomentComment);
  const openEditor = useUIStore((s) => s.openEditor);
  const showToast = useUIStore((s) => s.showToast);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  // ── 查找 / 替换 ──
  const [findOpen, setFindOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [activeHit, setActiveHit] = useState(0);
  const marksRef = useRef<HTMLElement[]>([]);
  const listRef = useRef<HTMLDivElement>(null);

  const matchCount = useMemo(() => {
    const q = query.trim();
    if (!q) return 0;
    const re = new RegExp(escapeReg(q), 'gi');
    return moments.reduce((n, m) => n + (m.content.match(re)?.length ?? 0), 0);
  }, [moments, query]);

  // 命中数变化时回到第一条
  useEffect(() => {
    setActiveHit(0);
  }, [query]);

  // 每次渲染后收集高亮节点，并把当前命中滚进视野 + 标记为「当前」
  useEffect(() => {
    if (!listRef.current) return;
    marksRef.current = Array.from(listRef.current.querySelectorAll<HTMLElement>('mark.vd-mark'));
    marksRef.current.forEach((el, i) => el.classList.toggle('vd-mark-active', i === activeHit));
    const el = marksRef.current[activeHit];
    if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [activeHit, query, moments]);

  const step = (dir: 1 | -1) => {
    if (matchCount === 0) return;
    setActiveHit((i) => (i + dir + matchCount) % matchCount);
  };

  /** 替换当前这一条命中（按动态内容顺序定位第 activeHit 个命中） */
  const replaceCurrent = () => {
    const q = query.trim();
    if (!q || matchCount === 0) return;
    const re = new RegExp(escapeReg(q), 'gi');
    let seen = 0;
    for (const m of moments) {
      const hits = m.content.match(re)?.length ?? 0;
      if (activeHit < seen + hits) {
        const target = activeHit - seen;
        let i = -1;
        const next = m.content.replace(re, (hit) => {
          i += 1;
          return i === target ? replaceWith : hit;
        });
        updateMoment(m.id, { content: next });
        showToast('已替换 1 处', 'success');
        return;
      }
      seen += hits;
    }
  };

  const replaceAll = () => {
    const q = query.trim();
    if (!q || matchCount === 0) return;
    const re = new RegExp(escapeReg(q), 'gi');
    let n = 0;
    moments.forEach((m) => {
      if (!re.test(m.content)) return;
      re.lastIndex = 0;
      const next = m.content.replace(re, () => {
        n += 1;
        return replaceWith;
      });
      updateMoment(m.id, { content: next });
    });
    showToast(`已替换 ${n} 处`, 'success');
  };

  const isFav = (id: string) => favorites.some((f) => f.refType === 'moment' && f.refId === id);

  // 全局查找 → 动态：定位到对应卡片正文里的命中处
  useGlobalFocus(
    'moment',
    undefined,
    () => {
      const fr = useUIStore.getState().focusRequest;
      if (!fr) return null;
      const card = listRef.current?.querySelector<HTMLElement>(
        `[data-moment-id="${fr.id}"] .prose-vidaos`,
      );
      return card ?? null;
    },
  );

  const submitComment = (momentId: string) => {
    const text = (drafts[momentId] || '').trim();
    if (!text) return;
    addMomentComment(momentId, text);
    setDrafts((d) => ({ ...d, [momentId]: '' }));
  };

  // 时间线：按日期分组，日期变化处插入分隔标签
  const groups = useMemo(() => {
    const out: Array<{ date: string; items: typeof moments }> = [];
    for (const m of moments) {
      const key = todayKey(new Date(m.createdAt));
      const last = out[out.length - 1];
      if (last && last.date === key) last.items.push(m);
      else out.push({ date: key, items: [m] });
    }
    return out;
  }, [moments]);

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-6">
        {/* 工具行：搜索 */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            timeline · {moments.length} 条
          </p>
          <button
            onClick={() => setFindOpen((v) => !v)}
            aria-expanded={findOpen}
            className={`flex items-center gap-1.5 font-mono text-[11px] tracking-wider transition-colors ${
              findOpen ? 'text-amber' : 'text-bronze hover:text-candle'
            }`}
          >
            <Search size={14} strokeWidth={1.6} />
            查找替换
          </button>
        </div>

        {/* 查找/替换条 */}
        {findOpen && (
          <Card className="p-3 mb-3">
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    step(e.shiftKey ? -1 : 1);
                  } else if (e.key === 'Escape') {
                    setFindOpen(false);
                  }
                }}
                placeholder="查找…"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none"
                style={{ background: 'rgba(27,26,31,0.7)' }}
              />
              <span className="font-mono text-[10px] text-bronze-deep whitespace-nowrap">
                {matchCount ? `${activeHit + 1} / ${matchCount}` : '0'}
              </span>
              <button onClick={() => step(-1)} aria-label="上一个" className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle">
                <ChevronUp size={15} strokeWidth={1.6} />
              </button>
              <button onClick={() => step(1)} aria-label="下一个" className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle">
                <ChevronDown size={15} strokeWidth={1.6} />
              </button>
              <button onClick={() => { setQuery(''); setReplaceWith(''); }} aria-label="清空" className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle">
                <X size={14} strokeWidth={1.6} />
              </button>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <input
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                placeholder="替换为…"
                className="flex-1 min-w-0 px-3 py-1.5 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none"
                style={{ background: 'rgba(27,26,31,0.7)' }}
              />
              <button onClick={replaceCurrent} disabled={!matchCount} className="btn-ghost disabled:opacity-40">
                替换
              </button>
              <button onClick={replaceAll} disabled={!matchCount} className="btn-primary disabled:opacity-40">
                全部替换
              </button>
            </div>
          </Card>
        )}

        {moments.length === 0 ? (
          <EmptyState
            title="动态是生活的切片"
            hint="发一条此刻的心情"
            action={
              <button onClick={() => openEditor({ mode: 'moment', open: true })} className="btn-primary">
                <Plus size={14} strokeWidth={1.6} /> 写一条
              </button>
            }
          />
        ) : (
          /* 时间线：左侧竖线 + 节点 */
          <div className="relative pl-5 sm:pl-6" ref={listRef}>
            <div
              className="absolute top-2 bottom-2 w-px"
              style={{ left: 5, background: 'var(--line)', opacity: 0.5 }}
            />
            {groups.map((g) => (
              <section key={g.date}>
                {/* 日期分隔 */}
                <div className="relative mb-3 -ml-5 sm:-ml-6 pl-5 sm:pl-6">
                  <span
                    className="absolute rounded-full"
                    style={{ left: 0, top: 6, width: 11, height: 11, background: 'var(--amber)' }}
                  />
                  <p className="font-mono text-[10px] tracking-[0.2em] text-amber uppercase">
                    {dateLabel(g.date)}
                  </p>
                </div>

                <ul className="space-y-3 mb-2">
                  {g.items.map((m) => {
                    const comments = m.comments ?? [];
                    const fav = isFav(m.id);
                    const showComments = openComments[m.id] ?? false;
                    return (
                      <li key={m.id} className="relative">
                        {/* 时间线节点 */}
                        <span
                          className="absolute rounded-full -ml-5 sm:-ml-6"
                          style={{
                            left: 0,
                            top: 22,
                            width: 9,
                            height: 9,
                            background: 'var(--charcoal)',
                            border: '2px solid var(--bronze)',
                          }}
                        />
                        <Card className="p-4 sm:p-5 group">
                          {/* 作者：头像 + 昵称 + 时间 */}
                          <div className="flex items-center gap-3 mb-3">
                            <Avatar profile={profile} size={38} />
                            <div className="min-w-0 flex-1">
                              <p className="font-serif text-headline text-base leading-tight truncate-1">
                                {profile.name || '我'}
                              </p>
                              <p className="font-mono text-[10px] text-bronze-deep tracking-wider mt-0.5">
                                {relativeTime(m.createdAt)} · {formatDate(m.createdAt, 'HH:mm')}
                              </p>
                            </div>
                            <button
                              onClick={() =>
                                openEditor({ mode: 'moment', editingId: m.id, open: true })
                              }
                              aria-label="编辑动态"
                              title="编辑（可同时修改时间）"
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-all"
                            >
                              <Edit2 size={13} strokeWidth={1.5} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('删除该动态？')) {
                                  deleteMoment(m.id);
                                  showToast('已删除', 'success');
                                }
                              }}
                              aria-label="删除动态"
                              className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center text-bronze hover:text-wine-bright transition-all"
                            >
                              <Trash2 size={13} strokeWidth={1.5} />
                            </button>
                          </div>

                          {/* 正文：支持 Markdown；查找时高亮命中 */}
                          <div data-moment-id={m.id}>
                            <MarkdownView
                              markdown={m.content}
                              className="prose-moment"
                              htmlTransform={(h) => highlightHtml(h, query)}
                            />
                          </div>

                          {/* 配图 */}
                          {m.imageIds.length > 0 && (
                            <div
                              className={`mt-3 grid gap-1.5 ${
                                m.imageIds.length === 1
                                  ? 'grid-cols-1'
                                  : m.imageIds.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-3'
                              }`}
                            >
                              {m.imageIds.map((id, i) => (
                                <div
                                  key={id}
                                  className="rounded-card overflow-hidden border border-line/50"
                                  style={{ aspectRatio: m.imageIds.length === 1 ? '16/10' : '1/1' }}
                                >
                                  <MediaImage
                                    fileId={id}
                                    alt={`动态配图 ${i + 1}`}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          )}

                          {/* 操作：收藏 / 评论 */}
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-line/40">
                            <button
                              onClick={() => {
                                toggleFavorite('moment', m.id);
                                showToast(fav ? '已取消收藏' : '已收藏', 'success');
                              }}
                              aria-pressed={fav}
                              className={`flex items-center gap-1.5 font-mono text-[11px] tracking-wider transition-colors ${
                                fav ? 'text-amber' : 'text-bronze hover:text-amber'
                              }`}
                            >
                              <Star size={13} strokeWidth={1.6} fill={fav ? 'currentColor' : 'none'} />
                              {fav ? '已收藏' : '收藏'}
                            </button>
                            <button
                              onClick={() => setOpenComments((s) => ({ ...s, [m.id]: !showComments }))}
                              aria-expanded={showComments}
                              className="flex items-center gap-1.5 font-mono text-[11px] tracking-wider text-bronze hover:text-candle transition-colors"
                            >
                              <MessageCircle size={13} strokeWidth={1.6} />
                              评论{comments.length > 0 ? ` ${comments.length}` : ''}
                            </button>
                          </div>

                          {/* 评论区 */}
                          {showComments && (
                            <div className="mt-3 rounded-card p-3" style={{ background: 'rgba(42,41,46,0.55)' }}>
                              {comments.length > 0 && (
                                <ul className="space-y-2.5 mb-3">
                                  {comments.map((c) => (
                                    <li key={c.id} className="flex items-start gap-2.5 group/c">
                                      <Avatar profile={profile} size={26} label={c.author} />
                                      <div className="min-w-0 flex-1">
                                        <p className="font-serif text-candle text-xs leading-none mb-1">
                                          {c.author || profile.name || '我'}
                                          <span className="font-mono text-[9px] text-bronze-deep ml-2">
                                            {relativeTime(c.createdAt)}
                                          </span>
                                        </p>
                                        <p className="font-serif text-paper text-sm whitespace-pre-wrap leading-relaxed">
                                          {c.content}
                                        </p>
                                      </div>
                                      <button
                                        onClick={() => deleteMomentComment(m.id, c.id)}
                                        aria-label="删除评论"
                                        className="opacity-0 group-hover/c:opacity-100 w-5 h-5 flex items-center justify-center text-bronze hover:text-wine-bright"
                                      >
                                        ×
                                      </button>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              <div className="flex items-center gap-2">
                                <input
                                  value={drafts[m.id] ?? ''}
                                  onChange={(e) => setDrafts((d) => ({ ...d, [m.id]: e.target.value }))}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      submitComment(m.id);
                                    }
                                  }}
                                  placeholder="写一条评论…"
                                  className="flex-1 px-3 py-1.5 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none"
                                  style={{ background: 'rgba(27,26,31,0.7)' }}
                                />
                                <button
                                  onClick={() => submitComment(m.id)}
                                  aria-label="发送评论"
                                  className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                                  style={{ background: 'var(--wine)' }}
                                >
                                  <Send size={13} strokeWidth={1.6} className="text-moon" />
                                </button>
                              </div>
                            </div>
                          )}
                        </Card>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        <button
          onClick={() => openEditor({ mode: 'moment', open: true })}
          className="fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'var(--wine)', boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)' }}
          aria-label="写动态"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      </div>
    </div>
  );
}
