// 主题皮肤控制：暗夜书房（night，默认） / 白昼书房（day）
// 存储：localStorage（同步读取，避免刷新时先渲染默认主题再跳变）
// 初始化顺序：index.html 内联脚本（最早设置 data-theme，防白屏闪烁）
//            → main.tsx 调用 initTheme()（校正 + 跟随系统监听）

export type ThemeMode = 'system' | 'day' | 'night';
export type ResolvedTheme = 'day' | 'night';

const STORAGE_KEY = 'vidaos-theme';

const META_THEME_COLOR: Record<ResolvedTheme, string> = {
  day: '#DDD3C9',
  night: '#171A1B',
};

const DOC_TITLES: Record<ResolvedTheme, string> = {
  day: 'VidaOS · 白昼书房',
  night: 'VidaOS · 暗夜书房',
};

/** 读取持久化的主题模式，非法值回退到「跟随系统」 */
export function readThemeMode(): ThemeMode {
  if (typeof localStorage === 'undefined') return 'system';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'day' || v === 'night' || v === 'system' ? v : 'system';
}

/** 把模式解析成最终皮肤：system 跟随操作系统浅色/深色偏好 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'day' || mode === 'night') return mode;
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'day' : 'night';
  }
  return 'night';
}

function applyTheme(theme: ResolvedTheme) {
  const root = document.documentElement;
  root.dataset.theme = theme;

  // 同步浏览器 UI（地址栏 / 状态栏底色、color-scheme、文档标题）
  const themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (themeColor) themeColor.content = META_THEME_COLOR[theme];
  const colorScheme = document.querySelector<HTMLMetaElement>('meta[name="color-scheme"]');
  if (colorScheme) colorScheme.content = theme;
  document.title = DOC_TITLES[theme];
}

// 跟随系统：只在 mode === 'system' 时挂监听，切换主题时先摘掉旧的
let systemMq: MediaQueryList | null = null;
let systemHandler: (() => void) | null = null;

function watchSystem(mode: ThemeMode) {
  if (systemMq && systemHandler) {
    systemMq.removeEventListener?.('change', systemHandler);
    systemMq = null;
    systemHandler = null;
  }
  if (mode !== 'system' || !window.matchMedia) return;
  systemMq = window.matchMedia('(prefers-color-scheme: light)');
  systemHandler = () => applyTheme(resolveTheme('system'));
  systemMq.addEventListener?.('change', systemHandler);
}

/** 应用并持久化主题模式（设置页调用） */
export function setThemeMode(mode: ThemeMode) {
  localStorage.setItem(STORAGE_KEY, mode);
  applyTheme(resolveTheme(mode));
  watchSystem(mode);
}

/** 应用内初始化（main.tsx 在 render 前调用） */
export function initTheme() {
  const mode = readThemeMode();
  applyTheme(resolveTheme(mode));
  watchSystem(mode);
}