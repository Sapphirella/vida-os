// 全局背景层（实色方案 2026-09-14）：
//   - 自定义图：原逻辑保留（蒙版 / 不蒙版）
//   - 猩红书房（独立主题 scarlet，或旧数据的「夜间 + 深紫预设 + 无自定义图」配方）
//     显示深紫渐变
//   - 普通日间 / 夜间：完全不渲染背景渐变，页面直接是 --bg-base 实色
//   - 装饰层：仅保留极淡噪点纹理（实色微透装饰块已按反馈移除，避免浅色遮罩）
//   - 暗夜专属（v4.5.2+）：在 #171A1B 上撒一层细碎星星粉。
//     用 SVG <pattern> 一次性铺满（GPU 合成，几乎零渲染成本），
//     仅 6 颗大星做缓慢 twinkle（opacity 动画），其余全部静止。
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { fileURL } from '@/lib/fileUrl';
import { resolveTheme, readThemeMode, type ResolvedTheme } from '@/lib/theme';

// 「猩红书房」专属渐变与栏色：独立主题不再依赖 backgrounds.ts 的 deep 预设，
// 固定内联这两处，保证 scarlet / 旧配方（night+deep）观感一致
const SCARLET_GRADIENT = 'linear-gradient(135deg, #0F0A14 0%, #341915 70%, #6A080E 100%)';
const SCARLET_BAR = 'rgba(44, 18, 30, 0.92)';

/* ============================================================
 *  暗夜星星粉（仅在 night 主题、无自定义图、非猩红书房时显示）
 *  设计要点：
 *  - 远景（小星） = 密集、低 alpha、淡玫瑰木；近景（大星）= 稀疏、高 alpha、淡玫瑰
 *  - 远景用 SVG <pattern> 重复铺一个矩形 → 一次合成、零 per-star 开销
 *  - 近景大星仅 6 颗，缓慢 twinkle（CSS opacity 动画），GPU 友好
 *  - 整体微弱视差（translate3d + scale），桌面 / 移动端均 60fps
 * ============================================================ */

/** 远景小星 pattern（240×240 单元），在 6 个固定位置放小圆 */
const STARS_FAR_PATTERN = (
  <pattern id="vd-stars-far" x="0" y="0" width="240" height="240" patternUnits="userSpaceOnUse">
    <circle cx="20"  cy="35"  r="0.6" fill="#A8767D" opacity="0.32" />
    <circle cx="68"  cy="92"  r="0.5" fill="#BAA6AD" opacity="0.28" />
    <circle cx="130" cy="44"  r="0.7" fill="#A8767D" opacity="0.36" />
    <circle cx="190" cy="120" r="0.5" fill="#BAA6AD" opacity="0.24" />
    <circle cx="45"  cy="170" r="0.6" fill="#A8767D" opacity="0.30" />
    <circle cx="110" cy="200" r="0.7" fill="#BAA6AD" opacity="0.34" />
    <circle cx="170" cy="220" r="0.5" fill="#A8767D" opacity="0.26" />
    <circle cx="215" cy="60"  r="0.6" fill="#BAA6AD" opacity="0.30" />
    <circle cx="155" cy="160" r="0.5" fill="#A8767D" opacity="0.28" />
    <circle cx="85"  cy="140" r="0.6" fill="#BAA6AD" opacity="0.22" />
  </pattern>
);

/** 近景大星：6 颗固定位置、亮色调；外层 div 用 keyframes 让其 twinkle */
const STAR_BIG_POSITIONS = [
  { top: '12%', left: '8%',  size: 2.2, delay: '0s',   duration: '5.5s' },
  { top: '28%', left: '78%', size: 1.8, delay: '1.2s', duration: '6.2s' },
  { top: '52%', left: '22%', size: 2.0, delay: '2.4s', duration: '5.8s' },
  { top: '68%', left: '88%', size: 1.6, delay: '0.8s', duration: '6.5s' },
  { top: '82%', left: '48%', size: 2.4, delay: '3.0s', duration: '5.2s' },
  { top: '40%', left: '55%', size: 1.4, delay: '1.8s', duration: '6.8s' },
];

