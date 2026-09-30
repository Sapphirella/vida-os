# VidaOS - 项目记忆与交接文档

> 项目迭代历史、关键设计决策、架构约定与踩坑记录。**接手前请先读完第 0、1、3 节。**
> 最后更新：2026-09-29（v4.4.1 代码状态 + **交接文档整理**：重写第 11 节验证方法（无头 Chrome 实操套路
> 与三个环境坑）、新增第 15 节「让外部 AI 读写 VidaOS 的候选方案与推进顺序」、校正已下线功能的残留描述）

---

## 0. 一页速览（接手先看这里）

| 项目 | 说明 |
|---|---|
| **是什么** | 纯前端、纯本地的个人生活记录 PWA（主页/便签/文章/动态/收藏/音乐/云备份/**馆藏**/Agent） |
| **在哪里** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS`（**父目录含空格，命令里要带引号**） |
| **怎么跑** | 双击 `打开VidaOS.command`；或 `npm run dev` → http://localhost:5173 |
| **怎么构建** | `npm run build`（= `tsc -b && vite build`）→ `dist/`（**已 gitignore，别提交**） |
| **怎么自检** | `npm run typecheck`（已开启 `noUnusedLocals`/`noUnusedParameters`，编译即闸门） |
 | **当前版本** | package.json / 设置页 / README 均已对齐 **v4.4.1**（2026-09-29） |
| **技术栈** | Vite 5 + React 18 + TS + Tailwind 3 + Zustand + Dexie 4 + PWA + Web Crypto |
| **数据在** | 浏览器 IndexedDB（库名 `vidaos`，表 `state` / `files` / `meta`，Dexie **version 2**）；**无后端、无账号** |
| **主题** | 暗夜书房（默认）/ 白昼书房 / 猩红书房（独立主题）；`localStorage['vidaos-theme']` |
| **底栏** | 主页 / **便签** / Agent / 数据 / 设置（v4.4：便签顶替了原「碎片」那格） |
| **主页宫格** | 空间 / 动态 / **馆藏** / 收藏夹（v4.4：便签那格改成馆藏） |
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
- **v4.3（2026-09-29）** —— **进入页面布局卡顿修复**：Agent 会话页与碎片页的
  头部/底部输入框从 `fixed + env(safe-area-inset-*)` 改为 flex 流内布局
  （App.tsx 根容器 `h-[100dvh] overflow-hidden`，页内 `flex-1 min-h-0` 滚区），
  消除 WebKit 对 fixed + env() 的双重布局计算延迟（**view-enter 动画移除无效**，
  见第 17 节 fixed→flex 记录）；**灵感页功能补全**：便签-灵感支持星标
  （`toggleInspirationStar`）、一键转文章（`convertInspirationToArticle`，生成本地
  Article 进入空间）、撰写/编辑时多图上传（复用碎片 compressImage + putFile + MediaImage），
  数据模型 `InspirationNote` 新增 `starred: boolean` 与 `imageIds: string[]`；
  `db.ts loadState` 迁移兜底旧数据（补 `starred: false`、`imageIds: []`）。
- **v4.3.1（2026-09-29）** —— **桌面端三页底部遮挡修复**：主页/数据/设置页滚动到底时
  内容被固定定位的 BottomTabBar（56px）遮挡；根因是 `<main>` 内部包裹 div 同时有
  `flex-1 min-h-0 flex flex-col`（flex 压缩）且 padding-bottom 不足。修复：内部 div
  改为 `flex flex-col`（移除 flex-1/min-h-0），`<main>` padding-bottom 调为
  `pb-[calc(80px+env(safe-area-inset-bottom))]`，确保内容完整露出在底栏上方。
- **v4.4.1（2026-09-29）** —— **馆藏阅读器缺陷修复 + 移除阅读器内 AI 入口**（用户实测反馈）：
  ① 高亮在浅色主题下几乎不可见 → 改用主题 token `--mark-bg/--mark-fg`（浅色主题会连文字颜色一起变）；
  ② 电脑端划线/高亮后「下一行文本缩进」→ 包裹方式从 `Range.surroundContents` 改成
  **按文本节点逐段包裹**（详见第 12 节教训 22）；
  ③ 滑到底部进度只有 93% → 到底即记最后一块（100%），往回滚会回落；
  ④ 阅读器内「问 AI / 共读抽屉」按用户要求**整体移除**；
  ⑤ Agent 聊天回复「（无内容）」→ 接口空返回不再静默（识别推理型模型的 `reasoning_content`、
  非流式 JSON、Ollama 形状，并把原因写进对话），`max_tokens` 500 → 2048；
  ⑥ 阅读器内屏蔽原生右键/长按菜单 + 触摸端工具条改到**选区下方**（避开安卓原生浮层）。
- **v4.4.0（2026-09-29）** —— **馆藏上线、碎片下线**：
  ① **碎片功能整体删除**：`DiaryPage` / `FragmentEntry` / store actions / 全局查找的「碎片」范围 /
  Agent 内置「碎片」虚拟文档 / `.frag-bubble` 样式全部清掉；旧 `fragments` 字段**不迁移、直接丢弃**
  （用户明确选择彻底删除）。**注意**：碎片条目的图片 blob 仍留在 `files` 表里没人引用（没自动删，
  怕误删），要清理需要单独做一次「孤儿文件回收」。
  ② **底栏**「碎片」那格换成 **便签** → 主页 / 便签 / Agent / 数据 / 设置。
  ③ **主页宫格**「便签」那格换成 **馆藏** → 空间 / 动态 / 馆藏 / 收藏夹。
  ④ **馆藏**：导入本地 txt / md 成书（正文存主数据、md 按 Markdown 渲染、连续滚动 + 记住读到哪）；
  阅读器里长按选中 → 划线 / 高亮 / 复制；划线高亮收进右上角**书签**面板。
  （v4.4 曾配「选中→问 AI」的共读抽屉，**v4.4.1 已按用户要求移除**。）详见第 4 节之 21) 与第 13 节。
- **v4.3.3（2026-09-29）** —— **备份与恢复的数据安全修复**：灵感的 `imageIds` 与碎片的
  `imageIds` 此前不在 `collectFileIds` 里（导出 JSON / WebDAV / 快照三条备份路径都共用它），
  **备份只有条目没有图、原图不可恢复**；导入 JSON / WebDAV 取回 / 快照恢复三条路又都绕过
  `loadState` 的迁移兜底，导入 v4.2 及更早的备份后进「便签」会直接 `TypeError` 崩溃。
  已补全文件收集、抽出 `normalizeState()` 并在 `importState` 两条分支统一调用；
  另修灵感编辑草稿不复位（含孤儿图）、「转文章」无去重、启动脚本端口判定三处。
  详见第 8.3 节与第 13 节。
- **v4.3.2（2026-09-29）** —— **布局链统一**：v4.3.1 的修法把碎片页/Agent 页的
  「确定高度」弄丢了（输入框浮到屏幕中间、消息流不再内部滚动、新碎片被底栏切掉 40px）。
  改为把 `overflow-y-auto` 与 80px 避让一起下沉到内层 div（保留 `flex-1 min-h-0`），
  `main` 只负责给固定顶栏让位；新增 `.app-shell`（`100vh` + `100dvh` 双写）兜住旧内核。
  13 项页面 × 2 视口实测无内容被遮，两页聊天布局贴底且内部滚动。详见第 4 节之 20)
  与第 12 节教训 17、18。

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

### 20) 布局链：内容页 vs 聊天页（v4.3.2，**改这两行前务必读完**）
```
.app-shell（100vh + 100dvh 双写，globals.css）
└─ main           flex-1 min-h-0 flex flex-col pt-[56px+safe-top]      ← 只给固定 TopBar 让位
   └─ 内层 div     flex-1 min-h-0 flex flex-col overflow-y-auto pb-[80px+safe-bottom]
      └─ 页面根    内容页＝普通块；碎片/Agent＝flex-1 min-h-0 flex flex-col
