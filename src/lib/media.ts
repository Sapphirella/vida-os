// 图片入库的单一入口（v4.7.8）
//
// 为什么要收口：以前 5 个上传入口各写一遍「compressImage + uid + putFile」——
//   - 「压到多大」散在 5 处（改一次画质要改 5 个地方，还容易漏）；
//   - mime 被写死成 `'image/jpeg'`，可 PNG 输入产出的其实是 PNG blob，
//     于是从灯箱「保存图片」时扩展名是错的（内容没事，名字骗人）。
//
// 现在的规则（跟用户确认过的方案）：
//   - 记录里引用的 id 永远是**预览图**（长边 2560 / q0.9）—— 正文、列表、相册网格都用它，
//     够清楚、又不会让页面一次拽出几十张几 MB 的图；
//   - 开了「存原图」时，额外写一份**兄弟文件** `<baseId>__orig`，只有灯箱、保存图片、
//     备份用它。兄弟文件不被任何记录引用，靠 `collectFileIds` 统一收集 ——
//     所以备份/WebDAV/快照都会带上它，而「清除缓存」也不会把它当孤儿删掉。
import { compressImage, uid } from '@/lib/utils';
import { deleteFile, getFile, putFile } from '@/lib/db';

/** 原图兄弟文件的 id 后缀（唯一的约定处，别在别处硬拼字符串） */
export const ORIG_SUFFIX = '__orig';

export function origFileId(id: string): string {
  return id + ORIG_SUFFIX;
}

export interface StoredImage {
  /** 记录里该引用的 id（= 预览图） */
  id: string;
  /** 预览图 blob / mime */
  blob: Blob;
  mime: string;
  /** 是否真的另存了原图（本来就小于压缩门槛时不会重复存） */
  keptOriginal: boolean;
}

/**
 * 把一张图存进 IndexedDB，返回记录该引用的 id。
 *
 * @param keepOriginal 是否额外保存原始分辨率（见 Settings.keepOriginalImages）
 */
export async function storeImage(
  file: File | Blob,
  opts: { name?: string; keepOriginal?: boolean } = {},
): Promise<StoredImage> {
  const id = uid('img_');
  const blob = await compressImage(file);
  // 用 blob 自己的类型，不要写死 image/jpeg（PNG 会被存成 .jpg 的名字）
  const mime = blob.type || file.type || 'image/jpeg';
  const ext = (mime.split('/')[1] || 'jpg').replace('jpeg', 'jpg');
  const name = opts.name || (file instanceof File && file.name ? file.name : `${id}.${ext}`);

  await putFile({ id, blob, mime, name, size: blob.size });

  // 「原样返回」= 本来就小于压缩门槛（见 compressImage 注释）→ 预览图就是原图，别再存一份
  const noop = blob.size === file.size && (blob.type || '') === (file.type || '');
  const keptOriginal = Boolean(opts.keepOriginal) && !noop;
  if (keptOriginal) {
    await putFile({
      id: origFileId(id),
      blob: file,
      mime: file.type || mime,
      name,
      size: file.size,
    });
  }

  return { id, blob, mime, keptOriginal };
}

/**
 * 删除一张图（含它的原图兄弟）。
 *
 * 为什么必须成对删：记录只引用预览图，原图兄弟不被任何记录引用 ——
 * 只删预览图的话原图就成了孤儿（虽然「清除缓存」最终会回收它，但在那之前一直占着空间）。
 * `deleteImage` 是「删图」的唯一入口，新写删除逻辑时用它。
 */
export async function deleteImage(id: string): Promise<void> {
  await Promise.all([
    deleteFile(id).catch(() => {}),
    deleteFile(origFileId(id)).catch(() => {}),
  ]);
}

/**
 * 灯箱 / 保存图片该用哪一份：有原图兄弟就用原图，没有就退回预览图。
 * 返回的仍是 file id，交给 `fileURL()` 解析即可。
 */
export async function fullImageId(id: string): Promise<string> {
  const orig = origFileId(id);
  return (await getFile(orig)) ? orig : id;
}
