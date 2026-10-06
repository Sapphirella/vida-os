// 「存原图」开关（v4.7.8）
//
// 放在每个上传图片的地方旁边（文章/动态编辑器、灵感、相册）。
// 状态存在 `settings.keepOriginalImages` 里 —— 是「用户的偏好」，不是一次性选择，
// 所以会记住上次的选择（也跟备份一起走）。
//
// 语义（要说清楚，否则用户会以为开了之后列表会变慢）：
//   开 → 额外存一份原始分辨率；**记录里仍然引用轻量预览图**，所以正文/列表/网格不会变卡，
//        只有点开大图（灯箱）、保存图片、导出备份时才用原图。
import { Maximize2 } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';
import { clsx } from '@/lib/utils';

export function KeepOriginalToggle({ className }: { className?: string }) {
  const on = useAppStore((s) => s.settings.keepOriginalImages ?? false);
  const updateSettings = useAppStore((s) => s.updateSettings);

  return (
    <button
      type="button"
      onClick={() => updateSettings({ keepOriginalImages: !on })}
      aria-pressed={on}
      aria-label="上传时保存原图"
      title={
        on
          ? '原图：开启中 —— 上传的图片会额外保存一份原始分辨率（更清楚，也更占空间）。列表和正文仍用轻量预览图，不会变卡。'
          : '原图：关闭 —— 图片会压到长边 2560（够满屏放大看）。需要原始分辨率时点一下开启。'
      }
      className={clsx(
        'flex items-center gap-1 font-mono text-[10px] tracking-wider transition-colors',
        on ? 'text-amber' : 'text-bronze-deep hover:text-bronze',
        className,
      )}
    >
      <Maximize2 size={11} strokeWidth={1.8} />
      存原图{on ? ' · 开' : ''}
    </button>
  );
}
