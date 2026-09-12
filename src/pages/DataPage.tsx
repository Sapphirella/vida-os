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
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile, db } from '@/lib/db';
import { base64ToBlob, saveBlob, saveText } from '@/lib/utils';
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
  { key: 'letters', label: '信箱', en: 'Letters', desc: '重要信件' },
  { key: 'notes', label: '便签', en: 'Notes', desc: '灵感 + 日程 + 待办' },
  { key: 'favorites', label: '收藏夹', en: 'Favorites', desc: '收藏记录 + 被收藏的内容' },
  { key: 'profile', label: '个人资料', en: 'Profile', desc: '头像 / 昵称 / 签名 / 背景' },
];

export function DataPage() {
  const state = useAppStore();
  const importState = useAppStore((s) => s.importState);
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
                          {new Date(s.createdAt).toLocaleString('zh-CN')} · {humanBytes(s.bytes)} · 文章 {s.counts.articles} · 动态 {s.counts.moments} · 信件 {s.counts.letters} · 便签 {s.counts.notes}
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
