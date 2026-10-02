/**
 * 复制文本到剪贴板（带降级路径）
 *
 * 为什么必须有降级：navigator.clipboard 只在「安全上下文」下存在 —— HTTPS，
 * 或者 localhost。用局域网 IP 走明文 http（http://192.168.1.5:5173）访问时，
 * navigator.clipboard 整个是 undefined，navigator.clipboard.writeText 会直接抛
 * TypeError，于是所有「复制」按钮一律提示失败（用户实测反馈）。
 *
 * 这不是代码 bug，是浏览器的安全策略：明文 http 下页面拿不到剪贴板权限，
 * 改不掉只能绕。所以任何需要复制的地方都要走这个函数，不能直接调
 * navigator.clipboard。
 *
 * 降级走 execCommand('copy')：建一个离屏 textarea 装文本、全选、复制、移除。
 * 这条老路不要求安全上下文。注意离屏节点必须留在文档内、且不能是
 * display:none / visibility:hidden —— iOS 上那样选不中，只能移到屏幕外。
 */

/**
 * writeText 的等待上限（ms）。
 *
 * 除了「API 不存在」这个显性失败，writeText 还有个更隐蔽的：文档失焦或
 * 没有瞬时用户激活时，它既不 resolve 也不 reject —— 按钮点了完全没反应，
 * 连报错都没有。不设上限的话，一次卡死就再也复制不了了。
 */
const TIMEOUT = 1200;

/** 给 promise 加超时上限；超时返回 null（与「失败」区分：null = 没结论） */
function withTimeout(p: Promise<unknown>, ms: number): Promise<unknown | null> {
  return Promise.race([
    // 顺手吃掉 rejection，避免超时降级之后原来的 promise 再抛一次未捕获错误
    p.then(
      () => true,
      () => null,
    ),
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}

/**
 * @returns 是否成功写入剪贴板
 */
export async function copyText(text: string): Promise<boolean> {
  if (!text) return false;
  try {
    const api = navigator.clipboard;
    if (api?.writeText) {
      // 这段必须在用户手势里同步发起，所以不能先 await 别的
      if ((await withTimeout(api.writeText(text), TIMEOUT)) !== null) return true;
    }
  } catch {
    // 权限被拒 / 非用户手势触发等，落到下面的老路
  }
  return legacyCopy(text);
}

/** execCommand 降级。同步执行，返回是否成功。 */
function legacyCopy(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('readonly', '');
  // 移到屏幕外而不是 display:none：后者在 iOS 上无法 select，复制会静默失败
  ta.style.cssText =
    'position:fixed;top:0;left:0;width:1px;height:1px;padding:0;border:0;' +
    'opacity:0;pointer-events:none;';
  document.body.appendChild(ta);
  try {
    ta.focus({ preventScroll: true });
    ta.select();
    // iOS 10+ 只认显式 setSelectionRange 之后的 execCommand
    ta.setSelectionRange(0, text.length);
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}
