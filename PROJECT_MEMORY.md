# VidaOS - 项目记忆与交接文档

> 项目迭代历史、关键设计决策、架构约定与踩坑记录。**接手前请先读完第 0、1、3 节。**
> 最后更新：2026-09-12（v3.7 目录整理后）

---

## 0. 一页速览（接手先看这里）

| 项目 | 说明 |
|---|---|
| **是什么** | 纯前端、纯本地的个人生活记录 PWA（日记/便签/文章/动态/信件/收藏/音乐/备份） |
| **在哪里** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS`（**父目录含空格，命令里要带引号**） |
| **怎么跑** | 双击 `打开VidaOS.command`；或 `npm run dev` → http://localhost:5173 |
| **怎么构建** | `npm run build`（= `tsc -b && vite build`）→ `dist/` |
| **怎么自检** | `npm run typecheck`（已开启 `noUnusedLocals`/`noUnusedParameters`，编译即闸门） |
| **当前版本** | package.json 写的是 `3.0.0`；文档按迭代日志记到 **v3.7** |
| **技术栈** | Vite 5 + React 18 + TS + Tailwind 3 + Zustand + Dexie 4 + PWA |
| **数据在** | 浏览器 IndexedDB（库名 `vidaos`，表 `state` / `files` / `meta`）；**无后端、无账号** |

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
| **项目类型** | 纯前端 SPA（个人博客 / 生活记录），PWA 离线可用 |
| **存放路径** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS` |
| **Git 仓库** | 已初始化，`master` 分支，无 remote（历史都是本地的） |
| **设计语言** | 暗夜书房：深色 + 用户自定义色板 + 烛光环境光 |
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
- **v3.1 ~ v3.7（2026-09-11 ~ 09-12）** —— 修完 9 项 P0 缺陷、死代码清理、错误边界、
  动态评论/收藏/时间线/查找替换、图片插入正文、导出多选、本地快照备份、配色精进、
  皮肤实验（**已撤销**）、PDF 导出多轮返工（见第 12 节）、信件标题、目录整理。
  详见第 13 节变更日志。

---

## 3. 设计语言与色板（用户亲自选定，**不要擅自改**）

### 定位
VidaOS 不是社交网络，是**私密的个人生活记录空间**。暗色优先，文字是绝对主角。

### 屏幕色板（`tailwind.config.js` + `src/styles/globals.css` 的 `:root`）

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

### 字体
- **显示/数字**：`JetBrains Mono`（时钟、英文小标）
- **正文/标题**：`EB Garamond`（衬线，长文阅读）
- **UI 元素**：`Inter`（无衬线）
- 字体从 Google Fonts 加载（`index.html`），PWA 运行时缓存。

### 排版基准（当前值）
- 正文 `.prose-vidaos`：`1.1875rem`（19px）/ 行高 `1.95`
- 文章/信件阅读页标题：`1.75rem`（sm 以上 `2rem`）
- 动态正文 `.prose-moment`：`1rem` / 行高 `1.85`（比长文紧凑）

### 打印/PDF 专用配色（与屏幕不同！）
米色底 `#F2EBE0` + 正文 `#1B1A1F` + 小节标题酒红 `#6A080E` + 辅助 `#947D75`。
PDF 里**不要用屏幕的暗色 token**。

---

## 4. 关键设计决策

### 1) 分层
`pages/`（路由页面）→ `components/`（layout / home / notes / editor / common）→
`stores/`（状态）→ `lib/`（数据与工具）。路由与全局布局在 `App.tsx` 与 `main.tsx`。

### 2) 状态管理：三个 Zustand store
- `useAppStore`：**业务数据**（profile / collections / articles / moments / letters /
  favorites / notes / categories / tracks / settings）+ 全部 action。
  另外带一个**运行时标记 `hydrated`**（不持久化）。
- `useUIStore`：UI 状态（currentTab / notesTab / **selectedDate** / editor / toasts / modal）。
- `useMusicStore`：音乐播放（持有 `audio` 实例与 WebAudio 节点）。

### 3) 持久化（**曾有致命 bug，务必遵守**）
数据存 Dexie（IndexedDB），`useAppStore` 的改动经 **400ms 防抖**后写入。
**必须只用 `snapshot(store)` 取纯数据字段写库** —— 直接把 `get()` 交给 IndexedDB 会因为
里面混着 action 函数而抛 `DataCloneError`，且被 try/catch 吞掉 → **数据静默不落库**（v3.0 真实事故）。
`hydrated` 必须为真后才允许回写 `settings.lastTab`，否则会用初始值覆盖刚读出的持久化值。

