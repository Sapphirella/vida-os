# Third-Party Notices

本项目 **VidaOS**（个人非商用项目）在设计与实现中借鉴 / 改编了以下开源项目，特此声明与致谢。

---

## InternalBeyond-Mobile（IB-Mobile） — Sui-IB

> Required Notice: Copyright © 2025-2026 Sui (https://github.com/Sui-IB)

- 仓库：https://github.com/Sui-IB/InternalBeyond-Mobile
- 代码许可：**PolyForm Noncommercial License 1.0.0**
  （官方文本：https://polyformproject.org/licenses/noncommercial/1.0.0）
- 视觉素材许可：CC BY-NC-SA 4.0
- 版权声明：https://github.com/Sui-IB/InternalBeyond-Mobile/blob/main/COPYRIGHT.md

**借鉴与改编程度（代码层面）**：

1. **12 列 CSS Grid 挂件墙布局**（本项目 `css/style.css` 中 `.dgrid / .dk-full / .dk-6 / .dk-3` 跨度体系）——概念与实现思路改编自 IB 的 `.sb-desk{grid-template-columns:repeat(12,minmax(0,1fr))}` 与其 `dk-full / dk-half / dk-third` 跨度方案；
2. **玻璃卡片材质口径**——半透 alpha 约 0.4 级玻璃 + `backdrop-filter: blur(24px) saturate(1.6)` + 「1px 内阴影白高光线」模拟玻璃边缘（以 `inset box-shadow` 实现，非 CSS 实线边框），参考 IB 的 `--glass / --glass-shadow` 视觉口径；
3. **月历 / 日程挂件、大时钟 Hero 的信息层级与排版思路**（数字用 tabular-nums 等宽、日期行窄字距大写化、签名落款行），改编自 IB Desk 首页的挂件构成；
4. **小字距英文挂件标签（wgt-lab）与卡片标题层级** 的排版惯例。

**未使用的内容**：未复制 Sui-IB 的任何 AI / 社交 / 通话 / 影音功能与逻辑；未使用其生成的背景/插画图片素材；未使用其 `.md` 之外的任何数据格式。VidaOS 的全部业务代码（编辑器、便签、导入导出、PWA 等）为本项目独立编写。

**合规范围**：VidaOS 仅供个人 / 非商用用途，符合 PolyForm Noncommercial 许可；若日后用于任何商业用途，须先取得 Sui 书面授权。本项目保留了本 Required Notice 与许可链接，符合分发要求。

---

## InternalBeyond（桌面版） — Sui-IB

- 仓库：https://github.com/Sui-IB/InternalBeyond
- 用途：开发期间仅作为**网页端布局形态的参考对照**（其首页为大标题欢迎页 + 窗口页架构），VidaOS 未直接移植其桌面版代码，仅借鉴了「桌面形态排版应留出信息层级与呼吸感」的方向。

---

### 字体与库

- marked.js（MIT）
- DOMPurify（Apache-2.0 / MPL-2.0）
- 图标为基础 Feather 风格线性路径（MIT 思路，路径为自行绘制/改写）
