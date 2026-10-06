// 通用工具函数

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}${r}`;
}

export function now(): number {
  return Date.now();
}

/**
 * 提取错误信息：catch 到的值可能是 Error / 字符串 / 任意对象，
 * 统一转成可展示的文案，避免 `catch (e: any) e.message` 显示 undefined。
 */
export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  if (e && typeof e === 'object') {
    const m = (e as { message?: unknown }).message;
    if (typeof m === 'string') return m;
    if (typeof m === 'number') return String(m);
  }
  return String(e);
}

export function clsx(...args: (string | false | null | undefined)[]): string {
  return args.filter(Boolean).join(' ');
}

export function debounce<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

// 支持的占位符：YYYY MM DD HH mm，以及单字母 M（不补零月）与 D（不补零日）
// 注意：正则交替顺序中 MM/DD 必须排在 M/D 之前，否则 'MM' 会被拆成两个 'M'
const DATE_TOKENS = /YYYY|MM|DD|HH|mm|M|D/g;

export function formatDate(d: Date | number, fmt = 'YYYY-MM-DD'): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  const tokens: Record<string, string> = {
    YYYY: String(y),
    MM: m,
    DD: day,
    HH: hh,
    mm,
    M: String(date.getMonth() + 1),
    D: String(date.getDate()),
  };
  // 用 /g 替换全部出现，而非仅第一处
  return fmt.replace(DATE_TOKENS, (t) => tokens[t] ?? t);
}

export function todayKey(d: Date = new Date()): string {
  return formatDate(d, 'YYYY-MM-DD');
}

export function greetingByHour(hour: number): string {
  if (hour < 5) return '夜深了';
  if (hour < 9) return '早安';
  if (hour < 12) return '上午好';
  if (hour < 14) return '午安';
  if (hour < 18) return '下午好';
  if (hour < 22) return '晚上好';
  return '夜深了';
}

export function chineseWeekday(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  return ['日', '一', '二', '三', '四', '五', '六'][date.getDay()];
}

/**
 * 日程排序：未完成在前已完成在后；
 * 有时间的按时间升序排在前面，无时间的按添加时间（createdAt 升序）排在当日其余日程之后。
 */
export function sortSchedules<T extends { time?: string; done?: boolean; createdAt: number }>(
  items: T[],
): T[] {
  const arr = [...items];
  arr.sort((a, b) => {
    if (!!a.done !== !!b.done) return a.done ? 1 : -1;
    const aHas = !!a.time;
    const bHas = !!b.time;
    if (aHas !== bHas) return aHas ? -1 : 1;
    if (aHas && bHas) return (a.time || '').localeCompare(b.time || '');
    return a.createdAt - b.createdAt;
  });
  return arr;
}

export function chineseDate(d: Date | number): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

export function relativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return '刚刚';
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} 天前`;
  const w = Math.floor(day / 7);
  if (w < 4) return `${w} 周前`;
  const mo = Math.floor(day / 30);
  if (mo < 12) return `${mo} 个月前`;
  const y = Math.floor(day / 365);
  return `${y} 年前`;
}

// 文件大小（人类可读）
export function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// Base64
export function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function base64ToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = meta.match(/:(.*?);/)?.[1] || 'application/octet-stream';
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return new Blob([arr], { type: mime });
}

// 是否 iOS 系浏览器（含 iPadOS Safari 桌面版 UA 伪装：Macintosh + 触摸屏）
function isIOSBrowser(): boolean {
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
}

/**
 * 保存/分享文件，按能力分级：
 *   1. 桌面 Chromium（File System Access API）：showSaveFilePicker 弹系统「另存为」对话框；
 *   2. iOS（Safari / WebKit）：系统分享面板「存储到文件」（iOS 的 a.download 只会打开预览，
 *      无法直接落「下载」文件夹，只能借分享面板让用户存储）；
 *   3. 其他平台（Android Chrome / PWA / 桌面非 Chromium 等）：浏览器 a.download 直接下载——
 *      Android Chrome（含 PWA standalone）会把文件自动存入系统「下载」文件夹，无需分享面板。
 *      该机制与 Chambre「参考文件-IB机」的 downloadBlob 实现一致。
 */
