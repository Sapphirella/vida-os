# VidaOS - 项目记忆与交接文档

> 项目迭代历史、关键设计决策、架构约定与踩坑记录。**接手前请先读完第 0、1、3 节。**
> 最后更新：2026-10-04（**v4.7.6 = 空间新增「标签」栏目 + 修随机播放「放完就停」**：
> ① 合集与文章之间插入标签栏目（点标签筛选文章 / 双击改名 / × 删除，列表完全由文章派生）；
> ② 移动端随机播放放完一首就停住 —— 两处病根：每首 `new Audio()` 被自动播放策略拦下、
> 以及遇到「文件取不到」的歌直接 `return` 造成静默假死。见第 2、4(12/29)、7、8.1、12(35)、13 节。
>
> v4.7.5 = 收藏夹定位 + 类型标注 + 猩红 Agent 配色**，
> 并在验证过程中挖出并修掉一个**会崩整页的真 bug**：Agent 的 `[[写:动态]]` / `[[写:文章]]`
> 产生的记录缺 `imageIds`，让动态页整页走错误边界、导出/备份也会抛错。
> 见第 2、4(19/28)、8.1、8.3、12(34)、13 节。
>
> v4.7.4：上一版把「猩红 Agent 输入框底色」错改成了面板级变量，
> 结果卡片/会话面板一起变深色 —— 已收窄到**只改输入框**（`--field-bg` + 新增的
> `--agent-composer-bg`），并按用户新色值改为 `#1f131d`。见第 2、4(19)、12(33)、13 节。
>
> v4.7.3 = 六处小修：① 「播完暂停」改成「播完本首就停」
> （原来只在最后一首才停）② 便签默认落在碎片 ③ 一处提示文案 ④ 猩红书房下 Agent 输入框/面板
> 底色改 `#181419` ⑤ 日程与动态的时间选择也改用应用内弹窗 ⑥ 手机端打字时底栏/加号不再被顶到键盘上方
> （键盘检测与隐藏方式都重做了）。见第 2、4(12/17/27)、12(32)、13 节。
>
> v4.7.2 = 碎片页再修三处：① 猩红书房的卡片在触屏上「点击时跳来跳去」
> （`:active` 的 scale 形变去掉了）② 补记输入区重排（手机上确认键被顶出屏幕）+ 时间改用
> 应用内弹窗（原生 `type=time` 的系统弹窗样式不可控）③ 年月选择改成应用内弹窗，
> **带取消键、不占满屏**（原生 `<select>` 在手机上会拉全屏且没有取消）。
> 顺带把「选中态」抽成 `.vd-selected` 一个类 + 两个变量。见第 2、4(27)、12(31)、13 节。
>
> v4.7.1 = 碎片页四处体验修复：① 日间主题下日历选中日对比度过低
> （漏了 `.cal-selected`）② 主页与碎片的日历都支持**直接选年 / 月**（抽出共用的 `CalendarNav`）
> ③ 移动端便签分页「碎片/灵感/日程/待办」被挤成竖排 ④ 补记时可**指定具体时刻**。
> 见第 2、4(27)、12(30)、13 节。
>
> v4.7 = 便签新增「碎片」分页：日历（点日期跳转）+ 当天极简时间轴 +
> 加号即时记录（自动时间戳、按天储存）；便签导航变为「碎片 / 灵感 / 日程 / 待办」；
> 碎片同时接入 Markdown / PDF(HTML) 导出与快照计数。样式参考用户提供的
> 《碎片时间线参考图片.jpg》（该图已加入 .gitignore，属参考素材不入库）。
> v4.6.3 = 长文分批挂载 + parseBook 缓存 + 导入建议值放宽：
> ① 阅读器改成「先出首屏、其余在空闲帧补齐」，并把 `parseBook` 加小 LRU 缓存；
> 23 万字书在 6× CPU 降速下「首屏可见」从 5.6 秒降到 **49ms**（书架点进书，缓存热）/
> 约 2.1 秒（整页刷新，缓存冷），全部 4840 块从 5.6 秒降到 3.1 秒；② 导入建议值 1 万字 → 5 万字
> （原值比实测能力保守一个数量级）。另新增教训 28（分批挂载的三个坑）。见第 2、4、8、12、13 节。
>
> v4.6.2 = 相册孤儿图回收 + 书内标注重锚定 + 长文性能实测：
> ① 相册编辑器取消/移除图片会留下孤儿 blob；② Agent 改书正文不再清空全书划线，改为逐条重锚定
> （对得上原文就留、对不上才丢，并写明是哪几句）；③ 20 万字级长文做了真实性能测量，
> 第 8.1 节原来「建议 ≤1 万字」的说法与实测不符，已按数据改写。
> v4.6.1 = 目录章节索引位移 + `collectFileIds` 漏收音乐（清除缓存误删音频）。
> 均已并入第 0、2、4、8、11、12、13 节相关位置。
> v4.6 本体 = 音乐四种播放模式 / 馆藏章节解析与目录页 / Agent 专属书《Agent》/ Agent 写书工具 /
> 标记格式防御 / 设置页文档重写，见第 2、4、7、8、13 节）。

**关于版本号的约定**：本纪元 v4.x.y 是项目迭代的内部版本号，记录在本文档里。
`package.json` 的 npm 版本仍锁在 **4.4.1**（沿袭旧惯例，由用户在每次正式发版时手动 bump），
不要替用户改 `package.json`。

---

## 0. 一页速览（接手先看这里）

| 项目 | 说明 |
|---|---|
| **是什么** | 纯前端、纯本地的个人生活记录 PWA（主页/便签/文章/动态/收藏/音乐/云备份/**馆藏（书架+相册）**/Agent） |
| **在哪里** | `/Users/amarisgo/Documents/DeepSeek Harness/VidaOS`（**父目录含空格，命令里要带引号**） |
| **怎么跑** | 双击 `打开VidaOS.command`；或 `npm run dev` → http://localhost:5173 |
| **怎么构建** | `npm run build`（= `tsc -b && vite build`）→ `dist/`（**已 gitignore，别提交**） |
| **怎么自检** | `npm run typecheck`（已开启 `noUnusedLocals`/`noUnusedParameters`，编译即闸门） |
 | **当前版本** | 本纪元迭代到 **v4.7.6**（2026-10-04）；`package.json` 仍写 v4.4.1（沿用旧约定，由用户发版时手动 bump） |
| **技术栈** | Vite 5 + React 18 + TS + Tailwind 3 + Zustand + Dexie 4 + PWA + Web Crypto |
| **数据在** | 浏览器 IndexedDB（库名 `vidaos`，表 `state` / `files` / `meta`，Dexie **version 2**）；**无后端、无账号** |
| **主题** | 暗夜书房（默认）/ 白昼书房 / 猩红书房（独立主题）；`localStorage['vidaos-theme']` |
| **底栏** | 主页 / **便签** / Agent / 数据 / 设置（v4.4：便签顶替了原「碎片」那格） |
| **便签分页** | **碎片 / 灵感 / 日程 / 待办**（v4.7：碎片以「日历 + 当天时间轴」的新形态回到便签） |
| **主页宫格** | 空间 / 动态 / **馆藏** / 收藏夹（v4.4：便签那格改成馆藏） |
| **云同步** | WebDAV（坚果云等）：云端存**明文 JSON**（vidaos-backup.json），全量覆盖 = 删除同步，
可选端到端加密（加密时云端只存密文，兼容旧 .json.gz 备份）；**注意纯浏览器直连坚果云被 CORS 拦截**（见第 8 节） |

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
- **v4.5（2026-09-30）** —— **馆藏·相册上线**（详见第 4 节之 22) 与第 13 节）：
  ① 数据模型三件套 `Album`（图集）/ `AlbumGroup`（图片组）/ `AlbumStar`（星标），
  `normalizeState` 兜底保证**星标集**永远存在（预置、置顶、不可改名删除）；
  ② 相册页：图集列表按**最近阅读**（updatedAt）排序、星标集置顶；图集详情时间轴参考【动态】页；
  上传 / 编辑一组照片（≤30 张、可**无图纯文字发布**、**更新不改发布时间**）；
  ③ **星标集**：按「文章 / 动态 / 灵感 / 相册」四个固定标签分类，图片带**双链**可跳回原文；
  文章 / 动态 / 灵感里的图片点开大图后都可存入星标集（相册的图也可单独星标）；
  ④ 7 项交互修复（输入框打字即时显现 / 上传分批并行提速 / 移动端长按拖拽用 div 背景图
  避开 `<img>` 系统长按菜单 / 精简说明文案 / 馆藏顶栏统一 + 英文改 Collections / 切换按钮加大）。
- **v4.5.1（2026-09-30 ~ 10-01）** —— **相册交互完善 + Agent 数据读取 + 备份导出升级**：
  ① 相册编辑器：删除键移入 tile 内（原被 overflow-hidden 裁掉）、**桌面拖拽弃用 HTML5 DnD**
  改 mousedown 按下即拖（窗口级监听、拖拽结束抑制 click 防误开预览）、触屏长按 300ms；
  ② **Agent 输入框图片按钮**：选图压缩入库 → 停在**待发队列**（可逐张移除 / 点击预览）→
  随文字一同发送（≤9 张，`![图片](fileRef:id)` 标记，不支持视觉的模型自动略过）；
  ③ **Agent 能读应用数据**：`lifeIndexText()` 把文章/动态/灵感/便签/日程/待办/收藏夹/相册
  索引随 system 下发，`resolveModule()` + `resolveDoc()` 支持 `[[读:模块]]` 与 `[[读:文章·标题]]`；
  ④ **导出范围新增** 馆藏·书架 / 馆藏·相册 / Agent 全数据（共 8 项），`scopedState` 真正按范围
  过滤（未选范围实体不再带出、Agent 范围剥 apiKey）；**修复合并导入丢标签**：categories 四桶
  union 合并、albums/albumGroups/albumStars 补 mergeById；
  ⑤ **WebDAV 存明文 JSON**（vidaos-backup.json，未加密不 gzip），全量覆盖 = **删除同步**，
  下载兼容旧 .json.gz（gzip 魔数 / VDOS1 密文 / 明文三态自动识别）；
  ⑥ 设置页使用说明补齐相册 / 星标集 / Agent 读模块 / 导出范围 / WebDAV JSON；
  ⑦ 设置-关于新增**「清除缓存」**（孤儿文件回收，见第 8.1 更新）；关于三按钮统一一行三等宽。
- **v4.6（2026-10-02）** —— **音乐四种播放模式 + 馆藏章节体系 + Agent 专属书《Agent》**
  （详见第 4 节之 23)~25) 与第 13 节）：
  ① **音乐四种播放模式**（`useMusicStore`）：`sequence` / `shuffle` / `repeat-one` /
  `stop-after`，UI 头部按钮点一下循环切换（图标 + 当前模式名直给）。**关键边界**：
  模式只决定**一首自然放完之后**自动怎么办；上一首 / 下一首永远按列表顺序走。
  `onTrackEnded()` 是实现这个边界的单一入口（`audio` 的 `ended` 事件不再各自写 `isPlaying:false`，
  否则四种模式全退化成「播完暂停」）。`stop-after` 进度留 1 让用户能看到「确实放完了」。
  ② **馆藏章节体系**：`BookChapter` 类型 + `LibraryBook.chapters` 字段；导入时由
  `buildChapters()` 自动解析（md 取 1~3 级标题，txt 认「第 X 章/回/节」「Chapter N」
  「序章/楔子/尾声」+ 单行短段兜底）；判定放在切块阶段（`BookBlock.heading`）而不是
  事后回正文搜，md 的围栏代码块里有 `#` 也不会误伤。一个标题都没解析出来时返回一条
  覆盖全书的兜底章节，目录页不会空白。**章节只存 `{from, to, 字数}`，不复制正文**：
  划线锚点是块索引，删正文会让后面所有块整体位移、整本书的标注全部错位 —— 这是
  「删除章节」只能是「从目录撤掉一条」的根本原因（语义写进 `BookChapter` 注释里）。
  ③ **阅读器目录页**（`ReaderPage` 顶栏新增「目录」按钮）：章节列表带序号 + 字数 + 「正在读」
  高亮（由本地 state 驱动，不订阅 store）；点击跳转；每章铅笔重命名、垃圾桶从目录移除
  （弹窗明示「正文保留，划线不受影响」）；底部「在当前阅读位置新建章节」。
  ④ **Agent 专属书《Agent》**（`AGENT_BOOK_ID = 'book-agent'`）：db.ts 双处兜底（与星标集同范式），
  normalizeState 会剥掉来路不明的 `agentBook` 标记以保证全局**有且只有一本**且 id 恒定。
  `deleteBook` 对该 id 直接 return；菜单里不显示「移出书架」入口（UI + store 双层防御）。
  不默认置顶。设置关掉 Agent 开关时**书架自动隐藏**（过滤放在所有列表计算之前，置顶区、
  标签筛选、头部计数都跟着变）；直接敲 URL 进阅读器也会被守卫拦住。
  ⑤ **Agent 写书工具**（`agentTools.writeBookChapter`）：自然语言「把这段存进书里」
  → `[[写:书【章节标题】|正文]]` → **永远追加到书末**新起一章。**为什么是文末追加而不是
  插到中间**：文末追加不改变任何已有块的索引 → 书里已有的划线**一条都不会错位**；
  就地插入/替换正文必然让后面的块整体位移。同名标题自动改成「标题 · 2」（不覆盖旧章节，
  代码层面就没有「覆盖」路径）。标记解析的结束符同时接受全角 `］］`：要写入的 md 正文里
  很容易出现 `](url)` 这种链接，半角 `]]` 会被当成标记结束、把内容拦腰截断。
  ⑥ **标记格式防御**：`scanTools` 增 `brokenKinds` —— 写/替的标记对 `【】` 闭合挑，
  模型偶尔会写错。**错就错在「静默不执行」**：用户以为存进去了，其实什么都没发生。
  所以现在会把没被吃掉的标记捞出来，回一条 sys 消息告诉用户「有 N 处标记格式不对，没有执行」，
  并把指引回灌给模型让它下一轮自己重发（同时 TOOL_CONTRACT 补上「【】必须成对且写在 | 左边」的铁律）。
  ⑦ **查找替换落在书上的诚实处理**：`applyReplace` 的 `book` 分支改成走 `setBookContent`
  并清空该书标注 —— 这是既有的真实缺陷（就地替换正文会让后面的块整体位移，原有划线会
  悄悄指向别的段落）。现在落盘前清空，并在确认卡片 + 结果消息里如实写明。
  ⑧ **设置页使用说明重写**：音乐四种模式、目录拆分规则与修法、《Agent》书的固定与隐藏、
  Agent 段清掉命令式标记语法、按本轮实际功能逐条校准。
  五次提交：`b53f5b4` 音乐 → `6355b6c` 章节解析引擎 + Agent 书兜底 → `66e08a0` 目录页 +
  书架章节展示 → `573e5b3` 写书工具 → `3e34fb6` 标记格式防御 + Agent 书时间显示 → `616bda8` 设置页文档。
- **v4.7.6（2026-10-04）** —— **空间「标签」栏目 + 修随机播放「放完就停」**：
  ① **空间新增标签栏目**（合集与文章之间，`components/space/ArticleTags.tsx` + `SpacePage`）：
  列表 = **所有文章 tags 的并集**（带使用次数，按次数排序）—— 刻意**不做标签注册表**，
  所以不会出现「注册表里有、没有任何文章在用」的幽灵标签（灵感/日程/待办那套分类桶就有这毛病）。
  交互：点标签 → 筛选下面的文章（文章区头部显示 `articles · #标签` + 清除按钮）；
  双击 → 就地改名，**所有用了它的文章一起改**（store 新增 `renameArticleTag`）；
  × → 删除，**从所有文章上摘掉**（`deleteArticleTag`，要过应用内确认，明确告知影响几篇）。
  正在筛选的标签被删/改名/随最后一篇文章消失时**自动退出筛选**，否则会卡在一个不存在的标签上
  （列表空白、也没有入口清掉）。
  ② **移动端随机播放「当前歌放完就自动暂停」**（`useMusicStore`）—— 两个病根叠加：
  - **每首 `new Audio()` 会被移动端自动播放策略拦下**：策略按「元素」放行，已播过的元素换源再
    `play()` 允许，新建元素则要被用户手势触发。原实现每首新建 → 手机上的自动续播最容易失灵。
    现在改成**单例 `<audio>`，换 `src` 复用**（桌面不敏感，所以只在手机上暴露）。
  - **遇到「文件取不到」的歌直接 `return`，状态停在上一次 `release()` 留下的 `isPlaying:false`**
    —— 表现就是「这首放完自动暂停了」，随机播放最明显（随机挑到坏文件就停，看起来像随机模式坏了）。
    坏文件的来源是 v4.6.1 之前「清除缓存」误删音乐（见第 8.3 节）。
    现在续播/上一首/下一首都会**跳过取不到文件的歌**（`firstPlayable`），整轮都放不出来才停，
    并通过 `playError` 交给 UI 弹一次 toast 说明原因；歌单里也会把这类曲目标成「文件缺失」。
  实测：单例元素跨曲目是同一个对象；顺序播放从 A 放完跳到 C（跳过文件缺失的 B）；
  **随机播放 12/12 次都落到可播的那首**（修前约 2/3 会停住不动）；全都放不出来时
  停下并弹出「重新导入一次即可」；歌单显示「B 歌 · 本机音乐 · 文件缺失」。
