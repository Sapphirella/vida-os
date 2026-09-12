# VidaOS - 项目记忆与交接文档

> 本文档记录项目迭代历史、关键设计决策、架构与代码约定，便于后续 Agent 接力维护。

---

## 项目基本信息

| 字段 | 值 |
|------|-----|
| **项目名称** | VidaOS |
| **项目类型** | 纯前端单页应用（SPA）—— 个人博客 / 生活记录系统 |
| **当前版本** | v3.0 — 暗夜书房重构（2026-09-10） |
| **存放路径** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS` |
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
- 使用 `HashRouter` 而非 `BrowserRouter`，**静态托管无需配置 SPA fallback**；
- ⚠️ **注意：HashRouter 并不能让 `index.html` 用 `file://` 双击打开**（v3.0 文档曾如此声称，已实测证伪）。原因：根 `index.html` 是 Vite 的**入口模板**，其中 `<script type="module" src="/src/main.tsx">` 指向 **TSX 源码**（浏览器无法执行），且 `/src/...`、`/favicon.svg` 是**绝对路径**在 `file://` 下会解析到文件系统根；即便改用相对路径，**ES module 脚本在 `file://` 下也会被 CORS 拦截**（origin 为 `null`）。查看应用的唯一正确方式是 **HTTP 服务**（见「快速上手」）。
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
│   │   ├── backgrounds.ts       # 背景预设色卡（设置页与背景层共用）
│   │   └── utils.ts             # 时间 / ID / 压缩 / 文本
│   ├── stores/                  # 状态
│   │   ├── useAppStore.ts       # 业务数据（zustand）
│   │   ├── useUIStore.ts        # UI 状态
│   │   └── useMusicStore.ts     # 音乐
│   ├── components/              # 组件
│   │   ├── layout/              # Background / TopBar / BottomTabBar
│   │   ├── home/                # Clock / Feature / Calendar / DaySchedule / Music
│   │   ├── notes/               # Segmented / CategoryChips / Inspiration / Schedule / Todo / ScheduleEditor
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage / ErrorBoundary
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
├── package-lock.json            # lockfileVersion 3（npm ci 依据）
├── .gitignore
├── vite.config.ts               # PWA + 别名
├── tailwind.config.js           # 色板 + 字体 + 阴影
├── postcss.config.js
├── tsconfig.json
├── docs/                        # ⚠️ v3 预览截图（README 未引用，见审计 P2）
├── README.md
├── PROJECT_MEMORY.md            # 本文件
└── archive/v2/                  # V2.1 完整历史（git mv 保留，自包含可运行）
```

---

## 已实现功能清单（v3.0）

- [x] 暗夜书房设计系统（7 色 token + 3 字体 + 烛光环境）
- [x] 桌面：大时间日期 Hero + 4 功能网格 + 双卡式月历 + 音乐播放器
- [x] 月历：事项日打点 + 点日期联动当天日程（2026-09-11 修复，选中日期存于 `useUIStore.selectedDate`）
- [x] 音乐：内置雨声 + 烛光 WebAudio 音景 + 本地音频导入
- [x] 便签：灵感 / 日程 / 待办 分区滑块 + 分类管理
- [x] 空间：Markdown 长文 + 合集 + 标签 + 封面 + 收藏
- [x] 动态：短内容 + 多图（自适应网格）
- [x] 信箱：信件 + 照片 + 未读火漆提示
- [x] 收藏夹：跨类型聚合
- [x] 全屏 Markdown 编辑器（工具栏 / 预览 / 图片 / 字数 / 收藏星标）
- [x] 导出 JSON（带图片 Base64）/ TXT / Markdown / PDF（米色衬线排版）
- [x] 导入 JSON（合并 / 覆盖）/ Markdown / TXT
- [x] 设置：头像（压缩）/ 背景（5 预设 + 自定义，2026-09-11 接通 `Background.tsx`）/ 签名 / 昵称
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

## 代码审计结果（2026-09-11，全量通读后确认）

> 以下问题均经逐文件核对确认（附 file:line），**与本文档上文"已实现功能清单"的若干条目相互矛盾**，接力时请以本节为准。

### P0 — 功能声称与实现不符

0. **点击任意底部 Tab 导致整页白屏** ✅ **已修复（2026-09-11，无头浏览器实测确认）**
   - **现象**：点「便签 / 数据 / 设置 / 桌面」任意一个，页面直接空白。
   - **根因**：`App.tsx` 中两个 effect 互相打架 —— 一个把当前 tab 同步成 `settings.lastTab`，另一个把 `currentTab` 写回 `settings.lastTab`。点击后 `currentTab` 变了而 `lastTab` 仍是旧值，于是形成 ping-pong：`currentTab → lastTab → currentTab …` 无限循环，React 抛 `Maximum update depth exceeded` 并**卸载整棵组件树**（所以是白屏而不是报错页）。
   - **定位方式**：无头 Chrome 内用 iframe 探针真实模拟点击，抓到堆栈 `at setTab (useUIStore) ← at App.tsx ← commitHookEffectListMount`。
   - **修复**：把「启动时恢复上次 tab」改为**只执行一次**（`useRef` 守卫），并让「写回 lastTab」保持单向、且等 `hydrated` 之后再写。
   - **补充**：这是 v3.0 起就存在的缺陷，与本次其它改动无关；此前未被发现是因为点 tab 必然白屏，而直接输入 URL / 刷新反而正常。

0b. **数据持久化从未生效** ✅ **已修复（2026-09-11，实测确认）**
   - **现象**：写入的内容刷新后全部消失（数据实际从未落库）。
   - **根因**：`persist(get())` 把**整个 zustand store** 交给了 IndexedDB，而 store 里混着 `hydrate` / `addArticle` 等 **action 函数**，结构化克隆抛 `DataCloneError: ... could not be cloned`；该错误被 `saveState` 的 try/catch 吞掉，只在 console 留一行 `[VidaOS] saveState failed`。
   - **修复**：新增 `snapshot(store): AppState`，显式只挑 11 个纯数据字段，`persist` 改为写快照。同时把 `hydrated` 从「`s.version === 3 && s.articles !== undefined`」（**该条件恒为 true**，因为 `defaultState()` 就满足它 —— 所以加载动画从未显示、启动时会先闪一帧空数据）改为 store 内显式的运行时布尔标记，并在 `hydrate()` / `resetAll()` / `importState()` 中正确维护。
   - **实测**：IndexedDB `vidaos/state/root` 记录存在，`settings.lastTab="notes"`，记录内**不含任何函数**；重载后自动恢复到上次的 tab。

1. **月历与日程未联动** ✅ **已修复（2026-09-11）**：原先 `CalendarCard.tsx` 与 `DayScheduleCard.tsx` 各自持有独立 `selected` 本地 state，点击日期只更新日历自己的标签，右侧日程卡永远停在今天。修复方式：把选中日期提升到 `useUIStore.selectedDate`（新增 `setSelectedDate`），两卡共同读写，实现真正的点日期联动。
2. **首页日程卡「新增」写错类型** ✅ **已修复（2026-09-11）**：原先以 `mode: 'inspiration'` 打开编辑器并派发**无人监听**的 `CustomEvent('open-schedule-editor')`，结果从首页新增日程会创建一条**灵感**便签。修复方式：把便签页原有的日程表单提取为共用组件 `src/components/notes/ScheduleEditor.tsx`，首页卡片改为内联展开该表单并直接调用 `addSchedule()`，同时删除了那个 CustomEvent。
3. **背景设置完全无效** ✅ **已修复（2026-09-11）**：原先 `Background.tsx` 是硬编码的 `bg-ink` + 烛光渐变层，**从不读取** `profile.backgroundPreset` / `backgroundFileId`。修复方式：预设色卡提取到共用模块 `src/lib/backgrounds.ts`（`PRESET_BACKGROUNDS` / `getBackgroundPreset` / `DEFAULT_BACKGROUND_PRESET`，设置页与背景层共用），`Background.tsx` 改为读取 profile：自定义图经 `fileURL()` 取 objectURL 并以 `background-image` 铺满（外加 62% 暗色蒙版保可读性），否则渲染预设渐变。**已在无头 Chrome 中实测**：渲染出的背景 style 为 `linear-gradient(135deg, rgb(27,26,31) 0%, rgb(52,25,21) 100%)`（即「夜半」预设）。
4. **音乐播放/暂停键失效** ✅ **已修复（2026-09-11）**：原先播放键恒调用 `music.play(currentTrack)`（`play()` 内部先 `pause()`），点暂停图标实为**从头重播**。修复方式：卡片改为「播放中则 `pause()`，否则 `play()`」；`useMusicStore` 增加续播语义（暂停时保留 `audioEl`，同曲再播从当前位置继续，`ended` 后归零重播），并补上 `release()` 统一释放 audio 元素与 WebAudio 节点；删除了无调用者且有 bug 的 `toggle()` / `stopBuiltin()`。
5. **编辑器收藏星标从不渲染** ✅ **已修复（2026-09-11）**：`MarkdownEditor` 的星标依赖 `favoriteId` prop，而 `EditorOverlay` 从不传它。修复方式：`EditorOverlay` 在「编辑已有文章/信件」时传入 `favoriteId={{ refType: mode, refId: editingId }}`；新建条目（尚无 id）时按设计不显示星标。
6. **日期格式串错误** ✅ **已修复（2026-09-11）**：`ArticleReaderPage.tsx:55` 与 `LetterReaderPage.tsx:50` 传入 `'YYYY 年 M 月 D 日'`，但 `utils.ts` 的 `formatDate` 原先只替换 `YYYY/MM/DD/HH/mm`，**单字母 `M`/`D` 不会被替换** → 页面实际渲染「2026 年 M 月 D 日」。修复方式：`formatDate` 改为 token 正则替换（`/YYYY|MM|DD|HH|mm|M|D/g`），并顺带修掉原先 `.replace()` 只替换**第一处**匹配的隐患。已用 8 种现有格式回归测试，全部通过。
7. **过去日程只显示一天，且编辑按钮是死按钮** ✅ **已修复（2026-09-11）**：`ScheduleView.tsx:115` 原先只渲染 `grouped[pastDates[0]]`，其余过去日期的事项在 UI 中不可见；且过去项硬编码 `isEditing={false}`、`onEdit` 永不生效、`onSave={() => {}}` 空实现 → 过去日程既看不到也改不了。修复方式：改为遍历全部 `pastDates`（每个日期带自己的标签），并把 `isEditing` / `onSave` 接到真实 state 与 `updateSchedule`。
8. **编辑器 `schedule`/`todo` 模式不可达** ✅ **已修复（2026-09-11）**：`MarkdownEditor` 的 mode 联合类型原先含 `'schedule' | 'todo'`（以及 `'inspiration'`），但 `EditorOverlay` 的 switch 与 `getEditorTitle` 都未处理。修复方式：mode 收敛为 `'article' | 'moment' | 'letter'`；`inspiration` 路径在首页日程卡改为内联表单后已无任何调用方（灵感便签本来就走 `InspirationView` 的内联编辑器），故一并删除，`EditorState` 中随之无用的 `date` / `time` / `category` 字段也已移除。
9. **编辑器内容会被父组件重渲染重置（数据丢失风险）** ✅ **已修复（2026-09-11）**：原先 `EditorOverlay` 每渲染都新建数组（`editor.imageIds || []`、`editor.tags ?? []`），而 `MarkdownEditor` 的同步 `useEffect` 把这些数组列入依赖 → 父组件任意重渲染都会重跑并重置 `title`/`content`/`imageIds`/`tags`。修复方式：改用模块级稳定空数组常量；并**删除该同步 effect**，改由 `EditorOverlay` 给 `MarkdownEditor` 加 `key={mode-editingId}` 触发重挂载，初值由 `useState` 初始化取得 —— 结构上杜绝了「输入被清空」的可能。

### P1 — 资源与抽象层问题

10. **重置数据未释放 objectURL 缓存**：`DataPage.tsx:262-263` 调用 `resetAll()` + `db.files.clear()`，但**从不调用** `clearFileURLCache()`。`fileUrl.ts` 的 `clearFileURLCache` / `revokeFileURL` 全仓库 **0 引用**，与本文档第 5 条「切换用户、清空数据时记得调用」的约定相矛盾 → 残留 objectURL 内存泄漏。
11. **`DataPage.tsx` 重复导入同一符号** ✅ **已修复（2026-09-11）**：原先 `:6` 导入 `putFile`、`:18` 又 `import { putFile as saveFileBlob, db }`（`saveFileBlob` 从未使用）。已合并为一行 `import { putFile, db } from '@/lib/db';`。
12. **`base64ToBlob` 重复实现** ✅ **已修复（2026-09-11）**：删除了 `DataPage.tsx` 底部的局部副本，改为从 `@/lib/utils` 导入共用实现。
13. **`CollectionPage.tsx` 文件末尾二次导入 `useUIStore`** ✅ **已修复（2026-09-11）**：已把该 import 移到文件顶部与其他 import 合并，删除遗留的「// 重新导入 useUIStore」注释。
14. **`SegmentedControl` 指示器位置漂移** ⬜ 未修（P1，本轮范围外）：`:29-41` 的 `useEffect` 只依赖 `notesTab`，窗口 resize 或计数位数变化（9 → 10）后滑块会错位（缺 ResizeObserver）。
15. **`tsconfig.json` 关闭了未使用变量检查** ✅ **已修复（2026-09-11）**：已开启 `noUnusedLocals: true` + `noUnusedParameters: true`，并清掉编译器报出的**全部 17 处**死代码（`BottomTabBar` `currentTab`；`CategoryChips` `Edit2`/`Tag`；`InspirationView` 8 处；`exportImport` `base64ToBlob`；`DataPage` `Download`/`uid`/`saveFileBlob`；`SpacePage` `Star`/`showModal`）。开启后 `tsc -b --noEmit` 与 `vite build` 均通过，可作为防复发闸门。
16. **异步操作缺少错误处理（集群）**：`SettingsPage.tsx:27-38`/`:40-50`/`:92-96`/`:177-181`、`MarkdownEditor.tsx:124-134`、`MusicPlayerCard.tsx:24-42` 均为 `async` 点击处理器且**无 try/catch** → `putFile`/`deleteFile`/`compressImage` 失败即 unhandled rejection；`MarkdownEditor.tsx:132` 更是在失败时仍然弹出「已添加 N 张图片」。
17. **`MediaImage` 无失败态、且 8 处调用点全无 `alt`**：`MediaImage.tsx:28-36` 当 `fileURL()` 返回 `null`（文件已丢失，见 `fileUrl.ts` 的 `failed` 集合）时 `url` 永远为 `null` → 永久脉冲骨架屏，用户无从判断是「加载中」还是「文件没了」。另 8 个调用点（`MarkdownEditor:368`、`LetterReader:69`、`Mailbox:86`、`Settings:81`、`Moments:55`、`ArticleReader:63`、`Collection:117`、`Space:154`）**均未传 `alt`**。
18. **`ul > div` 非法 DOM 嵌套 3 处**：编辑态直接返回 `<Card>`（渲染为 `div`）而未被 `<li>` 包裹 —— `InspirationView.tsx:149-174`、`ScheduleView.tsx:174-185`、`TodoView.tsx:165-190`。
19. **待办统计与列表不一致** ✅ **已修复（2026-09-11）**：`TodoView.tsx` 原先列表按分类过滤、而统计 `remaining/total` 按**全量**计算 → 列表为空却显示「0 / 5 项待办」。修复方式：统计与列表共用同一 `scoped`（分类范围内）集合，`EmptyState` 的 `total === 0` 判断也随之正确。
20. **信箱摘要未净化 Markdown** ✅ **已修复（2026-09-11）**：`MailboxPage.tsx` 原先直接 `l.content.slice(0, 100)`（`SpacePage.tsx` 用了 `plainText()`）→ 卡片摘要会露出 `#`/`**` 等原文标记。修复方式：改用 `excerpt(plainText(l.content), 100)`，并合并了该文件两行重复的 `@/lib/utils` 导入。
21. **收藏夹的「动态」分支无路径可达** ⬜ **部分处理（2026-09-11）**：全项目**没有任何路径能创建 moment 收藏** —— `toggleFavorite` 的调用点只有 `ArticleReaderPage`（article）、`LetterReaderPage`（letter）、`FavoritesPage` 自身与 `MarkdownEditor`（现已能传入 `favoriteId`，但仅对 article/letter）。同时 `MomentsPage` 既无收藏入口也无编辑入口（`EditorOverlay` 的 moment 分支不处理 `editingId`）。本轮只把 `FavoritesPage` 的 `any` 断言重写为类型安全的 `FavoriteEntry` 模型；**若要真正启用动态收藏，需要给 `MomentsPage` 补收藏按钮**（或反过来删掉该分支）。

