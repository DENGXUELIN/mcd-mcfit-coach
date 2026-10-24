# workbuddy.md · WorkBuddy 真实使用记录（麦麦场景营养师 McFit Coach）

> 本文件为「1024 造物挑战 / 麦当劳程序员创意开发大赛」要求的 `workbuddy.md`，用于证明本项目确实使用 WorkBuddy 完成开发，且真实接入了麦当劳官方 MCP。以下为**真实发生**的过程记录，未虚构任何未执行的步骤。

## 开发环境
- 工具：WorkBuddy（智能设计助手 / Agent 模式）
- 日期：2026-10-24
- 开发人：DENGXUELIN（GitHub: DENGXUELIN）
- MCP：麦当劳官方 MCP（`mcd-mcp`，streamablehttp，url `https://mcp.mcd.cn`），由用户本人领取 Token 后在 WorkBuddy 自定义连接器中启用

## 真实完成的工作（本会话内）
1. **活动解读与立项**：解析大赛规则、时间线（报名+排名截止 2026-10-25 23:59）与评分方式（GitHub Star + 前 100 名 + 本文件 → 3000 积分），确定参赛方向为「麦麦场景营养师 McFit Coach」。
2. **文件脚手架**：在 WorkBuddy 中创建 5 个必交文件框架——`README.md`、`CONTEST_DECLARATION.md`（官方原文逐字）、`MCP_INTEGRATION.md`、`mcp-config.example.json`（仅环境变量占位符）、`workbuddy.md`（本文件）。
3. **报告页起步代码 → 真实报告**：先生成 `src/report.html` 模板，后在麦当劳 MCP 接通后改用**真实营养数据**重写（见下方运行日志），雷达图 + 进度条可视化。
4. **参赛落地页视觉**：在 Ardot 画布完成整页设计（Hero / 问题方案 / 三步流程 / 核心功能 / 报告预览 / 社会证明 / FAQ / CTA / 页脚）。
5. **Skill 化**：补充 `SKILL.md`（含 `name` / `description` / `agent_created` 规范），并将项目安装为本地 WorkBuddy Skill（`.workbuddy/skills/mcfit-coach`）。
6. **真实接入麦当劳 MCP 并跑通**（详见下方日志）：在用户配置好连接器后，使用 WorkBuddy 调用 3 个真实 MCP 工具，生成一份基于实时数据的「减脂期午餐」营养报告。
7. **产品级网页版（PWA）**：将 demo 重构为完整单页产品（`webapp/`）——四视图架构（今日/配餐/报告/我的）、localStorage 持久化、智能推荐引擎（5400+ 组组合搜索）、Chart.js 图表、PWA 离线、71 个自动化测试断言。全程在 WorkBuddy 中开发、测试（Node 引擎单测 + DOM-stub UI 冒烟）、用 Chrome headless 截图验证、发布上线。
8. **发布上线**：通过 WorkBuddy 发布能力部署为在线应用（https://mcfit-coach.app.workbuddy.host/?sharecode=YE4C4DCKKQ），线上零 console 错误验证通过。

## 真实 MCP 运行日志（2026-10-24，已接通 mcd-mcp）
通过 WorkBuddy 调用麦当劳官方 MCP，全部返回真实数据：

| 调用工具 | 用途 | 真实返回要点 |
|---|---|---|
| `now-time-info` | 连通性 + 时区校验 | 服务器时间 `2026-10-24 17:16:05`，时区 GMT+08:00 |
| `list-nutrition-foods` | 核心营养数据源 | 约 160 个餐品的能量/蛋白/脂肪/碳水/钠/钙，例如麦香鱼 325kcal·16g蛋白·556mg钠、烟肉蛋麦满分 260kcal·16g蛋白·483mg钠 |
| `query-my-coupons` | 优惠券能力验证 | 卡包真实 2 张券：`11.9元麦辣鸡腿堡`（有效期 2026-10-26~10-30）、`19.9元王牌炸鸡任选2` |

**基于真实数据的报告结论（减脂期午餐）**
- 组合：麦香鱼(325/16/556) + 烟肉蛋麦满分(260/16/483) + 无糖可口可乐中杯(0/0/35)
- 合计：585 kcal · 32g 蛋白 · 23g 脂肪 · 60g 碳水 · 1074mg 钠
- 目标对比：热量 585/600 ✓、蛋白 32/30 ✓、钠 1074/1000 ✗（红，轻微超标）
- 营养师点评：热量蛋白达标；钠轻微超标，次日建议控盐。你卡包有「11.9元麦辣鸡腿堡」券，但单品钠 1208mg、热量 485kcal，**减脂期不建议为用券而选它**——体现"券不是万能，营养约束优先"的产品立意。
- 可视化产出：`src/report.html`（雷达图 + 三态进度条 + 餐品明细表），本地可直接打开。

## 合规与安全说明
- 本记录如实反映 WorkBuddy 在本项目中的实际使用，包括真实接入并调用麦当劳官方 MCP；
- 麦当劳 MCP Token 由用户本人领取并仅配置于 WorkBuddy 客户端私有配置，未出现在任何公开仓库、Issue 或对话文本中；仓库内的 `mcp-config.example.json` 仅保留 `${MCD_MCP_TOKEN}` 占位符；
- 本工具为参赛作品，非麦当劳官方产品；餐品与营养信息以麦当劳官方渠道实时结果为准，不构成医疗或营养建议。
