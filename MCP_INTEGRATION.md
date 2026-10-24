# MCP 接入说明（MCP_INTEGRATION.md）

## 使用的 MCP Server

- **名称**：mcd-mcp
- **地址**：https://mcp.mcd.cn
- **协议**：Streamable HTTP（Bearer Token 鉴权）
- **申请入口**：https://open.mcd.cn/mcp

## 实际使用的 Tool

> 以麦当劳官方实际开放的 MCP 能力为准，开发时请在 WorkBuddy 中核对工具列表。以下为预期核心工具：

| 工具 | 用途 |
| --- | --- |
| 菜单 / 商品查询 | 获取在售单品、套餐及营养字段 |
| 营养查询 | 单品热量、蛋白质、钠等营养数据 |
| `calculate-price` | 根据商品 + 门店 + 优惠计算到手价（单位：分） |
| `query-my-coupons` | 查询当前账号可用优惠券 |
| `order`（可选） | 生成订单，付款由用户本人完成 |

## 调用流程

1. 用户描述场景与目标（如"减脂期、≤600kcal、蛋白充足"）
2. 调用菜单 / 营养工具，构建候选单品池
3. 在营养约束下做套餐组合（穷举 / 启发式）
4. 调用 `calculate-price` + `query-my-coupons` 计算到手价，优选组合
5. 调用报告生成（`src/report.html`）渲染可视化
6. 可选：调用 `order` 建单，提示用户扫码付款

## 业务价值

把"麦当劳开放接口"变成"人人可用的消费级营养私教"：在不替用户做支付决策的前提下，用营养 + 比价 + 券的组合，降低"想吃又怕胖 / 怕贵"的决策成本。

## 配置示例

见 `mcp-config.example.json`。Token 一律通过环境变量 `MCD_MCP_TOKEN` 注入，不落盘、不提交。
