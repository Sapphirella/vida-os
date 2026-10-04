// 便签 · 碎片（v4.7 重新启用）
//
// 定位：**「此刻记一句」的最快入口**。与灵感/日程/待办的区别是它没有状态、没有分类桶、
// 不需要回顾整理 —— 按下加号、写一句话、自动落在今天这条时间线上。
//
// 样式参考工作区的《碎片时间线参考图片.jpg》，从中取的是**时间轴的骨架**（不是配色）：
//   - 左侧一条细竖轨，每个条目一个实心圆点；
//   - 圆点与「时间」在同一条线上（时间紧贴圆点右侧），正文在时间下方；
//   - 极简：条目之间不加卡片外框、不加分隔线，靠留白和竖轨分隔；
//   - 只有两级字号（时间/标签小、正文大）。
// 配色一律走主题变量（--amber / --line / --text-* / --card-*），三套主题自动跟随：
// 暗夜书房、白昼书房、猩红书房都不需要额外写规则。
import { useMemo, useState } from 'react';
import { Plus, Check, X, Pencil, Trash2, Clock } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { CalendarNav } from '@/components/common/CalendarNav';
import { TimePicker } from '@/components/common/TimePicker';
import { EmptyState } from '@/components/common/EmptyState';
import { isFutureCapsule, useAppStore } from '@/stores/useAppStore';
import { TimeCapsules } from '@/components/notes/TimeCapsules';
import { useUIStore } from '@/stores/useUIStore';
import { chineseWeekday, clsx, formatDate, todayKey } from '@/lib/utils';
import type { FragmentEntry } from '@/types';

