// 背景预设（设置页与全局背景层共用，避免两处各写一份）
// 2026-09-14 起按用户要求改为「实色」方案：
//   - 默认（none）= 不叠加任何背景渐变，页面直接是当前主题的 --bg-base 实色
//   - 唯一保留的渐变预设：深紫，仅用于「猩红书房」珍藏配方（夜间主题 + 无自定义图）

export interface BackgroundPreset {
  key: string;
  name: string;
  /** 渐变字符串（none 时为空，由 Background 组件跳过渲染） */
  gradient: string;
  /** 顶栏 / 底栏颜色：none 时由 CSS 变量 --bar-bg（按主题）兜底；
   *  其余预设同步驱动栏色，确保切换时一眼可见 */
  bar: string;
}

export const DEFAULT_BACKGROUND_PRESET = 'none';

export const PRESET_BACKGROUNDS: BackgroundPreset[] = [
  {
    key: 'none',
    name: '无',
    gradient: '',
    bar: '',  // 由 globals.css 的 --bar-bg（按主题）兜底
  },
  {
    key: 'deep',
    name: '深紫',
    // 「猩红书房」专属渐变（保留）—— 暗夜书房底色上叠加深紫
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
