import { useEffect, useRef, useState } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Plus,
  ListMusic,
  Trash2,
  Music,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile, deleteFile, getFile } from '@/lib/db';
import { uid, humanSize } from '@/lib/utils';
import { revokeFileURL } from '@/lib/fileUrl';
import type { Track } from '@/types';

export function MusicPlayerCard() {
  const tracks = useAppStore((s) => s.tracks);
  const addTrack = useAppStore((s) => s.addTrack);
  const deleteTrack = useAppStore((s) => s.deleteTrack);
  const music = useMusicStore();
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentTrack = tracks.find((t) => t.id === music.currentTrackId) || tracks[0];

  const handlePlay = () => {
    if (!currentTrack) return;
    // 播放中则暂停，暂停中则（续）播——原先恒调 play() 会把暂停键变成「从头重播」
    if (music.isPlaying) music.pause();
    else music.play(currentTrack);
  };

  const handleImport = async (file: File) => {
    if (!file) return;
    const id = uid('file_');
    await putFile({
      id,
      blob: file,
      mime: file.type,
      name: file.name,
      size: file.size,
    });
    addTrack({
      title: file.name.replace(/\.[^.]+$/, ''),
      artist: '本地音频',
      fileId: id,
    });
    showToast(`已添加：${file.name} (${humanSize(file.size)})`, 'success');
  };

  const handleDelete = async (t: Track) => {
    if (!window.confirm(`删除歌曲「${t.title}」？\n对应的音频文件也会一并删除。`)) return;
    // 正在播放这首时先彻底停止并释放资源
    if (t.id === music.currentTrackId) music.stop();
    if (t.fileId) {
      revokeFileURL(t.fileId);
      await deleteFile(t.fileId).catch(() => {});
    }
    deleteTrack(t.id);
    showToast(`已删除：${t.title}`, 'success');
  };

  const openList = () => {
    showModal({
      title: '歌曲列表',
      content: (
        <TrackListPanel
          onImport={handleImport}
          onSelect={(t) => music.play(t)}
          onDelete={handleDelete}
        />
      ),
    });
  };

  return (
    <Card className="p-4 sm:p-5 h-full flex flex-col overflow-hidden relative">
      {/* 装饰：唱片纹理 */}
      <div
        className="absolute -right-12 -top-12 w-40 h-40 rounded-full opacity-20 pointer-events-none"
        style={{
          background:
            'radial-gradient(circle, transparent 30%, rgba(232, 195, 158, 0.06) 30.5%, transparent 31%, transparent 36%, rgba(232, 195, 158, 0.04) 36.5%, transparent 37%, transparent 42%, rgba(232, 195, 158, 0.04) 42.5%, transparent 43%)',
        }}
      />

      <div className="flex items-center justify-between mb-3 relative">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-bronze-deep uppercase">
            soundscape
          </p>
          <h3 className="font-serif text-headline text-lg mt-0.5">音乐</h3>
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle rounded-full"
          aria-label="导入音乐"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleImport(f);
            e.target.value = '';
          }}
        />
      </div>

      {/* 当前曲目 */}
      <div className="flex items-center gap-3 mb-4 relative">
        <div
          className={`w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 ${
            music.isPlaying ? 'animate-breathe' : ''
          }`}
          style={{
            background:
              'radial-gradient(circle, var(--wood) 30%, transparent 31%, transparent 36%, var(--wood) 36.5%, var(--wood) 40%, transparent 41%, transparent 46%, var(--wood) 46.5%)',
            backgroundColor: 'rgba(52, 25, 21, 0.6)',
            boxShadow: music.isPlaying ? '0 0 24px rgba(232, 195, 158, 0.18)' : 'none',
            transition: 'box-shadow 0.6s ease',
          }}
        >
          <div
            className="w-3 h-3 rounded-full"
            style={{ background: 'var(--candle)', opacity: 0.7 }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-serif text-paper truncate-1 text-base">
            {currentTrack?.title || '选择一首'}
          </p>
          <p className="font-sans text-bronze text-xs truncate-1 mt-0.5">
            {currentTrack?.artist || '尚未选择'}
          </p>
        </div>
      </div>

      {/* 进度条 */}
      {currentTrack && (
        <div className="mb-3">
          <div
            className="h-1 rounded-full bg-bronze/15 overflow-hidden cursor-pointer"
            onClick={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              const x = (e.clientX - r.left) / r.width;
              music.seek(x);
            }}
          >
            <div
              className="h-full bg-candle transition-all"
              style={{ width: `${music.progress * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* 控制 */}
      <div className="flex items-center justify-center gap-5 mb-4">
        <button
          onClick={() => music.prev(tracks)}
          className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="上一首"
        >
          <SkipBack size={18} strokeWidth={1.4} />
        </button>
        <button
          onClick={handlePlay}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all"
          style={{
            background: 'var(--wine)',
            boxShadow: '0 0 20px rgba(106, 8, 14, 0.4)',
          }}
          aria-label="播放"
        >
          {music.isPlaying ? (
            <Pause size={18} strokeWidth={1.5} className="text-moon" />
          ) : (
            <Play size={18} strokeWidth={1.5} className="text-moon ml-0.5" />
          )}
        </button>
        <button
          onClick={() => music.next(tracks)}
          className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="下一首"
        >
          <SkipForward size={18} strokeWidth={1.4} />
        </button>
      </div>

      {/* 音量 */}
      <div className="flex items-center gap-2 mb-4">
        <Volume2 size={14} strokeWidth={1.4} className="text-bronze-deep" />
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={music.volume}
          onChange={(e) => music.setVolume(parseFloat(e.target.value))}
          className="flex-1 h-1 appearance-none rounded-full bg-bronze/15 accent-wine-light"
          style={{ accentColor: 'var(--wine-light)' }}
        />
      </div>

      {/* 歌曲列表入口 */}
      <button
        onClick={openList}
        className="mt-auto w-full flex items-center justify-center gap-2 rounded-md border border-line/60 bg-black/20 px-3 py-2.5 text-bronze hover:text-candle hover:border-bronze/60 transition-colors"
      >
        <ListMusic size={15} strokeWidth={1.5} />
        <span className="font-mono text-[11px] tracking-widest uppercase">
          歌曲列表（{tracks.length}）
        </span>
      </button>
    </Card>
  );
}

// ============================================================
// 歌曲列表面板（全局 Modal 内渲染，实时订阅 store）
// ============================================================

function TrackListPanel({
  onImport,
  onSelect,
  onDelete,
}: {
  onImport: (file: File) => Promise<void>;
  onSelect: (track: Track) => void;
  onDelete: (track: Track) => Promise<void>;
}) {
  const tracks = useAppStore((s) => s.tracks);
  const currentTrackId = useMusicStore((s) => s.currentTrackId);
  const isPlaying = useMusicStore((s) => s.isPlaying);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-3">
      <input
        ref={fileRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void onImport(f);
          e.target.value = '';
        }}
      />

      {tracks.length === 0 ? (
        <div className="py-10 text-center">
          <Music size={26} strokeWidth={1.2} className="mx-auto text-bronze-deep mb-3" />
          <p className="text-bronze text-sm">还没有音乐</p>
          <p className="text-bronze-deep text-xs mt-1">导入一首本地音频，在书桌上伴你阅读</p>
          <button
            onClick={() => fileRef.current?.click()}
            className="btn-ghost mt-4"
          >
            <Plus size={13} strokeWidth={1.5} /> 导入音乐
          </button>
        </div>
      ) : (
        <>
          <ul className="max-h-[46vh] overflow-y-auto rounded-card border border-line/50 bg-black/15 divide-y divide-line/30">
            {tracks.map((t) => {
              const active = t.id === currentTrackId;
              return (
                <li key={t.id} className="flex items-stretch">
                  <button
                    onClick={() => onSelect(t)}
                    className={`flex flex-1 min-w-0 items-center gap-2.5 px-3 py-2.5 text-left transition-colors ${
                      active ? 'bg-wine/15' : 'hover:bg-bronze/10'
                    }`}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                      style={{ background: active ? 'var(--candle)' : 'var(--bronze-deep)' }}
                    />
                    <span className="flex-1 min-w-0">
                      <span
                        className={`block font-serif text-sm truncate-1 ${
                          active ? 'text-candle' : 'text-paper'
                        }`}
                      >
                        {t.title}
                      </span>
                      <span className="block font-mono text-[9px] tracking-widest text-bronze-deep mt-0.5">
                        {active
                          ? isPlaying
                            ? '正在播放'
                            : '已暂停'
                          : '本地音乐'}
                        {t.fileId && <TrackSize fileId={t.fileId} />}
                      </span>
                    </span>
                  </button>
                  <button
                    onClick={() => void onDelete(t)}
                    aria-label={`删除 ${t.title}`}
                    className="w-10 flex-shrink-0 flex items-center justify-center text-bronze-deep hover:text-wine-bright transition-colors"
                  >
                    <Trash2 size={14} strokeWidth={1.5} />
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="flex justify-end">
            <button onClick={() => fileRef.current?.click()} className="btn-ghost">
              <Plus size={13} strokeWidth={1.5} /> 导入音乐
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/** 异步读取音频文件大小（显示在列表副行） */
function TrackSize({ fileId }: { fileId: string }) {
  const [size, setSize] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    getFile(fileId)
      .then((f) => {
        if (alive && f) setSize(humanSize(f.size));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fileId]);
  if (!size) return <span className="mx-1 text-bronze-deep/60">·</span>;
  return <span className="ml-1">· {size}</span>;
}