import { useState } from 'react';
import { Tag as TagIcon, Plus, X, Check } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import type { Categories } from '@/types';
import { useUIStore } from '@/stores/useUIStore';
import { clsx } from '@/lib/utils';

interface CategoryChipsProps {
  which: keyof Categories;
  selected: string | null;
  onSelect: (cat: string | null) => void;
}

export function CategoryChips({ which, selected, onSelect }: CategoryChipsProps) {
  const categories = useAppStore((s) => s.categories[which]);
  const addCategory = useAppStore((s) => s.addCategory);
  const removeCategory = useAppStore((s) => s.removeCategory);
  const renameCategory = useAppStore((s) => s.renameCategory);
  const showToast = useUIStore((s) => s.showToast);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [adding, setAdding] = useState(false);
  const [newValue, setNewValue] = useState('');

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1">
      <button
        onClick={() => onSelect(null)}
        className={clsx(
          'tag flex-shrink-0 transition-all',
          selected === null ? 'tag-wine' : 'hover:brightness-110',
        )}
      >
        <TagIcon size={10} strokeWidth={1.6} />
        全部
      </button>
      {categories.map((c) => {
        const isSelected = selected === c;
        const isEditing = editingCat === c;
        return (
          <div key={c} className="flex-shrink-0 group flex items-center">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && editValue.trim()) {
                      renameCategory(which, c, editValue.trim());
                      setEditingCat(null);
                      onSelect(editValue.trim());
                    } else if (e.key === 'Escape') {
                      setEditingCat(null);
                    }
                  }}
                  className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper outline-none w-20"
                />
                <button
                  onClick={() => {
                    if (editValue.trim()) {
                      renameCategory(which, c, editValue.trim());
                      setEditingCat(null);
                      onSelect(editValue.trim());
                    }
                  }}
                  className="w-5 h-5 flex items-center justify-center text-candle"
                >
                  <Check size={11} strokeWidth={2} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onSelect(c)}
                onDoubleClick={() => {
                  setEditingCat(c);
                  setEditValue(c);
                }}
                className={clsx(
                  'tag transition-all',
                  isSelected ? 'tag-wine' : 'hover:brightness-110',
                )}
              >
                {c}
              </button>
            )}
            {!isEditing && (
              <button
                onClick={() => {
                  if (confirm(`删除分类「${c}」？该分类下的便签不会被删除。`)) {
                    removeCategory(which, c);
                    if (selected === c) onSelect(null);
                    showToast('已删除分类', 'success');
                  }
                }}
                className="opacity-0 group-hover:opacity-100 ml-0.5 w-4 h-4 flex items-center justify-center text-bronze hover:text-wine-light transition-all"
              >
                <X size={9} strokeWidth={1.6} />
              </button>
            )}
          </div>
        );
      })}
      {adding ? (
        <div className="flex items-center gap-1 flex-shrink-0">
          <input
            autoFocus
            value={newValue}
            placeholder="新分类"
            onChange={(e) => setNewValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newValue.trim()) {
                addCategory(which, newValue.trim());
                setNewValue('');
                setAdding(false);
              } else if (e.key === 'Escape') {
                setAdding(false);
                setNewValue('');
              }
            }}
            className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper outline-none w-20"
          />
          <button
            onClick={() => {
              if (newValue.trim()) {
                addCategory(which, newValue.trim());
                setNewValue('');
                setAdding(false);
              }
            }}
            className="w-5 h-5 flex items-center justify-center text-candle"
          >
            <Check size={11} strokeWidth={2} />
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="tag flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity"
        >
          <Plus size={10} strokeWidth={1.6} />
        </button>
      )}
    </div>
  );
}
