// 音乐播放器状态（本地音频）
//
// v4.7.6 两处重做（都是「手机上放完这首就停住」这个现象逼出来的）：
//
// ① **单例 `<audio>`，换 src 而不是每首 `new Audio()`**。
//    移动端浏览器的自动播放策略按「元素」放行：一个已经被用户手势启动过的元素，
//    之后换源再 `play()` 仍然允许；而**新建的元素**不是用户手势触发的，会被直接拦下。
//    原实现每首新建元素 —— 于是「自动续播」（顺序/随机）在手机上最容易失灵。
//    桌面浏览器不敏感，所以这个问题只在手机上暴露。
//
// ② **跳过放不出来的歌，并把原因说出来**。
//    原来 `play()` 遇到「没有 fileId」或「文件取不到」就 `return`，
//    状态停在上一次 `release()` 留下的 `isPlaying:false` —— 表现就是**「这首放完自动暂停了」**。
//    随机播放最明显：它随机挑，挑到一首坏文件就停，看起来像随机模式坏了。
//    （坏文件的来源：v4.6.1 之前「清除缓存」会把音乐 blob 当孤儿删掉，见 PROJECT_MEMORY §8.3）
//    现在：续播/上一首/下一首都会**跳过取不到文件的歌**；整轮都放不出来才停，
//    并通过 `playError` 把原因交给 UI 弹一次 toast —— 不再静默停下。
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
  {
    key: 'repeat-one',
    label: '单曲循环',
    // 说清「点下一首会换歌」：有的音乐软件在单曲循环下点下一首是把本曲从头重来，
    // 这里**刻意**不是（用户明确表示喜欢这个逻辑，见 PROJECT_MEMORY §4-12）——
    // 那类软件的行为会让人以为「下一首按钮坏了」。别改成前者，也别把这句话删了。
    hint: '这一首反复播放；点「下一首」会真的换到下一首继续循环（不是本曲从头重来）',
  },
  { key: 'stop-after', label: '播完暂停', hint: '这首放完就停，不自动接着播下一首' },
];

interface MusicStore {
  currentTrackId: string | null;
  isPlaying: boolean;
  progress: number; // 0-1
  duration: number;
  volume: number; // 0-1
  audioEl: HTMLAudioElement | null;
  playMode: PlayMode;
  /**
   * 最近一次「放不出来」的原因（文件缺失 / 被浏览器拦下）。
   * UI 读到就弹一次 toast 然后清掉 —— 静默停下是这次要修的病根。
   */
  playError: string | null;
  clearPlayError: () => void;

  play: (track: Track) => Promise<void>;
  pause: () => void;
  /** 停止并彻底释放当前音频资源（删除曲目、切歌时用） */
  stop: () => void;
  next: (tracks: Track[]) => void;
  prev: (tracks: Track[]) => void;
  /** 一首自然播完时的行为：按 playMode 决定续播 / 重播 / 停下 */
  onTrackEnded: () => Promise<void>;
  cyclePlayMode: () => void;
  setPlayMode: (m: PlayMode) => void;
  seek: (ratio: number) => void;
  setVolume: (v: number) => void;
}

/** 随机挑一个下标，尽量避开刚放完的这首（重试 8 次，不写成死循环） */
function pickShuffleIndex(len: number, curIdx: number): number {
  if (len <= 1) return 0;
  let i = Math.floor(Math.random() * len);
  for (let n = 0; n < 8 && i === curIdx; n++) i = Math.floor(Math.random() * len);
  return i;
}