```
内层 div 必须**同时**满足两件事，缺一件就有一类页面坏掉（都有实测数据）：

| 内层 div 写法 | 内容页（主页/数据/设置…） | 聊天页（碎片/Agent） |
|---|---|---|
| `flex flex-col`（高度由内容决定，v4.3.1 提交态） | ✅ 无遮挡 | ❌ 输入框浮到屏幕中间（底边 371 / 视口 900），消息流永不内部滚动 |
| `flex-1 min-h-0` + main 滚动（v4.3 那版） | ❌ 滚到底「清空所有数据」被底栏遮 12px；移动端「歌曲列表（0）」遮 6px | ✅ 输入框贴底 |
| **`flex-1 min-h-0` + 自己 `overflow-y-auto pb-[80px]`（当前）** | ✅ 无遮挡 | ✅ 输入框距底栏 42px，消息流内部可滚，新碎片完整可见 |

- **为什么滚动不能留在 main**：内层有确定高度时，子元素溢出的内容**不会**让 main 的
  `padding-bottom` 计入滚动范围（实测 mainSH 1863 → 1783，正好少那 80px），滚到底时最后
  一个元素压在固定定位的 `BottomTabBar`（56px）下面。
- **为什么内层不能是 auto 高度**：`flex-1` 在 auto 高度容器里分不到剩余空间，碎片/Agent 的
  消息流高度＝内容高度、永远不成滚动容器（`scrollTop = scrollHeight` 变空操作），
  且新发的碎片会被底栏切掉 40px（实测末条底 827 > 底栏顶 787）。
- **`h-[100dvh]` 必须带 `100vh` 回退**（`.app-shell`）：旧内核（iOS <15.4 / 夸克）丢弃 dvh
  会让根容器高度变 auto，上面整条链一起退化。
- 验证口径见第 12 节教训 17、18；`BottomTabBar` 保持 `fixed`（不要改成流内）。

### 21) 馆藏（v4.4，`lib/library.ts` + `pages/LibraryPage` + `pages/ReaderPage`）
- **数据模型**：`LibraryBook { id, title, format:'txt'|'md', content, charCount, lastBlockIndex?, marks[] }`，
  `BookMark { id, kind:'underline'|'highlight', text, blockIndex, start, end, createdAt }`；
  正文**直接存主数据**（`state.books`）。单本建议 ≤1 万字（硬上限 20 万字，导入时两级提示）。
- **正文切块 `parseBook(content, format)`**：txt 按空行切段（段内换行原样保留，靠 `white-space: pre-wrap`
  让 `textContent` 与原文一致）；md 用 `marked.lexer` 逐 token 渲染成块（**一个 token = 一块**），
  每块单独过 `sanitizeHtml`。**块顺序就是标注锚点的坐标系，所以 parseBook 必须是确定性的**。
- **标注锚点 = {块索引, 块内字符偏移}**（借鉴参考项目 IB 的批注做法，用 React 架构重写）：
  选区用 `Range` + `document.createTreeWalker` 算块内偏移（天然处理嵌套行内标签），
  **跨段选择自动拆成多条锚点**，各锚各段。**不往正文 HTML 里插标记**：渲染完成后再把 `<mark>` 包回去
  （**从后往前包**——包裹只拆 Text 节点、不改 `textContent` 长度，先包的不会污染后包的偏移）；
  重新套标注前必须先 `resetBlockDom` 还原原始 HTML（React 不会重写 `dangerouslySetInnerHTML`，
  不还原就会越包越多）。
- **包裹方式：按文本节点逐段包，别用 `range.surroundContents`**（v4.4.1 修，见第 12 节教训 22）：
  md 书配了 `breaks: true`，软换行渲染成 `<br>`，列表块还有 `<li>`；选区跨过这类元素时
  `surroundContents` 会抛异常，兜底的 `extractContents` 会把**块级结构整段克隆** →
  电脑端「高亮后下一行缩进」。现在 `wrapRange` 只做 `splitText` + 换父节点，
  一条标注因此可能对应**多个** `<mark>`（同一个 `data-mark-id`，查询要 findAll）。
- **浮动工具条**：监听 `selectionchange` → `anchorsFromSelection` 拿到锚点 → 现场量位置。
  两个必须记住的点：① 位置判断要用**现场量的顶栏底边 + 实测的工具条高度（63px）**，拍 44px 会让它
  压住固定顶栏（实测踩到过）；② 按钮要 `onMouseDown={e => e.preventDefault()}`，否则点按钮时选区先被清掉。
- **书签面板**：`sortMarks` 按正文顺序排；点一条 `scrollIntoView`（CSS 给 `[data-block-idx]` 留了
  `scroll-margin-top` 避开顶栏与 sticky 工具行）+ `vd-mk-flash` 闪烁；可逐条删除。
- **工具条位置**：触屏设备（`navigator.maxTouchPoints > 0` 或 `pointer: coarse`）**一律放在选区下方** ——
  安卓长按会弹原生选择浮层，它长在选区上方，放上面会被挡（用户实测）。桌面端只在「上方放不下」时才翻到
  下方（阈值 = 现场量的顶栏底边 + 实测工具条高度 63px）。
- **不弹原生菜单**：`.vd-book` 上 `-webkit-touch-callout: none` + 容器 `onContextMenu` preventDefault，
  **文本选择保留**（划线要靠它）；取舍：阅读器内的链接失去长按预览。
- **AI 入口**：v4.4 做过「选中 → 问 AI → 共读抽屉」（复用 `lib/agentTurn.ts`），
  **v4.4.1 按用户要求整体移除**（体感不佳）。`agentTurn.ts` 保留，现在只有 Agent 会话页一个调用方。
- **阅读位置**：`IntersectionObserver` 取「当前可见块里最小的索引」，debounce 500ms 写 store；
  `setBookProgress` **故意不动 `updatedAt`**（否则翻两页就把书架排序刷成最新）；
  进页面时 `scrollIntoView` 回到上次那块。

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
│   │   ├── agentTurn.ts         # ★ 一轮 Agent 回复（Agent 会话页与馆藏共读抽屉共用）
│   │   ├── library.ts           # ★ 馆藏：正文切块 + 划线/高亮锚点数学 + 阅读进度
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
│   └── pages/                   # 12 个路由页面
│       DeskPage / NotesPage / LibraryPage(书架) / ReaderPage(阅读器·划线·书签·共读) /
│       AgentPage(会话列表+聊天) / DataPage / SettingsPage / SpacePage / CollectionPage /
│       ArticleReaderPage / MomentsPage / FavoritesPage
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
`/space/collection/:id`、`/space/article/:id`、`/moments`、`/library`、`/library/book/:id`、
`/agent`、`/favorites`。（v4.4 删掉 `/diary`。）

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

## 7. 已实现功能清单（当前，v4.4.1）

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
- **馆藏**（v4.4）：**书架**（导入本地 txt / md、卡片显示字数/标注数/进度、重命名、移出书架）+
  **阅读器**（连续滚动、记住读到哪、md 按 Markdown 渲染）；选中一段 → **划线 / 高亮 / 复制**，
  划线高亮收进**右上角书签**（按序排列、点击定位闪烁、可删）；滑到底部进度即 100%
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

## 8. 已知问题与待处理（真实未修项，截至 2026-09-29 / v4.4.1）

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
- **`scripts/make-icons.mjs` 依赖 `sharp` 但未在 package.json 声明**（当前跑不了）；
  `date-fns` 装着但没人用。
- **`theme.ts:12` `META_THEME_COLOR.day` 仍是旧米色 `#DDD3C9`**（未跟随 v4.2.1 的新
  日间 `--bg-base #fdf2e1`）→ 只影响手机浏览器地址栏色块，遗留项、非本轮引入。
