# VidaOS - 项目记忆与交接文档

> 项目迭代历史、关键设计决策、架构约定与踩坑记录。**接手前请先读完第 0、1、3 节。**
> 最后更新：2026-09-28 深夜（v4.2.1 日间色板定稿：背景 #fdf2e1 + 卡片 #fce8dd；同日早前已做 v4.2 接手文档校正）

---

## 0. 一页速览（接手先看这里）

| 项目 | 说明 |
|---|---|
| **是什么** | 纯前端、纯本地的个人生活记录 PWA（主页/碎片/便签/文章/动态/收藏/音乐/云备份/Agent） |
| **在哪里** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS`（**父目录含空格，命令里要带引号**） |
| **怎么跑** | 双击 `打开VidaOS.command`；或 `npm run dev` → http://localhost:5173 |
| **怎么构建** | `npm run build`（= `tsc -b && vite build`）→ `dist/`（**已 gitignore，别提交**） |
| **怎么自检** | `npm run typecheck`（已开启 `noUnusedLocals`/`noUnusedParameters`，编译即闸门） |
| **当前版本** | package.json 写的是 `3.0.0`、设置页显示「v3.0 · night study」；文档按迭代日志记到 **v4.2.1**（日间色板定稿） |
| **技术栈** | Vite 5 + React 18 + TS + Tailwind 3 + Zustand + Dexie 4 + PWA + Web Crypto |
| **数据在** | 浏览器 IndexedDB（库名 `vidaos`，表 `state` / `files` / `meta`，Dexie **version 2**）；**无后端、无账号** |
| **主题** | 暗夜书房（默认）/ 白昼书房 / 猩红书房（独立主题）；`localStorage['vidaos-theme']` |
| **云同步** | WebDAV（坚果云等）可选端到端加密；**注意纯浏览器直连坚果云被 CORS 拦截**（见第 8 节） |

### ⚠️ 改动前必读的四条

1. **不要双击 `index.html`** —— 它是 Vite 的入口模板（引用 `src/main.tsx` 源码），
   `file://` 打开必然白屏。必须走 `npm run dev` / `npm run preview`。
2. **用户可能停在旧代码上**：dev server 反复重启后 HMR socket 会断，旧标签页不会自动刷新。
   交付前提醒用户 **`Cmd+Shift+R` 强制刷新**；他报"改了没用"时先怀疑这点。
3. **验证必须真实**：本项目所有改动都用无头 Chrome 走真实 UI 或真实代码路径实测过。
   第 12 节记录了"自检指标写错导致误报成功"的教训，**别只看构建通过就宣布修好**。
4. **动版式/配色前先跟用户确认目标效果**（截图或明确规格），否则极易来回返工 —— 见第 12 节。

---

## 1. 项目基本信息

| 字段 | 值 |
|------|-----|
| **项目名称** | VidaOS —— 暗夜书房 |
| **项目类型** | 纯前端 SPA（个人生活记录），PWA 离线可用 |
| **存放路径** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS` |
| **Git 仓库** | 已初始化，`master` 分支，无 remote（历史都是本地的） |
| **设计语言** | 三书房主题：暗夜（默认）/ 白昼（日间）/ 猩红（独立深色），色板由用户亲自选定 |
| **构建产物** | `dist/`（含 Service Worker + manifest，可 PWA 部署；**已加入 .gitignore**） |
| **历史归档** | V2.1 旧应用已由用户备份并**从工作区删除**；git 历史中永久可取回（见第 6 节） |

---

## 2. 版本演进

- **v1.0（2026-09-07）** —— DuMate 初版：文章 CRUD、Markdown、图片 Base64、导入导出。已被取代。
- **v2.0 / v2.1（2026-09-08）** —— 液态玻璃浅色风格，原生 HTML/CSS/JS（无构建），八大模块。
  曾以 `archive/v2/` → `废案/archive-v2/` 的形式归档；用户已于 2026-09-12 备份后
  **删除了工作区副本**。需要对照这份可直接双击运行的原生应用时：
  `git checkout 4377d94 -- archive/v2`（任选一个提交里的该路径）。
- **v3.0（2026-09-10）** —— 「暗夜书房」重构：推倒重写为 Vite + React + TS + Tailwind + Zustand + Dexie。
- **v3.1 ~ v3.8（2026-09-11 ~ 09-12）** —— 修完 9 项 P0 缺陷、死代码清理、错误边界、
  动态评论/收藏/时间线/查找替换、图片插入正文、导出多选、本地快照备份、配色精进、
  皮肤实验（**已撤销**）、PDF 导出多轮返工（见第 12 节）、信件标题、目录整理。
  详见第 13 节变更日志。
- **v3.9（2026-09-13）** —— `白昼书房` 日间主题；自托管字体（去 Google Fonts CDN，中文 Noto Serif SC）；
  夸克旧内核兼容（legacy 构建 + 3.8s 挂载兜底）；全局查找替换覆盖层（⌘K）+ 三页面页内查找 +
  命中跳转定位（focusRequest）；移动端编辑器改版、待办 textarea/自动置底/拖拽排序；
  日历「今」按钮；评论输入时隐藏底栏与 FAB。
- **v3.10（2026-09-14）** —— `猩红书房` 独立主题（液态玻璃卡片、光效锚点固定）；
  背景预设精简为实色方案（仅保留「深紫」给猩红书房）；删除设置页「背景」区块；
  **移动输入三连修**：重命名改应用内 Modal、查找面板聚焦释放滚动锁、栏色统一 `var(--bar-bg)`
  （真机复测待确认）。
- **v4.0（2026-09-16）** —— **信箱功能整体移除**（数据模型 v4），便签迁入主页宫格；
  底栏改为 **主页 / 日记 / Agent / 数据 / 设置**（日记、Agent 为占位页）；
  新增 **WebDAV 云同步**（gzip 快照上传、配置存设置）+ **端到端加密**（PBKDF2 + AES-256-GCM，
  密文自包含）+ **云端取回**；数据页新增**「备份配置说明书」弹窗**（教程 / 失败详解 / 加密说明 / 提醒）。
- **v4.1（2026-09-18）** —— 主页日程模块下方新增**待办模块**（未完成待办、快速添加/勾选）；
  支持 **Obsidian 风格双链** `[[文章标题]]`（渲染可点击跳转 / 目标不存在自动创建，
  文章页新增反向链接 + 正向链接，编辑器新增「双链」插入按钮与文章选择器）；
  收藏夹副标题「喜欢的一切」改为「收藏的项目」。
- **v4.2（2026-09-18）** —— **日记页改为「碎片」页**：微信式气泡流（无对方回复、底部固定
  输入、文字+多图+标签、星标、长按菜单、日期吸顶、只看星标筛选、页内查找替换）；
  **Agent 页落地**：照抄 `参考文件ventana` 聊天界面 React 化（会话列表 → 点进 → 聊天的
  多会话模式、气泡流、流式回复、演示模式、资料库 `[[读:文档]]` 按需读取、记忆馆
  `[[记:]]`/`[[忆:]]`、会话归档/导出），适配三版书房皮肤（无黑白皮肤），数据全本地；
  **全局查找替换范围新增「碎片」「灵感」**，碎片页与灵感页均有页内查找替换按钮。
- **v4.2.1（2026-09-28）** —— **日间色板样式定稿**：白昼书房页面背景改为暖米
  `#fdf2e1`；日间卡片底色经 6 版反馈迭代定稿为低饱和杏粉 `#fce8dd`
  （`rgba(252,232,221,0.92)`），设置页主题卡预览同步；浮层色 `--card-bg-elevated`
  保持 `rgba(245,230,222,0.96)` 不动。详见第 3 节日间色板与第 13 节变更日志。

---

## 3. 设计语言与色板（用户亲自选定，**不要擅自改**）

### 定位
VidaOS 不是社交网络，是**私密的个人生活记录空间**。文字是绝对主角。

### 三主题机制（`src/lib/theme.ts` + `index.html` 内联脚本 + `globals.css`）
- `ThemeMode = 'system' | 'day' | 'night' | 'scarlet'`；持久化键 `vidaos-theme`（localStorage）；
- `index.html` 内联脚本在首帧前设置 `data-theme`（防刷新白屏闪烁）→ `main.tsx` 调用
  `initTheme()` 校正 + 跟随系统监听（`system` 模式才挂 MediaQuery 监听，切换时先摘旧监听）；
- 三个主题各自有 `meta theme-color` / 文档标题（`META_THEME_COLOR` / `DOC_TITLES`）。
- **猩红书房是独立主题**（`resolveTheme` 之一），不再是「夜间 × 深紫预设」配方；
  `SettingsPage` 兼容旧数据：夜间 + 深紫预设 + 无自定义图 → 自动识别为猩红书房；
  退出猩红书房时会清掉深紫预设（回到主题实色方案）。
- 日间主题（白昼书房）与暗夜书房的**可读性色板不同**，日间对比度调整见 09-13/14 提交。

### 屏幕色板（`tailwind.config.js` + `src/styles/globals.css` 的 `:root`）
暗夜书房基准 token（猩红书房在其上叠加酒红渐变与液态玻璃变量）：

