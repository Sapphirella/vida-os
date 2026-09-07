# VidaOS - 项目记忆与交接文档

> 本文档专门用于记录项目迭代历史、关键设计决策和技术上下文，便于其他 Agent 接力开发或维护。

---

## 项目基本信息

| 字段 | 值 |
|------|-----|
| **项目名称** | VidaOS |
| **项目类型** | 前端单页应用（SPA）—— 个人博客系统 |
| **当前版本** | v1.0 |
| **创建日期** | 2026-09-07 |
| **创建 Agent** | DuMate |
| **存放路径** | `/Users/amarisgo/Documents/VidaOS` |
| **Git 仓库** | 已初始化，使用 `master` 分支 |

---

## 设计哲学

### 核心定位
VidaOS 不是社交网络，而是**私密的个人生活记录空间**。所有数据本地存储，不上传服务器。

### 视觉风格
- **iOS Liquid Glass（液态玻璃）**：通过 `backdrop-filter: blur()` + 半透明背景 + 细边框 + 柔和阴影 实现通透质感
- **配色方案**：浅色纯净基调，蓝色（#007AFF）作为强调色
- **字体栈**：`-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Inter', 'PingFang SC'` 等系统字体优先
- **圆角策略**：大圆角（18-32px），营造友好柔和的触感
- **动效**：`cubic-bezier(0.4, 0, 0.2, 1)` 标准缓动，过渡时长 0.35s

### 交互设计
- 移动端优先：底部悬浮导航 + 侧边抽屉菜单
- 桌面端适配：最大宽度 680px 居中，底部导航居中悬浮
- 模态弹窗从底部滑入（移动端）/ 居中显示（桌面端）

---

## 文件结构与职责

```
VidaOS/
├── index.html          # 唯一入口，包含全部 HTML 结构
│   ├── 状态栏（固定顶部）
│   ├── 应用头部（固定，含菜单/标题/水滴按钮）
│   ├── 侧边菜单（抽屉式导航）
│   ├── 主内容区（5个视图：home/timeline/tags/gallery/settings）
│   ├── 底部导航（悬浮胶囊式）
│   ├── 编辑弹窗（Markdown编辑/图片上传/标签/类型选择）
│   ├── 文章详情弹窗
│   ├── 导入弹窗（拖拽区域）
│   ├── 确认弹窗
│   └── Toast 提示
├── css/
│   └── style.css       # 全部样式（约 800 行）
│       ├── CSS 变量（玻璃材质、配色、圆角、动效）
│       ├── 组件样式（卡片、按钮、输入框、弹窗）
│       ├── 视图样式（时间线、标签云、图集网格、设置项）
│       └── 响应式断点（768px 桌面 / 400px 小屏）
├── js/
│   └── app.js          # 全部逻辑（约 1000 行）
│       ├── AppState（全局状态对象）
│       ├── Storage（localStorage 封装）
│       ├── PostManager（文章 CRUD + 查询）
│       ├── DataIO（导入/导出，支持 JSON/TXT/MD/PDF）
│       ├── UI（渲染函数）
│       ├── Modal 控制函数
│       └── Event Handlers + Initialization
├── README.md           # 用户文档（产品说明+安装教程）
└── PROJECT_MEMORY.md   # 本文件（Agent 交接用）
```

---

## 关键设计决策

### 1. 单文件架构
**决策**：HTML、CSS、JS 分离为 3 个文件，但 JS 逻辑全部集中在一个 `app.js` 中。

**理由**：
- 项目规模可控（< 2000 行），单文件逻辑清晰
- 无构建工具，直接浏览器运行，简单可靠
- 便于 Agent 接力：只需关注一个 JS 文件

**风险**：如果功能继续扩展，需要拆分为模块。

### 2. localStorage 而非 IndexedDB
**决策**：使用 `localStorage` 存储所有数据（JSON 序列化）。

**理由**：
- 实现简单，无需复杂的数据库操作
- 对纯文本和小图片（Base64）足够
- 导入导出天然就是 JSON 格式

**风险**：
- 存储上限约 5-10MB（取决于浏览器）
- 大量高清照片会溢出
- **改进方向**：未来应迁移到 IndexedDB + 图片 Blob 存储

### 3. 图片 Base64 编码
**决策**：图片通过 `FileReader.readAsDataURL()` 转为 Base64，随文章数据一起存储。

**理由**：
- 完全离线可用，不依赖外部 URL
- 导入导出时图片随数据一起迁移