- **Agent SSE 请求无超时**：`streamChatCompletion` 只支持用户手动「停止」（AbortController），
  网络挂起时没有自动超时上限（低优，可加 AbortSignal.timeout）。
- **Agent 演示模式是本地模板回复**：未配置 API 时 `demoReply` 只能按关键词给固定话术，
  不读真实资料库内容（已如实告知用户，演示 ≠ 真实对话）。
- **馆藏 · 跨段选择会拆成多条标注**：一次跨 3 段的选择会生成 3 条 `BookMark`，书签面板里是 3 行
  （各自「第 N 段 + 预览」）。数据模型没有 groupId，改起来要动 `BookMark` 结构与面板分组。
- **馆藏 · 长文会卡**：单本硬上限 20 万字，但**建议 ≤1 万字**。超过之后 `applyMarksToDom` 每次
  标注变化都要重扫所有块、IntersectionObserver 也要 observe 上千个块；真正的解法是虚拟滚动 + 分页。
- **馆藏 · 碎片遗留图片没有回收**：碎片功能删掉后，它引用过的图片 blob 仍留在 `files` 表里
  无人引用（**没自动删，怕误删**）。要清需要一次「孤儿文件回收」（用 `collectFileIds` 的反集）。
- **馆藏 · 阅读器内已屏蔽原生菜单，但真机未复测**：Chromium 里实测 `contextmenu` 已取消默认行为，
  触摸端工具条也改到了选区下方（避开安卓原生浮层）；但 **iOS / 安卓真机的长按选择行为没有实测过**，
  系统自带的「拷贝 / 查询」浮层仍可能与我们的工具条同时出现。
- **Agent 接口兼容性**：v4.4.1 起能识别 OpenAI SSE、非流式 JSON、Ollama 形状，并在空返回时给出原因；
  但**只支持 OpenAI 兼容协议**，其它协议（Anthropic / Gemini 原生）仍会报错。
- 低优先级设想：文章加密、静态站点导出、自定义主题色、馆藏目录（章节目录跳转）。

### 8.2 平台 / 外部限制（如实告知用户）
- **WebDAV 纯浏览器直连坚果云被 CORS 拦截**（坚果云未开放跨域头）；代码就绪，
  **Tauri 桌面壳落地后自动解除**。当前可用备选：支持 CORS 的 WebDAV 服务。
- **iOS 真机复测待确认**：v3.10 移动输入修复（重命名 Modal / 灰遮罩 / 输入框）在桌面与
  模拟器验证通过，**真机未复测**；碎片页/Agent 页移动端布局同样未真机复测。
- **Agent 依赖外部对话 API**：需用户自填 Base URL / API Key / 模型（Key 只存本机）；
  未配置自动演示模式。部分 OpenAI 兼容服务可能要求额外 header 或不同端点规范，自检按钮
  可先验证连通性。
- **多设备同时编辑同一 WebDAV 备份会互相覆盖**，说明书弹窗已提醒单设备编辑。

### 8.3 已修复
- **版本号不一致**（v4.2 → v4.3.2）：package.json / 设置页 / README badge / 本文档已同步。
- **布局链两难**（v4.3.2）：内容页被底栏遮挡 ↔ 碎片/Agent 输入框不贴底，两个方向的
  修法互相冲突（v4.3 与 v4.3.1 各修坏一个）。已按第 4 节之 20) 的结构统一：滚动与
  80px 避让一起下沉到内层 div，`.app-shell` 补 `100vh` 回退。13 项页面 × 2 视口实测
  无内容被遮，两页聊天布局贴底且消息流内部滚动。
- **灵感/碎片图片不进备份**（v4.3.2）：`collectFileIds` 只收 articles/moments/profile，
  三条备份路径（导出 JSON / WebDAV / 快照）共用它 → 备份里只有条目没有图。已补
  `fragments[].imageIds` 与 `notes.inspiration[].imageIds`（含 `fileRef:` 扫描）；
  实测：带图灵感 + 带图碎片导出 → 清空 IndexedDB → 导入还原 → 图片以 blob 正常显示、
  无占位灰块。**修前实测备份里 0 张图、缺 2 个 id，修后 2 张齐全**。
- **导入/取回绕过迁移兜底 → 打开便签页崩溃**（v4.3.2）：`starred`/`imageIds` 的兜底只在
  `loadState` 里，而导入 JSON（合并/覆盖）、WebDAV 取回、快照恢复都原样灌 store。
  已抽出 `normalizeState()`（`lib/db.ts`）并在 `importState` 两条分支统一调用。
  **修前实测**：导入 v4.1 备份 → 进便签 → `TypeError: Cannot read properties of undefined
  (reading 'length')`（错误边界接管、重试无效）；**修后**：合并 / 覆盖两条路径均正常渲染。
- **灵感编辑草稿取消后不复位**（v4.3.2）：`InspirationView` 的 `draft`/`draftImages`
  只在挂载时初始化 → 取消后再进编辑、保存会把被取消的改动写回。已在「进入编辑态」时
  重新同步一次，并在取消时删掉本次新加、未保存的图片（孤儿 blob）。实测：取消后再进
  编辑看到原文；保存后再进编辑看到新值（灵敏度对照）；编辑态加图 → 取消 → 库里文件数
  回到加图前。
