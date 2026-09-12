/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // VidaOS 色板：值全部引用 CSS 变量（rgb 三元组），
        // 由 globals.css 的 :root（暗夜书房）与 [data-theme='day']（白昼书房）驱动。
        // 这样所有 tailwind 色类（含 bg-x/20 这类 alpha 语法）都能跟随主题切换。
        ink: 'rgb(var(--ink-rgb) / <alpha-value>)',           // 深墨：压暗层 / 编辑器工具条
        charcoal: 'rgb(var(--charcoal-rgb) / <alpha-value>)', // 上层卡：层级
        wood: 'rgb(var(--wood-rgb) / <alpha-value>)',         // 副背景 - 暗咖啡 / 沙米
        wine: {
          DEFAULT: 'rgb(var(--wine-rgb) / <alpha-value>)',    // 强调 - 酒红（两版通用）
          light: 'rgb(var(--wine-light-rgb) / <alpha-value>)',
          deep: 'rgb(var(--wine-deep-rgb) / <alpha-value>)',
          bright: 'rgb(var(--wine-bright-rgb) / <alpha-value>)',
        },
        bronze: {
          DEFAULT: 'rgb(var(--bronze-rgb) / <alpha-value>)',  // 次要 - 古铜 / 暖灰褐
          light: 'rgb(var(--bronze-light-rgb) / <alpha-value>)',
          deep: 'rgb(var(--bronze-deep-rgb) / <alpha-value>)',
        },
        paper: {
          DEFAULT: 'rgb(var(--paper-rgb) / <alpha-value>)',   // 主要文字 - 旧纸 / 墨褐
          dim: 'rgb(var(--paper-dim-rgb) / <alpha-value>)',
        },
        candle: 'rgb(var(--candle-rgb) / <alpha-value>)',     // 高光 - 烛光 / 日间琥珀金
        moon: 'rgb(var(--moon-rgb) / <alpha-value>)',         // 强调底上的亮字 - 月光 / 奶油
        headline: 'rgb(var(--headline-rgb) / <alpha-value>)', // 标题 - 月光 / 墨褐
        parchment: 'rgb(var(--parchment-rgb) / <alpha-value>)', // 引文 / 代码底色
        amber: 'rgb(var(--amber-rgb) / <alpha-value>)',       // 陈年琥珀 - 高亮 / 星标 / 选中
        ash: 'rgb(var(--ash-rgb) / <alpha-value>)',           // 灰雾 - 禁用 / 元信息
        olive: 'rgb(var(--olive-rgb) / <alpha-value>)',       // 成功 / 已完成
        sapphire: 'rgb(var(--sapphire-rgb) / <alpha-value>)', // 信息 / 链接
        line: 'rgb(var(--line-rgb) / <alpha-value>)',         // 描边 / 分隔线

        // 透明度版本（基于各自基色，跟随主题）
        'ink-soft': 'rgb(var(--ink-rgb) / 0.75)',
        'wood-soft': 'rgb(var(--wood-rgb) / 0.55)',
        'card': 'rgb(var(--charcoal-rgb) / 0.72)',
        'card-elevated': 'rgb(var(--elevated-rgb) / 0.82)',
        'border-wine': 'rgb(var(--wine-rgb) / 0.22)',
        'border-bronze': 'rgb(var(--bronze-rgb) / 0.16)',
        'border-line': 'rgb(var(--line-rgb) / 0.55)',
        'border-glow': 'rgb(var(--candle-rgb) / 0.1)',
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
        serif: ['"EB Garamond"', '"Lora"', 'Georgia', 'serif'],
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
        // 完整阴影串由 globals.css 变量提供，夜间 / 日间各有柔和的取值
        'card': 'var(--shadow-card)',
        'card-elevated': 'var(--shadow-card-elevated)',
        'wine-glow': 'var(--shadow-wine-glow)',
        'candle-glow': 'var(--shadow-candle-glow)',
        'inner-glow': 'var(--shadow-inner-glow)',
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