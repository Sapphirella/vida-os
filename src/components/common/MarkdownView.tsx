import { useEffect, useMemo, useRef } from 'react';
import { fileURL } from '@/lib/fileUrl';
import { renderMarkdown } from '@/lib/markdown';
import { clsx } from '@/lib/utils';

/** 正文里内嵌本地图片的写法：![说明](fileRef:<fileId>) */
export const FILE_REF_PREFIX = 'fileRef:';

/** 取出正文中所有 fileRef 引用的 fileId */
export function collectInlineImageIds(markdown: string): string[] {
  return Array.from(markdown.matchAll(/fileRef:([A-Za-z0-9_-]+)/g)).map((m) => m[1]);
}

interface MarkdownViewProps {
  markdown: string;
  className?: string;
  /** 渲染后的 HTML 还可以再过一道处理（例如查找高亮） */
  htmlTransform?: (html: string) => string;
}

/**
 * 渲染 Markdown，并把正文里的 ![x](fileRef:<id>) 解析成本地 Blob 的 objectURL。
 * renderMarkdown 是同步的，没法在里面 await 文件读取，所以先渲染出
 * src="fileRef:xxx" 的占位，挂载后再换成真实 URL（文件缺失时显示可见提示）。
 */
export function MarkdownView({ markdown, className, htmlTransform }: MarkdownViewProps) {
  const ref = useRef<HTMLDivElement>(null);

  // 解析结果按 markdown 缓存：输入评论/重渲染时不会对每条动态重复整段 markdown 解析
  const rawHtml = useMemo(() => renderMarkdown(markdown), [markdown]);
  const html = htmlTransform ? htmlTransform(rawHtml) : rawHtml;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;

    const imgs = Array.from(
      root.querySelectorAll<HTMLImageElement>(`img[src^="${FILE_REF_PREFIX}"]`),
    );
    imgs.forEach((img) => {
      const id = (img.getAttribute('src') || '').slice(FILE_REF_PREFIX.length);
      if (!id) return;
      void fileURL(id).then((url) => {
        if (cancelled) return;
        if (url) {
          img.src = url;
          img.classList.add('vd-inline-img');
        } else {
          const box = document.createElement('span');
          box.className = 'vd-missing-img';
          box.textContent = '（这张图片已丢失）';
          img.replaceWith(box);
        }
      });
    });

    return () => {
      cancelled = true;
    };
  }, [html]);

  return (
    <div
      ref={ref}
      className={clsx('prose-vidaos', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
