import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, StickyNote, Bot, Database, Settings as SettingsIcon } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { useAppStore } from '@/stores/useAppStore';
import { clsx } from '@/lib/utils';
import type { TabKey } from '@/types';

const TABS: { key: TabKey; label: string; icon: typeof Home; path: string }[] = [
  { key: 'desk', label: '主页', icon: Home, path: '/desk' },
  // v4.4：碎片流移除，便签上位到这一格
  { key: 'notes', label: '便签', icon: StickyNote, path: '/notes' },
  { key: 'agent', label: 'Agent', icon: Bot, path: '/agent' },
  { key: 'data', label: '数据', icon: Database, path: '/data' },
  { key: 'settings', label: '设置', icon: SettingsIcon, path: '/settings' },
];

export function BottomTabBar() {
  const setTab = useUIStore((s) => s.setTab);
  const currentTab = useUIStore((s) => s.currentTab);
  const commentInputFocused = useUIStore((s) => s.commentInputFocused);
  // v4.5.3：Agent 开关。关闭时底栏从 5 格变 4 格 —— flex-1 让每格自动等分，
  // 不需要任何额外的间距计算。
  const agentEnabled = useAppStore((s) => s.settings.agentEnabled !== false);
  const navigate = useNavigate();
  const location = useLocation();

  const visibleTabs = agentEnabled ? TABS : TABS.filter((t) => t.key !== 'agent');

  // 兜底：开关关掉的瞬间如果正停在 Agent 页，把用户送回主页
  // （设置页关开关时 currentTab 还是 agent，否则会停在一个没有底栏入口的页面）
  useEffect(() => {
    if (!agentEnabled && currentTab === 'agent') setTab('desk');
  }, [agentEnabled, currentTab, setTab]);

  return (
    <nav
      aria-hidden={commentInputFocused}
      className={`fixed bottom-0 left-0 right-0 z-40 safe-bottom transition-transform duration-300 ease-out ${
        commentInputFocused ? 'translate-y-full' : 'translate-y-0'
      }`}
      style={{
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        background: 'var(--bar-bg)',
        willChange: 'backdrop-filter',
        borderTop: '1px solid rgba(148, 125, 117, 0.08)',
      }}
    >
      <div className="max-w-5xl mx-auto h-[56px] px-2 flex items-stretch">
        {visibleTabs.map(({ key, label, icon: Icon, path }) => {
          const active =
            // v4.4：便签上位到底栏后，/notes 归「便签」这一格，主页只认 /desk 与根路径
            location.pathname.startsWith(path) ||
            (path === '/desk' && location.pathname === '/');
          return (
            <button
              key={key}
              onClick={() => {
                setTab(key);
                navigate(path);
              }}
              className={clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 transition-all duration-200 group',
                active ? 'text-candle' : 'text-bronze hover:text-paper',
              )}
            >
              <div className="relative">
                <Icon
                  size={20}
                  strokeWidth={active ? 1.8 : 1.4}
                  className="transition-transform duration-200 group-active:scale-90"
                />
                {active && (
                  <div
                    className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                    style={{
                      background: 'var(--candle)',
                      boxShadow: '0 0 6px var(--candle)',
                    }}
                  />
                )}
              </div>
              <span
                className={clsx(
                  'font-sans transition-all',
                  active ? 'text-[10px] font-medium' : 'text-[10px] font-normal',
                )}
                style={{ letterSpacing: '0.04em' }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
