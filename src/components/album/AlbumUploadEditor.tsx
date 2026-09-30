// 相册 · 上传 / 编辑一组照片（v4.5）
// - 新组：选图（≤30 张）→ 压缩入库 → 排顺序 → 写文案 → 发布；
// - 编辑组：预填旧图片顺序与文案，保存只改内容不动发布时间（更新不算发布）；
// - 拖动排序：桌面用 HTML5 拖拽；触屏用「长按 350ms 进入拖拽」，
//   容器禁用选择复制（-webkit-touch-callout / select-none），长按不会呼出系统菜单。
import { useEffect, useRef, useState } from 'react';
import { X, ArrowUpDown, Check, ImagePlus } from 'lucide-react';
import { MediaImage } from '@/components/common/MediaImage';
import { useUIStore } from '@/stores/useUIStore';
import { compressImage, uid, clsx } from '@/lib/utils';
import { putFile } from '@/lib/db';

export interface AlbumUploadEditorProps {
  /** 初始图片（编辑时传入旧组；发布时传空） */
  initialImages?: string[];
  /** 初始文案 */
  initialCaption?: string;
  title: string;
  submitLabel: string;
  /** 提交：返回处理后的图片顺序与文案 */
  onSubmit: (images: string[], caption: string) => void;
  onClose: () => void;
}

const MAX_IMAGES = 30;

