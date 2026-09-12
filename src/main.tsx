import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { initTheme } from '@/lib/theme';
import './styles/globals.css';

// 主题皮肤：render 前应用持久化偏好（配合 index.html 内联脚本实现无闪烁首屏）
initTheme();

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