- **「转文章」无重复保护**（v4.3.2）：新增 `InspirationNote.convertedArticleId`，
  已转过且文章还在时复用（不新建），正文被改动后自动解除标记允许重转；按钮
  `aria-label`/`title` 与提示文案区分两种状态。实测：同一按钮连点三次只生成 1 篇、
  第二次起提示「已经转成过文章了」；改正文再转 → 正常新增第 2 篇。
- **启动脚本端口判定会打开别人的页面**（v4.3.2）：`curl` 不带 `-f`（4xx/5xx 也返回 0）
  + `vite.config.ts` 无 `strictPort`（静默换 5174）+ 只轮询 5173。已加
  `strictPort: true`，探测改为问 vite dev 专属端点 `/@vite/client`（并匹配
  `createHotContext`），端口被别人占用时直接给出明确提示并退出。实测三场景：
  ① 静态服务器占 5173 → 明确报「已被其它程序占用」退出 1（**注意：只匹配 index.html
  内容会被 `python -m http.server` 骗过，已踩过**）；② 端口空闲 → 正常起服务并打印
  局域网地址；③ 自己的 dev server 在跑 → 走「服务已在运行」分支。另实测 5173 被占时
  `npm run dev` 会以 `Port 5173 is already in use` 直接失败，不再静默换端口。

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

### 接手第一小时（照着做，别跳）
1. 读第 0 节（一页速览）、第 3 节（设计语言与色板，**不要擅自改色**）、第 4 节（关键设计决策）。
2. `git log --oneline -10` 看最近做了什么；`git status` 确认工作区干净（**别 `git add -A`**）。
3. 起服务：双击 `打开VidaOS.command`，或 `npm run dev` → http://localhost:5173。
   起不来先看端口：脚本现在会明确提示「端口被占用」（`vite.config.ts` 已开 `strictPort`）。
4. `npm run typecheck` 过一遍；然后**按第 11 节「怎么验证」跑一次无头 Chrome**，
   确认你能真的驱动到这个应用（这一步过不去，后面所有结论都不可信）。
5. 交付前提醒用户 **`Cmd+Shift+R` 强刷**（dev server 重启会断 HMR，旧标签页不会自己刷新）。
6. 用户报「改了没用」→ 先怀疑他看的是旧页面，再怀疑缓存/Service Worker。

