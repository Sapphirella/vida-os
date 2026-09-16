import { useEffect, useRef, useState } from 'react';
import {
  Upload,
  FileJson,
  FileText,
  FileCode,
  FileType,
  AlertTriangle,
  FolderOpen,
  Save,
  RotateCcw,
  Trash2,
  CloudUpload,
  Link2,
  User,
  KeyRound,
  Lock,
  CloudDownload,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile, db } from '@/lib/db';
import { base64ToBlob, saveBlob, saveText, clsx } from '@/lib/utils';
import {
  exportJSON,
  exportMarkdown,
  exportTXT,
  exportPDF,
  parseJSONImport,
  parseMarkdownImport,
  parseTXTImport,
  scopeSlug,
  ALL_SCOPE_KEYS,
  type ExportScopeKey,
} from '@/lib/exportImport';
import {
  hasWebDavConfig,
  syncToWebDav,
  normalizeDavUrl,
  BACKUP_FILENAME,
  downloadFromWebDav,
  NeedPassphraseError,
  supportsCrypto,
} from '@/lib/webdav';
import {
  supportsFolderPicker,
  pickDataFolder,
  getSavedFolder,
  listSnapshots,
  saveSnapshot,
  restoreSnapshot,
  deleteSnapshot,
  humanBytes,
  MAX_SNAPSHOTS,
  type SnapshotInfo,
} from '@/lib/snapshot';

/** 可勾选的导出范围（支持多选） */
const SCOPES: { key: ExportScopeKey; label: string; en: string; desc: string }[] = [
  { key: 'articles', label: '空间文章', en: 'Articles', desc: '长文 + 合集' },
  { key: 'moments', label: '动态', en: 'Moments', desc: '朋友圈碎片' },
  { key: 'notes', label: '便签', en: 'Notes', desc: '灵感 + 日程 + 待办' },
  { key: 'favorites', label: '收藏夹', en: 'Favorites', desc: '收藏记录 + 被收藏的内容' },
  { key: 'profile', label: '个人资料', en: 'Profile', desc: '头像 / 昵称 / 签名 / 背景' },
];