### 4) 路由：HashRouter
静态托管无需 SPA fallback。Tab 路由 `/desk /notes /data /settings`；
子视图 `/space/collection/:id`、`/space/article/:id`、`/mailbox/letter/:id`。
`TopBar` 依据 `location.pathname` 决定标题与返回键。
**HashRouter 并不能让 `index.html` 用 `file://` 打开**（Vite 入口模板 + ES module 被 CORS 拦），
v3.0 文档曾误称可以，已证伪。

### 5) 数据模型
见 `src/types/index.ts`。要点：
- `Article.imageIds` / `Moment.imageIds` / `Letter.imageIds` 存 **fileId 引用**；
- `Moment.comments?: MomentComment[]`（**旧数据可能没有，读取一律 `?? []`**）；
- `Favorite` 是跨类型收藏（article / moment / letter）；
- `Settings.lastTab` 记录上次所在 tab。

### 6) 媒体文件与外链（fileId → objectURL）
图片/音频以 Blob 存在 Dexie `files` 表。`src/lib/fileUrl.ts` 维护 `id → objectURL` 缓存
（带失败缓存）。**`clearFileURLCache()` / `revokeFileURL()` 目前仍无人调用**（见第 8 节）。

### 7) 正文内嵌图片：`fileRef:` 语法
正文里写 `![说明](fileRef:<fileId>)` 即可把本地图片插进正文。
- `src/lib/markdown.ts` 的 DOMPurify 已放开该协议（否则 `src` 会被删掉）；
- 渲染必须走 **`<MarkdownView>`**（`components/common/MarkdownView.tsx`）：
  它渲染后再把 `img[src^="fileRef:"]` 换成 objectURL，文件缺失时显示「（这张图片已丢失）」；
- 导出/备份必须通过 `collectFileIds()` 收集引用（它会扫 `imageIds` + `content` 里的 fileRef）；
- 编辑器缩略图有「插入正文」按钮（在光标处插入）+ 拖拽排序。

### 8) 背景与「栏色」
`Background.tsx` 按 `profile.backgroundPreset` 渲染预设渐变，或按 `backgroundFileId`
渲染自定义图（加 62% 暗色蒙版保可读性）。预设色卡在 `src/lib/backgrounds.ts`。
**注意：背景只在卡片缝隙里露出一条（手机上约 16px），用户很难看出切换。**
所以每个预设还带一个 `bar` 字段，驱动 `--bar-bg`，让**顶栏/底栏**跟着变色 —— 这才看得见。

### 9) PDF 导出（**本项目最脆弱的部分，改动前请读第 12 节**）
当前实现：`html2canvas` 把整篇渲成**一张长 canvas**，再按页切片贴到各页。
- 页面几何：`PDF_RENDER_W = 720`、`PT_PER_PX = A4_W / 720`、
  `MARGIN_TOP = 64` / `MARGIN_BOTTOM = 48`、`PAGE_CONTENT_PX` 为每页可用高度；
- **切点由 `computePageCuts()` 直接在 canvas 像素上找行间空白带中点** ——
  与最终贴图出自同一张画布，避免「浏览器坐标预测 vs html2canvas 实际排版」的累积偏差；
- 末页内容不足时垂直居中；每页有居中页码（`· n ·`）；单图上限为内容区高度减 24px；
- 图片以 data URL 内嵌（`buildImageDataUrls`）；正文 `fileRef:` 由 `resolveInline()` 换成 data URL；
- 排版沿用用户最喜欢的「最早那一版」观感：连续排版 + 等比铺满整页宽度。

### 10) 本地文件夹快照备份
`src/lib/snapshot.ts`（File System Access API）。每份快照是一个文件夹：
`manifest.json` + `data.json.gz` + `files/<fileId>`。
- **最多 10 份，超出自动删除最早的**（只统计 `vidaos-snapshot-*` 目录，
  手动导出走下载、不占额度）；同一秒内连存会追加序号；
- 体积优化：state 用原生 `CompressionStream('gzip')`（实测约 36%），
  媒体文件按原 Blob 直存（**不做 base64**，省约 33%）；
- 文件夹句柄存在 Dexie `meta` 表（db version 2）。
- Safari/Firefox 不支持该 API，已给提示并引导用 JSON 导出。