### 常用命令
```bash
cd "/Users/amarisgo/Documents/DeepSeek Harness/VidaOS"
npm install          # 首次
npm run dev          # → http://localhost:5173（或双击 打开VidaOS.command）
npm run typecheck    # 改了代码先跑这个（strict + noUnusedLocals，编译即闸门）
npm run build        # 出 dist/（gitignore，按惯例验完可删）
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
| 改馆藏 | `pages/LibraryPage.tsx`（书架/导入）+ `pages/ReaderPage.tsx`（阅读器/工具条/书签）+ `lib/library.ts`（切块与锚点数学）+ store 的 book actions |
| 改 Agent 对话 | `lib/agentEngine.ts`（纯函数：端点/消息/索引/截取/标记/演示模式）+ `lib/agentTurn.ts`（一轮回复，**改这里两处同时生效**）+ `components/agent/AgentChatView.tsx`（会话页 UI）+ `components/library/CoreadDrawer.tsx`（共读 UI）+ `pages/AgentPage.tsx`（会话列表）——**逻辑改完跑引擎单测** |

### 怎么验证（本项目标准做法，v4.4.1 重写）
> 这一节是**唯一被反复踩坑的环节**，请照着做，别只看构建通过就宣布修好。

1. **最低门槛**：`npm run typecheck` + `npm run build`（只证明能编译打包，**不等于功能对**）。
2. **无头 Chrome 走真实 UI**（真正算数的验证）。本机可用的一套写法：
   ```bash
   CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
   UDD=$(mktemp -d); PORT=$((9400 + RANDOM % 400))
   "$CHROME" --headless=new --remote-debugging-port=$PORT --user-data-dir="$UDD" \
     --no-first-run --no-default-browser-check --no-sandbox --disable-setuid-sandbox \
     --disable-dev-shm-usage --disable-crash-reporter --disable-breakpad \
     --disable-gpu --disable-software-rasterizer --window-size=1280,900 --hide-scrollbars about:blank &
   curl -s http://127.0.0.1:$PORT/json/version   # 拿到 webSocketDebuggerUrl
   # 然后自己写个 50 行的 CDP 客户端（Node 全局 WebSocket 即可，不需要 playwright）
   ```
   驱动要点（都实测过）：
   - `Runtime.evaluate` 里**不能有顶层 `await`** —— 要包 `(async()=>{…})()`，否则报
     `SyntaxError: Unexpected token 'import'`；`returnByValue` 遇到 Promise 会得到 `{}`。
   - 真实交互：`Input.insertText` 打字、`Input.dispatchKeyEvent` 回车、
     `DOM.setFileInputFiles` 选本地文件（导入书籍/备份都靠它）、
     `Browser.setDownloadBehavior` 收下载（导出 JSON 靠它）。
   - 站点上的原生 `confirm()` 会**阻塞渲染进程**让后续 evaluate 全部超时 →
     必须先监听 `Page.javascriptDialogOpening` 并 `Page.handleJavaScriptDialog`。
   - 触摸/移动端：`Emulation.setDeviceMetricsOverride(390,844,3,mobile:true)` +
     `Emulation.setTouchEmulationEnabled`（后者才让 `pointer: coarse` 为真）。
   - 模拟选区：`document.createRange()` + `getSelection().addRange()`（真机长按的等价物）。
   - 读完 DOM 结论**必须 POST/回传出来**（或像本会话一样直接在 Node 侧接收 evaluate 结果）。
3. **要验证「AI 接口」相关逻辑时，不要依赖用户真 Key**：起一个本地假的 OpenAI 兼容接口
   （SSE 流式 / 非流式多行 JSON / 只有 `reasoning_content` / 空内容 / Ollama 形状各一条路由，
   记得 `Access-Control-Allow-Origin: *` 且只 `writeHead` 一次），
   页面里 `await import('/src/lib/agentEngine.ts')` 直接调 `streamChatCompletion` 做契约测试。
   v4.4.1 就是这么定位并验证「（无内容）」的。
4. **纯逻辑层单测**（不依赖浏览器，改 `agentEngine` / `library` 这类纯函数时用）：
   ```bash
   npx esbuild src/lib/agentEngine.ts --bundle --format=esm \
     --outfile=/tmp/vidaos-agent-engine.mjs --alias:@=./src
   node -e "import('/tmp/vidaos-agent-engine.mjs').then(m=>{ /* 断言 */ })"
   ```
5. **写指标时给「已知好」和「已知坏」各跑一次**（第 12 节教训 2/9/18），
   并优先用**可量化的口径**（坐标、`scrollHeight`、元素数量、行左边界），不要用「看着对」。
6. 探针脚本放 `/tmp`，**用完删掉、不要提交**；不要 `git add -A`（第 12 节教训 11）。

⚠️ **三个必须记住的环境坑**：
- **固定调试端口 + 探针中途抛错 = 后面的结论全被污染**：上一次的 Chrome 没被收掉会一直占着
  调试端口，新的 `launchChrome` 会**连到那个旧实例**（旧 profile、旧的 IndexedDB 数据）。
  所以：**端口随机 + 起之前先探测端口是否被占（占了就报错退出）+ 给进程挂 `exit` 钩子兜底杀 Chrome**
  （第 12 节教训 19）。
- **`--virtual-time-budget` 会让 IndexedDB 回调永不完成**，凡是依赖 IndexedDB 的探针都会卡死，别加。
- **选择器会漂**：按钮文案一变（`转为文章` → `已转为文章`），`querySelector` 就点到下一条数据上，
  看起来像「功能没生效」。定位一律**锚定到具体条目**（`:first-child`）并优先用 `aria-label` / `data-*`
  （第 12 节教训 19/21）。

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
17. **滚动容器的 `padding-bottom` 不是永远算进滚动范围（v4.3.2 实测）**：同一条
    `pb-[calc(80px+…)]` 写在 `main` 上时，
    - 子元素高度由内容决定（v4.3.1 提交态）→ `scrollHeight` = 内容高 + 80（1863），滚到底安全；
    - 子元素有确定高度、内容从它内部溢出（v4.3 那版）→ 溢出内容撑开滚动范围，但**那 80px
      没被算进去**（1783 = 56 + 内容高 1727），滚到底时最后一屏内容落在 `BottomTabBar`
      下面。
    所以「避让固定底栏」这件事不能只靠给祖先加 padding，必须让**滚动容器自己的** padding
    生效（把滚动下沉到真正有 padding 的那一层）。判断依据要用「滚到底后有没有内容元素
    （或文字叶子）的底边超过底栏顶边」，不能只看 `scrollHeight` 的数字大小。
18. **探针指标第三次说谎：把「滚动容器自己的盒子」当成被遮内容（v4.3.2）**：
    「滚到底后扫描所有 bottom > 底栏顶的元素」这条规则，在滚动容器正好铺满视口时会把
    **滚动容器自身**报成被遮（它的盒子当然到 y=900），于是把「其实没问题」的结构判成坏。
    修正：扫描时排除 `overflow-y: auto/scroll` 的盒子（它们只是布局骨架，不是内容），
    并区分「容器被遮」（布局骨架）与「文字叶子被遮」（真正的展示不全）两个口径。
    **自检指标写完要拿一个已知好 + 一个已知坏的结构各跑一次**，两边都能区分才算可用
    （呼应第 2、9 条）。
19. **无头 Chrome 探针环境本身会污染结论（v4.3.3 连踩两个）**：
    1) **固定调试端口 + 探针中途抛错没走到收尾** → 上一次的 Chrome 一直活着占着 9333，
       后续每次 `launchChrome` 都**连到了那个旧实例**（旧 profile，数据在同一个 IndexedDB
       里累加），表现为「我明明只建了 1 条灵感，怎么数出 5 条」。
       修法：调试端口改**随机端口** + 起 Chrome 前先探测该端口是否已被占用（占用就报错
       退出，绝不连到别人的 Chrome）+ 给进程挂 `exit` 钩子兜底杀 Chrome。
    2) **选择器会悄悄漂到别的元素上**：用
       `document.querySelector('main ul li button[aria-label="转为文章"]')` 连点三次，
       第一次点完按钮的 `aria-label` 变成「已转为文章」→ 第二次选择器匹配到的是**下一条
       灵感**，三次点出 3 篇文章，看起来完全像「去重没生效」。修法：把被测对象**锚定到
       具体条目**（`main ul li:first-child`），按钮文案会变时用「容器 + 属性正则」定位。
    **教训：「功能没生效」先怀疑探针，再怀疑代码；每个断言都要能说清它点的是哪个元素。**
20. **「拍脑袋的常量」要用实测值替换（v4.4）**：阅读器的浮动工具条要判断「选区上方够不够放」，
    我先按工具栏 ≈44px 估了个阈值 —— 实测工具条高 **63px**，于是移动端贴顶选中时工具条压住固定顶栏 8px。
    改成**现场量顶栏底边（`header.getBoundingClientRect().bottom`）+ 用实测高度**，并把「上方放不下」
    改成翻转到底部（`translate-y` 方向跟着变）。**凡是「留多少间距」的判断，要么量，要么翻转到另一侧。**
21. **无头探针点不到「只有图标」的按钮（v4.4）**：`clickText('发送')` 找不到发送键 ——
    它是纯图标按钮（`aria-label="发送"`、无文字），`textContent` 是空的。
    同理，`innerText` 找按钮还会踩 Tailwind `uppercase` 的坑（第 9 条）。
    **探针定位一律优先 `aria-label` / `data-*` 这类为测试存在的属性**，其次才用文案。
22. **`range.surroundContents` / `extractContents` 会悄悄克隆块级结构（v4.4.1 实测）**：
    阅读器的划线原本用「整段 Range 包一个 `<mark>`」。md 书开了 `breaks: true`，
    软换行渲染成 `<br>`；列表块里还有 `<li>` —— 选区跨过这类元素时 `surroundContents` **抛异常**，
    我写的兜底 `extractContents()` 会把被选中的**元素结构整段复制**出来再塞进 mark，
    于是出现「高亮/划线之后下一行文本缩进」（列表还会多套一层）。
    移动端没暴露只是因为长按往往只选到一行内。
    正确做法：**按文本节点逐段包裹**（`splitText` + 换父节点），只碰 Text 节点、永不改元素结构；
    代价是一条标注会对应多个 `<mark>`，查询要 findAll。
    自查指标：标注前后**比对块高与每一行的左边界**（我做的是逐行 `Range.getBoundingClientRect()`）
    + 比对子元素标签序列，三者不变才算没破坏版式。
23. **「（无内容）」这种静默兜底会把真实故障藏起来（v4.4.1）**：用户配好 API 后每轮都收到
    「（无内容）」，而真因是接口回了 HTTP 200 但正文为空（推理型模型的正文落在 `reasoning_content`、
    或服务不支持流式、或字段形状不同）。旧实现把空结果直接写成一句无信息量的占位文案，
    用户完全无从下手。**凡是「兜底显示成某种空值」，都要同时说明原因与下一步怎么办**；
    修法是：多认几种响应形状 + 空返回就抛出可操作的原因 + 把 `max_tokens` 从 500 提到 2048
    （推理型模型可能把额度全花在推理上）。另外：`max_tokens` 之外的请求参数（如 `presence_penalty`）
    在部分服务上会直接 400，错误信息要原样透出给用户。

---

## 13. 变更日志

### [v4.4.1] - 2026-09-29 —— 馆藏阅读器 6 项实测缺陷修复（含移除阅读器内 AI 入口）
- **高亮在浅色主题下不可见**：`.vd-mk-highlight` 原来写死 `rgba(201,160,99,.26)`，日间主题上几乎看不出；
  改用项目既有的主题 token `--mark-bg` / `--mark-fg`（三套主题都调过，浅色主题连文字颜色一起变）。
  实测：计算样式 `background: rgb(102 98 38 / 0.3)` + `color: rgb(87,85,39)`，元素 157×22。
- **划线/高亮后下一行缩进**：根因见第 12 节教训 22 → 改成按文本节点逐段包裹。
  实测：跨 `<strong>` + `<br>` 的选区（4 个 `<mark>`）与跨 `<li>` 的选区，标注前后
  **块高不变（101px / 72px）、每一行左边界不变（256px）、子元素结构无克隆**。
- **滑到底部进度 93%**：到最后一块时「最靠上的可见块」不是最后一块；改为**滚动到底即记最后一块**。
  实测：60 段的书初始 0% → 滑到底 100%（lastBlockIndex 59）→ 回滚到中间 51%。
- **移除阅读器内的「问 AI / 共读」**（用户反馈体感差）：工具条只剩 划线 / 高亮 / 复制，
  同时删掉头部共读入口、`CoreadDrawer`、`quote` 状态、`LibraryBook.coreadSessionId` 字段。
  实测：工具条按钮 = [划线, 高亮, 复制]，页面上无「问 AI」「共读」字样、无抽屉。
- **Agent 回复「（无内容）」**：`streamChatCompletion` 加固 —— `max_tokens` 500→2048；
  除 `delta.content` 外还识别 `message.content` / `text` / Ollama 形状；
  用 `raw` 累积原文兜底非流式响应；**空返回不再静默**，而是抛出可操作的原因。
  用本地假接口（SSE / 推理型 / 非流式多行 JSON / Ollama / 空）验证：解析层 5 种形态全部符合预期；
  端到端在 Agent 页真发消息：正常接口与非流式接口都拿到回复，推理型与空内容都得到明确提示，
  **「（无内容）」一次都没出现**。
- **手机端长按弹原生菜单挡住功能键**：`.vd-book` 加 `-webkit-touch-callout: none`、
  容器 `onContextMenu` preventDefault（Chromium 实测事件已被取消默认行为），
  并且**触摸端工具条一律放到选区下方**（安卓原生浮层在选区上方）。
  实测：触摸仿真下工具条 3 个按钮、位于选区下方且在视口内，划线正常落库。**真机未复测。**

### [v4.4.0] - 2026-09-29 —— 馆藏上线（书架 + 阅读器 + 共读），碎片整体下线
- **碎片整体删除**（`pages/DiaryPage.tsx` 删除 + 7 个文件清扫）：`FragmentEntry` 类型、
  `AppState.fragments`、store 的 4 个 fragment action、全局查找的「碎片」范围（`ScopeKey`/`HitKind`/
  命中跳转与替换分支/标签与 placeholder）、Agent 引擎的内置「碎片」虚拟文档与演示话术、
  `.frag-bubble` 整段样式。旧 `fragments` 字段在 `normalizeState` 里**不迁移、直接丢弃**。
- **底栏**：`TAB_KEYS` 去掉 `diary` 换成 `notes`；`BottomTabBar` 的「碎片」→「便签」
  （图标 `StickyNote`）；顺手修掉「主页 tab 在 /notes 也高亮」的旧 hack。
- **主页宫格**：`FeatureKey` 的 `'notes'` 换成 `'library'`，卡片「便签」→「馆藏」（`LibraryBig`）。
- **馆藏**（新功能，见第 4 节之 21)）：`lib/library.ts`（切块 + 锚点数学 + 进度）、
  `pages/LibraryPage.tsx`（书架 / 导入 / 重命名 / 移出）、`pages/ReaderPage.tsx`
  （阅读器 / 浮动工具条 / 书签面板 / 共读入口）、`components/library/CoreadDrawer.tsx`（共读抽屉）、
  store 新增 6 个 book action、`types` 新增 `LibraryBook` / `BookMark`、路由 `/library` 与 `/library/book/:id`、
  `globals.css` 新增 `.vd-book` / `.vd-mk-*` 系列。
- **Agent 侧改名**：引擎上下文 `fragments` → `books`（`booksIndexText` 列书名/字数/标注数，
  `[[读:书名]]` 直接读某本书正文，`[[读:馆藏]]` 读书架索引）；默认人格、开场白、演示话术同步改写。
- **抽出 `lib/agentTurn.ts`**：把 AgentChatView 里的「一轮回复」原样抽出来（流式 + 记忆写入 +
  工具标记循环 + 错误兜底），**Agent 会话页与共读抽屉共用同一份**，避免两处实现走样。
- **实测**（无头 Chrome 走真实 UI，1280×900 与 390×844×3，全部有真实文件输入框 / 真实下载 /
  真实选区）：
  - 底栏 = 主页/便签/Agent/数据/设置；宫格 = 空间/动态/馆藏/收藏夹；便签 tab 正常（`#/notes`）；
  - 导入 txt + md 两本 → 书架 2 本、格式与字数正确（96 / 106）；空书架有引导；
  - 阅读器：txt 41 段 / md 6 块，md 的 h1 / ul / blockquote / strong 都正确渲染；
  - 划线：真实选区（第 1 段第 0–6 字）→ 工具条出现 → 划线 → DOM `1` 处且 store 落库
    `{kind:'underline', text:'乡愁是一枚小', block:0, start:0, end:6}`（锚点精确）；
  - 高亮：另一段同样通过；两种标注并存（各 1 处）；
  - 书签面板：2 条、按序带「第 N 段 + 预览」；点击跳回正文并闪烁；删除后 DOM 与 store 同步变 1；
  - 共读（**该入口已在 v4.4.1 移除**，此处是 v4.4.0 当时的实测记录）：选中 →「问 AI」→ 抽屉带引用打开 → 新建「共读 · 书名」→ 发送 → 会话里
    `[greet, user, assistant]` 三条，用户消息里带着引用原文，AI 有回复（演示模式），全程零报错；
  - 移动端：工具条 4 键在视口内、不压顶栏（贴顶时自动翻到选区下方）、无横向溢出（正文宽 358/390）、
    划线成功落库；
  - 阅读位置：滚到底记录 idx=31，真重载后恢复到 74%（idx=29），标签从 0% 起算（不是 25%）；
  - 重命名 / 移出书架通过；真重载后书与标注都还在、无错误边界；`fragments` 字段已从 store 消失。

