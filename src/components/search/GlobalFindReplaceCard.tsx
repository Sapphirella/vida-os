// 全局查找替换面板（复刻 Nookery FindBar 思路，桌面/移动两端全局可用）
// - 全局搜索：文章 / 动态（标题 + 正文），支持按范围筛选
// - 结果列表：来源路径 + 命中摘要（<mark> 高亮），可勾选批量替换
// - 上一个 / 下一个：在当前结果中移动高亮
// - 输入即搜（250ms 防抖）+ Enter 触发；忽略大小写可切换
// - 以全屏覆盖层呈现：桌面居中卡片，移动端近全宽卡片，两条入口（TopBar 放大镜 / 快捷键）
import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  ChevronDown,
  ChevronUp,
  X,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { clsx } from '@/lib/utils';

type ScopeKey = 'all' | 'article' | 'moment';

const SCOPES: { key: ScopeKey; label: string }[] = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'moment', label: '动态' },
];

type HitKind = 'article' | 'moment';

interface Target {
  kind: HitKind;
  id: string;
  title: string;
  text: string;
}

interface Hit {
  kind: HitKind;
  id: string;
  title: string;
  pos: number;
  len: number;
  hit: string;
  snip: string;
}

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeReg(s: string): string {
  return String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface EntryLike {
  id: string;
  title?: string;
  content?: string;
}

export function GlobalFindReplaceCard() {
  const navigate = useNavigate();
  const open = useUIStore((s) => s.findPanelOpen);
  const close = useUIStore((s) => s.setFindPanelOpen);
  const setFocusRequest = useUIStore((s) => s.setFocusRequest);
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const updateArticle = useAppStore((s) => s.updateArticle);
  const updateMoment = useAppStore((s) => s.updateMoment);
  const showToast = useUIStore((s) => s.showToast);

  const [query, setQuery] = useState('');
  const [replaceWith, setReplaceWith] = useState('');
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [scope, setScope] = useState<ScopeKey>('all');
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [cur, setCur] = useState(-1);
  const [searched, setSearched] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // 打开时锁定背景滚动（移动端防止遮罩下方页面滑动）；
  // iOS 上 body overflow:hidden 与软键盘弹出存在合成冲突（键盘被顶起/输入框不可聚焦），
  // 因此输入框聚焦期间临时释放锁定，失焦后恢复。
  const [inputFocused, setInputFocused] = useState(false);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = inputFocused ? '' : 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open, inputFocused]);

  // Esc 关闭
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, close]);

  // 全局内容构造搜索目标：标题（文章/动态）+ 正文
  // 注意：useMemo 必须位于 early return 之前，保证 hooks 顺序稳定
  const targets = useMemo(() => {
    if (!open) return [];
    const out: Target[] = [];
    const push = (kind: HitKind, items: EntryLike[]) => {
      for (const item of items) {
        const title = item.title ?? '';
        const body = item.content ?? '';
        out.push({
          kind,
          id: item.id,
          title,
          text: `${title}\n${body}`,
        });
      }
    };
    if (scope === 'all' || scope === 'article') push('article', articles);
    if (scope === 'all' || scope === 'moment') push('moment', moments);
    return out;
  }, [articles, moments, scope, open]);

  const hits = useMemo(() => {
    if (!open) return [];
    const q = query.trim();
    if (!q) return [];
    const re = new RegExp(escapeReg(q), ignoreCase ? 'gi' : 'g');
    const out: Hit[] = [];
    for (const t of targets) {
      const content = t.text;
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let count = 0;
      while ((m = re.exec(content)) !== null && count < 200) {
        const len = m[0].length || 1;
        const s = Math.max(0, m.index - 22);
        const e = Math.min(content.length, m.index + len + 40);
        out.push({
          kind: t.kind,
          id: t.id,
          title: t.title,
          pos: m.index,
          len,
          hit: content.slice(m.index, m.index + len),
          snip:
            (s > 0 ? '…' : '') +
            esc(content.slice(s, m.index).replace(/\s+/g, ' ')) +
            '<mark class="vd-mark">' +
            esc(content.slice(m.index, m.index + len)) +
            '</mark>' +
            esc(content.slice(m.index + len, e).replace(/\s+/g, ' ')) +
            (e < content.length ? '…' : ''),
        });
        count++;
        if (m[0].length === 0) re.lastIndex++;
      }
    }
    return out;
  }, [targets, query, ignoreCase, open]);

  if (!open) return null;

  const matchCount = hits.length;

  const handleQueryChange = (v: string) => {
    setQuery(v);
    setSearched(true);
    setCur(-1);
    setChecked({});
  };

  const step = (dir: 1 | -1) => {
    if (!matchCount) return;
    const next = (cur + dir + matchCount) % matchCount;
    setCur(next);
    requestAnimationFrame(() => {
      const el = listRef.current?.querySelector(`[data-i="${next}"]`);
      el?.scrollIntoView({ block: 'nearest' });
    });
  };

  const navigateToHit = (h: Hit) => {
    // 计算命中位置（标题段 or 正文第几个命中），供目标页做精准定位
    const t = targets.find((x) => x.kind === h.kind && x.id === h.id);
    const titleLen = t ? t.title.length : 0;
    const inTitle = h.pos < titleLen;
    // 该文档正文中的命中序号：数同文档里 pos 在标题之后且在本命中之前的正文命中
    let bodyIndex = 0;
    for (const x of hits) {
      if (x.kind === h.kind && x.id === h.id && x.pos >= titleLen + 1 && x.pos < h.pos) {
        bodyIndex++;
      }
    }
    setFocusRequest({
      kind: h.kind,
      id: h.id,
      query: query.trim(),
      ignoreCase,
      index: bodyIndex,
      inTitle,
      ts: Date.now(),
    });
    if (h.kind === 'article') navigate(`/space/article/${h.id}`);
    else navigate('/moments');
    close(false);
  };

  const setAllChecked = (on: boolean | 'invert') => {
    setChecked((prev) => {
      const next: Record<number, boolean> = {};
      if (on === 'invert') {
        // 反选：已勾选的取消，未勾选的全部勾上
        hits.forEach((_, i) => (next[i] = !prev[i]));
        return next;
      }
      hits.forEach((_, i) => (next[i] = on));
      return next;
    });
  };

  const docTextOf = (kind: HitKind, id: string): string => {
    const src = kind === 'article' ? articles : moments;
    return src.find((x) => x.id === id)?.content ?? '';
  };

  const doReplace = () => {
    const q = query.trim();
    if (!q) return;
    const picked = hits.filter((_, i) => checked[i]);
    if (!picked.length) {
      showToast('请先勾选要替换的结果', 'error');
      return;
    }
    // 按 文档 id 分组，组内按位置从后往前替换，避免偏移错乱
    const groups = new Map<string, Hit[]>();
    for (const h of picked) {
      const key = `${h.kind}:${h.id}`;
      const arr = groups.get(key) || [];
      arr.push(h);
      groups.set(key, arr);
    }
    let total = 0;
    for (const [key, items] of groups) {
      const idx = key.indexOf(':');
      const kind = key.slice(0, idx) as HitKind;
      const id = key.slice(idx + 1);
      const sorted = [...items].sort((a, b) => b.pos - a.pos);
      let text = docTextOf(kind, id);
      if (text === '') continue;
      for (const r of sorted) {
        // 位置漂移保护：原文片段不匹配则跳过（文档已变化）
        if (text.slice(r.pos, r.pos + r.len) !== r.hit) continue;
        text = text.slice(0, r.pos) + replaceWith + text.slice(r.pos + r.len);
        total++;
      }
      if (kind === 'article') updateArticle(id, { content: text });
      else updateMoment(id, { content: text });
    }
    showToast(
      total ? `已替换 ${total} 处` : '内容已变化，未应用替换',
      total ? 'success' : 'info',
    );
    setChecked({});
    setCur(-1);
  };

  return (
    <div className="fixed inset-0 z-[60]">
      {/* 遮罩 */}
      <div
        className="absolute inset-0"
        style={{
          background: 'rgba(15, 12, 14, 0.66)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
        onClick={() => close(false)}
      />

      {/* 面板：桌面居中卡片，移动端近全宽，内部结果区自适应滚动 */}
      <div className="relative h-full flex items-start justify-center p-2 pt-[calc(56px+env(safe-area-inset-top)+12px)] sm:p-6 sm:pt-[calc(72px+env(safe-area-inset-top))]">
        <Card className="w-full max-w-2xl max-h-[82dvh] flex flex-col animate-slide-up">
          {/* 标题行 */}
          <div className="flex items-center gap-3 px-4 pt-3 pb-2 border-b border-bronze/10">
            <Search size={15} strokeWidth={1.6} className="text-amber flex-none" />
            <span className="font-mono text-[11px] tracking-[0.2em] uppercase text-headline flex-1 truncate">
              全局查找替换
            </span>
            <span className="font-mono text-[10px] text-[color:var(--find-fg-dim)] hidden sm:inline">
              ⌘K / 顶栏搜索
            </span>
            <button
              onClick={() => close(false)}
              aria-label="关闭查找替换"
              className="w-8 h-8 flex items-center justify-center text-[color:var(--find-fg)] hover:text-[color:var(--find-fg)] transition-colors flex-none"
            >
              <X size={17} strokeWidth={1.5} />
            </button>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3">
            {/* 范围 + 忽略大小写 */}
            <div className="flex items-center gap-1 flex-wrap mb-2">
              {SCOPES.map((s) => (
                <button
                  key={s.key}
                  onClick={() => {
                    setScope(s.key);
                    setChecked({});
                    setCur(-1);
                  }}
                  className={clsx(
                    'px-2.5 py-1 rounded-pill text-[11px] font-mono tracking-wider transition-colors',
                    scope === s.key
                      ? 'text-[color:var(--find-fg)] bg-wine/30'
                      : 'text-[color:var(--find-fg-dim)] hover:text-[color:var(--find-fg)] bg-bronze/10',
                  )}
                >
                  {s.label}
                </button>
              ))}
              <div className="flex-1" />
              <button
                onClick={() => setIgnoreCase((v) => !v)}
                className={clsx(
                  'px-2.5 py-1 rounded-pill text-[11px] font-mono tracking-wider transition-colors',
                  ignoreCase
                    ? 'text-[color:var(--find-fg)] bg-wine/30'
                    : 'text-[color:var(--find-fg-dim)] hover:text-[color:var(--find-fg)] bg-bronze/10',
                )}
                title="忽略大小写（英文命中有效）"
              >
                Aa
              </button>
            </div>

            {/* 查找行 */}
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={query}
                onChange={(e) => handleQueryChange(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    if (e.shiftKey) step(-1);
                    else step(1);
                  }
                }}
                placeholder="查找全文（文章 / 动态）…"
                className="flex-1 min-w-0 px-3 py-2 rounded-pill text-sm font-serif text-paper placeholder:text-[color:var(--find-fg-dim)] outline-none border border-bronze/15 focus:border-[color:var(--find-fg)]/40 transition-colors"
              />
              <span className="font-mono text-[10px] text-[color:var(--find-fg)] whitespace-nowrap">
                {searched ? `${matchCount} 处` : ''}
              </span>
              <button
                onClick={() => step(-1)}
                disabled={!matchCount}
                aria-label="上一个"
                className="w-8 h-8 flex items-center justify-center text-[color:var(--find-fg)] hover:text-[color:var(--find-fg)] disabled:opacity-30 transition-colors"
              >
                <ChevronUp size={16} strokeWidth={1.6} />
              </button>
              <button
                onClick={() => step(1)}
                disabled={!matchCount}
                aria-label="下一个"
                className="w-8 h-8 flex items-center justify-center text-[color:var(--find-fg)] hover:text-[color:var(--find-fg)] disabled:opacity-30 transition-colors"
              >
                <ChevronDown size={16} strokeWidth={1.6} />
              </button>
              {query && (
                <button
                  onClick={() => {
                    setQuery('');
                    setSearched(false);
                    setCur(-1);
                    setChecked({});
                  }}
                  aria-label="清空"
                  className="w-8 h-8 flex items-center justify-center text-[color:var(--find-fg)] hover:text-[color:var(--find-fg)] transition-colors"
                >
                  <X size={15} strokeWidth={1.6} />
                </button>
              )}
            </div>

            {/* 替换行 */}
            <div className="flex items-center gap-2 mt-2">
              <input
                value={replaceWith}
                onChange={(e) => setReplaceWith(e.target.value)}
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    doReplace();
                  }
                }}
                placeholder="替换为…"
                className="flex-1 min-w-0 px-3 py-2 rounded-pill text-sm font-serif text-paper placeholder:text-[color:var(--find-fg-dim)] outline-none border border-bronze/15 focus:border-[color:var(--find-fg)]/40 transition-colors"
              />
              <button
                onClick={doReplace}
                disabled={!matchCount}
                className="btn-primary disabled:opacity-40 flex-none"
                style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
              >
                替换
              </button>
              <button
                onClick={() => setAllChecked(true)}
                disabled={!matchCount}
                className="btn-ghost disabled:opacity-40 flex-none"
                style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                title="全选"
              >
                全选
              </button>
              <button
                onClick={() => setAllChecked('invert')}
                disabled={!matchCount}
                className="btn-ghost disabled:opacity-40 flex-none"
                style={{ padding: '8px 12px', fontSize: '0.8125rem' }}
                title="反选：勾选取消勾选，其余全部勾选"
              >
                反选
              </button>
            </div>
            <p className="font-mono text-[10px] text-[color:var(--find-fg-dim)]/70 mt-1.5 px-1">
              勾选结果后点「替换」批量替换；「全选/反选」可快速调整勾选；点击结果行可跳转到对应内容。
            </p>

            {/* 结果列表 */}
            <div
              ref={listRef}
              className="mt-3 max-h-72 overflow-y-auto space-y-1 pr-1"
              style={{ scrollbarWidth: 'thin' }}
            >
              {!searched ? (
                <p className="text-center text-[color:var(--find-fg-dim)] italic text-xs py-4">
                  输入关键词开始查找
                </p>
              ) : matchCount === 0 ? (
                <p className="text-center text-[color:var(--find-fg-dim)] italic text-xs py-4">
                  未找到匹配
                </p>
              ) : (
                hits.map((h, i) => (
                  <div
                    key={`${h.kind}-${h.id}-${h.pos}`}
                    data-i={i}
                    onClick={() => navigateToHit(h)}
                    className={clsx(
                      'flex items-start gap-2 px-2 py-1.5 rounded-lg cursor-pointer border transition-colors',
                      cur === i
                        ? 'border-[color:var(--find-fg)]/50 bg-[color:var(--find-fg)]/8'
                        : 'border-transparent hover:bg-bronze/8',
                    )}
                  >
                    <label
                      className="flex items-center gap-2 flex-none pt-0.5 cursor-pointer select-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChecked((prev) => ({ ...prev, [i]: !prev[i] }));
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={!!checked[i]}
                        onChange={() => {}}
                        className="accent-wine w-3.5 h-3.5"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono text-[9px] tracking-widest text-[color:var(--find-fg-dim)] uppercase flex-none">
                          {h.kind === 'article' ? '文章' : '动态'}
                        </span>
                        {h.title && (
                          <span className="font-serif text-xs text-headline truncate">
                            {h.title}
                          </span>
                        )}
                        <span className="flex-1 min-w-0" />
                        <span className="font-mono text-[9px] text-[color:var(--find-fg-dim)]/70 flex-none">
                          {h.pos}
                        </span>
                      </div>
                      <p
                        className="font-serif text-xs text-paper/80 leading-relaxed"
                        style={{
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                        dangerouslySetInnerHTML={{ __html: h.snip }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}