// 全屏 Markdown 编辑器
import { useEffect, useRef, useState, useCallback } from 'react';
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
  Link as LinkIcon,
  Image as ImageIcon,
  Minus,
  Eye,
  Edit3,
  Save,
  Star,
} from 'lucide-react';
import { renderMarkdown, plainText } from '@/lib/markdown';
import { compressImage, uid, now, clsx } from '@/lib/utils';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile } from '@/lib/db';
import { MediaImage } from '@/components/common/MediaImage';

interface MarkdownEditorProps {
  open: boolean;
  title: string;
  initialContent: string;
  initialTitle?: string;
  mode: 'article' | 'moment' | 'letter' | 'inspiration' | 'schedule' | 'todo';
  // 文章/动态/信件专用
  imageIds?: string[];
  collectionId?: string;
  tags?: string[];
  // 收藏
  favoriteId?: { refType: 'article' | 'moment' | 'letter'; refId: string };
  // 保存
  onSave: (data: {
    title: string;
    content: string;
    imageIds: string[];
    collectionId?: string;
    tags?: string[];
  }) => void;
  onClose: () => void;
}

export function MarkdownEditor({
  open,
  title: editorTitle,
  initialContent,
  initialTitle = '',
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
  const [mode_, setMode] = useState<'edit' | 'preview' | 'split'>('edit');
  const [showCollections, setShowCollections] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collections = useAppStore((s) => s.collections);
  const isFavorited = useAppStore((s) =>
    favoriteId ? s.isFavorited(favoriteId.refType, favoriteId.refId) : false,
  );
  const toggleFavorite = useAppStore((s) => s.toggleFavorite);
  const showToast = useUIStore((s) => s.showToast);

  useEffect(() => {
    if (open) {
      setTitle(initialTitle);
      setContent(initialContent);
      setImageIds(initialImageIds);
      setCollectionId(initialCollectionId);
      setTags(initialTags);
    }
  }, [open, initialTitle, initialContent, initialImageIds, initialCollectionId, initialTags]);

  const wordCount = plainText(content).length;

  // 工具栏操作
  const insert = useCallback(
    (before: string, after = '', placeholder = '') => {
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const selected = content.slice(start, end) || placeholder;
      const newText = content.slice(0, start) + before + selected + after + content.slice(end);
      setContent(newText);
      requestAnimationFrame(() => {
        ta.focus();
        const pos = start + before.length + selected.length;
        ta.setSelectionRange(pos, pos);
      });
    },
    [content],
  );

  const handleSave = () => {
    if (mode === 'article' && !title.trim()) {
      showToast('请填写标题', 'error');
      return;
    }
    if (mode !== 'article' && !content.trim()) {
      showToast('请填写内容', 'error');
      return;
    }
    onSave({ title: title.trim(), content, imageIds, collectionId, tags });
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

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-fade-in"
      style={{ background: 'var(--ink)' }}
    >
      {/* 顶部 */}
      <div
        className="flex items-center gap-2 px-3 sm:px-6 py-3 border-b border-bronze/10"
        style={{ background: 'rgba(20, 18, 22, 0.6)', backdropFilter: 'blur(20px)' }}
      >
        <button
          onClick={onClose}
          className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="关闭"
        >
          <X size={20} strokeWidth={1.5} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            {editorTitle}
          </p>
        </div>
        {favoriteId && (
          <button
            onClick={() => toggleFavorite(favoriteId.refType, favoriteId.refId)}
            className={clsx(
              'w-9 h-9 flex items-center justify-center transition-colors',
              isFavorited ? 'text-candle' : 'text-bronze hover:text-candle',
            )}
            aria-label="收藏"
          >
            <Star size={18} strokeWidth={1.5} fill={isFavorited ? 'currentColor' : 'none'} />
          </button>
        )}
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ padding: '7px 14px', fontSize: '0.8125rem' }}
        >
          <Save size={13} strokeWidth={1.6} /> 保存
        </button>
      </div>

      {/* 标题（仅 article） */}
      {mode === 'article' && (
        <div className="px-4 sm:px-8 pt-4 pb-2 max-w-3xl w-full mx-auto">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="标题..."
            className="w-full bg-transparent font-serif text-moon text-2xl sm:text-3xl placeholder:text-bronze-deep outline-none tracking-tight"
            style={{ fontWeight: 500, lineHeight: 1.3 }}
          />
          {/* 标签 + 合集 */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
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
        </div>
      )}

      {/* 工具栏 */}
      <div className="px-3 sm:px-6 py-2 border-b border-bronze/10 flex items-center gap-1 overflow-x-auto">
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
        <ToolbarBtn onClick={() => insert('\n```\n', '\n```\n', 'code block')} icon={<Code size={14} />} title="代码块" />
        <ToolbarBtn
          onClick={() => {
            const url = prompt('链接 URL');
            if (url) insert('[', `](${url})`, 'text');
          }}
          icon={<LinkIcon size={14} />}
          title="链接"
        />
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

      {/* 编辑区 */}
      <div className="flex-1 overflow-hidden flex">
        {mode_ === 'edit' && (
          <div className="flex-1 overflow-y-auto">
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={mode === 'article' ? '开始书写...' : '说点什么...'}
              className="w-full h-full bg-transparent px-4 sm:px-8 py-6 font-serif text-reading text-paper placeholder:text-bronze-deep outline-none resize-none max-w-3xl mx-auto"
              style={{ lineHeight: 1.95, caretColor: 'var(--candle)' }}
              spellCheck={false}
            />
          </div>
        )}
        {mode_ === 'preview' && (
          <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 max-w-3xl mx-auto w-full">
            {content.trim() ? (
              <div
                className="prose-vidaos"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            ) : (
              <p className="text-bronze-deep italic text-center mt-12">还没有内容</p>
            )}
          </div>
        )}
        {mode_ === 'split' && (
          <>
            <div className="flex-1 overflow-y-auto border-r border-bronze/10">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full h-full bg-transparent px-4 sm:px-6 py-4 font-serif text-reading text-paper outline-none resize-none"
                style={{ lineHeight: 1.95, caretColor: 'var(--candle)' }}
                spellCheck={false}
              />
            </div>
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
              <div
                className="prose-vidaos"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(content) }}
              />
            </div>
          </>
        )}
      </div>

      {/* 底部：图片画廊 + 字数 */}
      <div
        className="border-t border-bronze/10 px-3 sm:px-6 py-2 flex items-center gap-3"
        style={{ background: 'rgba(20, 18, 22, 0.6)' }}
      >
        {imageIds.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto max-w-[60%]">
            {imageIds.map((id) => (
              <div
                key={id}
                className="relative w-10 h-10 rounded overflow-hidden border border-bronze/20 flex-shrink-0 group"
              >
                <MediaImage fileId={id} className="w-full h-full object-cover" />
                <button
                  onClick={() => setImageIds(imageIds.filter((x) => x !== id))}
                  className="absolute inset-0 bg-ink/80 opacity-0 group-hover:opacity-100 flex items-center justify-center text-moon text-xs"
                >
                  ×
                </button>
              </div>
            ))}
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
      title={title}
      className="w-8 h-8 flex items-center justify-center text-bronze hover:text-candle rounded transition-colors"
    >
      {icon}
    </button>
  );
}
