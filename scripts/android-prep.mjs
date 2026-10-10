// Android 构建前置准备（可重复执行，幂等）
//
// 为什么需要这个脚本：Tauri 的 Android 侧有三处「在中文网络环境 / 本仓库布局下」会踩的坑，
// 每次 npm install 或 tauri android init 之后都需要重新修一遍。把它们固化成脚本，
// 让 `npm run android:apk` 一条命令就能从零跑到 APK。
//  1) **CLI 解析不到**：Tauri 生成的 Gradle 任务用 `node tauri android android-studio-script`
//     调用 CLI（工作目录是 src-tauri/），但 v2 的 npm 包名是 `@tauri-apps/cli`，
//     没有叫 `tauri` 的模块 → 报 `Cannot find module '.../src-tauri/tauri'`。
//     解决：在 node_modules/tauri 放一个转发壳（node_modules 不入库，所以由脚本生成）。
//  2) **Gradle 发行包下载超时**：默认走 services.gradle.org，实测 307 之后读超时；
//     换成腾讯镜像（实测能跑满速）。
//  3) **crate 下载极慢**：static.crates.io 一个包 ~9.5 秒，换中科大镜像后 90 秒拉完全部依赖。
//     cargo 配置只作用于本工作区（CARGO_HOME 指向 .toolchain/cargo）。
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const says = (s) => console.log(`[android-prep] ${s}`);

/* ① src-tauri/tauri 转发文件（Gradle 任务的工作目录是 src-tauri/，它按**文件路径**调 CLI） */
const cliShim = path.join(root, 'src-tauri', 'tauri');
const cliShimBody = [
  '// Tauri 的 Android Gradle 任务以 `node tauri android android-studio-script` 调用 CLI，',
  '// 工作目录是 src-tauri/（app/build.gradle.kts: rust { rootDirRel = "../../../" }）。',
  '// 本仓库 package.json 是 "type": "module"，所以这个无扩展名文件按 ESM 执行 —— 用',
  '// createRequire + 子进程转发给真正的 CLI（@tauri-apps/cli/tauri.js）。',
  "import { spawnSync } from 'node:child_process';",
  "import { createRequire } from 'node:module';",
  '',
  'const require = createRequire(import.meta.url);',
  "const cli = require.resolve('@tauri-apps/cli/tauri.js');",
  'const r = spawnSync(process.execPath, [cli, ...process.argv.slice(2)], { stdio: \'inherit\' });',
  'process.exit(r.status ?? 1);',
  '',
].join('\n');
if (!fs.existsSync(cliShim) || fs.readFileSync(cliShim, 'utf8') !== cliShimBody) {
  fs.mkdirSync(path.dirname(cliShim), { recursive: true });
  fs.writeFileSync(cliShim, cliShimBody);
  says('已写入 src-tauri/tauri 转发文件');
}

/* ①b node_modules/tauri 转发壳（node 直接按包名解析时用，双保险） */
const shimDir = path.join(root, 'node_modules', 'tauri');
fs.mkdirSync(shimDir, { recursive: true });
const shimPkg = path.join(shimDir, 'package.json');
const shimJs = path.join(shimDir, 'index.js');
fs.writeFileSync(
  shimPkg,
  JSON.stringify({ name: 'tauri', version: '0.0.0', private: true, main: 'index.js' }, null, 2),
);
fs.writeFileSync(
  shimJs,
  [
    '// 本文件由 scripts/android-prep.mjs 生成，请勿手改。',
    '// 作用：Tauri 的 Android Gradle 任务用 `node tauri ...` 调 CLI，而包名是 @tauri-apps/cli。',
    "require('@tauri-apps/cli');",
    '',
  ].join('\n'),
);
says('已写入 CLI 转发壳 node_modules/tauri');

/* ② Gradle 发行包换镜像 */
const wrapper = path.join(root, 'src-tauri/gen/android/gradle/wrapper/gradle-wrapper.properties');
if (fs.existsSync(wrapper)) {
  const src = fs.readFileSync(wrapper, 'utf8');
  const next = src.replace(
    /https\\:\/\/services\.gradle\.org\/distributions\//g,
    'https\\://mirrors.cloud.tencent.com/gradle/',
  );
  if (next !== src) {
    fs.writeFileSync(wrapper, next);
    says('Gradle 发行包已切到腾讯镜像');
  } else {
    says('Gradle 发行包镜像已是目标状态');
  }
} else {
  says('还没生成 Android 工程（先跑 npm run android:init），跳过 Gradle 镜像');
}