| Token | 色值 | 用途 |
|---|---|---|
| `ink` | `#1B1A1F` | 主背景 · 深夜紫黑 |
| `charcoal` | `#2A292E` | **上层卡** · 比 ink 亮一档，用于层级 |
| `wood` | `#341915` | 副背景 · 暗咖啡 |
| `wine` | `#6A080E` | 强调 · 暗酒红（克制使用） |
| `wine.light` / `.deep` / `.bright` | `#8B1A1F` / `#4A0608` / `#8C1117` | hover / pressed / **危险·删除** |
| `bronze` | `#947D75` | 次要文字 · 辅助（`.light` `#A89289`、`.deep` `#7A675F`） |
| `paper` | `#BCAEAA` | 主要文字 · 旧纸（`.dim` `#9A8E89`） |
| `candle` | `#E8C39E` | 高光 · 烛光 |
| `moon` | `#F2EBE0` | 标题 · 月光 |
| `amber` | `#C9A063` | 高亮 / 星标 / 选中 |
| `parchment` | `#D8C3A8` | 引文 / 代码底色 |
| `ash` | `#8A858C` | 禁用 / 元信息 |
| `olive` | `#6E7355` | **语义·成功** |
| `sapphire` | `#5C6B8C` | **语义·信息** |
| `line` | `#4A3F3C` | 描边 / 分隔线 |

卡片底色用半透明变量：`--card-bg rgba(42,41,46,.72)`、`--card-bg-elevated rgba(56,54,60,.82)`、
`--card-border rgba(74,63,60,.55)`、`--card-glow rgba(232,195,158,.1)`。
**改 token 要同时改 `tailwind.config.js` 与 `globals.css` 的 `:root`**（两处都要）。

#### 日间（白昼书房）色板 —— 2026-09-28 定稿（用户亲自选定，**不要擅自改**）
- 页面背景 `--bg-base: #fdf2e1`（暖米，`bc4dc6c`）；栏色 `--bar-bg: rgba(253,242,225,.82)`。
- 卡片 `--card-bg: rgba(252,232,221,0.92)`（≈ `#fce8dd` 低饱和杏粉，0.92 透明玻璃）；
  浮层 `--card-bg-elevated: rgba(245,230,222,0.96)` **刻意保持不动**（用户"同色统一"
  决策中 elevated 色值不同，勿联动改）；边框/光晕玫瑰 `rgba(185,125,123,.5 / .1)`。
- 日间卡片色迭代史（同一天 6 版，最终 v4.2.1 定稿）：
  `#e7cfd4`(0d312b3) → `#f7cfd7`(c90585c) → `#ffe0e0`(f856214) → `#ffe8e8`(8ab06c6)
  → `#fdebeb`(7030bc5) → **`#fce8dd`(c0bea19，定稿)**。
- 设置页主题卡预览（`SettingsPage.tsx` 的 `PREVIEW_COLORS.day`）**必须与真实色同步**
  —— 当前 `{ bg: '#fdf2e1', card: '#fce8dd' }`。

### 字体（全部本地自托管，无 CDN）
- **显示/数字**：`JetBrains Mono`（时钟、英文小标）
- **正文/标题**：`EB Garamond`（衬线，长文阅读）
- **中文**：`Noto Serif SC`（@fontsource 本地 woff2，`public/fonts/`；EB Garamond/Inter/JetBrains Mono 不含中文）
- **UI 元素**：`Inter`（无衬线）
- 09-13 起移除 Google Fonts CDN 依赖（`cf1bb7f`）。⚠️ `vite.config.ts` 里仍残留
  `fonts.googleapis.com` 的 runtimeCaching 死配置（无害，可清理）。

### 排版基准（当前值）
- 正文 `.prose-vidaos`：`1.1875rem`（19px）/ 行高 `1.95`
- 文章阅读页标题：`1.75rem`（sm 以上 `2rem`）
- 动态正文 `.prose-moment`：`1rem` / 行高 `1.85`（比长文紧凑），字间距 `0.06em`

### 打印/PDF 专用配色（与屏幕不同！）
米色底 `#F2EBE0` + 正文 `#1B1A1F` + 小节标题酒红 `#6A080E` + 辅助 `#947D75`。
PDF 里**不要用屏幕的暗色 token**。

---

## 4. 关键设计决策

### 1) 分层
`pages/`（路由页面）→ `components/`（layout / home / notes / editor / search / common）→
`stores/`（状态）→ `lib/`（数据与工具）。路由与全局布局在 `App.tsx` 与 `main.tsx`。

### 2) 状态管理：三个 Zustand store
- `useAppStore`：**业务数据**（profile / collections / articles / moments / favorites /
  notes / categories / tracks / settings / **fragments / agentSessions / agentConfig /
  agentDocs / agentMemories**）+ 全部 action。
  另外带一个**运行时标记 `hydrated`**（不持久化）。
- `useUIStore`：UI 状态（currentTab / notesTab / **selectedDate** / editor / toasts / modal /
  findPanel / commentInputFocused / focusRequest / **agentSessionId** 等）。
  `modal.content` 是 **ReactNode**，可直接传 JSX 构造弹窗内容；
  `agentSessionId` 是**临时 UI 状态，不持久化**（刷新后回会话列表）。
- `useMusicStore`：音乐播放（持有 `audio` 实例与 WebAudio 节点）。

### 3) 持久化（**曾有致命 bug，务必遵守**）
数据存 Dexie（IndexedDB），`useAppStore` 的改动经 **400ms 防抖**后写入。
**必须只用 `snapshot(store)` 取纯数据字段写库** —— 直接把 `get()` 交给 IndexedDB 会因为
里面混着 action 函数而抛 `DataCloneError`，且被 try/catch 吞掉 → **数据静默不落库**（v3.0 真实事故）。
`hydrated` 必须为真后才允许回写 `settings.lastTab`，否则会用初始值覆盖刚读出的持久化值。
`loadState()` 做**兼容迁移**（v4）：
- 剔除旧版内置音景轨道（`builtin` 标记，新版只保留用户导入的本地曲目）；
- 剥离旧 `letters` 数据，并清掉引用已删信件的收藏（`refType === 'letter'`）；
- `lastTab` 归一化：旧数据可能持久化了已不存在的 tab（如 `'notes'`），非法值回退 `'desk'`；
- v4.2 起 `fragments / agentSessions / agentConfig / agentDocs / agentMemories`
  用 `defaultState()` 兜底默认空值（`AppState.version` 仍是 3，**未升 Dexie version**）。

### 4) 路由：HashRouter（v4）
Tab 路由 `/desk /diary /agent /data /settings`；子视图 `/notes /space /space/collection/:id`
`/space/article/:id /moments /favorites`。
`TopBar` 依据 `location.pathname` 决定标题/副题与返回键（`ROUTE_TITLES` + `matchTitle`；
`/notes` 路由时底部「主页」高亮）。
**HashRouter 并不能让 `index.html` 用 `file://` 打开**（Vite 入口模板 + ES module 被 CORS 拦），已证伪。

### 5) 数据模型（v4）
见 `src/types/index.ts`。要点：
- **无 `Letter`**；`TabKey = 'desk'|'diary'|'agent'|'data'|'settings'`；
  `FeatureKey = 'space'|'moments'|'notes'|'favorites'`；
- `AppState.version = 3`；`Favorite.refType` 仅 `'article' | 'moment'`；
- `Article.imageIds` / `Moment.imageIds` 存 **fileId 引用**；
- `Moment.comments?: MomentComment[]`（**旧数据可能没有，读取一律 `?? []`**）；
- `Settings.lastTab` + `Settings.webdav?: WebDavConfig`
  （`url` / `username` / `password` / `encrypted?` / `passphrase?`，见第 4 节之 15)）；
- `Profile` 仍保留 `backgroundPreset` / `backgroundFileId` 字段（背景机制见第 4 节之 8)）；
- **v4.2 新增**：
  - `FragmentEntry{id, content, imageIds[], tags[], starred, createdAt, updatedAt}`（碎片流）；
  - `AgentSession{id, title, createdAt, updatedAt, archived, messages: AgentMessage[]}`，
    `AgentMessage{id, role:'user'|'assistant'|'sys', content, createdAt, greet?}`；
  - `AgentConfig{baseUrl, apiKey, model, persona}`（**apiKey 只存本机**，见第 4 节之 19)）；
  - `AgentDoc{id, name, content, createdAt}`（资料库，≤400KB）、
    `AgentMemory{id, title, content, createdAt, read}`（记忆馆）；
  - `FocusKind = 'article'|'moment'|'fragment'|'inspiration'`（第 4 节之 16)）。

### 6) 媒体文件与外链（fileId → objectURL）
图片/音频以 Blob 存在 Dexie `files` 表。`src/lib/fileUrl.ts` 维护 `id → objectURL` 缓存
（带失败缓存）。`revokeFileURL()` 在 MusicPlayerCard 删除曲目时调用；
**`clearFileURLCache()` 目前仍无人调用**（见第 8 节）。

### 7) 正文内嵌图片：`fileRef:` 语法
正文里写 `![说明](fileRef:<fileId>)` 即可把本地图片插进正文。
- `src/lib/markdown.ts` 的 DOMPurify 已放开该协议（否则 `src` 会被删掉）；
- 渲染必须走 **`<MarkdownView>`**（`components/common/MarkdownView.tsx`）：
  它渲染后再把 `img[src^="fileRef:"]` 换成 objectURL，文件缺失时显示「（这张图片已丢失）」；