- **v4.7.5（2026-10-04）** —— **收藏夹体验 + 猩红 Agent 配色 + 一个会崩整页的真 bug**：
  ① **收藏夹点动态定位不到那一条**（第 8.1 节挂了很久的已知项）：动态没有独立页面，
  原来只是 `navigate('/moments')`，于是停在列表顶部。现在带上 `focusRequest`（按 id），
  由动态页的 `useGlobalFocus` 滚到那张卡片；并顺手给「按 id 跳转」加了一圈会呼吸的高亮边
  （`.vd-focus-card`，只描边不染背景 —— 染背景会把整段正文底色换掉）。
  ② **收藏夹每条标注类型**：元信息行加「文章 / 动态」小标签（两种类型在列表里长得像，
  光靠图标不好区分）。灵感不在这里 —— 它用的是自己的「星标」（`starred`），是另一套机制。
  ③ **猩红书房下 Agent 配置页配色**（用户反馈「区块的灰和淡灰粉跟主题不搭」）：
  此前猩红完全继承暗夜那套（暖炭灰面板 + 玫瑰木 18% 的淡粉卡头）。现在按猩红自己的色系
  重配：深紫玻璃面板 `rgba(46,31,54,.82)`、深玫瑰紫卡头 `rgba(122,54,88,.62)`、
  更亮的玫瑰强调 `#C48BA0`（`--agent-accent-rgb` 一改，soft/line/chip 都跟着走）、
  紫灰玫瑰弱化文字。实测对比度：正文 6.96 / 弱化 6.75 / 卡头 5.66，面板比 `--card-bg`
  亮一档（否则上面那块 `#1f131d` 输入框会沉进去看不出来）。
  ④ **顺手挖出并修掉的真 bug（P1）**：验证 ① 时动态页整页走了错误边界，
  报 `Cannot read properties of undefined (reading 'filter')` —— 原因是
  **Agent 的 `[[写:动态]]` / `[[写:文章]]` 只写 `content`/`title`，不带 `imageIds`**，
  而 `addMoment`/`addArticle` 原样展开传入对象，于是存下来的记录缺这个数组字段；
  动态页渲染 `m.imageIds.filter(...)` 直接抛错，导出/备份里的 `m.imageIds.forEach(...)` 也一样。
  修法按「单一收口」原则做了四层：store 的两个 add* 补默认值、
  `normalizeState` 给文章/动态逐条兜底（老数据也能修回来）、`collectFileIds`/PDF 模板再兜一层、
  渲染处 `?? []`。实测 Agent 真写一条动态 + 一篇文章后：动态页 1 张卡片正常渲染、
  空间页能看到那篇文章、JSON/Markdown 导出与 `collectFileIds` 都不抛、
  打开那条动态的编辑器也正常；另用「缺字段的旧状态」跑了一遍 `normalizeState` 确认能修复。
- **v4.7.4（2026-10-04）** —— **把「猩红 Agent 输入框底色」的范围收窄 + 换成用户新色值**：
  用户澄清「那个 #181419 是**只改猩红书房主题下的输入框底色**」，并要求改成 `#1f131d`。
  v4.7.3 的做法是覆盖 `--agent-panel-bg`（Agent 面板/卡片的共用底色）—— 范围过大：
  Agent 的配置卡片、会话面板、聊天输入区**全都**变成了同一块深色。
  现在：
  - `--agent-panel-bg` **不再为猩红覆盖** → 面板/卡片回到原来的暖炭灰（与暗夜一致）；
  - `--field-bg`（配置页所有输入框，含人设 textarea）→ `#1f131d`；
  - 新增 `--agent-composer-bg`（默认 `var(--agent-panel-bg)`，即暗夜/日间行为不变），
    猩红下 = `#1f131d`，只作用于聊天页的输入区。
  实测三主题（令牌 + 真实渲染双层）：
  | | 聊天输入区 | 配置页输入框 | Agent 面板/卡片 |
  |---|---|---|---|
  | 暗夜 | `rgba(50,48,43,.85)` | `rgba(23,26,27,.5)` | `rgba(50,48,43,.85)` |
  | 日间 | `rgba(241,239,218,.94)` | `rgba(255,255,255,.72)` | `rgba(241,239,218,.94)` |
  | 猩红 | **`rgb(31,19,29)`** | **`rgb(31,19,29)`** | `rgba(50,48,43,.85)`（恢复原样） |
- **v4.7.3（2026-10-04）** —— **六处小修**（用户逐条反馈，全部实测）：
  ① **「播完暂停」的语义改对了**：原来是「放到最后一首才停」，用户澄清要的是
  **「播完本首就停」**——跟它在列表第几个无关。`onTrackEnded` 里把 `stop-after` 的分支提到
  「按顺序往下走」之前，任何位置放完都停（进度留 1）；**手动点上一首/下一首照常切歌**，
  切过去那一首放完也一样停。
  ② **便签默认落在碎片**（`useUIStore.notesTab` 初值 `inspiration` → `fragment`）：
  它是导航第一格、也是「最快记一笔」的入口。
  ③ 输入区提示「记到此刻（不动时间就是现在）」→「记到此刻」。
  ④ **猩红书房下 Agent 的输入框/面板底色**：猩红此前**没有覆盖** `--agent-panel-bg` /
  `--field-bg`，于是继承了暗夜的暖炭灰（`rgba(50,48,43,.85)`），压在紫红渐变上发灰。
  按要求改成 `#181419`。实测实际渲染 `rgb(24,20,25)`，暗夜/日间不受影响。
  ⚠️ **这一条范围搞大了，已被 v4.7.4 修正**：当时把 `--agent-panel-bg`（面板/卡片）
  也一起覆盖了，而用户要的只是「输入框」。现在 `--agent-panel-bg` 不再覆盖，
  输入框走 `--field-bg` + 新增的 `--agent-composer-bg`。
  ⑤ **日程与动态的「选时间」也改用应用内弹窗**（复用碎片的 `TimePicker`）：
  `ScheduleEditor` 去掉 `<input type="time">`；`MarkdownEditor` 的动态时间从
  `<input type="datetime-local">` 拆成「原生日期输入 + 应用内时间弹窗」。
  动态的日期仍走原生 input（它的系统弹窗自带取消/确定，没有 select 那类问题），
  并保留「保存时读日期 DOM 最终值」这条可靠性设计 —— 时分来自弹窗写入的 state，
  两者拼成本地时间戳。实测：日程不填时按钮显示「选时间」，选 07:05 后落库 `time='07:05'`；
  动态选 09:30 后落库 `createdAt` 的时分确实是 09:30。
  ⑥ **手机端打字时底栏/加号被顶到键盘上方**（两个原因，都修了）：
  - **键盘检测在「布局视口也一起缩」的内核上失灵**：老算法只看
    `window.innerHeight - visualViewport.height`，而 iOS Safari 与
    `interactive-widget=resizes-content` 下 innerHeight 自己也会缩，差值接近 0 → 判不出键盘。
    改成统一用「基准可见高度 − 当前可见高度」（基准在无键盘时向上取最大值，地址栏伸缩只有
    几十像素、不会误判；窗口宽度变化超过 50px 视为转屏并重置基准）。
  - **`translateY(100%)` 挡不住「整页被上推」**：底栏原来靠 transform 滑出，可键盘弹出时
    有些内核会把布局连同 fixed 元素一起上推一个键盘的高度，挪 56px 根本不够 → 底栏露在键盘上方。
    改成 `html[data-kbd='open'] .vd-tabbar { display: none }`（正确性优先，放弃滑出动画）。
  - 顺带给四个悬浮加号加了 `.vd-fab`，键盘弹出时一起隐藏（原来它在编辑态会跟底栏一起被顶上去）。
- **v4.7.2（2026-10-02）** —— **碎片页再修三处**（用户逐条反馈，全部实测）：
  ① **猩红书房的卡片点击时「跳来跳去」**：`@media (hover:none) { :root[data-theme='scarlet']
  .glass-card:active { transform: scale(0.982) } }` —— 这条把整张卡（毛玻璃底、液态边缘环、
  里面的文字）一起缩放，358px 宽的卡片会缩掉约 6.4px；而且它作用于**所有** `.glass-card`
  （包括不可点的日历卡/统计卡），只在触屏媒体查询里生效 —— 所以「只有手机上、只有猩红主题」会这样。
  改成只压一层边缘光（`--liquid-edge-mid/dim`），**没有任何位移**；transition 里的 transform 也删掉。
  实测：触屏 + 猩红下 `transform: none`、`transition: box-shadow 0.3s`，
  且从 CSSOM 里遍历已生效规则确认再无 scarlet 的 `:active` 形变。
  ② **补记输入区重排 + 时间改应用内弹窗**：原布局把「标签+时间+提示+取消+记下」全挤在一行，
  390px 上确认键直接被顶到卡片外（用户反馈）。现在四行排：正文 / 标签+时间 / 提示 / 按钮，
  且两个按钮**严格等宽平分整行**（顺便踩到两个坑：`flex:1` 要配 `min-w-0` 才不会被内容撑开；
  `.btn-ghost(14px)` 与 `.btn-primary(18px)` 的 padding 不一致，在 `flex-basis:0%` 下
  Chrome 把剩余空间分给**内容盒**、padding 额外叠上去 → 实测差出 154 vs 162，内联统一 padding 才等宽）。
  时间选择从原生 `<input type="time">` 换成自绘 `TimePicker`（24 个小时格 + 12 个分钟格 +
  「此刻」+ ±1 分钟微调），配 Modal 的取消/确认。
  ③ **年月选择改应用内弹窗**：原生 `<select>`（v4.7.1 的做法）在手机上会被系统拉成全屏滚轮且
  **没有取消键**（用户反馈）。换成自绘 `YearMonthPicker`（12 年一页 + 12 个月格）放在应用内 Modal 里，
  永远有「取消 / 确认」；草稿态 —— 点选只改 draft，确认才跳转（实测「取消」后视图不变）。
  另外把「选中态」统一成 `.vd-selected`（两个 CSS 变量承担主题差异），
  日历选中日与两个选择器的选中格都用它，不再各处写 `bg-wine/30`（教训 30 的成因）。
  **顺带修掉两个真 bug**：两个自绘选择器都犯了「同一帧内连点两格」时后一次读到旧闭包的问题
  —— 点「7 点」再点「5 分」会拼出「23:05」（小时没生效）、点「2024 年」再点「2 月」会得到
  「2026 年 2 月」；改用 ref 保存最新值后连续点选正确叠加（教训 31）。
- **v4.7.1（2026-10-02）** —— **碎片页四处体验修复**（用户逐条反馈，全部实测）：
  ① **日间主题下日历选中日「糊成灰的」**：碎片日历的选中日漏了 `cal-selected` 类，
  而日间主题的「实色深橄榄底 + 米色字」正是靠 `:root[data-theme='day'] .cal-selected` 那条
  覆盖规则给的 —— 结果只剩 `bg-wine/30`（浅玫瑰 30% 透明）配 `text-moon`（米色），
  实测对比度低到看不清。补上类之后：日间 5.21:1、暗夜 5.04:1、猩红 6.31:1，
  且**两个日历逐项完全一致**（同一主题下背景/文字/对比度三者相等）。
  ② **两个日历都能直接选年 / 月**：抽出共用组件 `components/common/CalendarNav.tsx`
  （原来两处各写一份标题栏，加功能就会两边不一致）。
  ⚠️ **本条里的原生 `<select>` 方案已被 v4.7.2 换掉**（手机上会拉全屏且没有取消键），
  现在是「标题按钮 → 应用内 Modal + YearMonthPicker」，见上一条。下面保留当时的记录：
  年、月用**原生 `<select>`**
  （手机拉起系统滚轮、桌面是普通下拉；本项目日程编辑器本来就在用原生 date/time 输入），
  选项文案自带「年 / 月」让单位字符也在可点区域内，另加一个 `ChevronDown` 提示可点。
  年份范围 1946~2036（今天 ±80/+10，往回留得宽是因为生活记录常补旧日子）。
  **翻年月只改「看哪个月」，不动选中日期** —— 与主页日历原有语义一致
  （否则「翻到去年看看」这种纯浏览动作会顺手改掉全应用的选中日期）。
  实测：碎片日历选 2024 年 2 月 → 恰好 29 天、有 2/29、无 2/30（闰月）；
  主页日历选 2023 年 2 月 → 最大日 28。
  ③ **移动端便签分页被挤成竖排**：每个分页 `px-4(32) + 两个汉字(28) + gap-2(8) + 计数(20) = 88px`，
  而 390px 屏上 4 等分只有 87.5px —— 「碎片」就被压成一列一个字。改成窄屏 `px-1.5` / `gap-1`
  并给文字加 `whitespace-nowrap` 兜底。实测 390px / 360px / 桌面三档：
  四个标签均 1 行、文字高 14px、按钮无内容溢出。
  ④ **补记可指定具体时刻**：`addFragment` 增加第 4 个参数 `at`（不传仍是「按下加号的当下时间」）；
  输入区常驻一个 `type="time"` 输入框，默认给当下钟点。关键细节：**今天且用户没动过这个输入框时
  不传 `at`**（交给 store 用真正的 `now()`），否则「自动记录当下时间」会变成「记录你打开输入框那一刻」。
  实测：补记到 2026-09-15 并改成 07:05 → `date` 与 `createdAt` 的日历日都是 09-15、时刻 07:05、
  时间轴显示 07:05；今天不动输入框 → `createdAt` 落在点击前后的真实时间区间内。
- **v4.7（2026-10-02）** —— **便签新增「碎片」**（用户口述需求 + 一张时间线参考图）：
  ① **数据模型**：新增 `FragmentEntry { id, content, createdAt, date, tag? }`，
  挂在 `state.notes.fragments`。刻意**比 v4.2 的旧碎片简单得多**：没有图片/评论/收藏/星标、
  没有分类桶 —— 它只是「当下记一句」。v4.4 之前的老碎片数据**仍然不迁移**（用户当年确认彻底删除，
  新形态是另一种东西）。
  ② **便签导航四格**：`NoteTabKey` 扩为 `fragment | inspiration | schedule | todo`，
  `SegmentedControl` 的碎片那格显示**今日条数**（不是总数 —— 导航挂在累计值上没意义）。
  ③ **页面**：月历（点日期跳转、有碎片的日期带圆点、与主页日历共用 `selectedDate`）+
  当天**极简时间轴**（竖轨 + 圆点，圆点与时间同行、正文在下），加号即时记录，
  自动写 `createdAt = now()`、`date = todayKey()`，按天升序展示；看历史日期时加号变成「补记到那天」。
  ④ **导出接入**：Markdown / PDF(HTML) 两条导出都新增「碎片」段（按天分组、组内从早到晚），
  快照计数并入便签；JSON / WebDAV / 快照本来就整份带 `notes`，无需额外处理。
  详见第 4 节之 27)、第 12 节教训 29、第 13 节。
- **v4.6.3（2026-10-02）** —— **长文体验**（v4.6.2 的性能实测把瓶颈指清楚之后的落地）：
  ① **阅读器分批挂载**（`ReaderPage`，60 块首屏 + 每批 240 块，`requestIdleCallback` 补齐）：
  保留「最终所有块都在 DOM 里」这条不变式（虚拟滚动会破坏标注锚点/跨块选区/进度所依赖的前提），
  只把「一次性阻塞几秒」换成「先出首屏、其余后台补齐」。
  ② **`parseBook` 加 4 条 LRU 缓存**：md 解析里逐块 `sanitizeHtml`(DOMPurify) 占约 89%，
  而同一本书一次浏览会被解析好几遍（书架 BookCard、进阅读器、重渲染）。
  实测 1× 冷 319ms → 热 0ms，6× 冷 1867ms → 热 0ms。
  ③ **导入建议上限 1 万字 → 5 万字**（硬上限 20 万字不变），提示文案同步改写。
  效果（23 万字 / 4840 块 / 6× CPU 降速）：书架点进书的**首屏可见 49ms**（此前整页阻塞 5.6 秒），
  全部块就绪 3129ms；整页刷新（缓存冷）首屏 2092ms、全量 5415ms。
  实测确认未回归：靠后的块（第 4200/4700 块）照样套上标注、标注文本与原文**逐字一致**
  （跨 `<strong>` 的一条仍正确拆成 3 个 `<mark>`）、小书一次挂完、滚到底 100%、
  目录跳到最后一章落到书末、恢复上次位置落到第 4198 块。
- **v4.6.2（2026-10-02）** —— **继续深挖 v4.6 的三处结果**（都做了真实浏览器验证）：
  ① **相册编辑器会留下孤儿 blob**：选图是「压缩 → 写 files 表 → 拿 id」的即时动作，而 id 只在
  点「发布 / 保存修改」时才被图片组引用 —— 实测「选 1 张 → 取消」后库里就多一张谁都不认领的压缩图，
  一次取消最多能留下 30 张。已改为：本次会话新入库的图在取消时全部回收、发布时把「选了又移除」的
  一并回收（**只删本次新建的 id**；编辑旧组时移除的旧图不动，那张图可能已被收进星标集）。
  ② **Agent 改书正文不再清空全书划线**：`[[替:馆藏|…]]` 落盘前用新的 `remapMarks()`
  逐条重锚定 —— 同一块同一偏移仍是原文就原样保留；原文在全书里**恰好只出现一次**就重新定位；
  对不上/有歧义才丢弃，并把丢弃的那几句原文写进结果消息。确认卡片上会**先给出预测数字**
  （几处保留 / 几处会丢），落盘结果同时记一条 sys 消息（toast 会消失，这个要留档）。
  ③ **长文性能实测**（原来只有「建议 ≤1 万字」这句无数据支撑的说法）：见第 8.1 节的新表格。
  详见第 4 节之 22)、23)、第 8.1、8.3、12、13 节。
- **v4.6.1（2026-10-02）** —— **两个实测缺陷修复**（接手复核 v4.6 时发现，都做了真实浏览器复现 + 修后复测）：
  ① **目录章节增删会永久位移块索引**：`addBookChapter` 把已有章节的 `from/to` 整体 +1
  （误以为「插一条章节」=「插一块正文」），`removeBookChapter` 又不减回去 —— 实测一本 3 章 9 块的书，
  章首 `from` 从 `[0,3,7]` 变成 `[0,4,8]`，目录点击跳到下一段、「正在读」高亮错章，且每操作一轮再偏一块；
  顺带修掉「新章节与上一章区间重叠」。改为抽出 `retargetChapters()`：`to`/字数一律由正文与
  「下一条章节的起点」推出来，增删只改起点集合。见第 4 节之 23)、第 12 节教训 24。
  ② **`collectFileIds` 漏收 `tracks[].fileId`**：音乐 blob 因此被当成孤儿 —— 设置里的「清除缓存」
  会把用户导入的全部音乐删掉（实测：1KB 假音频 + 一张相册图 + 一个真孤儿，点确认后
  提示「已清理 2 个无引用图片」，音频从库里消失、曲目仍留在列表但再也放不出声）；
  同时导出 JSON / WebDAV / 本地快照三条备份路径都只备份歌单不备份音频。已补全收集。
  详见第 8.3 节与第 13 节。
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