**风险**：
- Base64 编码后体积增加约 33%
- 大图片会快速耗尽 localStorage 配额
- **改进方向**：未来可使用 IndexedDB 存储 Blob，仅在导出时转为 Base64

### 4. 前端生成 PDF
**决策**：使用 `html2pdf.js` 库在浏览器端生成 PDF。

**理由**：
- 无需后端服务
- 保持纯前端架构

**风险**：
- 依赖 CDN，离线时不可用（除非本地缓存）
- 中文渲染依赖系统字体

### 5. 不使用框架
**决策**：纯原生 HTML/CSS/JS，不引入 Vue / React / Angular 等框架。

**理由**：
- 减少依赖，直接浏览器运行
- 避免构建步骤
- 液态玻璃效果用 CSS 原生实现更可控

---

## 数据模型

```javascript
// 文章（Post）结构
{
    id: string,           // 唯一标识符（时间戳+随机数）
    title: string,        // 标题（可选）
    content: string,      // 正文（支持 Markdown 语法）
    type: string,         // 类型：'diary' | 'photo' | 'rant'
    images: string[],     // 图片数组（Base64 DataURL）
    tags: string[],       // 标签数组
    createdAt: string,    // ISO 8601 时间戳
    updatedAt: string,    // ISO 8601 时间戳
}

// localStorage 存储格式
{
    posts: Post[]         // 文章数组（按时间倒序）
}

// 导出 JSON 格式
{
    posts: Post[],
    exportDate: string    // 导出时间戳
}
```

---

## 导入导出规格

### 导出格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| JSON | `.json` | 完整数据，包含图片 Base64，可直接重新导入 |
| TXT | `.txt` | 纯文本合集，适合阅读，不可重新导入 |
| Markdown | `.md` | Markdown 格式，适合迁移到其他平台 |
| PDF | `.pdf` | 精美排版文档，适合打印或分享 |

### 导入格式

| 格式 | 扩展名 | 说明 |
|------|--------|------|
| JSON | `.json` | 完整恢复，合并到现有数据 |
| TXT | `.txt` | 解析并创建新文章（解析规则见 DataIO.parseTXT） |
| Markdown | `.md` / `.markdown` | 解析并创建新文章（解析规则见 DataIO.parseMarkdown） |

**导入行为**：合并模式（非覆盖）。新导入的文章追加到现有文章列表前面。

---

## 已实现功能清单

### v1.0 (2026-09-07) — 初始版本
- [x] iOS 液态玻璃风格 UI
- [x] 文章创建、编辑、删除
- [x] 三种内容类型：日记 / 照片 / 吐槽
- [x] Markdown 编辑与实时预览
- [x] 图片上传（点击/拖拽）与预览
- [x] 标签管理（空格/回车分隔）
- [x] 文章列表（最近记录）
- [x] 时间线视图
- [x] 标签云视图（可点击筛选）
- [x] 图集网格视图
- [x] 数据统计（文章/照片/标签/天数）
- [x] 导出 JSON / TXT / Markdown / PDF
- [x] 导入 JSON / TXT / Markdown
- [x] 数据清空（带确认）
- [x] 演示数据（3条示例记录）
- [x] 响应式适配（桌面/平板/手机）
- [x] 实时时钟与日期显示
- [x] 本地数据持久化

---

## 已知问题与 TODO

### 高优先级
- [ ] **存储容量限制**：当前 localStorage 限制约 5-10MB，高清图片容易溢出
  - 方案：迁移到 IndexedDB，图片存为 Blob 而非 Base64
  - 影响范围：`Storage` 模块、`PostManager` 图片处理逻辑

### 中优先级
- [ ] **全文搜索**：当前无搜索功能
  - 方案：在标题、内容、标签中做字符串匹配
  - 建议位置：顶部 Header 添加搜索输入框

- [ ] **文章收藏/星标**：无法标记重要文章
  - 方案：在 Post 模型中添加 `starred: boolean` 字段

- [ ] **批量操作**：无法批量删除或批量导出
  - 方案：文章列表添加多选复选框

### 低优先级
- [ ] **PWA 支持**：添加 Service Worker 和 manifest.json
- [ ] **自定义主题**：支持切换强调色
- [ ] **文章加密**：敏感内容加密存储
- [ ] **静态站点导出**：生成纯 HTML 静态文件
- [ ] **多设备同步**：通过文件导出/导入手动同步
- [ ] **深色模式**：当前仅浅色主题