### P2 — 死代码与未用资源（可安全删除）

22. `utils.ts` 死导出：`throttle`、`isSameDay` ✅ **已删除（2026-09-11）**。注意 `clearFileURLCache` / `revokeFileURL` 属「该用而未用」（见第 10 条），**不应删除**，本轮已保留。
23. `globals.css` 死类：`.divider`、`.safe-left`、`.safe-right`、`.truncate-3`、`.truncate-6` ✅ **已删除（2026-09-11）**；`.tag-candle` 因 `Tag` 的 `candle` 变体被移除也一并删除。现 `globals.css` 中已无 0 引用类。
24. `tailwind.config.js` 中 0 引用的 token：`fontSize.display/body/caption`，以及 `ink-soft`、`wood-soft`、`card`、`card-elevated`、`border-wine`、`border-bronze`、`border-glow`、`shadow-card`、`shadow-card-elevated`、`shadow-wine-glow`、`shadow-candle-glow`、`shadow-inner-glow`、`backdrop-blur-glass`。取而代之的是各组件内联的 rgba/hex（`SettingsPage` 5 处、`MusicPlayerCard` 4 处、`SegmentedControl` 3 处、`Background` 3 处、`TopBar`/`BottomTabBar`/`ClockHeader`/`MarkdownEditor` 各 2 处等）→ **改 token 不会同步生效**。⬜ **本轮有意保留**：这些是本文档「改设计 token」章节指向的设计系统本体，删除会丢失设计意图；建议后续把内联 rgba 逐步替换为 token 用法，而非删 token。（`animate-pulse-slow` 工具类虽为 0 引用，但 `ClockHeader.tsx:30` 以内联 `animation: 'pulse-slow …'` 使用了同名 keyframe，**不可删 keyframe**。）
25. **死 props（声明但无人传入）** ✅ **已删除（2026-09-11）**：`Button.fullWidth`、`Card.as`（连带 `const Tag: any = as` 这个类型逃逸）、`EmptyState.icon`、`Tag` 的 `variant="candle"`、`MediaImage.fallback`。
26. `types/index.ts` `settings.themeAccent` 从未使用 ✅ **已删除（2026-09-11）**。
27. `MarkdownEditor` 的 **split 预览分支不可达** ✅ **已删除（2026-09-11）**，`mode_` 状态类型收敛为 `'edit' | 'preview'`。
28. `useMusicStore` 中未被使用的 `ctx` 与无调用者的 `toggle()` ✅ **已删除（2026-09-11）**；`stopBuiltin()` 同样无调用者，一并删除。播放/暂停语义改由 `play()` 的续播分支 + `pause()` 承担。
29. **类型逃逸（`as any`）** ✅ **已修复（2026-09-11）**：`Card.tsx`、`ScheduleView.tsx`（`addSchedule(data as any)` → 新增 `ScheduleDraft` 类型）、`DataPage.tsx`（`importState` 签名改为接受 `Partial<AppState>`，并新增 `mergeById` 辅助函数）、`FavoritesPage.tsx`（重写为 `FavoriteEntry` 展示模型，消除 `ref: any`）。**额外收获**：`useAppStore.ts` 内 38 处 `set(... as any)` 经实测**全部是多余的**，已一次性移除 —— 此前它们让每个 action 都跳过了类型检查。

