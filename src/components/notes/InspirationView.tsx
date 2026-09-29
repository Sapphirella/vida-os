import { useEffect, useMemo, useRef, useState } from 'react';
import { Plus, Trash2, Edit2, Search, Star, BookOpen, ImagePlus, X } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { Tag } from '@/components/common/Tag';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { CategoryChips } from './CategoryChips';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { usePageFind } from '@/components/search/usePageFind';
import { PageFindBar } from '@/components/search/PageFindBar';
import { useGlobalFocus } from '@/lib/focusRequest';
import { compressImage, uid, relativeTime, clsx } from '@/lib/utils';
import { putFile } from '@/lib/db';
import type { InspirationNote } from '@/types';

export function InspirationView() {
  const inspiration = useAppStore((s) => s.notes.inspiration);
  const addInspiration = useAppStore((s) => s.addInspiration);
  const updateInspiration = useAppStore((s) => s.updateInspiration);
  const deleteInspiration = useAppStore((s) => s.deleteInspiration);
  const toggleInspirationStar = useAppStore((s) => s.toggleInspirationStar);
  const convertInspirationToArticle = useAppStore((s) => s.convertInspirationToArticle);
  const showToast = useUIStore((s) => s.showToast);
  const focusRequest = useUIStore((s) => s.focusRequest);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [composing, setComposing] = useState<{ content: string; category: string; imageIds: string[] } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = selectedCat
    ? inspiration.filter((i) => i.category === selectedCat)
    : inspiration;

  // 全局查找跳到灵感时，清空分类筛选保证目标可见
  useEffect(() => {
    if (focusRequest?.kind === 'inspiration') setSelectedCat(null);
  }, [focusRequest]);

  // 页内查找替换：灵感正文即目标
  const targets = useMemo(
    () =>
      inspiration.map((i) => ({
        id: i.id,
        title: '',
        content: i.content,
        replaceContent: (next: string) => updateInspiration(i.id, { content: next }),
      })),
    [inspiration, updateInspiration],
  );
  const find = usePageFind<HTMLUListElement>(targets, {
    onToast: (msg, type) => showToast(msg, type),
  });
  useGlobalFocus('inspiration', undefined, () => find.listRef.current);

  const handleAdd = () => {
    setComposing({ content: '', category: selectedCat || '随想', imageIds: [] });
  };

  const handlePickImages = async (files: FileList | null) => {
    if (!files) return [];
    const ids: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file);
        const id = uid('img_');
        await putFile({ id, blob, mime: 'image/jpeg', name: file.name, size: blob.size });
        ids.push(id);
      } catch {
        showToast('图片处理失败', 'error');
      }
    }
    return ids;
  };

  const handleConvert = (id: string) => {
    const artId = convertInspirationToArticle(id);
    if (artId) {
      showToast('已转为文章，可在「空间」查看', 'success');
    }
  };

  return (
    <div>
      {/* 工具行：查找替换 + 计数 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => find.toggleOpen()}
          className="px-2.5 py-1 rounded-pill text-[11px] font-mono tracking-wider transition-colors flex items-center gap-1 text-[color:var(--find-fg-dim)] hover:text-[color:var(--find-fg)] bg-bronze/10"
        >
          <Search size={11} strokeWidth={1.6} />
          查找替换
        </button>
        <span className="flex-1" />
        <span className="font-mono text-[10px] text-bronze-deep tracking-wider">
          共 {inspiration.length} 条
        </span>
      </div>
      <PageFindBar find={find} />

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
          {/* 图片预览 */}
          {composing.imageIds.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {composing.imageIds.map((id) => (
                <div key={id} className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <MediaImage fileId={id} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setComposing({ ...composing, imageIds: composing.imageIds.filter((x) => x !== id) })}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-moon"
                    style={{ background: 'var(--wine-deep)' }}
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
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
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  const ids = await handlePickImages(e.target.files);
                  if (ids.length > 0) {
                    setComposing((c) => c ? { ...c, imageIds: [...c.imageIds, ...ids] } : c);
                  }
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-colors"
                aria-label="添加图片"
              >
                <ImagePlus size={16} strokeWidth={1.5} />
              </button>
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
                    addInspiration(composing.content.trim(), composing.category || '随想', composing.imageIds);
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
        <ul ref={find.listRef} className="space-y-3">
          {filtered.map((item) => (
            <InspirationItem
              key={item.id}
              item={item}
              isEditing={editingId === item.id}
              onEdit={() => setEditingId(item.id)}
              onCancel={() => setEditingId(null)}
              onSave={(content, imageIds) => {
                updateInspiration(item.id, { content, imageIds });
                setEditingId(null);
              }}
              onDelete={() => {
                if (confirm('删除这条灵感？')) deleteInspiration(item.id);
              }}
              onStar={() => toggleInspirationStar(item.id)}
              onConvert={() => handleConvert(item.id)}
              contentHtml={find.hlText(item.content, item.id, 'content')}
              findCardProps={find.findCardProps(item.id)}
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
  onSave: (content: string, imageIds: string[]) => void;
  onDelete: () => void;
  onStar: () => void;
  onConvert: () => void;
  /** 页内查找高亮后的正文 HTML */
  contentHtml: string;
  findCardProps: Record<string, string>;
}

function InspirationItem({ item, isEditing, onEdit, onCancel, onSave, onDelete, onStar, onConvert, contentHtml, findCardProps }: ItemProps) {
  const [draft, setDraft] = useState(item.content);
  const [draftImages, setDraftImages] = useState(item.imageIds);
  const fileRef = useRef<HTMLInputElement>(null);

  const handlePickImages = async (files: FileList | null) => {
    if (!files) return;
    const ids: string[] = [];
    for (const file of Array.from(files)) {
      try {
        const blob = await compressImage(file);
        const id = uid('img_');
        await putFile({ id, blob, mime: 'image/jpeg', name: file.name, size: blob.size });
        ids.push(id);
      } catch {
        // silently fail for individual images
      }
    }
    if (ids.length > 0) {
      setDraftImages((prev) => [...prev, ...ids]);
    }
  };

  if (isEditing) {
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
          {/* 图片预览 */}
          {draftImages.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {draftImages.map((id) => (
                <div key={id} className="relative w-16 h-16 rounded-lg overflow-hidden">
                  <MediaImage fileId={id} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setDraftImages(draftImages.filter((x) => x !== id))}
                    className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-moon"
                    style={{ background: 'var(--wine-deep)' }}
                  >
                    <X size={10} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-bronze/10">
            <div className="flex items-center gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                hidden
                onChange={async (e) => {
                  await handlePickImages(e.target.files);
                  e.target.value = '';
                }}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-colors"
                aria-label="添加图片"
              >
                <ImagePlus size={16} strokeWidth={1.5} />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={onCancel} className="btn-text">
                取消
              </button>
              <button
                onClick={() => draft.trim() && onSave(draft.trim(), draftImages)}
                className="btn-primary"
                style={{ padding: '6px 14px', fontSize: '0.8125rem' }}
              >
                保存
              </button>
            </div>
          </div>
        </Card>
      </li>
    );
  }

  return (
    <li {...findCardProps}>
      <Card className="p-4 sm:p-5 group hover:scale-[1.005] transition-transform">
        {/* 星标 */}
        <div className="flex items-start gap-2">
          <button
            onClick={onStar}
            className={clsx(
              'flex-none mt-0.5 transition-colors',
              item.starred ? 'text-amber' : 'text-bronze/40 hover:text-bronze'
            )}
            aria-label={item.starred ? '取消星标' : '星标'}
          >
            <Star size={14} strokeWidth={1.6} className={item.starred ? 'fill-current' : ''} />
          </button>
          <div className="flex-1 min-w-0">
            <p
              className="font-serif text-reading text-paper whitespace-pre-wrap"
              style={{ lineHeight: 1.95 }}
              dangerouslySetInnerHTML={{ __html: contentHtml }}
            />
            {/* 图片展示 */}
            {item.imageIds.length > 0 && (
              <div className="flex gap-2 mt-3 flex-wrap">
                {item.imageIds.map((id) => (
                  <div key={id} className="w-20 h-20 rounded-lg overflow-hidden">
                    <MediaImage fileId={id} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-bronze/10">
          <Tag>{item.category}</Tag>
          <span className="font-mono text-[10px] text-bronze-deep tracking-wider">
            {relativeTime(item.createdAt)}
          </span>
          <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={onConvert}
              className="w-6 h-6 flex items-center justify-center text-bronze hover:text-candle"
              aria-label="转为文章"
              title="转为文章"
            >
              <BookOpen size={11} strokeWidth={1.5} />
            </button>
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
