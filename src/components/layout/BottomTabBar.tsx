import { useNavigate, useLocation } from 'react-router-dom';
import { Home, StickyNote, Database, Settings as SettingsIcon } from 'lucide-react';
import { useUIStore } from '@/stores/useUIStore';
import { clsx } from '@/lib/utils';
import type { TabKey } from '@/types';

const TABS: { key: TabKey; label: string; icon: typeof Home; path: string }[] = [
  { key: 'desk', label: '桌面', icon: Home, path: '/desk' },
  { key: 'notes', label: '便签', icon: StickyNote, path: '/notes' },
  { key: 'data', label: '数据', icon: Database, path: '/data' },
  { key: 'settings', label: '设置', icon: SettingsIcon, path: '/settings' },
];

export function BottomTabBar() {
  const currentTab = useUIStore((s) => s.currentTab);
  const setTab = useUIStore((s) => s.setTab);
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 safe-bottom"
      style={{
        backdropFilter: 'blur(20px) saturate(140%)',
        WebkitBackdropFilter: 'blur(20px) saturate(140%)',
        background: 'rgba(27, 26, 31, 0.7)',
        borderTop: '1px solid rgba(148, 125, 117, 0.08)',
      }}
    >
      <div className="max-w-5xl mx-auto h-[56px] px-2 flex items-stretch">
        {TABS.map(({ key, label, icon: Icon, path }) => {
          const active = location.pathname.startsWith(path) || (path === '/desk' && location.pathname === '/');
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
