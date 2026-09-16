// 全屏 Markdown 编辑器
import {
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
  useEffect,
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
  GripVertical,
} from 'lucide-react';
import { MarkdownView } from '@/components/common/MarkdownView';
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
  /** 长按拖拽中当前持有的下标（触摸设备） */
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  /** 编辑区当前选区（非空时显示浮动格式条） */
  const [selRange, setSelRange] = useState<{ start: number; end: number } | null>(null);
  /** 已经插进正文的图片（正文里用 fileRef:<id> 引用），缩略图上会打标记 */
  const inlineIds = new Set(
    Array.from(content.matchAll(/fileRef:([A-Za-z0-9_-]+)/g)).map((m) => m[1]),
  );
  const [mode_, setMode] = useState<'edit' | 'preview'>('edit');
  const [showCollections, setShowCollections] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  /** 插入文本后要恢复到的光标位置（渲染完成后再设，避免跳到文首） */
  const caretRef = useRef<number | null>(null);
  /** insert 语法标记后要恢复的选区（标记中间内容处于选中态，可直接打字替换） */
  const selRef = useRef<{ start: number; end: number } | null>(null);
  /** 编辑区是否聚焦：控制移动端内联语法工具栏显隐 */
  const [editing, setEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  /** 长按计时器（触摸图片排序） */
  const pressTimer = useRef<number | null>(null);
  /** 缩略图元素引用（长按移动时计算目标下标） */
  const thumbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const collections = useAppStore((s) => s.collections);
  const isFavorited = useAppStore((s) =>
    favoriteId ? s.isFavorited(favoriteId.refType, favoriteId.refId) : false,
  );
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const showToast = useUIStore((s) => s.showToast);
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
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
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
  useLayoutEffect(() => {
    const sel = selRef.current;
    if (sel) {
      selRef.current = null;
      const ta = textareaRef.current;
      if (ta) {
        ta.setSelectionRange(sel.start, sel.end);
        // 桌面：恢复键盘焦点，保持连续输入；触屏：不抢键盘——
        // 手机/iPad 上点完格式按钮不该再次拉起键盘，用户点正文区时自然唤出。
        if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
          ta.focus({ preventScroll: true });
        }
        return;
      }
    }
    const pos = caretRef.current;
    if (pos === null) return;
    caretRef.current = null;
    const ta = textareaRef.current;
    if (!ta) return;
    ta.setSelectionRange(pos, pos);
    // 桌面：恢复键盘焦点，保持连续输入；触屏：不抢键盘——
    // 手机/iPad 上点完格式按钮不该再次拉起键盘，用户点正文区时自然唤出。
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      ta.focus({ preventScroll: true });
    }
  }, [content]);

  // textarea 高度自动撑开：由外层滚动容器统一滚动（标题/标签随之一起滚动），
  // 避免移动端 textarea 自身滚动与页面滚动叠加造成的卡顿；
  // 内容变长时高度=scrollHeight，编辑区永远可整段滚动，不出现「钉住」。
  useLayoutEffect(() => {
    const ta = textareaRef.current;
    if (!ta || mode_ !== 'edit') return;
    const prev = ta.style.height;
    ta.style.height = 'auto';
    const sh = ta.scrollHeight;
    // 高度未变化时还原原值：避免每次击键都改写 style.height 触发 iOS WebKit
    // 布局抖动（光标跳动 / 输入合成被中断），仅内容换行时才调整。
    ta.style.height = Math.abs(ta.offsetHeight - sh) > 2 ? `${sh}px` : prev;
  }, [content, mode_]);

  // 跟踪文本选区：非空选中时在编辑区底部弹出浮动格式条
  useEffect(() => {
    const onSel = () => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      setSelRange((prev) => {
        const next = start !== end ? { start, end } : null;
        if (!next && !prev) return prev;
        if (next && prev && next.start === prev.start && next.end === prev.end) return prev;
        return next;
      });
    };
    document.addEventListener('selectionchange', onSel);
    return () => document.removeEventListener('selectionchange', onSel);
  }, []);

  /** 在当前光标处插入一段文本 */
  const insertText = (text: string) => {
    const ta = textareaRef.current;
    if (!ta) {
      setContent((c) => c + text);
      return;
    }
    const start = ta.selectionStart ?? content.length;
    const end = ta.selectionEnd ?? start;
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

  /** 触摸长按（350ms）进入拖拽模式；期间横向移动即与所指缩略图实时交换 */
  const startLongPress = (i: number) => {
    if (!isCoarse) return;
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = window.setTimeout(() => {
      setDragFrom(null);
      setDragIdx(i);
      try {
        navigator.vibrate?.(12);
      } catch {
        /* 无震动能力时忽略 */
      }
    }, 350);
  };

  const handleLongPressMove = (e: React.PointerEvent) => {
    if (dragIdx === null) return;
    const target = thumbRefs.current.findIndex((el) => {
      if (!el) return false;
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right;
    });
    if (target >= 0 && target !== dragIdx) {
      moveImage(dragIdx, target);
      setDragIdx(target);
    }
  };

  const endLongPress = () => {
    if (pressTimer.current) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
    setDragIdx(null);
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
                onBlur={() => setEditing(false)}
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
              <MarkdownView markdown={content} />
            ) : (
              <p className="text-bronze-deep italic text-center mt-12">还没有内容</p>
            )}
          </div>
        )}

        {/* 选区浮动格式条：选中文字后浮于编辑区底部、工具栏上方 */}
        {selRange && mode_ === 'edit' && (
          <div className="absolute bottom-20 left-0 right-0 flex justify-center pointer-events-none z-20">
            <div
              className="pointer-events-auto flex items-center gap-0.5 rounded-full border border-bronze/25 backdrop-blur px-1.5 py-1"
              style={{ background: 'var(--editor-float-bg)', boxShadow: '0 4px 18px rgba(0,0,0,0.4)' }}
            >
              <span className="font-mono text-[10px] text-bronze-deep px-1.5 select-none">
                {selRange.end - selRange.start}
              </span>
              <FloatBtn onClick={() => insert('**', '**', '粗体')} icon={<Bold size={16} />} label="粗体" />
              <FloatBtn onClick={() => insert('*', '*', '斜体')} icon={<Italic size={16} />} label="斜体" />
              <FloatBtn onClick={insertLink} icon={<LinkIcon size={16} />} label="链接" />
              <FloatBtn onClick={() => insert('> ', '', '引用')} icon={<Quote size={16} />} label="引用" />
            </div>
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
              const inText = inlineIds.has(id);
              return (
                <div
                  key={id}
                  ref={(el) => {
                    thumbRefs.current[i] = el;
                  }}
                  draggable={!isCoarse}
                  onDragStart={() => setDragFrom(i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    if (dragFrom !== null && dragFrom !== i) moveImage(dragFrom, i);
                    setDragFrom(null);
                  }}
                  onDragEnd={() => setDragFrom(null)}
                  onPointerDown={() => startLongPress(i)}
                  onPointerMove={handleLongPressMove}
                  onPointerUp={endLongPress}
                  onPointerCancel={endLongPress}
                  onPointerLeave={endLongPress}
                  className={clsx(
                    'relative w-14 h-14 rounded overflow-hidden border flex-shrink-0 group cursor-grab active:cursor-grabbing transition-all',
                    dragIdx === i
                      ? 'border-candle opacity-70 scale-105 z-10 touch-none'
                      : dragFrom === i
                        ? 'border-candle opacity-60'
                        : 'border-bronze/20',
                    inText && 'ring-1 ring-amber',
                  )}
                  title={inText ? '已插入正文' : '未插入正文（显示在文章下方）'}
                >
                  <MediaImage
                    fileId={id}
                    alt={`配图 ${i + 1}`}
                    className="w-full h-full object-cover"
                  />
                  {/* 序号 / 拖拽把手 */}
                  <span className="absolute top-0 left-0 flex items-center px-0.5 font-mono text-[9px] leading-4 text-moon bg-ink/75">
                    <GripVertical size={9} strokeWidth={2} />
                    {i + 1}
                  </span>
                  {/* 移除 */}
                  <button
                    onClick={() => setImageIds(imageIds.filter((x) => x !== id))}
                    aria-label={`移除第 ${i + 1} 张图片`}
                    className="absolute top-0 right-0 w-4 h-4 flex items-center justify-center bg-ink/80 text-moon text-[11px] leading-none"
                  >
                    ×
                  </button>
                  {/* 插入正文 */}
                  <button
                    onClick={() => insertText(`\n![图片](fileRef:${id})\n`)}
                    aria-label={`把第 ${i + 1} 张插入正文`}
                    title="插入到正文光标处"
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

/** 选区浮动条按钮：44px 触控目标 */
function FloatBtn({
  onClick,
  icon,
  label,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      onMouseDown={(e) => e.preventDefault()}
      className="w-11 h-11 flex items-center justify-center rounded-full text-bronze hover:text-candle hover:bg-bronze/10 transition-colors"
    >
      {icon}
    </button>
  );
}