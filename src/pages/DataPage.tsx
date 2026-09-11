import { useRef, useState } from 'react';
import { Upload, FileJson, FileText, FileCode, FileType, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile, db } from '@/lib/db';
import { base64ToBlob } from '@/lib/utils';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doExportJSON = async () => {
    try {
      setExporting('json');
      const json = await exportJSON(state, scopes);
      downloadBlob(json, `vidaos-${scopeSlug(scopes)}-${timestamp()}.json`, 'application/json');
      showToast('导出成功', 'success');
    } catch (e: any) {
      showToast(`导出失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportMD = () => {
    try {
      setExporting('md');
      const md = exportMarkdown(state, scopes);
      downloadBlob(md, `vidaos-${scopeSlug(scopes)}-${timestamp()}.md`, 'text/markdown');
      showToast('导出成功', 'success');
    } catch (e: any) {
      showToast(`导出失败：${e.message}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportTXT = () => {
    try {
      setExporting('txt');
      const txt = exportTXT(state, scopes);
      downloadBlob(txt, `vidaos-${scopeSlug(scopes)}-${timestamp()}.txt`, 'text/plain');
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
      await exportPDF(state, scopes);
      showToast('PDF 已下载', 'success');
    } catch (e: any) {
      showToast(`PDF 失败：${e.message}`, 'error');
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
          <h3 className="font-serif text-moon text-lg mb-1">导出范围</h3>
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
          <h3 className="font-serif text-moon text-lg mb-1">导出</h3>
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
          <h3 className="font-serif text-moon text-lg mb-1">导入</h3>
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

        {/* 危险区 */}
        <Card className="p-5 border-wine/30">
          <h3 className="font-serif text-moon text-lg mb-1">重置</h3>
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

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