### [v4.3.3] - 2026-09-29 —— 备份与恢复的数据安全修复（两项 P1）+ 灵感体验修复
- **灵感/碎片图片不进备份**（P1 · 数据不可恢复）：`collectFileIds` 只收集
  articles/moments/profile 引用的文件，而导出 JSON、WebDAV、本地快照三条路共用它。
  v4.3 新加的灵感图片（`notes.inspiration[].imageIds`）与碎片图片（`fragments[].imageIds`）
  于是只备份了条目、没备份图。**修前实测**：一条带图灵感 + 一条带图碎片 → 导出 JSON
  只有 2KB、`bundle.files` 为 0、两个 fileId 都缺；**修后**：20KB / 2 张图齐全，清空
  IndexedDB 再导入，图片以 blob 正常显示、无占位灰块。
- **导入/取回绕过迁移兜底 → 打开便签页崩溃**（P1）：`starred`/`imageIds` 的兜底只写在
  `loadState`，而 `parseJSONImport`、WebDAV 取回（`webdav.ts`）、快照恢复（`snapshot.ts`）
  都原样把 state 灌进 store。**修前实测**：导入一份 v4.1 备份（灵感无这两个字段）→
  应用内导航进便签 → `TypeError: Cannot read properties of undefined (reading 'length')`
  （错误边界接管，「重试」无效）；**修后**：合并 / 覆盖两条路径均正常。
  做法：抽出 `normalizeState()`（`lib/db.ts`，含 tracks/favorites/notes/fragments/agent
  各段迁移），`loadState` 与 `importState` 两条分支统一走它。
