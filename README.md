# VidaOS

> 你的私密生活记录空间 —— **暗夜书房**风格，纯本地离线运行，数据完全属于你自己。

![VidaOS v3.0](https://img.shields.io/badge/version-3.0-6A080E?style=flat-square) ![Tech](https://img.shields.io/badge/stack-React%20%2B%20TS%20%2B%20Tailwind-947D75?style=flat-square) ![License](https://img.shields.io/badge/license-Personal-BCAAA8?style=flat-square)

---

## ✦ 暗夜书房 · 设计语言

V3.0 的视觉灵感来自一个私人书房里最安静的时刻——老打字机、陈年波尔多酒、烛光、羊皮纸、旧木桌。色板由用户亲自挑选：

| Token | 色值 | 含义 |
|------|------|------|
| `ink` | `#1B1A1F` | 深夜紫黑——主背景 |
| `wood` | `#341915` | 暗咖啡——副背景/卡片底 |
| `wine` | `#6A080E` | 暗酒红——强调色（克制使用） |
| `bronze` | `#947D75` | 古铜枯叶——次要文字、辅助元素 |
| `paper` | `#BCAEAA` | 旧纸米色——主要文字 |
| `candle` | `#E8C39E` | 烛光暖橘——装饰高光 |
| `moon` | `#F2EBE0` | 月光白——大数字、标题 |

**视觉规则**
- 暗色优先（dark-mode-only），适合长时间阅读；
- 大圆角柔和卡片（20–28px），半透深色 + 极细酒红描边 + 内侧烛光高光；
- 宽松行高（1.85x），大段文字阅读舒适；
- 大号打字机字体呈现时间（`JetBrains Mono`），衬线字体呈现正文（`EB Garamond`）；
- 烛光环境：屏幕底部一抹极淡的暖色光晕渐变；
- 暗酒红 `#6A080E` 只在按钮、链接、标签、选中态使用，绝不滥用；
- 无炫光、无渐变特效、无大阴影（用透明度区分层级）。

**字体组合**
- 显示/数字：`JetBrains Mono`（打字机风，等宽）
- 正文/标题：`EB Garamond`（衬线，长时间阅读）
- UI 元素：`Inter`（无衬线）

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

---

## ✦ 功能一览

### 桌面（首页）
- **大时间日期标题区**：打字机风大时钟（HH:MM 巨型数字）+ 优雅日期 + 问候语 + 个性签名；
- **网格功能图标**：空间 / 动态 / 信箱 / 收藏夹 四个入口（中文 + 英文标签、细线线性图标）；
- **日历卡片**（双卡式）：月历（事项日打点，点日期即选中）+ 当日日程面板（完成勾选、新增、编辑、删除）；
- **音乐播放器卡片**：内置「夜雨」「烛光」音景（WebAudio 生成）+ 本地音频导入、播放/上下首/进度/音量；
- **底部 Tab 导航**：桌面 / 便签 / 数据 / 设置。

### 空间
- 长文创作空间，支持 **Markdown** + **合集**（分组整理文章）；
- 新建 / 编辑 / 删除文章与合集，可带图发布、打标签、设封面（首图自动设封面）、收藏。

### 动态
- 朋友圈式的短内容存放地，可带多图（1/2/3+ 自适应网格）。

### 信箱
- 重要信件 + 照片，**未读火漆** 提示（红点呼吸动画）。

### 收藏夹
- 跨类型收藏空间文章 / 动态 / 信件，统一查看。

### 便签
- **灵感 / 日程 / 待办** 三块，**顶部导航下带分区滑块**（滑动指示器有酒红微光）；
- 分类筛选 + 增删改 + 分类管理（双击标签重命名，× 删除）；
- 日程可选日期与时间，**自动同步到首页日历**（事项日打点）。

### 数据
- **本地持久化**（IndexedDB，图片 / 音频以 Blob 存储）；
- **导出**：JSON（含图片内嵌为 Base64，可完整恢复）/ TXT / Markdown / PDF（米色衬线排版，可打印或留档）；
- **可选择备份范围**：全部 / 文章 / 动态 / 信件 / 便签；
- **导入**：JSON 备份（合并 / 覆盖）、Markdown（按 # 标题分篇）、TXT（单篇）。

### 设置
- 个人主页：头像（压缩到 512px / 0.85 质量）、背景（5 套预设渐变 / 自定义图）、个性签名、昵称。

---

## ✦ 编辑器（核心）

全屏沉浸式 Markdown 编辑器：

- **丝滑输入** —— 原生 `textarea`，`caret-color` 烛光橘、1.95 倍行距、宽松留白，中文输入法（IME）无卡顿；
- **Markdown 工具栏**（加粗 / 斜体 / 标题 / 列表 / 引用 / 代码 / 链接 / 图片 / 分割线）；
- **写作 / 预览切换**，预览用 `marked + DOMPurify` 净化渲染；
- **图片附件**：多选上传，>500KB 自动压缩到 1600px / 0.82 质量；
- **字数统计**（排除 Markdown 标记）；
- **收藏星标**（编辑文章/信件时直接收藏）；
- 标签管理、合集归属（仅文章）。

---

## ✦ 开始使用

### 最省事的方式：双击 `打开VidaOS.command`

直接双击项目根目录下的 **`打开VidaOS.command`** 即可 —— 它会自动检查依赖、启动服务并打开浏览器。保持那个终端窗口开着就能一直用，关掉窗口服务就停了。

> ⚠️ 不要双击 `index.html`。它是 Vite 的入口模板（引用的是 `src/main.tsx` 源码），用 `file://` 打开必然白屏，必须经由 HTTP 服务访问。

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

- 全部数据保存在浏览器本地 **IndexedDB**，不上传任何服务器；
- 图片 / 音频以 Blob 存储在 `files` 表，导出 JSON 时自动内嵌为 Base64；
- **无追踪、无分析、无广告**，完全离线可用；
- **建议每周**在「数据 → 导出 → JSON（全量）」做一次完整备份，下载到本地或云盘。
- 清理浏览器缓存或换浏览器时，先导出再导入。

---

## ✦ 项目结构

```
VidaOS/
├── public/
│   ├── favicon.svg              # 站点图标（蜡烛+酒红火焰）
│   └── icons/                   # PWA 图标
│       ├── icon-192.png
│       ├── icon-512.png
│       ├── icon-512-maskable.png
│       └── apple-touch-icon.png
├── scripts/
│   └── make-icons.mjs           # 用 sharp 生成 PWA 图标
├── src/
│   ├── main.tsx                 # React 入口
│   ├── App.tsx                  # 路由 + 全局布局
│   ├── styles/globals.css       # 全局样式 + 设计 token + Markdown 排版
│   ├── types/index.ts           # 所有数据类型定义
│   ├── lib/
│   │   ├── db.ts                # Dexie 封装：state + files
│   │   ├── fileUrl.ts           # Blob → objectURL 缓存
│   │   ├── markdown.ts          # marked + DOMPurify
│   │   ├── exportImport.ts      # JSON / TXT / MD / PDF 导入导出
│   │   └── utils.ts             # 时间、ID、压缩等工具
│   ├── stores/
│   │   ├── useAppStore.ts       # 全局业务数据（zustand）
│   │   ├── useUIStore.ts        # UI 状态（tab、editor、toast、modal）
│   │   └── useMusicStore.ts     # 音乐播放器状态
│   ├── components/
│   │   ├── layout/              # Background / TopBar / BottomTabBar
│   │   ├── home/                # 桌面页：Clock / Feature / Calendar / DaySchedule / Music
│   │   ├── notes/               # Segmented / CategoryChips / Inspiration / Schedule / Todo
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage
│   └── pages/                   # 11 个路由页面
│       ├── DeskPage.tsx
│       ├── NotesPage.tsx
│       ├── SpacePage.tsx
│       ├── CollectionPage.tsx
│       ├── ArticleReaderPage.tsx
│       ├── MomentsPage.tsx
│       ├── MailboxPage.tsx
│       ├── LetterReaderPage.tsx
│       ├── FavoritesPage.tsx
│       ├── DataPage.tsx
│       └── SettingsPage.tsx
├── index.html
├── package.json
├── package-lock.json            # 依赖锁定（npm ci 可复现安装）
├── vite.config.ts               # 含 PWA 配置（vite-plugin-pwa）
├── tailwind.config.js           # 暗夜书房色板
├── postcss.config.js
├── tsconfig.json
├── docs/                        # 界面预览截图（见上方「界面预览」）
│   ├── preview-v3-desk.png
│   ├── preview-v3-notes.png
│   ├── preview-v3-space.png
│   ├── preview-v3-settings.png
│   └── preview-v3-mobile.png
├── 打开VidaOS.command             # 双击即启动服务并打开浏览器
├── README.md                    # 本文件
└── PROJECT_MEMORY.md            # 项目记忆与交接文档
```

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
| jsPDF + html2canvas | PDF 导出（米色衬线排版） |
| date-fns | 日期处理（备用） |
| lucide-react | 细线线性图标库 |
| vite-plugin-pwa | Service Worker + manifest 生成 |

---

## ✦ 键盘与可访问性

- 键盘聚焦：所有按钮、链接、输入框支持 Tab 焦点；
- 焦点环：酒红/烛光色 2px outline；
- 减少动效：尊重 `prefers-reduced-motion` 媒体查询；
- 安全区：移动端 `env(safe-area-inset-*)` 适配刘海/底部小白条；
- IME：textarea 中文输入法无卡顿（无 onComposition 干扰）。

---

## ✦ 已知限制

1. 浏览器本地隔离：不同浏览器 / 设备之间需手动「导出 → 导入」同步；
2. 无多用户、无加密存储（敏感内容请自行斟酌）；
3. PDF 通过 `html2canvas + jsPDF` 截屏生成，**超长内容会自动分页**（基于像素），但极端复杂的排版可能与 Markdown 渲染有 1-2px 误差；
4. 浏览器存储配额约 50MB–数 GB（视浏览器而异），大量图片时请定期清理或导出后清空。

---

## ✦ 致谢与许可

- 本项目是个人项目，仅供个人使用；
- 字体：Google Fonts（`EB Garamond` / `JetBrains Mono` / `Inter`）遵循 OFL 协议；
- 图标：lucide-react 遵循 ISC 协议；
- 其他依赖遵循各自开源协议。

---

**记录生活的每一刻，让回忆有迹可循。**