### 可提取的重复逻辑（重构候选）

- **浮动新增按钮（FAB）5 处像素级重复**：`InspirationView.tsx:121-131`、`ScheduleView.tsx:136-152`、`TodoView.tsx:136-146`、`MomentsPage.tsx:82-92`、`MailboxPage.tsx:121-131` → `<FloatingAddButton />`
- **文章卡片**：`SpacePage.tsx:146-182` ≈ `CollectionPage.tsx:108-139` → `<ArticleCard />`
- **阅读页骨架**（header + 正文 + 图片网格 + 操作栏）：`ArticleReaderPage.tsx:40-123` ≈ `LetterReaderPage.tsx:34-115` → `<ReaderLayout />`
- **收藏星标按钮**：`ArticleReaderPage.tsx:84-93`、`LetterReaderPage.tsx:81-87`、`MarkdownEditor.tsx:160-171` → `<FavoriteButton />`
- **1/2/N 列图片网格**：`MomentsPage.tsx:39-59` ≈ `LetterReaderPage.tsx:54-73` → `<ImageGrid />`
- **圆形勾选按钮**：`DayScheduleCard.tsx:76-86`、`ScheduleView.tsx:190-199`、`TodoView.tsx:197-206` → `<CheckCircle />`
- **「小标签 + 分隔线」章节头**：`DeskPage.tsx:16-21`、`SpacePage.tsx:83-88,124-129`、`ScheduleView.tsx:77-82,108-113` → `<SectionLabel />`
- **`'YYYY 年 M 月 D 日'` 日期串**：`ArticleReaderPage.tsx:55`、`LetterReaderPage.tsx:50` → 应统一走 `chineseDate`

