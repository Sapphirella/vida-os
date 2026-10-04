// 空间 · 标签栏目（v4.7.6）
//
// 定位：**标签是从文章派生出来的**，没有独立的注册表 ——
//   列表 = 所有文章 tags 的并集（带使用次数），所以「所有用了标签的文章，标签都会出现在这里」。
//   代价是「删掉最后一个用它的文章，标签就消失」，这符合直觉；
//   好处是不存在「注册表里有、文章里没有」的幽灵标签（灵感/日程/待办那套分类桶有这个毛病）。
//
// 交互（用户要求）：
//   - 点一下 → 筛选下面的文章列表（栏目存在的意义就是筛选）
//   - 双击 → 就地改名，**所有用到它的文章一起改**
//   - 右侧 × → 删除，**从所有文章上摘掉**（要确认，因为是批量改动）
import { useState } from 'react';
import { Check, X } from 'lucide-react';
import { clsx } from '@/lib/utils';

export interface ArticleTag {
  name: string;
  count: number;
}

export function ArticleTags({
  tags,
  active,
  onSelect,
  onRename,
  onDelete,
}: {
  tags: ArticleTag[];
  /** 当前用于筛选的标签（null = 不筛选） */
  active: string | null;
  onSelect: (tag: string | null) => void;
  onRename: (from: string, to: string) => void;
  onDelete: (tag: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const commit = (from: string) => {
    const next = draft.trim();
    setEditing(null);
    setDraft('');
    if (next && next !== from) onRename(from, next);
  };

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {tags.map((t) => {
          if (editing === t.name) {
            return (
              <span key={t.name} className="flex items-center gap-1">
                <input
                  autoFocus
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commit(t.name);
                    else if (e.key === 'Escape') {
                      setEditing(null);
                      setDraft('');
                    }
                  }}
                  aria-label={`重命名标签 ${t.name}`}
                  className="px-2 py-1 rounded-pill text-xs bg-bronze/10 text-paper outline-none w-24"
                />
                <button
                  onClick={() => commit(t.name)}
                  className="w-6 h-6 flex items-center justify-center text-candle"
                  aria-label="确认重命名"
                >
                  <Check size={12} strokeWidth={2} />
                </button>
              </span>
            );
          }
          const on = active === t.name;
          return (
            <span
              key={t.name}
              // data-article-tag：给「锚定到具体标签」的探针/脚本一个稳定选择器
              // （aria-label 会随选中态在「筛选」/「取消筛选」之间变，照它定位会漂）
              data-article-tag={t.name}
              className={clsx('tag', on && 'tag-wine')}
              style={{ paddingRight: 4 }}
              title="点击筛选 · 双击改名"
            >
              <button
                onClick={() => onSelect(on ? null : t.name)}
                onDoubleClick={() => {
                  setEditing(t.name);
                  setDraft(t.name);
                }}
                className="flex items-center gap-1"
                aria-label={`${on ? '取消筛选' : '筛选'}标签 ${t.name}`}
              >
                #{t.name}
                <span className="font-mono text-[9px] opacity-70">{t.count}</span>
              </button>
              {/* 删除键常驻（移动端没有 hover，与全站约定一致） */}
              <button
                onClick={() => onDelete(t.name)}
                className="w-4 h-4 flex items-center justify-center rounded-full opacity-60 hover:opacity-100"
                aria-label={`删除标签 ${t.name}`}
              >
                <X size={10} strokeWidth={2.2} />
              </button>
            </span>
          );
        })}
      </div>
      <p className="mt-2 font-mono text-[10px] tracking-wider text-bronze-deep">
        点标签筛选文章 · 双击改名 · × 删除（会从所有文章上摘掉这个标签）
      </p>
    </div>
  );
}
