// 音乐播放器状态（本地音频）
import { create } from 'zustand';
import type { Track } from '@/types';
import { fileURL } from '@/lib/fileUrl';

interface MusicStore {
  currentTrackId: string | null;
  isPlaying: boolean;
  progress: number; // 0-1
  duration: number;
  volume: number; // 0-1
  audioEl: HTMLAudioElement | null;

  play: (track: Track) => Promise<void>;
  pause: () => void;
  /** 停止并彻底释放当前音频资源（删除曲目、切歌时用） */
  stop: () => void;
  next: (tracks: Track[]) => void;
  prev: (tracks: Track[]) => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
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
        set({ isPlaying: false, progress: 0 });
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

    next: (tracks) => {
      const cur = get().currentTrackId;
      const idx = tracks.findIndex((t) => t.id === cur);
      if (idx === -1) {
        if (tracks[0]) get().play(tracks[0]);
      } else {
        const next = tracks[(idx + 1) % tracks.length];
        if (next) get().play(next);
      }
    },
    prev: (tracks) => {
      const cur = get().currentTrackId;
      const idx = tracks.findIndex((t) => t.id === cur);
      if (idx === -1) return;
      const prev = tracks[(idx - 1 + tracks.length) % tracks.length];
      if (prev) get().play(prev);
    },
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