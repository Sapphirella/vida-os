import { useEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileURL } from '@/lib/fileUrl';
import { renderMarkdown, WIKI_SCHEME } from '@/lib/markdown';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
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
  /**
   * 双链是否可交互（默认 true）：点击 [[...]] 跳转到对应文章，目标不存在时自动创建。
   * 编辑器预览里关闭，避免导航把全屏编辑器留在页面上。
   */
  wikiLinks?: boolean;
}

/**
 * 渲染 Markdown，并把正文里的 ![x](fileRef:<id>) 解析成本地 Blob 的 objectURL；
 * 同时让 Obsidian 风格双链 [[标题]] 可点击（跳转 / 自动创建文章）。
 * renderMarkdown 是同步的，没法在里面 await 文件读取，所以先渲染出
 * src="fileRef:xxx" 的占位，挂载后再换成真实 URL（文件缺失时显示可见提示）。
 */
export function MarkdownView({ markdown, className, htmlTransform, wikiLinks = true }: MarkdownViewProps) {
  const ref = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const articles = useAppStore((s) => s.articles);
  const addArticle = useAppStore((s) => s.addArticle);
  const showToast = useUIStore((s) => s.showToast);

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

  // 双链：标记不存在的目标（虚线弱化）+ 点击跳转 / 自动创建
  useEffect(() => {
    const root = ref.current;
    if (!root || !wikiLinks) return;

    const links = Array.from(root.querySelectorAll<HTMLAnchorElement>('a.vd-wiki-link'));
    for (const a of links) {
      const title = decodeURIComponent((a.getAttribute('href') || '').slice(WIKI_SCHEME.length));
      const exists = articles.some((x) => x.title === title);
      a.classList.toggle('vd-wiki-missing', !exists);
    }

    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest<HTMLAnchorElement>('a.vd-wiki-link');
      if (!a) return;
      e.preventDefault();
      e.stopPropagation();
      const raw = (a.getAttribute('href') || '').slice(WIKI_SCHEME.length);
      let title = '';
      try {
        title = decodeURIComponent(raw);
      } catch {
        title = raw;
      }
      // 先精确匹配，再大小写不敏感兜底（Obsidian 双链不区分大小写）
      const target =
        articles.find((x) => x.title === title) ??
        articles.find((x) => x.title.toLowerCase() === title.toLowerCase());
      if (target) {
        navigate(`/space/article/${target.id}`);
      } else {
        const id = addArticle({ title, content: '', tags: [], imageIds: [] });
        showToast(`已创建新文章「${title}」`, 'success');
        navigate(`/space/article/${id}`);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [html, wikiLinks, articles, navigate, addArticle, showToast]);

  return (
    <div
      ref={ref}
      className={clsx('prose-vidaos', className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