- **灵感编辑草稿取消后不复位**：`draft`/`draftImages` 只在挂载时初始化 → 取消后再进编辑、
  保存会把被取消的改动写回（图片还能把取消掉的图写回 `imageIds`）。改为「进入编辑态时
  同步一次」，并在取消时删掉本次新加未保存的图片（孤儿 blob）。
- **「转文章」无重复保护**：新增 `InspirationNote.convertedArticleId`，已转过且文章仍在
  时复用不新建；正文改动后自动解除标记允许重转；按钮文案与提示区分两种状态。
- **启动脚本端口判定会打开别人的页面**：`curl` 不带 `-f` + `vite.config.ts` 无
  `strictPort`（静默换 5174）+ 只轮询 5173 三件事叠加。已加 `strictPort: true`，
  探测改为问 vite dev 专属端点 `/@vite/client`（匹配 `createHotContext`），
  端口被占时明确提示并退出；三个场景（被静态服务器占用 / 空闲冷启动 / 自己已在跑）
  均实测过。
- 验证方式：无头 Chrome 走真实 UI（真实文件输入框选图、真实导入按钮、真实下载），
  全部结论都有修前 / 修后两组成对数据；另加 `collectFileIds` / `normalizeState`
  两个纯函数的契约测试（含旧数据不抛错、不覆盖有值字段）。

### [v4.3.2] - 2026-09-29 —— 布局链统一（内容页不遮挡 + 聊天页贴底）
- **背景**：v4.3 把碎片页/Agent 页从 `fixed` 改成 flex 流内布局，依赖祖先是「确定高度」；
  v4.3.1 为修内容页被底栏遮挡把内层 div 的 `flex-1 min-h-0` 去掉，于是那两页的
  `flex-1` 分不到剩余空间 → 消息流不再是滚动容器、输入框浮到屏幕中间、新发的碎片被
  底栏切掉 40px。两个方向互相冲突，本轮用同一次实测把两者一起解决。
- **根因（实测）**：内层 div 有确定高度时，其子元素溢出的内容**不会**把 `main` 的
  `padding-bottom` 算进滚动范围 —— `main.scrollHeight` 1863 → 1783，正好少 80px，
  滚到底时最后一个元素压在固定底栏下（实测「清空所有数据」按钮被遮 12px）。
- **修法**：`App.tsx` 把 `overflow-y-auto` 与 `pb-[calc(80px+env(safe-area-inset-bottom))]`
  一起从 `main` 下沉到内层 div，内层保留 `flex-1 min-h-0`；`main` 只留
  `pt-[calc(56px+env(safe-area-inset-top))]` 给固定顶栏让位。新增 `.app-shell`
  （`globals.css`：`height:100vh; height:100dvh`）兜住旧内核丢弃 `dvh` 的情况。
- **实测口径**（无头 Chrome，1280×900 与 390×844×3）：
  - 13 项页面 × 2 视口：滚到底「文字被遮 / 容器被遮」全为无（此前 v4.3 那版在
    `/data` 桌面遮 12px、`/desk` 移动遮 6px）；
  - 碎片页（25 条数据）输入框底边 801 / 底栏顶 843（移动 745 / 787），消息流
    `clientHeight 655 ↔ scrollHeight 2048` 内部可滚，新碎片完整可见；
  - Agent 会话页同口径通过；真重载后数据仍在；无 console / page 错误。
- **同时排查但未修**（已记入第 8.1 节）：备份漏收灵感/碎片图片、导入绕过迁移兜底、
  灵感草稿不复位、转文章无去重、启动脚本端口判定 —— 均已给出文件:行号与失败场景。

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

### [v4.3.1] - 2026-09-29 —— 桌面端三页底部遮挡修复
- **根因**：`<main>` 内部包裹 div 使用 `flex-1 min-h-0 flex flex-col`，在桌面端 WebKit flex
  计算下内容被压缩；且 padding-bottom 不足以避让固定定位的 56px BottomTabBar，
  导致主页/数据/设置页滚动到底后内容仍被遮挡。
- **修复**（`7cbdbc0`）：
  - `App.tsx` `<main>` 内部包裹 div 改为 `flex flex-col`（移除 `flex-1 min-h-0`），
    解除内容高度压缩；
  - `<main>` 底部内边距调整为 `pb-[calc(80px+env(safe-area-inset-bottom))]`，
    确保最后内容完整露出在底栏上方；
  - `BottomTabBar` 保持 `fixed bottom-0`（未改流内，避免破坏 Agent/碎片页已有 flex 布局）。
- **版本号**：v4.3.1（package.json / README badge / 设置页同步）。

### [v4.3] - 2026-09-29 —— 碎片/Agent 页布局卡顿修复 + 灵感功能补全
- **碎片/Agent 页进入卡顿修复**（`ba44312`，`037bc3b`）：
  - 根因：`position: fixed + env(safe-area-inset-*)` 在 WebKit 有双重布局计算延迟，
    导致进入页面时头部/底部输入框延迟贴位、跳动；view-enter 动画移除无效；
  - 改为 flex 流内布局：App.tsx 根容器 `h-[100dvh] overflow-hidden flex flex-col`，
    AgentChatView 头部/输入区、DiaryPage 工具行/输入区均从 fixed 改为 `flex-none` 流内定位，
    消息流/碎片流用 `flex-1 min-h-0 overflow-y-auto`；进入即到位，不再卡顿。