### 其他横切问题

- **a11y 缺口集中**：`MediaImage` 8 处调用全无 `alt`；`Card` 带 `onClick` 渲染为 `div`（`FeatureGrid.tsx:35`、`SpacePage.tsx:93,147`、`CollectionPage.tsx:110`、`MailboxPage.tsx:39`、`FavoritesPage.tsx:56` 键盘不可达）；`Toast.tsx:8` 无 `role="status"`/`aria-live`；`Modal.tsx` 无 `role="dialog"`/Escape；`SegmentedControl` 无 `role="tablist"`；`ScheduleView.tsx:225-236`、`TodoView.tsx:216-227`、`MarkdownEditor.tsx:369-374` 图标按钮无 `aria-label`。
- **列表项草稿不重置 2 处**：`InspirationView.tsx:147`、`TodoView.tsx:163`（取消编辑后再进入会显示上次未保存内容）。
- **`TopBar.tsx:5-14` `ROUTE_TITLES` 缺 `'/'`** → 首屏 `pathname === '/'` 时标题回落为 `VidaOS` 且无副标题；`canBack` 用 `navigate(-1)`（`:51`），外部深链进入会直接退出应用。
- **`MusicPlayerCard` 无 useEffect cleanup** → 切换路由后 `new Audio(...)` 与 WebAudio 节点不停、`timeupdate` 监听不移除。


### 依赖与构建状态（已验证）