export function FragmentView() {
  const fragments = useAppStore((s) => s.notes.fragments);
  const addFragment = useAppStore((s) => s.addFragment);
  const updateFragment = useAppStore((s) => s.updateFragment);
  const deleteFragment = useAppStore((s) => s.deleteFragment);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);
  /**
   * 选中日期与主页日历、当日产出卡共用同一个（useUIStore.selectedDate）——
   * 「今天看哪天」在整个应用里只有一个真相，碎片里跳了日期，回主页也是那天。
   */
  const selected = useUIStore((s) => s.selectedDate);
  const setSelected = useUIStore((s) => s.setSelectedDate);
  const [view, setView] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  /**
   * 正在写的碎片（null = 收起，加号控制）。
   * `at` 是时间输入框里的 "HH:MM"；`touched` 记录用户是否**动过**它 ——
   * 今天这一格没动过就交回给 store 用真正的 now()（那样「自动记录当下时间」才是准的，
   * 不会因为你在输入框里多敲了两分钟而记成打开输入框那一刻）。
   */
  const [composing, setComposing] = useState<{
    content: string;
    tag: string;
    at: string;
    touched: boolean;
  } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const today = todayKey();
  const isToday = selected === today;

  /** 每天有几条 —— 日历上的小圆点与汇总行都用它 */
  const countByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const f of fragments) m.set(f.date, (m.get(f.date) ?? 0) + 1);
    return m;
  }, [fragments]);

  /**
   * 当天时间线：**按 createdAt 升序**（早上在上、深夜在下）。
   * 与动态页的「最近在上」相反 —— 时间线的语义是「这一天怎么过的」，要从早看到晚。
   */
  const dayItems = useMemo(
    () => fragments.filter((f) => f.date === selected).sort((a, b) => a.createdAt - b.createdAt),
    [fragments, selected],
  );

  /**
   * 时间胶囊：所有带 capsule 标记的碎片（含已开封的 —— 见 TimeCapsules 的注释）。
   * 与时间线不同，它**不跟随选中日期**：它是「所有种下的 / 待开封的」总览。
   */
  const capsules = useMemo(() => fragments.filter((f) => f.capsule), [fragments]);

  /** 输入区里挑的那个时刻是不是「种到未来」（提示与 toast 都用它） */
  const composingAt = (composing ? stampOf(selected, composing.at) : undefined) ?? 0;
  const willBeCapsule = composing ? !(isToday && !composing.touched) && isFutureCapsule(composingAt) : false;

  const days = useMemo(() => {
    const first = new Date(view.year, view.month, 1);
    const total = new Date(view.year, view.month + 1, 0).getDate();
    const arr: Array<{ date?: string; day?: number; isToday?: boolean; count?: number }> = [];
    for (let i = 0; i < first.getDay(); i++) arr.push({});
    for (let d = 1; d <= total; d++) {
      const date = new Date(view.year, view.month, d);
      const k = todayKey(date);
      arr.push({ day: d, date: k, isToday: k === today, count: countByDate.get(k) ?? 0 });
    }
    return arr;
  }, [view, countByDate, today]);

  /**
   * 翻月 / 选年月：**只改「正在看哪个月」，不动选中日期**。
   * 与主页日历同一套语义 —— 日历是导航器，选中的是哪天由点日期决定；
   * 否则「翻到去年看看」这种纯浏览动作会顺手改掉全应用的选中日期。
   */
  const shiftMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };

  const backToToday = () => {
    const d = new Date();
    setView({ year: d.getFullYear(), month: d.getMonth() });
    setSelected(today);
  };

  /** 打开时间选择弹窗：点选只改 draft，Modal 的「确认」才写回输入区 */
  const openTimePicker = () => {
    if (!composing) return;
    let draft = composing.at;
    showModal({
      title: '选择时间',
      content: <TimePicker value={composing.at} onChange={(v) => { draft = v; }} />,
      onConfirm: () => setComposing((c) => (c ? { ...c, at: draft, touched: true } : c)),
    });
  };

  /** "HH:MM" + 日期 → 时间戳（本地时区）。写成函数声明以便在定义之前使用 */
  function stampOf(date: string, hhmm: string): number | undefined {
    const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
    if (!m) return undefined;
    const d = new Date(`${date}T00:00:00`);
    d.setHours(Number(m[1]), Number(m[2]), 0, 0);
    return d.getTime();
  }

  const submitCompose = (draft: { content: string; tag: string; at: string; touched: boolean }) => {
    const text = draft.content.trim();
    if (!text) return;
    // 今天且没动过时间 → 不传 at，让 store 用真正的 now()；
    // 其余情况（补记到历史某天 / 手动改过时间）都用输入框里那个时刻。
    const at = isToday && !draft.touched ? undefined : stampOf(selected, draft.at);
    // 补记到未来 → 时间胶囊（store 里按同一个规则打标记）
    const capsule = at !== undefined && isFutureCapsule(at);
    addFragment(text, draft.tag.trim() || undefined, selected, at);
    setComposing(null);
    showToast(
      capsule
        ? '🌱 种下一颗时间胶囊'
        : isToday
          ? '已记下此刻'
          : `已补记到 ${selected}`,
      'success',
    );
  };

  return (
    <div>
      {/* ── 日历：点日期就跳过去，有碎片的日期带圆点 ── */}
      <Card className="p-4 mb-4">
        <CalendarNav
          eyebrow="fragments"
          year={view.year}
          month={view.month}
          onPick={(y, m) => setView({ year: y, month: m })}
          onToday={backToToday}
          onStepMonth={shiftMonth}
        />

        <div className="grid grid-cols-7 mb-1">
          {['日', '一', '二', '三', '四', '五', '六'].map((w, i) => (
            <div
              key={w}
              className={clsx(
                'text-center font-mono text-[10px] tracking-widest',
                i === 0 || i === 6 ? 'text-wine-light' : 'text-bronze-deep',
              )}
            >
              {w}
            </div>
          ))}
        </div>

        {/* 固定行高（不跟卡片宽度走）：碎片页是整页宽，aspect-square 在桌面会撑成巨格 */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((d, idx) => {
            if (!d.day) return <div key={idx} className="h-9" />;
            const on = d.date === selected;
            return (
              <button
                key={idx}
                onClick={() => d.date && setSelected(d.date)}
                aria-label={`跳到 ${d.date}`}
                className={clsx(
                  'h-9 flex flex-col items-center justify-center relative rounded-card transition-colors',
                  // 选中日挂 .vd-selected：主题差异（深色=半透明酒红底 / 日间=实色深橄榄底）
                  // 由 globals.css 的两个变量承担。别再在这里写 bg-wine/30 —— 那正是
                  // v4.7.1「日间主题下选中日糊成灰」的成因（教训 30）。
                  on
                    ? 'vd-selected'
                    : d.isToday
                      ? 'text-candle'
                      : 'text-paper hover:bg-bronze/10',
                )}
              >
                <span className={clsx('font-mono text-[13px] leading-none', d.isToday && !on && 'font-semibold')}>
                  {d.day}
                </span>
                {!!d.count && (
                  <span
                    className="absolute bottom-1 w-1 h-1 rounded-full"
                    style={{
                      background: on ? 'var(--moon)' : 'var(--amber)',
                      boxShadow: on ? '0 0 4px var(--moon)' : '0 0 4px var(--amber)',
                    }}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* 汇总行：选中日 + 星期 + 条数 */}
        <div className="mt-3 pt-3 border-t border-bronze/10 flex items-center gap-2">
          <p className="font-serif text-paper text-sm">
            {formatDate(new Date(selected), 'M')} 月 {formatDate(new Date(selected), 'D')} 日
            <span className="text-bronze-deep"> · 周{chineseWeekday(new Date(selected))}</span>
            {isToday && <span className="text-amber"> · 今天</span>}
          </p>
          <span className="flex-1" />
          <span className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase tabular-nums">
            {dayItems.length} 条
          </span>
        </div>
      </Card>

      {/* ── 输入区：点加号展开 ──
           布局按「手机上先把按钮放稳」来排（v4.7.2 重做）：
             row1 正文输入
             row2 标签 + 时间（两个入口，点时间开应用内弹窗）
             row3 提示「记到此刻 / 补记到 X 月 X 日」
             row4 取消 / 记下 —— 等宽平分整行，永远不会被前面的字段顶出屏幕
           v4.7.1 的写法是「标签+时间+提示+取消+记下」全挤在一行，
           390px 上确认键直接被顶到卡片外面（用户反馈）。 */}
      {composing && (
        <Card className="p-4 mb-4 animate-slide-up">
          <textarea
            autoFocus
            value={composing.content}
            onChange={(e) => setComposing({ ...composing, content: e.target.value })}
            onKeyDown={(e) => {
              // 碎片是「一句话」：Enter 直接记下，Shift+Enter 换行
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                submitCompose(composing);
              } else if (e.key === 'Escape') {
                setComposing(null);
              }
            }}
            placeholder="此刻的一句…"
            rows={3}
            className="w-full bg-transparent resize-none font-serif text-reading text-paper placeholder:text-bronze-deep outline-none"
            style={{ lineHeight: 1.95 }}
          />

          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-bronze/10">
            <label className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="font-mono text-[10px] tracking-wider text-bronze-deep uppercase flex-none">
                标签
              </span>
              <input
                value={composing.tag}
                onChange={(e) => setComposing({ ...composing, tag: e.target.value })}
                placeholder="可选"
                aria-label="标签（可选）"
                className="flex-1 min-w-0 px-2 py-1 text-xs bg-bronze/10 rounded-pill text-paper placeholder:text-bronze-deep outline-none"
              />
            </label>
            {/* 时间：点开应用内的时间选择弹窗（原生 type=time 的系统弹窗样式不可控） */}
            <button
              onClick={openTimePicker}
              className="flex-none flex items-center gap-1.5 px-2.5 py-1 rounded-pill bg-bronze/10 hover:bg-bronze/20 transition-colors"
              aria-label="选择这条碎片的时间"
              title="选择时间"
            >
              <Clock size={11} strokeWidth={1.8} className="text-bronze-deep" />
              <span className="font-mono text-xs text-paper tabular-nums">{composing.at}</span>
            </button>
          </div>

          <p className="mt-2 font-mono text-[10px] tracking-wider text-bronze-deep">
            {willBeCapsule ? (
              <span className="text-amber">
                🌱 会种成一颗时间胶囊 ·{' '}
                {formatDate(new Date(composingAt), 'M')} 月 {formatDate(new Date(composingAt), 'D')}{' '}
                日 {formatDate(new Date(composingAt), 'HH:mm')} 开启
              </span>
            ) : isToday ? (
              composing.touched ? (
                `记到今天 ${composing.at}`
              ) : (
                '记到此刻'
              )
            ) : (
              `补记到 ${formatDate(new Date(selected), 'M')} 月 ${formatDate(new Date(selected), 'D')} 日`
            )}
          </p>

          <div className="flex gap-2 mt-3">
            {/* 两个按钮要「等宽平分整行」，光有 flex-1 不够，得同时满足两件事：
                 ① min-w-0 —— flex item 默认 min-width:auto 会被内容撑开；
                 ② 两边 padding 一致 —— flex-basis:0% 下 Chrome 把剩余空间分给
                    **内容盒**，padding 会额外叠上去，所以 .btn-ghost(14px) 与
                    .btn-primary(18px) 就这么差出了 8px（实测 154 vs 162）。
                    自定义类的 padding 定义在 @tailwind utilities 之后，utility 压不住它，
                    所以这里用内联 style 统一。 */}
            <button
              onClick={() => setComposing(null)}
              style={{ padding: '9px 16px' }}
              className="btn-ghost flex-1 min-w-0 justify-center whitespace-nowrap"
            >
              <X size={13} strokeWidth={1.8} /> 取消
            </button>
            <button
              onClick={() => {
                // 空内容时点「记下」要说明原因（Enter 走 submitCompose，保持静默 —— 键盘操作不用解释）
                if (!composing.content.trim()) {
                  showToast('请先写点什么', 'error');
                  return;
                }
                submitCompose(composing);
              }}
              style={{ padding: '9px 16px' }}
              className={clsx(
                'btn-primary flex-1 min-w-0 justify-center whitespace-nowrap',
                !composing.content.trim() && 'opacity-40',
              )}
            >
              <Check size={13} strokeWidth={2} /> 记下
            </button>
          </div>
        </Card>
      )}

      {/* ── 时间轴 ── */}
      <div className="flex items-center gap-3 mb-3 px-1">
        <span className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
          timeline · {dayItems.length} 条
        </span>
        <div className="flex-1 h-px bg-bronze/10" />
      </div>

      {dayItems.length === 0 ? (
        <EmptyState
          title={isToday ? '今天还没有碎片' : '这一天没有碎片'}
          hint={
            isToday
              ? '点右下角的加号，记下此刻的一句话'
              : '可以点加号补记一条到这一天，或回日历换一天看看'
          }
        />
      ) : (
        /* 竖轨 + 圆点：圆点与时间同行，正文在下方（参考图的骨架）。
           ⚠️ 两个 left 参照系不同，别照着「看上去的 8」写：
             - 竖轨是 <ol>（position:relative）的绝对子元素，left:8 相对 ol 的 padding box，
               所以轨道中心在 ol 左边界 + 8.5；
             - 圆点在 <li>（position:relative）里，而 li 的左边界已经被 ol 的 pl-6（24px）
               推到了 +24 —— 想让 9px 的圆点中心落在 8.5，left 就得是
               8.5 - 24 - 4.5 = -20。
           （实测踩过：一开始写 left:4，圆点整整偏右 24px、掉在正文里。） */
        <ol className="relative pl-6">
          <span
            aria-hidden
            className="absolute top-2 bottom-2 w-px"
            style={{ left: 8, background: 'var(--line)', opacity: 0.5 }}
          />
          {dayItems.map((f) => (
            <FragmentItem
              key={f.id}
              item={f}
              editing={editingId === f.id}
              onEdit={() => setEditingId(f.id)}
              onCancel={() => setEditingId(null)}
              onSave={(content, tag) => {
                updateFragment(f.id, { content: content.trim(), tag: tag.trim() || undefined });
                setEditingId(null);
                showToast('已保存', 'success');
              }}
              onDelete={async () => {
                // 走应用内确认弹窗（原生 confirm 在微信内置浏览器里没有「取消」，v4.5.1 已统一）
                const ok = await useUIStore
                  .getState()
                  .confirmDialog('删除这条碎片？\n\n删了就找不回来了，其它日期的碎片不受影响。');
                if (!ok) return;
                deleteFragment(f.id);
                showToast('已删除', 'info');
              }}
            />
          ))}
        </ol>
      )}

      {/* 时间胶囊栏目：时间线下方，只在种过胶囊时出现 */}
      {capsules.length > 0 && (
        <TimeCapsules
          items={capsules}
          onDelete={async (f) => {
            const ok = await useUIStore
              .getState()
              .confirmDialog(
                `删除这颗时间胶囊？\n\n内容是：${f.content.slice(0, 40)}${f.content.length > 40 ? '…' : ''}\n删了就找不回来了。`,
              );
            if (!ok) return;
            deleteFragment(f.id);
            showToast('已删除这颗胶囊', 'info');
          }}
        />
      )}

      {/* 加号：与灵感/日程/待办同一个位置与样式（bottom-24 避开固定底栏） */}
      {!composing && (
        <button
          onClick={() => setComposing({ content: '', tag: '', at: formatDate(new Date(), 'HH:mm'), touched: false })}
          className="vd-fab fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{ background: 'var(--wine)', boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)' }}
          aria-label="记一条碎片"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      )}
    </div>
  );
}

/** 一条碎片：时间 + 可选标签一行，正文在下面；铅笔就地编辑 */
function FragmentItem({
  item,
  editing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
}: {
  item: FragmentEntry;
  editing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (content: string, tag: string) => void;
  onDelete: () => void;
}) {
  const [content, setContent] = useState(item.content);
  const [tag, setTag] = useState(item.tag ?? '');

  return (
    <li className="relative pb-6 last:pb-1">
      {/* 时间行：圆点挂在这一行上（top:50% + 负半高 = 精确居中，行高变了也不会偏）。
          ⚠️ 两个 left 参照系不同，别照着「看上去的 8」写：
            - 竖轨是 <ol>（position:relative）的绝对子元素，left:8 相对 ol 的 padding box，
              所以轨道中心落在 ol 左边界 + 8.5；
            - 圆点在这行（也是 position:relative）里，而行的左边界已经被 ol 的 pl-6（24px）
              推到了 +24 —— 想让 9px 的圆点中心回到 8.5，left 就得是 8.5 - 24 - 4.5 = -20。
          （实测踩过：一开始写 left:4，圆点整整偏右 24px 掉进正文里；
            又因为行高被 24px 的操作键撑起来，写死 top 也偏了，所以改成相对行居中。） */}
      <div className="relative flex items-center gap-2">
        <span
          aria-hidden
          className="absolute rounded-full"
          style={{ left: -20, top: '50%', marginTop: -4.5, width: 9, height: 9, background: 'var(--amber)' }}
        />
        <span className="font-mono text-[11px] tracking-wider text-bronze-deep tabular-nums">
          {formatDate(item.createdAt, 'HH:mm')}
        </span>
        {!editing && item.tag && (
          <span className="tag" style={{ fontSize: 10 }}>
            {item.tag}
          </span>
        )}
        <span className="flex-1" />
        {/* 操作键常驻（移动端没有 hover，v4.5.1 的统一约定） */}
        {!editing && (
          <div className="flex items-center gap-0.5">
            <button
              onClick={onEdit}
              className="w-6 h-6 flex items-center justify-center text-bronze-deep hover:text-candle"
              aria-label="编辑这条碎片"
            >
              <Pencil size={12} strokeWidth={1.6} />
            </button>
            <button
              onClick={onDelete}
              className="w-6 h-6 flex items-center justify-center text-bronze-deep hover:text-wine-bright"
              aria-label="删除这条碎片"
            >
              <Trash2 size={12} strokeWidth={1.6} />
            </button>
          </div>
        )}
      </div>

      {editing ? (
        <div className="mt-1">
          <textarea
            autoFocus
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={2}
            className="w-full px-2 py-1.5 rounded-card border border-line/50 bg-bg-base text-paper font-serif text-reading outline-none resize-none focus:border-wine/60"
            style={{ lineHeight: 1.9 }}
          />
          <div className="flex items-center gap-2 mt-1.5">
            <input
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              placeholder="标签"
              aria-label="标签（可选）"
              className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper outline-none w-20"
            />
            <span className="flex-1" />
            <button onClick={onCancel} className="btn-text">
              取消
            </button>
            <button
              onClick={() => onSave(content, tag)}
              disabled={!content.trim()}
              className="btn-primary disabled:opacity-40"
              style={{ padding: '5px 12px', fontSize: '0.8125rem' }}
            >
              保存
            </button>
          </div>
        </div>
      ) : (
        <p className="mt-1 font-serif text-reading text-paper whitespace-pre-wrap break-words">
          {item.content}
        </p>
      )}

    </li>
  );
}