**⚠️ 音频元素是「单例、换源复用」，不要改回每首 `new Audio()`（v4.7.6）**：
移动端浏览器的自动播放策略**按元素放行** —— 一个已经被用户手势启动过的 `<audio>`，
之后换 `src` 再 `play()` 仍然允许；而**新建的元素**不是用户手势触发的，会被直接拦下。
原实现每首新建元素，于是「自动续播」（顺序/随机）在手机上最容易失灵（桌面不敏感，所以看不出来）。
模块级 `el` 只管创建一次，`release()` 只卸源、**不销毁元素**（保住「已解锁」状态）。

**取不到文件的歌要跳过，不要静默 return（v4.7.6）**：
`play()` 遇到「没有 fileId」或「文件取不到」原来直接 `return`，状态停在上一次 `release()`
留下的 `isPlaying:false` —— 用户看到的是「放着放着自己停了」。现在
`firstPlayable(from, step)` 会绕列表一圈找第一首**文件还在**的歌，
续播/上一首/下一首都走它；整轮都找不到才停，并把原因写进 `playError`
（UI 读到就弹一次 toast 后清掉）。**「静默停下」是这次要修的病根，别改回去。**

**四种播放模式的语义（v4.7.3 校准，改之前先读这段）**：模式**只决定「一首自然放完之后
自动怎么办」**，上一首/下一首永远按列表顺序、不受模式影响（手动跳歌是用户自己的动作）。
- `sequence` 顺序播放：往下一首走，最后一首之后回到第一首；
- `shuffle` 随机播放：随机挑一首，尽量避开刚放完这首；
- `repeat-one` 单曲循环：直接重播当前 audio 元素（不走换源分支）；
- `stop-after` **播完暂停：播完本首就停**，与它在列表第几个无关（进度留 1，让用户看到
  「确实放完了」）。⚠️ 这里**曾经写错**：早期实现是「只到最后一首才停」，用户明确澄清
  要的是「这首放完就不要自动接着播下一首」。所以判断 `stop-after` 的分支要**放在
  「取 idx、按顺序往下走」之前**，否则又会退化成「只在末尾停」。

### 13) 分类管理
灵感/日程/待办各有 `categories: string[]`，支持筛选 + 双击重命名 + 删除 + 新增；
删除分类保留便签（便签的 `category` 字段不变）。

### 14) 皮肤系统：**已撤销，不要再加**
v3.1 曾做过可命名皮肤（含浅色卡片），用户试用后要求**完全撤销**。
**不要再引入皮肤/主题切换**扩展机制 —— 主题统一走 `theme.ts` 的三主题体系
（暗夜/白昼/猩红），新增主题必须保证三套 token 齐全（见第 3 节）。

### 15) WebDAV 云同步与端到端加密（v4.0 起，v4.5.1 改存 JSON，详见 `src/lib/webdav.ts`）
- 备份文件固定名 `BACKUP_FILENAME = 'vidaos-backup.json'`（v4.5.1 起**云端默认存明文 JSON**，
  未加密不再 gzip，方便在坚果云里直接查看/管理；每次同步**覆盖同一份**，只保留最新 =
  **删除的内容下次云备份后云端同样消失**，全量覆盖即删除同步）；
- **兼容旧备份**：`BACKUP_FILENAME_LEGACY = 'vidaos-backup.json.gz'` 旧文件名保留，
  下载时先试新名、404 回退旧名，并对内容三态自动识别（gzip 魔数 1f 8b → 解压；
  VDOS1 密文容器 → 解密；否则按明文 JSON 直接读）；
- 上传链路：纯数据 → **未加密直接 PUT 明文 JSON**；加密时先 gzip（压缩防泄露体积）再
  `encryptBlob` → `PUT`（先 `MKCOL` 建目录）；下载链路：`GET` → 自动识别加密 → 解密 →
  解析快照 → 确认后覆盖恢复；恢复前**需要 passphrase 时抛 `NeedPassphraseError`**，DataPage 弹输入框；
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

**软键盘弹出时的底栏 / 加号（v4.7.3 重做，勿回退）**：信号在 `src/lib/keyboard.ts`
（`<html data-kbd="open|closed">` + `useKeyboardOpen()`），处理在 `globals.css`：
- 检测用「**基准可见高度 − 当前可见高度 > 120px**」，基准在无键盘时向上取最大值
  （`min(visualViewport.height, innerHeight)`）。⚠️ **不要改回**
  `window.innerHeight - visualViewport.height > 120` —— 那只在「布局视口不变、只有视觉视口变矮」
  的内核上成立；iOS Safari 与 `interactive-widget=resizes-content` 下两个数一起缩，
  差值接近 0，键盘判不出来，底栏就留在原地被顶到键盘上方（用户实测反馈过）。
  窗口宽度变化 >50px 视为转屏，重置基准（否则横竖屏切换会误判）。
- 隐藏方式：底栏 `html[data-kbd='open'] .vd-tabbar { display: none }`。
  ⚠️ **不要改回 `transform: translateY(100%)`** —— 有些内核在键盘弹出时会把布局连同
  fixed 元素一起上推一个键盘高度，往下挪自身高度（56px）根本不够，底栏会露在键盘上方。
- 悬浮加号统一挂 `.vd-fab`（灵感/日程/待办/碎片四处），键盘弹出时一起隐藏：
  否则编辑态下它会被顶到键盘上方、正好压在输入区旁边。

### 18) 兼容性（勿回退）
- `@vitejs/plugin-legacy`（targets Chrome≥60 / Android≥6 / Safari≥10 / iOS≥10，modernPolyfills）+ 
  dev 用 esbuild `target: 'es2018'` —— 夸克旧内核不支持 ES2020（可选链/?.）白屏的修复；
- `index.html` 3.8s 挂载兜底层（夸克 UA 特判提示「关闭云加速/智能转码」+ 重试按钮）。

### 19) Agent 对话引擎（v4.2，`src/lib/agentEngine.ts` 纯函数层）
> 底色约定（v4.7.4 分层 / v4.7.5 补猩红取值）：Agent 有三层表面，**别再混用**——
> `--agent-panel-bg` 面板/卡片、`--field-bg` 表单输入框、
> `--agent-composer-bg` 聊天页输入区（默认跟随面板色）。
> 要调「某一处的颜色」时先确认它属于哪一层，别拿共用变量去改（教训 33）。
> 三套主题的各层取值见 `globals.css`：暗夜/日间走 `:root` 与 `data-theme='day'`，
> **猩红在 `data-theme='scarlet'` 里整块重配**（深紫玻璃面板 + 深玫瑰紫卡头 + `#C48BA0` 强调，
> 面板要比 `--card-bg` 亮一档，否则 `#1f131d` 的输入框会沉进去看不出来）。
- **无新增 npm 依赖**：真实对话走浏览器 `fetch` + SSE 流式解析，不引入 SDK；
- **端点规范化** `chatEndpoint()`：已含 `/chat/completions` 原样用；以 `/v数字` 结尾补
  `/chat/completions`；否则补 `/v1/chat/completions`（兼容 OpenAI 兼容服务）；
- **消息组装** `buildMessages()`：system = 人格（`DEFAULT_PERSONA`，可被资料库「人格」文档
  覆盖）+ 资料库索引 + **生活数据索引 `lifeIndexText()`（v4.5.1）**（文章/动态/灵感/便签/
  日程/待办/收藏夹/相册的标题与条数，随请求下发，不发正文）+ 使用约定（`[[读:模块]]` /
  `[[读:文档]]` / `[[忆:]]` / `[[记:]]` 标记）+ 最近 N 条会话历史；
- **按需读取**：`resolveModule()`（v4.5.1：按模块名返回结构化文本 —— 文章/动态/灵感/便签/
  日程/待办/收藏夹/相册/星标集）+ `resolveDoc`/`resolveMemory`（精确标题 → 模糊包含）；
  `resolveDoc` 优先解析 `[[读:文章·标题]]`（v4.5.1）；长文档用 `snippetFor`
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
  正文**直接存主数据**（`state.books`）。导入时按「建议 / 硬上限」两级提示：
  **建议值 5 万字**（v4.6.3 起；此前 1 万字，实测证明比实际能力保守一个数量级）、硬上限 20 万字。
  另见第 4 节之 26)「长文分批挂载」与第 8.1 节的实测表格。
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

### 22) 相册（v4.5，`pages/album/*` + `components/album/*`）
- **数据模型**：`Album { id, name, starred?, createdAt, updatedAt }`（图集，星标集
  `album-starred` 由 `normalizeState` 兜底永远存在、置顶、不可改名/删除）、
  `AlbumGroup { id, albumId, imageIds[], caption, createdAt, updatedAt }`（图片组）、
  `AlbumStar { id, imageId, tag:'article'|'moment'|'inspiration'|'album', refType?, refId?, caption?, createdAt }`
  （星标集条目，`refId`/`refType` 关联原文用于双链跳转）。
  ⚠️ 星标条目**复用同一个 fileId**（`addAlbumStar({ imageId: fileId })`）—— 所以「把某张图从图片组里
  移除」不能顺手删它的 blob：那张图可能还挂在星标集里。
- **排序**：图集列表按 `updatedAt`（最近阅读）降序、星标集永远第一；组内图片按组内顺序
  （编辑时拖动排序），组与组之间按 `createdAt`（发布时间）降序时间轴；**更新组不算发布**，
  不刷新 `createdAt` 只刷 `updatedAt`；
- **上传/编辑** `AlbumUploadEditor`：≤30 张，压缩入库；支持**无图纯文字发布**；**缩略图用
  div 背景图渲染而非 `<img>`**（移动端对 `<img>` 长按会弹系统「查看图片」UA 菜单，CSS 拦不住）；
- **拖拽排序**（v4.5.1 重写）：桌面 `mousedown` 按下即拖 + 窗口级 `mousemove/mouseup`
  （**弃用 HTML5 DnD**，行为不稳定）；触屏 `touchstart` 长按 300ms 进拖拽（未进入前移动
  >10px 视为滚动取消计时），拖拽中 window `touchmove(passive:false) preventDefault` 接管，
  用 `document.elementFromPoint + closest('[data-album-tile]')` 找目标；**拖拽结束 350ms 内
  抑制 click**（防松手误开预览）；按钮（移除）不触发拖拽；删除键放在 tile 内
  （tile 有 overflow-hidden，负偏移会被裁掉）；
- **星标集**：文章/动态/灵感大图 lightbox 里可「存入星标集」（`setLightbox({ starTag })`），
  相册图也可单独星标；星标集按「文章 / 动态 / 灵感 / 相册」四固定标签分类，图片带双链跳原文；
- **收藏夹分流**：非相册来源的星标不进主页收藏夹，统一进星标集；
- **孤儿 blob 的回收规则（v4.6.2 修）**：选图是「压缩 → 写 `files` 表 → 拿到 id」的即时动作，
  id 要等点「发布 / 保存修改」才被图片组引用 —— 所以「选了图又反悔」会留下谁都不认领的压缩图
  （实测：选 1 张 → 取消 → 库里就多 1 个孤儿；一次取消最多 30 张）。现在 `AlbumUploadEditor`
  用 `sessionIds` 记下**本次会话新入库**的 id：取消时全部回收（并提示「本次上传的 N 张照片已丢弃」）、
  发布时把「选了又移除」的也回收、点单张的移除键时立刻回收。
  **只删本次新建的 id**；编辑旧组时被移除的旧图不动（可能已被星标集引用），交给设置里的
  「清除缓存」按 `collectFileIds` 的引用关系回收。
- **备份接入**：`collectFileIds` 已收 `albumGroups[].imageIds` 与 `albumStars[].imageId`
  （三条备份路径共用），`pickState` 带 albums/albumGroups/albumStars。

### 23) 馆藏·章节与目录页（v4.6，`lib/library.ts` + `pages/ReaderPage.tsx`）
- **章节只存位置，不复制正文**：`BookChapter { id, title, from, to, charCount, createdAt, updatedAt }`。
  这是为什么「删除章节」在语义上**只能是「从目录撤掉一条」**：
  划线锚点是块索引（见 21），删正文会让后面所有块整体位移、整本书标注全部错位；
  而且 Agent 也没有删除能力（见 24）—— 章节删不删由用户自己在目录页决定。
  弹窗里也写明「正文原封不动保留，划线不受影响」。
- **判定放在切块阶段，不在事后回正文里搜**：`BookBlock.heading` 在 `blocksFromMarkdown` /
  `blocksFromText` 时填好（md：1~3 级 heading token；txt：明确模式 + 单行短段兜底）。
  原因：md 的围栏代码块、txt 的示例文本里也可能有 `#` 或「第X章」，**块级判定天然不会命中**
  这类内容，事后按行搜会误伤。`token.text` 在 `htmlToText` 返回空时（SSR / 单测）兜底。
- **规则细节**：
  - md 只切 h1~h3（h4~h6 不切，否则目录会被切得过碎）；
  - txt 显式模式（第X章/回/节/卷/部/篇/集/话/幕/折 + Chapter N + 阿拉伯序数「12、标题」+
    序章/序言/序幕/楔子/引子/前言/后记/尾声/终章/附录/番外）；二级兜底是「单行 + ≤24 字 +
    不以句末标点结尾」（误判后果只是多一条可删的目录条目，正文永远不动）；
  - 第一个标题之前的正文并成一条「开篇」（标题 = 书名），避免书的前几段「无家可归」；
  - 一个标题都没解析出来时返回一条覆盖全书的兜底章节，目录页不会空白。
- **`buildChapters` 沿用现有 `existing`**：按「title + from」命中已有章节就沿用 id / createdAt，
  每读一次书 / 每被 Agent 写一次，章节 id 都不会抖一轮。
- **目录页**（`ReaderPage` 顶栏新增「目录」按钮）：与「书签」同款右侧抽屉（移动端满宽）；
  - 章节列表带序号（`String(i+1).padStart(2,'0')`，等宽数字）+ 字数 + 「正在读 · 」
    高亮（由本地 `curBlock` state 驱动，不订阅 store，避免滚动时整组件重渲染）；
  - `gotoChapter` 滚到该章起点 + 同步 `curBlock`；
  - 每章铅笔重命名 / 垃圾桶从目录移除（弹窗明确说明「正文保留、划线不受影响」）；
  - 底部「在当前阅读位置新建章节」（`addBookChapter` 在 `from = curBlock` 处插入）；
    该块已经是章节开头时返回 `false`，UI 提示「这一段已经是章节开头了」（不再叠出两条同 `from`
    的死条目 —— `chapterIndexOfBlock` 只会认后面那条）；
  - 老数据兜底：进页面若 `chapters` 为空则调一次 `rebuildBookChapters`（`ref` 守卫，只补一次）。
- **⚠️ 目录是正文的投影，增删章节只改「起点集合」（v4.6.1 修，改这块前必读）**：
  `from` 是块索引，`to` 与 `charCount` **只由「下一条章节的起点」和正文决定**，
  与「什么时候建的、按什么顺序建的」无关。所以 `addBookChapter` / `removeBookChapter`
  一律走 `retargetChapters(skeletons, blocks)` 重算，**绝不对已有章节的 from/to 做加减**
  （正文一块都没动）。v4.6 的写法把已有章节整体 +1 而移除时没有减回去，导致
  「新建 → 再删掉」之后后面每条章节永久晚一块、区间还会重叠；细节与实测数字见第 12 节教训 24。
  `buildChapters` 也从同一处生成区间，两条路径不会各算一套。
- **目录的数据来源约束**：导入时 `addBook` 就调用 `buildChapters` 解析（不必等用户进阅读器），
  `normalizeState` 对老书直接补解析一次（不必手动「重建目录」）。但**保留菜单里的「重建目录」
  入口**——md 标题识别不准时（用户文本里恰好有 `#` 开头的章节标题）需要手动触发。

### 24) Agent 专属书《Agent》（v4.6，`src/lib/db.ts` + `useAppStore.deleteBook` + `LibraryPage` + `ReaderPage`）
- **三条用户硬约束**（写代码前对齐再动手）：
  1. **固定存在**：db.ts 的 `defaultState()` + `normalizeState` 双处兜底（与星标集同范式），
     误删 / 导入老备份 / 重置数据后都会补回来；
  2. **不可删除**：`useAppStore.deleteBook` 对 `AGENT_BOOK_ID` 直接 `return`（代码层面没有删除路径，
     这是 v3.0 起就立好的红线），UI 上菜单也不显示「移出书架」入口（双层防御）；
  3. **不默认置顶**：`pinned` 留空（false），跟其它书一起按最近阅读排序；
  4. **关 Agent 开关时隐藏**：书架 + 直接敲 URL 进阅读器都拦（后者是阅读器守卫 EmptyState）。
- **normalizeState 的双保险**：剥掉来路不明的 `agentBook` 标记（老备份 / 手工编辑过的 JSON
  可能带错 id），按标准 id 补一本 —— 保证全局**有且只有一本**且 `deleteBook` 能认出来。
- **id 恒定**：`AGENT_BOOK_ID = 'book-agent'`，写在 `lib/library.ts` 里（被 `db.ts` 和
  `agentTools` 共用，避免各写一份走样）。
- **初始内容**：md 格式 `# Agent` + `## 写入方式`，让 buildChapters 一上来就有目录（2 章），
  而不是空书。
