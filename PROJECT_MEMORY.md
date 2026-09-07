# VidaOS - 项目记忆与交接文档

> 本文档记录项目迭代历史、关键设计决策与技术上下文，便于后续 Agent 接力维护。

---

## 项目基本信息

| 字段 | 值 |
|------|-----|
| **项目名称** | VidaOS |
| **项目类型** | 纯前端单页应用（SPA）—— 个人博客 / 生活记录系统 |
| **当前版本** | v2.0（整体重写） |
| **创建日期** | 2026-09-07（v1.0 由 DuMate 创建） |
| **重写日期** | 2026-09-08（v2.0） |
| **存放路径** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS` |
| **Git 仓库** | 已初始化，`master` 分支 |

> **历史**：v1.0 由上一任 Agent（DuMate）实现，但其视觉（`#007AFF` 鲜艳蓝 + `--glass-border` 实线边框 + 时间线/标签云/图集视图）**违背了用户「液态玻璃、无边框、低饱和、桌面/便签/数据/设置四 Tab」的原始需求**。v2.0 由本任 Agent 整体重写，推倒重来，只保留 git 历史与 PROJECT_MEMORY 的交接精神。

---

## 设计哲学（v2.0 确立，勿改）

### 核心定位
VidaOS 不是社交网络，是**私密的个人生活记录空间**。数据全部本地存储，不上传服务器。

### 视觉风格 —— iOS Liquid Glass（液态玻璃）
- **无实线边框**：组件靠内外柔和阴影 + 留白区分，禁止任何硬边框；
- **半透磨砂**：`background: rgba(255,255,255,0.55~0.72)` + `backdrop-filter: blur(20px) saturate(160%)`；
- **大圆角**：卡片 28–34px、按钮胶囊形；
- **柔和弥散阴影**：外侧浮起投影 + 内侧 `inset` 高光；
- **低饱和灰蓝配色**：正文 `#33455F`、次要 `#6B80A0`、强调雾霾蓝 `#6E93B8`；
- **浮雕大数字**：首页大时钟用 `text-shadow` 浮雕，无厚重描边；
- **背景**：极浅冷灰白 → 淡雾蓝渐变 + 柔和光斑（给磨砂玻璃提供可模糊的层次）。

> 所有颜色/圆角/阴影集中在 `css/style.css` 顶部的 `:root` CSS 变量里，组件复用变量，禁止写死数值。

---

## 文件结构与职责

```
VidaOS/
├── index.html            # 应用骨架（topbar/content 10 个 view/tabbar/editor/modal/toast）
├── css/style.css         # Liquid Glass 设计系统 + 全部组件样式 + 响应式
├── js/
│   ├── app.js            # 应用逻辑（IIFE）：路由、首页、日历、音乐、便签、
│   │                     #   空间/动态/信箱/收藏夹、编辑器、导入导出、PWA 注册
│   ├── store.js          # VidaStore：IndexedDB（state + files 两 store）+ localStorage 回退
│   ├── icons.js          # Icons.svg(name, cls)：细线线性图标库（feather 风，stroke 1.7）
│   └── vendor/           # 本地化依赖：marked.min.js / purify.min.js（UMD 全局）
├── manifest.webmanifest  # PWA 清单
├── sw.js                 # Service Worker（缓存优先，整包换版本）
├── assets/               # 图标（icon.svg / icon-192/512.png / apple-touch-icon.png）
├── docs/                 # 预览截图（preview-desktop.png / preview-mobile.png）
├── README.md             # 用户文档（含 Sui-IB 致谢与借鉴程度说明）
└── PROJECT_MEMORY.md     # 本文件
```

---

## 关键设计决策

### 1. 纯前端、无构建、无框架
- 原生 HTML/CSS/JS，无 Vue/React，无构建步骤，直接打开或静态托管即可运行；
- 依赖本地化（marked / DOMPurify 已下载到 `js/vendor/`），**不依赖 CDN**，离线可用；
- 脚本用普通 `<script>` 顺序加载（全局命名空间），**不用 ES Module**，保证 `file://` 直接打开可用。

