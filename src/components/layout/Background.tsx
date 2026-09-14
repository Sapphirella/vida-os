// 全局背景层（实色方案 2026-09-14）：
//   - 自定义图：原逻辑保留（蒙版 / 不蒙版）
//   - 预设：仅「猩红书房」（夜间 + 深紫预设 + 无自定义图）才显示深紫渐变
//   - 普通日间 / 夜间：完全不渲染背景渐变，页面直接是 --bg-base 实色
//   - 装饰层：仅保留极淡噪点纹理（实色微透装饰块已按反馈移除，避免浅色遮罩）
import { useEffect, useState } from 'react';
import { useAppStore } from '@/stores/useAppStore';
import { fileURL } from '@/lib/fileUrl';
import { getBackgroundPreset } from '@/lib/backgrounds';
import { resolveTheme, readThemeMode, type ResolvedTheme } from '@/lib/theme';

export function Background() {
  const backgroundFileId = useAppStore((s) => s.profile.backgroundFileId);
  const backgroundPreset = useAppStore((s) => s.profile.backgroundPreset);
  const [customUrl, setCustomUrl] = useState<string | null>(null);

  // 主题跟随：当前解析后的主题（day / night），用于判断是否猩红书房
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

  const preset = getBackgroundPreset(backgroundPreset);
  const hasCustomImage = Boolean(backgroundFileId && customUrl);

  // 「猩红书房」= 夜间 + 深紫预设 + 无自定义图；这是唯一保留渐变的场景
  const isScarletStudy =
    theme === 'night' && !hasCustomImage && backgroundPreset === 'deep';

  // 顶栏/底栏跟着背景预设走：仅当猩红书房时用深紫栏色；
  // 其余情况（日间/夜间实色）由 globals.css 的 --bar-bg（按主题）兜底
  useEffect(() => {
    if (isScarletStudy && preset.bar) {
      document.documentElement.style.setProperty('--bar-bg', preset.bar);
    } else {
      document.documentElement.style.removeProperty('--bar-bg');
    }
    return () => {
      document.documentElement.style.removeProperty('--bar-bg');
    };
  }, [preset.bar, isScarletStudy]);

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
        // 「猩红书房」专属深紫渐变（保留，珍藏配方）
        <div className="absolute inset-0 bg-preset" style={{ background: preset.gradient }} />
      ) : null}

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
