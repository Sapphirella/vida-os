// 馆藏 · 图集详情（v4.5）
// 星标集：固定四标签（文章/动态/灵感/相册）筛选 + 图片网格 + 双链跳回来源；
// 普通图集：按组（一次上传 = 一组）的时间轴，参考动态页；支持上传新组 / 编辑组 / 删除组。
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Pencil,
  Star,
  Link2,
  Images,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { AlbumUploadEditor } from '@/components/album/AlbumUploadEditor';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { formatDate, todayKey, clsx } from '@/lib/utils';
import type { AlbumGroup, AlbumStar } from '@/types';

const STAR_TAGS: Array<{ key: AlbumStar['tag'] | 'all'; label: string }> = [
  { key: 'all', label: '全部' },
  { key: 'article', label: '文章' },
  { key: 'moment', label: '动态' },
  { key: 'inspiration', label: '灵感' },
  { key: 'album', label: '相册' },
];

const TAG_LABEL: Record<AlbumStar['tag'], string> = {
  article: '文章',
  moment: '动态',
  inspiration: '灵感',
  album: '相册',
};

export function AlbumDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const album = useAppStore((s) => s.albums.find((a) => a.id === id));
  const groups = useAppStore((s) => s.albumGroups.filter((g) => g.albumId === id));
  const stars = useAppStore((s) => s.albumStars);
  const touchAlbumLastRead = useAppStore((s) => s.touchAlbumLastRead);
  const addAlbumGroup = useAppStore((s) => s.addAlbumGroup);
  const updateAlbumGroup = useAppStore((s) => s.updateAlbumGroup);
  const deleteAlbumGroup = useAppStore((s) => s.deleteAlbumGroup);
  const deleteAlbumStar = useAppStore((s) => s.deleteAlbumStar);
  const showToast = useUIStore((s) => s.showToast);
  const setLightbox = useUIStore((s) => s.setLightbox);
  const setFocusRequest = useUIStore((s) => s.setFocusRequest);
  const [editor, setEditor] = useState<
    | { mode: 'create' }
    | { mode: 'edit'; group: AlbumGroup }
    | null
  >(null);
  const [starTag, setStarTag] = useState<AlbumStar['tag'] | 'all'>('all');

  // 打开图集 = 阅读：更新最近阅读时间（图集列表按它排序）
  useEffect(() => {
    if (id) touchAlbumLastRead(id);
  }, [id, touchAlbumLastRead]);

  // 星标集视图：固定标签筛选 + 最近在上
  const sortedStars = useMemo(
    () => [...stars].sort((a, b) => b.createdAt - a.createdAt),
    [stars],
  );
  const filteredStars = starTag === 'all'
    ? sortedStars
    : sortedStars.filter((s) => s.tag === starTag);

  // 普通图集：组按发布时间排序（最近在上），组内图片保持发布时的顺序
  const sortedGroups = useMemo(
    () => [...groups].sort((a, b) => b.createdAt - a.createdAt),
    [groups],
  );
  const timeline = useMemo(() => {
    const out: Array<{ date: string; items: AlbumGroup[] }> = [];
    for (const g of sortedGroups) {
      const key = todayKey(new Date(g.createdAt));
      const last = out[out.length - 1];
      if (last && last.date === key) last.items.push(g);
      else out.push({ date: key, items: [g] });
    }
    return out;
  }, [sortedGroups]);

  if (!album || !id) {
    return (
      <div className="px-4 sm:px-6 view-enter">
        <div className="max-w-3xl mx-auto py-12 text-center">
          <p className="text-bronze">图集不存在</p>
        </div>
      </div>
    );
  }

  const isStarred = album.starred;

  /** 双链跳回来源 */
  const jumpToSource = (s: AlbumStar) => {
    if (!s.refType || !s.refId) return;
    if (s.refType === 'article') {
      navigate(`/space/article/${s.refId}`);
    } else if (s.refType === 'moment') {
      setFocusRequest({
        kind: 'moment',
        id: s.refId,
        query: '',
        ignoreCase: true,
        index: 0,
        inTitle: false,
        ts: Date.now(),
      });
      navigate('/moments');
    } else {
      setFocusRequest({
        kind: 'inspiration',
        id: s.refId,
        query: '',
        ignoreCase: true,
        index: 0,
        inTitle: false,
        ts: Date.now(),
      });
      navigate('/notes');
    }
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-3xl mx-auto pb-6">
        {/* 顶栏：返回 + 图集名 + （星标集不可删） */}
        <div className="flex items-center gap-3 mb-4 pt-1">
          <button
            onClick={() => navigate('/library/album')}
            className="w-9 h-9 flex items-center justify-center rounded-full text-bronze hover:text-candle border border-line/50"
            aria-label="返回相册"
          >
            <ArrowLeft size={16} strokeWidth={1.6} />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-headline text-lg leading-tight truncate">
              {isStarred && (
                <Star size={15} strokeWidth={1.5} className="inline mr-1.5 text-amber fill-current -mt-0.5" />
              )}
              {album.name}
            </h2>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
              {isStarred ? '从各处收藏的照片 · 可跳回来源' : `相册 · ${groups.length} 组`}
            </p>
          </div>
        </div>

        {isStarred ? (
          /* ─────────── 星标集 ─────────── */
          <>
            {/* 固定标签筛选 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 -mx-1 px-1 mb-3">
              {STAR_TAGS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setStarTag(t.key)}
                  className={clsx(
                    'tag flex-shrink-0 transition-all',
                    starTag === t.key ? 'tag-wine' : 'hover:brightness-110',
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {filteredStars.length === 0 ? (
              <EmptyState
                title={starTag === 'all' ? '星标集还空着' : `还没有「${TAG_LABEL[starTag as AlbumStar['tag']]}」的星标`}
                hint="文章、动态、灵感里的图片，点开大图后可存入星标集"
              />
            ) : (
              <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {filteredStars.map((s) => (
                  <li key={s.id}>
                    <Card className="p-0 overflow-hidden group">
                      <div className="relative aspect-square">
                        <MediaImage
                          fileId={s.imageId}
                          alt="星标图片"
                          className="w-full h-full object-cover"
                          onOpen={() => setLightbox({ fileId: s.imageId, starTag: s.tag, refType: s.refType, refId: s.refId })}
                        />
                        {/* 标签 */}
                        <span
                          className="absolute top-2 left-2 px-2 py-0.5 rounded-pill font-mono text-[9px] tracking-wider text-moon"
                          style={{ background: 'rgba(106,8,14,0.85)' }}
                        >
                          {TAG_LABEL[s.tag]}
                        </span>
                        {/* 移除 */}
                        <button
                          onClick={() => {
                            deleteAlbumStar(s.id);
                            showToast('已从星标集移除', 'info');
                          }}
                          className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-moon opacity-90"
                          style={{ background: 'var(--wine-deep)' }}
                          aria-label="从星标集移除"
                        >
                          <Trash2 size={11} strokeWidth={1.6} />
                        </button>
                        {/* 双链跳回来源 */}
                        {s.refType && s.refId && (
                          <button
                            onClick={() => jumpToSource(s)}
                            className="absolute bottom-2 left-2 flex items-center gap-1 px-2 py-1 rounded-pill font-mono text-[9px] tracking-wider text-candle"
                            style={{ background: 'rgba(27,26,31,0.75)' }}
                            title="跳回来源"
                          >
                            <Link2 size={10} strokeWidth={1.6} /> 来源
                          </button>
                        )}
                      </div>
                      <div className="px-3 py-2 flex items-center justify-between">
                        <span className="font-mono text-[9px] text-bronze-deep tracking-wider">
                          {formatDate(s.createdAt, 'M 月 D 日 HH:mm')}
                        </span>
                        {s.caption && (
                          <span className="font-serif text-xs text-paper truncate-1 ml-2">{s.caption}</span>
                        )}
                      </div>
                    </Card>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          /* ─────────── 普通图集：时间轴 ─────────── */
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
                {groups.length} 组
              </p>
              <button
                onClick={() => setEditor({ mode: 'create' })}
                className="btn-primary flex items-center gap-1.5"
                style={{ padding: '8px 14px' }}
              >
                <Plus size={14} strokeWidth={1.8} /> 添加一组
              </button>
            </div>

            {groups.length === 0 ? (
              <EmptyState
                title="这个图集还没有内容"
                hint="一组最多 30 张，可配文案；也可以直接发文字"
                action={
                  <button onClick={() => setEditor({ mode: 'create' })} className="btn-primary">
                    <Images size={14} strokeWidth={1.6} /> 发布第一组
                  </button>
                }
              />
            ) : (
              <div className="relative pl-5 sm:pl-6">
                <div
                  className="absolute top-2 bottom-2 w-px"
                  style={{ left: 5, background: 'var(--line)', opacity: 0.5 }}
                />
                {timeline.map((g) => (
                  <section key={g.date} className="mb-3">
                    <div className="relative mb-3 -ml-5 sm:-ml-6 pl-5 sm:pl-6">
                      <span
                        className="absolute rounded-full"
                        style={{ left: 0, top: 6, width: 11, height: 11, background: 'var(--amber)' }}
                      />
                      <p className="font-mono text-[10px] tracking-[0.2em] text-amber uppercase">
                        {formatDate(g.items[0].createdAt, 'YYYY 年 M 月 D 日')}
                      </p>
                    </div>
                    <ul className="space-y-3 mb-2">
                      {g.items.map((group) => (
                        <li key={group.id} className="relative">
                          <span
                            className="absolute rounded-full -ml-5 sm:-ml-6"
                            style={{
                              left: 0,
                              top: 22,
                              width: 9,
                              height: 9,
                              background: 'var(--charcoal)',
                              border: '2px solid var(--bronze)',
                            }}
                          />
                          <Card className="p-4 sm:p-5">
                            {/* 操作行 */}
                            <div className="flex items-center gap-2 mb-3">
                              <p className="font-mono text-[10px] text-bronze-deep tracking-wider">
                                {formatDate(group.createdAt, 'HH:mm')} · 发布
                              </p>
                              <span className="flex-1" />
                              {group.updatedAt > group.createdAt && (
                                <span className="font-mono text-[9px] text-bronze-deep">
                                  已编辑 {formatDate(group.updatedAt, 'M 月 D 日 HH:mm')}
                                </span>
                              )}
                              <button
                                onClick={() => setEditor({ mode: 'edit', group })}
                                aria-label="编辑这组照片"
                                className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle transition-all"
                              >
                                <Pencil size={13} strokeWidth={1.5} />
                              </button>
                              <button
                                onClick={async () => {
                                  if (await useUIStore.getState().confirmDialog('删除这组照片？此操作无法撤销。')) {
                                    deleteAlbumGroup(group.id);
                                    showToast('已删除', 'info');
                                  }
                                }}
                                aria-label="删除这组照片"
                                className="w-7 h-7 flex items-center justify-center text-bronze hover:text-wine-light transition-all"
                              >
                                <Trash2 size={13} strokeWidth={1.5} />
                              </button>
                            </div>

                            {/* 图片网格 */}
                            {group.imageIds.length > 0 && (
                              <div
                                className={`grid gap-1.5 ${
                                  group.imageIds.length === 1
                                    ? 'grid-cols-1'
                                    : group.imageIds.length === 2
                                      ? 'grid-cols-2'
                                      : group.imageIds.length === 3
                                        ? 'grid-cols-3'
                                        : 'grid-cols-3 sm:grid-cols-4'
                                }`}
                              >
                                {group.imageIds.map((fid, i) => (
                                  <div
                                    key={fid}
                                    className="rounded-card overflow-hidden border border-line/50"
                                    style={{ aspectRatio: group.imageIds.length === 1 ? '16/9' : '1/1' }}
                                  >
                                    <MediaImage
                                      fileId={fid}
                                      alt={`照片 ${i + 1}`}
                                      className="w-full h-full object-cover"
                                      onOpen={() => setLightbox({ fileId: fid, starTag: 'album' })}
                                    />
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* 文案 */}
                            {group.caption && (
                              <p className="mt-3 font-serif text-reading text-paper whitespace-pre-wrap" style={{ lineHeight: 1.85 }}>
                                {group.caption}
                              </p>
                            )}
                          </Card>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* 上传 / 编辑组 */}
      {editor && (
        <AlbumUploadEditor
          key={editor.mode === 'edit' ? editor.group.id : 'new'}
          initialImages={editor.mode === 'edit' ? editor.group.imageIds : []}
          initialCaption={editor.mode === 'edit' ? editor.group.caption : ''}
          title={editor.mode === 'edit' ? '编辑这组照片' : `发布到「${album.name}」`}
          submitLabel={editor.mode === 'edit' ? '保存修改' : '发布'}
          onSubmit={(images, caption) => {
            if (editor.mode === 'edit') {
              updateAlbumGroup(editor.group.id, { caption, imageIds: images });
              showToast('已保存（更新不改排序）', 'success');
            } else {
              addAlbumGroup(album.id, { caption, imageIds: images });
              showToast('已发布', 'success');
            }
            setEditor(null);
          }}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}
