import { useEffect, useState } from 'react';
import { X, Download, ImageIcon, Star } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useAppStore } from '@/stores/useAppStore';
import { fileURL } from '@/lib/fileUrl';
import { fullImageId } from '@/lib/media';
import { getFile } from '@/lib/db';

/**
 * 图片放大预览（全局，App 挂载）：
 * 文章 / 动态 / 灵感 / 相册里的图片点击后全屏查看；
 * 手机端通过系统分享保存到相册，电脑端直接下载到本地；
 * 打开方传了 starTag 时额外提供「存入星标集」按钮（已存入可再点取消）。
 */
export function ImageLightbox() {
  const lightbox = useUIStore((s) => s.lightbox);
  const setLightbox = useUIStore((s) => s.setLightbox);
  const albumStars = useAppStore((s) => s.albumStars);
  const addAlbumStar = useAppStore((s) => s.addAlbumStar);
  const deleteAlbumStar = useAppStore((s) => s.deleteAlbumStar);
  const showToast = useUIStore((s) => s.showToast);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setUrl(null);
    if (lightbox?.fileId) {
      // 开了「存原图」的图，这里显示的是**原始分辨率**那一份（预览图只有长边 2560，
      // 放大看会糊）；没有原图就退回预览图（v4.7.8）
      void fullImageId(lightbox.fileId)
        .then((id) => fileURL(id))
        .then((u) => {
          if (!mounted) return;
          setUrl(u);
          // 读不到 blob：别让界面一直停在「加载图片…」（v4.7.11）
          if (!u) showToast('这张图的文件已不在本机（可能被清理过）', 'error');
        });
    }
    return () => {
      mounted = false;
    };
  }, [lightbox?.fileId]);

  if (!lightbox) return null;

  const fileId = lightbox.fileId;
  const close = () => setLightbox(null);

  const isTouch =
    (navigator.maxTouchPoints ?? 0) > 0 ||
    (window.matchMedia?.('(pointer: coarse)').matches ?? false);

  const save = async () => {
    // 保存的也是原图那一份（有的话）
    const f = await getFile(await fullImageId(fileId));
    if (!f) {
      // v4.7.11：文件已被清理过（例如早前的「清除缓存」误删）时，
      // 以前这里直接 return —— 点了没任何反应，用户以为按钮坏了
      showToast('这张图的文件已不在本机（可能被清理过），无法保存', 'error');
      return;
    }
    // mime 可能缺失（手改过的备份/极旧的记录）→ 别让它把「保存图片」整条打挂
    const ext = ((f.mime || 'image/jpeg').split('/')[1] || 'jpg').replace('jpeg', 'jpg');
    const name = f.name || `vidaos-${fileId}.${ext}`;
    // 手机：系统分享（可存相册）；电脑：<a download> 直接下载
    if (isTouch && typeof navigator.share === 'function' && navigator.canShare) {
      try {
        const file = new File([f.blob], name, { type: f.mime });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ files: [file] });
          return;
        }
      } catch {
        // 用户取消或分享不可用：回退到下载
      }
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(f.blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  };

  // 存入星标集：同一张图在同一标签下只留一条；已存则再点取消
  const starTag = lightbox.starTag;
  const existing = starTag
    ? albumStars.find((s) => s.imageId === fileId && s.tag === starTag)
    : undefined;

  const toggleStar = () => {
    if (!starTag) return;
    if (existing) {
      deleteAlbumStar(existing.id);
      showToast('已从星标集移除', 'info');
    } else {
      addAlbumStar({
        imageId: fileId,
        tag: starTag,
        refType: lightbox.refType,
        refId: lightbox.refId,
      });
      showToast('已存入星标集', 'success');
    }
  };

  const tagLabel =
    starTag === 'article' ? '文章' : starTag === 'moment' ? '动态' : starTag === 'inspiration' ? '灵感' : starTag === 'album' ? '相册' : '';

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col items-center justify-center gap-5"
      style={{ background: 'rgba(10, 8, 12, 0.92)' }}
      onClick={close}
    >
      <button
        onClick={close}
        className="absolute top-[calc(env(safe-area-inset-top,0)+14px)] right-4 w-10 h-10 flex items-center justify-center rounded-full text-bronze-light hover:text-moon hover:bg-bronze/20 transition-colors"
        aria-label="关闭"
      >
        <X size={20} strokeWidth={1.5} />
      </button>

      {url ? (
        <img
          src={url}
          alt="放大预览"
          onClick={(e) => e.stopPropagation()}
          className="max-w-[92vw] max-h-[76vh] object-contain rounded-lg shadow-2xl"
          style={{ background: 'transparent' }}
        />
      ) : (
        <div className="flex flex-col items-center gap-2 text-bronze">
          <ImageIcon size={26} strokeWidth={1.2} />
          <p className="font-serif text-sm">加载图片…</p>
        </div>
      )}

      {url && (
        <div className="flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => void save()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-pill text-[13px] text-moon transition-all"
            style={{ background: 'var(--wine)', boxShadow: '0 0 20px rgba(106,8,14,0.4)' }}
          >
            <Download size={15} strokeWidth={1.6} />
            {isTouch ? '保存到相册' : '下载图片'}
          </button>
          {starTag && (
            <button
              onClick={toggleStar}
              className={
                'flex items-center gap-2 px-5 py-2.5 rounded-pill text-[13px] transition-all ' +
                (existing
                  ? 'text-amber border border-amber/40 bg-amber/10'
                  : 'text-moon border border-bronze/30 bg-bronze/10 hover:bg-bronze/20')
              }
            >
              <Star size={15} strokeWidth={1.6} fill={existing ? 'currentColor' : 'none'} />
              {existing ? `已在星标集·${tagLabel}（点击移除）` : `存入星标集·${tagLabel}`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
