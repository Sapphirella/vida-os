// VidaOS · Tauri 壳（v1.0.0）
//
// 这一层只做一件事：把已经写好的纯前端应用（Vite 构建产物 dist/）装进原生外壳，
// 从而能打成 Android APK / 桌面安装包。**业务逻辑一行都不在这里** ——
// 应用本体是离线 PWA，数据全在本机 IndexedDB，所以壳不需要任何后端能力。
//
// 为什么是「空壳」而不是把功能搬进 Rust：
//   - 数据层（IndexedDB）本来就在 WebView 里，壳再包一层反而增加出错面；
//   - 真需要原生的地方（例如绕开 WebDAV 的 CORS、系统分享/保存文件）以后
//     通过 Tauri 插件按需补，见 PROJECT_MEMORY 里「Tauri 壳」那节。
//
// 移动端入口用 `#[cfg_attr(mobile, tauri::mobile_entry_point)]`，
// 桌面与 Android 共用同一个 run()。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // 见 Cargo.toml 的注释：这三个插件分别解决「云备份被 CORS 拦」「导出文件写不进去」
        // 「保存的图片/备份打不开」——都是真机反馈出来、浏览器里根本不会暴露的问题。
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("VidaOS 启动失败");
}
