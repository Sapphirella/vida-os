// 馆藏 · 相册（v4.5）
// 书架收文档、相册收照片。图集列表：
//   - 星标集固定置顶（不可改名/删除）；
//   - 其余图集按「最近阅读时间」排序（lastReadAt ?? createdAt，打开图集时更新）。
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Images,
  Plus,
  Star,
  Trash2,
  ArrowRight,
  BookOpen,
  Upload,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';
import { MediaImage } from '@/components/common/MediaImage';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { relativeTime } from '@/lib/utils';
import type { Album } from '@/types';

/** 书架 / 相册 切换（LibraryPage 与 AlbumPage 共用） */
export function LibraryTabBar({ active }: { active: 'library' | 'album' }) {
  const navigate = useNavigate();
  const cls = (on: boolean) =>
    'flex items-center gap-2 px-5 py-2.5 rounded-pill font-mono text-[12px] tracking-wider transition-all ' +
    (on ? 'text-moon' : 'text-bronze hover:text-candle');
  return (
    <div className="flex items-center gap-1.5 mb-4">
      <button
        onClick={() => navigate('/library')}
        className={cls(active === 'library')}
        style={active === 'library' ? { background: 'var(--wine)' } : undefined}
      >
        <BookOpen size={16} strokeWidth={1.6} /> 书架
      </button>
      <button
        onClick={() => navigate('/library/album')}
        className={cls(active === 'album')}
        style={active === 'album' ? { background: 'var(--wine)' } : undefined}
      >
        <Images size={16} strokeWidth={1.6} /> 相册
      </button>
    </div>
  );
}