- **侧边菜单的描述文案**：当 `agentBook` 时显式说明「这是 Agent 专属书...固定保留、不可删除」，
  并把「上架于 1970-01-01」这条由 `createdAt:0` 引起的伪信息去掉（卡片底部显示「Agent 专属书」
  而不是「上架 56 年前」）。
- **「关 Agent 开关时隐藏」是书架层而不是阅读器层的判断**：在 `LibraryPage` 用
  `visibleBooks`（agentEnabled ? books : books.filter(b => !b.agentBook)）计算一次，
  置顶区、标签筛选、头部计数全部跟着变 —— 不要散在每个列表算。

### 25) Agent 写书工具（v4.6，`src/lib/agentTools.ts` + `src/lib/agentEngine.ts` + `agentTurn.ts`）
- **入口语法**：`[[写:书【章节标题】|正文]]`。模块名固定 `书`，`【】` 里是章节标题，`|` 后面是正文。
  TOOL_CONTRACT 里有完整铁律与示例，模型自己会用。
- **同名前缀「标题 · 2」自动去重**：用户的真实诉求是「存一个章节」，Agent 既不能拒绝也不能
  覆盖旧章节。**永远追加为新章节**——同名时改成「标题 · 2」「标题 · 3」等（`uniqueChapterTitle`）。
- **为什么坚持「文末追加」而不是「插到指定章节中间」**：
  划线锚点是块索引，文末追加不改变任何已有块的索引 → 书里已有的划线**一条都不会错位**；
  就地插入/替换正文必然让后面的块整体位移。这是刻意的取舍：保住用户的划线，比让章节
  插在中间更重要。
- **已有的真问题、之前没人接的**：查找替换 `applyReplace` 的 `book` 分支此前用 `updateBook`
  改正文，**就地替换同样会漂移**——块索引变了，旧的划线会悄悄指向别的段落。现在统一改走
  `setBookContent`。
- **标注怎么处理：逐条重锚定，而不是一律清空（v4.6.2 改）**。v4.6 的做法是「一发现书正文被改
  就清空全书标注」——安全但代价太大：改一个错别字会抹掉用户所有划线，而《Agent》这本书的定位
  恰恰是「Agent 经常改、用户会在上面划线」。
  现在走 `lib/library.ts` 的 `remapMarks(marks, newBlocks)`，逐条判定：
  ① 同一块、同一偏移处仍是这段原文 → 原样保留（改动在这条标注之后，最常见）；
  ② 该原文在全书**恰好只出现一次** → 重新锚定到那一处（改动在其之前、块位移或块内偏移变了）；
  ③ 找不到 / 出现多次 → 丢弃，并把原文写进结果消息。
  **安全性由「逐字相同」+「全书唯一」两条保证，不靠长度**（门槛 `REMAP_MIN_CHARS = 2` 只管代价），
  所以最坏情况就是退回第 ③ 条丢弃，不会比原来更差。`proposeReplace` 会先跑一遍同款逻辑，
  把「几处保留 / 几处会丢」**在做决定之前**写进确认卡片。
- **格式铁律**（TOOL_CONTRACT 节选）：「【】必须**成对出现**并写在 | 的左边」、
  「正文里若出现 `](` 链接，结尾用全角 `］］` 代替 `]]`」。
- **格式坏掉的标记不再静默吞掉**（`scanTools.brokenKinds`）：写/替对闭合最挑剔，模型偶尔会
  漏 `】`、把 `|` 写在 `】` 前、或正文里有 `](`。**错就错在「静默不执行」**：用户以为存进去了、
  实际什么都没发生。所以 scanTools 返回 `brokenKinds`，agentTurn 收到后
  - 给用户回一条 sys 消息「有 N 处标记格式不对，没有执行」并指出原因；
  - 把指令回灌给模型（`pendingTool.push({role:'user', content: 【标记未执行】...})`），让模型
    下一轮自己重发。
- **标记结束符同时接受全角 `］］`**：要写入的 md 正文里很容易出现 `](url)` 这种链接，
  半角 `]]` 会被当成标记结束、把内容拦腰截断；让模型有全角这个退路。

---

### 26) 长文分批挂载与解析缓存（v4.6.3，`pages/ReaderPage.tsx` + `lib/library.ts`）
- **为什么不做虚拟滚动**：标注锚点（块索引 + 块内字符偏移）、跨块选区、阅读进度观察、
  目录跳转全都建立在「所有块都在 DOM 里」这条前提上，而这套偏移数学正是本项目历史上
  反复出 bug 的地方（见第 12 节教训 22/24）。分批挂载保留这条不变式，只把「一次性阻塞」
  换成「先出首屏、后台补齐」，风险小得多、收益（首屏 5.6s → 49ms）已经很大。
- **三个必须一起改的地方**（详见第 12 节教训 28）：`atBottom()` 要加「还没挂完就不算到底」的
  守卫；「DOM 里找不到」不能当作「数据不存在」；恢复位置要和用户自己的滚动让步。
- **`parseBook` 的 LRU 缓存**：md 解析里逐块 `sanitizeHtml` 占约 89%（实测 4840 块 1638ms / 6×），
  而同一本书一次浏览会被解析好几遍（书架 `BookCard` 算进度、进阅读器、重渲染）。
  缓存命中用**字符串全等**比较，不用哈希 —— 哈希碰撞会拿错正文，数据正确性不能赌。
- **还没做的**：真正的瓶颈是「一次性同步解析 + 一次性挂载」。分批挂载解决了后者的体感，
  前者（`marked.lexer` 全量 + 逐块 DOMPurify）在 20 万字 / 手机 CPU 下仍是约 1.9 秒的
  同步阻塞。要再往下优化的方向是「批量净化」（把逐块 DOMPurify 合成一次，
  但必须校验包装元素与块的 1:1 映射，失败就退回逐块，否则锚点会错）或「增量解析」；
  两者都要动块与锚点的契约，属独立课题。

### 27) 便签·碎片（v4.7，`types` 的 `FragmentEntry` + `stores/useAppStore` + `components/notes/FragmentView.tsx`）
- **为什么重新做、又为什么做得这么简单**：v4.4 下线的碎片是「带图 / 评论 / 收藏 / 星标的碎片流」，
  与动态重复；用户这次要的是**另一种东西** —— 「按下加号记一句、自动记时间、按天看时间线」。
  所以数据模型只有五个字段，**没有 `categories`**（不进分类桶系统）、没有图片、没有状态。
  旧数据不迁移。
- **`date` 为什么单独存**（而不是只用 `createdAt` 推）：
  ① 时区 —— `createdAt` 在 UTC 零点附近换日时截 `YYYY-MM-DD` 可能跨日，`date` 在写入时按**本地日历**定下；
  ② 补录 —— 允许往历史某天追加碎片，此时 `date` = 用户选的那天，而 `createdAt` 仍是「补录的当下时间」，
  **两者不一致是预期的**（时间轴上显示的是 `createdAt` 的 HH:MM）。
  `normalizeState` 给缺 `date` 的旧备份兜底，用 `todayKey()` 而不是 `toLocaleDateString('en-CA')`
  （后者依赖运行环境 locale 数据）。
- **日历与主页共用 `useUIStore.selectedDate`**：「今天在看哪天」全应用只有一个真相，
  碎片里跳了日期，回主页的日历/当日产出也是那天。上/下月按钮会顺手把选中日期带到该月，
  否则日历高亮与下方时间轴会各说各话。
- **时间轴为什么升序**：与动态页「最近在上」相反 —— 时间线的语义是「这一天怎么过的」，要从早看到晚。
- **样式取自参考图，但颜色全部走主题变量**：参考图（浅色、近黑圆点）只提供**骨架**：
  竖轨 + 圆点、圆点与时间同一行、正文在下面、条目之间不加卡片/分隔线、只有两级字号。
  配色一律 `var(--amber)` / `var(--line)` / `var(--text-*)`，三套主题（暗夜/白昼/猩红）自动跟随，
  没有为任何一套主题写特殊规则。
- **⚠️ 圆点的定位有两个参照系，改样式前先看这段**：竖轨是 `<ol>`（relative）的绝对子元素，
  `left:8` 相对 ol 的 padding box；而圆点在 `<li>` 里、li 的左边界已被 ol 的 `pl-6` 推到 +24 ——
  所以圆点的 `left` 是 **-20**（= 8.5 − 24 − 4.5）。并且圆点用 `top:50% + marginTop:-4.5`
  挂在「时间行」上，而不是写死 top（行高会被 24px 的操作键撑起来，写死就偏）。实测踩过，见教训 29。
- **导出接线**：`exportMarkdown` / `exportPDF`（HTML 模板）各加一段「碎片」；`scopedState` 的
  `notes` 分支要带上 `fragments`（否则按范围导出时字段直接消失）；快照 `counts.notes` 并入碎片数。
  **新增模块时这三处都要过一遍**（教训 25 同源）。
- **日历标题栏是共用组件**（v4.7.1 抽出 / v4.7.2 改交互）：`components/common/CalendarNav.tsx`，
  主页日历与碎片日历都用它（`eyebrow` 不同）。标题是个按钮，点开应用内 Modal
  （`YearMonthPicker`：12 年一页 + 12 个月格，带取消/确认；草稿态，确认才跳），
  **翻年月只改视图、不动选中日期**。
  改日历样式请改这一处，别在两边各写一份 —— 这次就是因为两处各写一份，
  `cal-selected` 只在主页那份里，导致日间主题下碎片日历的选中日看不清（教训 30）。
- **「选中态」统一挂 `.vd-selected`**（v4.7.2；此前叫 `.cal-selected`）：
  主题差异由 globals.css 里的 `--sel-bg` / `--sel-fg` 两个变量承担 ——
  深色主题是半透明酒红底 + 亮字，日间主题必须换成实色深橄榄底（浅玫瑰 30% 透明 + 米色字
  在浅底上对比度不足，实测几乎不可辨）。
  **任何画「选中日 / 选中格」的地方都挂这个类，不要各自写 `bg-wine/30`**（那正是教训 30 的成因），
  并记得用探针量一次对比度（三套主题 × 两个日历，实测 5.21 / 5.04 / 6.31）。
- **时间选择用自绘 `TimePicker`**（v4.7.2）：不用原生 `<input type="time">` ——
  安卓是时钟表盘、iOS 是滚轮，样式改不了、也没法跟主题一致。自绘的是 24 个小时格 +
  12 个分钟格（5 分钟一档）+「此刻」+ ±1 分钟微调，放在 Modal 里配取消/确认。
- **补记可以指定时刻**（v4.7.1）：`addFragment(content, tag?, date?, at?)`。
  `at` 只在创建时生效；`updateFragment` 依旧不改 `createdAt`（改文字不该顺手改时间）。
  输入区的 `touched` 标记很关键：今天没动过输入框就不传 `at`，让 store 用真正的 `now()`。
- **便签默认落在碎片**（v4.7.3）：`useUIStore.notesTab` 初值为 `fragment` ——
  它是导航第一格，也是「最快记一笔」的入口。（`notesTab` 不持久化，刷新后回到碎片；
  会话内切到别的分页会保留，这是预期。）
- **时间选择器是共用组件**（v4.7.3 起三处共用）：`components/common/TimePicker.tsx`
  被碎片补记、便签·日程、动态发布时间复用，避免又出现「同一块 UI 写两份」（教训 30）。
- **目前没覆盖的三处**（都不是用户本轮要求的，如实记下）：全局查找替换不搜碎片；
  Agent 的资料索引/`[[读:]]` 还不认碎片；主页「当日产出」卡不列碎片。

### 28) 收藏夹（`pages/FavoritesPage.tsx`）
- **数据模型**：`Favorite { id, refType: 'article' | 'moment', refId, createdAt }` ——
  只有文章与动态两种。**灵感的「星标」是另一套机制**（`InspirationNote.starred`，
  只在灵感页里筛选），不进收藏夹；相册的星标走 `albumStars`（星标集）。
  想知道「为什么灵感不在收藏夹」，看这三套机制的区别，别以为漏了。
- **点开一条收藏的跳法（v4.7.5 修）**：
  - 文章 → `/space/article/:id`，本身就是一个精确位置；
  - 动态 → **必须带 `focusRequest`**（`{ kind:'moment', id, query:'', … }`）再 `navigate('/moments')`，
    由动态页的 `useGlobalFocus` 按 `[data-moment-id]` 找到卡片并滚进视野。
    只 `navigate` 会停在列表顶部/上次位置 —— 这条以前挂在第 8.1 节，
    因为「动态没有独立页面」而被当成低优先级，用户反馈后补上。
- **每条收藏标注类型**：元信息行一个 `.tag` 小标签（文章 / 动态）。
- **列表只显示「还找得到的」收藏**：refId 对应的文章/动态被删掉时整条不渲染
  （不是 bug，但会让「收藏数」与「列表条数」不一致 —— 改这块时留意）。

### 29) 空间·标签栏目（v4.7.6，`components/space/ArticleTags.tsx` + `pages/SpacePage.tsx`）
- **列表是派生的，不是注册表**：`tagList` = 遍历所有 `article.tags` 求并集 + 计数。
  所以「所有用了标签的文章，标签都会出现在这里」；代价是「删掉最后一篇用它的文章，标签就消失」
  （符合直觉）。**不要为了「让标签留着」而引入 `categories.article` 之类的桶** ——
  那会变成双份真相：删桶里的标签不会动文章、文章上的标签又不在桶里（灵感/日程/待办现在就是这个状态）。
- **改名/删除都是「批量改文章」**：`renameArticleTag(from,to)` / `deleteArticleTag(tag)`
  返回被改动的文章数，UI 用它写 toast/确认文案（「会从 N 篇文章上摘掉」）。
- **筛选状态要跟着标签走**：`activeTag` 在「标签不存在了」时自动清掉
  （删除、改名、或最后一篇用它的文章被删掉）——否则会卡在一个不存在的标签上，
  列表空白又没有任何入口能退出筛选。改名时把 `activeTag` 一起改成新名字，保持筛选连续。
- **稳定性**：标签 chip 上挂 `data-article-tag="名字"`，给探针/脚本一个稳定锚点
  （`aria-label` 会随选中态在「筛选」/「取消筛选」之间变，照它定位会漂 —— 这轮就踩了一次）。

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
│   │   ├── agent/               # ★ AgentChatView（气泡流 + 输入区含图片待发队列 + 配置/资料库/记忆馆抽屉）
│   ├── album/               # ★ AlbumUploadEditor（v4.5 相册上传/编辑：div 背景图 + 双端拖拽）
│   │   ├── editor/              # MarkdownEditor / EditorOverlay
│   │   ├── search/              # GlobalFindReplaceCard / PageFindBar / usePageFind
│   │   └── common/              # Card / Button / Tag / Toast / Modal / EmptyState / MediaImage
│   │       ├── CalendarNav.tsx       # 日历标题栏（主页 + 碎片共用，点开年月弹窗）
│   │       ├── YearMonthPicker.tsx   # 年月选择弹窗
│   │       └── TimePicker.tsx        # 时间选择弹窗（碎片补记用）
│   │                            #   + ErrorBoundary / MarkdownView
│   └── pages/                   # 14 个路由页面
│       DeskPage / NotesPage / LibraryPage(书架) / ReaderPage(阅读器·划线·书签) /
│       AgentPage(会话列表+聊天) / DataPage / SettingsPage / SpacePage / CollectionPage /
│       ArticleReaderPage / MomentsPage / FavoritesPage / album/AlbumPage(图集列表) /
│       album/AlbumDetailPage(图集详情·时间轴·上传编辑)
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

## 7. 已实现功能清单（当前，v4.7）

- **桌面**：大时钟 Hero + 4 功能宫格（空间/动态/便签/收藏夹）+ 双卡月历/当日日程
  （**点日期联动**、**「今」按钮**）+ 主页**待办模块**（未完成待办、快速添加/勾选）+ 音景播放器
- **空间**：Markdown 长文 + 合集 + **标签栏目**（v4.7.6：合集与文章之间，点标签筛选 /
  双击改名 / × 删除，列表由文章派生）+ 封面 + 配图（**可插入正文**、可拖拽排序、
  可在合集页直接编辑）+ **Obsidian 风格双链**（`[[标题]]` 渲染/跳转/自动创建、
  正反向链接、编辑器「双链」插入按钮）
- **动态**：**时间线**（日期分组 + 竖线节点）+ 头像/昵称 + **评论** + **收藏**
  + **编辑（含改时间）** + Markdown 渲染 + **查找/替换**（高亮命中、跳转、替换/全部替换）
- **便签**：**碎片/灵感/日程/待办**四分区滑块 + 分类管理（增删改）+ 日程与首页日历联动；
  碎片 = 月历（年/月可点选，应用内弹窗）+ 当天时间轴（竖轨+圆点），加号即时记录、可补记与指定时刻
  + 待办**自动置底 / textarea 多行 / 长按拖拽排序**
- **收藏夹**：跨类型聚合（文章 / 动态，每条带类型标签）；副标题「收藏的项目」；
  点动态会带 `focusRequest` 精准定位到那一条（v4.7.5）
- **馆藏**（v4.4 书架 + v4.5 相册 + v4.6 章节目录 + Agent 专属书）：
  **书架**（导入本地 txt / md、卡片显示字数/标注数/进度、重命名、移出书架、
  **按最近阅读排序 + 置顶多本**、**书籍标签分类**（双击重命名、悬停 × 删除、点击筛选）；
  菜单可触发**重建目录**）+ **阅读器**（连续滚动、记住读到哪、md 按 Markdown 渲染；
  选中一段 → **划线 / 高亮 / 复制**，收进**右上角书签**按序排列、点击定位闪烁、可删；
  滑到底进度 100%；**目录页**（v4.6：自动按 md 1~3 级标题 / txt「第 X 章」拆分，章节列表、
  跳转、重命名、移除、新建；当前章高亮跟随滚动；移除只动目录条目、**正文一字不动**）+
  **相册**（图集列表按最近阅读排序、星标集置顶；图集详情发布时间轴；一组 ≤30 张、
  可无图纯文字发布、编辑可拖动排序且**更新不改发布时间**）+
  **星标集**（置顶图集，文章/动态/灵感/相册四标签分类，图片带双链跳原文）+
  **《Agent》专属书**（v4.6：书架上固定存在、不可删除、菜单无「移出书架」、不默认置顶、
  设置关 Agent 开关时**整书从书架隐藏**，直接敲 URL 进阅读器也被守卫拦住；Agent 可写）