- 导出/备份必须通过 `collectFileIds()` 收集引用（它会扫 `imageIds` + `content` 里的 fileRef）；
- 编辑器缩略图有「插入正文」按钮（在光标处插入）+ 拖拽排序（触屏长按 350ms 进入）。

### 8) 背景与「栏色」（v3.10 实色方案）
`src/lib/backgrounds.ts`：`PRESET_BACKGROUNDS` 只剩 `none`（默认，不叠加渐变，页面直接是
主题 `--bg-base` 实色）与 `deep`（深紫渐变，**仅猩红书房**使用：
`linear-gradient(135deg,#0F0A14, #341915 70%, #6A080E)`）。
- `DEFAULT_BACKGROUND_PRESET = 'none'`；预设的 `bar` 字段驱动 `--bar-bg`
  （`none` 时由 globals.css 按主题兜底），顶栏/底栏毛玻璃同步变色；
- 触屏与桌面毛玻璃视觉统一，栏色不钉死固定色；
- 设置页**已删除「背景」区块**（75b1fc9），主题切换在「外观」区块完成。
- 背景层 `-z-10` 且 `body` 透明化，手机端切换背景/主题才能透出（89897e4）。

### 9) PDF 导出（**本项目最脆弱的部分，改动前请读第 12 节**）
当前实现（`4377d94` 重做版，仍生效）：`html2canvas` 把整篇渲成**一张长 canvas**，
再按页切片贴到各页。
- 页面几何：`PDF_RENDER_W = 720`、`PT_PER_PX = A4_W / 720`、
  `MARGIN_TOP = 64` / `MARGIN_BOTTOM = 48`、`PAGE_CONTENT_PX` 为每页可用高度、
  `PDF_BG = '#F2EBE0'`；
- **切点由 `computePageCuts()` 直接在 canvas 像素上找行间空白带中点** ——
  与最终贴图出自同一张画布，避免「浏览器坐标预测 vs html2canvas 实际排版」的累积偏差；
  行判定全宽扫描，短行不被误判为空白带；**保证不会把一行字切成两页**；
- `RENDER_SCALE = 2`（html2canvas scale，保证像素级扫描精度）；
- 末页内容不足时**垂直居中**（`y = MARGIN_TOP + (pageCapPt - contentH)/2`）；
- 每页底部居中页码 `· n ·`（古铜色，y ≈ A4_H − MARGIN_BOTTOM/2 − 8 ≈ 810pt）；
- 单图上限为内容区高度减 24px；图片以 data URL 内嵌（`buildImageDataUrls`）；
  正文 `fileRef:` 由 `resolveInline()` 换成 data URL；丢失图片渲染「（图片已丢失）」占位；
- 排版观感（用户钦定「最早那一版」）：720px 容器连续排版 + 等比铺满整页宽度。

### 10) 本地文件夹快照备份
`src/lib/snapshot.ts`（File System Access API）。每份快照是一个文件夹：
`manifest.json` + `data.json.gz` + `files/<fileId>`。
- **最多 10 份，超出自动删除最早的**（只统计 `vidaos-snapshot-*` 目录，
  手动导出走下载、不占额度）；同一秒内连存会追加序号；
- 体积优化：state 用原生 `CompressionStream('gzip')`（实测约 36%），
  媒体文件按原 Blob 直存（**不做 base64**，省约 33%）；
- 文件夹句柄存在 Dexie `meta` 表（db version 2）。
- Safari/Firefox 不支持该 API，已给提示并引导用 JSON 导出 / WebDAV 备份。

### 11) 错误边界（两层）
`components/common/ErrorBoundary.tsx`：
- **最外层**（`main.tsx`，包住 HashRouter）：`variant="fullscreen"`，兜住 App/路由错误；
- **页面级**（`App.tsx`，包住 `<Routes>`，`resetKey={location.pathname}`）：
  单页崩溃时顶栏与底部 Tab 仍可用，切路由自动复位。

> 之所以必须加：v3.0 曾因 `App.tsx` 两个 effect 互相 ping-pong 触发
> `Maximum update depth exceeded`，**点任意 Tab 就白屏**（已修，一次性守卫见 App.tsx）。

### 12) 音乐播放器
内置音景用 WebAudio 实时合成（雨声 = 白噪声 + 低通；烛光 = 60/90Hz 叠加），
本地音频用 `<audio>` + objectURL。`pause()` 保留 `audioEl` 以支持同曲续播。
旧版内置音景轨道已随 v4 迁移剔除（`builtin` 字段过滤）。

### 13) 分类管理
灵感/日程/待办各有 `categories: string[]`，支持筛选 + 双击重命名 + 删除 + 新增；
删除分类保留便签（便签的 `category` 字段不变）。

### 14) 皮肤系统：**已撤销，不要再加**
v3.1 曾做过可命名皮肤（含浅色卡片），用户试用后要求**完全撤销**。
**不要再引入皮肤/主题切换**扩展机制 —— 主题统一走 `theme.ts` 的三主题体系
（暗夜/白昼/猩红），新增主题必须保证三套 token 齐全（见第 3 节）。

### 15) WebDAV 云同步与端到端加密（v4.0，详见 `src/lib/webdav.ts`）
- 备份文件固定名 `BACKUP_FILENAME = 'vidaos-backup.json.gz'`（每次同步**覆盖同一份**，
  只保留最新）；
- 上传链路：`snapshot()` 纯数据 → gzip（CompressionStream）→ `PUT`（先 `MKCOL` 建目录）；
  下载链路：`GET` → 自动识别加密 → 解密 → 解析快照 → 确认后覆盖恢复；
  恢复前**需要 passphrase 时抛 `NeedPassphraseError`**，DataPage 弹输入框；
- **端到端加密**：`PBKDF2（150000 迭代，SHA-256）` 派生 AES-256-GCM 密钥；
  密文容器 = `VDOS1` 魔数(5B) + salt(16B) + iv(12B) + 密文，**自包含、可独立解密**；
  口令只存本机 `Settings.webdav.passphrase`，**绝不随备份上传**
  （备份内的 `settings` 只保留 `lastTab`，导出/上传前会剥离 webdav 口令）；
- 导出 API：`encryptBlob` / `decryptBlob` / `supportsCrypto`（Web Crypto 可用性，HTTP 非本地环境为 false）/
  `hasWebDavConfig` / `hasEncryption` / `normalizeDavUrl`；
- **硬性限制**：纯浏览器直连坚果云会被 **CORS 拦截**（坚果云未开放跨域头），
  报错会明确提示是 CORS；**Tauri 桌面壳落地后自动解除、代码无需改动**；
- UI：数据页「WebDAV 全量备份」区块（配置表单 url/账号/应用密码 + 加密开关与口令 +
  保存配置 + 云端备份 + 云端恢复 + 注意事项）+ 区块下方**「备份配置说明书」小字链接**弹窗
  （`BACKUP_GUIDE` 常量：配置教程 / 401/403/404/409/CORS/507/解密失败详解 /
  加密原理与口令管理 / 多设备与流量限制提醒）；顶栏齿轮全部改为**云同步图标**，
  未配置时点击跳 `/data` 并 toast 提示。

### 16) 全局查找与替换（v3.9 起，勿回退结构）
- **全局**：`GlobalFindReplaceCard.tsx` 全屏覆盖层，TopBar 放大镜或 **⌘K** 打开，
  按钮为「替换」「全选」「反选」三段式（参照 Nookery FindBar，勿改回死板的多按钮）；
  文字颜色由 `--find-fg` 驱动（夜间淡粉，日间深色）；
  输入框聚焦期间**释放 body 滚动锁**（防滚动被锁死）；
  **v4.2 范围扩为 空间 / 动态 / 碎片 / 灵感**（`ScopeKey`/`HitKind` 四值），
  fragment 命中跳 `/diary`、inspiration 命中跳 `/notes`（自动切灵感块并清空分类筛选）；
- **页内**：`PageFindBar.tsx` 共用（文章阅读/动态/便签/碎片/灵感），配 `usePageFind` hook
  与 `focusRequest.ts` 机制：点结果后跳转并**闪烁高亮定位**到第 N 个命中处
  （子页面挂载后按 query 消费 focusRequest，别改成 setTimeout 猜时机）。
  碎片页 `usePageFind<HTMLUListElement>` + `useGlobalFocus('fragment')`、
  灵感页 `useGlobalFocus('inspiration')`；碎片命中替换会更新对应 `FragmentEntry.content`。

### 17) 移动端输入（v3.10 三连修，勿回退，真机待复测）
- 重命名**弃用原生 `prompt()`**（iOS PWA standalone 下不可用）→ 改 `useUIStore.showModal`
  的 `inputMode` 应用内 Modal 输入；
- 查找面板聚焦释放 body 滚动锁；TopBar / BottomTabBar / 评论输入框内联灰统一 `var(--bar-bg)`；
- 三处毛玻璃栏加 `will-change: backdrop-filter`。
- 待办/日程长按拖拽：排序模式 CSS 锁 `touch-action` 起手即拖；普通模式长按成立后
  window 级原生 `touchmove(passive:false)` + `preventDefault` 接管。