---

## 技术债务

| 问题 | 位置 | 影响 | 建议修复 |
|------|------|------|----------|
| 全局状态对象 `AppState` 无封装 | `app.js` | 状态变更不可追踪 | 引入简单的状态订阅模式 |
| 图片预览 DOM 操作直接拼接 HTML | `UI.createPostCard()` | XSS 风险低但存在 | 已使用 `escapeHtml`，可改用 createElement |
| Markdown 解析不够精确 | `app.js` | 复杂 Markdown 可能渲染异常 | 已引入 `marked.js`，但解析逻辑可更完善 |
| 无错误边界 | 全局 | 异常可能导致应用崩溃 | 添加 try-catch 包装关键操作 |
| 时间线点击逻辑较脆弱 | `UI.renderTimeline()` | DOM 索引映射可能出错 | 改为在 timeline-item 上直接存储 post ID |

---

## 依赖清单

### CDN 依赖（运行时从网络加载）

| 库 | 版本 | 用途 | CDN 地址 |
|----|------|------|----------|
| Inter 字体 | 最新 | 西文字体 | Google Fonts |
| marked | 12.0.0 | Markdown 渲染 | cdnjs |
| html2pdf.js | 0.10.1 | PDF 导出 | cdnjs |
| DOMPurify | 3.0.8 | HTML 安全过滤 | cdnjs |

### 本地文件

| 文件 | 说明 |
|------|------|
| `index.html` | 入口，内联 SVG 图标（Feather Icons 风格） |
| `css/style.css` | 无外部 CSS 依赖 |
| `js/app.js` | 无外部 JS 依赖（除 CDN 库） |

---

## Agent 接力指南

### 快速上手

1. **读取当前状态**：
   ```javascript
   // 在浏览器控制台执行
   JSON.parse(localStorage.getItem('vidaos_data'))
   ```

2. **理解架构**：
   - 这是一个 **纯前端 SPA**，无后端
   - 所有逻辑在 `js/app.js` 中，按模块组织
   - CSS 全部在 `css/style.css` 中，按组件组织

3. **修改建议**：
   - 添加新功能：在 `app.js` 中新增模块，在 HTML 中添加对应 DOM
   - 修改样式：在 `style.css` 中新增/修改 CSS 变量或类
   - 修改数据模型：同步更新 `PostManager`、`Storage`、`DataIO` 三个模块

4. **测试方式**：
   - 直接浏览器打开 `index.html`
   - 或运行本地服务器：`python -m http.server 8080`

5. **Git 提交**：
   ```bash
   cd /Users/amarisgo/Documents/VidaOS
   git add .
   git commit -m "feat: 描述你的修改"
   ```

### 常见修改场景

**场景 A：添加新内容类型**
1. 在 `postType` radio 中添加新选项（HTML）
2. 在 `typeLabels` 和 `typeColors` 中添加映射（JS）
3. 在 CSS 中添加对应 badge 颜色

**场景 B：更换存储方案到 IndexedDB**
1. 重写 `Storage` 模块，使用 `indexedDB.open()`
2. 重写图片处理，使用 Blob + URL.createObjectURL()
3. 更新导入导出逻辑处理 Blob 类型
4. 注意：此改动较大，建议先导出备份再修改

**场景 C：添加搜索功能**
1. 在 Header 添加搜索输入框（HTML）
2. 添加搜索函数，遍历 `AppState.posts` 做字符串匹配
3. 将搜索结果渲染到 `postsList`

---

## 变更日志（Changelog）

### [v1.0] - 2026-09-07
**初始版本发布**

- 采用 iOS 液态玻璃风格设计
- 实现文章 CRUD、Markdown 编辑、图片上传、标签管理
- 实现时间线、标签云、图集三种浏览视图
- 实现 JSON / TXT / Markdown / PDF 导入导出
- 使用 localStorage 本地持久化
- 响应式适配桌面端与移动端
- 包含演示数据

---

## 联系方式与归属

- **项目归属**：用户个人项目
- **开发路径**：`/Users/amarisgo/Documents/VidaOS`
- **最后更新 Agent**：DuMate
- **最后更新日期**：2026-09-07

---

> **给下一个 Agent 的话**：VidaOS 是一个小而美的项目，架构简单清晰。任何改动请保持 iOS 液态玻璃的视觉一致性，保持纯前端无后端的架构，保持用户数据的私密性。感谢接力！