- **音乐播放器**（v4.4 升级）：本地音频导入、上一首/暂停/下一首、音量条；**v4.6 新增四种播放模式**
  （顺序 / 随机 / 单曲循环 / 播完暂停）—— 头部按钮点一下循环切换，**只决定「一首自然放完之后
  自动怎么办」**，上一首/下一首永远按列表顺序（手动跳歌不该被播放模式搅乱）；
  **「播完暂停」= 播完本首就停**（v4.7.3 校准，不是「只在最后一首停」）；
  模式状态走 `useMusicStore.playMode`，单一入口 `onTrackEnded()`（`audio.ended` 不再各写各的）
- **Agent**：**多会话聊天**（会话列表 → 点进 → 聊天，新建自动开场白）；气泡流界面
  （借鉴 Ventana React 化，适配三版书房皮肤）；**演示模式**兜底（未配置 API 可全交互体验）；
  资料库 `[[读:文档]]` 按需读取 + **生活数据 `[[读:模块]]` / `[[读:文章·标题]]`**（v4.5.1：
  可读空间文章/动态/灵感/便签/日程/待办/收藏夹/相册）+ 记忆馆 `[[记:]]`/`[[忆:]]`；
  **输入框图片按钮**（v4.5.1：选图入待发队列，随文字一同发送 ≤9 张，不支持视觉的模型自动略过）；
  **写书工具**（v4.6：`[[写:书【章节标题】|正文]]` → 在《Agent》书末新起一章；
  同名自动改成「标题 · 2」；同章正文出现链接时用全角 `］］` ；
  标记格式坏掉不再静默，会回 sys 消息告诉用户并把指引回灌给模型）；**Agent 专属书《Agent》**
  （v4.6：固定存在、不可删、不可置顶、Agent 开关关掉时从书架隐藏、直接敲 URL 也被拦）；
  会话重命名/归档/导出 txt/删除；连接配置（Base URL / API Key / 模型）存本机
- **编辑器**：全屏 Markdown（工具栏 / 预览 / 图片 / **插入正文** / 字数 / 收藏星标 /
  移动端大按钮 + 浮动格式条）
- **全局查找替换**：桌面/移动通用覆盖层（⌘K），**范围：空间 / 动态 / 碎片 / 灵感** +
  页内查找（focusRequest 定位闪烁）
- **数据**：导出 JSON（含图片 Base64）/ TXT / MD / PDF，**范围可多选 8 项**（v4.5.1：
  文章 / 动态 / 便签 / 收藏夹 / 个人资料 / 馆藏·书架 / 馆藏·相册 / Agent 全数据）；
  PDF 内嵌图片 + 居中页码 + **不切行**；**本地文件夹快照备份**（≤10 份，自动清理最早）；
  **WebDAV 全量备份**（云端明文 JSON、全量覆盖=删除同步、可选端到端加密、兼容旧 .json.gz、
  云端恢复 + 配置说明书弹窗）；导入 JSON / MD / TXT
- **设置**：头像（压缩）/ 昵称/签名 / **外观（三主题卡 + 猩红书房方案卡）** / 关于
  （使用说明 / 更新日志 / **清除缓存**（v4.5.1：孤儿文件回收））
- **主题**：暗夜 / 白昼 / 猩红（液态玻璃，光效锚点固定）；**自托管字体**（含中文）
- **兼容与全局**：两层错误边界、PWA 离线、响应式、键盘焦点环、`prefers-reduced-motion`、
  安全区适配、夸克旧内核兼容（legacy + 挂载兜底）

---

## 8. 已知问题与待处理（真实未修项，截至 2026-10-02 / v4.6）

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
- **馆藏 · 长文性能（v4.6.2 实测，原「建议 ≤1 万字」的说法没有数据支撑，已按实测改写）**：
  在无头 Chrome（1280×900，桌面 CPU）与本机 6× CPU 降速（粗略模拟手机）下，用纯段落书与
  带列表/引用/链接/加粗的 md 重排版书各测一遍：

  | 场景 | 块数 | 正文 DOM 节点 | 打开到全部块渲染 | 滚动帧（中位/最慢） |
  |---|---|---|---|---|
  | 1 万字 txt | 170 | 170 | ~130ms | 流畅 |
  | 2 万字 txt | 340 | 340 | ~120ms | 流畅 |
  | 4 万字 txt | 680 | 680 | ~120ms | 流畅 |
  | 23 万字 md（重排版） | 4840 | 17680 | **1065ms** | 16.7 / 17.7ms，>50ms 的帧 0 个 |
  | 23 万字 md + **6× CPU 降速** | 4840 | 17680 | **6079ms** | 30.4 / **148.6ms**，>50ms 的帧 **4 个** |
  | 23 万字 md + 400 条标注 | 4840 | 18458 | 重载到标注就绪 ~1070ms | 664 个 `<mark>`，无报错 |

  **v4.6.3 分批挂载 + 解析缓存之后的同一组测量**（同一台机器、同样的书）：

  | 场景（23 万字 / 4840 块） | 首屏可见 | 全部就绪 |
  |---|---|---|
  | 1×，整页刷新（缓存冷） | 429ms | 937ms |
  | 6×，整页刷新（缓存冷） | 2092ms | 5415ms |
  | 1×，书架点进书（缓存热） | **26ms** | 497ms |
  | 6×，书架点进书（缓存热） | **49ms** | 3129ms |
  | 6×，改动前（对照） | 整页阻塞 **5628ms** | 5628ms |

  把 5.6 秒拆开量过一遍（6× 口径）：`marked.lexer` 112ms、`marked.parser` 12ms、
  **逐块 `sanitizeHtml`(DOMPurify) 1638ms**、解析合计 1886ms，其余约 3.7 秒是 React 挂载 + 布局。
  也就是说：① **解析里 89% 是 DOMPurify**，而同一本书一次浏览会被解析好几遍 → 所以加了
  `parseBook` 的 LRU 缓存（1× 冷 319ms → 热 0ms；6× 冷 1867ms → 热 0ms）；
  ② 剩下的挂载成本靠分批挂载摊到空闲帧（见第 4 节之 26)。

  结论：**1 万字这个门槛比实际能力保守一个数量级**，v4.6.3 已放宽到 5 万字；真正的成本在
  「块数 × 每块 DOM 复杂度」带来的 DOM 规模，而不是解析逻辑本身
  （680 块重套 227 条标注只要 1~2ms，`buildChapters` 也是毫秒级）。
  20 万字级 + 手机 CPU 下**首屏已经很快，但「全部就绪」仍有约 3 秒**，且滚动偶尔掉帧 ——
  再往下要么做「批量净化 / 增量解析」（把同步解析从 1.9 秒压下去），要么做真正的虚拟滚动
  （但那要重新设计偏移数学），两者都属独立课题，见第 4 节之 26) 末尾。
  另：`BookCard` 为了算进度会为**每本书**调一次 `parseBook`（Memo 按 content 缓存），
  书多了仍是一笔固定开销；把块数存成字段可以省掉，属可选优化。
- **馆藏 · 章节体系新增的遗留（v4.6）**：
  - **章节锚点只认块索引**：变更正文会让后面所有块整体位移、整本书标注错位。
    这是为什么「Agent 写书」永远追加到书末；「查找替换」落在书正文上时，v4.6.2 起改为
    逐条重锚定（对得上原文的保留、对不上的才丢并写明是哪几句，见第 4 节之 25)。
    **代价是「就地插入到中间」的写法永久不可用**（用户也别用 `[[写:书【标题|…]]`
    指望它插到指定章节之间）。
  - **md 4~6 级标题不切**：避免目录过碎，但如果用户正文的标题都是 h4（很罕见），
    目录会显示为「整本书一条兜底章节」。
  - **目录页移除章节 ≠ 删正文**：写进「删章节」的提示文案已说明，但**没有额外备份**（备份
    仅在数据导出/WebDAV/快照时），误删章节的恢复路径 = 手动重建（菜单「重建目录」）。
  - **章节字数 = 纯字（剥空白）**：与书卡片上的 charCount 同口径；如果用户希望章节字数含
    空白/换行，需要另开一个字段。
- **馆藏 · 碎片遗留图片没有回收 —— 已解决（v4.5.1）**：设置-关于新增**「清除缓存」**按钮，
  用 `collectFileIds` 的反集回收 `files` 表里无引用的孤儿 blob（确认对话框 + 释放空间提示）。
- **馆藏 · 阅读器内已屏蔽原生菜单，但真机未复测**：Chromium 里实测 `contextmenu` 已取消默认行为，
  触摸端工具条也改到了选区下方（避开安卓原生浮层）；但 **iOS / 安卓真机的长按选择行为没有实测过**，
  系统自带的「拷贝 / 查询」浮层仍可能与我们的工具条同时出现。
- **Agent 接口兼容性**：v4.4.1 起能识别 OpenAI SSE、非流式 JSON、Ollama 形状，并在空返回时给出原因；
  但**只支持 OpenAI 兼容协议**，其它协议（Anthropic / Gemini 原生）仍会报错。
- **Agent 图片以 `![图片](fileRef:id)` 纯文本标记发送**：不支持视觉的模型自动略过（用户要求的行为）；
  若日后要「模型真正看懂图」，需扩 AgentMessage 附件 schema + OpenAI 多模态 content part（未做）。
- **Agent 写书工具的限制（v4.6）**：
  - **只能追加到书末**（见决策 25），不能指定插入位置；用户希望「追加到已有章节末尾」时，
    Agent 会用 `[[写:书【该章节标题】|正文]]` —— 同名会变成「标题 · 2」新建一章，**不是真正
    追加到原章节的末尾**。要做真正的「追加到章末」需要正文里的字符级锚点（见章节锚点决策 23）。
  - **章节标题去重是字面比较**：空格、全角/半角、Markdown 标记都被忽略的程度 = 零，
    「Hello」与「Hello 」算两个不同标题。
- **相册拖拽真机未复测**：桌面 mousedown 拖拽与触屏长按拖拽均在本机浏览器验证过，
  **iOS / 安卓真机长按拖拽与系统图片菜单冲突与否未复测**（div 背景图方案理论上已避开）。
- **WebDAV 旧备份兼容**：v4.5.1 起云端存明文 JSON；此前用加密 + 旧文件名备份的仍可下载解密，
  但新备份会覆盖旧文件（文件名从 .json.gz 变为 .json 时会同时存在两份，属预期）。
- **联网搜索**：v4.6 仍未配置搜索 API（需用户提供 Tavily / Serper / 百度等 key）。
  当前降级行为是如实告知「无法获取实时信息」（AgentTOOL_CONTRACT + agentTurn 已有处理）。
- 低优先级设想：文章加密、静态站点导出、自定义主题色、Agent 写书真正追加到章末（见上）。

- **音乐里可能有「文件缺失」的死曲目**（v4.6.1 之前「清除缓存」误删音频的后果）：
  这些曲目还在列表里、但 blob 永久没了。现在播放会自动跳过它们并在歌单标出「文件缺失」，
  用户重新导入一次即可 —— 这是历史数据的既成事实，不是新 bug。
- **音乐播放依赖浏览器自动播放策略**：首次播放需要用户点一下（这是浏览器的规矩）；
  之后换歌走同一个 `<audio>` 元素换源，所以在手机上也能自动续播（v4.7.6 改）。
  但**页面被系统冻结/切到后台再回来**时能否续播，真机没复测过。

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
- **Agent 写出来的动态/文章缺 `imageIds` → 动态页整页崩 + 导出/备份抛错**（v4.7.5）：
  `agentTools.writeContent('动态'|'文章')` 只传 `{ content }` / `{ title, content, tags: [] }`，
  而 `addMoment`/`addArticle` 是「原样展开传入对象」，于是落库的记录没有 `imageIds`。
  后果有两处：① 动态页渲染 `m.imageIds.filter(...)` 抛
  `TypeError: Cannot read properties of undefined (reading 'filter')`，
  错误边界接管、重试无效（内存数据仍是那个形状）；② 导出/备份里的
  `collectFileIds` 与 PDF 模板同样按数组用它会抛错 —— 也就是说**一条 Agent 写的动态
  能让整个备份链路失败**。
  修法（单一收口，四处都补）：`addArticle`/`addMoment` 补默认值 →
  `normalizeState` 给文章/动态逐条兜底（老数据也能修回来）→ `collectFileIds` 与 PDF 模板
  再兜一层 → 渲染处 `?? []`。
  实测：Agent 真写一条动态 + 一篇文章后，动态页 1 张卡片正常渲染、空间页可见那篇文章、
  JSON / Markdown 导出与 `collectFileIds` 均不抛、打开该动态的编辑器正常；
  另用「缺字段的旧状态」直接调 `normalizeState`，确认文章/动态/灵感的 `imageIds` 都被补成 `[]`、
  动态页能正常渲染。
- **收藏夹点「动态」不定位到那一条**（v4.7.5）：见第 4 节之 28)。
- **相册编辑器会留下孤儿 blob**（v4.6.2）：见第 4 节之 22) 的回收规则。
  修前实测：新建图集 → 选 1 张 → 点取消 → `files` 表里留下 1 个「0 引用」的压缩图；
  修后同一路径 `files` 表回到 0，且提示写明「已取消，本次上传的 1 张照片已丢弃」。
  另实测：上传 2 张 → 移除 1 张 → 发布 → 库里只剩 1 个文件、被 1 个组引用、0 孤儿；
  已有图集再发一组 → 2 个文件全部被引用、2 组、0 孤儿。
- **Agent 改书正文清空全书划线 → 改为逐条重锚定**（v4.6.2）：见第 4 节之 25) 的判定规则。
  实测（无头 Chrome 走真实 UI + 假接口 `[[替:馆藏|…]]` 端到端）：
  - 卡片预测「这本书里有 2 处划线 / 高亮：对得上原文的 1 处会保留，另外 1 处…会被移除」，
    与实际落盘结果一致；
  - 落盘后正文确实被替换，保住的标注锚点逐字对得上原文（`highlight:第三段。这是@2[0,6)`），
    被改掉原文的那条被移除并在 sys 消息里写出原文「第二段。这是」；
  - 阅读器里那条保住的标注正常渲染成 `<mark>`；
  - 纯函数层另测了快路径 / 块被合并后的唯一匹配重锚定（`第三段。` → `@1[4,8)`）/
    三字原文重锚定 / 歧义丢弃 / 原文消失丢弃，**六种情形下「指错位置的标注」都是 0 条**。
- **Agent 写书链路回归验证**（v4.6.2）：`[[写:书【探针章节】|…]]` 端到端跑通 ——
  《Agent》书末新起一章（`探针章节@7..8`）、目录跟着重算、sys 消息「已在《Agent》书末新建章节…」、
  助手气泡无残留标记。
- **「清除缓存」误删音乐 + 备份丢音频**（v4.6.1）：`collectFileIds` 从 v3.0 起就没收过
  `tracks[].fileId`（音乐 v3.0 已存在，v4.5.1 才加的「清除缓存」按钮恰恰拿它的**反集**
  回收孤儿 blob）。实测复现：库里放 1 个音频 + 1 张相册图 + 1 个真孤儿 → 点确认后
  「已清理 2 个无引用图片，释放 5.0 KB」，音频 blob 消失、曲目还在列表里但永远没声音
  （`fileURL` 取不到，原文件不可恢复）；同理三条备份路径只带走歌单不带走音频。
  修后复测：`collectFileIds` 含音频/相册图、不含孤儿；导出的 JSON 包里 2 个文件（含音频）；
  清除缓存只删掉那 1 个真孤儿（4.0 KB），音频与照片完好。
  另核对过：音乐没有独立的导出范围（`scopedState` 里 `tracks: []` 是刻意的），
  只有全量导出 / WebDAV / 快照会带走曲目。