### 18) 兼容性（勿回退）
- `@vitejs/plugin-legacy`（targets Chrome≥60 / Android≥6 / Safari≥10 / iOS≥10，modernPolyfills）+ 
  dev 用 esbuild `target: 'es2018'` —— 夸克旧内核不支持 ES2020（可选链/?.）白屏的修复；
- `index.html` 3.8s 挂载兜底层（夸克 UA 特判提示「关闭云加速/智能转码」+ 重试按钮）。

### 19) Agent 对话引擎（v4.2，`src/lib/agentEngine.ts` 纯函数层）
- **无新增 npm 依赖**：真实对话走浏览器 `fetch` + SSE 流式解析，不引入 SDK；
- **端点规范化** `chatEndpoint()`：已含 `/chat/completions` 原样用；以 `/v数字` 结尾补
  `/chat/completions`；否则补 `/v1/chat/completions`（兼容 OpenAI 兼容服务）；
- **消息组装** `buildMessages()`：system = 人格（`DEFAULT_PERSONA`，可被资料库「人格」文档
  覆盖）+ 资料库索引（`docsIndexText`，含内置「碎片」虚拟文档：最近 40 条碎片摘要）+
  使用约定（`[[读:文档]]`/`[[忆:]]`/`[[记:]]` 三标记）+ 最近 N 条会话历史；
- **按需读取**：`resolveDoc`/`resolveMemory`（精确标题 → 模糊包含）；长文档用 `snippetFor`
  （>6000 字按滑动窗口计分截取，`extractTerms` 对中文按 2~4 字连续片段切分提升命中率）；
- **工具标记**：`scanMarkers()` 从 AI 回复剥出 `[[读:x]]` / `[[忆:x]]`（喂回上下文的
  系统消息由 `buildMessages` 注入），`extractWriteMemory()` 把 `[[记:标题]]正文` 转为
  记忆条目写入记忆馆；`runTurn` 最多 `MAX_TOOL_ROUNDS=3` 轮循环；
- **演示模式**：`hasApiConfig()` 三项齐全才走真实 API，否则 `demoReply`/`demoStream`
  本地模板回复（逐字流式），交互全可用；SSE 请求支持 `AbortController` 停止；
- **导出**：`sessionToTxt()` 把会话导出为 txt（导出/归档共用）；
- **隐私边界**：`apiKey` 只存本机 IndexedDB；`snapshot()`/WebDAV 备份**剔除 apiKey 与
  WebDAV 密码**；导入合并时若备份无 key 则保留本机 key（`useAppStore.importState`）；
- **引擎可单测**：esbuild bundle 后 Node 跑断言（见第 11 节），v4.2 时 26/26 PASS。

---

## 5. 文件结构与职责

```
VidaOS/
├── 打开VidaOS.command          # ★ 双击启动（自动装依赖 → 起服务 → 开浏览器）
├── index.html                   # Vite 入口（主题防闪烁脚本 + 3.8s 挂载兜底，勿双击）
├── src/                         # 58 个文件，唯一权威实现
│   ├── main.tsx                 # 入口：ErrorBoundary(fullscreen) > initTheme > HashRouter > App
│   ├── App.tsx                  # 全局布局 + 路由 + tab 同步 + Background + ErrorBoundary(inline)
│   ├── styles/globals.css       # 三主题 token(:root/[data-theme=...]) + Markdown 排版 + 工具类 + .frag-bubble
│   ├── types/index.ts           # 全部数据类型（v4.2，含 WebDavConfig / Fragment / Agent 系）
│   ├── lib/
│   │   ├── db.ts                # Dexie：state / files / meta（version 2）+ loadState 迁移
│   │   ├── theme.ts             # 三主题模式（localStorage 持久化 + 跟随系统）
│   │   ├── backgrounds.ts       # 背景预设（none / deep·猩红专属）+ 栏色
│   │   ├── fileUrl.ts           # Blob → objectURL 缓存
│   │   ├── markdown.ts          # marked + DOMPurify（放开 fileRef: / wiki: 协议）
│   │   ├── agentEngine.ts       # ★ Agent 对话引擎（纯函数：端点/消息/索引/截取/标记/演示模式）
│   │   ├── exportImport.ts      # 导入导出：JSON/MD/TXT/PDF + 范围多选 + 像素级分页切点
│   │   ├── snapshot.ts          # 本地文件夹快照（≤10 份，gzip + 原 Blob）
│   │   ├── webdav.ts            # WebDAV 云同步 + 端到端加密（PBKDF2 + AES-256-GCM）
│   │   ├── focusRequest.ts      # 查找跳转定位（query + 命中序号）
│   │   └── utils.ts             # 时间/ID/压缩/文本工具
│   ├── stores/                  # useAppStore / useUIStore / useMusicStore
│   ├── components/
│   │   ├── layout/              # Background / TopBar / BottomTabBar（5 Tab）
│   │   ├── home/                # ClockHeader / FeatureGrid(4 宫格) / CalendarCard / DayScheduleCard / MusicPlayerCard / TodoSummaryCard
│   │   ├── notes/               # SegmentedControl / CategoryChips / Inspiration / Schedule / Todo / ScheduleEditor
│   │   ├── agent/               # ★ AgentChatView（气泡流 + 输入区 + 配置/资料库/记忆馆抽屉）
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   ├── search/              # GlobalFindReplaceCard / PageFindBar / usePageFind
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage
│   │                            #   + ErrorBoundary / MarkdownView
│   └── pages/                   # 11 个路由页面
│       DeskPage / DiaryPage(碎片流) / AgentPage(会话列表+聊天) / NotesPage / DataPage / SettingsPage /
│       SpacePage / CollectionPage / ArticleReaderPage / MomentsPage / FavoritesPage
├── public/                      # favicon.svg + icons/（PWA 图标，manifest 引用）
├── scripts/make-icons.mjs       # ⚠️ 生成 PWA 图标（依赖 sharp 但**未在 package.json 声明**，当前跑不了）
├── docs/
│   ├── preview-v3-*.png         # 5 张界面截图（README「界面预览」引用中）
│   └── palette-suggestion.html  # 色板依据（暗夜书房发散地）
├── PROJECT_MEMORY.md            # 本文件
├── README.md
└── 配置：vite.config.ts(PWA+legacy+别名+manualChunks) / tailwind.config.js(色板) /
        postcss.config.js / tsconfig.json(strict + noUnusedLocals) / package.json / .gitignore
```

### 路由表（App.tsx 实际注册）
`/`（重定向到 currentTab）、`/desk`、`/notes`、`/data`、`/settings`、`/space`、
`/space/collection/:id`、`/space/article/:id`、`/moments`、`/diary`、`/agent`、`/favorites`。

---

## 6. 历史归档（工作区已删除，git 可取回）

2026-09-12 曾把两批内容集中到 `废案/`，**用户已备份并删除该目录**，工作区不再有它：

| 原内容 | 说明 | 现在怎么拿回来 |
|---|---|---|
| `废案/archive-v2/` | V2.1 完整旧应用（原生 HTML/CSS/JS，可直接双击运行） | `git checkout 4377d94 -- archive/v2` |
| `废案/dumate-临时验证/` | 某轮排查 PDF 的临时截图与测试 PDF（51MB） | 不需要，可按第 11 节的方法重新生成 |

`.gitignore` 里仍保留 `/废案/` 一行（无害，防止以后临时堆放的文件进入版本库）。
**不要**把当前在用的文件往那儿放。

> ⚠️ **新坑（2026-09-16 真实发生）**：项目根目录有用户放的一个**未跟踪目录 `参考文件ventana/`**
> （另一项目的参考材料）。`git add -A` / `git add .` 会把它**整个带进提交**（已踩过一次，
> 用 `git reset --soft HEAD~1` + `git reset 参考文件ventana` 撤销）。它不属于 VidaOS 仓库，
> **提交前用 `git status` 检查，别 `add -A`**；要不要写进 `.gitignore` 由用户决定。

---

## 7. 已实现功能清单（当前，v4.2）

- **桌面**：大时钟 Hero + 4 功能宫格（空间/动态/便签/收藏夹）+ 双卡月历/当日日程
  （**点日期联动**、**「今」按钮**）+ 主页**待办模块**（未完成待办、快速添加/勾选）+ 音景播放器
- **空间**：Markdown 长文 + 合集 + 标签 + 封面 + 配图（**可插入正文**、可拖拽排序、
  可在合集页直接编辑）+ **Obsidian 风格双链**（`[[标题]]` 渲染/跳转/自动创建、
  正反向链接、编辑器「双链」插入按钮）
- **动态**：**时间线**（日期分组 + 竖线节点）+ 头像/昵称 + **评论** + **收藏**
  + **编辑（含改时间）** + Markdown 渲染 + **查找/替换**（高亮命中、跳转、替换/全部替换）
- **便签**：灵感/日程/待办分区滑块 + 分类管理（增删改）+ 日程与首页日历联动
  + 待办**自动置底 / textarea 多行 / 长按拖拽排序**
- **收藏夹**：跨类型聚合（文章 / 动态）；副标题「收藏的项目」
- **碎片**：**微信式气泡流**（按天分组吸顶、右侧酒红气泡、文字+多图+标签、星标、
  长按菜单编辑/星标/复制/转文章/删除、底部固定输入、只看星标、空态自动聚焦）+
  **页内查找替换**；正文 Markdown 渲染（**双链在碎片内同样生效**）
