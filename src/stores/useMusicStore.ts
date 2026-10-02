// 音乐播放器状态（本地音频）
import { create } from 'zustand';
import type { Track } from '@/types';
import { fileURL } from '@/lib/fileUrl';
import { useAppStore } from './useAppStore';

/**
 * 播放模式（播放器上一键循环切换）
 *
 * 只影响「一首自然放完之后自动怎么办」，不影响上一首/下一首按钮 ——
 * 手动跳歌永远按列表顺序走，符合直觉。
 */
export type PlayMode = 'sequence' | 'shuffle' | 'repeat-one' | 'stop-after';

export const PLAY_MODES: { key: PlayMode; label: string; hint: string }[] = [
  { key: 'sequence', label: '顺序播放', hint: '按列表顺序播放，放完最后一首回到第一首' },
  { key: 'shuffle', label: '随机播放', hint: '每首结束随机挑一首，尽量不重复刚放完这首' },
  { key: 'repeat-one', label: '单曲循环', hint: '这一首反复播放，直到你换歌或暂停' },
  { key: 'stop-after', label: '播完暂停', hint: '放到最后一首就停下，不回头重播' },
];

interface MusicStore {
  currentTrackId: string | null;
  isPlaying: boolean;
  progress: number; // 0-1
  duration: number;
  volume: number; // 0-1
  audioEl: HTMLAudioElement | null;
  playMode: PlayMode;

  play: (track: Track) => Promise<void>;
  pause: () => void;
  /** 停止并彻底释放当前音频资源（删除曲目、切歌时用） */
  stop: () => void;
  next: (tracks: Track[]) => void;
  prev: (tracks: Track[]) => void;
  /** 一首自然播完时的行为：按 playMode 决定续播 / 重播 / 停下 */
  onTrackEnded: () => void;
  cyclePlayMode: () => void;
  setPlayMode: (m: PlayMode) => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
}

/** 随机挑一首，尽量避开正在放的这首 */
function pickShuffle(tracks: Track[], currentId: string | null): Track | undefined {
  if (tracks.length === 0) return undefined;
  if (tracks.length === 1) return tracks[0];
  let pick = tracks[Math.floor(Math.random() * tracks.length)];
  // 最多重试 8 次；极端情况下（随机数一直撞上）就接受结果，不写成死循环
  for (let i = 0; i < 8 && pick.id === currentId; i++) {
    pick = tracks[Math.floor(Math.random() * tracks.length)];
  }
  return pick;
}

export const useMusicStore = create<MusicStore>((set, get) => {
  /** 彻底释放当前音频资源 */
  const release = () => {
    const { audioEl } = get();
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute('src');
      audioEl.load();
    }
    set({ audioEl: null, isPlaying: false });
  };

  return {
    currentTrackId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.6,
    audioEl: null,
    playMode: 'sequence',

    play: async (track) => {
      const state = get();

      // 同一首曲目：从暂停处继续，而不是从头重播
      if (state.audioEl && track.id === state.currentTrackId) {
        if (state.audioEl.ended) state.audioEl.currentTime = 0;
        state.audioEl.play().catch((err) => console.error('Audio resume failed', err));
        set({ isPlaying: true });
        return;
      }

      release();

      if (!track.fileId) return;
      const url = await fileURL(track.fileId);
      if (!url) return;
      const el = new Audio(url);
      el.volume = get().volume;
      el.addEventListener('timeupdate', () => {
        set({ progress: el.currentTime / (el.duration || 1) });
      });
      el.addEventListener('loadedmetadata', () => {
        set({ duration: el.duration });
      });
      el.addEventListener('ended', () => {
        // 续播决策必须交给 onTrackEnded：它要读 playMode 和完整曲目表。
        // 早前在这里直接写死 set({ isPlaying: false, progress: 0 })，
        // 结果四种模式全退化成「播完暂停」。
        get().onTrackEnded();
      });
      el.play().catch((err) => console.error('Audio play failed', err));
      set({ audioEl: el, currentTrackId: track.id, isPlaying: true, progress: 0, duration: 0 });
    },

    pause: () => {
      const { audioEl } = get();
      if (audioEl) audioEl.pause();
      set({ isPlaying: false });
    },

    stop: () => release(),

    // 上一首/下一首永远按列表顺序：手动跳歌不该被播放模式搅乱
    next: (tracks) => {
      if (!tracks.length) return;
      const idx = tracks.findIndex((t) => t.id === get().currentTrackId);
      const next = idx === -1 ? tracks[0] : tracks[(idx + 1) % tracks.length];
      if (next) void get().play(next);
    },
    prev: (tracks) => {
      if (!tracks.length) return;
      const idx = tracks.findIndex((t) => t.id === get().currentTrackId);
      if (idx === -1) return;
      const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
      if (prev) void get().play(prev);
    },

    onTrackEnded: () => {
      // 命令式读列表：这里是一次性的状态查询，不需要建立 store 订阅
      const tracks = useAppStore.getState().tracks;
      if (!tracks.length) {
        set({ isPlaying: false, progress: 0 });
        return;
      }
      const mode = get().playMode;
      const cur = get().currentTrackId;
      const idx = tracks.findIndex((t) => t.id === cur);

      if (mode === 'repeat-one') {
        // 直接重播当前 audio 元素：不走 play() 的「换源」分支，省掉一次重新解码
        const el = get().audioEl;
        if (el) {
          el.currentTime = 0;
          el.play().catch((err) => console.error('Audio replay failed', err));
          set({ isPlaying: true, progress: 0 });
          return;
        }
        set({ isPlaying: false, progress: 0 });
        return;
      }

      if (mode === 'shuffle') {
        const t = pickShuffle(tracks, cur);
        if (t) void get().play(t);
        return;
      }

      // sequence / stop-after 同样按顺序往下走，
      // 区别只在最后一首之后：sequence 回到开头，stop-after 停下。
      if (idx === -1) {
        set({ isPlaying: false, progress: 0 });
        return;
      }
      if (mode === 'stop-after' && idx === tracks.length - 1) {
        // 停在末尾：进度留 100%，让用户看到「确实放完了」而不是回到 0%
        set({ isPlaying: false, progress: 1 });
        return;
      }
      const next = tracks[(idx + 1) % tracks.length];
      if (next) void get().play(next);
    },

    cyclePlayMode: () => {
      const i = PLAY_MODES.findIndex((m) => m.key === get().playMode);
      set({ playMode: PLAY_MODES[(i + 1) % PLAY_MODES.length].key });
    },
    setPlayMode: (m) => set({ playMode: m }),

    seek: (ratio) => {
      const { audioEl } = get();
      if (audioEl && audioEl.duration) {
        audioEl.currentTime = audioEl.duration * ratio;
        set({ progress: ratio });
      }
    },
    setVolume: (v) => {
      set({ volume: v });
      const { audioEl } = get();
      if (audioEl) audioEl.volume = v;
    },
  };
});