- **目录章节增删会永久位移块索引**（v4.6.1）：`addBookChapter` 早先把已有章节的
  `from/to` 整体 +1（把「目录条目」当成「正文块」），`removeBookChapter` 又不减回去 ——
  于是「新建章节 → 再删掉」之后，后面每条章节永久晚一块（实测 3 章 9 块的书
  `from` 从 `[0,3,7]` 变成 `[0,4,8]`，每操作一轮再偏一块），目录点击跳到下一段、
  「正在读」高亮错章；新建时还会与上一章区间重叠（两条都声称拥有第 7 块）。
  改为抽出 `retargetChapters(skeletons, blocks)`：`to` 与字数一律由正文和「下一条章节
  的起点」推出，增删只改起点集合；同一块上重复新建返回 `false`（UI 提示「这一段已经是
  章节开头了」，不再叠出两条同 `from` 的死条目）。
  修后复测：加在块 4 → `[0..2, 3..3, 4..6, 7..8]` 无重叠；移除 → 精确回到 `[0..2, 3..6, 7..8]`，
  块归属 0-2/3-6/7-8 与原文一致；同块重复新建返回 false 且条数不变。
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
| 改导出 / 备份 | `lib/exportImport.ts`（`SCOPES` 与 `scopedState`）；快照相关在 `lib/snapshot.ts`。**新增数据模块时：`exportMarkdown` 与 `exportPDF` 的 HTML 模板各要加一段，`scopedState` 的 `notes`/按范围分支要带上新字段，`snapshot.ts` 的 `counts` 也要并进去** |
| 给便签加一个分页 | `types` 的 `NoteTabKey` → `useUIStore.notesTab` → `SegmentedControl` 的 `TABS`（含计数）→ `NotesPage` 渲染分支 → `TopBar` 的 `ROUTE_TITLES['/notes']` 副标题 → 新 `*View.tsx` |
| 改 PDF 版式 | `lib/exportImport.ts` 的 `exportPDF` + `computePageCuts` —— **先看第 12 节** |
| 改 WebDAV / 加密 | `lib/webdav.ts`（协议/加密/取回）+ `pages/DataPage.tsx`（UI + BACKUP_GUIDE 文案） |
| 改首页 | `pages/DeskPage.tsx` + `components/home/*` |
| 改编辑器 | `components/editor/*` + `globals.css` 的 `.prose-vidaos` |
| 改查找 | `components/search/*` + `lib/focusRequest.ts` + `useUIStore`（findPanel / focusRequest / FocusKind） |
| 改馆藏 | `pages/LibraryPage.tsx`（书架/导入/Agent 书隐藏）+ `pages/ReaderPage.tsx`（阅读器/工具条/书签/目录页）+ `lib/library.ts`（切块与锚点数学 + 章节解析 `buildChapters`/`chapterIndexOfBlock`）+ store 的 book actions |
| 改 Agent 书 / 章节体系 | `lib/library.ts`（`AGENT_BOOK_ID` / 章节类型）+ `lib/db.ts`（`AGENT_BOOK()` / `normalizeState` 兜底）+ `useAppStore.deleteBook`（`AGENT_BOOK_ID` 直接 return）+ `useAppStore` 的 `setBookContent`/`addBookChapter`/`renameBookChapter`/`removeBookChapter` |
| 改 Agent 对话 | `lib/agentEngine.ts`（纯函数：端点/消息/索引/截取/标记 `scanTools`/`brokenKinds`/演示模式）+ `lib/agentTurn.ts`（一轮回复，**改这里两处同时生效**）+ `components/agent/AgentChatView.tsx`（会话页 UI）+ `pages/AgentPage.tsx`（会话列表）——**逻辑改完跑引擎单测** |
| 改 Agent 写书工具 | `lib/agentTools.ts`（`writeBookChapter` / `uniqueChapterTitle` / `applyReplace` 的 book 分支走 `setBookContent` 并清空标注）+ `agentEngine.ts` 的 `TOOL_CONTRACT`（格式铁律）+ `agentTurn.ts` 的 `brokenKinds` 处理；改完跑一次「把这段存进书里」的端到端 |
| 改音乐模式 | `stores/useMusicStore.ts`（`PLAY_MODES` / `playMode` / `onTrackEnded` 单一入口）+ `components/home/MusicPlayerCard.tsx`（模式按钮 UI）；改 `MODE_ICON` 一并改 `<title>` hint |

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
   **要验证工具标记（写书 / 查找替换）时，给假接口加两条会吐标记的路由**
   （本机 `/tmp/vp/mock-api.mjs` 已有 `/write-book`、`/replace-book`，按用户那句话里的暗号切换脚本），
   把 `agentConfig.baseUrl` 指过去，然后在会话里真发一条消息 —— 这样能端到端跑到
   `scanTools → writeContent/proposeReplace → 确认卡片 → applyReplace` 整条链，
   连「标记被拆到两个 SSE chunk 里也能解析」都一起覆盖了（v4.6.2 就是这么验的）。
   注意假接口里的工具标记**要按 12 字一段切开流式吐**，别一次性整段返回。
3.5 **用户给的参考图 / 截图，模型看不到时也能「读」**（v4.7 实用技巧）：
   本机是 macOS，可以用自带的 Vision 框架做 OCR（支持中文），不需要装任何依赖：
   ```bash
   # 写个 20 行的 Swift 脚本，VNRecognizeTextRequest + zh-Hans，输出每段文本的坐标
   mkdir -p /tmp/vp/ocr/mc /tmp/vp/ocr/tmp
   CLANG_MODULE_CACHE_PATH=/tmp/vp/ocr/mc SWIFT_MODULE_CACHE_PATH=/tmp/vp/ocr/mc \
     TMPDIR=/tmp/vp/ocr/tmp /usr/bin/swift -module-cache-path /tmp/vp/ocr/mc ocr.swift <图片>
   ```
   ⚠️ 必须把 module cache / TMPDIR 指到可写目录（沙箱不让写 `~/Library` 与默认 `/var/folders` 缓存），
   否则报 `unable to open output file ... ModuleCache`。
   再配合 Pillow 的结构分析（按行/列统计暗像素找分隔线、把图缩成 ASCII 结构图、
   取主色）就能还原出**布局骨架 + 文案 + 配色**，足够实现一个「参考图样式」的需求；
   本会话就是这么读《碎片时间线参考图片.jpg》的（1220×2592 竖图、米白底、左侧竖轨 + 近黑圆点、
   `时间轴 • TIMELINE` 分节标题、条目为「圆点+时间」一行 + 「标签+正文」一行）。
   注意：这只能得到**结构和文字**，审美判断仍然要交回用户（把截图给用户看）。

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
- **在页面里 `import()` 应用自己的模块时，必须用应用加载过的那个 URL**：dev server 会给模块加
  `?t=` 失效戳（`index.html` 里就是 `/src/main.tsx?t=…`），裸路径 `import('/src/stores/useAppStore.ts')`
  会新建**第二个 store 实例** —— 你通过它改数据「成功」了，但页面 DOM 一动不动；
  你读它得到空状态，而页面明明有数据。取法：
  `performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/\/stores\/useAppStore\.ts/.test(n))`
  里带 `?t=` 的最后一条（第 12 节教训 26）。同理，`getState()` 拿到的快照在你 `set` 之后就是旧的，
  **改完要重新 `getState()` 再断言**。
- **验证「派生数据」（章节区间、字数、进度、序号）时，别只看「新条目出现了」**：
  打印完整列表做操作前后对比，并断言「加一条再删掉必须回到原值」（第 12 节教训 24）。

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
24. **派生数据只能由「源」重算，不能对旧值做加减（v4.6.1 实测）**：馆藏目录的 `from/to`
    是正文块索引的**投影**。v4.6 的 `addBookChapter` 把已有章节 `from/to` 整体 +1
    （把「插入一条目录条目」误当成「插入一块正文」），`removeBookChapter` 又只 filter
    不减回去 —— 于是「新建章节 → 再删掉」这一轮下来，后面每条章节永久晚一块，
    而且每操作一轮就再偏一块。实测一本 3 章 9 块的书：章首 `from` 从 `[0,3,7]`
    变成 `[0,4,8]`，目录点击跳到下一段、「正在读」高亮错章；新建时还会与上一章区间重叠
    （两条都声称拥有第 7 块）。**凡是「由别的东西算出来的字段」（区间、字数、序号、进度），
    增删改之后都要回到源头重算一遍**；拿旧值做 `+1/-1` 只在「源本身同步位移」时才成立，
    而这里源（正文）根本没动。
    顺带一条自查法：这类 bug 不会报错、UI 也不崩，只会「差一点」。所以修完要**打印出
    完整派生列表做前后对比**（这里是 `[title@from..to(charCount)]` + 每块归属章号），
    再断言「操作一轮后必须回到操作前的值」——而不是只看「新章节出现了」。
25. **同一个「收集引用」函数会被多个用途共用，漏一项就是数据丢失（v4.6.1 实测）**：
    `collectFileIds` 同时被三条备份路径（导出 JSON / WebDAV / 本地快照）和设置里的
    「清除缓存」使用 —— 后者拿它的**反集**当孤儿回收。它从 v3.0 起就没收过
    `tracks[].fileId`（v4.5.1 才加的清除缓存按钮让这个遗漏从「备份不完整」升级成
    「静默删除用户数据」）。实测：库里 1 个音频 + 1 张相册图 + 1 个真孤儿，点确认后
    提示「已清理 2 个无引用图片」，音频 blob 消失、曲目仍在列表但永远没声音。
    **教训：写「按引用回收」的功能前，先把「什么算引用」逐个模块过一遍**
    （文章/动态/灵感/相册/星标集/头像/背景/音乐/…），并给这个函数配一份「新增数据模型时
    必须回来登记」的注释；`collectFileIds` 顶部已加。
26. **探针里 `import('/src/stores/useAppStore.ts')` 拿到的是另一个 store 实例（v4.6.1 实测）**：
    dev server 给模块加了 HMR 失效戳，`index.html` 里是 `/src/main.tsx?t=1790920124643`，
    整个模块图都带 `?t=`；而探针从 `Runtime.evaluate` 里裸路径 `import()` 会**新建一份模块**。
    症状极具误导性：通过裸路径 `addBook` 会「成功」（自己那份实例确实加上了），
    但页面 DOM 毫无变化；反过来看页面 DOM 里明明有的东西，裸路径读出来是空的 ——
    很容易误判成「导入不生效」「数据被吞了」。
    正确做法：从 `performance.getEntriesByType('resource')` 里挑应用真正加载过的那个 URL
    （`/stores/useAppStore.ts` 且带 `?t=` 的最后一条）再 `import()`；
    另外**同一份 `getState()` 快照在 `set` 之后就是旧的** —— 改完数据要重新
    `getState()` 再读，否则会把「已经生效」看成「没生效」（这个也踩过一次）。

27. **文档里的性能结论要有实测支撑，否则会一路误导后来人（v4.6.2）**：交接文档一直写着
    「馆藏单本建议 ≤1 万字，太长会卡」，但没有任何测量。实测下来 4 万字 / 680 块打开约 120ms、
    滚动的慢帧也只有 17.7ms；真正的分水岭在 20 万字级 + 手机级 CPU（6× 降速）：
    打开 6 秒、滚动出现 4 个 >50ms 的帧。**「建议 1 万字」比实际能力保守了一个数量级**，
    而且把注意力引到了错的地方 —— 瓶颈不是解析（`parseBook` 38k 只要 1.08ms），而是 DOM 规模。
    教训：写「建议 / 上限 / 会卡」这类结论时，把测法、机器/降速条件、具体数字一起写进文档；
    没有数字的性能判断，宁可先写「未实测」。
    补充一个实操点：测移动端表现不要靠猜，用 `Emulation.setCPUThrottlingRate({ rate: 6 })`
    降速比换设备快得多，也能给出可比数字。

28. **「分批做一件事」会破坏所有依赖「已经全部就绪」的隐性前提（v4.6.3 实测三处）**：
    为了不让长文一次性阻塞，阅读器改成先挂 60 块、其余按空闲补齐。结果三处代码全部中招，
    而且都不会报错，只会表现成「奇怪但说不清」：
    - **`atBottom()` 被短容器骗了**：还没挂完时 `scrollHeight ≈ clientHeight`，于是「滚到底了」
      恒为真 —— 书一打开就写 `lastBlockIndex = 最后一块`，进度永远 100%。修法是加一条
      「还有块没挂载 → 不算到底」的守卫（要用 ref 读最新值，IO 回调里拿不到新 state）。
    - **「DOM 里找不到」不再等于「数据不存在」**：目录跳转原本用 `querySelector` 找不到就报
      「这一章的正文已经不在了」。分批挂载之后，没挂载的章也找不到 → 把正常情况误报成数据损坏。
      正确的失效判据是**块索引是否越界**；没挂载就先把前面的块挂出来、进了 DOM 再滚
      （滚动位置本来就依赖前面所有块的高度，跳深处必然要挂出来）。
    - **延迟落位会和用户抢滚动条**：恢复上次位置要等目标块挂载，如果用户已经自己往下看了，
      几秒后跳过去就是把人拽走。加了 `userScrolledRef`，只认 `wheel`/`touchstart`/`keydown`
      这类明确的人工滚动事件（程序化 `scrollIntoView` 不会触发），一旦用户动过就放弃这次恢复。
    结论：做「分批 / 懒加载 / 虚拟化」时，先把所有「读全量」的地方列出来（进度、
    边界判定、跳转、恢复、导出、统计），逐个问一句「它假设的是全部还是部分」。
    另外一条实务经验：**分批挂载比虚拟滚动安全得多，因为「最终全都在 DOM 里」这条不变式保住了**
    —— 标注锚点、跨块选区、进度观察全都不用改。真要做虚拟滚动，那套偏移数学要重新设计。

29. **嵌套绝对定位要写清参照系；一条删除路径不要做两次确认（v4.7 实测）**：
    做碎片时间轴时两个「看着没问题、一量就错」的坑：
    - **圆点偏了整整 24px**：竖轨是 `<ol>`（relative）的绝对子元素（`left:8` 相对 ol 的
      padding box），而圆点在 `<li>`（也是 relative）里、li 的左边界已经被 ol 的 `pl-6`
      推到 +24 —— 我以为「都写 left:8 就对齐了」，实测圆点中心 48.5 vs 竖轨 24.5，
      整整掉进正文里。正确值 `left: -20`（= 8.5 − 24 − 4.5）。
      **规矩：嵌套的 absolute 元素，坐标注释里必须写明「相对谁的 padding box」。**
      同理，圆点用 `top:50% + marginTop:-4.5` 挂在行上而不是写死 `top`：
      那一行的高度会被 24px 的操作键撑起来，写死的值必然偏（实测偏 5.8px，改成相对居中后
      逐条精确相等）。**能用「相对自身/父级」表达的定位，就不要写死像素。**
    - **一次删除弹了两个确认**：我在条目里做了行内「删掉这条碎片？」面板，
      `onDelete` 里又调了应用统一的 `confirmDialog` —— 用户要点两次，探针也误判成「没删掉」。
      **删除只做一层确认**，并跟同模块的既有做法保持一致（灵感/待办都是
      `confirmDialog` + 立即删除）。加交互前先看同模块的兄弟组件怎么做的。
    另外记一条经验：这两处都不是编译期能发现的，**是靠探针量出坐标、数出确认次数才暴露的** ——
    写 UI 时也该给出可量化的断言（元素中心坐标、按钮点击次数），别用「看起来对」。

30. **同一个组件写两份，补丁只会打在看得见的那一份上（v4.7.1）**：主页日历与碎片日历是两段
    各写各的 JSX，样式类几乎一样、**只差一个 `cal-selected`**。日间主题为了修
    「选中日太淡看不清」写了一条 `:root[data-theme='day'] .cal-selected` 覆盖规则 ——
    它只对带了那个类的主页日历生效，碎片日历于是继续用「浅玫瑰 30% 透明底 + 米色字」，
    实测对比度低到数字几乎不可辨。**这类 bug 只在某个主题下出现，深色主题下完全正常**，
    所以自测如果只用一套主题就会漏掉。
    两条规矩：① 同一块 UI 出现第二次就抽成组件（这次顺手把标题栏抽成了 `CalendarNav`）；
    ② 「视觉可读性」要能量化 —— 写了个把元素背景**逐层 alpha 合成**、再算 WCAG 对比度的探针，
    三套主题 × 两个日历一次跑完，谁低谁高一眼看出来（修前日间几乎不可辨，修后 5.21:1）。
    同批修的还有**移动端四格分页被挤成竖排**：这类问题也只能靠量
    （`span.getClientRects().length === 1` + 按钮 `scrollWidth <= clientWidth`），
    「看起来还行」在 390px 宽的手机上不可靠。

31. **两个小坑，都只有量了才看得见（v4.7.2）**：
    - **`flex: 1` 不等于「等宽」**：两个并排按钮想要严格平分整行，得同时满足两件事 ——
      ① `min-w-0`（flex item 默认 `min-width: auto` 会被内容撑开）；
      ② **两边 padding 一致**。第二条特别反直觉：`flex-basis: 0%` 下 Chrome 是把剩余空间分给
      **内容盒**的，padding 会额外叠上去 —— 所以 `.btn-ghost`(14px) 与 `.btn-primary`(18px)
      并列时，实测宽度是 154 vs 162（正好差 8 = 2×(18−14)）。
      自定义类的 padding 定义在 `@tailwind utilities` 之后，utility 压不住它，只能用内联 style 统一。
    - **「同一帧内连点两格」会读到旧闭包**：自绘的年月/时间选择器里，点「7 点」再点「5 分」，
      第二个回调拿到的还是渲染时的旧 `h`，于是拼出「23:05」（小时被旧的覆盖）、
      点「2024 年」再点「2 月」得到「2026 年 2 月」。真人手速慢通常看不出来，但它是个真 bug：
      **多个可点格组合出同一个值时，要用 ref 保存最新值**（或把状态合并成一个对象走函数式更新），
      不要依赖「反正 React 会先重渲染」。
    这两个都是我自己写完觉得「应该没问题」、被探针一量就露馅的。**UI 的断言要落到数字上**
    （元素宽度、按钮是否有取消键、点完之后的实际值），别用「看着对」。

32. **「键盘弹起时藏起 fixed 元素」有两层坑，第二层只有真机会暴露（v4.7.3）**：
    - **第一层：判不出键盘**。`window.innerHeight - visualViewport.height > 阈值` 这个写法
      只覆盖「布局视口不变、只有视觉视口变矮」的内核模型（Android 默认的 resizes-visual）。
      iOS Safari 与 `interactive-widget=resizes-content` 下 **innerHeight 自己也会缩**，
      两个数一起减 → 差值≈0 → 判不出键盘 → 底栏照常显示，被键盘顶着。
      正解：统一用「**基准可见高度 − 当前可见高度**」，基准取
      `min(visualViewport.height, innerHeight)` 且只在无键盘时向上更新
      （地址栏伸缩只有几十像素，不会误判；转屏时按宽度变化重置基准）。
    - **第二层：判出来了也藏不干净**。原来靠 `transform: translateY(100%)` 把底栏滑出，
      但键盘弹出时有些内核会**把布局连同 fixed 元素一起上推一个键盘的高度** ——
      往下挪 56px 远远不够，底栏仍露在键盘上方。`display: none` 才彻底
      （代价是没有滑出动画；被顶起来挡住输入这种事，正确性优先）。
    - 记录这条的另一个原因：**同一个问题的两个原因会互相掩盖**。用户报「底栏被顶上去了」，
      我先怀疑检测、又怀疑 CSS，最后发现两处都得改；只改一处会以为「修好了」，
      到真机上还是一样的现象。修这类「只在真机上出现」的 bug，最好把信号（`data-kbd`）
      显式写到 DOM 上（`<html data-kbd>`），探针与真机都能直接读到当前判定结果。

