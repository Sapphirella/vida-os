// 背景预设（设置页与全局背景层共用，避免两处各写一份）
// 色值取自 tailwind.config.js 的暗夜书房色板

export interface BackgroundPreset {
  key: string;
  name: string;
  gradient: string;
  /** 顶栏 / 底栏颜色：背景只从卡片缝隙露出，手机上几乎看不到，
   *  所以让预设同时驱动栏色，切换时才一眼可见（都保持深色以保证文字可读） */
  bar: string;
}

export const DEFAULT_BACKGROUND_PRESET = 'midnight';

export const PRESET_BACKGROUNDS: BackgroundPreset[] = [
  {
    key: 'midnight',
    name: '夜半',
    gradient: 'linear-gradient(135deg, #1B1A1F 0%, #341915 100%)',
    bar: 'rgba(27, 26, 31, 0.92)',
  },
  {
    key: 'wine',
    name: '酒红',
    gradient: 'linear-gradient(135deg, #1B1A1F 0%, #6A080E 100%)',
    bar: 'rgba(74, 12, 18, 0.92)',
  },
  {
    key: 'paper',
    name: '旧纸',
    gradient: 'linear-gradient(135deg, #947D75 0%, #BCAEAA 100%)',
    bar: 'rgba(90, 80, 74, 0.92)',
  },
  {
    key: 'candle',
    name: '烛光',
    gradient: 'linear-gradient(135deg, #341915 0%, #E8C39E 100%)',
    bar: 'rgba(96, 72, 48, 0.92)',
  },
  {
    key: 'deep',
    name: '深紫',
    gradient: 'linear-gradient(135deg, #0F0A14 0%, #341915 70%, #6A080E 100%)',
    bar: 'rgba(44, 18, 30, 0.92)',
  },
];

/** 按 key 取预设，未知 key 回退到默认预设 */
export function getBackgroundPreset(key?: string): BackgroundPreset {
  return (
    PRESET_BACKGROUNDS.find((p) => p.key === key) ??
    PRESET_BACKGROUNDS.find((p) => p.key === DEFAULT_BACKGROUND_PRESET)!
  );
}