### 2. IndexedDB 存媒体，而非 localStorage
- `state` store 存 JSON 文本，`files` store 存图片/音频 **Blob**；
- 解决旧版 Base64 塞进 localStorage 的 5–10MB 配额瓶颈；
- `VidaStore` 提供 `getFile/putFile/delFile`，并带 **localStorage 回退**（Blob 转 dataURL），保证 IndexedDB 不可用时仍能工作。

### 3. 图片压缩
- 上传 >2MB 的图片用 canvas 缩到最长边 1600、质量 0.82，再存 Blob；
- 导出 JSON 备份时，Blob 转 Base64 内嵌到 `data.files`，可完整还原。

### 4. PDF 用打印方案
- 不引入 html2pdf.js（依赖重、中文易出问题）；
- 导出 PDF 时把内容渲染进隐藏 `iframe.srcdoc`（内联打印 CSS），`contentWindow.print()`，排版美观、零依赖。

### 5. 音乐内置 WebAudio 音景
- 内置「雨声·白噪音」轨道（`builtin: true`），用 WebAudio 生成白噪声 + 低通滤波，无需音频文件即可体验播放器；
- 导入的本地音频走 `<audio>` + Blob objectURL。

### 6. 路由
- 底部 4 Tab：`desk/notes/data/settings`（`switchTab`，清空栈）；
- 子视图：`space/collection/article/moments/mailbox/favorites`（`push` 入栈，`goBack` 出栈）；
- `VIEW_META` 定义每个视图的顶栏标题/副标题；顶栏返回键在 `stack.length > 0` 时显示。

---

## 数据模型（v2.0）

`VidaStore.defaultState()` 返回完整初始状态，结构如下：

```javascript
{
  version: 2,
  profile: { name, signature, avatar /*fileId*/, background /*preset key 或 fileId*/ },
  collections: [ { id, name, desc, cover, createdAt } ],
  articles:    [ { id, title, content/*markdown*/, cover, collectionId, tags[], images[], createdAt, updatedAt } ],
  moments:     [ { id, content, images[], createdAt } ],
  letters:     [ { id, title, content, images[], createdAt, unread } ],
  favorites:   [ { id, refType/*article|moment|letter*/, refId, createdAt } ],
  notes: {
    inspiration: [ { id, content, category, createdAt } ],
    schedule:    [ { id, title, note, date, time, category, done, createdAt } ],
    todo:        [ { id, content, category, done, createdAt, completedAt } ],
  },
  categories: { inspiration: [], schedule: [], todo: [] },   // string[]
  tracks:     [ { id, title, artist, fileId, builtin, createdAt } ],
  settings:   { lastTab },
}
```

- 图片/音频一律以 `fileId` 引用，运行时经 `fileURL(id)` 转 objectURL（带缓存 `urlCache`）；
- 收藏用 `favorites` 引用表（`refType` + `refId`），删除原文时同步清理收藏与文件。

---

## 已实现功能清单（v2.0）

- [x] iOS 液态玻璃设计系统（无边框、磨砂、弥散阴影、低饱和、浮雕大数字）
- [x] 首页：大时间日期 Hero + 4 功能网格（空间/动态/信箱/收藏夹）+ 双卡式月历 + 音乐播放器 + 底部 Tab
- [x] 日历：月历、事项日打点、点日期显示当日日程、日程增删改与完成态
- [x] 音乐：内置雨声白噪音 + 本地音频导入、播放/切歌/进度/音量
- [x] 便签：灵感 / 日程 / 待办 三分区滑块 + 分类筛选/管理 + 增删改
- [x] 空间：Markdown 长文 + 合集分组 + 标签 + 封面 + 带图
- [x] 动态：短内容 + 多图
- [x] 信箱：信件 + 照片 + 未读火漆
- [x] 收藏夹：跨类型收藏
- [x] 全屏 Markdown 编辑器（工具栏 / 预览 / 图片 / 字数统计）
- [x] 导出 JSON / TXT / Markdown / PDF，可选备份范围
- [x] 导入 JSON（合并/覆盖）/ Markdown / TXT
- [x] 设置：头像 / 背景（预设+自定义）/ 签名 / 昵称
- [x] PWA（manifest + Service Worker + 安装提示）
- [x] 桌面/移动双端响应式（桌面看板分栏 + 底部 Dock）
- [x] 本地数据持久化（IndexedDB + 回退）