33. **用户指着「输入框」时，改的是那个控件，不是包含它的面板（v4.7.4）**：
    用户说「猩红书房下 Agent 的输入框底色改一下」，我直接把 `--agent-panel-bg` 覆盖了 ——
    可那是 Agent **面板/卡片的共用底色**，于是配置卡片、会话面板、聊天输入区一起变了色，
    范围远超他指的那一处（他随后澄清「只改输入框底色」）。
    教训：**动手前先确认目标元素用的是哪个变量、这个变量还被谁用**
    （`grep 变量名` 一行就能看清）。共用变量要么新增一个更细的、要么只在目标元素上覆盖，
    别为了改一处去动一层。
    具体到 Agent 现在分三层：面板/卡片 `--agent-panel-bg`、表单输入框 `--field-bg`、
    聊天输入区 `--agent-composer-bg`（新增，默认跟随面板色）。

34. **「跳过去找不到那一条」的真凶可能是目标页根本没能渲染（v4.7.5）**：
    用户报「收藏夹里点动态不能定位到具体位置」。我按常规思路补上 `focusRequest`
    再写探针验证 —— 结果探针说「目标卡片不在 DOM 里」，看起来像定位逻辑没生效。
    继续挖才发现：**动态页整页走了错误边界**，报
    `Cannot read properties of undefined (reading 'filter')`，根因是 Agent 的写工具
    产生的动态缺 `imageIds`（`addMoment` 原样展开传入对象，没兜数组字段）。
    也就是说「定位失败」是表象，底下压着一个 P1 崩溃。
    两条经验：
    ① 探针断言「找不到目标元素」时，**先把页面实际内容 dump 出来**
    （`document.body.innerText` 的前几行就够）—— 如果看到「这一页出了点问题」，
    方向就完全不同了，别一头扎进滚动/定位逻辑里调参数；
    ② **凡是「外部输入能构造出对象」的入口（Agent 工具、导入、旧备份），
    数组/可选字段必须兜底**。这里按「单一收口」补了四层（store 动作 → normalizeState →
    导出层 → 渲染层），因为这三类入口和四条渲染路径都可能碰到它。
    顺带记一个反直觉点：`addArticle`/`addMoment` 的签名写着
    `Omit<Article,'id'|'createdAt'|'updatedAt'>`，TypeScript 是**允许 `imageIds` 缺失**的
    吗？不 —— 类型上必填，但 `agentTools` 里用了 `as never` 断言把它绕过去了，
    所以编译器一声不吭。**看到 `as never` / `as any` 就要想到「类型检查在这里是失效的」**。

35. **「放完自己停了」这类静默失败，根因往往是「遇到坏数据直接 return」（v4.7.6）**：
    用户报「移动端随机播放，这首放完就自动暂停」。查下来是两个问题叠在一起：
    ① 移动端自动播放策略按**元素**放行，原实现每首 `new Audio()` 所以自动续播会被拦；
    ② 「文件取不到」的歌让 `play()` 直接 `return`，状态停在上一次 `release()` 留下的
    `isPlaying:false` —— 用户看到的就是「停了」。随机播放之所以最明显，是因为它**随机**挑，
    挑到坏文件才犯，所以看起来像「随机模式坏了」而不是「某首歌坏了」。
    两条规矩：
    - **播放/渲染这类「自动继续」的路径，遇到坏条目要能跳过并继续**，整轮都不行才停下报错；
    - **任何 `catch {}` / 提前 `return` 都要问一句「用户会看到什么」** ——
      静默 return 出来的现象是「莫名其妙停了」，最难排查。
    另外记一条**验证方法上的教训**：我一开始断言「`playError` 应该有值」，结果一直是 `null` ——
    因为主页的 React effect 读到它就弹 toast 并**清掉了**（这是设计）。
    **断言要落在「用户看得见的东西」上（toast 文案、歌单里的标记），而不是被消费掉的中间状态**；
    中间状态有读取方时，它转瞬即逝，探针晚一步就读到空。

---

## 13. 变更日志

### [v4.7.6] - 2026-10-04 —— 空间标签栏目 + 修随机播放「放完就停」

> 用户两件事：空间加标签栏目、移动端随机播放放完自动暂停。

1. **空间标签栏目**（合集与文章之间）：派生自文章、点击筛选、双击改名、× 删除（带确认）；
   筛选条件随标签消失/改名自动同步。实测：栏目顺序 `collections → tags·3 → articles`；
   点「技术」→ 只剩两篇且头部显示 `articles · #技术`；双击改名「技术→技术笔记」→
   两篇文章同步改、标签计数变 2、筛选条件跟着改；删除「生活」→ 从文章摘掉、文章数仍为 3、
   标签栏不再显示它。
2. **随机播放放完自动暂停**：单例 `<audio>` 换源（移动端自动播放）+ 跳过取不到文件的歌 +
   失败原因弹 toast + 歌单标注「文件缺失」。实测见第 2 节 v4.7.6 条目的具体数字。

截图：`docs/fragments-v47/space-tags-mobile.png`、`space-tags-filtered.png`。

### [v4.7.5] - 2026-10-04 —— 收藏夹定位与类型标注 + 猩红 Agent 配色 + 修 imageIds 缺字段崩溃

> 用户提了两件事（收藏夹、猩红配色），验证第一件时又挖出一个 P1 崩溃，一并修了。

1. **收藏夹点动态能定位到那一条**（`FavoritesPage` + `focusRequest` + `.vd-focus-card`）：
   带 `focusRequest` 跳 `/moments`，动态页按 id 滚到卡片并高亮。
   实测：路由到 `#/moments`、focusRequest 已消费、目标卡片在 DOM 且在视口内、带高亮 class。
2. **收藏夹每条标注类型**：元信息行加「文章 / 动态」标签（灵感不在收藏夹，见第 4 节之 28)。
3. **猩红 Agent 配色**：面板 `rgba(46,31,54,.82)`、卡头 `rgba(122,54,88,.62)`、
   强调 `#C48BA0`、弱化文字 `rgb(180,154,168)`；对比度 6.96 / 6.75 / 5.66；
   输入框仍是 `#1f131d`；暗夜面板保持 `rgba(50,48,43,.85)` 不变。
4. **修 Agent 写工具缺 `imageIds` 导致的整页崩溃**（见第 8.3 节）。

截图：`docs/fragments-v47/`（收藏夹列表、跳转后的高亮、猩红 Agent 配置页）。

### [v4.7.4] - 2026-10-04 —— 猩红输入框底色：收窄范围 + 换成 #1f131d

> 用户澄清上一版改错了范围。

1. `--agent-panel-bg` 不再为猩红覆盖（面板/卡片恢复原样）；
2. `--field-bg`（配置页输入框）与新增的 `--agent-composer-bg`（聊天输入区）= `#1f131d`；
3. 实测见第 2 节 v4.7.4 的表格：猩红两个输入表面都是 `rgb(31,19,29)`，
   面板/卡片是 `rgba(50,48,43,.85)`；暗夜与日间三项全部未变。

### [v4.7.3] - 2026-10-04 —— 六处小修（音乐语义 / 默认分页 / 文案 / 猩红底色 / 时间弹窗 / 键盘与底栏）

> 用户逐条反馈，六条都按实测收口。

1. **「播完暂停」= 播完本首就停**（`useMusicStore.onTrackEnded` + `PLAY_MODES.hint`）：
   把 `stop-after` 分支提到「按顺序往下走」之前。实测：列表第 1/2/3 首放完都不换歌、
   `isPlaying=false`、进度 1；**手动点下一首照常切歌**（丙 → 乙 且在播），
   切过去那首放完仍然停。
2. **便签默认落在碎片**（`useUIStore` 初值）：实测 `notesTab='fragment'`、日历已渲染、
   高亮的正是「碎片」那一格。
3. 输入区提示 →「记到此刻」。
4. **猩红 Agent 底色 = `#181419`**（`--agent-panel-bg` / `--field-bg`）：
   实测三主题取色：暗夜 `rgba(50,48,43,.85)`（不变）、日间 `rgba(241,239,218,.94)`（不变）、
   猩红 `#181419`；Agent 聊天输入区实际渲染 `rgb(24,20,25)`。
5. **日程 / 动态的选时间改用应用内弹窗**（`ScheduleEditor`、`MarkdownEditor` 复用 `TimePicker`）：
   实测两处都不再有原生 `type=time` / `type=datetime-local`；日程选 07:05 → 落库 `time='07:05'`；
   动态选 09:30 → 落库 `createdAt` 的时分 09:30（日期仍由原生 date 输入承担，
   保留「保存时读日期 DOM 最终值」的既有可靠性设计）。
6. **键盘弹出时底栏与加号不再被顶上去**（`lib/keyboard.ts` + `globals.css` + 四处 `.vd-fab`）：
   实测（用 CDP 改设备高度模拟）：缩 60px（地址栏级别）不误判；缩 300px →
   `data-kbd=open`、底栏与加号 `display: none`、内容区 80px 避让同时收回；
   恢复高度 → `data-kbd=closed`、两者都回来。

截图：`docs/fragments-v47/`（猩红 Agent 输入区、动态时间弹窗、键盘弹出时的便签页）。

### [v4.7.2] - 2026-10-02 —— 猩红卡片形变 / 补记输入区重排 / 年月与时间改应用内弹窗

> 用户逐条反馈，三条都按实测收口。

1. **猩红主题卡片点击时「跳来跳去」**（`globals.css`）：删掉触屏下 `.glass-card:active`
   的 `transform: scale(0.982)`（它把整张卡连同文字一起缩放，且作用于所有卡片），
   换成只压一层边缘光。实测触屏 + 猩红：`transform: none`、`transition: box-shadow 0.3s`。
2. **补记输入区重排**（`FragmentView.tsx`）：四行布局（正文 / 标签+时间 / 提示 / 按钮），
   按钮等宽平分整行并内联统一 padding。实测 390px 下四个控件全部落在卡片内
   （卡片 16–374，最右控件 357），取消/记下 等宽。
3. **时间与年月都改应用内弹窗**（新增 `components/common/TimePicker.tsx`、
   `YearMonthPicker.tsx`；`CalendarNav.tsx` 改为标题按钮 + 弹窗）：
   两者都带「取消 / 确认」，面板宽 358 < 视口 390（不占满屏），页面上不再有任何原生
   `select` / `input[type=time]`。实测「取消」不改视图、「确认」正确跳到 2024 年 2 月（29 天）。
4. **顺带**：选中态统一成 `.vd-selected`（变量承担主题差异），
   并修掉两个选择器「同帧连点读到旧闭包」的真 bug（教训 31）。
   回归：三主题选中日对比度 5.21 / 5.04 / 6.31 不变；移动端分页仍为 1 行；主页日历点日期仍联动。

截图：`docs/fragments-v47/`（补记输入区、时间弹窗、年月弹窗、三主题碎片页）。

### [v4.7.1] - 2026-10-02 —— 碎片页四处体验修复（日间选中日 / 选年月 / 分页竖排 / 补记时刻）

> 用户逐条反馈，四条都按实测收口。

1. **日间主题下日历选中日看不清**（`FragmentView.tsx`）：补上 `cal-selected`。
   实测对比度：日间 **5.21:1**、暗夜 5.04:1、猩红 6.31:1；两个日历在同一主题下逐项一致。
2. **主页与碎片的日历都支持选年 / 月**（新增 `components/common/CalendarNav.tsx`，
   `CalendarCard.tsx` 与 `FragmentView.tsx` 共用）：原生 `<select>` + `ChevronDown` 提示，
   年份 1946~2036；**翻年月只改视图、不动选中日期**。实测：碎片选 2024 年 2 月 →
   29 天且无 2/30（闰月）；主页选 2023 年 2 月 → 最大日 28。
3. **移动端便签分页不再竖排**（`SegmentedControl.tsx`）：窄屏收紧内边距/间距 + `whitespace-nowrap`。
   实测 390 / 360 / 桌面三档均为 1 行、文字高 14px、无溢出。
4. **补记可指定具体时刻**（`useAppStore.addFragment` 增加 `at` 参数 + `FragmentView` 的
   `type="time"` + `touched` 标记）。实测：补记到 2026-09-15 改成 07:05 →
   `date` 与 `createdAt` 的日历日都是 09-15、时刻 07:05、时间轴显示 07:05；
   今天不动输入框 → 用真正的 `now()`。

截图在 `docs/fragments-v47/`（白昼修复后的碎片页、补记输入区、移动端分页栏、主页日历）。

### [v4.7] - 2026-10-02 —— 便签新增「碎片」（日历 + 当天时间轴）

> 用户需求原话：便签处加一个【碎片】页，日历模块（点击可以跳转日期）＋下方极简时间轴显示当天
> 时间线；点加号输入内容、自动记录当下时间、按天储存；导航变为「碎片 灵感 日程 待办」；
> 碎片要进数据页的导出；样式参考图片、注意皮肤主题适配。
> **接手说明**：上一个 agent 做完了数据层（types / db / store / 导出范围 / 导航 / 分页注册），
> 但在 `NotesPage` 里 import 了一个还不存在的 `FragmentView` 时中断 —— 工作区当时是**编译不过**的。
> 本次补齐了组件、导出遗漏与文档。

1. **新增 `src/components/notes/FragmentView.tsx`**：月历 + 当天时间轴 + 加号输入区。
   - 月历：点日期跳转（与主页共用 `selectedDate`）、有碎片的日期带圆点、`今 / ‹ / ›`、
     格高固定（`h-9` 而不是 `aspect-square` —— 便签页是整页宽，桌面端方格子会撑成巨格）；
   - 时间轴：竖轨 + 圆点，圆点与「时间」同行、正文在下、条目间无卡片无分隔线；
   - 输入：加号展开，`Enter` 记下 / `Shift+Enter` 换行 / `Esc` 取消；
     时间戳不是用户填的，输入区直接写明「记到 今天 21:04」或「补记到 9 月 30 日」；
   - 条目可就地编辑、可删除（走应用内 `confirmDialog`，与灵感/待办一致）。
2. **导出接线**：`exportMarkdown` 与 `exportPDF` 的 HTML 模板各加「碎片」段（按天分组、组内从早到晚）；
   `snapshot.ts` 的 `counts.notes` 并入碎片条数。
3. **顺手修的**：`db.ts` 里 `date` 兜底改用 `todayKey()`（不依赖 `toLocaleDateString` locale 数据）；
   `TopBar` 的便签副标题补上「碎片」（原为「灵感 · 日程 · 待办」）。
4. **实测（无头 Chrome 走真实 UI，全绿）**：
   - 几何：圆点中心与竖轨 x 完全重合（24.5 / 24.5），且圆点中心 y 与时间行中心**逐条精确相等**；
     正文在竖轨右侧 15.5px；时间轴按 08:12 → 12:40 → 21:05 升序；
   - 加号不被底栏遮（加号底 748 < 底栏顶 787）；加号→输入→Enter 落库为今天、条数 +1；
     编辑即时生效；删除走应用内确认、删后无残留；
   - 日历：点本月格子 → 汇总行变「10 月 1 日 · 周四」；跨月（上个月 → 30 日）→
     时间轴切成 `['09:30','22:15']`、汇总行「9 月 30 日 · 周三」；「今」按钮回到今天；
   - 主题：三套主题的 `--bg-base` / `--card-bg` **三值互不相同**，文字色至少两套不同
     （猩红故意复用暗夜的文字色），说明主题适配真的生效；
   - 导出：Markdown 有「## 碎片」+ 按天分组 + 内容；JSON 7 条；按「便签」范围导出 7 条；
     按「文章」范围导出时 `notes.fragments` 是 `[]`（不是 undefined）；
     **PDF/HTML 路径**趁 `exportPDF` 把 HTML 写进临时容器时抓下来验证，确认有「碎片」段与内容。
5. **截图**：`docs/fragments-v47/`（移动端 暗夜/白昼/猩红 + 桌面端暗夜）。

### [v4.6.3] - 2026-10-02 —— 长文分批挂载 + parseBook 缓存 + 导入建议值放宽

> 接 v4.6.2 的性能实测（瓶颈是 DOM 规模，不是解析）继续做。先把 23 万字重排版书
> 的 5.6 秒拆开量了一遍：`marked.lexer` 112ms、`marked.parser` 12ms、
> **逐块 `sanitizeHtml`(DOMPurify) 1638ms**、解析合计 1886ms、其余约 3.7 秒是 React 挂载 + 布局
> （6× CPU 降速口径）。

1. **阅读器分批挂载**（`src/pages/ReaderPage.tsx`）：新增 `renderedCount`
   （首屏 `FIRST_SCREEN_BLOCKS = 60`，每批 `BLOCK_CHUNK = 240`，`requestIdleCallback(timeout:250)`
   补齐），`blocks.slice(0, renderedCount)` 渲染。配套改动：
   - 标注 effect 与 IO 观察都要跟着 `renderedCount` 走（后补的块也得套标注、进观察集）；
     IO 存进 `ioRef`，另用一个 effect 把新块补进同一个观察器；
   - `atBottom()` 加守卫 `renderedCountRef.current < blocks.length → false`（否则容器还短时
     会被误判成「到底了」，书一打开就显示 100%）；
   - 恢复上次位置改成「目标块挂载出来再滚」（`restoredRef` 守卫 + 跟着 `renderedCount` 重试），
     并新增 `userScrolledRef`：用户已经自己滚起来看书就放弃延迟落位，不把人拽走；
   - 目录跳转新增 `pendingJumpRef`：目标章还没挂载时先把前面的块挂出来，进 DOM 后再滚
     （原先的失效判据是「DOM 里找不到」，会把「还没挂载」误报成「这一章的正文已经不在了」）。