function NightStars() {
  return (
    <div className="vd-stars-layer" aria-hidden>
      {/* 远景小星：单 SVG + pattern 重复铺满（GPU 合成，零 per-star 开销） */}
      <svg
        className="vd-stars-far absolute inset-0 w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid slice"
      >
        {STARS_FAR_PATTERN}
        <rect width="100%" height="100%" fill="url(#vd-stars-far)" />
      </svg>

      {/* 近景大星：6 颗固定位置，CSS twinkle 动画（GPU 友好） */}
      {STAR_BIG_POSITIONS.map((s, i) => (
        <span
          key={i}
          className="vd-star-big"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
    </div>
  );
}

export function Background() {
  const backgroundFileId = useAppStore((s) => s.profile.backgroundFileId);
  const backgroundPreset = useAppStore((s) => s.profile.backgroundPreset);
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  // 主题跟随：当前解析后的主题（day / night / scarlet）
  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(readThemeMode()));
  useEffect(() => {
    const sync = () => setTheme(resolveTheme(readThemeMode()));
    const obs = new MutationObserver(sync);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => obs.disconnect();
  }, []);

  // 自定义背景以 Blob 存在 IndexedDB，需要先换成 objectURL
  useEffect(() => {
    let mounted = true;
    if (!backgroundFileId) {
      setCustomUrl(null);
      return;
    }
    fileURL(backgroundFileId).then((u) => {
      if (mounted) setCustomUrl(u);
    });
    return () => {
      mounted = false;
    };
  }, [backgroundFileId]);

  const hasCustomImage = Boolean(backgroundFileId && customUrl);

  // 「猩红书房」= 独立主题 scarlet；兼容旧数据：夜间 + 深紫预设 + 无自定义图
  const isScarletStudy =
    theme === 'scarlet' ||
    (theme === 'night' && !hasCustomImage && backgroundPreset === 'deep');

  // 星星粉 = 仅在"普通暗夜"时显示（猩红书房 / 白昼 / 自定义图都不用）
  const showStars = theme === 'night' && !hasCustomImage && !isScarletStudy;

  // 顶栏/底栏颜色：仅猩红书房用深紫栏色；其余由 globals.css 的 --bar-bg（按主题）兜底
  useEffect(() => {
    if (isScarletStudy) {
      document.documentElement.style.setProperty('--bar-bg', SCARLET_BAR);
    } else {
      document.documentElement.style.removeProperty('--bar-bg');
    }
    return () => {
      document.documentElement.style.removeProperty('--bar-bg');
    };
  }, [isScarletStudy]);

  return (
    <div className="fixed inset-0 pointer-events-none -z-10">
      {/* 基底：自定义图 → 猩红书房渐变 → 空（页面直接是 --bg-base 实色） */}
      {hasCustomImage ? (
        <>
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${customUrl})` }}
          />
          {/* 暗色蒙版：保证自定义图片上的文字仍然可读（日间主题下减淡，见 globals.css） */}
          <div className="absolute inset-0 bg-mask" style={{ background: 'rgba(27, 26, 31, 0.62)' }} />
        </>
      ) : isScarletStudy ? (
        // 「猩红书房」专属深紫渐变（独立主题固定常量）
        <div className="absolute inset-0 bg-preset" style={{ background: SCARLET_GRADIENT }} />
      ) : null}

      {/* 暗夜专属：星星粉（仅 night 状态 + 其他动画 — 猩红/自定义图不出现） */}
      {showStars && <NightStars />}

      {/* 极淡噪点纹理（增加质感） */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.025]" xmlns="http://www.w3.org/2000/svg">
        <filter id="noise">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" />
        </filter>
        <rect width="100%" height="100%" filter="url(#noise)" />
      </svg>
    </div>
  );
}
