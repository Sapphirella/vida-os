import { useRef, useState } from 'react';
import { User, Image as ImageIcon, BookOpen, History, Trash2 } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { MediaImage } from '@/components/common/MediaImage';
import { putFile, deleteFile, db } from '@/lib/db';
import { uid, compressImage, humanBytes } from '@/lib/utils';
import { collectFileIds } from '@/lib/exportImport';
import { setThemeMode, readThemeMode, resolveTheme, type ThemeMode } from '@/lib/theme';

const THEME_OPTIONS: { key: ThemeMode; label: string; hint: string }[] = [
  { key: 'system', label: '跟随系统', hint: '随系统颜色自动切换' },
  { key: 'day', label: '日间', hint: '白昼书房 · 晨光米面' },
  { key: 'night', label: '夜间', hint: '暗夜书房 · 暖炭墨色' },
];

// 主题皮肤预览色：用真实主题色（页面底 + 卡面），色块区纯色展示，
// 与下方文字区分离——文字永远落在当前主题实色卡面上，不叠色块
const PREVIEW_COLORS: Record<'day' | 'night' | 'scarlet', { bg: string; card: string }> = {
  day:  { bg: '#fdf2e1', card: '#fce8dd' },   // 真实页面底 / 真实卡面
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
  const showModal = useUIStore((s) => s.showModal);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(profile.name);
  const [signature, setSignature] = useState(profile.signature);
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() => readThemeMode());

  // ── 关于 · 使用说明（初稿，后续会大改） ──
  const openGuide = () => {
    showModal({
      title: '使用说明',
      content: (
        <div className="max-h-[60vh] overflow-y-auto pr-1 space-y-4 text-[13px] leading-relaxed">
          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">VidaOS 是什么</h4>
            <p className="text-paper">
              你的私密生活记录空间。文章、动态、灵感、日程、待办、馆藏书籍全部存在
              本机（IndexedDB），不上传任何服务器，可离线使用，也能随时整体导出备份。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">主页</h4>
            <p className="text-paper">
              日历：点任意日期，下方「当日产出」会列出这一天写的文章、动态与灵感；
              点条目可直接跳到对应内容。
            </p>
            <p className="text-paper mt-1">
              日程 / 待办：按天安排日程、管理未完成待办，勾选即完成。
            </p>
            <p className="text-paper mt-1">
              视图：统计你的文章、动态、灵感与书的字数与条数。
            </p>
            <p className="text-paper mt-1">
              soundscape：本地音乐播放（上一首 / 暂停 / 下一首，音量在左侧）。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">便签</h4>
            <p className="text-paper">
              灵感：像发消息一样随手记碎片；可加图片、星标（标记值得整理）、分类标签
              （点标签筛选，双击重命名，悬停 × 删除）；一条灵感可一键转为文章；
              按最近修改时间排序，有更新会自动提到最前。
            </p>
            <p className="text-paper mt-1">
              日程：按日期安排事项。待办：随时记下要做的事，完成后勾掉。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">动态</h4>
            <p className="text-paper">
              生活时间线：发动态支持 Markdown 与图片，可评论、收藏；按日期分组展示，
              完全按设置的时间排序（以前的在下，最近的在上）。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">空间</h4>
            <p className="text-paper">
              文章：支持 Markdown 长文与双链笔记。写{' '}
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[文章标题]]</code>{' '}
              即可互相链接，页面底部会显示反向链接 / 正向链接；图片点击可放大并保存 / 下载。
            </p>
            <p className="text-paper mt-1">
              图片插入：选图会先上传进底部备选区（上传期间提示「正在上传」，此时图片还没插入，预览看不到）。
              点缩略图可预览大图；点缩略图右下角的插入按钮，图片才会写进正文光标处并生效
              （同一张图可以多次插入）；未插入的备选图保存后仍保留在备选区（下次编辑还能看到），
              但不会出现在文章展示里。
            </p>
            <p className="text-paper mt-1">
              合集：把文章归到合集里整理。收藏夹：收藏的文章、动态统一查看。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">馆藏</h4>
            <p className="text-paper">
              书架：导入本地 txt / md 文本当书读——选中一段可划线、高亮，都收在书里
              右上角的「书签」，点书签会精确跳到标注所在的那一行。书架按最近阅读
              排序，可置顶多本，进度条按真实阅读进度走；支持给书打标签，
              点标签筛选（双击重命名、悬停 × 删除）。
            </p>
            <p className="text-paper mt-1">
              相册：收藏照片的地方。先建一个图集，可一次性上传一组最多 30 张照片、
              写一段文案后发布（也可以不选图、只发文字）；编辑一组时照片可长按拖动排序。
              图集按最近阅读排序，组内照片按发布时间排序。
            </p>
            <p className="text-paper mt-1">
              星标集：置顶在最前面的图集。文章、动态、灵感里的图片点开大图后都可以存入星标集，
              相册里的照片也能单独星标；星标集按「文章 / 动态 / 灵感 / 相册」四个标签分类，
              图片带双链，可跳回对应的原文。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">Agent</h4>
            <p className="text-paper">
              多会话聊天助手：可以帮你整理文章、聊生活与学习。会话列表点进某个会话
              再对话，随时新建会话。
            </p>
            <p className="text-paper mt-1">
              Agent 能读取你的空间文章、动态、灵感、便签、馆藏与收藏夹。需要它看哪块内容
              就说 <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:文章]]</code>、
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:动态]]</code>、
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:灵感]]</code>、
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:便签]]</code>、
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:收藏夹]]</code>、
              <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:相册]]</code>，
              读某篇正文用 <code className="font-mono text-xs px-1 rounded bg-bronze/10">[[读:文章·标题]]</code>，
              也可以直接让它归纳整理。
            </p>
            <p className="text-paper mt-1">
              输入框左侧有图片按钮，可以附带图片一起发送；不支持图片识别的模型会自动略过图片。
            </p>
          </section>

          <section>
            <h4 className="font-serif text-candle font-semibold mb-1">数据与全局</h4>
            <p className="text-paper">
              数据页：JSON 导出 / 导入（导出范围可选文章、动态、便签、收藏夹、个人资料、
              馆藏·书架、馆藏·相册、Agent 全数据，支持多选）、WebDAV 云备份、本地文件夹
              备份、重置。WebDAV 云端保存明文 JSON，每次同步全量覆盖——删除的内容也会同步消失。
              设置页可换主题（跟随系统 / 白昼 / 暗夜 / 猩红书房）。
            </p>
            <p className="text-paper mt-1">
              顶栏搜索按钮或 ⌘K 打开全局查找替换；页面右上角另有页内查找替换。
              这是 PWA，可「添加到主屏幕」当 App 用。
            </p>
          </section>
        </div>
      ),
    });
  };

  // ── 关于 · 更新日志（占位，暂为空） ──
  const openChangelog = () => {
    showModal({
      title: '更新日志',
      content: (
        <div className="max-h-[60vh] overflow-y-auto pr-1">
          <p className="text-bronze text-sm leading-relaxed">
            更新日志整理中，稍后会在这里列出每次更新的内容。
          </p>
        </div>
      ),
    });
  };


  /** 清除缓存：删除正文中已不再引用的图片文件（孤儿 blob），不动任何数据 */
  const clearCache = async () => {
    if (
      !(await useUIStore.getState().confirmDialog(
        '清除未使用的图片缓存？\n\n只会删除正文中已经不再引用的图片文件（例如编辑时留下的废弃图片）。文章、动态、灵感、相册、收藏夹等所有数据都不受影响。',
      ))
    ) {
      return;
    }
    try {
      const st = useAppStore.getState();
      const used = collectFileIds(st);
      const all = await db.files.toArray();
      const orphan = all.filter((f) => !used.has(f.id));
      if (orphan.length === 0) {
        showToast('没有需要清理的缓存', 'info');
        return;
      }
      await db.files.bulkDelete(orphan.map((f) => f.id));
      const freed = orphan.reduce((sum, f) => sum + (f.size ?? 0), 0);
      showToast(`已清理 ${orphan.length} 个无引用图片，释放 ${humanBytes(freed)}`, 'success');
    } catch {
      showToast('清理缓存失败，请稍后重试', 'error');
    }
  };

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

        {/* 关于：使用说明 + 更新日志 */}
        <Card className="p-5 sm:p-6">
          <h3 className="font-serif text-headline text-lg mb-3">关于</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={openGuide}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-card border border-bronze/15 text-sm font-serif text-paper hover:border-wine/50 hover:bg-wine/5 transition-all"
            >
              <BookOpen size={15} strokeWidth={1.5} className="text-wine-light" />
              使用说明
            </button>
            <button
              onClick={openChangelog}
              className="flex items-center justify-center gap-2 px-3 py-3 rounded-card border border-bronze/15 text-sm font-serif text-paper hover:border-wine/50 hover:bg-wine/5 transition-all"
            >
              <History size={15} strokeWidth={1.5} className="text-wine-light" />
              更新日志
            </button>
          </div>
          <button
            onClick={() => void clearCache()}
            className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-card border border-bronze/15 text-sm font-serif text-paper hover:border-wine/50 hover:bg-wine/5 transition-all"
          >
            <Trash2 size={14} strokeWidth={1.5} className="text-wine-light" />
            清除缓存
          </button>
        </Card>

        {/* 品牌栏 */}
        <Card className="p-5 sm:p-6 text-center">
          <p className="font-serif text-headline text-lg tracking-widest">VidaOS</p>
          <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mt-1">
            v4.4.1 · night study
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
