# VidaOS - 项目记忆与交接文档

> 本文档记录项目迭代历史、关键设计决策、架构与代码约定，便于后续 Agent 接力维护。

---

## 项目基本信息

| 字段 | 值 |
|------|-----|
| **项目名称** | VidaOS |
| **项目类型** | 纯前端单页应用（SPA）—— 个人博客 / 生活记录系统 |
| **当前版本** | v3.0 — 暗夜书房重构（2026-09-10） |
| **存放路径** | `/Users/amarisgo/Documents/VidaOS` |
| **Git 仓库** | 已初始化，`master` 分支 |
| **技术栈** | Vite 5 + React 18 + TypeScript + TailwindCSS 3 + Zustand + Dexie 4 + vite-plugin-pwa |
| **设计语言** | 暗夜书房（深色 + 用户色卡 `#BCAEAA / #947D75 / #6A080E / #341915 / #1B1A1F`） |
| **构建产物** | `dist/`（含 Service Worker + manifest，可直接 PWA 部署） |

---

## 版本演进

### v1.0 (2026-09-07) —— 已被 v2.0 取代
- 初版：文章 CRUD、Markdown、图片 Base64、JSON/TXT/MD/PDF 导入导出。
- 由 DuMate 实现。

### v2.0 / v2.1 (2026-09-08) —— **已归档至 `archive/v2/`**
- **设计语言**：iOS 液态玻璃（浅色磨砂玻璃，无边框，低饱和灰蓝）；
- **技术栈**：原生 HTML/CSS/JS（无构建）；
- **功能**：完整实现桌面/便签/空间/动态/信箱/收藏/数据/设置八大模块；
- **存储**：IndexedDB + Blob；
- **PWA**：原生 service worker + manifest；
- **借鉴**：参考并改编 [InternalBeyond](https://github.com/Sui-IB/InternalBeyond-Mobile) 的 12 列挂件网格；
- **许可**：InternalBeyond 为 PolyForm Noncommercial 1.0.0，V2 仅限个人非商用。

### v3.0 (2026-09-10) —— **当前版本**
- **设计语言**：暗夜书房（深色 + 用户自定义色板 + 烛光环境光）；
- **技术栈**：Vite + React 18 + TypeScript + TailwindCSS + Zustand + Dexie；
- **核心差异**：完全重写 UI 与样式系统，保留 V2 数据模型与功能架构；
- **目标**：在 V2 已有功能基础上，提供「暗色情绪向、朦胧大气」的视觉体验与现代化前端工程。
- V2 整体归档至 `archive/v2/`，保留为历史（可对照查阅）。

---

## v3.0 设计哲学（不可随意改）

### 核心定位
VidaOS 不是社交网络，是**私密的个人生活记录空间**。暗色优先，文字是绝对主角。

### 视觉规则
- **暗色优先**（dark-mode-only），适合长时间阅读；
- **大圆角柔和卡片**（20–28px），半透深色 + 极细酒红描边 + 内侧烛光高光；
- **宽松行高**（1.85x 正文、1.95x 阅读）；
- **大号打字机字体**呈现时间（`JetBrains Mono`），衬线字体呈现正文（`EB Garamond`）；
- **烛光环境**：屏幕底部一抹极淡的暖色光晕渐变；
- **低饱和高对比强调**：暗酒红 `#6A080E` 只在按钮、链接、标签、选中态使用，绝不滥用。

### 颜色 Token（最终）
```css
:root {
  --ink: #1B1A1F;        /* 主背景 - 深夜紫黑 */
  --wood: #341915;       /* 副背景 - 暗咖啡 */
  --wine: #6A080E;       /* 强调 - 暗酒红 */
  --wine-light: #8B1A1F; /* hover */
  --wine-deep: #4A0608;  /* active */
  --bronze: #947D75;     /* 次要 - 古铜 */
  --bronze-light: #A89289;
  --paper: #BCAEAA;      /* 主要文字 - 旧纸 */
  --candle: #E8C39E;     /* 高光 - 烛光 */
  --moon: #F2EBE0;       /* 标题 - 月光 */
}
```

### 字体
- **显示/数字**：`JetBrains Mono`（打字机风格，等宽）→ 时钟、英文小标
- **正文/标题**：`EB Garamond`（衬线）→ 文章、签名、UI 标题
- **UI 元素**：`Inter`（无衬线）→ 按钮、Tab、辅助文案

---

## 关键设计决策

### 1. 技术栈升级（v2 → v3）
- 从 vanilla JS 升级到 React + TS，便于复杂状态管理与代码维护；
- TailwindCSS 让设计 token 系统化、约束化；
- 仍保持纯前端、无后端、PWA 离线可用。
- **原因**：v2 已有 ~5000 行 vanilla JS，新功能（编辑器优化、PWA、状态管理）继续 vanilla 维护成本高。

### 2. 状态管理：Zustand 单一 store + 拆分 UI
- 业务数据集中在 `useAppStore`（profile / articles / moments / letters / favorites / notes / categories / tracks / settings）；
- UI 状态在 `useUIStore`（currentTab / notesTab / editor / toasts / modal）；
- 音乐播放状态独立在 `useMusicStore`（涉及 audio 实例与 WebAudio 节点）；
- 持久化：`useAppStore` 状态变更通过 debounce 400ms 后写入 Dexie。

### 3. 路由：Hash 路由
- 使用 `HashRouter` 而非 `BrowserRouter`，**支持 `file://` 直接打开 + 静态托管无需配置 SPA fallback**；
- 主 Tab 路由：`/desk /notes /data /settings`；
- 子视图路由：`/space/collection/:id`、`/space/article/:id`、`/mailbox/letter/:id`；
- `TopBar` 根据 `location.pathname` 决定标题和返回键。

### 4. 数据模型（v2 沿用，v3 略微调整）
```typescript
interface AppState {
  version: 3;                    // 数据版本号
  profile: Profile;
  collections: Collection[];
  articles: Article[];
  moments: Moment[];
  letters: Letter[];
  favorites: Favorite[];         // 跨类型收藏
  notes: {
    inspiration: InspirationNote[];
    schedule: ScheduleNote[];    // 含 date/time，与首页日历联动
    todo: TodoNote[];
  };
  categories: { inspiration: string[]; schedule: string[]; todo: string[] };
  tracks: Track[];               // 含 builtin 与 fileId
  settings: { lastTab: TabKey };
}
```
- 完整定义见 `src/types/index.ts`；
- 图片/音频以 `fileId` 引用，存在 Dexie 的 `files` 表（Blob）；
- 运行时经 `fileURL(id)` 转 objectURL（带 LRU 缓存 + 失败缓存）。

### 5. 文件引用与缓存
- `src/lib/fileUrl.ts` 维护 `id → objectURL` 缓存；
- 失败的 id 进入 `failed` 集合，避免反复查 DB；
- 切换用户、清空数据时记得调用 `clearFileURLCache()` 释放 objectURL。

### 6. 桌面"烛光"环境
- 不是真实 canvas，是**纯 CSS radial-gradient** 在 `body` 上做多层叠加（左下烛光 + 右下酒红 + 顶部木色 + 噪点纹理）；
- 顶部固定层（`Background.tsx`）+ 噪点用 SVG `feTurbulence` 0.025 透明度叠加；
- 比 canvas 省电，主题色变了只改 CSS 变量即可。

### 7. 编辑器
- 用原生 `<textarea>` 而非 contenteditable，**IME 中文输入法零问题**；
- `caret-color: var(--candle)`（烛光橘），不刺眼；
- `line-height: 1.95`、字号 `1.0625rem`、行宽 `max-w-3xl`，最适合长时间书写；
- 工具栏通过 `insert(before, after, placeholder)` 在选区插入语法；
- 图片上传走 `compressImage` → 1600px / 0.82 质量（>500KB 才压缩），避免大图撑爆 IndexedDB。

### 8. PDF 导出
- `html2canvas` 把渲染好的 DOM 截成画布，再 `jsPDF.addImage` 输出；
- **排版**：米色背景（`#F2EBE0`）+ 衬线字体（`EB Garamond`）+ 酒红小标题（`#6A080E`）+ 月光色正文（`#1B1A1F`）；
- 页面尺寸 A4 纵向，自动分页（按像素切割）；
- 不引入 html2pdf.js 等依赖（体积大、中文易出问题）。

### 9. 音乐播放器
- 内置音景用 **WebAudio 实时合成**，不依赖音频文件：
  - `rain`：白噪声 + 低通滤波（1200Hz）模拟雨声；
  - `candle`：60Hz + 90Hz 正弦波叠加模拟低频嗡鸣；
  - `silence`：静音轨道。
- 导入的本地音频用 `<audio>` + Blob objectURL。
- 切换曲目时先 `pause()` 释放 audio 节点。

### 10. 分类管理
- 三个分区（灵感/日程/待办）各自有 `categories: string[]`；
- `CategoryChips` 组件支持**单选筛选 + 双击重命名 + × 删除 + + 新增**；
- 删除分类会保留便签（便签的 `category` 字段保持原值，只是从筛选列表移除）。

---

## 文件结构与职责

```
VidaOS/
├── public/
│   ├── favicon.svg              # 站点图标
│   └── icons/                   # PWA 图标
├── scripts/make-icons.mjs       # sharp 生成 PWA 图标
├── src/
│   ├── main.tsx                 # 入口
│   ├── App.tsx                  # 路由 + 布局
│   ├── styles/globals.css       # 全局样式 + token + Markdown 排版
│   ├── types/index.ts           # 类型定义
│   ├── lib/                     # 工具与底层
│   │   ├── db.ts                # Dexie（state + files）
│   │   ├── fileUrl.ts           # Blob → objectURL
│   │   ├── markdown.ts          # marked + DOMPurify（re-export plainText）
│   │   ├── exportImport.ts      # JSON / TXT / MD / PDF
│   │   └── utils.ts             # 时间 / ID / 压缩 / 文本
│   ├── stores/                  # 状态
│   │   ├── useAppStore.ts       # 业务数据（zustand）
│   │   ├── useUIStore.ts        # UI 状态
│   │   └── useMusicStore.ts     # 音乐
│   ├── components/              # 组件
│   │   ├── layout/              # Background / TopBar / BottomTabBar
│   │   ├── home/                # Clock / Feature / Calendar / DaySchedule / Music
│   │   ├── notes/               # Segmented / CategoryChips / Inspiration / Schedule / Todo
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage
│   └── pages/                   # 路由页面
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
├── vite.config.ts               # PWA + 别名
├── tailwind.config.js           # 色板 + 字体 + 阴影
├── postcss.config.js
├── tsconfig.json
├── README.md
├── PROJECT_MEMORY.md            # 本文件
└── archive/v2/                  # V2.1 完整历史
```

---

## 已实现功能清单（v3.0）

- [x] 暗夜书房设计系统（7 色 token + 3 字体 + 烛光环境）
- [x] 桌面：大时间日期 Hero + 4 功能网格 + 双卡式月历 + 音乐播放器
- [x] 月历：事项日打点、点日期切换当天日程
- [x] 音乐：内置雨声 + 烛光 WebAudio 音景 + 本地音频导入
- [x] 便签：灵感 / 日程 / 待办 分区滑块 + 分类管理
- [x] 空间：Markdown 长文 + 合集 + 标签 + 封面 + 收藏
- [x] 动态：短内容 + 多图（自适应网格）
- [x] 信箱：信件 + 照片 + 未读火漆提示
- [x] 收藏夹：跨类型聚合
- [x] 全屏 Markdown 编辑器（工具栏 / 预览 / 图片 / 字数 / 收藏）
- [x] 导出 JSON（带图片 Base64）/ TXT / Markdown / PDF（米色衬线排版）
- [x] 导入 JSON（合并 / 覆盖）/ Markdown / TXT
- [x] 设置：头像（压缩）/ 背景（5 预设 + 自定义）/ 签名 / 昵称
- [x] PWA：manifest + Service Worker + 离线缓存
- [x] 桌面 + 移动双端响应式（移动优先 / 桌面多列）
- [x] IndexedDB 持久化（state + files）
- [x] 键盘焦点环 + 减少动效 + 安全区适配

---

## 已知问题与 TODO

### 中优先级
- [ ] **全文搜索**：暂无；可在 `pages/*` 顶部加搜索输入，遍历标题/内容/标签匹配。
- [ ] **音频封面提取**：当前导入的音乐不提取内嵌封面，统一显示唱片图标。
- [ ] **批量操作**：暂不支持批量删除 / 批量导出。
- [ ] **文章内嵌图片本地化**：Markdown `![](url)` 仅支持外链；如需本地内嵌可扩展 `fileRef:` 语法。
- [ ] **多 PWA 图标主题色**：当前图标是统一的暗夜书房色，可考虑根据时间自动切换。

### 低优先级
- 文章加密存储
- 静态站点导出（生成纯 HTML）
- 自定义主题色（在 v3.0 的暗夜书房风格上扩展）
- 暗色以外的模式（暂不需要）

---

## 依赖清单

| 依赖 | 版本 | 用途 | 协议 |
|------|------|------|------|
| react | ^18.3.1 | UI 框架 | MIT |
| react-dom | ^18.3.1 | DOM 渲染 | MIT |
| react-router-dom | ^6.26.2 | Hash 路由 | MIT |
| zustand | ^4.5.5 | 状态管理 | MIT |
| dexie | ^4.0.8 | IndexedDB 包装 | Apache-2.0 |
| marked | ^14.1.2 | Markdown 渲染 | MIT |
| dompurify | ^3.1.6 | HTML 净化 | MPL-2.0 |
| jspdf | ^2.5.2 | PDF 生成 | MIT |
| html2canvas | ^1.4.1 | DOM 截图 | MIT |
| lucide-react | ^0.441.0 | 图标 | ISC |
| date-fns | ^4.1.0 | 日期处理（备用） | MIT |
| vite | ^5.4.3 | 构建工具 | MIT |
| @vitejs/plugin-react | ^4.3.1 | React 插件 | MIT |
| typescript | ^5.5.4 | 类型系统 | Apache-2.0 |
| tailwindcss | ^3.4.10 | CSS 框架 | MIT |
| vite-plugin-pwa | ^0.20.5 | PWA 生成 | MIT |

devDeps 还含 @types/*、autoprefixer、postcss 等常规工具。

---

## Agent 接力指南

### 快速上手
1. 安装：`cd /Users/amarisgo/Documents/VidaOS && npm install`
2. 开发：`npm run dev` → http://localhost:5173
3. 数据：浏览器 DevTools → Application → IndexedDB → `vidaos` → `state` + `files`
4. 架构：Vite + React + TS，按 `pages/ + components/ + stores/ + lib/` 分层

### 新增一个页面
1. 在 `src/pages/` 加文件；
2. `src/App.tsx` 的 `<Routes>` 注册路由；
3. 如果是 Tab：在 `BottomTabBar.tsx` 的 `TABS` 数组加入；
4. 如果是子视图：在 `TopBar.tsx` 的 `ROUTE_TITLES` 与 `matchTitle` 加标题规则。

### 新增一个字段
1. `src/types/index.ts` 加类型；
2. `src/lib/db.ts` 的 `defaultState()` 加默认值；
3. `src/stores/useAppStore.ts` 加 action；
4. UI 层调用新 action。

### 改设计 token
- **颜色**：改 `tailwind.config.js` 的 `colors` + `src/styles/globals.css` 的 `:root`；
- **字体**：改 `tailwind.config.js` 的 `fontFamily` + `index.html` 的 Google Fonts link；
- **圆角 / 阴影 / 动画**：都在 `tailwind.config.js`。

### 测试
- `npm run dev` 浏览器手动测试；
- `npm run build && npm run preview` 测试生产构建（PWA Service Worker 会注册）。

### 常见修改场景
- **改首页布局**：编辑 `src/components/home/*` 和 `src/pages/DeskPage.tsx`；
- **改编辑器样式**：编辑 `src/components/editor/MarkdownEditor.tsx` 与 `src/styles/globals.css` 的 `.prose-vidaos`；
- **改数据模型**：同步改 `defaultState()`、`stores/useAppStore.ts`、导入时的 `scopedState()`；
- **改备份范围**：改 `src/lib/exportImport.ts` 的 `SCOPES` 与 `scopedState()`；
- **加新主题色**：在 `tailwind.config.js` + globals.css 加 token，注意暗色约束。

### Git 提交
```bash
cd /Users/amarisgo/Documents/VidaOS
git add -A
git commit -m "feat: ..."
```

提交建议：
- `feat:` 新功能
- `fix:` bug 修复
- `style:` 样式调整（不改逻辑）
- `refactor:` 重构（既不改功能也不改样式）
- `chore:` 杂项（依赖、配置）
- `docs:` 文档
- 大版本变更用 `BREAKING CHANGE:` 在 footer

---

## 变更日志（Changelog）

### [v3.0] - 2026-09-10 —— 暗夜书房重构 ✦ 当前版本
- V2.1 整体归档至 `archive/v2/`，保留为历史（git mv，不删除）；
- 设计语言由「液态玻璃浅色」改为「暗夜书房深色」+ 用户自定义色板；
- 技术栈由 vanilla JS 升级为 Vite 5 + React 18 + TypeScript + TailwindCSS 3 + Zustand + Dexie 4；
- 字体升级为 EB Garamond（衬线）+ JetBrains Mono（打字机）+ Inter（UI）；
- 全屏 Markdown 编辑器重写：caret 烛光橘、1.95 行高、宽留白、丝滑输入；
- 月历与日程双卡：事项日打点，点日期联动日程；
- 音乐播放器：内置 WebAudio 雨声 + 烛光音景，支持本地音频；
- 空间：Markdown + 合集 + 标签 + 封面 + 收藏；
- 动态：朋友圈卡片流，1/2/3+ 图自适应网格；
- 信箱：信件 + 照片 + 火漆未读呼吸提示；
- 收藏夹：跨类型聚合；
- 便签：灵感/日程/待办分区滑块 + 分类管理（增/删/重命名）；
- 数据：JSON（带图片 Base64）/ TXT / MD / PDF 导入导出，可选范围；
- 设置：头像（压缩）+ 背景（5 预设 + 自定义）+ 签名 + 昵称；
- PWA：vite-plugin-pwa + Workbox，19 个条目预缓存；
- 响应式：移动优先，桌面多列（双卡并排）；
- 状态：业务数据 / UI / 音乐 三个独立 store；
- 键盘可访问性 + 减少动效 + 安全区适配。

### [v2.1] - 2026-09-08 —— 借鉴 InternalBeyond 重构首页
- 首页改为 12 列挂件网格；
- 玻璃材质升级；
- 桌面 Hero 改横版，日历与日程拆双卡。

### [v2.0] - 2026-09-08 —— 整体重写
- 推倒 v1.0 的 UI 与信息架构；
- 落地液态玻璃规范；
- 存储从 localStorage 迁移到 IndexedDB。

### [v1.0] - 2026-09-07（已被 v2.0 取代）
- DuMate 初版：文章 CRUD、Markdown、图片 Base64、导入导出。

---

## 归属与致谢

- **项目归属**：用户个人项目
- **V2.x 设计借鉴**：[Sui-IB / InternalBeyond-Mobile](https://github.com/Sui-IB/InternalBeyond-Mobile)（仅 V2 借用，V3 已切换为完全自研方向）
- **V3.x 设计哲学**：用户自定义「暗夜书房」色板与方向
- **V3.x 重写 Agent**：Mavis（基于用户 2026-09-10 需求）
- **最后更新日期**：2026-09-10