export function DataPage() {
  const state = useAppStore();
  const importState = useAppStore((s) => s.importState);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const showToast = useUIStore((s) => s.showToast);
  const showModal = useUIStore((s) => s.showModal);
  const [exporting, setExporting] = useState<string | null>(null);
  // 多选：默认全选
  const [scopes, setScopes] = useState<ExportScopeKey[]>([...ALL_SCOPE_KEYS]);
  const allSelected = scopes.length === ALL_SCOPE_KEYS.length;
  const toggleScope = (key: ExportScopeKey) =>
    setScopes((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );

  // ── WebDAV 云备份 ──
  const davCfg = state.settings.webdav;
  const [davUrl, setDavUrl] = useState(davCfg?.url ?? '');
  const [davUser, setDavUser] = useState(davCfg?.username ?? '');
  const [davPass, setDavPass] = useState(davCfg?.password ?? '');
  const [davEnc, setDavEnc] = useState(davCfg?.encrypted ?? false);
  const [davPassPhrase, setDavPassPhrase] = useState(davCfg?.passphrase ?? '');
  const [davBusy, setDavBusy] = useState(false);
  const [davRestoring, setDavRestoring] = useState(false);

  const doSaveDavConfig = () => {
    if (!davUrl.trim() || !davUser.trim() || !davPass.trim()) {
      showToast('请填写完整的 WebDAV 配置', 'error');
      return;
    }
    if (davEnc && !supportsCrypto()) {
      showToast('当前环境不支持 Web Crypto 加密（需要 https 或 localhost）', 'error');
      return;
    }
    if (davEnc && !davPassPhrase.trim()) {
      showToast('启用加密需要设置加密口令', 'error');
      return;
    }
    updateSettings({
      webdav: {
        url: davUrl.trim(),
        username: davUser.trim(),
        password: davPass.trim(),
        ...(davEnc ? { encrypted: true, passphrase: davPassPhrase.trim() } : {}),
      },
    });
    showToast('WebDAV 配置已保存', 'success');
  };

  const doDavBackup = async () => {
    if (davBusy) return;
    const cfg = hasWebDavConfig(state.settings.webdav)
      ? state.settings.webdav
      : null;
    if (!cfg) {
      showToast('请先填写并保存 WebDAV 配置', 'error');
      return;
    }
    setDavBusy(true);
    try {
      const info = await syncToWebDav(cfg, state);
      showToast(`云备份完成：已上传 ${humanBytes(info.bytes)}`, 'success');
    } catch (e: any) {
      showToast(`云备份失败：${e.message}`, 'error');
    } finally {
      setDavBusy(false);
    }
  };

  /** 从云端取回并覆盖恢复；备份已加密且缺少口令时弹输入框 */
  const doDavRestore = async (pass?: string) => {
    if (davRestoring) return;
    const cfg = hasWebDavConfig(state.settings.webdav)
      ? state.settings.webdav
      : null;
    if (!cfg) {
      showToast('请先填写并保存 WebDAV 配置', 'error');
      return;
    }
    setDavRestoring(true);
    try {
      const info = await downloadFromWebDav(cfg, pass);
      if (
        !confirm(
          `用云端这份备份覆盖当前全部数据？\n\n${new Date(info.createdAt).toLocaleString('zh-CN')} · ${humanBytes(info.bytes)}${info.encrypted ? ' · 已加密' : ''}\n\n当前数据将被替换（建议先手动导出一份 JSON 再恢复）。`,
        )
      ) {
        return;
      }
      importState(info.state, 'overwrite');
      showToast('已从云端恢复', 'success');
    } catch (e: any) {
      if (e instanceof NeedPassphraseError) {
        showModal({
          title: '输入加密口令',
          content: '云端备份已加密，请输入备份时设置的口令才能取回。若口令丢失，该备份将无法解密。',
          inputMode: { placeholder: '加密口令' },
          onInputConfirm: (v) => void doDavRestore(v),
        });
      } else {
        showToast(`云端恢复失败：${e.message}`, 'error');
      }
    } finally {
      setDavRestoring(false);
    }
  };

  // ── 本地文件夹快照备份 ──
  const folderSupported = supportsFolderPicker();
  const [folderName, setFolderName] = useState<string | null>(null);
  const [snapshots, setSnapshots] = useState<SnapshotInfo[]>([]);
  const [snapBusy, setSnapBusy] = useState(false);

  const refreshSnapshots = async () => {
    if (!folderSupported) return;
    try {
      const folder = await getSavedFolder();
      setFolderName(folder?.name ?? null);
      setSnapshots(folder ? await listSnapshots(folder) : []);
    } catch {
      setSnapshots([]);
    }
  };

  useEffect(() => {
    refreshSnapshots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const doPickFolder = async () => {
    try {
      const name = await pickDataFolder();
      setFolderName(name);
      await refreshSnapshots();
      showToast(`已选择文件夹：${name}`, 'success');
    } catch (e: any) {
      if (e?.name !== 'AbortError') showToast(`选择失败：${e.message}`, 'error');
    }
  };

  const doSaveSnapshot = async () => {
    if (snapBusy) return;
    setSnapBusy(true);
    try {
      const { info, removed } = await saveSnapshot(state);
      await refreshSnapshots();
      showToast(
        removed.length
          ? `快照已保存（${humanBytes(info.bytes)}），已自动清理最旧的 ${removed.length} 份`
          : `快照已保存（${humanBytes(info.bytes)}）`,
        'success',
      );
    } catch (e: any) {
      showToast(`保存失败：${e.message}`, 'error');
    } finally {
      setSnapBusy(false);
    }
  };

  const doRestore = async (name: string) => {
    if (!confirm(`用这份快照覆盖当前全部数据？\n\n${name}\n\n当前数据将被替换（建议先手动导出一份 JSON 再恢复）。`)) return;
    try {
      const restored = await restoreSnapshot(name);
      importState(restored, 'overwrite');
      showToast('已从快照恢复', 'success');
      await refreshSnapshots();
    } catch (e: any) {
      showToast(`恢复失败：${e.message}`, 'error');
    }
  };

  const doDeleteSnapshot = async (name: string) => {
    if (!confirm(`删除这份快照？\n\n${name}`)) return;
    try {
      await deleteSnapshot(name);
      await refreshSnapshots();
      showToast('快照已删除', 'success');
    } catch (e: any) {
      showToast(`删除失败：${e.message}`, 'error');
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doExportJSON = async () => {
    try {
      setExporting('json');
      const json = await exportJSON(state, scopes);
      await saveText(json, `vidaos-${scopeSlug(scopes)}-${timestamp()}.json`, 'application/json');
      showToast('导出成功', 'success');
    } catch (e: any) {
      showToast(`导出失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportMD = async () => {
    try {
      setExporting('md');
      const md = exportMarkdown(state, scopes);
      await saveText(md, `vidaos-${scopeSlug(scopes)}-${timestamp()}.md`, 'text/markdown');
      showToast('导出成功', 'success');
    } catch (e: any) {
      showToast(`导出失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportTXT = async () => {
    try {
      setExporting('txt');
      const txt = exportTXT(state, scopes);
      await saveText(txt, `vidaos-${scopeSlug(scopes)}-${timestamp()}.txt`, 'text/plain');
      showToast('导出成功', 'success');
    } catch (e: any) {
      showToast(`导出失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportPDF = async () => {
    try {
      setExporting('pdf');
      const blob = await exportPDF(state, scopes);
      await saveBlob(blob, `vidaos-${scopeSlug(scopes)}-${timestamp()}.pdf`);
      showToast('PDF 导出成功', 'success');
    } catch (e: any) {
      showToast(`PDF 失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  /** 手机端替代文件夹快照：导出含全部媒体文件的 JSON 备份，走系统分享/保存 */
  const doExportFullBackup = async () => {
    try {
      setExporting('json');
      const json = await exportJSON(state, ['all']);
      await saveText(json, `vidaos-backup-${timestamp()}.json`, 'application/json');
      showToast('备份已生成', 'success');
    } catch (e: any) {
      showToast(`备份失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      let parsed: any;
      if (file.name.endsWith('.json')) {
        parsed = await parseJSONImport(text);
        // 恢复 file
        for (const f of parsed.files) {
          const blob = base64ToBlob(f.dataUrl);
          await putFile({
            id: f.id,
            blob,
            mime: f.mime,
            name: f.name,
            size: f.size,
          });
        }
        showModal({
          title: '选择导入方式',
          content: (
            <div className="space-y-3">
              <p className="text-bronze text-sm">合并到现有数据，或覆盖现有数据？</p>
              <div className="flex gap-2 justify-end">
                <button
                  className="btn-text"
                  onClick={() => useUIStore.getState().closeModal()}
                >
                  取消
                </button>
                <button
                  className="btn-primary"
                  onClick={() => {
                    importState(parsed.state, 'merge');
                    useUIStore.getState().closeModal();
                    showToast(`已合并 ${parsed.state.articles.length} 篇文章`, 'success');
                  }}
                >
                  合并
                </button>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--wine-deep)' }}
                  onClick={() => {
                    if (confirm('覆盖将清空所有现有数据，确认？')) {
                      importState(parsed.state, 'overwrite');
                      useUIStore.getState().closeModal();
                      showToast('已覆盖', 'success');
                    }
                  }}
                >
                  覆盖
                </button>
              </div>
            </div>
          ),
        });
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        parsed = await parseMarkdownImport(text);
        importState(parsed, 'merge');
        showToast(`已导入 ${parsed.articles?.length || 0} 篇文章`, 'success');
      } else if (file.name.endsWith('.txt')) {
        parsed = await parseTXTImport(text);
        importState(parsed, 'merge');
        showToast(`已导入 ${parsed.articles?.length || 0} 篇文章`, 'success');
      } else {
        throw new Error('不支持的格式');
      }
    } catch (err: any) {
      showToast(`导入失败：${err.message}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="px-4 sm:px-6 view-enter">
      <div className="max-w-2xl mx-auto pb-6 space-y-4">
        {/* 提示 */}
        <Card className="p-4 flex items-start gap-3">
          <AlertTriangle size={16} strokeWidth={1.5} className="text-wine-light flex-shrink-0 mt-0.5" />
          <p className="text-bronze text-sm leading-relaxed">
            你的所有数据都保存在浏览器本地。定期导出备份，避免清理浏览器数据时丢失。
          </p>
        </Card>

        {/* WebDAV 云备份 */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <CloudUpload size={15} strokeWidth={1.5} className="text-amber" />
            <h3 className="font-serif text-headline text-lg">WebDAV 全量备份</h3>
          </div>
          <p className="text-bronze text-xs mb-4 leading-relaxed">
            把全部数据（含图片 / 音频）压缩成一个{' '}
            <span className="font-mono text-bronze-light">{BACKUP_FILENAME}</span>{' '}
            上传到你的 WebDAV 空间（坚果云等）。每次同步覆盖同一份，只保留最新备份。
          </p>

          <div className="space-y-3 mb-4">
            <label className="block">
              <span className="flex items-center gap-1.5 text-bronze-light text-xs mb-1">
                <Link2 size={12} strokeWidth={1.6} /> 接口地址
              </span>
              <input
                type="url"
                value={davUrl}
                onChange={(e) => setDavUrl(e.target.value)}
                placeholder="https://dav.jianguoyun.com/dav/vidaos/"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm placeholder:text-bronze-deep focus:border-wine/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-bronze-light text-xs mb-1">
                <User size={12} strokeWidth={1.6} /> 账号
              </span>
              <input
                type="text"
                value={davUser}
                onChange={(e) => setDavUser(e.target.value)}
                placeholder="坚果云注册邮箱"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm placeholder:text-bronze-deep focus:border-wine/60 focus:outline-none"
              />
            </label>
            <label className="block">
              <span className="flex items-center gap-1.5 text-bronze-light text-xs mb-1">
                <KeyRound size={12} strokeWidth={1.6} /> 应用密码
              </span>
              <input
                type="password"
                value={davPass}
                onChange={(e) => setDavPass(e.target.value)}
                placeholder="在坚果云官网「账户信息 → 安全选项」生成"
                autoComplete="off"
                className="w-full px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm placeholder:text-bronze-deep focus:border-wine/60 focus:outline-none"
              />
            </label>
            <p className="text-bronze-deep text-[11px] leading-relaxed">
              应用密码不是网页登录密码，需在坚果云官网「账户信息 → 安全选项 → 添加应用密码」单独生成。
              配置保存在本机浏览器数据库中。
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button onClick={doSaveDavConfig} className="btn-ghost">
              保存配置
            </button>
            <button
              onClick={() => void doDavBackup()}
              disabled={!hasWebDavConfig(state.settings.webdav) || davBusy}
              className="btn-primary disabled:opacity-40"
            >
              <CloudUpload size={13} strokeWidth={1.6} />
              {davBusy ? '同步中…' : '云备份'}
            </button>
            <button
              onClick={() => void doDavRestore()}
              disabled={!hasWebDavConfig(state.settings.webdav) || davRestoring}
              className="btn-ghost disabled:opacity-40"
            >
              <CloudDownload size={13} strokeWidth={1.6} />
              {davRestoring ? '取回中…' : '云端恢复'}
            </button>
            {hasWebDavConfig(state.settings.webdav) && (
              <span
                className="font-mono text-[10px] text-bronze-deep ml-auto self-center truncate-1 max-w-[180px]"
                title={normalizeDavUrl(state.settings.webdav!.url)}
              >
                ☁ {normalizeDavUrl(state.settings.webdav!.url)}
              </span>
            )}
          </div>

          {/* 端到端加密开关 */}
          <div className="mt-4 rounded-card border border-line/40 p-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setDavEnc(!davEnc)}
                role="switch"
                aria-checked={davEnc}
                aria-label="端到端加密开关"
                className={clsx(
                  'relative w-10 h-[22px] rounded-full transition-colors flex-shrink-0',
                  davEnc ? 'bg-wine/70' : 'bg-bronze/25',
                )}
              >
                <span
                  className={clsx(
                    'absolute top-[2px] w-[18px] h-[18px] rounded-full bg-paper transition-all shadow',
                    davEnc ? 'left-[20px]' : 'left-[2px]',
                  )}
                />
              </button>
              <div className="min-w-0">
                <p className="text-paper text-sm font-medium leading-tight">端到端加密（可选）</p>
                <p className="text-bronze text-[11px] leading-snug mt-0.5">
                  上传前用口令加密整份快照，云端只存密文，取回时用同一口令解密。
                </p>
              </div>
            </div>
            {davEnc && (
              <div className="mt-3">
                <label className="block">
                  <span className="flex items-center gap-1.5 text-bronze-light text-xs mb-1">
                    <Lock size={12} strokeWidth={1.6} /> 加密口令
                  </span>
                  <input
                    type="password"
                    value={davPassPhrase}
                    onChange={(e) => setDavPassPhrase(e.target.value)}
                    placeholder="设置备份加密口令（40 位以内）"
                    autoComplete="new-password"
                    className="w-full px-3 py-2 rounded-card border border-line/50 bg-bg-base text-paper text-sm placeholder:text-bronze-deep focus:border-wine/60 focus:outline-none"
                  />
                </label>
                <p className="text-amber/90 text-[11px] leading-relaxed mt-2">
                  ⚠ 数据敏感：口令仅保存在本机、不会上传云端。若丢失口令，云端已加密的备份将
                  <span className="text-candle">永远无法解密</span>（无法找回），请务必牢记或另行保存。
                </p>
              </div>
            )}
          </div>

          <div
            className="mt-4 rounded-card border border-amber/25 p-3"
            style={{ background: 'rgba(212, 164, 84, 0.07)' }}
          >
            <p className="text-amber/90 text-[11px] leading-relaxed">
              ⚠ 注意事项：该备份是全量快照同步，<span className="text-candle">不支持多设备同时进行编辑</span>
              （后同步的一方会覆盖先同步的内容，请保持单设备使用）；若使用坚果云
              免费版，每月有流量限制，<span className="text-candle">建议一天内不要高频同步</span>。
            </p>
          </div>
        </Card>

        {/* 范围 */}
        <Card className="p-5">
          <h3 className="font-serif text-headline text-lg mb-1">导出范围</h3>
          <div className="flex items-center justify-between mb-4">
            <p className="text-bronze text-xs">可多选，已选 {scopes.length} / {ALL_SCOPE_KEYS.length} 项</p>
            <button
              onClick={() => setScopes(allSelected ? [] : [...ALL_SCOPE_KEYS])}
              className="btn-text"
            >
              {allSelected ? '全不选' : '全选'}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SCOPES.map((s) => {
              const on = scopes.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => toggleScope(s.key)}
                  aria-pressed={on}
                  title={s.desc}
                  className={`px-3 py-1.5 rounded-pill text-sm font-serif transition-all border ${
                    on
                      ? 'bg-wine/30 text-candle border-wine/50'
                      : 'bg-bronze/8 text-bronze border-bronze/15 hover:bg-bronze/15'
                  }`}
                >
                  {/* 勾选标记：让「已选中」一眼可见 */}
                  <span className={`mr-1 ${on ? 'text-amber' : 'text-bronze-deep'}`}>
                    {on ? '✓' : '○'}
                  </span>
                  {s.label}
                  <span className="ml-1.5 font-mono text-[10px] tracking-widest text-bronze-deep uppercase">
                    {s.en}
                  </span>
                </button>
              );
            })}
          </div>
          {scopes.length === 0 && (
            <p className="text-wine-light text-xs mt-3">请至少选择一项再导出</p>
          )}
        </Card>

        {/* 导出 */}
        <Card className="p-5">
          <h3 className="font-serif text-headline text-lg mb-1">导出</h3>
          <p className="text-bronze text-xs mb-4">下载一份你的数据</p>
          <div className="grid grid-cols-2 gap-2">
            <ExportBtn
              icon={<FileJson size={16} />}
              label="JSON"
              desc="含图片，完整恢复"
              loading={exporting === 'json'}
              onClick={doExportJSON}
            />
            <ExportBtn
              icon={<FileCode size={16} />}
              label="Markdown"
              desc="纯文本格式"
              loading={exporting === 'md'}
              onClick={doExportMD}
            />
            <ExportBtn
              icon={<FileText size={16} />}
              label="TXT"
              desc="最朴素的纯文本"
              loading={exporting === 'txt'}
              onClick={doExportTXT}
            />
            <ExportBtn
              icon={<FileType size={16} />}
              label="PDF"
              desc="排版美观的文档"
              loading={exporting === 'pdf'}
              onClick={doExportPDF}
            />
          </div>
        </Card>

        {/* 导入 */}
        <Card className="p-5">
          <h3 className="font-serif text-headline text-lg mb-1">导入</h3>
          <p className="text-bronze text-xs mb-4">从备份文件恢复</p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,.md,.markdown,.txt"
            hidden
            onChange={doImport}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="btn-ghost w-full justify-center"
          >
            <Upload size={14} strokeWidth={1.5} /> 选择文件（JSON / Markdown / TXT）
          </button>
        </Card>

        {/* 本地文件夹备份 */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-1">
            <FolderOpen size={15} strokeWidth={1.5} className="text-amber" />
            <h3 className="font-serif text-headline text-lg">本地文件夹备份</h3>
          </div>
          <p className="text-bronze text-xs mb-4 leading-relaxed">
            选一个本地文件夹，点「保存快照」就把当前全部数据写进去。
            最多保留 <span className="text-amber">{MAX_SNAPSHOTS}</span> 份，超出会自动删除最早的一份；
            <span className="text-bronze-light">手动导出的文件不占用快照额度</span>。
            快照里的文字会被 gzip 压缩、图片按原样存放（不做 base64，省约 33% 体积）。
          </p>

          {!folderSupported ? (
            <div className="space-y-3">
              <p className="text-wine-light text-xs leading-relaxed">
                当前浏览器不支持选择本地文件夹（这是手机浏览器 / Safari 的接口限制，Chrome 桌面版才支持）。
              </p>
              <p className="text-bronze text-xs leading-relaxed">
                已为你接入「系统分享」：点下面的按钮会把完整备份生成并弹出分享面板——
                <span className="text-candle">iOS 可「存储到文件」，Android 可保存到下载 / 发给网盘</span>。
                在电脑上只需把这份 JSON 拖回本页「导入」即可完整恢复（含所有图片与音频）。
              </p>
              <button
                onClick={() => void doExportFullBackup()}
                disabled={exporting === 'json'}
                className="btn-primary w-full justify-center disabled:opacity-50"
              >
                <Save size={13} strokeWidth={1.6} />
                {exporting === 'json' ? '备份生成中…' : '分享 / 保存完整备份（JSON）'}
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <button onClick={doPickFolder} className="btn-ghost">
                  <FolderOpen size={13} strokeWidth={1.5} />
                  {folderName ? '更换文件夹' : '选择文件夹'}
                </button>
                <button
                  onClick={doSaveSnapshot}
                  disabled={!folderName || snapBusy}
                  className="btn-primary disabled:opacity-40"
                >
                  <Save size={13} strokeWidth={1.6} />
                  {snapBusy ? '保存中…' : '保存快照'}
                </button>
                {folderName && (
                  <span className="font-mono text-[10px] text-bronze-deep ml-auto">
                    📁 {folderName} · 已用 {snapshots.length} / {MAX_SNAPSHOTS}
                  </span>
                )}
              </div>

              {!folderName && (
                <p className="text-bronze-deep text-xs">
                  还没有选择文件夹。选一次之后会被记住，以后直接点「保存快照」即可。
                </p>
              )}

              {folderName && snapshots.length > 0 && (
                <ul className="space-y-2">
                  {snapshots.map((s) => (
                    <li
                      key={s.name}
                      className="flex items-center gap-2 px-3 py-2 rounded-card border border-line/40"
                      style={{ background: 'rgba(42,41,46,0.5)' }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="font-mono text-[11px] text-paper truncate-1">
                          {s.name.replace('vidaos-snapshot-', '')}
                        </p>
                        <p className="font-mono text-[10px] text-bronze-deep mt-0.5">
                          {new Date(s.createdAt).toLocaleString('zh-CN')} · {humanBytes(s.bytes)} · 文章 {s.counts.articles} · 动态 {s.counts.moments} · 便签 {s.counts.notes}
                          {s.fileCount ? ` · 媒体 ${s.fileCount}` : ''}
                        </p>
                      </div>
                      <button
                        onClick={() => doRestore(s.name)}
                        aria-label="用这份快照恢复"
                        title="用这份快照恢复"
                        className="w-7 h-7 flex items-center justify-center text-bronze hover:text-candle"
                      >
                        <RotateCcw size={13} strokeWidth={1.6} />
                      </button>
                      <button
                        onClick={() => doDeleteSnapshot(s.name)}
                        aria-label="删除这份快照"
                        title="删除这份快照"
                        className="w-7 h-7 flex items-center justify-center text-bronze hover:text-wine-bright"
                      >
                        <Trash2 size={13} strokeWidth={1.6} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {folderName && snapshots.length === 0 && (
                <p className="text-bronze-deep text-xs">还没有快照，点「保存快照」开始备份。</p>
              )}
            </>
          )}
        </Card>

        {/* 危险区 */}
        <Card className="p-5 border-wine/30">
          <h3 className="font-serif text-headline text-lg mb-1">重置</h3>
          <p className="text-bronze text-xs mb-4">清空所有数据，回到初始状态</p>
          <button
            onClick={() => {
              if (confirm('这将清空所有数据，无法恢复。确认？')) {
                if (confirm('再次确认：所有数据将被永久删除。')) {
                  useAppStore.getState().resetAll();
                  db.files.clear();
                  showToast('已重置', 'success');
                }
              }
            }}
            className="btn-ghost w-full justify-center text-wine-light hover:border-wine/40"
          >
            清空所有数据
          </button>
        </Card>
      </div>
    </div>
  );
}

function ExportBtn({
  icon,
  label,
  desc,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  desc: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex flex-col items-start gap-1 p-3 rounded-card border border-bronze/15 hover:border-candle/30 hover:bg-bronze/8 transition-all text-left disabled:opacity-50"
    >
      <div className="flex items-center gap-1.5 text-candle">
        {icon}
        <span className="font-serif text-paper">{label}</span>
      </div>
      <p className="text-bronze-deep text-[11px] font-mono tracking-wide">
        {loading ? '导出中…' : desc}
      </p>
    </button>
  );
}

// 工具
function timestamp(): string {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
}