---

## 已知问题与 TODO

### 中优先级
- [ ] **全文搜索**：暂无；可在各列表顶部加搜索输入，遍历标题/内容/标签匹配。
- [ ] **音频封面提取**：当前导入的音乐不提取内嵌封面，统一显示唱片图标；可引入 music-metadata 提取。
- [ ] **批量操作**：暂不支持批量删除 / 批量导出。
- [ ] **文章内嵌图片**：目前图片以「附件画廊」形式展示，Markdown 内联 `![](url)` 仅支持外链；如需本地内嵌可扩展 `fileRef:` 语法。
- [ ] **深色模式**：当前仅浅色主题。

### 低优先级
- [ ] 文章加密存储
- [ ] 静态站点导出（生成纯 HTML）
- [ ] 自定义主题色

---

## 依赖清单

全部本地化，无运行时 CDN 依赖：

| 文件 | 版本 | 用途 |
|------|------|------|
| `js/vendor/marked.min.js` | 12.0.2 | Markdown 渲染（UMD 全局 `marked`） |
| `js/vendor/purify.min.js` | 3.0.8 | HTML 安全净化（UMD 全局 `DOMPurify`） |

---

## Agent 接力指南

### 快速上手
1. 数据：浏览器 DevTools → Application → IndexedDB → `vidaos` → `state` store → key `root`；
2. 架构：单 IIFE `app.js`，`RENDERERS` 对象按视图分发渲染，`document` 级事件委托处理所有 `data-action` 点击；
3. 新增视图：`index.html` 加 `<section class="view" id="view-x">` → `VIEW_META` 加标题 → `RENDERERS` 加渲染函数 → 路由 `push('x', params)`。

### 测试方式
- 直接 `python3 -m http.server` + 浏览器打开；
- 无头回归脚本（临时，未入库）见 `/tmp/vidaos-*.mjs`：用 CDP 驱动 Chrome 遍历视图、增删改、抓异常。

### 常见修改场景
- **改配色/圆角/阴影**：只改 `css/style.css` 顶部 `:root` 变量；
- **改数据模型**：同步改 `store.js` 的 `defaultState()`、`app.js` 的读写逻辑、导出 `scopedState()`；
- **改备份范围**：改 `SCOPES` 数组与 `scopedState()`。

### Git 提交
```bash
cd "/Users/amarisgo/Documents/DeepSeek Harness/VidaOS"
git add -A && git commit -m "feat: ..."
```

---

## 变更日志（Changelog）

### [v2.0] - 2026-09-08 —— 整体重写
- 推倒 v1.0 的 UI 与信息架构，严格落地「液态玻璃」规范（去边框、低饱和、弥散阴影、浮雕大数字）；
- 按需求重构为「桌面 / 便签 / 数据 / 设置」四 Tab + 「空间 / 动态 / 信箱 / 收藏夹」功能网格；
- 新增双卡式月历（事项打点 + 当日日程）、音乐播放器（内置雨声音景 + 本地音频）、三分区便签（灵感/日程/待办 + 分类）；
- 存储从 localStorage+Base64 迁移到 IndexedDB+Blob；
- 新增 PWA（manifest + SW）；本地化 vendor 依赖，彻底离线；
- 桌面端「像桌面」看板布局，移动端「像手机」竖向流；
- README 如实署名 Sui-IB 并说明借鉴程度。

### [v1.0] - 2026-09-07（已被 v2.0 取代）
- DuMate 初版：文章 CRUD、Markdown、图片 Base64、时间线/标签/图集、JSON/TXT/MD/PDF 导入导出。

---

## 归属与致谢

- **项目归属**：用户个人项目
- **设计借鉴**：[Sui-IB / InternalBeyond-Mobile](https://github.com/Sui-IB/InternalBeyond-Mobile)（概念与布局灵感，代码零拷贝，详见 README「致谢与借鉴说明」）
- **最后更新 Agent**：（v2.0 重写）
- **最后更新日期**：2026-09-08
