#!/bin/bash
# ============================================================
#  VidaOS 一键启动
#  双击本文件即可在浏览器中打开 VidaOS。
#  保持这个终端窗口开着就能一直用；关闭窗口或按 Control-C 即停止。
# ============================================================

cd "$(dirname "$0")" || exit 1

# 双击运行时 PATH 很短，补上 Node 常见的安装位置
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:$PATH"

PORT=5173
URL="http://localhost:$PORT"

# 局域网地址（供手机等同一 Wi-Fi 设备访问；优先有线/无线网卡）
LAN_URL=""
for IFACE in en0 en1; do
  IP=$(ipconfig getifaddr "$IFACE" 2>/dev/null)
  if [ -n "$IP" ]; then
    LAN_URL="http://$IP:$PORT"
    break
  fi
done

# 打开浏览器（测试时可用 VIDAOS_DRY_RUN=1 跳过）
open_url() {
  if [ -n "$VIDAOS_DRY_RUN" ]; then
    echo "[dry-run] 本应打开：$1"
  else
    open "$1"
  fi
}

# 访问地址提示：open 在极端情况下会静默丢事件（Chrome 未就绪时），
# 一定要把地址印出来让用户有兜底，并顺带给出手机端入口。
print_hint() {
  echo
  if [ -n "$LAN_URL" ]; then
    echo "📍 手机访问（需与电脑连同一 Wi-Fi 或同一热点的设备）"
    echo "   $LAN_URL"
  fi
  echo "如果浏览器没有自动弹出，请手动复制地址到浏览器打开：$URL"
  echo
}

echo "✦ VidaOS — 暗夜书房"
echo

# 1) 服务已在运行？直接打开浏览器即可
if curl -s -o /dev/null --max-time 1 "$URL"; then
  echo "服务已在运行，打开浏览器…"
  open_url "$URL"
  print_hint
  echo "──────────────────────────────────────────"
  echo "  地址：$URL"
  echo "（服务仍在后台运行，本窗口稍后可关闭）"
  echo "──────────────────────────────────────────"
  # 留 2 秒让用户看清提示，避免“双击一闪而过、以为没反应”
  sleep 2
  exit 0
fi

# 2) 检查 Node / npm
if ! command -v npm >/dev/null 2>&1; then
  echo "❌ 找不到 npm。请先安装 Node.js：https://nodejs.org"
  echo
  read -r -p "按回车键关闭…"
  exit 1
fi

# 3) 首次运行：先装依赖
if [ ! -d node_modules ]; then
  echo "首次运行，正在安装依赖（可能需要几分钟，请耐心等待）…"
  if ! npm install; then
    echo "❌ 依赖安装失败，请检查网络。"
    read -r -p "按回车键关闭…"
    exit 1
  fi
fi

# 4) 启动开发服务器并等待就绪
echo "正在启动服务…"
npm run dev &
SERVER_PID=$!

# 关窗口 / Control-C 时一并停掉服务，避免留下后台进程
trap 'kill $SERVER_PID 2>/dev/null' EXIT INT TERM

for _ in $(seq 1 60); do
  sleep 1
  if curl -s -o /dev/null --max-time 1 "$URL"; then
    echo
    echo "✅ 已就绪"
    open_url "$URL"
    print_hint
    echo "──────────────────────────────────────────"
    echo "  地址：$URL"
    echo "  保持本窗口打开即可继续使用"
    echo "  关闭窗口或按 Control-C 停止服务"
    echo "──────────────────────────────────────────"
    wait $SERVER_PID
    exit 0
  fi
done

echo
echo "❌ 启动超时。请检查上面的报错信息，或手动运行：npm run dev"
read -r -p "按回车键关闭…"
exit 1