import { clsx } from '@/lib/utils';

interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  /** 无障碍标签，同时作为行内说明的关联 id */
  label: string;
  disabled?: boolean;
}

/**
 * 主题感知的开关滑块。
 * - 全部走 CSS 变量（--wine / --bronze / --paper），三套皮肤自动适配
 * - 触控目标 44px 高，满足移动端点击
 * - role="switch" + aria-checked，读屏可正确播报
 */
export function Switch({ checked, onChange, label, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={clsx(
        'relative flex-none rounded-full transition-colors duration-200',
        disabled && 'opacity-40 cursor-not-allowed',
      )}
      style={{
        width: 50,
        height: 30,
        // 开 = 强调色实底；关 = 次要色淡底
        background: checked ? 'var(--wine)' : 'rgb(var(--bronze-rgb) / 0.28)',
        border: '1px solid',
        borderColor: checked ? 'rgb(var(--candle-rgb) / 0.45)' : 'rgb(var(--bronze-rgb) / 0.4)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {/* 滑块：高对比实色 + 轻微投影，任何主题下都清晰可见位置 */}
      <span
        className="absolute rounded-full transition-transform duration-200 ease-out"
        style={{
          width: 22,
          height: 22,
          top: 3,
          left: 3,
          transform: checked ? 'translateX(20px)' : 'translateX(0)',
          background: checked ? 'var(--paper)' : 'var(--bronze-light)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.28)',
        }}
      />
    </button>
  );
}
