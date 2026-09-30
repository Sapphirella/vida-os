import { useEffect, useState } from 'react';
import { fileURL } from '@/lib/fileUrl';
import { clsx } from '@/lib/utils';

interface MediaImageProps {
  fileId?: string;
  alt?: string;
  className?: string;
  /** 点击放大：传入回调后图片变为可点击（放大预览） */
  onOpen?: (fileId: string) => void;
}

export function MediaImage({ fileId, alt, className, onOpen }: MediaImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let mounted = true;
    setLoaded(false);
    setFailed(false);
    if (fileId) {
      fileURL(fileId).then((u) => {
        if (!mounted) return;
        if (u) setUrl(u);
        else setFailed(true); // 文件不存在 / 读取失败：不再一直显示脉冲占位
      });
    }
    return () => {
      mounted = false;
    };
  }, [fileId]);

  if (!fileId) return null;
  if (failed) {
    return (
      <div
        className={clsx(
          'flex items-center justify-center bg-wood/30 text-bronze-deep text-[10px]',
          className,
        )}
        aria-label={alt}
      >
        图片不可用
      </div>
    );
  }
  if (!url) {
    return (
      <div
        className={clsx('bg-wood/30 animate-pulse', className)}
        aria-label={alt}
      />
    );
  }
  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      decoding="async"
      onLoad={() => setLoaded(true)}
      onError={() => setFailed(true)}
      onClick={onOpen && fileId ? () => onOpen(fileId) : undefined}
      className={clsx(
        'transition-opacity duration-500',
        loaded ? 'opacity-100' : 'opacity-0',
        onOpen && 'cursor-zoom-in',
        className,
      )}
    />
  );
}
