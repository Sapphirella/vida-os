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

/** 在壳里清掉可能存在的 Service Worker（幂等，失败不影响使用） */
export function disableServiceWorkerInShell(): void {
  if (!isTauri()) return;
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
  navigator.serviceWorker
    .getRegistrations()
    .then((rs) => rs.forEach((r) => void r.unregister()))
    .catch(() => {});
}