- `npx tsc -b --noEmit` **通过**，`npx vite build` **通过**（2026-09-11 实跑）；PWA 预缓存 19 条，产物约 1.3 MB。
- `pdf-vendor` chunk 560 KB，触发 Rollup「>500 kB」警告（可接受：jsPDF + html2canvas 体积固有）。
- **`date-fns` 是未使用依赖**：`src/` 中 0 引用，README/本文档均标注"备用"。可直接从 `package.json` 移除。
- **`scripts/make-icons.mjs` 依赖 `sharp`，但 `package.json` 未声明**（devDependencies 无此项、`package-lock.json` 也无 `node_modules/sharp` 条目），且 `package.json` 里**没有对应 npm script**。当前 `node_modules/sharp@0.35.4` 属孤儿安装 → 该脚本在干净环境下无法运行。若要保留此脚本，需 `npm i -D sharp` 并加 `"icons": "node scripts/make-icons.mjs"`。

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
1. 安装：`cd /Users/amarisgo/Documents/DeepSeek Harness/VidaOS && npm install`
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

### ⚠️ 如何查看应用（不要双击 index.html）
根目录的 `index.html` **不是**可以双击打开的独立页面，它是 Vite 的入口模板（引用的是 `src/main.tsx` 源码）。用 `file://` 打开必然白屏。

**最简单：双击根目录的 `打开VidaOS.command`** —— 它会自动启动服务并打开浏览器（关掉终端窗口即停止服务）。

手动方式：

```bash
npm run dev          # → http://localhost:5173   （开发模式，改代码即时热更新）
# 或
npm run build && npm run preview   # → http://localhost:4173   （生产构建 + PWA/SW）
```

想不装 Node 直接看，也必须经由 HTTP 服务（例如 `npm run build` 后 `npx serve dist`）。手机预览：与电脑同一 Wi-Fi，访问终端里打印的 `Network:` 地址（形如 `http://192.168.x.x:5173`）。

### 常见修改场景
- **改首页布局**：编辑 `src/components/home/*` 和 `src/pages/DeskPage.tsx`；
- **改编辑器样式**：编辑 `src/components/editor/MarkdownEditor.tsx` 与 `src/styles/globals.css` 的 `.prose-vidaos`；
- **改数据模型**：同步改 `defaultState()`、`stores/useAppStore.ts`、导入时的 `scopedState()`；
- **改备份范围**：改 `src/lib/exportImport.ts` 的 `SCOPES` 与 `scopedState()`；
- **加新主题色**：在 `tailwind.config.js` + globals.css 加 token，注意暗色约束。

