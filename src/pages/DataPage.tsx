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
  HelpCircle,
  History,
} from 'lucide-react';
import { Card } from '@/components/common/Card';
import { useAppStore } from '@/stores/useAppStore';
import { useUIStore } from '@/stores/useUIStore';
import { putFile, db } from '@/lib/db';
import { flushPersist } from '@/stores/useAppStore';
import { base64ToBlob, saveBlob, saveText, clsx, errMsg } from '@/lib/utils';
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
  hasEncryption,
  syncToWebDav,
  listDavBackups,
  DAV_MAX_BACKUPS,
  type DavBackupEntry,
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
  { key: 'notes', label: '便签', en: 'Notes', desc: '灵感 + 日程 + 待办 + 碎片' },
  { key: 'favorites', label: '收藏夹', en: 'Favorites', desc: '收藏记录 + 被收藏的内容' },
  { key: 'profile', label: '个人资料', en: 'Profile', desc: '头像 / 昵称 / 签名 / 背景' },
  { key: 'library', label: '馆藏·书架', en: 'Library', desc: '书籍 + 划线 + 书籍标签' },
  { key: 'album', label: '馆藏·相册', en: 'Album', desc: '图集 + 图片组 + 星标集' },
  { key: 'agent', label: 'Agent 全数据', en: 'Agent', desc: '会话 + 资料库 + 记忆馆 + 人格' },
];

