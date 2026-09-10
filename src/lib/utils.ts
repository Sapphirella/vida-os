// 通用工具函数

export function uid(prefix = ''): string {
  const r = Math.random().toString(36).slice(2, 10);
  const t = Date.now().toString(36);
  return `${prefix}${t}${r}`;
}

export function now(): number {
  return Date.now();
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

export function throttle<T extends (...args: any[]) => any>(fn: T, ms: number): T {
  let last = 0;
  return ((...args: any[]) => {
    const now = Date.now();
    if (now - last >= ms) {
      last = now;
      fn(...args);
    }
  }) as T;
}

export function formatDate(d: Date | number, fmt = 'YYYY-MM-DD'): string {
  const date = typeof d === 'number' ? new Date(d) : d;
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return fmt
    .replace('YYYY', String(y))
    .replace('MM', m)
    .replace('DD', day)
    .replace('HH', hh)
    .replace('mm', mm);
}

export function todayKey(d: Date = new Date()): string {
  return formatDate(d, 'YYYY-MM-DD');
}

export function isSameDay(a: Date | number, b: Date | number): boolean {
  const da = typeof a === 'number' ? new Date(a) : a;
  const db2 = typeof b === 'number' ? new Date(b) : b;
  return (
    da.getFullYear() === db2.getFullYear() &&
    da.getMonth() === db2.getMonth() &&
    da.getDate() === db2.getDate()
  );
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

// 压缩图片
export async function compressImage(blob: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
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
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_~]+/g, '')
    .replace(/\n+/g, ' ')
    .trim();
}
