// 音乐播放器状态
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
  audioCtx: AudioContext | null;
  builtinNodes: { gain: GainNode; stop: () => void } | null;

  play: (track: Track) => Promise<void>;
  pause: () => void;
  next: (tracks: Track[]) => void;
  prev: (tracks: Track[]) => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
}

export const useMusicStore = create<MusicStore>((set, get) => {
  /** 彻底释放当前音频资源（本地 audio 元素 + WebAudio 节点） */
  const release = () => {
    const { audioEl, audioCtx, builtinNodes } = get();
    if (audioEl) {
      audioEl.pause();
      audioEl.removeAttribute('src');
      audioEl.load();
    }
    if (builtinNodes) builtinNodes.stop();
    if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
    set({ audioEl: null, audioCtx: null, builtinNodes: null });
  };

  return {
    currentTrackId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.6,
    audioEl: null,
    audioCtx: null,
    builtinNodes: null,

    play: async (track) => {
      const state = get();

      // 同一首本地曲目：从暂停处继续，而不是从头重播
      if (!track.builtin && state.audioEl && track.id === state.currentTrackId) {
        if (state.audioEl.ended) state.audioEl.currentTime = 0;
        state.audioEl.play().catch((err) => console.error('Audio resume failed', err));
        set({ isPlaying: true });
        return;
      }

      release();

      if (track.builtin) {
        // 内置音景（WebAudio 实时合成）
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
          const nodes = createBuiltin(ctx, track.builtin, get().volume);
          set({
            audioCtx: ctx,
            builtinNodes: nodes,
            currentTrackId: track.id,
            isPlaying: true,
          });
        } catch (err) {
          console.error('Builtin play failed', err);
        }
        return;
      }

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
      const { audioEl, audioCtx, builtinNodes } = get();
      if (audioEl) audioEl.pause();
      if (builtinNodes) builtinNodes.stop();
      if (audioCtx && audioCtx.state !== 'closed') audioCtx.close();
      set({
        isPlaying: false,
        // 本地音频保留元素以便续播；内置音景节点已销毁，无法续播故清空
        audioEl: builtinNodes ? null : audioEl,
        audioCtx: null,
        builtinNodes: null,
      });
    },

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
      const { audioEl, audioCtx, builtinNodes } = get();
      if (audioEl) audioEl.volume = v;
      if (builtinNodes && audioCtx) {
        builtinNodes.gain.gain.value = v * 0.5;
      }
    },
  };
});

// ============================================================
// 内置音景生成（WebAudio）
// ============================================================

function createBuiltin(
  ctx: AudioContext,
  type: 'rain' | 'candle' | 'silence',
  volume: number,
) {
  if (type === 'silence') {
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(ctx.destination);
    return { gain, stop: () => gain.disconnect() };
  }

  if (type === 'rain') {
    // 白噪声 + 低通 + 缓慢 LFO 模拟雨
    const bufSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      output[i] = (Math.random() * 2 - 1) * 0.4;
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.3;

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
    return {
      gain,
      stop: () => {
        try { noise.stop(); } catch {}
        noise.disconnect();
        filter.disconnect();
        gain.disconnect();
      },
    };
  }

  if (type === 'candle') {
    // 暖色低频嗡鸣
    const osc1 = ctx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = 60;
    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 90;
    const gain = ctx.createGain();
    gain.gain.value = volume * 0.08;
    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(ctx.destination);
    osc1.start();
    osc2.start();
    return {
      gain,
      stop: () => {
        try { osc1.stop(); } catch {}
        try { osc2.stop(); } catch {}
        osc1.disconnect();
        osc2.disconnect();
        gain.disconnect();
      },
    };
  }

  return { gain: ctx.createGain(), stop: () => {} };
}