export function AlbumPage() {
  const navigate = useNavigate();
  const albums = useAppStore((s) => s.albums);
  const albumGroups = useAppStore((s) => s.albumGroups);
  const addAlbum = useAppStore((s) => s.addAlbum);
  const deleteAlbum = useAppStore((s) => s.deleteAlbum);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);

  // 星标集永远第一格；其余按最近阅读排序（没打开过的按创建时间兜底）
  const sorted = useMemo(() => {
    const byRecent = (a: Album, b: Album) =>
      (b.lastReadAt ?? b.createdAt) - (a.lastReadAt ?? a.createdAt);
    return [...albums].sort(byRecent);
  }, [albums]);
  const starred = sorted.find((a) => a.starred);
  const rest = sorted.filter((a) => !a.starred);

  const groupCount = (albumId: string) => albumGroups.filter((g) => g.albumId === albumId).length;
  const photoCount = (albumId: string) =>
    albumGroups.filter((g) => g.albumId === albumId).reduce((n, g) => n + g.imageIds.length, 0);
  /** 图集封面：最近发布的一组的第一张图 */
  const coverOf = (albumId: string) => {
    const groups = albumGroups
      .filter((g) => g.albumId === albumId)
      .sort((a, b) => b.createdAt - a.createdAt);
    return groups[0]?.imageIds[0];
  };

  /** 新建图集：用 Modal 内置输入框（自管 state，输入即时可见） */
  const openNewAlbum = () => {
    showModal({
      title: '新建图集',
      inputMode: { placeholder: '图集名称' },
      onInputConfirm: (name) => {
        const n = name.trim();
        if (!n) return;
        const id = addAlbum(n);
        showToast('图集已创建', 'success');
        navigate(`/library/album/${id}`);
      },
    });
  };

  const openDelete = (album: Album) => {
    useUIStore.getState().showModal({
      title: `删除图集「${album.name}」？`,
      content: (
        <div className="space-y-3">
          <p className="text-bronze text-sm leading-relaxed">
            图集里的照片会一并移除；已存入星标集的不受影响。
          </p>
          <div className="flex justify-end gap-2">
            <button className="btn-text" onClick={() => useUIStore.getState().closeModal()}>
              取消
            </button>
            <button
              className="btn-ghost text-wine-light"
              onClick={() => {
                useUIStore.getState().closeModal();
                deleteAlbum(album.id);
                showToast('图集已删除', 'info');
              }}
            >
              删除
            </button>
          </div>
        </div>
      ),
    });
  };

  const isEmpty = albums.length === 0;

  return (
    <div className="px-4 sm:px-6">
      <div className="max-w-5xl mx-auto pb-6">
        <LibraryTabBar active="album" />

        {/* 头部 */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center border border-bronze/20 flex-none"
            style={{ background: 'rgba(106, 8, 14, 0.15)' }}
          >
            <Images size={20} strokeWidth={1.4} className="text-wine-light" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-serif text-headline text-lg leading-tight">相册</h2>
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
              {albums.length} 个图集 · 星标集置顶
            </p>
          </div>
          <button
            onClick={openNewAlbum}
            className="btn-primary flex items-center gap-1.5"
            style={{ padding: '9px 16px' }}
          >
            <Plus size={15} strokeWidth={1.8} /> 新建图集
          </button>
        </div>

        <p className="text-bronze text-xs leading-relaxed mb-5">
          文章、动态、灵感里的图片，点开大图后可以存入<span className="text-candle">星标集</span>。
        </p>

        {isEmpty ? (
          <EmptyState
            title="相册还空着"
            hint="先建一个图集，再上传照片"
            action={
              <button onClick={openNewAlbum} className="btn-primary">
                <Plus size={14} strokeWidth={1.6} /> 新建图集
              </button>
            }
          />
        ) : (
          <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {starred && (
              <li>
                <Card
                  className="group p-0 overflow-hidden h-full flex flex-col cursor-pointer"
                >
                  <button
                    onClick={() => navigate(`/library/album/${starred.id}`)}
                    className="relative flex-1 min-h-[120px] text-left p-4 flex flex-col justify-between"
                    style={{
                      background:
                        'linear-gradient(155deg, rgba(233,196,106,0.3), rgba(106,8,14,0.45))',
                    }}
                  >
                    <Star size={18} strokeWidth={1.3} className="text-amber fill-current" />
                    <span className="font-serif text-title text-moon leading-snug">
                      星标集
                    </span>
                  </button>
                  <div className="px-3 pt-2.5 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] tracking-wider text-amber">
                        置顶 · 固定分类
                      </span>
                      <span className="flex-1" />
                      <span className="font-mono text-[10px] text-bronze-deep">
                        {photoCount(starred.id)} 张
                      </span>
                    </div>
                    <button
                      onClick={() => navigate(`/library/album/${starred.id}`)}
                      className="mt-2 flex items-center gap-1 font-mono text-[10px] tracking-wider text-bronze hover:text-candle transition-colors"
                    >
                      打开
                      <ArrowRight size={11} strokeWidth={1.6} />
                    </button>
                  </div>
                </Card>
              </li>
            )}
            {rest.map((album) => {
              const cover = coverOf(album.id);
              return (
                <li key={album.id}>
                  <Card className="group p-0 overflow-hidden h-full flex flex-col">
                    <button
                      onClick={() => navigate(`/library/album/${album.id}`)}
                      className="relative flex-1 min-h-[120px] text-left p-4 flex flex-col justify-between"
                      style={{
                        background:
                          'linear-gradient(155deg, rgba(106,8,14,0.55), rgba(42,41,46,0.35))',
                      }}
                    >
                      {cover ? (
                        <MediaImage
                          fileId={cover}
                          alt={album.name}
                          className="absolute inset-0 w-full h-full object-cover opacity-70 group-hover:opacity-90 transition-opacity"
                        />
                      ) : (
                        <Images size={18} strokeWidth={1.3} className="text-moon/70" />
                      )}
                      <span
                        className="relative font-serif text-title text-moon leading-snug line-clamp-2"
                        style={{ textShadow: '0 1px 8px rgba(0,0,0,0.6)' }}
                      >
                        {album.name}
                      </span>
                    </button>
                    <div className="px-3 pt-2.5 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] tracking-wider text-bronze-deep">
                          {photoCount(album.id)} 张 · {groupCount(album.id)} 组
                        </span>
                        <span className="flex-1" />
                        <button
                          onClick={() => openDelete(album)}
                          className="w-6 h-6 flex items-center justify-center text-bronze hover:text-wine-light"
                          aria-label="删除图集"
                        >
                          <Trash2 size={13} strokeWidth={1.5} />
                        </button>
                      </div>
                      <button
                        onClick={() => navigate(`/library/album/${album.id}`)}
                        className="mt-2 flex items-center gap-1 font-mono text-[10px] tracking-wider text-bronze hover:text-candle transition-colors"
                      >
                        <Upload size={11} strokeWidth={1.6} />
                        {groupCount(album.id) ? '继续上传' : '上传第一批照片'}
                        <span className="flex-1" />
                        <span className="text-bronze-deep">
                          {album.lastReadAt
                            ? `最近打开 ${relativeTime(album.lastReadAt)}`
                            : `创建 ${relativeTime(album.createdAt)}`}
                        </span>
                      </button>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
