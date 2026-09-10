import { useState, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, Plus } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useMusicStore } from '@/stores/useMusicStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile } from '@/lib/db';
import { uid, humanSize } from '@/lib/utils';

export function MusicPlayerCard() {
  const tracks = useAppStore((s) => s.tracks);
  const addTrack = useAppStore((s) => s.addTrack);
  const music = useMusicStore();
  const showToast = useUIStore((s) => s.showToast);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showList, setShowList] = useState(false);

  const currentTrack = tracks.find((t) => t.id === music.currentTrackId) || tracks[0];

  const handlePlay = () => {
    if (currentTrack) music.play(currentTrack);
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
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
    e.target.value = '';
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
          <h3 className="font-serif text-moon text-lg mt-0.5">音景</h3>
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
          onChange={handleImport}
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
            {currentTrack?.artist || (currentTrack?.builtin ? '内置音景' : '尚未选择')}
          </p>
        </div>
      </div>

      {/* 进度条 */}
      {currentTrack && !currentTrack.builtin && (
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
      <div className="flex items-center gap-2 mb-3">
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

      {/* 曲目列表切换 */}
      <button
        onClick={() => setShowList((s) => !s)}
        className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase text-center hover:text-bronze transition-colors mt-1"
      >
        {showList ? '▾ 收起' : `▴ 曲目（${tracks.length}）`}
      </button>

      {showList && (
        <div className="mt-3 max-h-40 overflow-y-auto -mx-1">
          {tracks.map((t) => {
            const active = t.id === music.currentTrackId;
            return (
              <button
                key={t.id}
                onClick={() => music.play(t)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-left transition-colors ${
                  active ? 'bg-wine/15 text-candle' : 'text-paper hover:bg-bronze/10'
                }`}
              >
                <div
                  className="w-1 h-1 rounded-full"
                  style={{
                    background: active ? 'var(--candle)' : 'var(--bronze-deep)',
                  }}
                />
                <span className="font-sans text-xs flex-1 truncate-1">{t.title}</span>
                <span className="font-mono text-[9px] text-bronze-deep tracking-widest">
                  {t.builtin ? 'BUILTIN' : 'LOCAL'}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </Card>
  );
}
