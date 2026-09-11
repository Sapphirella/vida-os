// 背景预设（设置页与全局背景层共用，避免两处各写一份）
// 色值取自 tailwind.config.js 的暗夜书房色板

export interface BackgroundPreset {
  key: string;
  name: string;
  gradient: string;
}

export const DEFAULT_BACKGROUND_PRESET = 'midnight';

export const PRESET_BACKGROUNDS: BackgroundPreset[] = [
  { key: 'midnight', name: '夜半', gradient: 'linear-gradient(135deg, #1B1A1F 0%, #341915 100%)' },
  { key: 'wine', name: '酒红', gradient: 'linear-gradient(135deg, #1B1A1F 0%, #6A080E 100%)' },
  { key: 'paper', name: '旧纸', gradient: 'linear-gradient(135deg, #947D75 0%, #BCAEAA 100%)' },
  { key: 'candle', name: '烛光', gradient: 'linear-gradient(135deg, #341915 0%, #E8C39E 100%)' },
  {
    key: 'deep',
    name: '深紫',
    gradient: 'linear-gradient(135deg, #0F0A14 0%, #341915 70%, #6A080E 100%)',
  },
];

/** 按 key 取预设，未知 key 回退到默认预设 */
export function getBackgroundPreset(key?: string): BackgroundPreset {
  return (
    PRESET_BACKGROUNDS.find((p) => p.key === key) ??
    PRESET_BACKGROUNDS.find((p) => p.key === DEFAULT_BACKGROUND_PRESET)!
  );
}
