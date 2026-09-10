// 文件 URL 缓存与解析
import { getFile } from './db';

const urlCache = new Map<string, string>();
const failed = new Set<string>();

export async function fileURL(id: string | undefined | null): Promise<string | null> {
  if (!id) return null;
  if (failed.has(id)) return null;
  if (urlCache.has(id)) return urlCache.get(id)!;
  try {
    const file = await getFile(id);
    if (!file) {
      failed.add(id);
      return null;
    }
    const url = URL.createObjectURL(file.blob);
    urlCache.set(id, url);
    return url;
  } catch {
    failed.add(id);
    return null;
  }
}

export function revokeFileURL(id: string): void {
  const url = urlCache.get(id);
  if (url) {
    URL.revokeObjectURL(url);
    urlCache.delete(id);
  }
  failed.delete(id);
}

export function clearFileURLCache(): void {
  urlCache.forEach((u) => URL.revokeObjectURL(u));
  urlCache.clear();
  failed.clear();
}