### Git 提交
```bash
cd /Users/amarisgo/Documents/DeepSeek Harness/VidaOS
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

### [v3.6] - 2026-09-11 —— PDF 排版回退到最早那一版（用户认为最好的一版）
用户在尝试了 v3.1~v3.5 的多轮改动后明确要求：**把 PDF 排版改回最早那一版**。

- **恢复最早版本的排版**：内容在 720px 宽、上下 64px / 左右 80px 内边距的容器里
  **连续排版**，整篇一次渲染成一张长图、再按页切片贴到各页，容器等比铺满整页宽度。
  因为是「连续流动」，所以不会出现每页上下各留 64px 白边，也不会出现图片独占一页、
  下半页空白。
- **移除**在此过程中引入的：逐页渲染 + 每页固定 620/720×1018 页面容器、按段落粒度
  摊平与二分装箱、单图压缩、页内 padding 等（这些都在某种程度上改变了观感）。
- **只保留两处用户明确要求过的改动**：
  1. 切点仍选在「行与行之间的空隙」（`computePageRanges`），不再把一行字劈成两半；
  2. 正文配图 / 封面 / fileRef 内嵌图仍以 data URL 内嵌（最早版本没有图）。
- 字号保留用户此前要求放大后的值（正文 16px；若也要改回 14px 只需一句话）。
- 实测：容器样式与最早版本逐字一致（`width: 720px; padding: 64px 80px`）、
  图片内嵌 1 张、PDF 1091 KB、耗时 0.3 秒。

> 教训（写给后续接手者）：PDF 分页这件事上我连续几轮「修一个问题引入另一个问题」，
> 而且中途用过错误的自检指标（对固定高度盒子用 `scrollHeight` 判断是否填满，
> 它永远不小于盒高，只能反映「有没有溢出」）。**涉及版式的改动，务必先让用户
> 确认想要的效果，再动手；并且自检指标要能真实区分「好/坏」，否则等于没测。**

### [v3.5] - 2026-09-11 —— PDF 文字页只占上半部分（真正的根因）
- **现象**：导出后「有图片的页」能铺满，但**纯文字页只有上半部分有字**。
- **根因**：`flattenUnits` 当初只在块高 **> 一整页(890px)** 时才下钻，所以一个 600px 的块会作为**整体单元**——一页只能放下一个，下半页自然空着。
- **修复**：下钻阈值改为「一页的 ~1/8（约 107px）」，只要**子元素全为块级**就继续下钻 → 单元自然落到**段落/标题/列表项**粒度，页面被填满。仍保留「子元素含行内元素就不下钻」的规则，避免把一段话拆碎导致行内格式与换行错乱。
- **同时纠正我的验证方式**（前几轮我一直在用错的指标）：
  - `scrollHeight` 对固定高度的盒子**永远不小于盒高**，所以「1018」只代表"没溢出"，**无法区分"填满"和"只填一半"** —— 这是我上一轮误报成功的原因。
  - 正确做法：临时把 `height` 设为 `auto` 读真实内容高度。用这个指标复测：
    **满页填充率 84–87%**（修复前约 50%），空白页 0、溢出页 0、10 页、40 节长文。
  - 仍可能出现的「偏空页」属于正常排版现象：当下一块是一张接近整页高的图片时，剩余空间放不下它，该页就会提前收尾。

### [v3.4] - 2026-09-11 —— 信件标题输入框 + PDF 每页只填一半
- **信件没有标题输入框**：`MarkdownEditor` 的标题输入只在 `mode === 'article'` 时渲染，而 `Letter` 本身有 `title` 字段且保存时会写入 —— 等于信件标题永远为空、也没地方填。现在文章与信件都会显示标题输入框（标签/合集那一行仍只给文章）。
- **PDF 每页只有上半部分有字**：上一版改成「按单元高度累加」来估算每页容量，但**相邻段落的 margin 会折叠**（我把每段自身的上下边距都累加了），于是严重高估容量 → 每页被塞得过满 → 收敛时又把内容推走 → 每页只剩上半部分。
  现在改为**用真实布局做二分**：每页二分查找「最多能放下前几个单元」，直接以 `page.scrollHeight` 为准。读取次数从几千次降到约 log2(单元数)×页数（21 页约 100 次），既不卡也精确。
- 实测（60 节纯文字长文）：**12 页，每一页内容底部都恰好 1018px（完全填满）**，空白页 0、溢出页 0、耗时 1.6 秒。
- 实测（信件）：编辑器出现标题输入框，保存后信箱列表正确显示标题「给未来的自己」。

### [v3.3] - 2026-09-11 —— PDF 导出第二轮修复（字号 / 空白页 / 格式 / 卡死）
用户连续反馈 PDF 问题，逐条定位后修复（含我上一轮引入的退化）：
- **点导出后网页无响应**：分页循环「每追加一个节点读一次 scrollHeight」＝ 几千次强制同步重排。改为「一次性测量 + 算术装箱」：先在**不修改 DOM** 时把所有内容摊平成排版单元（只触发一次布局），之后只按高度累加装箱；每页收尾只读一次做校验。实测 120 节长文 **2.9 秒完成、主线程最长卡顿 159ms**。
- **量测宽度与渲染宽度不一致（隐藏很深）**：量测容器曾是 720px 无内边距（内容宽 720），而页面容器有 80px 内边距（内容宽 560）—— 文字按 720 宽量高度却按 560 宽渲染，每段都变高，导致分页溢出。现已让量测容器带相同的横向内边距。
- **图片后面两大页空白**：图片限高 866px + 上下边距 28px = 894 > 每页可用 890px，被判成「超过一整页」；而切分函数对非文本节点直接 `return null` → **图片被丢弃 + 产生空白页**。现在：限高改为 `PDF_INNER_H - 96` 留足边距余量；非文本超大单元一律整体放上去并压缩到页内，绝不丢弃；页码收尾时对「只剩一个单元仍溢出」的页优先压缩图片而不是推走。
- **PDF 正文太小**：正文 14px → **16px**，日程/待办 13→15px，元信息 11→12px，段标题 16→18px。
- **灵感/动态的换行与格式被吞**：灵感/待办/日程原先用 `escapeHTML` 输出，换行被 HTML 直接压掉。现改用 `renderMarkdown`（加粗、列表、换行都保留），日程备注与动态评论也按换行渲染。
- 实测：3 张竖构图大图 + 长文 → 5 页、**图片 3 张全部渲染**、**完全空白页 0**、**溢出页 0**（每页恰好 1018px）、耗时 1.0 秒；灵感含 `<strong>` 与 2 处 `<br>`、动态含 `<li>` 与 `<br>`；正文节点 16px。
- PDF 体积：JPEG 质量 0.92 → 0.86。

### [v3.2] - 2026-09-11 —— 动态评论/收藏时间线 · 导出多选 · 本地快照备份（用户 9 项需求，第 2 批）
- **#4 动态作者与互动**：每条动态显示个人资料的头像+昵称（无头像用昵称首字兜底）；`Moment` 新增 `comments` 字段（旧数据 `?? []` 兜底）与 store action `addMomentComment`/`deleteMomentComment`；动态卡片新增收藏星标 —— 这也让 `FavoritesPage` 里原本**无法被触发**的「动态」分支真正可用。
- **#5 时间线与查找替换**：动态页改为时间线（左侧竖线 + 日期节点 + 「今天/昨天/M 月 D 日」分隔）；顶部「查找替换」展开查找条（查找框 + 替换框 + 上/下一个 + 替换 + 全部替换 + 清空 + 「第几个/共几个」），命中以 `<mark>` 高亮（`highlightHtml()` 只在标签外替换，不破坏 Markdown 生成的 HTML），当前命中高亮并自动滚入视野。做法参考 Nookery `js/ui.js` 的查找条。
- **#7 导出范围多选 + 收藏夹导出**：`ExportScope` 改为 `ExportScopes` 数组（`'all'` 为全选简写），新增 `normalizeScopes()`/`scopeSlug()`；新增「收藏夹」范围（**并带上被收藏的文章/动态/信件及其合集**，否则导出的是空壳）与「个人资料」范围；Markdown 导出新增「## 收藏」清单；数据页改为多选（✓/○、已选计数、全选/全不选、未选提示），文件名按所选范围生成。
- **#9 本地文件夹快照备份**：新增 `src/lib/snapshot.ts`。最多 10 份、超出自动删最早，手动导出文件不占额度；体积优化 ＝ state 走 gzip（实测约 36%）+ 媒体文件按原 Blob 存放（不做 base64，省约 33%）。`db.ts` 升到 v2（新增 `meta` 表存文件夹句柄，已有 `state`/`files` 数据保留）。

#### 用户 9 项需求的最终状态
| # | 需求 | 状态 |
|---|------|------|
| 1 | 编辑器 Markdown 预览无文字 | ✅ 当前代码**无法复现**（实测预览正常），判断为浏览器停留在修复前的旧 JS；已告知强制刷新 |
| 2 | 配色沉闷 → 精进 | ✅ 按 `docs/palette-suggestion.html` 落地（charcoal 层级 / line 描边 / amber 高亮 / 三个语义色） |
| 2 | 设置里背景点了不换 | ✅ 当前代码**无法复现**（实测 5 个预设均正确切换），同属旧 JS |
| 3 | 动态不显示 Markdown | ✅ 已修（`renderMarkdown` + `.prose-moment`） |
| 4 | 动态头像/用户名、评论、收藏 | ✅ 已实现并实测 |
| 5 | 时间线 + 查找替换 | ✅ 已实现并实测（高亮 3 处、计数 1/3、全部替换生效） |
| 6 | 文章图片不显示 / PDF 无图 / 多图排序 | ✅ 三项全修并实测：真实浏览器上传 2 张图后阅读页渲染出 2 张图（修复前为 0）且都有 alt；编辑器出现 2 个调序按钮且点击生效；PDF 容器内嵌 `data:image` = 1 处、含正文文字、输出 157 KB |
| 7 | 导出范围多选 + 收藏夹导出 | ✅ 已实测：全不选后提示「请至少选择一项」；只勾「收藏夹」导出的 JSON 含 1 条收藏 + 被收藏的文章 + 该文章的配图文件，且动态/信件已被排除 |
| 8 | PDF 分页切断文字 | ✅ 已修并实测（4737px → 5 页，切断文字的行数 = 0） |
| 9 | 本地文件夹快照（≤10 份） | ✅ 已实现并实测（12 份 → 保留 10 份、删最早；还原逐字段一致） |

> 待用户手测：#9 的真实文件夹选择器（`showDirectoryPicker` 需要用户手势与原生弹窗，无法在无头浏览器里自动化）；其余各项均已用无头浏览器走真实 UI 或真实代码路径验证。

### [v3.1] - 2026-09-11 —— 动态 Markdown / 配图与 PDF / 配色精进（用户 9 项需求，第 1 批）
- **配色精进（#2）**：依据 `docs/palette-suggestion.html` 扩展色板 —— 新增 `charcoal #2A292E`（上层卡，比 ink 亮一档做层级）、`line #4A3F3C`（描边/分隔线）、`amber #C9A063`（高亮/星标）、`parchment #D8C3A8`、`ash #8A858C`，以及语义色 `olive #6E7355`（成功）/ `sapphire #5C6B8C`（信息）/ `wine.bright #8C1117`（危险）。卡片底色由「发褐的棕」改为**中性炭黑**，正文背景加一层极淡紫灰，Toast 三态改用语义色 —— 整体不再一片沉闷发闷。
- **动态支持 Markdown（#3）**：`MomentsPage` 原先把 `m.content` 当纯文本渲染，现改用 `renderMarkdown()`；新增 `.prose-moment` 紧凑排版（比长文更小的段距与标题级差）。
- **修复文章配图（#6）**：`ArticleReaderPage` 原先只渲染 `coverId`，**上传的 `imageIds` 从未显示**；现新增配图区（排除已作封面的那张，带 alt）。
- **PDF 内嵌图片 + 分页不切断文字（#6/#8）**：
  - 新增 `buildImageDataUrls()`：从 IndexedDB 取 Blob 转 data URL 内嵌进 PDF（文章封面/配图、动态图片、信件图片都包含在内）；新增 `waitForImages()` 等图片解码完成，避免漏画。
  - 新增 `computePageRanges()`：收集容器内**每一行文字与每一张图片的纵向区间**，把「区间上边界」作为候选切点，再贪心选取不超过页高的最大候选点 —— 切点永远落在行间空隙，**不会再出现一行字被劈成两半**；同时限制单张图片不超过一页高度。
  - 渲染改为逐页切片（每页独立 canvas → 独立 PDF 页），并给每页铺米色底；A4 映射留 24pt 页边距。
