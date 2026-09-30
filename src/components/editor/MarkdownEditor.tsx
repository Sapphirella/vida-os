// 全屏 Markdown 编辑器
import {
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useMemo,
} from 'react';
import {
  X,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  ListOrdered,
  Quote,
  Code,
  Code2,
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Edit3,
  Save,
  Star,
  Clock,
  CornerUpLeft,
  Waypoints,
} from 'lucide-react';
import { MarkdownView, collectInlineImageIds } from '@/components/common/MarkdownView';
import { compressImage, uid, clsx, formatDate } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile } from '@/lib/db';
import { MediaImage } from '@/components/common/MediaImage';

interface MarkdownEditorProps {
  open: boolean;
  title: string;
  initialContent: string;
  initialTitle?: string;
  /** 动态的发布时间（可编辑） */
  initialCreatedAt?: number;
  mode: 'article' | 'moment';
  // 文章/动态专用
  imageIds?: string[];
  collectionId?: string;
  tags?: string[];
  // 收藏
  favoriteId?: { refType: 'article' | 'moment'; refId: string };
  // 保存
  onSave: (data: {
    title: string;
    content: string;
    imageIds: string[];
    collectionId?: string;
    tags?: string[];
    createdAt?: number;
  }) => void;
  onClose: () => void;
}

