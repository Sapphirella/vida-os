// 原生壳（Tauri）环境判定与适配
//
// 为什么要这个文件：同一个 dist/ 既跑在浏览器（PWA）里，也跑在 Tauri 壳里（桌面 / Android）。
// 壳里有两件事必须区别对待：
//   1) **Service Worker 不要注册**：壳用的是本地资源协议（tauri:// 或 http://tauri.localhost），
//      没有 SW 的用武之地；留着它只会多一层缓存与潜在的加载怪问题。
//      这里不改进 vite-plugin-pwa 的注入配置（那会影响网页版），而是在壳里把它**注销掉** ——
//      网页版行为一字不改，风险最小。
//   2) 以后需要原生的地方（系统分享/保存文件、绕开 WebDAV 的 CORS）也从这里分流。
export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

/**
 * 网络请求：壳里交给 Rust 发，网页里用浏览器 fetch。
 *
 * 为什么非要这样（v1.0.1，真机反馈「云备份失败」）：WebView 和浏览器一样有**同源策略**，
 * 而 WebDAV 服务商（坚果云等）不会返回 CORS 头 → 浏览器直连必然被拦。
 * 壳里把请求交给原生侧发就完全没有 CORS 这回事（原生 HTTP 客户端不受同源策略约束）。
 * 网页版行为不变（仍是 window.fetch，仍受 CORS 限制）。
 */
export async function shellFetch(input: string, init?: RequestInit): Promise<Response> {
  const { fetch: tauriFetch } = await import('@tauri-apps/plugin-http');
  // 插件的 fetch 与标准 fetch 签名兼容；返回体同样是 Response（可 .text()/.blob()/.arrayBuffer()）
  return tauriFetch(input, init) as unknown as Response;
}

/** 壳内文件保存的落点 */
export type ShellSave = { label: string; path: string };

/**
 * 壳里保存文件：**真的写到磁盘**，而不是走 <a download>。
 *
 * 为什么必须换掉下载（v1.0.1，真机反馈「提示保存成功但实际没保存」）：
 * `<a download>` 在 Android WebView 里**什么都不做**（没有下载管理器接管），
 * 而它也不会抛错 —— 于是代码高高兴兴地提示「保存成功」，用户却什么都没拿到。
 * 依次尝试「下载目录 → 文档目录 → 应用数据目录」，返回用户看得懂的位置。
 */
export async function shellSaveFile(blob: Blob, filename: string): Promise<ShellSave> {
  const fs = await import('@tauri-apps/plugin-fs');
  const path = await import('@tauri-apps/api/path');
  const bytes = new Uint8Array(await blob.arrayBuffer());
  // 依次尝试：下载目录（最容易被用户找到）→ 文档目录 → 应用数据目录（一定能写）
  const attempts: Array<{ dir: () => Promise<string>; label: string; sub: boolean }> = [
    { dir: path.downloadDir, label: '下载目录/VidaOS', sub: true },
    { dir: path.documentDir, label: '文档目录/VidaOS', sub: true },
    { dir: path.appDataDir, label: '应用数据目录', sub: false },
  ];
  let lastErr: unknown = null;
  for (const a of attempts) {
    try {
      const base = await a.dir();
      const dir = a.sub ? await path.join(base, 'VidaOS') : base;
      await fs.mkdir(dir, { recursive: true });
      const abs = await path.join(dir, filename);
      await fs.writeFile(abs, bytes);
      return { label: a.label, path: abs };
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(
    `手机壳里无法写入文件${lastErr instanceof Error ? `（${lastErr.message}）` : ''}：可改用「云备份」`,
  );
}

/** 用系统应用打开刚保存的文件（Android 会弹「打开方式」，可另存/分享出去） */
export async function shellOpenFile(save: ShellSave): Promise<void> {
  const { openPath } = await import('@tauri-apps/plugin-opener');
  await openPath(save.path);
}

/** 在壳里清掉可能存在的 Service Worker（幂等，失败不影响使用） */
export function disableServiceWorkerInShell(): void {
  if (!isTauri()) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .getRegistrations()
    .then((rs) => rs.forEach((r) => void r.unregister()))
    .catch(() => {});
}
