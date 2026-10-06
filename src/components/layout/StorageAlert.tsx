// 启动/保存异常横幅（v4.7.12）
//
// 为什么必须做成常驻横幅，而不是一条 toast：
//   - `hydrateError` 表示**没能读到本地数据**。此时界面显示的是内存里的默认状态，
//     而写回被刻意禁用了（见 useAppStore 的 persist 守卫）—— 也就是说**用户此刻的任何编辑都不会保存**，
//     而且看起来一切正常。这种事必须在屏幕上一直写着，直到用户处理掉。
//   - `saveError` 表示最近一次写盘失败（配额满 / 隐私模式 / 数据库被锁），同样不能只在控制台里。
import { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAppStore } from '@/stores/useAppStore';

export function StorageAlert() {
  const hydrateError = useAppStore((s) => s.hydrateError);
  const saveError = useAppStore((s) => s.saveError);
  const [hideSave, setHideSave] = useState(false);
  const [retrying, setRetrying] = useState(false);

  if (hydrateError) {
    const retry = async () => {
      setRetrying(true);
      try {
        // 重新走一次启动读取；成功后 hydrateError 会被清掉，写回也随之恢复
        await useAppStore.getState().hydrate();
      } finally {
        setRetrying(false);
      }
    };
    const stillFailing = useAppStore.getState().hydrateError;
    return (
      <div
        role="alert"
        className="fixed left-0 right-0 z-[60] px-3 pt-2"
        style={{ top: 'calc(56px + env(safe-area-inset-top))' }}
      >
        <div className="max-w-5xl mx-auto rounded-card px-3 py-2.5 flex items-start gap-2.5 text-[12px] leading-relaxed"
          style={{ background: 'rgba(106, 8, 14, 0.92)', color: '#F7E4ED', border: '1px solid rgba(255,190,210,0.35)' }}>
          <AlertTriangle size={15} strokeWidth={1.8} className="flex-none mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-semibold">没有读到本机的数据，已进入保护模式</p>
            <p className="mt-0.5 opacity-90">
              {hydrateError}
              <br />
              你的数据仍然在浏览器数据库里，<b>没有被删除</b>；但为了不覆盖它，
              <b>本次打开期间的任何修改都不会被保存</b>。请先不要在这里继续编辑，
              可以点「重试」，或用数据页导入一份备份。
            </p>
          </div>
          <button
            onClick={() => void retry()}
            disabled={retrying}
            className="flex-none flex items-center gap-1 px-2 py-1 rounded-pill font-mono text-[10px] tracking-wider disabled:opacity-50"
            style={{ background: 'rgba(255,255,255,0.16)' }}
          >
            <RefreshCw size={11} strokeWidth={2} className={retrying ? 'animate-spin' : ''} />
            {retrying ? '重试中' : stillFailing ? '重试' : '已恢复'}
          </button>
        </div>
      </div>
    );
  }

  if (saveError && !hideSave) {
    return (
      <div
        role="alert"
        className="fixed left-0 right-0 z-[60] px-3 pt-2"
        style={{ top: 'calc(56px + env(safe-area-inset-top))' }}
      >
        <div className="max-w-5xl mx-auto rounded-card px-3 py-2 flex items-start gap-2.5 text-[12px]"
          style={{ background: 'rgba(106, 8, 14, 0.9)', color: '#F7E4ED', border: '1px solid rgba(255,190,210,0.3)' }}>
          <AlertTriangle size={14} strokeWidth={1.8} className="flex-none mt-0.5" />
          <span className="flex-1 min-w-0">
            {saveError} —— 最近的修改可能没有写入本机（存储空间不足？隐私模式？）。
            建议先导出备份，再清理一些空间。
          </span>
          <button onClick={() => setHideSave(true)} aria-label="关闭提示" className="flex-none opacity-80">
            <X size={13} strokeWidth={2} />
          </button>
        </div>
      </div>
    );
  }
  return null;
}