- **Agent**：**多会话聊天**（会话列表 → 点进 → 聊天，新建自动开场白）；气泡流界面
  （借鉴 Ventana React 化，适配三版书房皮肤）；**演示模式**兜底（未配置 API 可全交互体验）；
  资料库 `[[读:文档]]` 按需读取 + 记忆馆 `[[记:]]`/`[[忆:]]`；会话重命名/归档/导出 txt/删除；
  连接配置（Base URL / API Key / 模型）存本机
- **编辑器**：全屏 Markdown（工具栏 / 预览 / 图片 / **插入正文** / 字数 / 收藏星标 /
  移动端大按钮 + 浮动格式条）
- **全局查找替换**：桌面/移动通用覆盖层（⌘K），**范围：空间 / 动态 / 碎片 / 灵感** +
  页内查找（focusRequest 定位闪烁）
- **数据**：导出 JSON（含图片 Base64）/ TXT / MD / PDF，**范围可多选**
  （文章 / 动态 / 便签 / 收藏夹 / 个人资料）；PDF 内嵌图片 + 居中页码 + **不切行**；
  **本地文件夹快照备份**（≤10 份，自动清理最早）；**WebDAV 全量备份**（可选端到端加密 +
  云端恢复 + 配置说明书弹窗）；导入 JSON / MD / TXT
- **设置**：头像（压缩）/ 昵称/签名 / **外观（三主题卡 + 猩红书房方案卡）** / 关于
- **主题**：暗夜 / 白昼 / 猩红（液态玻璃，光效锚点固定）；**自托管字体**（含中文）
- **兼容与全局**：两层错误边界、PWA 离线、响应式、键盘焦点环、`prefers-reduced-motion`、
  安全区适配、夸克旧内核兼容（legacy + 挂载兜底）

---

## 8. 已知问题与待处理（真实未修项，截至 2026-09-28）

### 8.1 功能/代码缺陷
- **`DataPage` 用 `useAppStore()` 订阅了整个 store**（`DataPage.tsx:127`）：任一字段
  （含 `hydrated`）变化都会重渲染整页；且它把整个 store（混着 action 函数）传进
  `exportJSON` / `saveSnapshot`，目前靠 `JSON.stringify` 静默丢弃函数才没出事 ——
  与 v3.0 那次 `DataCloneError` 同源，建议统一改成传 `snapshot()` 的纯数据。
- **`DataPage` 重置数据时未调用 `clearFileURLCache()`** → objectURL 缓存残留
  （`fileUrl.ts` 里该函数目前 0 调用；`revokeFileURL` 已在 MusicPlayerCard 使用）。
- **异步操作缺 try/catch**：`SettingsPage`（头像上传 `handleAvatar`）、
  `MarkdownEditor.handleImage`（压缩/保存循环无包裹，失败会 unhandled rejection 且可能
  已插入前几张图）、`MusicPlayerCard.handleImport` —— 会误报「已添加 N 张图片」或
  产生未处理 rejection。
- **a11y**：`MediaImage` 多数调用未传 `alt`；`Card` 带 `onClick` 时渲染为 `div`
  （键盘不可达）；`Toast` 无 `aria-live`；`Modal` 无 dialog 语义 / Escape。
- **时区隐患**：`ScheduleView.formatDateLabel`、`CalendarCard` 用 `new Date('YYYY-MM-DD')`
  解析（按 UTC 解析、再按本地显示）。UTC+8 下正确，UTC 以西会整体差一天。
- **`TopBar` 返回用 `navigate(-1)`**：直接刷新在 `/space/article/:id` 这类深链接后按返回，
  可能退出应用而不是回到列表。
- **收藏夹里的「动态」类收藏只跳到 `/moments`**，不定位到被收藏的那一条。
- **`vite.config.ts` 残留 Google Fonts runtimeCaching 死配置**（自托管后无意义，可删）。
- **Agent SSE 请求无超时**：`streamChatCompletion` 只支持用户手动「停止」（AbortController），
  网络挂起时没有自动超时上限（低优，可加 AbortSignal.timeout）。
- **Agent 演示模式是本地模板回复**：未配置 API 时 `demoReply` 只能按关键词给固定话术，
  不读真实资料库内容（已如实告知用户，演示 ≠ 真实对话）。
- 低优先级设想：文章加密、静态站点导出、自定义主题色。

### 8.2 平台 / 外部限制（如实告知用户）
- **WebDAV 纯浏览器直连坚果云被 CORS 拦截**（坚果云未开放跨域头）；代码就绪，
  **Tauri 桌面壳落地后自动解除**。当前可用备选：支持 CORS 的 WebDAV 服务。
- **iOS 真机复测待确认**：v3.10 移动输入修复（重命名 Modal / 灰遮罩 / 输入框）在桌面与
  模拟器验证通过，**真机未复测**；碎片页/Agent 页移动端布局同样未真机复测。
- **Agent 依赖外部对话 API**：需用户自填 Base URL / API Key / 模型（Key 只存本机）；
  未配置自动演示模式。部分 OpenAI 兼容服务可能要求额外 header 或不同端点规范，自检按钮
  可先验证连通性。
- **多设备同时编辑同一 WebDAV 备份会互相覆盖**，说明书弹窗已提醒单设备编辑。

### 8.3 版本号不一致
`package.json` = 3.0.0、设置页显示「v3.0 · night study」、文档迭代 = v4.2.1（日间色板定稿）。
（低优，改设置页文案需要用户确认显示什么。）

---

## 9. 【历史】代码审计与修复记录（2026-09-11）

2026-09-11 做过一次全量审计，共 29 项问题（P0 9 / P1 12 / P2 8），**绝大部分已修**，
明细散见第 13 节。**已修复的代表性缺陷**（均做过真实浏览器实测）：

- **点任意 Tab 白屏**：`App.tsx` 两个 effect 互相 ping-pong（`currentTab ↔ settings.lastTab`）
  触发 `Maximum update depth exceeded`，整棵树被卸载。改为「恢复上次 tab 只执行一次 + 单向回写」。
- **数据持久化从未生效**：`persist(get())` 把含 action 函数的整个 store 写进 IndexedDB →
  `DataCloneError` 被静默吞掉。改为 `snapshot()` 只写纯数据字段。
- **背景设置完全无效**：`Background.tsx` 从不读 `profile`（已修，并新增栏色联动）。
- **音乐暂停键实为从头重播**：`play()` 内部先 `pause()`；已改为按 `isPlaying` 分派 + 支持同曲续播。
- **编辑器收藏星标从不渲染**：`EditorOverlay` 从不传 `favoriteId`。
- **编辑器输入会被父组件重渲染清空**：`EditorOverlay` 每次渲染新建数组 + 子组件同步 effect。
  已改为稳定常量 + `key` 重挂载。
- **月历与日程不联动**：两卡各持本地 state。已提升到 `useUIStore.selectedDate`。
- **过去日程只显示一天，且编辑按钮是死按钮**。
- **日期显示「2026 年 M 月 D 日」**：`formatDate` 不支持单字母 `M`/`D`，已改为 token 正则替换。
- **文章配图从未渲染**：`ArticleReaderPage` 只渲染 `coverId`。
- **`useAppStore` 内 38 处多余的 `set(... as any)`**：让每个 action 都跳过了类型检查，已全数移除。
- 死代码清理：开启 `noUnusedLocals`/`noUnusedParameters`，删掉死 props / 死 CSS 类 /
  未用导入与导出。

---

## 10. 依赖清单

| 依赖 | 版本 | 用途 | 协议 |
|---|---|---|---|
| react / react-dom | ^18.3.1 | UI | MIT |
| react-router-dom | ^6.26.2 | Hash 路由 | MIT |
| zustand | ^4.5.5 | 状态管理 | MIT |
| dexie | ^4.0.8 | IndexedDB 包装（version 2） | Apache-2.0 |
| marked | ^14.1.2 | Markdown 渲染 | MIT |
| dompurify | ^3.1.6 | HTML 净化 | MPL-2.0 |
| jspdf | ^2.5.2 | PDF 生成 | MIT |
| html2canvas | ^1.4.1 | DOM → canvas | MIT |
| lucide-react | ^0.441.0 | 图标 | ISC |
| @fontsource/eb-garamond / inter / jetbrains-mono / noto-serif-sc | ^5.3.0 | **自托管字体**（无 CDN） | OFL |
| date-fns | ^4.1.0 | **未使用**（可移除） | MIT |
| vite / @vitejs/plugin-react | ^5.4.3 / ^4.3.1 | 构建 | MIT |
| @vitejs/plugin-legacy | ^5.4.3 | 旧内核 ES5 bundle（夸克等） | MIT |
| typescript | ^5.5.4 | 类型（strict + noUnusedLocals） | Apache-2.0 |
| tailwindcss / postcss / autoprefixer | ^3.4.10 / ^8.4.45 / ^10.4.20 | 样式管线 | MIT |
| vite-plugin-pwa | ^0.20.5 | PWA（Workbox，预缓存 111 条） | MIT |
| terser | ^5.51.2 | 生产压缩（devDep） | BSD-2-Clause |

**未声明但被脚本引用**：`sharp`（`scripts/make-icons.mjs`）—— 见第 8 节。

---

## 11. Agent 接力指南

