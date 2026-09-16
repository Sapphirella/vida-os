import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Search, Settings as SettingsIcon } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';

const ROUTE_TITLES: Record<string, { title: string; sub?: string }> = {
  '/desk': { title: 'VidaOS', sub: 'A quiet place for your days' },
  '/notes': { title: '便签', sub: '灵感 · 日程 · 待办' },
  '/data': { title: '数据', sub: '导入 · 导出 · 备份' },
  '/settings': { title: '设置', sub: '个人主页 · 主题' },
  '/space': { title: '空间', sub: '长文与合集' },
  '/moments': { title: '动态', sub: '生活碎碎念' },
  '/diary': { title: '日记', sub: 'Daily · Journal' },
  '/agent': { title: 'Agent', sub: 'AI · Assistant' },
  '/favorites': { title: '收藏夹', sub: '喜欢的一切' },
};

function matchTitle(pathname: string): { title: string; sub?: string; canBack: boolean } {
  if (pathname.startsWith('/space/collection/')) {
    return { title: '合集', sub: 'Space · Collection', canBack: true };
  }
  if (pathname.startsWith('/space/article/')) {
    return { title: '文章', sub: 'Space · Article', canBack: true };
  }
  if (ROUTE_TITLES[pathname]) {
    return { ...ROUTE_TITLES[pathname], canBack: false };
  }
  return { title: 'VidaOS', canBack: false };
}

export function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const setTab = useUIStore((s) => s.setTab);
  const setFindPanelOpen = useUIStore((s) => s.setFindPanelOpen);
  const { title, sub, canBack } = matchTitle(location.pathname);

  // ⌘K / Ctrl+K：全局打开查找替换
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setFindPanelOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setFindPanelOpen]);

  return (
    <header
      className="fixed top-0 left-0 right-0 z-40 safe-top"
      style={{
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        background: 'var(--bar-bg)',
        willChange: 'backdrop-filter',
        borderBottom: '1px solid rgba(148, 125, 117, 0.08)',
      }}
    >
      <div className="max-w-5xl mx-auto h-14 px-4 flex items-center gap-3">
        {canBack ? (
          <button
            onClick={() => navigate(-1)}
            className="w-9 h-9 -ml-1 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="返回"
          >
            <ChevronLeft size={22} strokeWidth={1.5} />
          </button>
        ) : (
          <div className="w-9 h-9 -ml-1 flex items-center justify-center">
            <div
              className="w-2 h-2 rounded-full"
              style={{
                background: 'var(--candle)',
                boxShadow: '0 0 12px var(--candle)',
              }}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-title text-headline tracking-tight leading-none">
            {title}
          </h1>
          {sub && (
            <p className="font-mono text-[10px] tracking-widest text-bronze-deep mt-1 uppercase">
              {sub}
            </p>
          )}
        </div>

        {/* 全局查找替换入口（桌面 / 移动端均可见） */}
        <button
          onClick={() => setFindPanelOpen(true)}
          className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
          aria-label="全局查找替换"
          title="全局查找替换 (⌘K)"
        >
          <Search size={18} strokeWidth={1.5} />
        </button>

        {!canBack && location.pathname !== '/settings' && (
          <button
            onClick={() => {
              setTab('settings');
              navigate('/settings');
            }}
            className="w-9 h-9 flex items-center justify-center text-bronze hover:text-candle transition-colors"
            aria-label="设置"
          >
            <SettingsIcon size={18} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </header>
  );
}