/** 「备份配置说明书」弹窗内容 */
const BACKUP_GUIDE = (
  <div className="max-h-[62vh] overflow-y-auto pr-1">
    {/* 一、配置教程 */}
    <p className="font-serif text-base text-candle mb-1.5">一、配置教程</p>
    <p className="text-bronze text-[12px] leading-relaxed mb-1.5">
      本功能把全部数据（含图片 / 音频）整理成一份 JSON，经 WebDAV 上传到你指定的云空间（如坚果云），取回时一键恢复。云端保存明文 JSON，方便随时查看与管理。
    </p>
    <div className="text-bronze text-[12px] leading-relaxed space-y-1 mb-2">
      <p>① 准备坚果云账号：注册并登录坚果云（免费版即可），进入「账户信息 → 安全选项 → 添加应用密码」，生成一个专用密码。这个密码与网页登录密码不同，是 WebDAV 访问凭证。</p>
      <p>② 创建备份目录：建议在坚果云中新建一个文件夹（如 vidaos），把它的路径记下来。</p>
      <p>③ 填写配置：接口地址填「https://dav.jianguoyun.com/dav/vidaos/」（目录以 / 结尾）；账号填坚果云注册邮箱；应用密码填第 ① 步生成的专用密码。</p>
      <p>④ 点击「保存配置」：配置将存入本机浏览器数据库（下次打开自动回显）。</p>
      <p>⑤ 点击「云备份」：立即上传一次全量快照（vidaos-backup.json，固定文件名、每次覆盖）。<span className="text-candle">同步是全量覆盖：新增、修改、删除都会同步</span>——本地删掉的内容，下次云备份后云端也不再存在。</p>
      <p>⑥ 需要取回时点击「云端恢复」：下载 → 若已加密则输入口令 → 确认后覆盖恢复本地数据。</p>
    </div>

    <div className="border-t border-line/40 my-3" />

    {/* 二、失败情况详解 */}
    <p className="font-serif text-base text-candle mb-1.5">二、失败情况详解</p>
    <div className="text-bronze text-[12px] leading-relaxed space-y-1 mb-2">
      <p><span className="text-candle">认证失败（401 / 403）：</span>账号或应用密码不对。确认填的是官网「安全选项」里单独生成的应用密码，而不是网页登录密码。</p>
      <p><span className="text-candle">目标路径不存在（404）：</span>接口地址拼写有误，域名或目录写错，请对照坚果云 WebDAV 地址检查。</p>
      <p><span className="text-candle">目录缺失（409）：</span>填写的目录或其上级目录不存在。请先在坚果云里建好目录，或改填一个已存在的路径。</p>
      <p><span className="text-candle">无法连接 / 网络错误（直连失败）：</span>可能是网络不可达，也可能是浏览器直连 WebDAV 被跨域（CORS）策略拦截——这是纯网页版的浏览器限制，坚果云未开放跨域头；Tauri 桌面版（规划中）落地后会自动解除。此类错误可在支持 CORS 的 WebDAV 服务上先行验证配置。</p>
      <p><span className="text-candle">解密失败：</span>口令错误或云端文件已损坏。口令无法找回，只能重建备份。</p>
      <p><span className="text-candle">拒绝写入（507）：</span>云空间容量不足，或本月流量配额已用尽，下月重置后再试。</p>
    </div>

    <div className="border-t border-line/40 my-3" />

    {/* 三、端到端加密说明 */}
    <p className="font-serif text-base text-candle mb-1.5">三、端到端加密说明</p>
    <p className="text-bronze text-[12px] leading-relaxed mb-1.5">
      开启「端到端加密」后，每次上传前会用你设置的口令，经 PBKDF2（15 万次迭代）派生 AES-256-GCM 密钥，加密整份快照：
    </p>
    <div className="text-bronze text-[12px] leading-relaxed space-y-1 mb-2">
      <p>· 云端只存密文（VDOS1 容器），服务商与拿到文件的人均无法查看内容；</p>
      <p>· 口令只保存在本机、绝不随备份上传；本机恢复自动使用，换设备恢复需手动输入；</p>
      <p>· 加密只保护云端备份，本地 IndexedDB 中的数据仍是明文；</p>
      <p><span className="text-amber/90">重要：口令一旦丢失，云端已加密的备份将永久无法解密、无法找回。</span>建议把口令另行记录在密码管理器中。</p>
    </div>

    <div className="border-t border-line/40 my-3" />

    {/* 四、重要提醒 */}
    <p className="font-serif text-base text-candle mb-1.5">四、重要提醒</p>
    <div className="text-bronze text-[12px] leading-relaxed space-y-1">
      <p>· 备份是全量快照、后写覆盖：<span className="text-candle">不支持多设备同时进行编辑</span>，请保持单设备使用；</p>
      <p>· 坚果云免费版每月有流量与空间限制，<span className="text-candle">建议一天内不要高频同步</span>；</p>
      <p>· 建议偶尔执行一次「云端恢复」演练，确认备份链路可用；</p>
      <p>· 云备份与本地文件夹快照（下方区块）互不影响，可同时使用、互为兜底。</p>
    </div>
  </div>
);

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
  /** 云端历史（点「查看云端历史」时拉取；null = 还没查过） */
  const [davVersions, setDavVersions] = useState<DavBackupEntry[] | null>(null);
  const [davVersionsBusy, setDavVersionsBusy] = useState(false);
  /** 本次要恢复的是云端哪一份（null = 最新那份）；弹口令时需要它才不会恢复错份 */
  const davRestoreTargetRef = useRef<string | undefined>(undefined);

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
        ...(davEnc
          ? { encrypted: true, passphrase: davPassPhrase.trim() }
          : // ⚠️ 关掉加密时**保留已保存的口令**（v4.7.12）：口令是解开**此前已上传**那些
            // 加密备份的唯一钥匙，删了就永久解不开了。关掉只代表「以后不再加密上传」。
            davCfg?.passphrase
            ? { passphrase: davCfg.passphrase }
            : {}),
      },
    });
    showToast(
      davEnc
        ? 'WebDAV 配置已保存（开启加密）'
        : davCfg?.passphrase
          ? 'WebDAV 配置已保存 · 已停止加密上传（本机仍保留口令，可继续取回旧的加密备份）'
          : 'WebDAV 配置已保存',
      'success',
    );
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
      const encrypted = hasEncryption(cfg);
      const kept = info.backups > 1 ? `，云端保留 ${info.backups} 份` : '';
      showToast(
        (encrypted
          ? `云备份完成：已加密上传 ${humanBytes(info.bytes)}（云端只存密文）`
          : `云备份完成：已上传 ${humanBytes(info.bytes)}（云端存明文 JSON）`) + kept,
        'success',
      );
      // 服务端不支持列目录/改名时如实说明（不假装有历史）
      if (info.warning) showToast(`注意：${info.warning}`, 'info');
      if (info.pruned.length) {
        showToast(`已清理 ${info.pruned.length} 份最早的云端备份`, 'info');
      }
      setDavVersions(null);   // 列表过期，下次点「查看云端历史」重新拉
    } catch (e) {
      showToast(`云备份失败：${errMsg(e)}`, 'error');
    } finally {
      setDavBusy(false);
    }
  };

  /** 列出云端历史（最近 N 份） */
  const doListDavVersions = async () => {
    const cfg = hasWebDavConfig(state.settings.webdav) ? state.settings.webdav : null;
    if (!cfg) {
      showToast('请先填写并保存 WebDAV 配置', 'error');
      return;
    }
    setDavVersionsBusy(true);
    try {
      const list = await listDavBackups(cfg);
      setDavVersions(list);
      if (!list.length) showToast('云端还没有备份', 'info');
    } catch (e) {
      showToast(`读取云端历史失败：${errMsg(e)}`, 'error');
    } finally {
      setDavVersionsBusy(false);
    }
  };

  /** 从云端取回并覆盖恢复；备份已加密且缺少口令时弹输入框 */
  const doDavRestore = async (pass?: string, onlyName?: string) => {
    if (davRestoring) return;
    const cfg = hasWebDavConfig(state.settings.webdav)
      ? state.settings.webdav
      : null;
    if (!cfg) {
      showToast('请先填写并保存 WebDAV 配置', 'error');
      return;
    }
    davRestoreTargetRef.current = onlyName;
    setDavRestoring(true);
    try {
      const info = await downloadFromWebDav(cfg, pass, onlyName);
      if (
        !(await useUIStore.getState().confirmDialog(
          `用云端这份备份覆盖当前全部数据？\n\n${new Date(info.createdAt).toLocaleString('zh-CN')} · ${humanBytes(info.bytes)}${info.encrypted ? ' · 已加密' : ''}\n\n当前数据将被替换（建议先手动导出一份 JSON 再恢复）。`,
        ))
      ) {
        return;
      }
      // v4.7.11：媒体也要一起写回。此前只灌 state，图片/音频/头像只剩悬空 id ——
      // 换台设备或清过缓存后「恢复了但图片全没了」，而且下一次同步还会把云端那份覆盖掉。
      let files = 0;
      let failed = 0;
      for (const [id, f] of Object.entries(info.files ?? {})) {
        try {
          // 注意：webdav 存的是**原始 base64**，而 base64ToBlob 期待 data: URL，
          // 所以要自己补前缀（两边的 blobToBase64 语义不同，别直接对接）
          const blob = base64ToBlob(`data:${f.mime || 'application/octet-stream'};base64,${f.data}`);
          await putFile({ id, blob, mime: f.mime, name: f.name, size: blob.size });
          files += 1;
        } catch {
          // 单个文件坏了不中断整体恢复，但要计数（恢复一半不能报成成功）
          failed += 1;
        }
      }
      importState(info.state, 'overwrite');
      davRestoreTargetRef.current = undefined;
      if (failed > 0) {
        showToast(
          `已从云端恢复，但有 ${failed} 个媒体文件写回失败（成功 ${files} 个）。可再恢复一次，或检查存储空间`,
          'error',
        );
      } else {
        const which = info.name && info.name !== 'vidaos-backup.json' ? '（历史份）' : '';
        showToast(
          files > 0 ? `已从云端恢复${which}（含 ${files} 个媒体文件）` : `已从云端恢复${which}`,
          'success',
        );
      }
    } catch (e) {
      if (e instanceof NeedPassphraseError) {
        showModal({
          title: '输入加密口令',
          content: '云端备份已加密，请输入备份时设置的口令才能取回。若口令丢失，该备份将无法解密。',
          inputMode: { placeholder: '加密口令' },
          // ⚠️ 必须把「要恢复哪一份」带上：否则用户点了某一份历史、输完口令之后，
          // 实际恢复的是**最新那份**（v4.7.12 修）
          onInputConfirm: (v) => void doDavRestore(v, davRestoreTargetRef.current),
        });
      } else {
        showToast(`云端恢复失败：${errMsg(e)}`, 'error');
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
    } catch (e) {
      // 用户主动关闭选择文件夹对话框时静默退出
      if (!(e instanceof DOMException && e.name === 'AbortError')) {
        showToast(`选择失败：${errMsg(e)}`, 'error');
      }
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
    } catch (e) {
      showToast(`保存失败：${errMsg(e)}`, 'error');
    } finally {
      setSnapBusy(false);
    }
  };

  const doRestore = async (name: string) => {
    if (!(await useUIStore.getState().confirmDialog(`用这份快照覆盖当前全部数据？\n\n${name}\n\n当前数据将被替换（建议先手动导出一份 JSON 再恢复）。`))) return;
    try {
      const restored = await restoreSnapshot(name);
      importState(restored.state, 'overwrite');
      // 恢复了一半不能报成成功（v4.7.12）：如实说出成功/失败的文件数
      if (restored.failed > 0) {
        showToast(
          `已从快照恢复，但有 ${restored.failed} 个媒体文件没写回（成功 ${restored.files} 个）。可再恢复一次，或检查存储空间`,
          'error',
        );
      } else {
        showToast(
          restored.files > 0 ? `已从快照恢复（含 ${restored.files} 个媒体文件）` : '已从快照恢复',
          'success',
        );
      }
      await refreshSnapshots();
    } catch (e) {
      showToast(`恢复失败：${errMsg(e)}`, 'error');
    }
  };

  const doDeleteSnapshot = async (name: string) => {
    if (!(await useUIStore.getState().confirmDialog(`删除这份快照？\n\n${name}`))) return;
    try {
      await deleteSnapshot(name);
      await refreshSnapshots();
      showToast('快照已删除', 'success');
    } catch (e) {
      showToast(`删除失败：${errMsg(e)}`, 'error');
    }
  };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doExportJSON = async () => {
    // v4.7.11：以前全不勾也能导出，产出只剩 settings/categories 的 vidaos-none-*.json，
    // 界面却提示「导出成功」—— 用户之后再拿这份「覆盖」导入等于清空全部数据。
    if (scopes.length === 0) {
      showToast('请至少选择一项导出范围', 'error');
      return;
    }
    try {
      setExporting('json');
      const json = await exportJSON(state, scopes);
      await saveText(json, `vidaos-${scopeSlug(scopes)}-${timestamp()}.json`, 'application/json');
      showToast('导出成功', 'success');
    } catch (e) {
      showToast(`导出失败：${errMsg(e)}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportMD = async () => {
    if (scopes.length === 0) {
      showToast('请至少选择一项导出范围', 'error');
      return;
    }
    try {
      setExporting('md');
      const md = exportMarkdown(state, scopes);
      await saveText(md, `vidaos-${scopeSlug(scopes)}-${timestamp()}.md`, 'text/markdown');
      showToast('导出成功', 'success');
    } catch (e) {
      showToast(`导出失败：${errMsg(e)}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportTXT = async () => {
    if (scopes.length === 0) {
      showToast('请至少选择一项导出范围', 'error');
      return;
    }
    try {
      setExporting('txt');
      const txt = exportTXT(state, scopes);
      await saveText(txt, `vidaos-${scopeSlug(scopes)}-${timestamp()}.txt`, 'text/plain');
      showToast('导出成功', 'success');
    } catch (e) {
      showToast(`导出失败：${errMsg(e)}`, 'error');
    } finally {
      setExporting(null);
    }
  };

  const doExportPDF = async () => {
    if (scopes.length === 0) {
      showToast('请至少选择一项导出范围', 'error');
      return;
    }
    try {
      setExporting('pdf');
      const blob = await exportPDF(state, scopes);
      await saveBlob(blob, `vidaos-${scopeSlug(scopes)}-${timestamp()}.pdf`);
      showToast('PDF 导出成功', 'success');
    } catch (e) {
      showToast(`PDF 失败：${errMsg(e)}`, 'error');
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
    } catch (e) {
      showToast(`备份失败：${errMsg(e)}`, 'error');
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
        /**
         * 媒体要等用户选完「合并/覆盖」再写（v4.7.12）：
         * 以前是先写文件再弹选择框 —— 用户点「取消」也会把这些媒体塞进库（留下孤儿），
         * 而且循环里没有逐条 try/catch，**一个坏条目会让整份备份都导不进来**。
         */
        const writeFiles = async () => {
          let ok = 0;
          let bad = 0;
          for (const f of parsed.files) {
            try {
              const blob = base64ToBlob(f.dataUrl);
              await putFile({ id: f.id, blob, mime: f.mime, name: f.name, size: f.size });
              ok += 1;
            } catch {
              bad += 1;   // 单条坏了不阻断，最后如实报数
            }
          }
          return { ok, bad };
        };
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
                  onClick={async () => {
                    // 先记下合并前的数量，报「实际新增了多少」而不是文件里有多少（v4.7.12）
                    const before = useAppStore.getState();
                    const beforeIds = new Set(before.articles.map((a) => a.id));
                    const { ok, bad } = await writeFiles();
                    importState(parsed.state, 'merge');
                    useUIStore.getState().closeModal();
                    const added = useAppStore.getState().articles.filter((a) => !beforeIds.has(a.id)).length;
                    showToast(
                      `已合并：新增 ${added} 篇文章${parsed.state.articles.length !== added ? `（文件里有 ${parsed.state.articles.length} 篇，其余已存在）` : ''}` +
                        (bad ? ` · ${bad} 个媒体文件损坏已跳过` : ok ? ` · 写入 ${ok} 个媒体文件` : ''),
                      bad ? 'error' : 'success',
                    );
                  }}
                >
                  合并
                </button>
                <button
                  className="btn-primary"
                  style={{ background: 'var(--wine-deep)' }}
                  onClick={async () => {
                    if (await useUIStore.getState().confirmDialog('覆盖将清空所有现有数据，确认？')) {
                      const { ok, bad } = await writeFiles();
                      importState(parsed.state, 'overwrite');
                      useUIStore.getState().closeModal();
                      // 先落盘再提示：清空/覆盖这种破坏性操作不能让「400ms 防抖」留窗口
                      await flushPersist();
                      showToast(
                        `已覆盖${ok ? `，含 ${ok} 个媒体文件` : ''}${bad ? ` · ${bad} 个媒体文件损坏已跳过` : ''}`,
                        bad ? 'error' : 'success',
                      );
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
    } catch (err) {
      showToast(`导入失败：${errMsg(err)}`, 'error');
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
            把全部数据（含图片 / 音频）整理成一份{' '}
            <span className="font-mono text-bronze-light">{BACKUP_FILENAME}</span>{' '}
            上传到你的 WebDAV 空间（坚果云等）。最新一份固定覆盖，同时<span className="text-candle">在云端保留最近 {DAV_MAX_BACKUPS} 份</span>（旧的自动改名归档，超出份数自动清理）；<span className="text-bronze-light">删除的内容同步后不在最新备份里，但旧份里还在 —— 可从「云端历史」恢复</span>。
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
            <button
              onClick={() => void doListDavVersions()}
              disabled={!hasWebDavConfig(state.settings.webdav) || davVersionsBusy}
              className="btn-ghost disabled:opacity-40"
            >
              <History size={13} strokeWidth={1.6} />
              {davVersionsBusy ? '读取中…' : '云端历史'}
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

          {/* 云端历史：列出云端的备份份数，可恢复指定某一份 */}
          {davVersions && davVersions.length > 0 && (
            <div className="mt-3 rounded-card border border-line/40 p-3">
              <p className="font-mono text-[10px] tracking-widest text-bronze-deep uppercase mb-2">
                cloud history · {davVersions.length} / {DAV_MAX_BACKUPS}
              </p>
              <ul className="space-y-1.5">
                {davVersions.map((v) => (
                  <li key={v.name} className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-[10px] text-bronze-deep w-32 flex-none tabular-nums">
                      {v.mtime ? new Date(v.mtime).toLocaleString('zh-CN') : '—'}
                    </span>
                    <span className="font-mono text-[10px] text-bronze-deep w-16 flex-none tabular-nums">
                      {v.size ? humanBytes(v.size) : '—'}
                    </span>
                    {v.isLatest ? (
                      <span className="tag tag-wine" style={{ fontSize: 9, padding: '2px 8px' }}>
                        最新
                      </span>
                    ) : (
                      <span className="text-bronze-deep text-[10px] truncate-1" title={v.name}>
                        {v.name.replace('vidaos-backup-', '').replace('.json', '')}
                      </span>
                    )}
                    <span className="flex-1" />
                    <button
                      onClick={() => void doDavRestore(undefined, v.name)}
                      disabled={davRestoring}
                      className="font-mono text-[10px] tracking-wider text-bronze-deep hover:text-candle transition-colors disabled:opacity-40"
                      aria-label={`恢复 ${v.name}`}
                    >
                      恢复这份
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-bronze-deep text-[10px] mt-2 leading-relaxed">
                恢复某一份会用它覆盖当前全部数据（会先确认）。删除过的内容可以从更早的份里找回来。
              </p>
            </div>
          )}

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

        <div className="px-1">
          <button
            onClick={() => showModal({ title: '备份配置说明书', content: BACKUP_GUIDE })}
            className="inline-flex items-center gap-1 text-bronze-deep text-[11px] hover:text-candle transition-colors"
          >
            <HelpCircle size={11} strokeWidth={1.6} />
            备份配置说明书
          </button>
        </div>

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
          <p className="text-bronze text-xs mb-2">下载一份你的数据</p>
          {/* 说清楚哪种才是「备份」（v4.7.12）：MD/TXT/PDF 只是可读导出，缺一大半模块 */}
          <p className="text-bronze-deep text-[11px] leading-relaxed mb-4">
            <span className="text-candle">完整备份请用 JSON</span>（或数据页下方的本地文件夹快照）：
            JSON 含全部模块与媒体文件，可原样恢复。Markdown / TXT / PDF 是<span className="text-candle">给人读的导出</span>——
            只含文章、动态、灵感、日程、待办、收藏夹等文本，<span className="text-candle">不含</span>
            馆藏书籍、相册图片、Agent 会话、音乐，不能当作备份。
          </p>
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
            onClick={async () => {
              if (await useUIStore.getState().confirmDialog('这将清空所有数据，无法恢复。确认？')) {
                if (await useUIStore.getState().confirmDialog('再次确认：所有数据将被永久删除。')) {
                  // 顺序要紧（v4.7.12）：先重置 + **立刻落盘**，再删媒体。
                  // 原来是「resetAll()（写盘走 400ms 防抖）→ 立即清空文件表」，
                  // 若在这 400ms 内关掉页面，库里会留下**旧状态 + 没有文件**的组合。
                  useAppStore.getState().resetAll();
                  await flushPersist();
                  await db.files.clear();
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
