import { useRef, useState } from 'react';
import { User, Image as ImageIcon } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { putFile, deleteFile } from '@/lib/db';
import { uid, compressImage } from '@/lib/utils';
import { setThemeMode, readThemeMode, resolveTheme, type ThemeMode } from '@/lib/theme';

const THEME_OPTIONS: { key: ThemeMode; label: string; hint: string }[] = [
  { key: 'system', label: '跟随系统', hint: '随系统颜色自动切换' },
  { key: 'day', label: '日间', hint: '白昼书房 · 晨光米面' },
  { key: 'night', label: '夜间', hint: '暗夜书房 · 暖炭墨色' },
];

// 主题皮肤预览色：用真实主题色（页面底 + 卡面），色块区纯色展示，
// 与下方文字区分离——文字永远落在当前主题实色卡面上，不叠色块
const PREVIEW_COLORS: Record<'day' | 'night' | 'scarlet', { bg: string; card: string }> = {
  day:  { bg: '#fdf2e1', card: '#fdebeb' },   // 真实页面底 / 真实卡面
  night: { bg: '#171A1B', card: '#32302B' },
  scarlet: { bg: '#17121A', card: '#312B2F' }, // 猩红书房独立主题的底色 / 紫调卡面
};

/** 主题预览卡：上部色块区（页面底 | 卡面）+ 下部文字区（当前主题实色底，永不叠色块） */
function ThemePreviewCard({
  label,
  hint,
  active,
  onClick,
  swatches,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  /** 色块区内容（任意 JSX，如 双色 / 四色 / 渐变） */
  swatches: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`theme-toggle text-left rounded-card overflow-hidden border-2 transition-all ${
        active ? 'scale-[0.97]' : 'border-bronze/15'
      }`}
    >
      {/* 色块预览区：固定在顶部，纯色展示主题层次 */}
      <div className="h-12 flex overflow-hidden">{swatches}</div>
      {/* 文字区：当前主题实色卡面底 + 主题文字色，保证任何主题下都清晰可读 */}
      <div className="px-2.5 py-1.5 border-t border-bronze/10" style={{ background: 'var(--card-bg)' }}>
        <div
          className="font-mono text-[10px] tracking-wider uppercase font-semibold leading-tight"
          style={{ color: 'var(--paper)' }}
        >
          {label}
        </div>
        <div className="settings-hint text-[9px] leading-tight mt-0.5">
          {hint}
        </div>
      </div>
    </button>
  );
}

export function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const showToast = useUIStore((s) => s.showToast);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name);
  const [signature, setSignature] = useState(profile.signature);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readThemeMode());

  // 猩红书房：独立外观主题（scarlet）；兼容旧数据（夜间 × 深紫预设 × 无自定义图）
  const isScarletStudy =
    themeMode === 'scarlet' ||
    (resolveTheme(themeMode) === 'night' &&
      !profile.backgroundFileId &&
      profile.backgroundPreset === 'deep');

  const handleTheme = (mode: ThemeMode) => {
    setThemeMode(mode);
    setThemeModeState(mode);
    // 退出「猩红书房」：旧数据的深紫预设一并清掉，回到按主题实色方案
    if (profile.backgroundPreset === 'deep') {
      updateProfile({ backgroundPreset: 'none' });
    }
    const label = THEME_OPTIONS.find((o) => o.key === mode)?.label ?? '';
    showToast(`已切换：${label}`, 'success');
  };

  const applyScarletStudy = () => {
    // 猩红书房是独立主题：不再依赖「夜间 × 深紫预设」组合配方
    setThemeMode('scarlet');
    setThemeModeState('scarlet');
    updateProfile({ backgroundPreset: 'none', backgroundFileId: undefined });
    showToast('已切换：猩红书房 · 特殊书房主题', 'success');
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

        {/* 外观 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-1">外观</h3>
          <p className="font-sans text-bronze-deep text-xs mb-3 flex items-center flex-wrap gap-1.5">
            <span>主题皮肤。当前：</span>
            <span
              className="font-serif font-medium px-2 py-0.5 rounded-pill"
              style={{
                color: 'var(--paper)',
                background: 'rgb(var(--amber-rgb) / 0.18)',
                border: '1px solid rgb(var(--amber-rgb) / 0.4)',
              }}
            >
              {isScarletStudy
                ? '猩红书房'
                : resolveTheme(themeMode) === 'day'
                  ? '白昼书房'
                  : '暗夜书房'}
            </span>
          </p>
          <div className="grid grid-cols-3 gap-2">
            {THEME_OPTIONS.map((opt) => {
              const active = themeMode === opt.key;
              return (
                <ThemePreviewCard
                  key={opt.key}
                  label={opt.label}
                  hint={opt.hint}
                  active={active}
                  onClick={() => handleTheme(opt.key)}
                  swatches={
                    opt.key === 'system' ? (
                      // 跟随系统：左半暗夜书房（bg | card）、右半白昼书房（bg | card）
                      <>
                        <span className="flex-1" style={{ background: PREVIEW_COLORS.night.bg }} />
                        <span
                          className="flex-1"
                          style={{ background: PREVIEW_COLORS.night.card, borderLeft: '1px solid rgba(255,255,255,0.08)' }}
                        />
                        <span
                          className="flex-1"
                          style={{ background: PREVIEW_COLORS.day.bg, borderLeft: '1px solid rgba(87,85,39,0.12)' }}
                        />
                        <span
                          className="flex-1"
                          style={{ background: PREVIEW_COLORS.day.card, borderLeft: '1px solid rgba(87,85,39,0.12)' }}
                        />
                      </>
                    ) : (
                      <>
                        <span className="flex-1" style={{ background: PREVIEW_COLORS[opt.key].bg }} />
                        <span
                          className="flex-1"
                          style={{
                            background: PREVIEW_COLORS[opt.key].card,
                            borderLeft:
                              opt.key === 'day'
                                ? '1px solid rgba(87,85,39,0.12)'
                                : '1px solid rgba(255,255,255,0.08)',
                          }}
                        />
                      </>
                    )
                  }
                />
              );
            })}
          </div>
          {/* 猩红书房：独立外观主题（不限于夜间） */}
          <ThemePreviewCard
            label="猩红书房 · scarlet study"
            hint="特殊书房主题"
            active={isScarletStudy}
            onClick={applyScarletStudy}
            swatches={
              <span
                className="flex-1"
                style={{ background: 'linear-gradient(135deg, #0F0A14 0%, #341915 70%, #6A080E 100%)' }}
              />
            }
          />
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