2. **`parseBook` 4 条 LRU 缓存**（`src/lib/library.ts`）：命中比较用**字符串全等**而不是哈希
   （哈希碰撞会返回别的书的正文，数据正确性不能接受）；块数组只读，多处分发同一份是安全的。
   实测：1× 冷 319.5ms → 热 0ms；6× 冷 1867ms → 热 0ms；三次调用返回同一数组。
3. **导入建议上限放宽**（`RECOMMENDED_MAX_CHARS` 10000 → 50000）+ 三处文案同步
   （`LibraryPage` 头部与确认弹窗、`SettingsPage` 说明、`types` 注释）。
4. **修前/修后实测**（23 万字 / 4840 块，无头 Chrome）：

   | 场景 | 首屏可见 | 全部就绪 |
   |---|---|---|
   | 1×，整页刷新（缓存冷） | 429ms | 937ms |
   | 6×，整页刷新（缓存冷） | 2092ms | 5415ms |
   | 1×，书架点进书（缓存热） | **26ms** | 497ms |
   | 6×，书架点进书（缓存热） | **49ms** | 3129ms |
   | 6×，改动前（对照） | 整页阻塞 **5628ms** | 5628ms |

   回归验证：第 4200 / 4700 块的标注照样渲染、逐字一致（跨 `<strong>` 的仍正确拆成 3 个 `<mark>`）、
   12 块小书一次挂完且滚到底 100%、目录跳最后一章落到 scrollTop 396315、恢复位置落到第 4198 块、
   打开后进度显示 0%（没有被「短容器」骗成 100%）。全程零控制台/页面报错。

### [v4.6.2] - 2026-10-02 —— 相册孤儿图回收 + 书内标注重锚定 + 长文性能实测

> 接着复核 v4.6 挖出来的三件事，每件都先复现、再修、再用真实浏览器/真实函数复测。

1. **相册编辑器留下孤儿 blob**（`src/components/album/AlbumUploadEditor.tsx`）：
   `sessionIds` 记录本次会话新入库的图片 id，取消 / 移除单张 / 发布时按需回收
   （只删本次新建的 → 不会误删可能被星标集引用的旧图）。
2. **Agent 改书正文不再清空全书划线**（`src/lib/library.ts` 新增 `remapMarks`、
   `src/lib/agentTools.ts`、`src/components/agent/AgentChatView.tsx`）：
   逐条「快路径保留 → 全书唯一则重锚定 → 否则丢弃并报出原文」；
   `proposeReplace` 用同款逻辑**先给出预测数字**写进确认卡片；落盘结果额外记一条 sys 消息。
3. **长文性能实测并改写文档**（第 8.1 节的表格）：`parseBook` / `buildChapters` / 标注重套 / 打开耗时
   / 滚动帧时间，桌面与 6× CPU 降速各一遍。结论：1 万字的建议值过于保守，瓶颈是 DOM 规模而非解析。
4. 顺手修正文档里 `AlbumStar` 的字段名（实际是 `imageId` / `tag`，不是 `fileId` / `kind`）。

### [v4.6.1] - 2026-10-02 —— 两个实测缺陷：目录章节索引位移 + 清除缓存误删音乐

> 接手复核 v4.6 时发现（两个都是「不报错、UI 不崩、只差一点」的类型，靠真实浏览器跑出来）：

1. **目录章节增删永久位移块索引**（`src/lib/library.ts` + `src/stores/useAppStore.ts` +
   `src/pages/ReaderPage.tsx`）：`addBookChapter` 把已有章节 `from/to` 整体 +1、
   `removeBookChapter` 不减回去；新建章节还会与上一章区间重叠。
   - 复现（修前）：3 章 9 块的书 `[0..2, 3..6, 7..8]` → 在块 4 新建 → `[0..2,3..3,4..7,8..9]`
     （把已有章节整体右移）→ 移除该条 → `[0..2,4..7,8..9]`，章首 `[0,4,8]`，
     块 3「第二章 转折」被算进第一章、块 7 被算进第二章。
   - 修法：新增 `retargetChapters(skeletons, blocks)`（`to` 与 `charCount` 只由正文与
     「下一条章节的起点」推出，同 `from` 去重），`buildChapters` / `addBookChapter` /
     `removeBookChapter` 全部走它；`addBookChapter` 改为返回 `boolean`，
     同一块重复新建时返回 `false` 并不改数据，阅读器 toast 改为「这一段已经是章节开头了」。
   - 修后实测：在块 4 新建 → `[0..2(10),3..3(0),4..6(10),7..8(5)]` 无重叠；
     移除 → 精确回到 `[0..2(10),3..6(15),7..8(5)]`，块归属 0-2 / 3-6 / 7-8 与原文一致；
     同块重复新建 → 返回 `false`、条数不变。md 书的自动拆章（含《Agent》种子书
     的 `Agent@0..2` / `写入方式@3..6`）结果与修前完全一致。
2. **`collectFileIds` 漏收 `tracks[].fileId`**（`src/lib/exportImport.ts`）：
   - 复现（修前）：`collectFileIds` 只返回相册图 id，不含音频 → 设置「清除缓存」把
     音频当孤儿删掉（「已清理 2 个无引用图片，释放 5.0 KB」，曲目仍在、文件没了）。
   - 修法：补收 `state.tracks[].fileId`（并写清为什么：三条备份路径 + 清除缓存共用它）。
   - 修后实测：`collectFileIds` 含音频与相册图、不含孤儿；导出 JSON 包里含音频（2 个文件）；
     清除缓存只删掉那个 4096B 真孤儿（「已清理 1 个无引用图片，释放 4.0 KB」），
     音频与照片完好、曲目可播。
3. **阅读器标注渲染的顺手优化**（`src/pages/ReaderPage.tsx`）：`book.marks ?? []`
  每次渲染都新建数组，会让「还原 + 重套标注」的 `useLayoutEffect` 每渲染一次就跑一遍
  （滚动改变 `curBlock` 也算），长文上无谓重扫全部块。改为 `useMemo` 缓存。

（两个修复的验证口径：无头 Chrome 走真实 UI + 真实 store 实例，逐项打印前后对比并断言；
构建与 `npm run typecheck` 均通过。**注意**：探针里 `import('/src/stores/useAppStore.ts')`
会拿到**与应用不同的模块实例**（dev server 给模块加了 `?t=` 失效戳），
必须从 `performance.getEntriesByType('resource')` 取应用真正加载过的那个 URL，见第 12 节教训 26。）

### [v4.6] - 2026-10-02 —— 音乐四种播放模式 + 馆藏章节体系 + Agent 专属书《Agent》

> 五次提交（按依赖顺序，每步都可独立编译）：
> 1. `6355b6c` 章节解析引擎 + Agent 书兜底
> 2. `66e08a0` 阅读器目录页 + 书架章节展示
> 3. `573e5b3` Agent 写书工具 —— 往《Agent》书里新起章节
> 4. `3e34fb6` 标记格式写坏时不再静默吞掉 + 修 Agent 书时间显示
> 5. `616bda8` 设置页使用说明重写
> 另加 `b53f5b4` 音乐四种播放模式（在仓库历史更早一点，但属同一批功能）。

#### 音乐：四种播放模式（`b53f5b4`）
- `PlayMode` 类型 + `PLAY_MODES` 常量（`sequence` / `shuffle` / `repeat-one` /
  `stop-after`），`useMusicStore` 新增 `playMode` 默认 `sequence` + `cyclePlayMode()` /
  `setPlayMode()` / `onTrackEnded()`。
- **关键修复**：原 `ended` 事件里写死 `set({ isPlaying: false, progress: 0 })`，导致
  四种模式全退化成「播完暂停」；现改为调用 `get().onTrackEnded()` 单一入口。
- `onTrackEnded` 通过 `useAppStore.getState().tracks` 命令式读列表（已确认无循环 import）；
  `next` / `prev` 仍按列表顺序并包裹循环。
- `stop-after` 进度留 `1` 让用户能看到「确实放完了」，不回 0。
- UI：`MusicPlayerCard` 头部新增模式按钮，图标 + 文字直给当前模式名（`MODE_ICON` 映射）。
- `npx tsc --noEmit` 干净。

#### 章节解析引擎 + Agent 书兜底（`6355b6c`）
- `BookChapter` 类型 + `LibraryBook.chapters` 字段 + `agentBook` 标记。
- `BookBlock.heading` 在切块阶段填好：md 走 marked lexer 的 h1~h3（更深不切），
  txt 走明确模式（第 X 章/回/节/卷/部/篇/集/话/幕/折 + Chapter N + 阿拉伯序数 +
  序章/序言/楔子/楔子/尾声等）+ 单行短段兜底；md 的 `token.text` 在无 DOM 环境兜底。
- `buildChapters(content, format, bookTitle, opts)`：保留 `existing` 沿用 id/createdAt
  （章节 id 不抖）；第一个标题前并成「开篇」；无标题时返回一条覆盖全书的兜底章节。
- `setBookContent`：改写正文时同步重算字数与目录（Agent 写入 / 查找替换落盘都走它；
  顺带修掉「查找替换 books 不更新目录与字数」的旧 bug）。
- `AGENT_BOOK_ID = 'book-agent'` 常量，`db.ts` 的 `defaultState` + `normalizeState` 双处兜底；
  `normalizeState` 剥掉来路不明的 `agentBook` 标记，按标准 id 补一本（保证全局有且只有一本）。
- `deleteBook` 对 `AGENT_BOOK_ID` 直接 `return`（代码层防御）；agentBook 不默认置顶。
- 老书 `normalizeState` 里直接补解析一次目录，不必手动重建。

#### 阅读器目录页 + 书架章节展示（`66e08a0`）
- 阅读器顶栏新增「目录」按钮，与「书签」同款右侧抽屉（移动端满宽）。
- 章节列表带序号（`padStart(2,'0')`）+ 字数 + 「正在读」高亮（由本地 `curBlock` 驱动，
  不订阅 store）；点击跳转 + 同步 `curBlock`。
- 每章铅笔重命名 / 垃圾桶从目录移除（弹窗明示「正文保留，划线不受影响」）；
  底部「在当前阅读位置新建章节」（`addBookChapter` 在 `from = curBlock` 插入，
  之后所有章节边界右移一位，按 from 排序）。
- 老数据兜底：进页面若 `chapters` 为空则调一次 `rebuildBookChapters`（`ref` 守卫）。
- 书架卡片章节数（>1 章才显示）+ AGENT 徽标；
  书籍菜单「重建目录」 + Agent 书不显示「移出书架」（UI 与 store 双层防御）。
- Agent 书时间显示：createdAt=0 不再渲染「上架 56 年前」，改为「Agent 专属书」。

#### Agent 写书工具（`573e5b3`）
- `writeBookChapter` 走 `setBookContent`，**永远追加到书末**——文末追加不改任何已有块的
  索引 → 书里已有的划线一条都不会错位（这是刻意的取舍，见决策 25）。
- 同名标题 `uniqueChapterTitle` 自动加「 · 2」「 · 3」后缀，不覆盖旧章节。
- 标记解析的结束符同时接受全角 `］］`：要写入的 md 正文里很容易出现 `](url)` 这种链接，
  半角 `]]` 会被当成标记结束。
- TOOL_CONTRACT 补 `书` 模块说明与示例；`booksIndexText` 与 `resolveDoc` 带出章节目录，
  模型才知道「写进哪一章」指哪一章。
- **顺带修掉既有静默错误**：`applyReplace` 的 `book` 分支改走 `setBookContent`，并清空该书
  标注（就地替换必然让块索引漂移，旧的划线会悄悄指向别的段落）。确认卡片 + 结果消息里
  如实写明「已清空 N 处划线」。

#### 标记格式防御 + Agent 书时间显示（`3e34fb6`）
- `scanTools.brokenKinds`：写 / 替对 `【】` 闭合挑剔，模型偶尔会漏 `】`。**错就错在「静默不执行」**：
  用户以为存进去了、实际什么都没发生。scanTools 现在把没被吃掉的标记捞出来，agentTurn 回一条
  sys 消息「有 N 处标记格式不对，没有执行」并把指引回灌给模型让它下一轮自己重发。
- TOOL_CONTRACT 补「【】必须成对且写在 | 左边」铁律；
  `demoReply` 写书示例的格式错误顺手修了（demoReply 漏 `】` 会让演示模式的首次体验也踩坑）。
- 卡片时间显示：`agentBook` 时显示「Agent 专属书」而不是「上架 56 年前」；
  书籍菜单里也不输出 1970 年的上架日期。
- **浏览器实测（192.168.1.5:5199）**：书架显示《Agent》+ AGENT 徽标 + 章节数；目录页
  2→3→4 章，新建/重命名/移除全部正常，移除后正文一字未少；关 Agent 开关：书架归零、
  底栏变四格、URL 直达也被守卫拦住；写书全链路：说「把这段存进书里」→ sys 回执 →
  书末新增章节、目录 +1。

#### 设置页使用说明重写（`616bda8`）
- 音乐：补上四种播放模式，并写清它只决定「一首自然放完之后怎么办」，
  上一首 / 下一首永远按列表顺序。
- 馆藏拆成「书架」「相册」两节。书架补上目录页的拆分规则（md 1~3 级标题 /
  txt 第 X 章 / 单行短段）与三种修法（重命名、移除、新建、重建目录），补上《Agent》书的
  固定存在与不可删除。
- Agent 节清掉 `[[读:xxx]]` 这类命令式写法（原文本就是用户早已弃用的风格），改用自然语言
  描述读写能力，并如实写明「它没有删除能力」；补上写书、《Agent》书随开关隐藏、键盘弹起收底栏。
- 主题切换从「数据与全局」挪到「外观」那段的正确位置。
- Agent 卡片的开关说明同步：关掉时《Agent》书也会隐藏。

### [v4.5.1] - 2026-09-30 ~ 10-01 —— 相册交互完善 + Agent 数据读取 + 备份导出升级
- **相册编辑器两处体验修复**：删除键移入 tile 内（原 `-top-1 -right-1` 被 `overflow-hidden`
  裁掉半边）；**桌面拖拽弃用 HTML5 DnD** 改自实现（mousedown 按下即拖、窗口级
  mousemove/mouseup、elementFromPoint 找目标、拖拽结束 350ms 抑制 click 防误开预览），
  触屏仍为长按 300ms；相册编辑组保存提示去掉「更新不改排序」歧义后缀，简化为「已保存」。
- **Agent 输入框图片按钮 → 待发队列**：选图压缩入库后**不再直接发出**，先停在输入区上方
  （可逐张移除 / 点击预览 / 显示 n/9），文字输完按发送随消息一并发出；移除时同步
  `deleteFile` 清理库文件。
- **Agent 能读应用数据**（`agentEngine.ts` + `agentTurn.ts`）：`lifeIndexText()` 把
  文章/动态/灵感/便签/日程/待办/收藏夹/相册索引随 system 下发；`resolveModule()` 按模块名
  返回结构化文本，`resolveDoc()` 优先解析 `[[读:文章·标题]]` 与模块名；AgentContext /
  ctx 组装补全全数据字段。
- **导出范围 8 项**（`exportImport.ts` + `DataPage.tsx`）：新增 馆藏·书架 / 馆藏·相册 /
  Agent 全数据；`scopedState` 非全量时真正按范围过滤（books/albums/albumGroups/albumStars/
  agentSessions/agentDocs/agentMemories 不再被无条件带出，agent 范围剥 apiKey）。
- **修复合并导入丢标签**（`useAppStore.importState`）：categories 四桶（灵感/日程/待办/书籍）
  改为 union 合并（此前整体丢弃 incoming 标签桶 → 换机导入后书有、标签筛选全空）；
  相册三件（albums/albumGroups/albumStars）此前未合入，补 `mergeById`。
- **WebDAV 云端存明文 JSON**（`webdav.ts`）：`BACKUP_FILENAME = 'vidaos-backup.json'`，
  未加密不 gzip；加密时仍先 gzip 再 encryptBlob（密文容器不变）；全量覆盖 = **删除同步**；
  下载兼容旧 `.json.gz`（先试新名 404 回退旧名，gzip 魔数 / VDOS1 / 明文三态识别）；
  备份完成 toast 显示加密状态；DataPage 说明文案更新。
- **设置页使用说明更新**：补相册 / 星标集 / Agent `[[读:模块]]` 语法 / 导出范围 8 项 /
  WebDAV 明文 JSON 与删除同步；按用户偏好只留重点。
- **设置-关于新增「清除缓存」**：孤儿文件回收（collectFileIds 反集，确认对话框 + 释放体积提示），
  三个按钮统一一行三等宽排布。

### [v4.5] - 2026-09-30 —— 馆藏·相册上线（数据模型 59aed48 + UI 2765714 + 7 项修复 864ce8f）
- **数据模型**：`Album` / `AlbumGroup` / `AlbumStar` 三类型 + `normalizeState` 兜底星标集；
  `collectFileIds` 收 `albumGroups[].imageIds` 与 `albumStars[].fileId`（三条备份路径共用）。
- **相册 UI**：`pages/album/AlbumPage`（图集列表，星标集置顶、按最近阅读排序）、
  `AlbumDetailPage`（时间轴参考动态页、组内图、编辑）、`components/album/AlbumUploadEditor`
  （≤30 张、无图纯文字发布、压缩入库）。
- **星标集**：四固定标签（文章/动态/灵感/相册）、双链跳原文；文章/动态/灵感大图可存星标集。
- **7 项交互修复**（864ce8f）：图集输入框打字不显现（受控回显）、无图直接发布、
  上传提速（压缩参数 + 分批并行 4 张）、移动端长按拖拽（div 背景图替代 `<img>`
  避开 UA 长按菜单 + 300ms 计时）、说明文案精简、馆藏顶栏统一（书架/相册共用「馆藏」顶栏 +
  Collections 英文 + 切换按钮加大）。

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
- **v4.6 会话**（音乐四种播放模式 / 馆藏章节体系与目录页 / Agent 专属书《Agent》/ 写书工具 /
  标记格式防御 / 设置页文档重写；并按依赖顺序拆为五次提交）
- **最后更新日期**：2026-10-02

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

