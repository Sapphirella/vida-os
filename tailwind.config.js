/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // VidaOS 暗夜书房色板
        ink: '#1B1A1F',        // 主背景 - 深夜紫黑
        wood: '#341915',       // 副背景 - 暗咖啡
        wine: {
          DEFAULT: '#6A080E',  // 强调 - 暗酒红
          light: '#8B1A1F',    // hover/active
          deep: '#4A0608',     // pressed
        },
        bronze: {
          DEFAULT: '#947D75',  // 次要 - 古铜
          light: '#A89289',    // hover
          deep: '#7A675F',     // active
        },
        paper: {
          DEFAULT: '#BCAEAA',  // 主要文字 - 旧纸
          dim: '#9A8E89',      // 较暗
        },
        candle: '#E8C39E',     // 高光 - 烛光
        moon: '#F2EBE0',       // 标题 - 月光

        // 透明度版本
        'ink-soft': 'rgba(27, 26, 31, 0.75)',
        'wood-soft': 'rgba(52, 25, 21, 0.55)',
        'card': 'rgba(38, 32, 30, 0.62)',
        'card-elevated': 'rgba(45, 38, 35, 0.78)',
        'border-wine': 'rgba(106, 8, 14, 0.18)',
        'border-bronze': 'rgba(148, 125, 117, 0.14)',
        'border-glow': 'rgba(232, 195, 158, 0.08)',
      },
      fontFamily: {
        // 数字/UI - 打字机风格
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        // 正文/标题 - 衬线
        serif: ['"EB Garamond"', '"Lora"', 'Georgia', 'serif'],
        // UI 元素 - 无衬线
        sans: ['"Inter"', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      fontSize: {
        'display': ['clamp(4rem, 14vw, 9rem)', { lineHeight: '0.95', letterSpacing: '-0.04em' }],
        'huge': ['clamp(2.5rem, 6vw, 4rem)', { lineHeight: '1.05', letterSpacing: '-0.02em' }],
        'title': ['1.5rem', { lineHeight: '1.3', letterSpacing: '-0.01em' }],
        'body': ['1rem', { lineHeight: '1.85' }],
        'reading': ['1.0625rem', { lineHeight: '1.95' }],
        'caption': ['0.8125rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      borderRadius: {
        'card': '20px',
        'card-lg': '28px',
        'pill': '999px',
      },
      backdropBlur: {
        'xs': '2px',
        'glass': '24px',
      },
      boxShadow: {
        'card': '0 1px 0 0 rgba(232, 195, 158, 0.04) inset, 0 1px 12px 0 rgba(0, 0, 0, 0.4)',
        'card-elevated': '0 1px 0 0 rgba(232, 195, 158, 0.06) inset, 0 8px 32px 0 rgba(0, 0, 0, 0.5)',
        'wine-glow': '0 0 24px 0 rgba(106, 8, 14, 0.18)',
        'candle-glow': '0 0 32px 0 rgba(232, 195, 158, 0.12)',
        'inner-glow': 'inset 0 1px 0 0 rgba(232, 195, 158, 0.06), inset 0 0 0 1px rgba(148, 125, 117, 0.05)',
      },
      animation: {
        'fade-in': 'fade-in 0.4s ease-out',
        'slide-up': 'slide-up 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'pulse-slow': 'pulse-slow 4s ease-in-out infinite',
        'breathe': 'breathe 6s ease-in-out infinite',
      },
      keyframes: {
        'fade-in': {
          'from': { opacity: '0' },
          'to': { opacity: '1' },
        },
        'slide-up': {
          'from': { opacity: '0', transform: 'translateY(12px)' },
          'to': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-slow': {
          '0%, 100%': { opacity: '0.6' },
          '50%': { opacity: '1' },
        },
        'breathe': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.7', transform: 'scale(1.02)' },
        },
      },
    },
  },
  plugins: [],
};
