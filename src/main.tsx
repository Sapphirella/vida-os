import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HashRouter } from 'react-router-dom';
import App from './App';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import './styles/globals.css';

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
