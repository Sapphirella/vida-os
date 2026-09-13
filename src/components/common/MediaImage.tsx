import { useEffect, useState } from 'react';
import { fileURL } from '@/lib/fileUrl';
import { clsx } from '@/lib/utils';

interface MediaImageProps {
  fileId?: string;
  alt?: string;
  className?: string;
}

export function MediaImage({ fileId, alt, className }: MediaImageProps) {
  const [url, setUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (fileId) {
      fileURL(fileId).then((u) => {
        if (mounted) setUrl(u);
      });
    }
    return () => {
      mounted = false;
    };
  }, [fileId]);

  if (!fileId) return null;
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
      className={clsx('transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0', className)}
    />
  );
}