### 11) 错误边界（两层）
`components/common/ErrorBoundary.tsx`：
- **最外层**（`main.tsx`，包住 HashRouter）：`variant="fullscreen"`，兜住 App/路由错误；
- **页面级**（`App.tsx`，包住 `<Routes>`，`resetKey={location.pathname}`）：
  单页崩溃时顶栏与底部 Tab 仍可用，切路由自动复位。

> 之所以必须加：v3.0 曾因 `App.tsx` 两个 effect 互相 ping-pong 触发
> `Maximum update depth exceeded`，**点任意 Tab 就白屏**（已修）。

### 12) 音乐播放器
内置音景用 WebAudio 实时合成（雨声 = 白噪声 + 低通；烛光 = 60/90Hz 叠加），
本地音频用 `<audio>` + objectURL。`pause()` 保留 `audioEl` 以支持同曲续播。

### 13) 分类管理
灵感/日程/待办各有 `categories: string[]`，支持筛选 + 双击重命名 + 删除 + 新增；
删除分类保留便签（便签的 `category` 字段不变）。

### 14) 皮肤系统：**已撤销，不要再加**
v3.1 曾做过可命名皮肤（含浅色卡片），用户试用后要求**完全撤销**（配色回到原版）。
`src/lib/skins.ts` 与相关 CSS 段已删除，`settings.skin` 字段也已移除。
**不要再引入皮肤/主题切换**，除非用户明确要求。

---

## 5. 文件结构与职责

```
VidaOS/
├── 打开VidaOS.command          # ★ 双击启动（自动装依赖 → 起服务 → 开浏览器）
├── index.html                   # Vite 入口模板（勿双击）
├── src/                         # 50 个文件，唯一权威实现
│   ├── main.tsx                 # 入口：ErrorBoundary(fullscreen) > HashRouter > App
│   ├── App.tsx                  # 全局布局 + 路由 + tab 同步 + Background + ErrorBoundary(inline)
│   ├── styles/globals.css       # 全局样式 + 设计 token(:root) + Markdown 排版 + 工具类
│   ├── types/index.ts           # 全部数据类型
│   ├── lib/
│   │   ├── db.ts                # Dexie：state / files / meta（version 2）
│   │   ├── fileUrl.ts           # Blob → objectURL 缓存
│   │   ├── markdown.ts          # marked + DOMPurify（放开 fileRef: 协议）
│   │   ├── exportImport.ts      # 导入导出：JSON/MD/TXT/PDF + 范围多选 + 分页切点
│   │   ├── snapshot.ts          # 本地文件夹快照（≤10 份，gzip + 原 Blob）
│   │   ├── backgrounds.ts       # 背景预设色卡 + 栏色
│   │   └── utils.ts             # 时间/ID/压缩/文本工具
│   ├── stores/                  # useAppStore / useUIStore / useMusicStore
│   ├── components/
│   │   ├── layout/              # Background / TopBar / BottomTabBar
│   │   ├── home/                # ClockHeader / FeatureGrid / CalendarCard / DayScheduleCard / MusicPlayerCard
│   │   ├── notes/               # SegmentedControl / CategoryChips / Inspiration / Schedule / Todo / ScheduleEditor
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage
│   │                            #   + ErrorBoundary / MarkdownView
│   └── pages/                   # 11 个路由页面
│       DeskPage / NotesPage / DataPage / SettingsPage / SpacePage / CollectionPage /
│       ArticleReaderPage / MomentsPage / MailboxPage / LetterReaderPage / FavoritesPage
├── public/                      # favicon.svg + icons/（PWA 图标，manifest 引用）
├── scripts/make-icons.mjs       # ⚠️ 生成 PWA 图标（依赖 sharp 但**未在 package.json 声明**，当前跑不了）
├── docs/
│   ├── preview-v3-*.png         # 5 张界面截图（README「界面预览」引用中）
│   └── palette-suggestion.html  # 色板依据（当前生效的颜色就来自它）
├── PROJECT_MEMORY.md            # 本文件
├── README.md
└── 配置：vite.config.ts(PWA+别名) / tailwind.config.js(色板) / postcss.config.js /
        tsconfig.json(strict + noUnusedLocals，exclude 含 废案) / package.json / .gitignore
```

---

## 6. 历史归档（工作区已删除，git 可取回）

2026-09-12 曾把两批内容集中到 `废案/`，**用户已备份并删除该目录**，工作区不再有它：

