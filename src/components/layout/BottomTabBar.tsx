import { useNavigate, useLocation } from 'react-router-dom';
import { Home, NotebookPen, Bot, Database, Settings as SettingsIcon } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { clsx } from '@/lib/utils';
import type { TabKey } from '@/types';

const TABS: { key: TabKey; label: string; icon: typeof Home; path: string }[] = [
  { key: 'desk', label: '主页', icon: Home, path: '/desk' },
  { key: 'diary', label: '碎片', icon: NotebookPen, path: '/diary' },
  { key: 'agent', label: 'Agent', icon: Bot, path: '/agent' },
  { key: 'data', label: '数据', icon: Database, path: '/data' },
  { key: 'settings', label: '设置', icon: SettingsIcon, path: '/settings' },
];

export function BottomTabBar() {
  const setTab = useUIStore((s) => s.setTab);
  const commentInputFocused = useUIStore((s) => s.commentInputFocused);
  const navigate = useNavigate();
  const location = useLocation();

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
        {TABS.map(({ key, label, icon: Icon, path }) => {
          const active =
            location.pathname.startsWith(path) ||
            (path === '/desk' &&
              (location.pathname === '/' || location.pathname.startsWith('/notes')));
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
