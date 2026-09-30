import { useEffect, useState } from 'react';
import { X, Download, ImageIcon } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { fileURL } from '@/lib/fileUrl';
import { getFile } from '@/lib/db';

/**
 * 图片放大预览（全局，App 挂载）：
 * 文章 / 动态 / 灵感里的图片点击后全屏查看；
 * 手机端通过系统分享保存到相册，电脑端直接下载到本地。
 */
export function ImageLightbox() {
  const lightbox = useUIStore((s) => s.lightbox);
  const setLightbox = useUIStore((s) => s.setLightbox);
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    setUrl(null);
    if (lightbox?.fileId) {
      void fileURL(lightbox.fileId).then((u) => {
        if (mounted) setUrl(u);
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
    const f = await getFile(fileId);
    if (!f) return;
    const ext = (f.mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            void save();
          }}
          className="flex items-center gap-2 px-5 py-2.5 rounded-pill text-[13px] text-moon transition-all"
          style={{ background: 'var(--wine)', boxShadow: '0 0 20px rgba(106,8,14,0.4)' }}
        >
          <Download size={15} strokeWidth={1.6} />
          {isTouch ? '保存到相册' : '下载图片'}
        </button>
      )}
    </div>
  );
}