export function MarkdownEditor({
  open,
  title: editorTitle,
  initialContent,
  initialTitle = '',
  initialCreatedAt,
  mode,
  imageIds: initialImageIds = [],
  collectionId: initialCollectionId,
  tags: initialTags = [],
  favoriteId,
  onSave,
  onClose,
}: MarkdownEditorProps) {
  const [title, setTitle] = useState(initialTitle);
  const [content, setContent] = useState(initialContent);
  const [imageIds, setImageIds] = useState<string[]>(initialImageIds);
  const [collectionId, setCollectionId] = useState<string | undefined>(initialCollectionId);
  const [tags, setTags] = useState<string[]>(initialTags);
  const [tagInput, setTagInput] = useState('');
  // 动态的发布时间：新建时默认当前时间，可往前调
  const [createdAt, setCreatedAt] = useState<number>(initialCreatedAt ?? Date.now());
  /** 拖拽排序中的源下标（桌面 HTML5 拖拽） */
  const [dragFrom, setDragFrom] = useState<number | null>(null);
  const [mode_, setMode] = useState<'edit' | 'preview'>('edit');
  const [showCollections, setShowCollections] = useState(false);
  /** 双链文章选择器是否打开（桌面工具栏） */
  const [wikiOpen, setWikiOpen] = useState(false);
  /** 打开选择器时记录的选区（点击工具栏后 textarea 失焦，selectionStart 会失效） */
  const wikiSelRef = useRef<{ start: number; end: number } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** 最近一次真实光标/选区：失焦后 selectionStart 会归零，插入图片等按钮用它兜底，避免插到文首并滚到顶部 */
  const lastSelRef = useRef<{ start: number; end: number } | null>(null);
  /** 插入文本后要恢复到的光标位置（渲染完成后再设，避免跳到文首） */
  const caretRef = useRef<number | null>(null);
  /** insert 语法标记后要恢复的选区（标记中间内容处于选中态，可直接打字替换） */
  const selRef = useRef<{ start: number; end: number } | null>(null);
  /** 编辑区是否聚焦：控制移动端内联语法工具栏显隐 */
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collections = useAppStore((s) => s.collections);
  const articles = useAppStore((s) => s.articles);
  const isFavorited = useAppStore((s) =>
    favoriteId ? s.isFavorited(favoriteId.refType, favoriteId.refId) : false,
  );
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const showToast = useUIStore((s) => s.showToast);
  const setLightbox = useUIStore((s) => s.setLightbox);
  /** 是否触屏设备（触摸上使用长按拖拽、插入不抢键盘）；
   *  宽屏触屏（iPad）也走移动端交互，统一按指针类型划分 */
  const isCoarse = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

  // 初值由 useState 初始化取得；父组件通过 key 变化触发重挂载，
  // 这里刻意不做「初值变化就重置」的副作用，避免覆盖用户正在输入的内容。

  // 字数：轻量过滤 markdown 符号即可，避免长文每次击键跑完整 markdown 解析（移动端卡顿主因）
  const wordCount = useMemo(() => {
    const t = content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/`[^`]*`/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '$1')
      .replace(/\[[^\]]*\]\([^)]*\)/g, '$1')
      .replace(/[#>*_~|-]/g, '')
      .replace(/[ \t\r\n]+/g, '');
    return t.length;
  }, [content]);

  // 工具栏操作
  const insert = useCallback(
    (before: string, after = '', placeholder = '') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const saved = lastSelRef.current;
      const start = saved?.start ?? ta.selectionStart;
      const end = saved?.end ?? ta.selectionEnd;
      const selected = content.slice(start, end) || placeholder;
      const newText = content.slice(0, start) + before + selected + after + content.slice(end);
      // 光标放到标记中间：偏移起点 + before 长度 ～ +before+selected 处，
      // 若插入了占位文本则整段选中，方便直接打字覆盖
      selRef.current = { start: start + before.length, end: start + before.length + selected.length };
      setContent(newText);
    },
    [content],
  );

  // 内容更新后（渲染完成）再恢复光标：受控 textarea 重新赋值会把光标重置到文首，
  // 所以必须在 DOM 更新之后设 selectionRange，并且 preventScroll 以免整页跳动。
  // 未聚焦时（触屏点完按钮编辑器已失焦）不设光标：setSelectionRange 会把滚动容器
  // 强行拖到光标处，造成「插入图片后回滚一段距离」；用户点回正文时自然恢复。
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const sel = selRef.current;
    if (sel) {
      selRef.current = null;
      if (ta !== document.activeElement) {
        if (isDesktop) {
          ta.focus({ preventScroll: true });
          ta.setSelectionRange(sel.start, sel.end);
        }
        return;
      }
      ta.setSelectionRange(sel.start, sel.end);
      return;
    }
    const pos = caretRef.current;
    if (pos === null) return;
    caretRef.current = null;
    if (ta !== document.activeElement) {
      if (isDesktop) {
        ta.focus({ preventScroll: true });
        ta.setSelectionRange(pos, pos);
      }
      return;
    }
    ta.setSelectionRange(pos, pos);
  }, [content]);

  // textarea 高度自动撑开：由外层滚动容器统一滚动（标题/标签随之一起滚动），
  // 避免移动端 textarea 自身滚动与页面滚动叠加造成的卡顿；
  // 内容变长时高度=scrollHeight，编辑区永远可整段滚动，不出现「钉住」。
  // 注意不能用 height='auto' 先重置再设回：那会让容器可滚高度瞬间收缩，
  // 浏览器把滚动位置钳制回滚，表现为「换行 / 插入图片后回滚一段距离」。
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta || mode_ !== 'edit') return;
    const sh = ta.scrollHeight;
    const cur = ta.style.height;
    const curPx = cur ? parseFloat(cur) : ta.offsetHeight;
    // 高度未变化时不改写 style.height：避免每次击键触发 iOS WebKit 布局抖动
    // （光标跳动 / 输入合成被中断），仅内容换行时才调整。
    if (Math.abs(curPx - sh) > 2) ta.style.height = `${sh}px`;
  }, [content, mode_]);


  /** 在当前光标处插入一段文本 */
  const insertText = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + text);
      return;
    }
    const saved = lastSelRef.current;
    const start = saved?.start ?? ta.selectionStart ?? content.length;
    const end = saved?.end ?? ta.selectionEnd ?? start;
    caretRef.current = start + text.length;
    setContent(content.slice(0, start) + text + content.slice(end));
  };

  /** 交换两张配图的位置（用于调整文章内图片顺序） */
  const moveImage = (from: number, to: number) => {
    setImageIds((prev) => {
      if (from === to || to < 0 || to >= prev.length) return prev;
      const next = [...prev];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      return next;
    });
  };

  const handleSave = () => {
    if (mode === 'article' && !title.trim()) {
      showToast('请填写标题', 'error');
      return;
    }
    if (mode !== 'article' && !content.trim()) {
      showToast('请填写内容', 'error');
      return;
    }
    // 备选区图片 ≠ 插入：只有正文里用 fileRef 引用的图才在文章里展示。
    // 未插入的备选图不删除、不丢弃，原样保留在备选区（下次打开编辑器还能看到，随时插入）。
    const inline = new Set(collectInlineImageIds(content));
    const pending = imageIds.filter((id) => !inline.has(id));
    if (pending.length > 0) {
      showToast(
        pending.length === 1 ? '1 张未插入的图保留在备选区' : `${pending.length} 张未插入的图保留在备选区`,
        'info',
      );
    }
    onSave({
      title: title.trim(),
      content,
      imageIds,
      collectionId,
      tags,
      ...(mode === 'moment' ? { createdAt } : {}),
    });
  };

  const handleImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      const compressed = await compressImage(f, 1600, 0.82);
      const id = uid('img_');
      await putFile({ id, blob: compressed, mime: compressed.type, name: f.name, size: compressed.size });
      setImageIds((prev) => [...prev, id]);
    }
    showToast(`已添加 ${files.length} 张图片`, 'success');
    e.target.value = '';
  };

  const insertLink = () => {
    insert('[', '](https://)', '链接文字');
  };

  /** 双链：桌面端先弹文章选择器，移动端/无文章时直接插入占位 */
  const insertWiki = () => {
    const ta = textareaRef.current;
    const start = ta?.selectionStart ?? content.length;
    const end = ta?.selectionEnd ?? start;
    wikiSelRef.current = { start, end };
    const isDesktop = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (articles.length > 0 && isDesktop) {
      setWikiOpen(true);
    } else {
      insert('[[', ']]', '文章标题');
    }
  };

  /** 把选中的文章标题以 [[标题]] 形式插到之前记录的选区位置 */
  const applyWiki = (title: string) => {
    setWikiOpen(false);
    const pos = wikiSelRef.current;
    const text = `[[${title}]]`;
    if (pos) {
      caretRef.current = pos.start + text.length;
      setContent(content.slice(0, pos.start) + text + content.slice(pos.end));
    } else {
      setContent((c) => c + text);
    }
  };

  if (!open) return null;

  return (
    <div
      className="editor-shell fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{ background: 'var(--editor-bg)' }}
    >
      {/* 顶部 */}
      <div
        className="flex items-center gap-2 px-3 sm:px-6 py-2 sm:py-3 border-b border-bronze/10"
        style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(20px)', willChange: 'backdrop-filter' }}
      >
        <button
          onClick={onClose}
          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="关闭"
        >
          <X size={18} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[9px] sm:text-[10px] tracking-[0.2em] text-bronze-deep uppercase truncate">
            {editorTitle}
          </p>
        </div>
        {mode === 'moment' && (
          <label className="flex items-center gap-1.5 mr-1" title="发布/记录时间">
            <Clock size={13} strokeWidth={1.5} className="text-bronze-deep flex-none" />
            <input
              type="datetime-local"
              value={formatDate(createdAt, 'YYYY-MM-DDTHH:mm')}
              onChange={(e) => {
                const t = new Date(e.target.value).getTime();
                if (!Number.isNaN(t)) setCreatedAt(t);
              }}
              className="editor-dt px-2 py-1 rounded-pill text-[11px] font-mono text-paper outline-none"
              style={{ background: 'var(--editor-input-bg)' }}
            />
          </label>
        )}
        {favoriteId && (
          <button
            onClick={() => toggleFavorite(favoriteId.refType, favoriteId.refId)}
            className={clsx(
              'w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center transition-colors',
              isFavorited ? 'text-candle' : 'text-bronze hover:text-candle',
            )}
            aria-label="收藏"
          >
            <Star size={17} strokeWidth={1.5} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        )}
        <button
          onClick={handleSave}
          aria-label="保存"
          className="btn-primary flex-none"
          style={{ padding: '0 14px', height: '2.25rem', fontSize: '0.8125rem' }}
        >
          <Save size={13} strokeWidth={1.6} />
          <span className="hidden sm:inline">保存</span>
          <span className="sm:hidden" aria-hidden aria-label="">
            保存
          </span>
        </button>
      </div>

      {/* 桌面工具栏（≥sm 显示；移动端改用底部大按钮工具栏） */}
      <div className="hidden sm:flex px-3 sm:px-6 py-2 border-b border-bronze/10 items-center gap-1 overflow-x-auto">
        <ToolbarBtn onClick={() => insert('**', '**', 'bold')} icon={<Bold size={14} />} title="粗体" />
        <ToolbarBtn onClick={() => insert('*', '*', 'italic')} icon={<Italic size={14} />} title="斜体" />
        <div className="w-px h-4 bg-bronze/20 mx-1" />
        <ToolbarBtn onClick={() => insert('# ', '', '标题')} icon={<Heading1 size={14} />} title="标题 1" />
        <ToolbarBtn onClick={() => insert('## ', '', '标题')} icon={<Heading2 size={14} />} title="标题 2" />
        <div className="w-px h-4 bg-bronze/20 mx-1" />
        <ToolbarBtn onClick={() => insert('- ', '', 'item')} icon={<List size={14} />} title="无序列表" />
        <ToolbarBtn onClick={() => insert('1. ', '', 'item')} icon={<ListOrdered size={14} />} title="有序列表" />
        <ToolbarBtn onClick={() => insert('> ', '', '引用')} icon={<Quote size={14} />} title="引用" />
        <div className="w-px h-4 bg-bronze/20 mx-1" />
        <ToolbarBtn onClick={() => insert('`', '`', 'code')} icon={<Code size={14} />} title="行内代码" />
        <ToolbarBtn onClick={() => insert('\n```\n', '\n```\n', 'code block')} icon={<Code2 size={14} />} title="代码块" />
        <ToolbarBtn onClick={insertLink} icon={<LinkIcon size={14} />} title="链接" />
        <ToolbarBtn onClick={insertWiki} icon={<Waypoints size={14} />} title="双链" />
        <ToolbarBtn
          onClick={() => fileInputRef.current?.click()}
          icon={<ImageIcon size={14} />}
          title="插入图片"
        />
        <ToolbarBtn onClick={() => insert('\n---\n', '', '')} icon={<Minus size={14} />} title="分割线" />
        <div className="flex-1" />
        <button
          onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
          className="px-3 py-1 text-xs text-bronze hover:text-candle transition-colors flex items-center gap-1"
        >
          {mode_ === 'edit' ? (
            <>
              <Eye size={13} strokeWidth={1.5} /> 预览
            </>
          ) : (
            <>
              <Edit3 size={13} strokeWidth={1.5} /> 编辑
            </>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleImage}
        />
      </div>

      {/* 编辑区：标题/标签与正文在同一滚动容器内，随内容一起滚动（移动端释放固定栏空间） */}
      <div className="flex-1 overflow-hidden flex relative">
        {/* 双链选择器：桌面点击「双链」后弹出，选文章标题插入 [[标题]] */}
        {wikiOpen && (
          <>
            <div className="fixed inset-0 z-20" onClick={() => setWikiOpen(false)} />
            <div className="absolute top-3 left-3 sm:left-1/2 sm:-translate-x-1/2 z-30 w-72 max-w-[calc(100%-24px)]">
              <div className="glass-card p-2 animate-slide-up">
                <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase px-2 pt-1 pb-2">
                  链接到文章 · 双链
                </p>
                <ul className="max-h-60 overflow-y-auto space-y-0.5">
                  {articles.map((a) => (
                    <li key={a.id}>
                      <button
                        onClick={() => applyWiki(a.title)}
                        className="w-full text-left px-2.5 py-1.5 text-sm font-serif text-paper hover:bg-bronze/10 rounded transition-colors truncate"
                      >
                        {a.title}
                      </button>
                    </li>
                  ))}
                </ul>
                <div className="pt-1.5 mt-1 border-t border-bronze/10">
                  <button
                    onClick={() => {
                      setWikiOpen(false);
                      insert('[[', ']]', '文章标题');
                    }}
                    className="w-full text-left px-2.5 py-1.5 text-xs text-bronze hover:text-candle transition-colors rounded"
                  >
                    手动输入标题…
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
        {mode_ === 'edit' && (
          <div className="flex-1 overflow-y-auto vd-editor-scroll">
            <div className="max-w-3xl mx-auto w-full px-4 sm:px-8 py-4 sm:py-6">
              {/* 标题（文章需要）——随正文滚动 */}
              {mode === 'article' && (
                <>
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="标题..."
                    className="w-full bg-transparent font-serif text-headline text-2xl sm:text-3xl placeholder:text-bronze-deep outline-none tracking-tight"
                    style={{ fontWeight: 500, lineHeight: 1.3 }}
                  />
                  {/* 标签 + 合集（仅文章） */}
                  {mode === 'article' && (
                    <div className="flex flex-wrap items-center gap-2 mt-3 mb-2">
                      {tags.map((t) => (
                        <span
                          key={t}
                          onClick={() => setTags(tags.filter((x) => x !== t))}
                          className="tag tag-wine cursor-pointer"
                        >
                          #{t} ×
                        </span>
                      ))}
                      <input
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && tagInput.trim()) {
                            const t = tagInput.trim().replace(/^#/, '');
                            if (!tags.includes(t)) setTags([...tags, t]);
                            setTagInput('');
                          }
                        }}
                        placeholder="添加标签..."
                        className="px-2 py-0.5 text-xs bg-bronze/10 rounded-pill text-paper placeholder:text-bronze-deep outline-none w-24"
                      />
                      <div className="relative">
                        <button
                          onClick={() => setShowCollections((s) => !s)}
                          className="tag hover:brightness-110"
                        >
                          {collectionId
                            ? collections.find((c) => c.id === collectionId)?.name || '合集'
                            : '+ 合集'}
                        </button>
                        {showCollections && (
                          <div className="absolute top-full mt-1 left-0 glass-card p-1 min-w-[140px] z-10">
                            <button
                              onClick={() => {
                                setCollectionId(undefined);
                                setShowCollections(false);
                              }}
                              className="block w-full text-left px-3 py-1.5 text-xs text-paper hover:bg-bronze/10 rounded"
                            >
                              不选
                            </button>
                            {collections.map((c) => (
                              <button
                                key={c.id}
                                onClick={() => {
                                  setCollectionId(c.id);
                                  setShowCollections(false);
                                }}
                                className="block w-full text-left px-3 py-1.5 text-xs text-paper hover:bg-bronze/10 rounded"
                              >
                                {c.name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onFocus={() => setEditing(true)}
                onBlur={() => {
                  setEditing(false);
                  const ta = textareaRef.current;
                  if (ta) lastSelRef.current = { start: ta.selectionStart, end: ta.selectionEnd };
                }}
                placeholder={mode === 'article' ? '开始书写...' : '说点什么...'}
                className="block w-full min-h-[52vh] sm:min-h-[70vh] bg-transparent font-serif text-reading text-paper placeholder:text-bronze-deep outline-none resize-none leading-[1.7] sm:leading-[1.95]"
                spellCheck={false}
              />
            </div>
          </div>
        )}
        {mode_ === 'preview' && (
          <div className="flex-1 overflow-y-auto vd-editor-scroll px-4 sm:px-8 py-4 sm:py-6 max-w-3xl mx-auto w-full">
            {/* 预览中的头部：标题随内容一起滚动（与编辑态布局一致） */}
            {mode === 'article' && title.trim() && (
              <h1 className="font-serif text-headline text-2xl sm:text-3xl mb-2" style={{ fontWeight: 500, lineHeight: 1.3 }}>
                {title}
              </h1>
            )}
            {mode === 'article' && tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {tags.map((t) => (
                  <span key={t} className="tag tag-wine">
                    #{t}
                  </span>
                ))}
              </div>
            )}
            {content.trim() ? (
              <MarkdownView markdown={content} wikiLinks={false} />
            ) : (
              <p className="text-bronze-deep italic text-center mt-12">还没有内容</p>
            )}
          </div>
        )}

      </div>

      {/* 移动端内联语法工具栏：光标在编辑区时显示，单行细窄条，
          固定在编辑器底部 / 软键盘上方；失焦自动隐藏 */}
      {editing && mode_ === 'edit' && (
        <div
          className="sm:hidden border-t border-bronze/10 px-1.5 py-0.5"
          style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(16px)', willChange: 'backdrop-filter' }}
        >
          <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            <SBtn
              onClick={() => {
                setEditing(true);
                insert('**', '**', '粗体');
              }}
              icon={<Bold size={15} strokeWidth={1.5} />}
              label="粗体"
            />
            <SBtn onClick={() => insert('*', '*', '斜体')} icon={<Italic size={15} strokeWidth={1.5} />} label="斜体" />
            <SBtn onClick={() => insert('> ', '', '引用')} icon={<Quote size={15} strokeWidth={1.5} />} label="引用" />
            <SBtn onClick={() => insert('- ', '', '列表项')} icon={<List size={15} strokeWidth={1.5} />} label="无序列表" />
            <SBtn onClick={() => insert('1. ', '', '列表项')} icon={<ListOrdered size={15} strokeWidth={1.5} />} label="有序列表" />
            <SBtn onClick={() => insert('\n---\n', '', '')} icon={<Minus size={15} strokeWidth={1.5} />} label="分割线" />
            <SBtn onClick={insertLink} icon={<LinkIcon size={15} strokeWidth={1.5} />} label="链接" />
            <SBtn onClick={insertWiki} icon={<Waypoints size={15} strokeWidth={1.5} />} label="双链" />
            <SBtn
              onClick={() => fileInputRef.current?.click()}
              icon={<ImageIcon size={15} strokeWidth={1.5} />}
              label="插入图片"
            />
            <SBtn
              onClick={() => insert('\n```\n', '\n```\n', '代码')}
              icon={<Code2 size={15} strokeWidth={1.5} />}
              label="代码块"
            />
            <div className="w-px h-3.5 bg-bronze/20 mx-1 flex-shrink-0" />
            <SBtn
              onClick={() => setMode((m) => (m === 'edit' ? 'preview' : 'edit'))}
              icon={mode_ === 'edit' ? <Eye size={15} strokeWidth={1.5} /> : <Edit3 size={15} strokeWidth={1.5} />}
              label={mode_ === 'edit' ? '预览' : '编辑'}
            />
          </div>
        </div>
      )}

      {/* 移动端预览模式：迷你「返回编辑」条（顶部切换在移动端隐藏，避免找不到返回入口） */}
      {mode_ === 'preview' && (
        <div
          className="sm:hidden border-t border-bronze/10 px-1.5 py-0.5"
          style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(16px)', willChange: 'backdrop-filter' }}
        >
          <div className="flex items-center gap-0.5">
            <SBtn
              onClick={() => {
                setMode('edit');
                requestAnimationFrame(() => textareaRef.current?.focus());
              }}
              icon={<Edit3 size={15} strokeWidth={1.5} />}
              label="返回编辑"
            />
            <span className="flex-1 text-right font-mono text-[10px] tracking-[0.2em] text-bronze-deep select-none">
              预览
            </span>
          </div>
        </div>
      )}

      {/* 底部：图片画廊 + 字数 */}
      <div
        className="border-t border-bronze/10 px-3 sm:px-6 py-2 flex items-center gap-3"
        style={{ background: 'var(--editor-bar-bg)', backdropFilter: 'blur(16px)', willChange: 'backdrop-filter' }}
      >
        {imageIds.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[62%] py-1">
            {imageIds.map((id, i) => {
              return (
                <div
                  key={id}
                  draggable={!isCoarse}
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null && dragFrom !== i) moveImage(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  className={clsx(
                    'relative w-14 h-14 rounded overflow-hidden border flex-shrink-0 group transition-all',
                    dragFrom === i ? 'border-candle opacity-60' : 'border-bronze/20',
                    !isCoarse && 'cursor-grab active:cursor-grabbing',
                  )}
                  title="点击缩略图可预览大图；点右下角按钮插入到正文光标处（同一张图可多次插入）"
                  aria-label={`配图 ${i + 1}，点击预览`}
                >
                  <MediaImage
                    fileId={id}
                    alt={`配图 ${i + 1}`}
                    className="w-full h-full object-cover"
                    onOpen={() => setLightbox({ fileId: id })}
                  />
                  {/* 序号 */}
                  <span className="absolute top-0 left-0 flex items-center px-0.5 font-mono text-[9px] leading-4 text-moon bg-ink/75">
                    {i + 1}
                  </span>
                  {/* 移除 */}
                  <button
                    onClick={() => {
                      setImageIds((prev) => prev.filter((x) => x !== id));
                      setContent((c) => c.replace(new RegExp(`!\\[\\[^\\]]*\\]\\(fileRef:${id}\\)`, 'g'), ''));
                    }}
                    aria-label={`移除第 ${i + 1} 张图片`}
                    className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-ink/80 text-moon text-[11px] leading-none"
                  >
                    ×
                  </button>
                  {/* 插入正文：每次点击都插入一次（同一张图可在正文出现多次） */}
                  <button
                    onClick={() => insertText(`\n![图片](fileRef:${id})\n`)}
                    aria-label={`把第 ${i + 1} 张插入正文`}
                    title="插入到正文光标处（可多次插入同一张图）"
                    className="absolute bottom-0 right-0 w-5 h-5 flex items-center justify-center bg-wine/85 text-moon"
                  >
                    <CornerUpLeft size={11} strokeWidth={1.8} />
                  </button>
                  {/* 顺序靠拖动调整（缩略图整体可拖：桌面直接拖，触摸长按 350ms 后拖动） */}
                </div>
              );
            })}
          </div>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-10 h-10 rounded border border-bronze/20 flex items-center justify-center text-bronze hover:text-candle flex-shrink-0"
        >
          <ImageIcon size={14} strokeWidth={1.4} />
        </button>
        <div className="flex-1" />
        <span className="font-mono text-[10px] tracking-widest text-bronze-deep">
          {wordCount} 字
        </span>
      </div>
    </div>
  );
}

function ToolbarBtn({
  onClick,
  icon,
  title,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      title={title}
      className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle rounded transition-colors"
    >
      {icon}
    </button>
  );
}

/** 内联语法栏按钮：紧凑小尺寸、细线图标、低灰度半透明，点击才反馈 */
function SBtn({
  onClick,
  icon,
  label,
  active,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      className={clsx(
        'w-8 h-8 min-w-0 flex items-center justify-center rounded-md transition-colors duration-150 active:scale-95',
        active
          ? 'text-candle bg-candle/10'
          : 'text-bronze hover:text-candle active:bg-bronze/10 active:text-candle',
      )}
    >
      {icon}
    </button>
  );
}