export const useMusicStore = create<MusicStore>((set, get) => {
  /**
   * 模块级单例元素（不进 state 的生命周期）。
   * 只在第一次播放时创建，之后一直复用 —— 见文件头 ①。
   */
  let el: HTMLAudioElement | null = null;
  /**
   * 是否正在换源。
   * 换源会让浏览器走一遍加载算法，那期间会带出一个 `pause` 事件 —— 那不是用户暂停，
   * 不能拿它把 isPlaying 置假（否则「下一首刚开始播」就会被自己写成暂停）。
   */
  let swapping = false;

  /** 元素是不是真的在出声 —— 状态回写的唯一依据（别用 promise 的成败去猜） */
  const isPlayingNow = (a: HTMLAudioElement) => !a.paused && !a.ended;

  /**
   * 开始播放，并**按元素的真实状态**回写 isPlaying。
   *
   * ⚠️ 这里绝不能不看出声与否就 `catch { isPlaying:false }`（v4.7.9 修的就是这个 bug）：
   * `play()` 的 promise 会因为「新一次加载打断了上一次播放」(AbortError) 之类的原因 reject，
   * 但那时元素**往往已经在放了**。盲信 promise 的后果就是
   * 「UI 显示暂停、声音还在响，而且找不到地方关掉」——用户报的正是这个。
   */
  const startPlayback = async (a: HTMLAudioElement) => {
    try {
      await a.play();
      set({ isPlaying: true, playError: null });
    } catch (err) {
      if (isPlayingNow(a)) {
        set({ isPlaying: true, playError: null });
      } else {
        set({ isPlaying: false, playError: '浏览器拦下了自动播放，点一下播放键继续' });
        console.warn('Audio play rejected', err);
      }
    } finally {
      swapping = false;
    }
  };

  const audio = (): HTMLAudioElement => {
    if (el) return el;
    const a = new Audio();
    a.preload = 'metadata';
    a.addEventListener('timeupdate', () => {
      if (get().audioEl !== a) return;
      // isPlaying 顺手从元素的实际状态同步：这是「状态说暂停、声音还在响」的自愈兜底 ——
      // 只要还在出声，timeupdate 就会持续把状态纠回 true（v4.7.9）。
      set({ progress: a.currentTime / (a.duration || 1), isPlaying: isPlayingNow(a) });
    });
    a.addEventListener('loadedmetadata', () => {
      if (get().audioEl !== a) return;
      set({ duration: a.duration });
    });
    // play / playing 一定意味着「元素在放」，可以直接采信（pause 才有换源歧义）
    const markPlaying = () => {
      if (get().audioEl !== a) return;
      set({ isPlaying: true, playError: null });
    };
    a.addEventListener('play', markPlaying);
    a.addEventListener('playing', markPlaying);
    a.addEventListener('pause', () => {
      if (get().audioEl !== a) return;
      // 播完自然停下（ended=true）交给 onTrackEnded 决定；换源带出的 pause 直接忽略
      if (a.ended || swapping) return;
      set({ isPlaying: false });
    });
    a.addEventListener('ended', () => {
      // 续播决策必须交给 onTrackEnded：它要读 playMode 和完整曲目表。
      // 早前在这里直接写死 set({ isPlaying: false, progress: 0 })，
      // 结果四种模式全退化成「播完暂停」。
      if (get().currentTrackId) void get().onTrackEnded();
      else set({ isPlaying: false });
    });
    a.addEventListener('error', () => {
      // 还在出声 → 这是旧资源的报错（换源途中最常见），别动状态
      if (get().audioEl !== a) return;
      if (isPlayingNow(a)) return;
      if (!get().currentTrackId) return;
      set({ isPlaying: false, playError: '这个音频放不出来（文件可能已损坏），换一首试试' });
    });
    el = a;
    return a;
  };

  /** 停掉声音并卸掉源，但**保留元素本身**（保住「已解锁」状态） */
  const halt = () => {
    if (!el) return;
    el.pause();
    el.removeAttribute('src');
    el.load();
  };

  /** 彻底释放：状态清空，元素留着 */
  const release = () => {
    halt();
    set({ audioEl: null, isPlaying: false, currentTrackId: null, progress: 0, duration: 0 });
  };

  /**
   * 从 from 起按 step 方向找第一首「音频文件还在」的歌（最多绕列表一圈）。
   * 找不到返回 null —— 调用方据此决定是停下并报错，而不是静默假死。
   */
  const firstPlayable = async (from: number, step: 1 | -1): Promise<Track | null> => {
    const tracks = useAppStore.getState().tracks;
    if (!tracks.length) return null;
    for (let n = 0; n < tracks.length; n++) {
      const i = ((((from + n * step) % tracks.length) + tracks.length) % tracks.length);
      const t = tracks[i];
      if (!t?.fileId) continue;
      // fileURL 内部有缓存，所以这里反复探测的代价很低
      if (await fileURL(t.fileId)) return t;
    }
    return null;
  };

  return {
    currentTrackId: null,
    isPlaying: false,
    progress: 0,
    duration: 0,
    volume: 0.6,
    audioEl: null,
    playMode: 'sequence',
    playError: null,
    clearPlayError: () => set({ playError: null }),

    play: async (track) => {
      const a = audio();
      const state = get();

      // 同一首曲目：从暂停处继续（播完了就从头），不重新取源
      if (track.id === state.currentTrackId && state.audioEl === a && a.src) {
        if (a.ended) a.currentTime = 0;
        await startPlayback(a);
        return;
      }

      if (!track.fileId) {
        set({ isPlaying: false, playError: `「${track.title}」没有音频文件，重新导入一次即可` });
        return;
      }
      const url = await fileURL(track.fileId);
      if (!url) {
        set({
          isPlaying: false,
          playError: `「${track.title}」的音频文件找不到了（可能被清理过），重新导入一次即可`,
        });
        return;
      }

      // 换源而不是新建元素：移动端的关键（见文件头 ①）
      swapping = true;
      a.src = url;
      a.volume = get().volume;
      // ⚠️ 这里**不要**再写 `a.currentTime = 0`：新资源的起点本来就是 0，
      //    而在新资源还没选好之前写 currentTime 会打断加载，让随后的 play()
      //    以 AbortError reject —— 那正是「显示暂停、声音还在响」的成因之一（v4.7.9）。
      set({
        audioEl: a,
        currentTrackId: track.id,
        isPlaying: true,
        progress: 0,
        duration: 0,
        playError: null,
      });
      await startPlayback(a);
    },

    pause: () => {
      const { audioEl } = get();
      if (audioEl) audioEl.pause();
      set({ isPlaying: false });
    },

    stop: () => release(),

    // 上一首/下一首永远按列表顺序：手动跳歌不该被播放模式搅乱。
    // 同时会跳过文件缺失的歌（否则按钮点下去像没反应）。
    next: (tracks) => {
      if (!tracks.length) return;
      const idx = tracks.findIndex((t) => t.id === get().currentTrackId);
      void firstPlayable(idx + 1, 1).then((t) => {
        if (t) void get().play(t);
      });
    },
    prev: (tracks) => {
      if (!tracks.length) return;
      const idx = tracks.findIndex((t) => t.id === get().currentTrackId);
      if (idx === -1) return;
      void firstPlayable(idx - 1, -1).then((t) => {
        if (t) void get().play(t);
      });
    },

    onTrackEnded: async () => {
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
        // 直接重播当前元素：不走换源分支，省掉一次重新解码
        const a = get().audioEl;
        if (a) {
          a.currentTime = 0;
          await startPlayback(a);
          set({ progress: 0 });
          return;
        }
        set({ isPlaying: false, progress: 0 });
        return;
      }

      // 「播完暂停」：**播完本首就停**，跟它在列表第几个无关（v4.7.3 按用户澄清改）
      // 进度留 100%：让用户看到「确实放完了」而不是回到 0%。
      if (mode === 'stop-after') {
        set({ isPlaying: false, progress: 1 });
        return;
      }

      // 随机：先随机挑一个下标，再往后找第一首能放的；
      // 顺序：从下一首开始往后找。两者都会跳过取不到文件的歌（v4.7.6）。
      const start = mode === 'shuffle' ? pickShuffleIndex(tracks.length, idx) : idx + 1;
      const next = await firstPlayable(start, 1);
      if (next) {
        await get().play(next);
        return;
      }
      // 整轮都找不到能放的：停下，但别静默
      set({
        isPlaying: false,
        progress: 1,
        playError: '列表里的歌都放不出来（音频文件可能被清理过），重新导入一次即可',
      });
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
      // 元素可能还没创建（没播过）—— 那就不用设，play() 时会带上当前音量
      if (el) el.volume = v;
    },
  };
});