/* ③ cargo 镜像 + Gradle 依赖镜像（init.gradle） */
const cargoHome = path.join(root, '.toolchain', 'cargo');
fs.mkdirSync(cargoHome, { recursive: true });
const cargoCfg = path.join(cargoHome, 'config.toml');
if (!fs.existsSync(cargoCfg)) {
  fs.writeFileSync(
    cargoCfg,
    [
      '# 由 scripts/android-prep.mjs 生成：直连 static.crates.io 一个包约 9.5 秒，换国内镜像',
      "[source.crates-io]",
      "replace-with = 'ustc'",
      '',
      '[source.ustc]',
      'registry = "sparse+https://mirrors.ustc.edu.cn/crates.io-index/"',
      '',
      '[net]',
      'retry = 3',
      '',
    ].join('\n'),
  );
  says('已写入 cargo 镜像配置');
}
const gradleHome = path.join(root, '.toolchain', 'gradle');
fs.mkdirSync(gradleHome, { recursive: true });
const initGradle = path.join(gradleHome, 'init.gradle');
if (!fs.existsSync(initGradle)) {
  fs.writeFileSync(
    initGradle,
    [
      '// 由 scripts/android-prep.mjs 生成：AGP/Kotlin/AndroidX 走阿里云，避免官方源超时',
      'allprojects {',
      '  buildscript { repositories {',
      "    maven { url 'https://maven.aliyun.com/repository/google' }",
      "    maven { url 'https://maven.aliyun.com/repository/central' }",
      "    maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }",
      '    google()',
      '    mavenCentral()',
      '  } }',
      '  repositories {',
      "    maven { url 'https://maven.aliyun.com/repository/google' }",
      "    maven { url 'https://maven.aliyun.com/repository/central' }",
      '    google()',
      '    mavenCentral()',
      '  }',
      '}',
      'settingsEvaluated { settings ->',
      '  settings.pluginManagement { repositories {',
      "    maven { url 'https://maven.aliyun.com/repository/gradle-plugin' }",
      "    maven { url 'https://maven.aliyun.com/repository/google' }",
      "    maven { url 'https://maven.aliyun.com/repository/central' }",
      '    gradlePluginPortal()',
      '    google()',
      '  } }',
      '}',
      '',
    ].join('\n'),
  );
  says('已写入 Gradle 依赖镜像 init.gradle');
}
/* ④ Android 原生修补：状态栏/导航栏安全区（真机反馈「文章保存键被状态栏挡住」）
 *
 * 原因：MainActivity 调了 enableEdgeToEdge()（targetSdk 35+ 也强制全屏边到边），
 * 内容因此画到状态栏下面；而 **Android WebView 不填充 env(safe-area-inset-*)**（恒为 0），
 * 网页侧那套安全区补白在壳里完全失效 → 顶部工具栏与编辑器「保存」被状态栏盖住。
 * 修法：把系统栏 + 刘海的高度作为**内边距**加在内容根视图上（WebView 整体下移），
 * 网页里原本为 0 的补白不会造成双重留白。
 */
const mainActivity = path.join(
  root, 'src-tauri/gen/android/app/src/main/java/com/vidaos/app/MainActivity.kt',
);
const mainActivityBody = `package com.vidaos.app

import android.os.Bundle
import android.view.ViewGroup
import androidx.activity.enableEdgeToEdge
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat

class MainActivity : TauriActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    enableEdgeToEdge()
    super.onCreate(savedInstanceState)

    // 安全区修补（由 scripts/android-prep.mjs 写入，勿手改；改了会被覆盖）：
    // WebView 不认 env(safe-area-inset_*)，这里把系统栏/刘海高度加在内容根视图上。
    val content = findViewById<ViewGroup>(android.R.id.content)
    ViewCompat.setOnApplyWindowInsetsListener(content) { view, insets ->
      val bars = insets.getInsets(
        WindowInsetsCompat.Type.systemBars() or WindowInsetsCompat.Type.displayCutout()
      )
      view.setPadding(bars.left, bars.top, bars.right, bars.bottom)
      insets
    }
  }
}
`;
if (fs.existsSync(path.dirname(mainActivity))) {
  const cur = fs.existsSync(mainActivity) ? fs.readFileSync(mainActivity, 'utf8') : '';
  if (cur !== mainActivityBody) {
    fs.writeFileSync(mainActivity, mainActivityBody);
    says('已修补 MainActivity.kt（状态栏安全区）');
  } else {
    says('MainActivity.kt 安全区补丁已就位');
  }
} else {
  says('还没生成 Android 工程（先跑 npm run android:init），跳过 MainActivity 修补');
}
says('准备完成');