### 快速上手
```bash
cd "/Users/amarisgo/Documents/DeepSeek Harness/VidaOS"
npm install          # 首次
npm run dev          # → http://localhost:5173（或双击 打开VidaOS.command）
npm run typecheck    # 改了代码先跑这个
npm run build        # 出 dist/（记得之后删掉，它被 gitignore）
```

### 常见修改场景 → 该改哪些文件
| 想做什么 | 改哪里 |
|---|---|
| 加一个页面 | `src/pages/` 新建 → `App.tsx` 注册路由 → 若是 Tab 还要改 `BottomTabBar.tsx` 的 `TABS`；子视图标题改 `TopBar.tsx` 的 `ROUTE_TITLES`/`matchTitle` |
| 加一个字段 | `types/index.ts` → `lib/db.ts` 的 `defaultState()` → `stores/useAppStore.ts` 加 action → UI 调用 |
| 改存档结构 | 注意 **`db.ts` 的 Dexie 版本号要 +1**，否则老用户数据读不出来；迁移逻辑写在 `loadState()` |
| 改设计 token | `tailwind.config.js` 的 `colors` **和** `styles/globals.css` 的 `:root` / `[data-theme=...]`（各主题都要过一遍） |
| 加 / 改主题 | `lib/theme.ts`（模式枚举/解析/应用）+ `index.html` 内联脚本 + `globals.css` 主题变量 + 设置页主题卡 |
| 改导出 / 备份 | `lib/exportImport.ts`（`SCOPES` 与 `scopedState`）；快照相关在 `lib/snapshot.ts` |
| 改 PDF 版式 | `lib/exportImport.ts` 的 `exportPDF` + `computePageCuts` —— **先看第 12 节** |
| 改 WebDAV / 加密 | `lib/webdav.ts`（协议/加密/取回）+ `pages/DataPage.tsx`（UI + BACKUP_GUIDE 文案） |
| 改首页 | `pages/DeskPage.tsx` + `components/home/*` |
| 改编辑器 | `components/editor/*` + `globals.css` 的 `.prose-vidaos` |
| 改查找 | `components/search/*` + `lib/focusRequest.ts` + `useUIStore`（findPanel / focusRequest / FocusKind） |
| 改碎片页 | `pages/DiaryPage.tsx`（气泡流/输入/长按/星标）+ `globals.css` 的 `.frag-bubble` + `types` 的 `FragmentEntry` + `useAppStore` 的 fragment actions |
| 改 Agent 对话 | `lib/agentEngine.ts`（纯函数：端点/消息/索引/截取/标记/演示模式）+ `components/agent/AgentChatView.tsx`（UI）+ `pages/AgentPage.tsx`（会话列表）——**逻辑改完跑引擎单测** |

### 怎么验证（本项目标准做法）
1. `npm run typecheck` + `npm run build`（最低要求，**不等于修好了**）；
2. **无头 Chrome 走真实 UI**：在项目根建一个临时 `__probe.html`（Vite 会伺服它），
   里面用 `iframe` 加载应用、用 JS 模拟点击/输入，再把结论 `POST` 给一个本地 HTTP 收集器；
   或复用本会话的 `/tmp/vidaos-verify/`（playwright-core 1.63.0 + 系统 Chrome 脚本）；
   ⚠️ 当前环境 GUI 自动化可能不可用（BU 平面禁用 / 用户占用 Chrome 时 CU 被拒），
   此时退化为「构建 + 生产包字符串 + 纯逻辑测试」，并如实告知用户浏览器实测未做；
3. **Agent 引擎单测**（纯逻辑层，不依赖浏览器）：
   ```bash
   cd "/Users/amarisgo/Documents/DeepSeek Harness/VidaOS"
   npx esbuild src/lib/agentEngine.ts --bundle --format=esm \
     --outfile=/tmp/vidaos-agent-engine.mjs --alias:@=./src
   node -e "import('/tmp/vidaos-agent-engine.mjs').then(m=>{ /* 断言：端点/索引/截取/标记/导出/演示 */ })"
   ```
   v4.2 基线 26 项断言全 PASS；
4. 用完**删掉探针文件/临时目录**，别提交。

⚠️ **两个已踩过的坑**：
- Chrome 的 `--virtual-time-budget` 会让 **IndexedDB 回调永不完成** →
  凡是依赖 IndexedDB 的探针都会卡住。改用「真实时间运行 + 探针把结果 POST 到本地收集器」。
- 探针里读元素样式/尺寸时注意 **`cssText` 会被浏览器规范化**
  （`width:620px` 读出来是 `width: 620px`，而且 `line-height` 里含 `height`）——
  先 `replace(/\s+/g,'')` 再比较。

### Git 提交约定
`feat:` / `fix:` / `style:`（不改逻辑）/ `refactor:` / `chore:` / `docs:`；
大版本变更在 footer 写 `BREAKING CHANGE:`。提交前确保 `git status` 干净
（**当心未跟踪的 `参考文件ventana/`，不要 `add -A`**）、`typecheck` 通过、临时探针已删除。

---

## 12. 坑与教训（**接手者请务必读**）

1. **PDF 分页连续返工了 6 轮**，每轮都是"修一个问题、引入另一个问题"：
   切行 → 边距被压缩 → 图片丢失 → 导出卡死 → 每页只填一半 → 用户要求整体回退。
   根因是**我一直在改版式，却没有先跟用户确认想要的效果**。
   **教训：涉及版式/配色，先要一张"这一版很好"的截图或明确规格（页边距、字号、每页填充），再动手。**
2. **我用过错误的自检指标**：拿 `page.scrollHeight` 判断"页面是否填满" ——
   但对固定高度的盒子，`scrollHeight` **永远不小于盒高**，只能反映"有没有溢出"，
   **根本区分不出"填满"和"只填一半"**。因此误报过一次成功。
   **教训：自检指标必须能真实区分好/坏，否则等于没测。** 正确做法：临时把
   `height:auto` 再量真实内容高度。
3. **每加一个节点就读一次尺寸**会造成成千上万次强制同步重排 →
   长文导出时**页面直接无响应**（用户真实遇到）。批量测量要在"不修改 DOM"的时机做，
   或用二分（`log2(n)` 次读取）代替线性累加。
4. **量测容器与最终渲染容器的宽度/内边距必须一致** —— 曾经一个是 720px 无内边距、
   一个有 80px 内边距，文字按 720 宽量高度却按 560 宽渲染，每段都变高、分页全错。
5. **用户可能看到的是旧代码**：dev server 重启会断开 HMR socket，旧标签页不会自动刷新；
   他报"改了没用"时先让他 `Cmd+Shift+R`。另外别把 PWA 装在旧构建上
   （Service Worker 会缓存旧资源）。
6. **移动历史目录时记得同步 `tsconfig.json` 的 `exclude`**（`archive` 已改为 `废案`）。
7. **`noUnusedLocals` 是防复发闸门**：它曾一次性抓出 17 处死代码。**别关掉它。**
8. **注释写的行为 ≠ 代码的行为，必须实测。** v3.8 发现 `ArticleReaderPage` 的注释写着
   「配图：放在正文下方」，但那段 JSX 实际渲染在 `<MarkdownView>` **之前** —— 图一直在
   正文上方。只读代码很容易顺着注释的意图「看懂」而漏掉顺序错误。
   **凡是断言 DOM 顺序 / 位置 / 版式的，要么量 `getBoundingClientRect()` 坐标，
   要么比对 `compareDocumentPosition()`，不要靠阅读下结论。**
9. **探针自己也会说谎，写完要检验探针。** 本轮踩到三次：
   - 用 `innerText` 找 `selected` / `navigate` 文案，但 Tailwind 的 `uppercase` 会把
     `innerText` 变成大写 → 误判为「功能没渲染」；
   - 在**空列表**上检查 `ul > div` 是否合法 —— 空列表根本没有 `<ul>`，于是「通过」了
     一个什么都没测的断言（补上数据后才复现出真实缺陷）；
   - 用 `Page.navigate` 改 hash 想测「刷新后数据仍在」，但**同文档导航不会重新挂载
     React**，等于没刷新（要加查询串或 `Page.reload` 才是真重载）。
   **每次「通过」都要问一句：这个指标真的能区分好坏吗？（呼应第 2 条）**
10. **在本机跑无头 Chrome 要带这些参数**：`--no-sandbox --disable-setuid-sandbox
    --disable-dev-shm-usage --disable-crash-reporter --disable-breakpad
    --disable-gpu --disable-software-rasterizer`。否则 Chrome 自己的 sandbox 初始化
    失败会直接 `SIGTRAP` 崩掉，表现为「DevTools 连上了又立刻断开」。
    仍然**不要加 `--virtual-time-budget`**（见第 11 节，会卡死 IndexedDB）。
11. **`git add -A` 会带上未跟踪目录（2026-09-16 真实踩坑）**：项目根目录的
    `参考文件ventana/` 与 VidaOS 无关但未 gitignore，一次 `git add -A` 把 1.4 万行
    卷进了「数据页说明书弹窗」的提交里。撤销手法：`git reset --soft HEAD~1` →
    `git reset <误提交的目录>` → 重新 `git add` 只该提交的文件。**提交前先 `git status` 看全。**
12. **LSP 报错可能只是索引缓存过期**：删除文件后编辑器仍报该文件的 module not found
    （如 `MailboxPage.tsx`），但 `npx tsc -b` 干净通过 —— 先跑真实编译再判断，别被
    过期诊断带偏去重抄已删除的页面。
