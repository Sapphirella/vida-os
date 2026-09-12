# VidaOS

> 你的私密生活记录空间 —— **暗夜书房**风格，纯本地离线运行，数据完全属于你自己。

![Version](https://img.shields.io/badge/version-3.x-6A080E?style=flat-square) ![Tech](https://img.shields.io/badge/stack-React%20%2B%20TS%20%2B%20Tailwind-947D75?style=flat-square) ![License](https://img.shields.io/badge/license-Personal-BCAAA8?style=flat-square)

---

## ✦ 暗夜书房 · 设计语言

视觉灵感来自私人书房里最安静的时刻——老打字机、陈年波尔多酒、烛光、羊皮纸、旧木桌。
色板由用户亲自挑选，并在后续迭代中扩展：

| Token | 色值 | 含义 |
|------|------|------|
| `ink` | `#1B1A1F` | 深夜紫黑 —— 主背景 |
| `charcoal` | `#2A292E` | 炭黑 —— **上层卡片**，比 ink 亮一档做层级 |
| `wood` | `#341915` | 暗咖啡 —— 副背景 |
| `wine` | `#6A080E` | 暗酒红 —— 强调色（克制使用） |
| `wine.bright` | `#8C1117` | 深一档酒红 —— 危险 / 删除 |
| `bronze` | `#947D75` | 古铜枯叶 —— 次要文字、辅助元素 |
| `paper` | `#BCAEAA` | 旧纸米色 —— 主要文字 |
| `candle` | `#E8C39E` | 烛光暖橘 —— 装饰高光 |
| `moon` | `#F2EBE0` | 月光白 —— 大数字、标题 |
| `amber` | `#C9A063` | 陈年琥珀 —— 高亮 / 星标 / 选中 |
| `parchment` | `#D8C3A8` | 旧羊皮 —— 引文 / 代码底色 |
| `ash` | `#8A858C` | 灰雾 —— 禁用 / 元信息 |
| `olive` | `#6E7355` | **语义 · 成功** |
| `sapphire` | `#5C6B8C` | **语义 · 信息** |
| `line` | `#4A3F3C` | 描边 / 分隔线 |

**视觉规则**
- 暗色优先（dark-mode-only），适合长时间阅读；
- 大圆角柔和卡片（20–28px），半透深色 + 极细描边 + 内侧烛光高光；
- 宽松行高（正文 1.85x / 阅读 1.95x），大段文字阅读舒适；
- 大号打字机字体呈现时间（`JetBrains Mono`），衬线字体呈现正文（`EB Garamond`）；
- 烛光环境：屏幕底部一抹极淡的暖色光晕渐变；
- 暗酒红 `#6A080E` 只在按钮、链接、标签、选中态使用，绝不滥用；
- 无炫光、无渐变特效、无大阴影（用透明度区分层级）。

**字体组合**
- 显示/数字：`JetBrains Mono`（打字机风，等宽）
- 正文/标题：`EB Garamond`（衬线，长时间阅读）
- UI 元素：`Inter`（无衬线）

**背景与栏色**
设置里有 5 套背景预设（夜半 / 酒红 / 旧纸 / 烛光 / 深紫）与自定义图片。
背景本身只在卡片缝隙里露出，所以预设**同时会改变顶栏与底栏的颜色**，切换时一眼可见。

---

## ✦ 界面预览

**桌面（首页）** —— 大时钟 Hero + 功能宫格 + 双卡日历/日程 + 音景播放器

![桌面](docs/preview-v3-desk.png)

| 便签 | 空间 |
|------|------|
| ![便签](docs/preview-v3-notes.png) | ![空间](docs/preview-v3-space.png) |

| 设置 | 移动端 |
|------|--------|
| ![设置](docs/preview-v3-settings.png) | ![移动端](docs/preview-v3-mobile.png) |

> 截图取自 v3.0；此后界面有若干调整（见 `PROJECT_MEMORY.md` 变更日志）。

---

## ✦ 功能一览

### 桌面（首页）
- **大时间日期标题区**：打字机风大时钟 + 日期 + 问候语 + 个性签名；
- **功能宫格**：空间 / 动态 / 信箱 / 收藏夹 四个入口；
- **日历 + 当日日程（双卡）**：月历事项日打点，**点击日期右侧日程会跟着切换**；
- **音景播放器**：内置「夜雨」「烛光」（WebAudio 实时合成）+ 本地音频导入、播放/暂停/上下首/进度/音量；
- **底部 Tab**：桌面 / 便签 / 数据 / 设置。

### 空间
- Markdown 长文 + **合集**分组 + 标签 + 封面；
- 配图可**插入正文**（编辑器缩略图上的「插入正文」按钮会插入 `![说明](fileRef:图片id)`），
  也可以留在文章下方；缩略图支持**拖拽排序**。

### 动态
- **时间线**布局：按日期分组（今天 / 昨天 / M 月 D 日）+ 左侧竖线节点；
- 每条显示**头像与昵称**，支持 **Markdown**、多图、**评论**、**收藏**；
- **编辑**：可修改内容与图片，**并可直接修改发布时间**（便于补记过去的事）；
- **查找与替换**：顶部「查找替换」条，命中高亮、上下跳转、替换 / 全部替换。

### 信箱
- 信件（**有标题**）+ 照片 + 未读火漆呼吸提示。

### 收藏夹
- 跨类型聚合收藏的空间文章 / 动态 / 信件。

### 便签
- **灵感 / 日程 / 待办** 三块，顶部滑块切换；
- 分类筛选 + 增删改（双击标签重命名）；
- 日程可选日期时间，**自动同步到首页日历**。

### 数据
- **导出**：JSON（图片内嵌 Base64，可完整恢复）/ TXT / Markdown / PDF；
  **导出范围可多选**：空间文章 / 动态 / 信箱 / 便签 / **收藏夹** / **个人资料**；
- **PDF**：米色衬线排版、内嵌配图、页脚页码；导出范围可选；
- **本地文件夹快照备份**：选一个本地文件夹，一键保存当前全部数据的快照；
  **最多保留 10 份，超出自动删除最早的一份**；手动导出的文件不占用快照额度；
  文字用 gzip 压缩、图片按原样存放（不做 Base64，省约 33% 体积）；
- **导入**：JSON 备份（合并 / 覆盖）、Markdown（按 `#` 分篇）、TXT。

### 设置
- 头像（压缩到 512px）、背景（5 套预设 / 自定义图）、昵称、个性签名。

---

## ✦ 编辑器（核心）

全屏沉浸式 Markdown 编辑器：

- **丝滑输入** —— 原生 `textarea`，`caret-color` 烛光橘、1.95 倍行距、宽松留白，中文输入法无卡顿；
- **Markdown 工具栏**（加粗 / 斜体 / 标题 / 列表 / 引用 / 代码 / 链接 / 图片 / 分割线）；
- **写作 / 预览切换**，预览用 `marked + DOMPurify` 净化渲染；
- **图片附件**：多选上传，>500KB 自动压缩到 1600px / 0.82 质量；
- **插入正文**：把配图插到光标位置（`fileRef:` 语法），插入后缩略图带标记；
- **拖拽排序**：直接拖动缩略图调整图片顺序；
- **字数统计**（排除 Markdown 标记）；
- **收藏星标**（编辑已有文章 / 信件时可直接收藏）；
- 标签与合集归属（仅文章）；动态可修改发布时间。

---

## ✦ 开始使用

### 最省事的方式：双击 `打开VidaOS.command`

直接双击项目根目录下的 **`打开VidaOS.command`** —— 它会自动检查依赖、启动服务并打开浏览器。
保持那个终端窗口开着就能一直用，关掉窗口服务就停了。

> ⚠️ 不要双击 `index.html`。它是 Vite 的入口模板（引用的是 `src/main.tsx` 源码），
> 用 `file://` 打开必然白屏，必须经由 HTTP 服务访问。

### 前置要求
- Node.js ≥ 18
- 现代浏览器（Chrome 90+ / Safari 14+ / Edge 90+）

### 1. 安装依赖

```bash
cd "/Users/amarisgo/Documents/DeepSeek Harness/VidaOS"
npm install
```

### 2. 开发模式

```bash
npm run dev
```

打开 http://localhost:5173 即可看到。开发模式下 Service Worker 默认不注册。

手机预览：与电脑连同一 Wi-Fi，访问终端里打印的 `Network:` 地址（形如 `http://192.168.x.x:5173`）。

### 3. 构建生产版本

```bash
npm run build
```

产物在 `dist/`，可部署到任何静态托管。

### 4. 预览生产版本

```bash
npm run preview
```

打开 http://localhost:4173 ，Service Worker 已注册，可测试 PWA 安装。

### 5. PWA 部署

把 `dist/` 整个目录上传到任意静态托管：

- **Vercel**：`vercel --prod`
- **Netlify**：拖拽 `dist/` 到 dashboard
- **GitHub Pages**：`dist/` 推到 `gh-pages` 分支
- **Cloudflare Pages**：`wrangler pages deploy dist`
- **自建服务器**：Nginx 配置 root 指到 `dist/`

部署后用 Chrome / Edge 打开站点，地址栏右侧会出现「安装」图标，可安装为独立应用。

### 6. iOS Safari 安装

用 Safari 打开部署后的 URL，点底部分享按钮 → **添加到主屏幕**。会作为独立应用运行，全屏沉浸式。

---

## ✦ 数据与隐私

- 全部数据保存在浏览器本地 **IndexedDB** 中，不上传任何服务器；
- 图片 / 音频以 Blob 存储，导出 JSON 时自动内嵌为 Base64；
- **无追踪、无分析、无广告**，完全离线可用；
- 两种备份方式：
  1. **本地文件夹快照**（推荐）：在「数据」页选定一个文件夹，一键保存，最多保留 10 份；
     文字经过 gzip 压缩、图片按原样存放，体积最小；
  2. **手动导出**：JSON 全量备份下载到本地或云盘，不计入快照额度；
- 清理浏览器缓存或换浏览器时，先备份再导入。

---

## ✦ 项目结构

```
VidaOS/
├── 打开VidaOS.command           # 双击即启动服务并打开浏览器
├── index.html                   # Vite 入口模板（勿双击）
├── src/                         # 50 个文件
│   ├── main.tsx                 # 入口：错误边界 > HashRouter > App
│   ├── App.tsx                  # 全局布局 + 路由 + tab 同步
│   ├── styles/globals.css       # 设计 token + 全局样式 + Markdown 排版
│   ├── types/index.ts           # 数据类型定义
│   ├── lib/
│   │   ├── db.ts                # Dexie（state / files / meta）
│   │   ├── fileUrl.ts           # Blob → objectURL 缓存
│   │   ├── markdown.ts          # marked + DOMPurify（支持 fileRef:）
│   │   ├── exportImport.ts      # JSON / TXT / MD / PDF 导入导出
│   │   ├── snapshot.ts          # 本地文件夹快照备份
│   │   ├── backgrounds.ts       # 背景预设与栏色
│   │   └── utils.ts             # 时间 / ID / 压缩 / 文本工具
│   ├── stores/                  # useAppStore / useUIStore / useMusicStore
│   ├── components/
│   │   ├── layout/              # Background / TopBar / BottomTabBar
│   │   ├── home/                # ClockHeader / FeatureGrid / CalendarCard / DayScheduleCard / MusicPlayerCard
│   │   ├── notes/               # SegmentedControl / CategoryChips / Inspiration / Schedule / Todo / ScheduleEditor
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage
│   │                            #   + ErrorBoundary / MarkdownView
│   └── pages/                   # 11 个路由页面
├── public/                      # favicon + PWA 图标
├── scripts/make-icons.mjs       # 生成 PWA 图标（需自行安装 sharp）
├── docs/                        # 界面预览截图 + 色板依据
├── PROJECT_MEMORY.md            # 项目记忆与交接文档（改代码前请先读它）
└── 配置文件：vite.config.ts / tailwind.config.js / postcss.config.js / tsconfig.json
```

> V2.1 旧应用（原生 HTML/CSS/JS 版本）已不在工作区，但永久保留在 git 历史里：
> `git checkout 4377d94 -- archive/v2` 即可取回。

---

## ✦ 技术栈

| 技术 | 用途 |
|------|------|
| Vite 5 | 构建工具（dev server、build） |
| React 18 + TypeScript | UI 框架 + 类型系统 |
| TailwindCSS 3 | 样式系统（设计 token 化） |
| Zustand | 轻量状态管理 |
| React Router 6 | Hash 路由 |
| Dexie 4 | IndexedDB 友好包装 |
| marked + DOMPurify | Markdown 渲染 + HTML 净化 |
| jsPDF + html2canvas | PDF 导出（米色衬线排版 + 内嵌图片 + 页码） |
| lucide-react | 细线线性图标库 |
| vite-plugin-pwa | Service Worker + manifest 生成 |

---

## ✦ 键盘与可访问性

- 键盘聚焦：按钮、链接、输入框支持 Tab 焦点；
- 焦点环：酒红 / 烛光色 2px outline；
- 减少动效：尊重 `prefers-reduced-motion`；
- 安全区：移动端 `env(safe-area-inset-*)` 适配；
- IME：textarea 中文输入法无卡顿；
- **错误边界**：渲染出错不再白屏，而是给出「重试 / 回到桌面 / 重新加载 / 复制错误详情」。

---

## ✦ 已知限制

1. 浏览器本地隔离：不同浏览器 / 设备之间需手动「导出 → 导入」同步；
2. 无多用户、无加密存储（敏感内容请自行斟酌）；
3. PDF 通过 `html2canvas + jsPDF` 生成（整篇渲成一张长图再按页切片），
   分页切点会避开文字行，因此不会把一行字切成两页；但**当下一块是接近整页高的图片时，
   上一页可能提前收尾、留出较多空白**；
4. 本地文件夹快照需要浏览器支持 File System Access API（Chrome / Edge）；
   Safari / Firefox 下请改用 JSON 导出；
5. 浏览器存储配额约 50MB–数 GB（视浏览器而异），大量图片时请定期清理或导出后清空。

---

## ✦ 致谢与许可

- 本项目是个人项目，仅供个人使用；
- 字体：Google Fonts（`EB Garamond` / `JetBrains Mono` / `Inter`）遵循 OFL 协议；
- 图标：lucide-react 遵循 ISC 协议；
- 其他依赖遵循各自开源协议；
- V2.x 曾借鉴 [InternalBeyond-Mobile](https://github.com/Sui-IB/InternalBeyond-Mobile)
  （PolyForm Noncommercial 1.0.0），V3 起完全自研。

---

**记录生活的每一刻，让回忆有迹可循。**
