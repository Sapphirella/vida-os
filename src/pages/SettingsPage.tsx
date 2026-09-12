import { useRef, useState } from 'react';
import { User, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { putFile, deleteFile } from '@/lib/db';
import { uid, compressImage } from '@/lib/utils';
import { PRESET_BACKGROUNDS, DEFAULT_BACKGROUND_PRESET, getBackgroundPreset } from '@/lib/backgrounds';
import { setThemeMode, readThemeMode, resolveTheme, type ThemeMode } from '@/lib/theme';

const THEME_OPTIONS: { key: ThemeMode; label: string; hint: string }[] = [
  { key: 'system', label: '跟随系统', hint: '随系统浅色 / 深色自动切换' },
  { key: 'day', label: '日间', hint: '白昼书房 · 温润纸面' },
  { key: 'night', label: '夜间', hint: '暗夜书房 · 深夜紫黑' },
];

export function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const showToast = useUIStore((s) => s.showToast);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const activePreset = getBackgroundPreset(profile.backgroundPreset);
  const [name, setName] = useState(profile.name);
  const [signature, setSignature] = useState(profile.signature);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readThemeMode());

  const handleTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeModeState(mode);
    const label = THEME_OPTIONS.find((o) => o.key === mode)?.label ?? '';
    showToast(`已切换：${label}`, 'success');
  };

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f, 512, 0.85);
    const id = uid('avatar_');
    // 删除旧头像
    if (profile.avatarId) await deleteFile(profile.avatarId);
    await putFile({ id, blob: compressed, mime: compressed.type, name: f.name, size: compressed.size });
    updateProfile({ avatarId: id });
    showToast('头像已更新', 'success');
    e.target.value = '';
  };

  const saveName = () => {
    if (name.trim() && name.trim() !== profile.name) {
      updateProfile({ name: name.trim() });
      showToast('已保存', 'success');
    }
  };

  const saveSignature = () => {
    if (signature !== profile.signature) {
      updateProfile({ signature });
      showToast('已保存', 'success');
    }
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-6 space-y-4">
        {/* 头像 */}
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-2 mb-4">
            <User size={14} strokeWidth={1.4} className="text-bronze" />
            <h3 className="font-serif text-headline text-lg">头像</h3>
          </div>
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full overflow-hidden border border-bronze/20 flex items-center justify-center"
              style={{ background: 'var(--wood)' }}
            >
              {profile.avatarId ? (
                <MediaImage fileId={profile.avatarId} className="w-full h-full object-cover" />
              ) : (
                <User size={28} strokeWidth={1.2} className="text-bronze" />
              )}
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => avatarInputRef.current?.click()} className="btn-ghost">
                <ImageIcon size={13} strokeWidth={1.5} /> 更换头像
              </button>
              {profile.avatarId && (
                <button
                  onClick={async () => {
                    if (profile.avatarId) await deleteFile(profile.avatarId);
                    updateProfile({ avatarId: undefined });
                    showToast('已移除头像', 'success');
                  }}
                  className="btn-text wine"
                >
                  移除头像
                </button>
              )}
            </div>
            <input ref={avatarInputRef} type="file" accept="image/*" hidden onChange={handleAvatar} />
          </div>
        </Card>

        {/* 名字 + 签名 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-4">个人信息</h3>
          <div className="space-y-4">
            <div>
              <label className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase block mb-1.5">
                name
              </label>
              <div className="flex gap-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="flex-1 px-3 py-2 bg-bronze/8 rounded-card text-paper font-serif outline-none focus:bg-bronze/15 transition"
                />
                <button onClick={saveName} className="btn-primary" style={{ padding: '7px 14px' }}>
                  保存
                </button>
              </div>
            </div>
            <div>
              <label className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase block mb-1.5">
                signature · 个性签名
              </label>
              <textarea
                value={signature}
                onChange={(e) => setSignature(e.target.value)}
                rows={3}
                placeholder="在安静的日子里，慢慢写下自己的生活。"
                className="w-full px-3 py-2 bg-bronze/8 rounded-card text-paper font-serif text-sm outline-none focus:bg-bronze/15 transition resize-none"
                style={{ lineHeight: 1.85 }}
              />
              <button onClick={saveSignature} className="btn-primary mt-2" style={{ padding: '6px 14px', fontSize: '0.8125rem' }}>
                保存
              </button>
            </div>
          </div>
        </Card>

        {/* 背景 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-1">背景</h3>
          <p className="font-sans text-bronze text-xs mb-3">
            页面底层的背景。当前：
            <span className="text-amber">
              {profile.backgroundFileId ? '自定义图片' : `「${activePreset.name}」`}
            </span>
          </p>
          <p className="font-sans text-bronze/60 text-[10px] -mt-2 mb-3">
            仅暗夜模式下生效
          </p>
          {/* 大预览：让「换背景」这件事一眼可见（卡片会遮住大部分真实背景） */}
          <div
            className="h-24 rounded-card overflow-hidden border border-line/60 mb-3 relative"
            style={{
              background: profile.backgroundFileId
                ? 'rgba(42,41,46,0.7)'
                : activePreset.gradient,
            }}
          >
            <div
              className="absolute inset-x-0 bottom-0 h-1/2"
              style={{
                background:
                  'radial-gradient(ellipse 80% 90% at 50% 120%, rgba(232,195,158,0.28), transparent 70%)',
              }}
            />
            <span className="absolute top-2 left-3 font-mono text-[10px] tracking-[0.2em] uppercase text-moon/85">
              preview
            </span>
            <span
              className="absolute bottom-2 left-3 font-serif text-sm"
              style={{ color: profile.backgroundFileId ? '#F2EBE0' : '#3A2A1A' }}
            >
              {profile.backgroundFileId
                ? '自定义图片（已设置）'
                : `预览：${activePreset.name}`}
            </span>
          </div>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 mb-3">
            {PRESET_BACKGROUNDS.map((bg) => {
              const active = profile.backgroundPreset === bg.key && !profile.backgroundFileId;
              return (
                <button
                  key={bg.key}
                  onClick={() => {
                    updateProfile({ backgroundPreset: bg.key, backgroundFileId: undefined });
                    showToast('已应用', 'success');
                  }}
                  className={`relative h-16 rounded-card overflow-hidden border-2 transition-all ${
                    active ? 'border-candle scale-95' : 'border-bronze/15 hover:border-bronze/30'
                  }`}
                  style={{ background: bg.gradient }}
                >
                  <span className="absolute inset-0 flex items-end justify-center pb-1.5 text-[10px] font-mono tracking-widest text-moon/80 uppercase">
                    {bg.name}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2">
            {profile.backgroundFileId && (
              <button
                onClick={async () => {
                  if (profile.backgroundFileId) await deleteFile(profile.backgroundFileId);
                  updateProfile({ backgroundFileId: undefined, backgroundPreset: DEFAULT_BACKGROUND_PRESET });
                  showToast('已移除自定义背景', 'success');
                }}
                className="btn-text wine"
              >
                <Trash2 size={11} strokeWidth={1.5} /> 移除
              </button>
            )}
          </div>
        </Card>

        {/* 外观 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-1">外观</h3>
          <p className="font-sans text-bronze text-xs mb-3">
            主题皮肤。当前：
            <span className="text-amber">
              {resolveTheme(themeMode) === 'day' ? '白昼书房' : '暗夜书房'}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => handleTheme(opt.key)}
                  aria-pressed={active}
                  className={`relative h-20 rounded-card overflow-hidden border-2 transition-all ${
                    active ? 'border-candle scale-[0.97]' : 'border-bronze/15 hover:border-bronze/30'
                  }`}
                >
                  {/* 皮肤预览条 */}
                  <span
                    className="absolute inset-x-0 top-0 h-10"
                    style={{
                      background:
                        opt.key === 'day'
                          ? 'linear-gradient(180deg, #FFFCF6, #F4ECDE)'
                          : opt.key === 'night'
                            ? 'linear-gradient(180deg, #1B1A1F, #241920)'
                            : 'linear-gradient(90deg, #1B1A1F 0%, #241920 50%, #FFFCF6 50%, #F4ECDE 100%)',
                    }}
                  />
                  <span className="absolute inset-x-0 top-10 px-2 pt-1.5 pb-1 text-[10px] font-mono tracking-wider uppercase">
                    {opt.label}
                  </span>
                  <span className="absolute inset-x-0 bottom-0 px-2 pb-1 text-[9px] leading-tight text-bronze-deep/80">
                    {opt.hint}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* 关于 */}
        <Card className="p-5 sm:p-6 text-center">
          <p className="font-serif text-headline text-lg tracking-widest">VidaOS</p>
          <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mt-1">
            v3.0 · night study
          </p>
          <p className="font-sans text-bronze text-xs mt-3 leading-relaxed">
            你的私密生活记录空间。
            <br />
            所有数据保存在本地，不上传任何服务器。
          </p>
        </Card>
      </div>
    </div>
  );
}
