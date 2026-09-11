import { useRef, useState } from 'react';
import { User, Image as ImageIcon, Trash2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { putFile, deleteFile } from '@/lib/db';
import { uid, compressImage } from '@/lib/utils';
import { PRESET_BACKGROUNDS, DEFAULT_BACKGROUND_PRESET } from '@/lib/backgrounds';

export function SettingsPage() {
  const profile = useAppStore((s) => s.profile);
  const updateProfile = useAppStore((s) => s.updateProfile);
  const showToast = useUIStore((s) => s.showToast);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name);
  const [signature, setSignature] = useState(profile.signature);

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

  const handleBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const compressed = await compressImage(f, 1600, 0.8);
    const id = uid('bg_');
    if (profile.backgroundFileId) await deleteFile(profile.backgroundFileId);
    await putFile({ id, blob: compressed, mime: compressed.type, name: f.name, size: compressed.size });
    updateProfile({ backgroundFileId: id, backgroundPreset: undefined });
    showToast('背景已更新', 'success');
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
            <h3 className="font-serif text-moon text-lg">头像</h3>
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
          <h3 className="font-serif text-moon text-lg mb-4">个人信息</h3>
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
          <h3 className="font-serif text-moon text-lg mb-1">背景</h3>
          <p className="font-sans text-bronze text-xs mb-4">桌面与个人主页的背景</p>
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
            <button onClick={() => bgInputRef.current?.click()} className="btn-ghost">
              <ImageIcon size={13} strokeWidth={1.5} /> 上传自定义
            </button>
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
            <input ref={bgInputRef} type="file" accept="image/*" hidden onChange={handleBackground} />
          </div>
        </Card>

        {/* 关于 */}
        <Card className="p-5 sm:p-6 text-center">
          <p className="font-serif text-moon text-lg tracking-widest">VidaOS</p>
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
