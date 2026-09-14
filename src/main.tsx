import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { initTheme } from '@/lib/theme';
// 猩红书房 · 液态玻璃：document 级指针跟踪，驱动卡片 --mx/--my 高光
//（仅 scarlet 主题激活；回退时删除本行与 src/lib/liquidGlass.ts）
import { initLiquidGlass } from '@/lib/liquidGlass';
// 自托管 Web 字体（内嵌 woff2，打包进产物；手机端不再依赖 Google Fonts CDN）
import '@fontsource/eb-garamond/400.css';
import '@fontsource/eb-garamond/400-italic.css';
import '@fontsource/eb-garamond/500.css';
import '@fontsource/eb-garamond/600.css';
import '@fontsource/eb-garamond/700.css';
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/jetbrains-mono/300.css';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/500.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import './styles/globals.css';

// 主题皮肤：render 前应用持久化偏好（配合 index.html 内联脚本实现无闪烁首屏）
initTheme();
// 液态玻璃指针跟踪（猩红主题卡片高光跟随鼠标/触摸）
initLiquidGlass();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* 最外层兜底：即使 App 或路由本身出错也不会白屏 */}
    <ErrorBoundary variant="fullscreen">
      <HashRouter>
        <App />
      </HashRouter>
    </ErrorBoundary>
  </StrictMode>,
);