| 原内容 | 说明 | 现在怎么拿回来 |
|---|---|---|
| `废案/archive-v2/` | V2.1 完整旧应用（原生 HTML/CSS/JS，可直接双击运行） | `git checkout 4377d94 -- archive/v2` |
| `废案/dumate-临时验证/` | 某轮排查 PDF 的临时截图与测试 PDF（51MB） | 不需要，可按第 11 节的方法重新生成 |

`.gitignore` 里仍保留 `/废案/` 一行（无害，防止以后临时堆放的文件进入版本库）。
**不要**把当前在用的文件往那儿放。

---

## 7. 已实现功能清单（当前）

- **桌面**：大时钟 Hero + 4 功能入口 + 双卡月历/当日日程（**点日期联动**）+ 音景播放器
- **空间**：Markdown 长文 + 合集 + 标签 + 封面 + 配图（**可插入正文**、可拖拽排序）
- **动态**：**时间线**（日期分组 + 竖线节点）+ 头像/昵称 + **评论** + **收藏**
  + **编辑（含改时间）** + Markdown 渲染 + **查找/替换**（高亮命中、上下跳转、替换/全部替换）
- **信箱**：信件（**有标题**）+ 照片 + 火漆未读提示
- **收藏夹**：跨类型聚合（文章 / 动态 / 信件）
- **便签**：灵感/日程/待办分区滑块 + 分类管理（增删改）+ 日程与首页日历联动
- **编辑器**：全屏 Markdown（工具栏 / 预览 / 图片 / **插入正文** / 字数 / 收藏星标）
- **数据**：导出 JSON（含图片 Base64）/ TXT / MD / PDF，**范围可多选**
  （文章 / 动态 / 信件 / 便签 / 收藏夹 / 个人资料）；PDF 内嵌图片 + 页码；
  **本地文件夹快照备份**（≤10 份，自动清理最早）；导入 JSON / MD / TXT
- **设置**：头像（压缩）/ 背景（5 预设 + 自定义，**栏色随之变化**）/ 昵称 / 签名
- **全局**：错误边界（不再白屏）、PWA 离线、响应式、键盘焦点环、
  `prefers-reduced-motion`、安全区适配

---

## 8. 已知问题与待处理（真实未修项）

- **`DataPage` 重置数据时未调用 `clearFileURLCache()`** → objectURL 缓存残留
  （`fileUrl.ts` 里这两个函数目前 0 调用）。
- **`SegmentedControl` 滑块位置**只在 `notesTab` 变化时测量，窗口 resize 或计数位数
  变化后会错位（缺 ResizeObserver）。
- **异步操作缺 try/catch**：`SettingsPage`（头像/背景上传）、`MarkdownEditor.handleImage`、
  `MusicPlayerCard.handleImport` —— 失败会产生 unhandled rejection，
  `handleImage` 失败时还会误报「已添加 N 张图片」。
- **a11y**：`MediaImage` 多数调用未传 `alt`；`Card` 带 `onClick` 时渲染为 `div`（键盘不可达）；
  `Toast` 无 `aria-live`；`Modal` 无 dialog 语义 / Escape。
- **`ul > div` 非法嵌套 3 处**（编辑态 `<Card>` 未包 `<li>`）：
  `InspirationView` / `ScheduleView` / `TodoView`。
- **`date-fns` 是未使用依赖**（`src/` 0 引用），可移除。
- **`scripts/make-icons.mjs` 跑不了**：依赖 `sharp` 但未写入 `package.json`
  （node_modules 里那个 sharp 是孤儿安装）。