- **灵感功能补全**（`94f9acb`）：
  - 数据层：`InspirationNote` 新增 `starred: boolean`、`imageIds: string[]`；
    `db.ts loadState` 旧数据迁移兜底（补 `starred: false`、`imageIds: []`）；
  - store 新增 `toggleInspirationStar`、`convertInspirationToArticle`（首行生成标题、
    继承分类为标签、保留图片）；
  - UI：`InspirationView.tsx` 每条灵感带星标按钮（琥珀点亮）、悬停「转文章」按钮；
    撰写/编辑支持多图上传（compressImage + putFile + MediaImage，缩略预览+删除）。

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
- **v4.4 馆藏参考**：同上的 IB 项目「共读间 / 批注」交互（本地参考副本在
  `Chambre工作区/参考文件-IB机`）—— 本项目**只借鉴交互模型**（正文按块包裹做锚点、
  选中→浮动工具条→引用发问、一本书对应一个会话），代码是按本项目的 React 架构重写的，未复制实现
- **V3.x 设计哲学**：用户自定义「暗夜书房」色板与方向；三书房主题体系由用户推动
- **参与实现的 Agent**：Mavis（v3.0 重写）、多个会话（v3.1~v4.0 修复与功能）、
  另一位 agent（v3.6/v3.8 PDF 版式与缺陷修复）、v4.1/v4.2 会话（主页待办/双链/收藏夹改名/
  碎片页/Agent 多会话/全局查找扩展与接手文档校正）、v4.2.1 会话（日间背景 #fdf2e1 与
  卡片 #fce8dd 六版迭代定稿）、v4.3/v4.3.1 会话（碎片/Agent 布局卡顿 fixed→flex、
  灵感星标/转文章/多图上传、桌面端三页底部遮挡修复与文档更新）
- **v4.4 会话**（馆藏/碎片下线/底栏与宫格调整/agentTurn 抽取/共读抽屉与全部实测）
- **v4.4.1 会话**（馆藏阅读器 6 项实测缺陷修复：高亮主题化 / 逐文本节点包裹 / 底部进度 / 移除阅读器内 AI / 接口空返回诊断 / 原生菜单屏蔽；重写第 11 节验证方法、新增第 15 节外部 AI 接入规划）
- **最后更新日期**：2026-09-29

---

## 15. 规划：让**外部 AI** 读写 VidaOS 的内容（用户 2026-09-29 提的需求，**尚未实施**）

### 用户的原始诉求
「文本数据存在 VidaOS 里，然后 AI 从**外部**读取/访问我的内容并跟我聊天。
内置 Agent 不好用，所以希望从外部访问。能不能有个 API key 或者 MCP 连上 AI？」

### 必须先讲清的技术前提（决定了所有方案）
**浏览器里的 IndexedDB 是浏览器沙箱内的私有数据，外部程序（MCP server、脚本、别的 App）
拿不到它**—— 没有"连接串"、没有监听端口、没有文件路径可指。网页**也无法**自己开监听端口对外提供 API。
所以「外部 AI 直接连 VidaOS」这条路在技术上不存在；任何方案都必须是**在浏览器外面放一个"数据出口"**：

- 出口形态一：**文件/文件夹**（VidaOS 自己把数据写出去，外部程序读文件）
- 出口形态二：**本地小服务**（有进程常驻，外部程序连它；VidaOS 再与服务同步）
- 出口形态三：**复制一份到外部 AI 已经能读的地方**（例如某个工作区目录，零代码）

### 候选方案（按"从最省事到最彻底"排序）

| # | 方案 | 外部 AI 怎么读到 | 要写多少代码 | 实时性 | 风险 / 代价 |
|---|---|---|---|---|---|
| A | **内置 Agent 换成好用的模型/端点**（已支持） | 不用外部：应用内对话，数据不出本机 | 0 | 实时 | 只能在 VidaOS 自己的聊天窗里用；模型/UI 体感取决于配置 |
| B | **导出明文到固定文件夹**（用现成的 JSON/MD 导出 + 本地文件夹快照） | AI 直接读那些文件（DSH 这类有文件权限的 AI 今天就能读） | 0（手工）；1 天（自动写） | 手动/准实时 | 是**副本**：明文落盘，别把这个文件夹同步到云盘；写回要另做 |
| C | **VidaOS 侧加一个「数据出口」**：每次改动后把 `snapshot.json` 写到用户指定的文件夹（File System Access API，快照功能已有句柄持久化） | MCP server / 脚本读这个文件 | 1–2 天 | 准实时（改动后即可见） | 需要用户在 Chrome 里授权一次文件夹；Safari/Firefox 不支持该 API |
| D | **写一个 VidaOS MCP server**（只读先行：`list_articles` / `read_article` / `search` / `list_books` / `read_book` / `list_marks`），配到 DSH / Claude Desktop 等 MCP 客户端 | 标准 MCP 工具调用 | 2–4 天（骨架半天，工具设计是大头） | 取决于它读的是文件还是服务 | 数据源仍是 C/B 的文件；工具一旦给写权限，模型就能改用户数据，建议先只读 + 写操作走"待确认队列" |
| E | **本地小服务 + 待确认队列**（Node/Bun 常驻，管数据、提供 HTTP API 与 MCP，VidaOS 开应用时拉取/提交改动） | HTTP API 或 MCP | 1–2 周 | 准实时 | 多一个要常驻的进程；要定义冲突规则（建议 last-write-wins + 冲突留副本）；好处是顺手解决 WebDAV CORS、PDF、文件系统、将来 Tauri 壳 |
| F | 浏览器扩展 / 自动化读页面里的 IndexedDB | 扩展桥接 | 3–5 天 | 实时 | 平台绑定、极脆、上架麻烦，**不建议** |

### 建议的推进顺序
1. **今天就能用（零代码）**：数据页导出 JSON/Markdown 到一个 DSH 能读的目录 → 让外部 AI 直接读副本聊天。
   先用它验证「外部 AI 读我的东西」到底有没有用。
2. **值得做再上 C**：把「导出」自动化成"每次改动后写一份到指定文件夹"，这是所有后续方案的公共地基。
3. **要标准接口再上 D**：只读 MCP server 起步，接进 DSH/Claude Desktop；写权限后置。
4. **只有确实需要实时双向，才上 E**。不要为了 MCP 丢掉「无后端 / 数据只在本地」这个核心卖点。

### 实施时的注意点
- **隐私**：B/C/D 都会在磁盘上产生**明文副本**。要么把出口目录排除在云同步/备份之外，
  要么复用现成的端到端加密（WebDAV 那条链路已有 PBKDF2 + AES-256-GCM 的实现可参考）。
- **冲突**：外部写入与浏览器内写入必然冲突。v1 建议**外部只读**；要写就走
  `pending.json` 由用户在 VidaOS 里确认合并（复用 `importState(…, 'merge')` 的既有能力）。
- **不要动 IndexedDB 作为唯一真源**：外部程序无法直接读写它；所有方案都应理解为
  「把真源**投影**出去」或「让服务成为新的真源（= E 方案，代价最大）」。
- **API key 不解决这个问题**：API key 是 VidaOS 主动**往外调**用的（内置 Agent 已在用）；
  外部 AI 读进来需要的是**入口**，而浏览器的沙箱不允许网页提供入口。

---

