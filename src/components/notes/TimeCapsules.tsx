// 便签 · 碎片 · 时间胶囊栏目（v4.7.7）
//
// 是什么：**补记到未来**的碎片（写入时由 store 打上 `capsule` 标记）。
// 放在时间线下方，跟时间线一样不依赖当前选中的日期 —— 它是「所有还没开封 / 已开封的胶囊」的总览。
//
// 为什么要有这个栏目（用户原话）：
//   「如果在碎片里选择补记到未来的时间，则提示【种下一颗时间胶囊】，在 timeline 下方就会出现
//     一个【时间胶囊】的栏目。等未来的这天来临，补记到未来的内容仍然会在时间胶囊的栏目里出现。」
// 所以胶囊是**永久身份**（靠 `capsule` 字段记住），不是「createdAt > now 的临时状态」——
// 开封日到了它仍然留在这个栏目里，只是状态从「还有 N 天开启」变成「今天开启 / 已开启」。
//
// 未到开封日的默认**折起来**（可以点「点开看看」预览）：既不丢内容，又保留「到日子再打开」的感觉。
import { useEffect, useMemo, useState } from 'react';
import { Sprout, ChevronDown, ChevronRight, Trash2, Lock } from 'lucide-react';
import type { FragmentEntry } from '@/types';
import { formatDate, todayKey } from '@/lib/utils';

/** 胶囊状态：还有几天 / 今天开 / 已开 */
function statusOf(target: number, now: number) {
  if (target <= now) return { kind: 'opened' as const, days: 0 };
  const day = (t: number) => {
    const d = new Date(t);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  };
  const diff = Math.round((day(target) - day(now)) / 86400000);
  if (diff <= 0) return { kind: 'today' as const, days: 0 };
  return { kind: 'upcoming' as const, days: diff };
}

export function TimeCapsules({
  items,
  onDelete,
}: {
  items: FragmentEntry[];
  onDelete: (item: FragmentEntry) => void;
}) {
  /** 被「点开看看」预览过的未开封胶囊 */
  const [peeked, setPeeked] = useState<Set<string>>(new Set());

  // now 必须会走：否则胶囊到点后既不重排、也不会把「还有 N 天开启」变成「今天开启」，
  // 得等碎片列表变化或离开再回来才更新（v4.7.11）。每分钟刷新一次足够。
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  /**
   * 未开封的在前（按开封日由近到远 = 下一颗要开的排最前），已开封的在后（最近开的排前面）。
   * 两段各自有序，比混在一起按时间排更好读。
   */
  const { upcoming, opened } = useMemo(() => {
    const up: FragmentEntry[] = [];
    const op: FragmentEntry[] = [];
    for (const f of items) (f.createdAt > now ? up : op).push(f);
    up.sort((a, b) => a.createdAt - b.createdAt);
    op.sort((a, b) => b.createdAt - a.createdAt);
    return { upcoming: up, opened: op };
    // now 现在每分钟走一次（上面那个 interval），所以它要进依赖：
    // 到点后胶囊会自动从「未开封」挪到「已开封」那一段
  }, [items, now]);

  return (
    <>
      <div className="flex items-center gap-3 mt-8 mb-3 px-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
          time capsules · {items.length} 颗
        </span>
        <div className="flex-1 h-px bg-bronze/10" />
      </div>

      <ul className="space-y-2">
        {[...upcoming, ...opened].map((f) => {
          const st = statusOf(f.createdAt, now);
          const isOpen = st.kind !== 'upcoming';
          const showContent = isOpen || peeked.has(f.id);
          return (
            <li
              key={f.id}
              data-capsule={f.id}
              className="rounded-card px-3 py-2.5"
              style={{
                // 未开封：描一圈虚线边的暗格；开封后回到普通卡面
                border: isOpen ? '1px solid var(--card-border)' : '1px dashed var(--line)',
                background: isOpen ? 'var(--card-bg)' : 'transparent',
              }}
            >
              <div className="flex items-center gap-2">
                <Sprout
                  size={13}
                  strokeWidth={1.7}
                  className={isOpen ? 'text-bronze-deep' : 'text-amber'}
                />
                <span className="font-mono text-[10px] tracking-wider text-bronze-deep tabular-nums">
                  {formatDate(f.createdAt, 'M')} 月 {formatDate(f.createdAt, 'D')} 日{' '}
                  {formatDate(f.createdAt, 'HH:mm')}
                </span>
                <span
                  className={
                    st.kind === 'upcoming'
                      ? 'font-mono text-[10px] tracking-wider text-amber'
                      : 'font-mono text-[10px] tracking-wider text-bronze-deep'
                  }
                >
                  {st.kind === 'upcoming'
                    ? f.date === todayKey()
                      ? '今天开启'
                      : `还有 ${st.days} 天开启`
                    : st.kind === 'today'
                      ? '今天开启'
                      : '已开启'}
                </span>
                <span className="flex-1" />
                <button
                  data-capsule-delete={f.id}
                  onClick={() => onDelete(f)}
                  className="w-6 h-6 flex items-center justify-center text-bronze-deep hover:text-wine-light transition-colors"
                  aria-label="删除这颗时间胶囊"
                >
                  <Trash2 size={12} strokeWidth={1.6} />
                </button>
              </div>

              {showContent ? (
                <p className="mt-2 font-serif text-reading text-paper whitespace-pre-wrap break-words">
                  {f.content}
                </p>
              ) : (
                <button
                  data-capsule-peek={f.id}
                  onClick={() => setPeeked((s) => new Set(s).add(f.id))}
                  className="mt-2 flex items-center gap-1.5 font-mono text-[10px] tracking-wider text-bronze-deep hover:text-candle transition-colors"
                >
                  <Lock size={11} strokeWidth={1.6} />
                  到日子再打开 · 点开看看
                  <ChevronRight size={11} strokeWidth={2} />
                </button>
              )}

              <div className="mt-1.5 flex items-center gap-2 font-mono text-[9px] tracking-wider text-bronze-deep/80">
                <span>{formatDate(f.plantedAt ?? f.createdAt, 'YYYY-MM-DD')} 种下</span>
                {f.tag && <span>· #{f.tag}</span>}
                {isOpen && peeked.has(f.id) && null}
                {!isOpen && peeked.has(f.id) && (
                  <button
                    onClick={() =>
                      setPeeked((s) => {
                        const n = new Set(s);
                        n.delete(f.id);
                        return n;
                      })
                    }
                    className="flex items-center gap-0.5 hover:text-candle transition-colors"
                  >
                    <ChevronDown size={9} strokeWidth={2.2} /> 收起来
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