export function AlbumUploadEditor({
  initialImages = [],
  initialCaption = '',
  title,
  submitLabel,
  onSubmit,
  onClose,
}: AlbumUploadEditorProps) {
  const showToast = useUIStore((s) => s.showToast);
  const setLightbox = useUIStore((s) => s.setLightbox);
  const fileRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<string[]>(initialImages);
  const [caption, setCaption] = useState(initialCaption);
  const [uploading, setUploading] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const isCoarse =
    typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  // 触屏长按拖拽：ref 存最新拖拽源（高频 touchmove 里不能依赖 state 闭包），
  // state 只负责视觉；未进入拖拽前（350ms 内或已移动）滚动照常。
  const dragFromRef = useRef<number | null>(null);
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout> | null; x: number; y: number; index: number | null }>({
    timer: null,
    x: 0,
    y: 0,
    index: null,
  });

  const setDrag = (n: number | null) => {
    dragFromRef.current = n;
    setDragFrom(n);
  };

  const moveImage = (from: number, to: number) => {
    if (from === to) return;
    setImages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const pickFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_IMAGES - images.length;
    const picked = Array.from(files).slice(0, room);
    if (picked.length < files.length) {
      showToast(`一组最多 ${MAX_IMAGES} 张，已截取前 ${room} 张`, 'info');
    }
    if (picked.length === 0) {
      showToast(`这组已经满 ${MAX_IMAGES} 张了`, 'error');
      return;
    }
    setUploading(true);
    showToast('正在上传…', 'info');
    const ids: string[] = [];
    for (const file of picked) {
      try {
        const blob = await compressImage(file);
        const id = uid('img_');
        await putFile({ id, blob, mime: 'image/jpeg', name: file.name, size: blob.size });
        ids.push(id);
      } catch {
        showToast(`「${file.name}」处理失败，已跳过`, 'error');
      }
    }
    if (ids.length > 0) setImages((prev) => [...prev, ...ids]);
    setUploading(false);
  };

  // 触屏拖拽（文档级监听：手指移出原缩略图后仍能换位）
  useEffect(() => {
    if (!isCoarse) return;
    const onTouchStartTile = (e: TouchEvent) => {
      const tile = (e.target as HTMLElement).closest('[data-album-tile]') as HTMLElement | null;
      if (!tile) return;
      const index = Number(tile.dataset.index);
      if (Number.isNaN(index)) return;
      const t = e.touches[0];
      longPress.current = {
        timer: setTimeout(() => setDrag(index), 350),
        x: t.clientX,
        y: t.clientY,
        index,
      };
    };
    const onTouchMove = (e: TouchEvent) => {
      // 未进入拖拽：手指动过就算滚动，取消长按计时
      if (dragFromRef.current === null) {
        if (longPress.current.timer) {
          const t = e.touches[0];
          const dx = t.clientX - longPress.current.x;
          const dy = t.clientY - longPress.current.y;
          if (Math.abs(dx) + Math.abs(dy) > 10) {
            clearTimeout(longPress.current.timer);
            longPress.current.timer = null;
          }
        }
        return;
      }
      e.preventDefault();
      const el = document.elementFromPoint(e.touches[0].clientX, e.touches[0].clientY) as HTMLElement | null;
      const target = el?.closest('[data-album-tile]') as HTMLElement | null;
      if (target) {
        const to = Number(target.dataset.index);
        const from = dragFromRef.current;
        if (!Number.isNaN(to) && to !== from) {
          setDrag(to);
          moveImage(from, to);
        }
      }
    };
    const onTouchEnd = () => {
      if (longPress.current.timer) {
        clearTimeout(longPress.current.timer);
        longPress.current.timer = null;
      }
      setDrag(null);
    };
    document.addEventListener('touchstart', onTouchStartTile, { passive: true });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd);
    document.addEventListener('touchcancel', onTouchEnd);
    return () => {
      document.removeEventListener('touchstart', onTouchStartTile);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('touchend', onTouchEnd);
      document.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [isCoarse, moveImage]);

  const submit = () => {
    if (images.length === 0) {
      showToast('至少选一张照片', 'error');
      return;
    }
    onSubmit(images, caption.trim());
  };

  return (
    <div className="fixed inset-0 z-[55] flex flex-col" style={{ background: 'var(--bg-base, rgba(20,18,22,0.98))' }}>
      {/* 顶栏 */}
      <div className="flex items-center justify-between px-4 h-[52px] flex-none border-b border-line/50" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <button onClick={onClose} className="flex items-center gap-1 font-mono text-[11px] tracking-wider text-bronze hover:text-candle">
          <X size={14} strokeWidth={1.6} /> 取消
        </button>
        <p className="font-serif text-headline text-sm">{title}</p>
        <span className="w-14 text-right font-mono text-[10px] text-bronze-deep">{images.length}/{MAX_IMAGES}</span>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-4 select-none" style={{ WebkitTouchCallout: 'none' }}>
        {/* 图片网格（可拖动排序） */}
        {images.length > 0 && (
          <div>
            <p className="flex items-center gap-1.5 font-mono text-[10px] tracking-widest text-bronze-deep uppercase mb-2">
              <ArrowUpDown size={11} strokeWidth={1.6} />
              拖动调整顺序 · 点击缩略图预览大图
            </p>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
              {images.map((id, i) => (
                <div
                  key={id}
                  data-album-tile
                  data-index={i}
                  draggable={!isCoarse}
                  onDragStart={() => !isCoarse && setDragFrom(i)}
                  onDragOver={(e) => !isCoarse && e.preventDefault()}
                  onDrop={(e) => {
                    if (isCoarse) return;
                    e.preventDefault();
                    if (dragFrom !== null && dragFrom !== i) moveImage(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className={clsx(
                    'relative aspect-square rounded-card overflow-hidden border transition-all',
                    dragFrom === i ? 'opacity-50 border-amber scale-95' : 'border-line/50',
                    !isCoarse && 'cursor-grab active:cursor-grabbing',
                  )}
                >
                  <MediaImage fileId={id} className="w-full h-full object-cover" onOpen={() => setLightbox({ fileId: id, starTag: 'album' })} />
                  {/* 序号 */}
                  <span className="absolute top-1 left-1 min-w-[18px] h-[18px] px-0.5 rounded-full flex items-center justify-center font-mono text-[9px] text-moon"
                    style={{ background: 'rgba(106,8,14,0.85)' }}>
                    {i + 1}
                  </span>
                  {/* 移除 */}
                  <button
                    onClick={() => setImages(images.filter((x) => x !== id))}
                    className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-moon"
                    style={{ background: 'var(--wine-deep)' }}
                    aria-label="移除这张照片"
                  >
                    <X size={11} strokeWidth={2} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 加图（未满 30 张时显示） */}
        {images.length < MAX_IMAGES && (
          <div className="flex items-center justify-center">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void pickFiles(e.target.files);
                e.target.value = '';
              }}
            />
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-pill font-mono text-[11px] tracking-wider text-bronze hover:text-candle border border-dashed border-bronze/30 disabled:opacity-50"
            >
              <ImagePlus size={14} strokeWidth={1.5} />
              {uploading ? '正在上传…' : '添加照片'}
            </button>
          </div>
        )}

        {/* 文案 */}
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="给这组照片写一段文案（可选）…"
          rows={4}
          className="w-full px-3 py-2.5 rounded-card border border-line/50 bg-bg-base text-paper font-serif text-reading placeholder:text-bronze-deep outline-none resize-none"
          style={{ lineHeight: 1.9 }}
        />
      </div>

      {/* 底部：发布 / 保存修改 */}
      <div className="flex-none px-4 py-3 border-t border-line/50 flex items-center justify-end gap-2" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}>
        <button onClick={onClose} className="btn-text">
          取消
        </button>
        <button
          onClick={submit}
          disabled={uploading}
          className="btn-primary flex items-center gap-1.5 disabled:opacity-50"
          style={{ padding: '9px 18px' }}
        >
          <Check size={14} strokeWidth={1.8} /> {submitLabel}
        </button>
      </div>
    </div>
  );
}