- **配图排序（#6）**：编辑器底部缩略图新增序号与 ◀ ▶ 调序按钮（`moveImage()`），可拖动顺序即文章内图片顺序。
- **实测**：#8 用独立用例验证 —— 容器 4737px / 每页 1044px，输出 **5 页**（符合预期），**切断文字的切点数量 = 0**；`tsc -b --noEmit` 与 `vite build` 通过。
- **说明**：#1（编辑器预览无文字）与 #2 的「背景点了不换」在**当前代码中无法复现**（预览/背景均已实测正常）。判断为浏览器标签页停留在修复前的旧 JS（dev server 多次重启后 HMR socket 已断，页面不会自动刷新）。已提醒用户刷新，并将在后续加入版本标记。
- 剩余待办：#4 动态头像/用户名/评论/收藏、#5 动态时间线 + 搜索替换、#7 导出多选 + 收藏夹导出、#9 本地文件夹快照备份。

### [v3.0-errorboundary] - 2026-09-11 —— 新增错误边界，杜绝白屏
- 新增 `src/components/common/ErrorBoundary.tsx`（class 组件），提供**两层**保护：
  - **最外层（`variant="fullscreen"`，挂在 `main.tsx` 的 `HashRouter` 之外）**：兜住 App / 路由自身的错误，整屏显示恢复界面；
  - **页面级（`variant="inline"`，挂在 `App.tsx` 的 `<Routes>` 外层，`resetKey={location.pathname}`）**：单个页面崩溃时**顶栏与底部 Tab 仍然可用**，可以切到别的页面继续用，切换路由后自动复位。
- 恢复界面提供四个操作：**重试**（仅复位边界状态）、**回到桌面**（`#/desk`）、**重新加载页面**、**复制错误详情**（含 message / stack / componentStack；剪贴板不可用时退化为输出到控制台）；并有可折叠的「技术详情」。
- `componentDidCatch` 会同时 `console.error` 一份，便于排查。
- **实测（无头浏览器）**：临时让 `NotesPage` 渲染期抛错 → 点「便签」显示错误页、顶栏与底部 Tab 仍在、错误信息与堆栈齐全；**再点「桌面」成功恢复**；再回便签又正常显示错误页（不会永久卡死）。另临时让外壳组件 `Background` 抛错 → 最外层整屏兜底生效、页面非空白。

