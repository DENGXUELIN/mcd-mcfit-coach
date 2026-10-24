---
name: mcfit-coach
description: This skill should be used when a user wants scenario-based McDonald's meal planning, nutrition analysis, or coupon price calculation using the official McDonald's MCP (open.mcd.cn/mcp). It turns a casual "I want McDonald's" into a calculated, nutrition-aware, coupon-optimized meal plan with a visualized nutrition report. Trigger phrases include 麦当劳, 麦麦, 营养报告, 套餐推荐, 优惠券, 减脂, 热量, 场景点单, 到手价.
agent_created: true
---

# McFit Coach · 麦麦场景营养师

## Purpose
Help users plan McDonald's meals by scenario and goal, combining real-time menu, nutrition, and their own coupons, then produce a visualized nutrition report. The agent never pays on the user's behalf — it only builds the order; payment is always completed by the user via scan.

## When to use
- User wants McDonald's meal suggestions by scenario (减脂期 / 带娃 / 加班 / 健身后 / 宵夜).
- User wants to know calories, protein, or sodium of a McDonald's combo.
- User wants the actual paid price after coupons (到手价).
- User wants a nutrition report with charts.

## Prerequisites
- The McDonald's MCP connector must be configured in WorkBuddy with the user's own token from open.mcd.cn/mcp. The token must NEVER be hardcoded; use the `${MCD_MCP_TOKEN}` env placeholder (see mcp-config.example.json).
- Reference files (in this folder): `MCP_INTEGRATION.md` (tool list and call flows), `README.md` (overview), `src/report.html` (report template).

## Workflow
1. Collect scenario and goal: ask for the scenario (e.g., 减脂期午餐) and constraints (calorie target, allergies, must-have items).
2. Fetch data via McDonald's MCP tools:
   - list / get menu items (real-time)
   - get nutrition for candidate items
   - query the user's available coupons
   - calculate the actual paid price after coupons
3. Optimize: within nutrition constraints (calories, protein, sodium), combine items and coupons to maximize value and meet goals. Flag any dimension that exceeds target (e.g., sodium) in red.
4. Generate report: render the nutrition report using `src/report.html` (radar chart plus progress bars). Inject the computed numbers; mark exceeded metrics red and provide a dietitian note.
5. Build order: create the order via MCP; explicitly tell the user to complete payment themselves. Never auto-pay.

## Safety and honesty
- Do not fabricate menu, nutrition, or price data — always call the MCP for live values.
- Do not process payment. State clearly that payment is the user's action.
- This is a contest entry, not an official McDonald's product; note that data comes from the official MCP and is not medical or nutrition advice.

## Files
- `README.md` — project overview
- `CONTEST_DECLARATION.md` — official contest declaration (verbatim, do not edit)
- `MCP_INTEGRATION.md` — MCP server, tools, call flows, business value
- `mcp-config.example.json` — connector config template (env placeholders only)
- `workbuddy.md` — proof of WorkBuddy usage (real dev conversation export)
- `src/report.html` — nutrition report template (Chart.js radar plus progress bars)