- **动态目前不能调整配图顺序**（只有文章编辑器有拖拽排序）。
- 低优先级设想：文章加密、静态站点导出、自定义主题色。

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
| dexie | ^4.0.8 | IndexedDB 包装 | Apache-2.0 |
| marked | ^14.1.2 | Markdown 渲染 | MIT |
| dompurify | ^3.1.6 | HTML 净化 | MPL-2.0 |
| jspdf | ^2.5.2 | PDF 生成 | MIT |
| html2canvas | ^1.4.1 | DOM → canvas | MIT |
| lucide-react | ^0.441.0 | 图标 | ISC |
| date-fns | ^4.1.0 | **未使用**（可移除） | MIT |
| vite / @vitejs/plugin-react | ^5.4.3 / ^4.3.1 | 构建 | MIT |
| typescript | ^5.5.4 | 类型 | Apache-2.0 |
| tailwindcss / postcss / autoprefixer | ^3.4.10 / ^8.4.45 / ^10.4.20 | 样式管线 | MIT |
| vite-plugin-pwa | ^0.20.5 | PWA（Workbox，预缓存 19 条） | MIT |

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
| 改存档结构 | 注意 **`db.ts` 的 Dexie 版本号要 +1**，否则老用户数据读不出来 |
| 改设计 token | `tailwind.config.js` 的 `colors` **和** `styles/globals.css` 的 `:root`（两处） |
| 改导出 / 备份 | `lib/exportImport.ts`（`SCOPES` 与 `scopedState`）；快照相关在 `lib/snapshot.ts` |
| 改 PDF 版式 | `lib/exportImport.ts` 的 `exportPDF` + `computePageCuts` —— **先看第 12 节** |
| 改首页 | `pages/DeskPage.tsx` + `components/home/*` |
| 改编辑器 | `components/editor/*` + `globals.css` 的 `.prose-vidaos` |

### 怎么验证（本项目标准做法）
1. `npm run typecheck` + `npm run build`（最低要求，**不等于修好了**）；
2. **无头 Chrome 走真实 UI**：在项目根建一个临时 `__probe.html`（Vite 会伺服它），
   里面用 `iframe` 加载应用、用 JS 模拟点击/输入，再把结论 `POST` 给一个本地 HTTP 收集器；
3. 用完**删掉探针文件**，别提交。

⚠️ **两个已踩过的坑**：
- Chrome 的 `--virtual-time-budget` 会让 **IndexedDB 回调永不完成** →
  凡是依赖 IndexedDB 的探针都会卡住。改用「真实时间运行 + 探针把结果 POST 到本地收集器」。
- 探针里读元素样式/尺寸时注意 **`cssText` 会被浏览器规范化**
  （`width:620px` 读出来是 `width: 620px`，而且 `line-height` 里含 `height`）——
  先 `replace(/\s+/g,'')` 再比较。

### Git 提交约定
`feat:` / `fix:` / `style:`（不改逻辑）/ `refactor:` / `chore:` / `docs:`；
大版本变更在 footer 写 `BREAKING CHANGE:`。提交前确保 `git status` 干净、
`typecheck` 通过、临时探针已删除。

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

---

## 13. 变更日志

### [v3.7] - 2026-09-12 —— 目录整理
- 新建 `废案/`，把 `archive/v2/`（git mv）与 `.dumate/`（上一轮 PDF 排查的临时产物，
  51MB）移入；删除 `.DS_Store` / `tsconfig.tsbuildinfo` / `dist/`；
  `.gitignore` 加 `/废案/`；`tsconfig.json` 的 exclude 由 `archive` 改为 `废案`。
- 移入 `废案/` 的都是可安全删除的内容（旧应用在 git 历史中永久保留）。
- **用户随后已备份并删除 `废案/`**；仓库中不再有该目录，V2.1 旧应用改由
  `git checkout 4377d94 -- archive/v2` 取回。

### [v3.6] - 2026-09-12 —— PDF 版式由另一位 agent 重做
- 切点改为在渲染画布像素上找行间空白带中点（`computePageCuts`），行判定全宽扫描，
  短行不再被误判为空白带；
- 页边距统一为顶 64pt / 底 48pt，末页内容不足时垂直居中；
- 新增页脚居中页码；单图上限改为内容区高度减 24px。

### [v3.5] - 2026-09-11 —— PDF 排版回退到最早那一版（用户认为最好）
- 恢复「720px 容器连续排版 + 一次渲成长图 + 按页切片」的观感；
  移除逐页渲染 / 页面容器 / 按段落摊平与二分装箱等中间产物；
  只保留「切点不切断文字行」与「内嵌图片」两项。

### [v3.4] - 2026-09-11 —— 信件标题 + PDF 每页只填一半
- **信件没有标题输入框**：标题输入只在 `mode === 'article'` 渲染，而 `Letter` 有 `title` 字段 →
  永远为空且无处可填。现文章与信件都显示标题输入框。
- **PDF 每页只有上半部分**：曾按单元高度累加估算容量，但相邻段落 margin 会折叠 →
  严重高估 → 每页塞满后又被收敛逻辑推走。改为用真实布局二分。

### [v3.3] - 2026-09-11 —— PDF 字号 / 空白页 / 格式 / 卡死
- **导出把页面卡死**：分页循环每追加一个节点读一次 `scrollHeight` = 几千次同步重排。
  改为批量测量。