13. **PDF 像素级验证法（4377d94 版式）**：用 PyMuPDF（fitz）把导出的 PDF 转 PNG，
    逐页检查：内容上下留白是否对称（文字偏上 = 末页/内容页定位 bug）、
    行是否被横切（找与文字行重叠的页面边界线）。浏览器坐标预测不可信，
    以**同一张渲染 canvas 的像素扫描**为准（这就是 `computePageCuts` 的原理）。
14. **macOS「open 静默丢 URL」→ 双击 .command 无反馈假象（2026-09-28）**：
    用户反馈「双击打不开网页、移动端也打不开」。排查发现 dev server 已被双击正常拉起
    （vite 在跑、`curl localhost:5173` 200、`open` 退出码 0），但 Chrome 当时未就绪，
    **`open` 退出码 0 不代表标签真的弹出**（与 9/23 headless 抢占同类：命令层成功、
    页面层无反应）。教训：验证「打开网页」必须以**用户可见的证据**为准
    （如 Chrome 进程数变化/新标签出现），不能信退出码。
    加固（`打开VidaOS.command`）：a) 打印**手机局域网访问地址**
    （`ipconfig getifaddr en0/en1`，vite 已 `host:true`，同一 Wi-Fi 可直接访问）；
    b) 提示语给出「手动复制地址」兜底；c) 「服务已运行」分支不再瞬闪退出，
    停留 2 秒让用户看清地址。移动端打不开的另一半是**手机地址不对**
    （手机上敲 `localhost` 指的是手机自己，必须用 `http://<电脑局域网IP>:5173`）。
15. **用户对色值是"反馈步进式"微调的（2026-09-28 实况）**：日间卡片色同一天连调 6 版
    （#e7cfd4 → #f7cfd7 → #ffe0e0 → #ffe8e8 → #fdebeb → #fce8dd），每版都基于一小步
    口头反馈（"淡一点点"→"再降饱和"→"灰一点但稍微粉一点"）。这是正常的确认过程，不是
    返工失控，但按以下做法收敛成本：a) 每版只改两处（globals.css `--card-bg` +
    SettingsPage 预览色），refactor 前先确认用户要的"最终候选"；b) 提交信息带明确色值
    （如 `🌏 杏粉卡片：…#fce8dd`），git log 可逐版回退；c) 每版做完仍需 CDP 实测渲染色
    + 截图（8 张 glass-card 一致），不要因为"只改了个颜色"就跳过验证。
16. **用户对色值的定性描述 ≠ 精确色值**："再淡一点点""低饱和一点""灰度高一点点"这类
    描述只有相对含义，直接按直觉跳级改容易过头（#fdebeb 被评"太白了"）。更稳的做法：
    在用户当前满意色的基础上给 **2~3 个同方向候选色值**（附 RGB 差异说明）让他一次选，
    减少往返。

---

## 13. 变更日志

### [v4.2] - 2026-09-18 —— 碎片页 + Agent 多会话助手 + 全局查找范围扩展
- **碎片页**（`137ae3f`，数据层 `f3f801d`）：
  - 底栏与顶栏「日记」→「碎片」（Fragments · Stream）；`DiaryPage` 整体重写为
    **微信式气泡流**：右侧酒红气泡（--wine 底 --moon 字），按天分组（今天/昨天/M月D日）
    日期吸顶，`MarkdownView` 渲染正文（双链自动生效），多图（MediaImage），
    标签/星标/更多按钮，**长按**弹出编辑/星标/复制/转文章/删除菜单；
  - 底部 fixed 输入区（Enter 发送 / Shift+Enter 换行、图片选择、pending 预览）；
    「只看星标」筛选；空态「今天想说点什么？」自动聚焦输入框；
  - **页内查找替换**：工具行「查找替换」按钮 + `PageFindBar` + `usePageFind<HTMLUListElement>`
    + `useGlobalFocus('fragment')`，命中高亮/上下跳转/替换/全部替换；
  - `globals.css` 新增 `.frag-bubble` 系列覆盖 `.prose-vidaos` 颜色为 --moon（气泡内文本）。
- **Agent 页**（`6aaafcf`）：
  - `src/lib/agentEngine.ts`：chatEndpoint 规范化（已含 /chat/completions 原样；
    /v 数字结尾补 /chat/completions；否则补 /v1/chat/completions）、buildMessages
    （system=人格+资料库索引+使用约定+历史）、docsIndexText（含内置「碎片」虚拟文档）、
    fragmentsIndexText（最近 40 条）、resolveDoc/resolveMemory（精确→模糊）、
    snippetFor（>6000 字中文滑窗截取，extractTerms 中文按 2~4 字片段切分提升命中）、
    scanMarkers（剥 `[[读:]]`/`[[忆:]]`）、extractWriteMemory（`[[记:标题]]` 正文 → 记忆）、
    streamChatCompletion（SSE 流式）、demoReply/demoStream（演示模式）、sessionToTxt、
    GREETING/DEFAULT_PERSONA、hasApiConfig、MAX_TOOL_ROUNDS=3、DOC_MAX_BYTES=400KB；
  - `AgentChatView.tsx`：两区布局（气泡流+底部输入）、顶栏返回/重命名/API 或演示徽标/
    导出/记忆馆（未读红点）/设置；sys 系统事件灰丸、AI 回复非盒子 `.agent-reply`
    渲染 Markdown+流式光标、用户酒红气泡；气泡 acts（复制/重新生成/删除）；
    演示模式逐字流式；runTurn 支持多轮工具标记循环（读文档/记忆回填→续写）；
    `[[记:]]` 自动写记忆馆并插 sys 消息；停止按钮；配置侧边抽屉（连接三输入+自检+清除/
    人格上传覆盖/资料库上传≤400KB/记忆馆展开/归档管理）；重命名/导出/归档/删除；
  - `AgentPage.tsx`：无选中会话时显示**会话列表**（新建会话自动带 GREETING greet 消息、
    空态、归档抽屉展开/恢复/导出/删除）；多会话 = 会话列表 → 点进 → 聊天；
  - 数据：AppState.version=3 不动，loadState 兜底默认值；`apiKey` 只存本机，
    **WebDAV 备份剔除 apiKey 与 WebDAV 密码**，导入合并时若备份无 key 保留本机 key；
  - 引擎纯逻辑测试 26/26 PASS（esbuild bundle + node 断言）。
- **全局查找扩展**（`137ae3f`）：ScopeKey/HitKind 扩为 article|moment|fragment|inspiration，
  SCOPES 加「碎片」「灵感」；fragment 命中跳转 /diary，inspiration 命中跳转 /notes
  （NotesPage 自动切到灵感块并清空分类筛选）；灵感页（InspirationView）新增工具行
  「查找替换」按钮 + 页内查找。
- **接手文档校正**（2026-09-28）：第 0/2/4/5/7/8/11/14 节与当前代码对齐 ——
  补齐 v4.2 数据模型（Fragment/Agent 系）、文件结构（agentEngine/agent 组件目录、
  src 58 文件）、新增第 4 节之 19) Agent 对话引擎架构、功能清单去掉占位页、
  已知问题补 Agent SSE 无超时等，版本号统一 v4.2。

### [v4.2.1] - 2026-09-28 —— 日间色板定稿（背景 #fdf2e1 + 卡片 #fce8dd）
- **白昼书房页面背景改为暖米**（`bc4dc6c`）：`--bg-base` `#F5F9E5 → #fdf2e1`，
  `--bar-bg` 同步 `rgba(253,242,225,.82)`；`SettingsPage` 主题卡预览同步。
- **卡片底色 6 版迭代定稿**（`0d312b3` → `c90585c` → `f856214` → `8ab06c6` →
  `7030bc5` → `c0bea19`）：`#e7cfd4` → `#f7cfd7` → `#ffe0e0` → `#ffe8e8` →
  `#fdebeb` → **`#fce8dd`（低饱和杏粉，`rgba(252,232,221,0.92)`）**；全程
  `--card-bg-elevated` 未动；每版均 CDP 无头 Chrome 实测 8 张 glass-card 渲染色一致
  + 截图确认后提交。
- **设置页预览同步**：`SettingsPage.tsx` `PREVIEW_COLORS.day.card` 跟随最终色
  `#fce8dd`（ThemePreviewCard 永不叠色块，文字落在当前主题实色卡面上）。

### [v4.1] - 2026-09-18 —— 主页待办模块 + Obsidian 风格双链 + 收藏夹副标题改名
- **主页待办模块**（`369d14c`）：`TodoSummaryCard` 挂在主页日程模块下方（DeskPage），
  展示全部未完成待办（最多 6 条，超出显示「去便签查看」）；支持顶部输入框快速添加
  （回车确认）与行内勾选完成；空态引导去便签新建。
