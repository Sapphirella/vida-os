import { useEffect, useMemo, useState } from 'react';
import { Plus, Star, MessageCircle, Trash2, Send, Search, Edit2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MarkdownView, collectInlineImageIds } from '@/components/common/MarkdownView';
import { formatDate, relativeTime, todayKey } from '@/lib/utils';
import { useGlobalFocus } from '@/lib/focusRequest';
import { usePageFind } from '@/components/search/usePageFind';
import { PageFindBar } from '@/components/search/PageFindBar';
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
  const setCommentInputFocused = useUIStore((s) => s.setCommentInputFocused);
  const setLightbox = useUIStore((s) => s.setLightbox);

  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const anyCommentsOpen = Object.values(openComments).some(Boolean);

  // 评论区展开（或输入聚焦）时隐藏右下 FAB，避免钉住遮挡评论区/键盘
  const fabHidden = anyCommentsOpen;

  // 评论区全部收起 / 离开页面时，清除评论输入聚焦状态（防止底栏一直隐藏）
  useEffect(() => {
    if (!anyCommentsOpen) setCommentInputFocused(false);
  }, [anyCommentsOpen, setCommentInputFocused]);
  useEffect(() => {
    return () => setCommentInputFocused(false);
  }, [setCommentInputFocused]);

  // ── 查找 / 替换（页内，面板钉在顶栏下方） ──
  // targets 数组要按 moments 缓存，否则评论输入等任意重渲染都会重建数组，
  // 触发 usePageFind 的 mark 重扫与 scrollIntoView（输入时页面跳动）。
  const findTargets = useMemo(
    () =>
      moments.map((m) => ({
        id: m.id,
        title: '',
        content: m.content,
        replaceContent: (next: string) => updateMoment(m.id, { content: next }),
      })),
    [moments, updateMoment],
  );
  const find = usePageFind(findTargets, {
    onToast: (msg) => showToast(msg, 'success'),
  });
  const { listRef } = find;

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

  // 时间线：完全按「设置的时间」排序（最近在上、以前的在下），
  // 而不是按发布/编辑顺序——用户改过时间后位置要跟着变
  const groups = useMemo(() => {
    const sorted = [...moments].sort((a, b) => b.createdAt - a.createdAt);
    const out: Array<{ date: string; items: typeof moments }> = [];
    for (const m of sorted) {
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
        {/* 工具行：搜索（面板钉在顶栏下方，见 PageFindBar） */}
        <div className="flex items-center justify-between mb-3">
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            timeline · {moments.length} 条
          </p>
          <button
            onClick={() => find.toggleOpen()}
            aria-expanded={find.open}
            className={`flex items-center gap-1.5 font-mono text-[11px] tracking-wider transition-colors ${
              find.open ? 'text-amber' : 'text-bronze hover:text-candle'
            }`}
          >
            <Search size={14} strokeWidth={1.6} />
            查找替换
          </button>
        </div>

        {/* 页内查找替换：fixed 钉在顶栏下方，滚动/跳转不消失 */}
        <PageFindBar find={find} activeClass="text-[color:var(--find-fg)]" />

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
                    // 已用 fileRef: 插进正文的图片不在这里（文末配图）重复显示 —— 与文章阅读页一致
                    const inlineIds = new Set(collectInlineImageIds(m.content));
                    const galleryIds = m.imageIds.filter((id) => !inlineIds.has(id));
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
                              onClick={async () => {
                                if (await useUIStore.getState().confirmDialog('删除该动态？')) {
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
                              htmlTransform={(h) => find.hl(h, m.id)}
                            />
                          </div>

                          {/* 配图（已插入正文的图不重复展示） */}
                          {galleryIds.length > 0 && (
                            <div
                              className={`mt-3 grid gap-1.5 ${
                                galleryIds.length === 1
                                  ? 'grid-cols-1'
                                  : galleryIds.length === 2
                                    ? 'grid-cols-2'
                                    : 'grid-cols-3'
                              }`}
                            >
                              {galleryIds.map((id, i) => (
                                <div
                                  key={id}
                                  className="rounded-card overflow-hidden border border-line/50"
                                  style={{ aspectRatio: galleryIds.length === 1 ? '16/10' : '1/1' }}
                                >
                                  <MediaImage
                                    fileId={id}
                                    alt={`动态配图 ${i + 1}`}
                                    className="w-full h-full object-cover"
                                    onOpen={(id) => setLightbox({ fileId: id })}
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
                                  onFocus={() => setCommentInputFocused(true)}
                                  onBlur={() => setCommentInputFocused(false)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      submitComment(m.id);
                                    }
                                  }}
                                  placeholder="写一条评论…"
                                  className="flex-1 px-3 py-1.5 rounded-pill text-sm font-serif text-paper placeholder:text-bronze-deep outline-none"
                                  style={{ background: 'var(--bar-bg, rgba(27,26,31,0.7))' }}
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
          aria-hidden={fabHidden}
          tabIndex={fabHidden ? -1 : 0}
          className={`fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
            fabHidden
              ? 'opacity-0 pointer-events-none translate-y-2 scale-90'
              : 'opacity-100 translate-y-0 scale-100 hover:scale-110 active:scale-95'
          }`}
          style={{ background: 'var(--wine)', boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)' }}
          aria-label="写动态"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      </div>
    </div>
  );
}
