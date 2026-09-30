import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, MessageCircle, Lightbulb } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { chineseDate, chineseWeekday, todayKey, formatDate, plainText, excerpt } from '@/lib/utils';

interface DayItem {
  kind: 'article' | 'moment' | 'inspiration';
  id: string;
  time: string;
  label: string;
  body: string;
}

/** 主页 · 当日产出：展示选中日期（与月历/日程共用 selectedDate）发布的文章、动态、灵感 */
export function DayOutputCard() {
  const navigate = useNavigate();
  const selected = useUIStore((s) => s.selectedDate);
  const setFocusRequest = useUIStore((s) => s.setFocusRequest);
  const articles = useAppStore((s) => s.articles);
  const moments = useAppStore((s) => s.moments);
  const inspirations = useAppStore((s) => s.notes.inspiration);

  const items = useMemo<DayItem[]>(() => {
    const out: DayItem[] = [];
    for (const a of articles) {
      if (todayKey(new Date(a.createdAt)) !== selected) continue;
      out.push({
        kind: 'article',
        id: a.id,
        time: formatDate(a.createdAt, 'HH:mm'),
        label: a.title || '无标题文章',
        body: excerpt(plainText(a.content), 60),
      });
    }
    for (const m of moments) {
      if (todayKey(new Date(m.createdAt)) !== selected) continue;
      out.push({
        kind: 'moment',
        id: m.id,
        time: formatDate(m.createdAt, 'HH:mm'),
        label: '动态',
        body: excerpt(plainText(m.content), 60),
      });
    }
    for (const i of inspirations) {
      if (todayKey(new Date(i.createdAt)) !== selected) continue;
      out.push({
        kind: 'inspiration',
        id: i.id,
        time: formatDate(i.createdAt, 'HH:mm'),
        label: '灵感',
        body: excerpt(plainText(i.content), 60),
      });
    }
    return out.sort((a, b) => b.time.localeCompare(a.time));
  }, [selected, articles, moments, inspirations]);

  const goto = (kind: DayItem['kind'], id: string) => {
    // 统一带定位请求跳转：目标页挂载后按 id 滚动到对应位置（query 为空 = 不依赖文本匹配）
    setFocusRequest({
      kind,
      id,
      query: '',
      ignoreCase: false,
      index: 0,
      inTitle: false,
      ts: Date.now(),
    });
    if (kind === 'article') navigate(`/space/article/${id}`);
    else if (kind === 'moment') navigate('/moments');
    else navigate('/notes');
  };

  const kindTag = (kind: DayItem['kind']) => {
    const Icon = kind === 'article' ? FileText : kind === 'moment' ? MessageCircle : Lightbulb;
    const label = kind === 'article' ? '文章' : kind === 'moment' ? '动态' : '灵感';
    return (
      <span className="flex items-center gap-1 font-mono text-[9px] tracking-widest uppercase text-bronze-deep">
        <Icon size={11} strokeWidth={1.6} />
        {label}
      </span>
    );
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            day · output
          </p>
          <h3 className="font-serif text-headline text-lg mt-0.5">
            {chineseDate(new Date(selected))}
          </h3>
          <p className="font-sans text-bronze text-xs mt-0.5">
            周{chineseWeekday(new Date(selected))} · 文章 {items.filter((i) => i.kind === 'article').length} ·
            动态 {items.filter((i) => i.kind === 'moment').length} · 灵感 {items.filter((i) => i.kind === 'inspiration').length}
          </p>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="font-serif text-bronze text-sm py-3">这一天还没有留下任何产出。</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li key={`${it.kind}-${it.id}`}>
              <button
                onClick={() => goto(it.kind, it.id)}
                className="w-full text-left group flex items-start gap-3 p-2.5 -mx-1 rounded-lg hover:bg-bronze/5 transition-colors"
              >
                <div className="flex-none w-10 text-center">
                  <span className="font-mono text-[11px] text-bronze">{it.time}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {kindTag(it.kind)}
                    <span className="font-serif text-headline text-sm truncate-1">{it.label}</span>
                  </div>
                  {it.body && (
                    <p className="font-serif text-bronze text-xs mt-0.5 truncate-1 group-hover:text-paper transition-colors">
                      {it.body}
                    </p>
                  )}
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