### [v3.0-critical] - 2026-09-11 —— 修复两个致命缺陷（白屏 + 数据不落库）
- **点击任意 Tab 白屏**：`App.tsx` 两个 effect 互相 ping-pong（`currentTab ↔ settings.lastTab`）触发 React `Maximum update depth exceeded` 并卸载整棵树。改为「恢复上次 tab 只执行一次」+「写回 lastTab 单向且等 hydrated」，已用无头浏览器模拟点击验证四个 tab 全部正常、0 错误；
- **数据持久化从未生效**：`persist(get())` 把含 action 函数的整个 store 写进 IndexedDB → `DataCloneError` 被静默吞掉。新增 `snapshot()` 只写纯数据；`hydrated` 改为真实标记（原先的判断恒为 true）。实测 IndexedDB 记录正常且不含函数、重载能恢复上次 tab；
- **新增 `打开VidaOS.command`**：双击即启动开发服务器并打开浏览器，关窗自动停止服务（已测冷启动/已运行两条分支与 trap 清理）。

### [v3.0-p0+cleanup] - 2026-09-11 —— 修复全部 P0 缺陷 + 死代码清理
- **修正文档错误**：本文档决策 #3 曾声称 HashRouter「支持 file:// 直接打开」——**实测证伪**，已改写并新增「如何查看应用」章节（根 `index.html` 是 Vite 入口模板，必须经 HTTP 服务查看）；
- **P0-1 月历↔日程联动**：选中日期提升到 `useUIStore.selectedDate`，两卡共用；
- **P0-2 首页新增日程**：提取共用组件 `src/components/notes/ScheduleEditor.tsx`，首页卡片内联展开表单并直连 `addSchedule()`，删除无人监听的 `open-schedule-editor` CustomEvent；
- **P0-3 背景设置接通**：新增 `src/lib/backgrounds.ts`（预设色卡单一来源），`Background.tsx` 改为读取 `profile`，支持预设渐变与自定义图（含暗色蒙版）；
- **P0-4 音乐播放/暂停**：卡片改为按 `isPlaying` 分派 `play()`/`pause()`；store 支持同曲续播并新增 `release()` 统一释放资源；
- **P0-5 编辑器收藏星标**：`EditorOverlay` 在编辑已有文章/信件时传入 `favoriteId`，星标恢复可用；
- **P0-8 不可达 mode**：mode 收敛为 `article | moment | letter`，删除 `inspiration`/`schedule`/`todo` 死路径及 `EditorState` 的 `date`/`time`/`category`；
- **P0-9 编辑器状态被重置**：稳定空数组常量 + 删除同步 effect + `key` 重挂载，杜绝输入被清空；
- **死代码清理**：开启 `noUnusedLocals`/`noUnusedParameters`（清掉 17 处）；删除 `throttle`/`isSameDay`、6 个死 CSS 类、5 个死 props、10 个未使用的 `useXxx` 选择器、`removeToast`/`updateEditor`、`scopedState` 的 `export`；**移除 `useAppStore` 内 38 处多余的 `set(... as any)`**（此前每个 action 都跳过类型检查）；
- **验证**：`tsc -b --noEmit` 与 `vite build` 通过；`formatDate` 8 种格式回归全通过；**并用无头 Chrome 实际渲染了构建产物**，确认时钟/宫格/月历/日程/音景/底部 Tab 全部正常渲染、无错误覆盖层、且背景已渲染为「夜半」预设渐变。

### [v3.0-cleanup] - 2026-09-11 —— 按审计结果执行清理与低风险修复
- **删除** `archive/v2/docs/preview-desktop.png` + `preview-mobile.png`（回收 2.53 MB，archive 目录 2.9 MB → 384 KB；v2 全部代码与资源保留，git 历史可随时恢复）；
- **删除** 构建产物 `dist/` + `tsconfig.tsbuildinfo`（回收 ~1.3 MB；`npm run build` 可完整重建）；
- **修复 P0-6**：`utils.ts` 的 `formatDate` 改为 token 正则替换，支持 `M`/`D`，并修掉只替换第一处的隐患 → 文章/信件阅读页不再显示「2026 年 M 月 D 日」；
- **修复 P0-7**：`ScheduleView.tsx` 过去日程改为遍历全部 `pastDates`，并接通编辑态（原先只显示最早一天且编辑按钮为死按钮）；
- **修复 P1-19**：`TodoView.tsx` 统计与列表共用同一分类范围（原先列表空却显示「0 / 5 项待办」）；
- **修复 P1-20**：`MailboxPage.tsx` 摘要改用 `excerpt(plainText(...))`（原先露出 `#`/`**` 原文），并合并重复导入；
- **验证**：`tsc -b --noEmit` 与 `vite build` 均通过；`formatDate` 以 8 种现有格式回归测试全通过。

### [v3.0-audit] - 2026-09-11 —— 全量代码审计（未改动任何功能代码）
- 逐文件通读 `src/` 全部 45 个文件（44 个 `.ts/.tsx` + `globals.css`）+ 全部配置与文档，确认 P0 缺陷 9 项、P1 12 项、P2 8 项，另附重构候选与横切问题（详见上文「代码审计结果」）；
- 修正文档过时信息：存放路径 `.../DeepSeek Harness/VidaOS`（原写作 `/Users/amarisgo/Documents/VidaOS`）、README「9 个路由页面」→ 11、结构树补 `docs/` `package-lock.json` `.gitignore`；
- `.gitignore` 补 `*.tsbuildinfo`（此前 `tsc -b` 产物未被忽略）；
- 验证 `tsc -b --noEmit` 与 `vite build` 均通过；
- 资产盘点：`dist/`（1.3 MB）可再生、`docs/` 5 张 v3 截图（447 KB）为孤儿、`archive/v2/docs/` 2 张截图（2.53 MB，占归档 88%）无引用；`node_modules` 含 5 个 extraneous 包（sharp 全家桶 ≈19 MB）。

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
- **最后更新日期**：2026-09-11（全量审计）
