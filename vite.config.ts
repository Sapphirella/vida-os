import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import legacy from '@vitejs/plugin-legacy';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'node:path';

export default defineConfig({
  plugins: [
    react(),
    // 旧内核兼容（夸克旧版 U4 / 低版本 Chromium 等不支持 ES2020 语法导致白屏）：
    // 现代浏览器走原生 module，旧内核自动加载 ES5 legacy bundle + core-js polyfill
    legacy({
      targets: ['Chrome >= 60', 'Android >= 6', 'Safari >= 10', 'iOS >= 10'],
      modernPolyfills: true,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'VidaOS',
        short_name: 'VidaOS',
        description: '你的私密生活记录空间',
        theme_color: '#1B1A1F',
        background_color: '#1B1A1F',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webp,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  // dev serve 也将 TS/JSX 转译到 es2018：夸克等旧内核不支持 ES2020 语法（可选链/空值合并等）
  // 会导致模块加载失败白屏；build 产物另有 legacy 插件兜底，此处覆盖 dev 预览场景
  esbuild: {
    target: 'es2018',
  },
  server: {
    host: true,
    port: 5173,
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom'],
          'pdf-vendor': ['jspdf', 'html2canvas'],
        },
      },
    },
  },
});
