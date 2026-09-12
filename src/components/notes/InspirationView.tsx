import { useState } from 'react';
import { Plus, Trash2, Edit2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { CategoryChips } from './CategoryChips';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { relativeTime } from '@/lib/utils';
import type { InspirationNote } from '@/types';

export function InspirationView() {
  const inspiration = useAppStore((s) => s.notes.inspiration);
  const addInspiration = useAppStore((s) => s.addInspiration);
  const updateInspiration = useAppStore((s) => s.updateInspiration);
  const deleteInspiration = useAppStore((s) => s.deleteInspiration);
  const showToast = useUIStore((s) => s.showToast);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ content: string; category: string } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filtered = selectedCat
    ? inspiration.filter((i) => i.category === selectedCat)
    : inspiration;

  const handleAdd = () => {
    setComposing({ content: '', category: selectedCat || '随想' });
  };

  return (
    <div>
      <CategoryChips
        which="inspiration"
        selected={selectedCat}
        onSelect={setSelectedCat}
      />

      {/* 撰写区 */}
      {composing && (
        <Card className="p-4 mb-4 animate-slide-up">
          <textarea
            autoFocus
            value={composing.content}
            onChange={(e) => setComposing({ ...composing, content: e.target.value })}
            placeholder="捕捉一瞬的灵感..."
            className="w-full bg-transparent resize-none font-serif text-reading text-paper placeholder:text-bronze-deep outline-none"
            rows={4}
            style={{ lineHeight: 1.95 }}
          />
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-bronze/10">
            <div className="flex items-center gap-2">
              <input
                value={composing.category}
                onChange={(e) =>
                  setComposing({ ...composing, category: e.target.value })
                }
                placeholder="分类"
                className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper outline-none w-20"
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setComposing(null)}
                className="btn-text"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (composing.content.trim()) {
                    addInspiration(composing.content.trim(), composing.category || '随想');
                    showToast('已记录', 'success');
                    setComposing(null);
                  }
                }}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              >
                保存
              </button>
            </div>
          </div>
        </Card>
      )}

      {/* 列表 */}
      {filtered.length === 0 && !composing ? (
        <EmptyState
          title="灵感是夜里的火星"
          hint="记录下每一次让你心头一动的瞬间"
          action={
            <button onClick={handleAdd} className="btn-primary">
              <Plus size={14} strokeWidth={1.6} /> 写下第一条
            </button>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <InspirationItem
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              onEdit={() => setEditingId(item.id)}
              onCancel={() => setEditingId(null)}
              onSave={(content) => {
                updateInspiration(item.id, { content });
                setEditingId(null);
              }}
              onDelete={() => {
                if (confirm('删除这条灵感？')) deleteInspiration(item.id);
              }}
            />
          ))}
        </ul>
      )}

      {/* 浮动添加按钮 */}
      {!composing && (
        <button
          onClick={handleAdd}
          className="fixed right-5 bottom-24 z-30 w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110 active:scale-95"
          style={{
            background: 'var(--wine)',
            boxShadow: '0 4px 20px rgba(106, 8, 14, 0.5)',
          }}
          aria-label="新增灵感"
        >
          <Plus size={22} strokeWidth={1.6} className="text-moon" />
        </button>
      )}
    </div>
  );
}

interface ItemProps {
  item: InspirationNote;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (content: string) => void;
  onDelete: () => void;
}

function InspirationItem({ item, isEditing, onEdit, onCancel, onSave, onDelete }: ItemProps) {
  const [draft, setDraft] = useState(item.content);

  if (isEditing) {
    // 必须包 <li>：本组件被渲染在 <ul> 里，编辑态直接返回 <Card>（div）
    // 会造成 ul > div 非法嵌套。
    return (
      <li>
        <Card className="p-4 animate-slide-up">
          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full bg-transparent resize-none font-serif text-reading text-paper outline-none"
            rows={4}
            style={{ lineHeight: 1.95 }}
          />
          <div className="flex justify-end gap-2 mt-3 pt-3 border-t border-bronze/10">
            <button onClick={onCancel} className="btn-text">
              取消
            </button>
            <button
              onClick={() => draft.trim() && onSave(draft.trim())}
              className="btn-primary"
              style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
            >
              保存
            </button>
          </div>
        </Card>
      </li>
    );
  }

  return (
    <li>
      <Card className="p-4 sm:p-5 group hover:scale-[1.005] transition-transform">
        <p className="font-serif text-reading text-paper whitespace-pre-wrap" style={{ lineHeight: 1.95 }}>
          {item.content}
        </p>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-bronze/10">
          <Tag>{item.category}</Tag>
          <span className="font-mono text-[10px] text-bronze-deep tracking-wider">
            {relativeTime(item.createdAt)}
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onEdit}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="编辑"
            >
              <Edit2 size={11} strokeWidth={1.5} />
            </button>
            <button
              onClick={onDelete}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-wine-light"
              aria-label="删除"
            >
              <Trash2 size={11} strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </Card>
    </li>
  );
}
