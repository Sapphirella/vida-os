import { useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { TopBar } from '@/components/layout/TopBar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Background } from '@/components/layout/Background';
import { EditorOverlay } from '@/components/editor/EditorOverlay';
import { GlobalFindReplaceCard } from '@/components/search/GlobalFindReplaceCard';
import { Toast } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { DeskPage } from '@/pages/DeskPage';
import { NotesPage } from '@/pages/NotesPage';
import { DataPage } from '@/pages/DataPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SpacePage } from '@/pages/SpacePage';
import { MomentsPage } from '@/pages/MomentsPage';
import { MailboxPage } from '@/pages/MailboxPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { ArticleReaderPage } from '@/pages/ArticleReaderPage';
import { LetterReaderPage } from '@/pages/LetterReaderPage';
import { CollectionPage } from '@/pages/CollectionPage';

function App() {
  const hydrate = useAppStore((s) => s.hydrate);
  const hydrated = useAppStore((s) => s.hydrated);
  const currentTab = useUIStore((s) => s.currentTab);
  const setTab = useUIStore((s) => s.setTab);
  const setLastTab = useAppStore((s) => s.setLastTab);
  const lastTab = useAppStore((s) => s.settings.lastTab);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // 「恢复上次 tab」只能在启动后执行一次。
  // 若不加这个一次性守卫，它会与下面「把 currentTab 写回 lastTab」的 effect 互相打架：
  // currentTab → lastTab → currentTab … 无限 ping-pong，React 抛
  // "Maximum update depth exceeded" 并卸载整棵树（表现为点 tab 直接白屏）。
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!hydrated || restoredRef.current) return;
    restoredRef.current = true;
    if (lastTab && lastTab !== currentTab) {
      setTab(lastTab);
    }
  }, [hydrated, lastTab, currentTab, setTab]);

  // 单向同步：currentTab → settings.lastTab
  // 必须等 hydrated 之后再写，否则会用初始的 'desk' 覆盖掉刚读出来的持久化值
  useEffect(() => {
    if (!hydrated) return;
    setLastTab(currentTab);
  }, [hydrated, currentTab, setLastTab]);

  // 同步 tab 变化到路由
  useEffect(() => {
    if (location.pathname === '/') {
      navigate(`/${currentTab}`, { replace: true });
    }
  }, [currentTab, location.pathname, navigate]);

  if (!hydrated) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="text-bronze font-mono text-sm tracking-widest animate-pulse">
          VIDAOS
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col">
      <Background />
      <TopBar />

      <main className="flex-1 pt-[calc(56px+env(safe-area-inset-top))] pb-[calc(72px+env(safe-area-inset-bottom))]">
        {/* 页面级边界：单个页面崩溃时顶栏与底部 Tab 仍然可用，可以切走；
            resetKey 传路由，切换 tab 后自动复位 */}
        <ErrorBoundary variant="inline" resetKey={location.pathname}>
          <Routes>
            <Route path="/" element={<DeskPage />} />
            <Route path="/desk" element={<DeskPage />} />
            <Route path="/notes" element={<NotesPage />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/space" element={<SpacePage />} />
            <Route path="/space/collection/:id" element={<CollectionPage />} />
            <Route path="/space/article/:id" element={<ArticleReaderPage />} />
            <Route path="/moments" element={<MomentsPage />} />
            <Route path="/mailbox" element={<MailboxPage />} />
            <Route path="/mailbox/letter/:id" element={<LetterReaderPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
        </ErrorBoundary>
      </main>

      <BottomTabBar />
      <EditorOverlay />
      {/* 全局查找替换：全屏覆盖层，桌面/移动两端经 TopBar 搜索按钮或 ⌘K 打开 */}
      <GlobalFindReplaceCard />
      <Toast />
      <Modal />
    </div>
  );
}

export default App;