export async function saveBlob(blob: Blob, filename: string): Promise<void> {
  // 1) 桌面 Chromium：系统「另存为」—— 用户可自由选择保存到本地文件夹
  const picker = (window as Window & {
    showSaveFilePicker?: (opts?: {
      suggestedName?: string;
      types?: Array<{ description: string; accept: Record<string, string[]> }>;
    }) => Promise<{
      createWritable: () => Promise<{ write(data: Blob): Promise<void>; close(): Promise<void> }>;
    }>;
  }).showSaveFilePicker;
  if (typeof picker === 'function') {
    try {
      const handle = await picker({ suggestedName: filename });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return; // 已写入用户选择的本地位置
    } catch (err) {
      // 用户取消保存对话框时静默退出，其余错误继续走后面的路径
      if ((err as Error)?.name === 'AbortError') return;
    }
  }

  // 2) iOS（Safari / WebKit）：系统分享面板（可「存储到文件」/保存/发网盘）
  if (isIOSBrowser()) {
    const nav = navigator as Navigator & {
      canShare?: (data: { files?: File[] }) => boolean;
      share?: (data: { files?: File[]; title?: string }) => Promise<void>;
    };
    const file = new File([blob], filename, {
      type: blob.type || 'application/octet-stream',
    });
    if (
      typeof nav.share === 'function' &&
      typeof nav.canShare === 'function' &&
      nav.canShare({ files: [file] })
    ) {
      try {
        await nav.share({ files: [file], title: filename });
        return; // 已交给系统（可能已保存，用户也可能取消了分享）
      } catch (err) {
        // 用户主动取消分享面板时静默退出，其余错误继续走下载兜底
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
  }

  // 3) 浏览器直接下载：Android Chrome（含 PWA standalone）会自动存入系统「下载」文件夹，
  //    桌面 Safari/Firefox 也会存入默认下载目录——即 Chambre downloadBlob 同款机制
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export async function saveText(text: string, filename: string, mime: string): Promise<void> {
  return saveBlob(new Blob([text], { type: `${mime};charset=utf-8` }), filename);
}

// 压缩图片
/**
 * 生成**预览图**（存进 IndexedDB 的那一份）。
 *
 * v4.7.8 把默认值从 1600 / q0.82 提到 **2560 / q0.9**：原来 4000px 的手机照片会被砍到
 * 1600px（长边只剩 1/2.52、像素只剩 15.7%），满屏还行、一放大就糊（实测 PSNR 35.3dB）。
 * 现在长边 2560、q0.9，日常显示与放大都够清楚，体积约为原来的 5 倍（一张 12MP 照片
 * 实测 164KB → 859KB）。想完全不降分辨率的，用上传处的「存原图」开关另存一份原图。
 *
 * 小于 500KB 的图片**原样返回**（连缩放都不做）——这条保留：那类图本来就不大，
 * 再压只会白掉画质。`storeImage` 会识别这种「原样返回」并跳过重复存原图。
 */
export async function compressImage(blob: Blob, maxSide = 2560, quality = 0.9): Promise<Blob> {
  if (blob.size < 500 * 1024) return blob; // < 500KB 不压缩
  const img = await blobToImage(blob);
  let { width, height } = img;
  if (width > maxSide || height > maxSide) {
    if (width > height) {
      height = (height / width) * maxSide;
      width = maxSide;
    } else {
      width = (width / height) * maxSide;
      height = maxSide;
    }
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return blob;
  ctx.drawImage(img, 0, 0, width, height);
  return new Promise((resolve) => {
    canvas.toBlob(
      (b) => resolve(b || blob),
      blob.type.includes('png') ? 'image/png' : 'image/jpeg',
      quality,
    );
  });
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}

// 字符串摘要
export function excerpt(s: string, n = 120): string {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n) + '…' : t;
}

// 从 Markdown 提取纯文本
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[\[([^\]|]+)(?:\|[^\]]*)?\]\]/g, '$1') // 双链 [[标题|别名]] → 标题
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~]+/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}
