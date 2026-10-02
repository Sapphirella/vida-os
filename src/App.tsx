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
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { ImageLightbox } from '@/components/common/ImageLightbox';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

import { DeskPage } from '@/pages/DeskPage';
import { NotesPage } from '@/pages/NotesPage';
import { DataPage } from '@/pages/DataPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { SpacePage } from '@/pages/SpacePage';
import { MomentsPage } from '@/pages/MomentsPage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { ArticleReaderPage } from '@/pages/ArticleReaderPage';
import { CollectionPage } from '@/pages/CollectionPage';
import { AgentPage } from '@/pages/AgentPage';
import { LibraryPage } from '@/pages/LibraryPage';
import { AlbumPage } from '@/pages/album/AlbumPage';
import { AlbumDetailPage } from '@/pages/album/AlbumDetailPage';
import { ReaderPage } from '@/pages/ReaderPage';

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
    <div className="relative app-shell flex flex-col overflow-hidden">
      <Background />
      <TopBar />

      <main className="flex-1 min-h-0 flex flex-col pt-[calc(56px+env(safe-area-inset-top))]">
        {/* 布局链说明（改这两行前请先读 PROJECT_MEMORY 第 4 节之 20) 与第 12 节教训 17）：
            这一层必须同时满足两个互相拉扯的需求，实测数据见第 12 节教训 17。
            1) flex-1 min-h-0：给它一个「确定高度」。碎片页与 Agent 会话页依赖
               「flex-1 + min-h-0 + overflow-y-auto」把消息流做成内部滚动、输入框贴底；
               高度变成由内容决定（auto）时 flex-grow 无剩余空间可分，消息流高度=内容高度、
               永远不成为滚动容器，输入框就会退到列表末尾浮在屏幕中间（实测过）。
            2) 滚动与「避让底栏」的 padding 都放在这一层：内容页是长内容，若把滚动交给
               main，子元素高度确定时 main 的 padding-bottom 不会被计入滚动范围
               （1863 变 1783，正好少 80px），滚到底时最后一个元素会压在固定定位的
               BottomTabBar 下面 —— 实测「清空所有数据」按钮被遮 12px。
               底上那个 vd-content-pad：软键盘弹出时由 CSS 收回这 80px，
               否则输入框会离键盘 80px（见 globals.css 软键盘适配段）。 */}
        <div className="vd-content-pad flex-1 min-h-0 flex flex-col overflow-y-auto pb-[calc(80px+env(safe-area-inset-bottom))]">
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
            <Route path="/library" element={<LibraryPage />} />
            <Route path="/library/book/:id" element={<ReaderPage />} />
            <Route path="/library/album" element={<AlbumPage />} />
            <Route path="/library/album/:id" element={<AlbumDetailPage />} />
            <Route path="/agent" element={<AgentPage />} />
            <Route path="/favorites" element={<FavoritesPage />} />
          </Routes>
        </ErrorBoundary>
      </div>
    </main>

      <BottomTabBar />
      <EditorOverlay />
      {/* 全局查找替换：全屏覆盖层，桌面/移动两端经 TopBar 搜索按钮或 ⌘K 打开 */}
      <GlobalFindReplaceCard />
      <ImageLightbox />
      <Toast />
      <Modal />
      <ConfirmDialog />
    </div>
  );
}

export default App;