- **图片后面两大页空白**：图片限高 866 + 边距 28 = 894 > 每页 890 → 被判"超过一整页"，
  而拆分函数对非文本节点 `return null` → **图片被丢弃并留下空白页**。
- **正文太小**：正文 14 → 16px；**灵感/动态换行被吞**：`escapeHTML` 改为 `renderMarkdown`。
- JPEG 质量 0.92 → 0.86。

### [v3.2] - 2026-09-11 —— 动态互动 / 导出多选 / 快照备份
- 动态：头像 + 昵称 + **评论**（`Moment.comments`）+ **收藏**
  （顺带让收藏夹里原本无法触发的「动态」分支可用）+ **时间线**（日期分组 + 竖线节点）
  + **查找/替换**（`<mark>` 高亮、上下跳转、替换/全部替换）。
- 导出范围**多选**；新增「收藏夹」（自包含：带上被收藏的文章/动态/信件及其合集）
  与「个人资料」范围。
- **本地文件夹快照备份**：≤10 份、超出删最早、手动导出不占额度；
  state 走 gzip（约 36%）、媒体按原 Blob 直存（省约 33%）；
  `db.ts` 升到 version 2（新增 `meta` 表存句柄）。

### [v3.1] - 2026-09-11 —— 动态 Markdown / 配图与 PDF / 配色精进
- 动态支持 Markdown（`.prose-moment` 紧凑排版）；文章配图修复；
  **图片可插入正文**（`fileRef:` + `MarkdownView`）；PDF 内嵌图片；文章标题/正文字号调整。
- 配色精进（按 `docs/palette-suggestion.html`）：新增 `charcoal`（层级）、`line`（描边）、
  `amber`（高亮）、`parchment`、`ash` 与三个语义色 `olive`/`sapphire`/`wine.bright`；
  卡片底色由发褐的棕改为中性炭黑。
  **皮肤系统（含浅色卡片）在下一版被用户要求完全撤销。**

### [v3.0-修复与清理] - 2026-09-11
- **错误边界**：两层（最外层全屏 + 页面级），渲染出错不再白屏。
- **两个致命缺陷**：点任意 Tab 白屏（effect ping-pong）；数据持久化从未生效（`DataCloneError`）。
- **9 项 P0 缺陷**：月历↔日程联动、首页新增日程写成灵感、背景设置无效、
  音乐暂停实为重播、编辑器收藏星标不渲染、日期格式串 `M`/`D`、过去日程只显示一天、
  不可达 mode、编辑器输入被清空。
- **死代码清理**：开启 `noUnusedLocals`/`noUnusedParameters`；删除死导出 / 死 props /
  死 CSS 类；**移除 `useAppStore` 内 38 处多余的 `set(... as any)`**。
- **全量审计**：29 项问题（P0 9 / P1 12 / P2 8），带 `file:line`，摘要见第 9 节。

### [v3.0] - 2026-09-10 —— 暗夜书房重构
V2.1 归档；设计语言改为深色「暗夜书房」+ 用户色板；技术栈升级为
Vite 5 + React 18 + TS + Tailwind 3 + Zustand + Dexie 4；字体改为
EB Garamond + JetBrains Mono + Inter；全屏 Markdown 编辑器重写；月历与日程双卡；
WebAudio 音景；空间/动态/信箱/收藏/便签/数据/设置八大模块；
PWA（vite-plugin-pwa + Workbox）。

### [v2.1] - 2026-09-08 —— 借鉴 InternalBeyond 重构首页
### [v2.0] - 2026-09-08 —— 整体重写（液态玻璃 + IndexedDB）
### [v1.0] - 2026-09-07 —— DuMate 初版（已被取代）

---

## 14. 归属与致谢

- **项目归属**：用户个人项目
- **V2.x 设计借鉴**：[Sui-IB / InternalBeyond-Mobile](https://github.com/Sui-IB/InternalBeyond-Mobile)
  （PolyForm Noncommercial 1.0.0；仅 V2 借用，V3 起完全自研）
- **V3.x 设计哲学**：用户自定义「暗夜书房」色板与方向
- **参与实现的 Agent**：Mavis（v3.0 重写）、本会话（v3.1~v3.7 修复与功能）、
  另一位 agent（v3.6 PDF 版式重做）
- **最后更新日期**：2026-09-12