- **Obsidian 风格双链**（`a80d81f`）：
  - `markdown.ts` 用 marked 行内扩展 `wikilink` 解析 `[[标题]]` / `[[标题|别名]]`，
    输出 `<a href="wiki:...">`（代码块 / 行内代码内不解析）；DOMPurify 白名单加 `wiki:`；
  - `MarkdownView` 新增 `wikiLinks` prop（默认 true）：点击双链跳转对应文章，
    **目标不存在时自动创建空文章**并跳转；目标不存在标记 `vd-wiki-missing`（灰色虚线）；
    编辑器预览传 `wikiLinks={false}`（避免导航把全屏编辑器留在页面）；
  - `ArticleReaderPage` 底部新增**反向链接**（其它文章/动态里 `[[本文标题]]` 引用）
    与**正向链接**（本文引用的目标，不存在标 `·` 可点击创建）；
  - `MarkdownEditor` 桌面工具栏 / 移动内联栏 / 选区浮动条新增「双链」按钮：
    桌面弹出**文章选择器**（点标题插入 `[[标题]]`，或手动输入），移动端直接插入占位；
  - `plainText` 与编辑器字数统计剥离双链语法（`[[标题|别名]]` → 标题）。
- **收藏夹副标题改名**（`f1f0316`）：FeatureGrid 宫格描述与 TopBar 副标题
  「喜欢的一切」→「收藏的项目」。
- 数据模型无变更（双链只是正文 Markdown 语法），无需 DB 迁移。

### [v4.0] - 2026-09-16 —— 信箱移除 + 云同步与端到端加密 + 说明书弹窗
- **信箱功能整体移除**（`89a12ec`，BREAKING）：删 `Letter` 类型、信箱页/编辑器/搜索/收藏/
  数据导出范围/备份链路/路由；**便签迁入主页宫格第 4 格**；`loadState` 自动迁移
  （剥 letters、滤 letter 收藏、`lastTab` 归一化回退 `desk`）；
  底栏改为 **主页/日记/Agent/数据/设置**（`TabKey` 重定义，`DiaryPage`/`AgentPage` 占位）。
- **WebDAV 云同步**（`93afbde`）：`webdav.ts` 全量 gzip 快照（`CompressionStream`）、
  MKCOL + PUT 上传、文件名 `vidaos-backup.json.gz` 固定覆盖、错误归因
  （401/403/404/409/507/CORS/网络）；数据页新增「WebDAV 全量备份」区块（配置表单 +
  云端备份 + 注意事项）；顶栏齿轮全部改为云同步图标（未配置跳 `/data` 提示）。
- **端到端加密 + 云端取回**（`cb4934e`）：PBKDF2(150000) + AES-256-GCM，密文容器
  `VDOS1`+salt(16B)+iv(12B) 自包含；加密开关 + 口令输入 + 丢失口令警示 +
  「云端恢复」按钮（下载→自动识别加密→需口令→确认覆盖）；冒烟验证：正确口令往返一致、
  错误口令失败、明文不被误判；关闭开关维持明文链路。
- **备份配置说明书弹窗**（`7a89da7`）：WebDAV 区块下方小字链接「备份配置说明书」，
  弹窗覆盖：配置教程（应用密码生成/地址填写/保存/备份/恢复）、失败详解
  （401/404/409/CORS/507/解密失败）、端到端加密说明（原理/口令管理/丢失后果）、
  重要提醒（单设备编辑/流量限制/恢复演练）。

### [v3.10] - 2026-09-14 —— 猩红书房 + 背景实色方案 + 移动输入三连修
- **猩红书房独立主题**（`6813fac` 方案卡 → `7e968ce` 封装为「特殊书房主题」→ `c08551e`
  液态玻璃卡片 → `bed4e0e` 光效锚点固定，**移除鼠标跟随**，`liquidGlass.ts` 已删除）；
  `ThemeMode` 增 `scarlet`；兼容旧配方（夜间 × 深紫 × 无自定义图）自动识别；
- **背景预设精简**：`backgrounds.ts` 仅 `none`（默认实色）/ `deep`（深紫，猩红专属渐变），
  `DEFAULT_BACKGROUND_PRESET='none'`；设置页「背景」区块删除（`75b1fc9`），
  移除背景装饰遮罩、修日间对比度与外观预览色块（`e06f2c8`）；
- **移动端输入修复**（`7a813f1` + `a2cc025`）：重命名弃用原生 `prompt()` 改应用内
  `showModal` 的 inputMode；查找面板聚焦**释放 body 滚动锁**；栏色统一 `var(--bar-bg)`；
  三处毛玻璃栏加 `will-change: backdrop-filter`。
- **待办排序**（`3c82841`）：排序模式 CSS 锁 `touch-action`；普通模式长按成立后
  window 级原生 touchmove(passive:false)+preventDefault 接管。
- 合集操作按钮横排至标题栏下（`7e968ce`）。

### [v3.9] - 2026-09-13 —— 白昼书房 + 自托管字体 + 夸克兼容 + 查找替换体系
- **白昼书房日间主题**（`d5b9069`），三态并存（system/day/night）；编辑器日间文字
  不可见修复 + 内联语法工具栏重写（`644b492`）；日间皮肤可读性与完成按钮强化
  （`5773f10`、`e06f2c8` 部分）；日间白色查找框（`b1056f9`）；
- **自托管 Web 字体**（`cf1bb7f` + `74baea0`）：@fontsource 本地 woff2，中文走
  Noto Serif SC，移除 Google Fonts CDN；
- **夸克兼容**（`d76c515`）：`@vitejs/plugin-legacy` + dev es2018 + index.html 3.8s
  挂载兜底（夸克 UA 特判提示）；NO_QUARK 特判被移除；
- **查找替换**（`6e75a4b` → `0b7a5b9`）：全局覆盖层面板（⌘K，按钮「替换/全选/反选」
  复刻 Nookery）+ 三页面页内查找入口 + focusRequest 跳转定位闪烁（`80994ba`）；
- **移动端编辑器改版**（`32f1c5d` + `a32870b` + `40f780a`）：底部双行大按钮/浮动格式条/
  长按图片排序；「存」→「保存」；文件直接下载到系统下载文件夹；
- **待办**（`04c8c13` textarea 回车=换行；`a7c5676` 已完成自动置底；`27be1cf`/`0d19175`
  完成按钮边框与未完成态视觉强化）；
- **桌面/日程**（`b1056f9`）：日程主页编辑按钮+自动排序；日历「今」按钮（`f9dbd73`）；
  评论输入时隐藏底栏与 FAB + 触屏滚动优化（`2f1b0e8`）；
- 手机端背景切换不生效修复（`89897e4`）：body 透明化让 `-z-10` 背景层透出；
- 取消 `.dumate` 自动化测试快照跟踪（`f29d158`）。

### [v3.8] - 2026-09-12 —— 修掉三项实测确认的缺陷
（配图顺序 / SegmentedControl 滑块 resize / `ul > div` 非法嵌套 3 处 —— 与原版相同，
修完复测 15 项全绿，其中 7 项是回归不变量。教训见第 12 节第 8 条。）

### [v3.7] - 2026-09-12 —— 目录整理（废案归档，用户已删除）

### [v3.6] - 2026-09-12 —— PDF 版式重做（`4377d94`，当前仍生效）
- 修复**文字整体偏上、单行跨页切割**：切点改为在渲染画布像素上找行间空白带中点
  （`computePageCuts`），行判定全宽扫描，短行不再被误判为空白带；
- 页边距统一为顶 64pt / 底 48pt，**末页内容不足时垂直居中**（不再悬在顶部）；
- 新增页脚居中页码 `· n ·`；单图上限改为内容区高度减 24px。

### [v3.5] - 2026-09-11 —— PDF 排版回退到最早那一版（用户认为最好）
### [v3.4] - 2026-09-11 —— 信件标题 + PDF 每页只填一半
### [v3.3] - 2026-09-11 —— PDF 字号 / 空白页 / 格式 / 卡死
### [v3.2] - 2026-09-11 —— 动态互动 / 导出多选 / 快照备份
### [v3.1] - 2026-09-11 —— 动态 Markdown / 配图与 PDF / 配色精进
（v3.1~v3.5 明细与原版相同，含：皮肤系统被用户要求完全撤销、配色新增 charcoal/line/
amber/parchment/ash 与语义色、错误边界两层、9 项 P0 缺陷、死代码清理等。）

### [v3.0] - 2026-09-10 —— 暗夜书房重构
### [v2.1] - 2026-09-08 —— 借鉴 InternalBeyond 重构首页
### [v2.0] - 2026-09-08 —— 整体重写（液态玻璃 + IndexedDB）
### [v1.0] - 2026-09-07 —— DuMate 初版（已被取代）

---

## 14. 归属与致谢

- **项目归属**：用户个人项目
- **V2.x 设计借鉴**：[Sui-IB / InternalBeyond-Mobile](https://github.com/Sui-IB/InternalBeyond-Mobile)
  （PolyForm Noncommercial 1.0.0；仅 V2 借用，V3 起完全自研）
- **V3.x 设计哲学**：用户自定义「暗夜书房」色板与方向；三书房主题体系由用户推动
- **参与实现的 Agent**：Mavis（v3.0 重写）、多个会话（v3.1~v4.0 修复与功能）、
  另一位 agent（v3.6/v3.8 PDF 版式与缺陷修复）、v4.1/v4.2 会话（主页待办/双链/收藏夹改名/
  碎片页/Agent 多会话/全局查找扩展与接手文档校正）、v4.2.1 会话（日间背景 #fdf2e1 与
  卡片 #fce8dd 六版迭代定稿，含本轮流式更新文档）
- **最后更新日期**：2026-09-28