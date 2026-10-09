// 给 release APK 对齐 + 签名，产出可直接安装的 VidaOS-<版本>.apk
//
// 为什么需要签名：Android 只安装「已签名」的 APK。自己用（侧载）用自签名就够，
// 但**签名密钥必须留住** —— 同一个包名的后续版本必须用同一把密钥签名，否则系统拒绝覆盖安装
// （只能卸载重装，数据会跟着没）。所以密钥放在工作区内并请自行备份：
//   .toolchain/vidaos-release.jks（口令写在下面，可改）
//
// 用法：npm run android:sign        （先 npm run android:apk:release）
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const say = (s) => console.log(`[sign-apk] ${s}`);

const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT || path.join(os.homedir(), 'Library/Android/sdk');
const buildTools = fs
  .readdirSync(path.join(sdk, 'build-tools'))
  .sort()
  .reverse()[0];
const bt = path.join(sdk, 'build-tools', buildTools);
const zipalign = path.join(bt, 'zipalign');
const apksigner = path.join(bt, 'apksigner');
const keytool = path.join(process.env.JAVA_HOME || '', 'bin', 'keytool');

const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const outDir = path.join(root, 'src-tauri/gen/android/app/build/outputs/apk/universal/release');
if (!fs.existsSync(outDir)) {
  console.error(`[sign-apk] 还没构建 release APK：先跑 npm run android:apk:release`);
  process.exit(1);
}
const unsigned = fs
  .readdirSync(outDir)
  .filter((f) => f.endsWith('.apk') && f.includes('unsigned'))
  .map((f) => ({ f, t: fs.statSync(path.join(outDir, f)).mtimeMs }))
  .sort((a, b) => b.t - a.t)[0];
if (!unsigned) {
  console.error('[sign-apk] 找不到未签名的 release APK');
  process.exit(1);
}

const store = path.join(root, '.toolchain', 'vidaos-release.jks');
const pass = process.env.VIDAOS_KEY_PASS || 'vidaos2026';
const alias = 'vidaos';
if (!fs.existsSync(store)) {
  if (!process.env.JAVA_HOME) {
    console.error('[sign-apk] 需要 JAVA_HOME 才能生成密钥（先 source .toolchain/android-env.sh）');
    process.exit(1);
  }
  say('首次生成签名密钥 .toolchain/vidaos-release.jks —— 请自行备份，删了就无法覆盖安装后续版本');
  execFileSync(keytool, [
    '-genkeypair', '-keystore', store, '-storepass', pass, '-keypass', pass,
    '-alias', alias, '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
    '-dname', 'CN=VidaOS, OU=Personal, O=VidaOS, C=CN',
  ]);
}

const aligned = path.join(root, '.toolchain', 'aligned.apk');
const out = path.join(root, `VidaOS-${version}.apk`);
say(`对齐 ${unsigned.f}`);
execFileSync(zipalign, ['-p', '-f', '4', path.join(outDir, unsigned.f), aligned]);
say(`签名 → ${path.basename(out)}`);
execFileSync(apksigner, [
  'sign', '--ks', store, '--ks-pass', `pass:${pass}`, '--key-pass', `pass:${pass}`,
  '--ks-key-alias', alias, '--out', out, aligned,
]);
execFileSync(apksigner, ['verify', out]);
fs.rmSync(aligned, { force: true });
say(`完成：${out}（${(fs.statSync(out).size / 1024 / 1024).toFixed(1)} MB，签名有效）`);
