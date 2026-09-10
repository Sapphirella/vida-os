import { useEffect } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { TopBar } from '@/components/layout/TopBar';
import { BottomTabBar } from '@/components/layout/BottomTabBar';
import { Background } from '@/components/layout/Background';
import { EditorOverlay } from '@/components/editor/EditorOverlay';
import { Toast } from '@/components/common/Toast';
import { Modal } from '@/components/common/Modal';

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
  const hydrated = useAppStore((s) => s.version === 3 && s.articles !== undefined);
  const currentTab = useUIStore((s) => s.currentTab);
  const setTab = useUIStore((s) => s.setTab);
  const setLastTab = useAppStore((s) => s.setLastTab);
  const lastTab = useAppStore((s) => s.settings.lastTab);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (hydrated && lastTab && lastTab !== currentTab) {
      setTab(lastTab);
    }
  }, [hydrated, lastTab, currentTab, setTab]);

  useEffect(() => {
    setLastTab(currentTab);
  }, [currentTab, setLastTab]);

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
      </main>

      <BottomTabBar />
      <EditorOverlay />
      <Toast />
      <Modal />
    </div>
  );
}

export default App;
