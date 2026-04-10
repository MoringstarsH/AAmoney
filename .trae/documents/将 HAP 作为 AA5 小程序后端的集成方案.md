## 集成思路
- 将 HAP 视为“数据源”，用它保存 `Trips/成员/支出`，而不是仅用 `localStorage`。
- 在前端增加一个“数据访问层（DAL）”，优先调用 HAP；当 HAP 不可用时自动回退到 `localStorage`，保证离线可用。
- 使用现有的 HAP MCP 接口做数据读写（列表、创建、更新、删除、关系查询、工作流触发），前端通过一个轻量网关（或直接 REST 调用）与 HAP 交互。

## 数据模型（HAP 工作表）
- Trips（行程）
  - 字段：`id`（系统）、`name`（标题）、`created_at`（时间）、`status`（单选）、`owner`（协作人）
- Members（成员）
  - 字段：`id`（系统）、`trip`（Relation→Trips，显示 name）、`name`（文本）、`is_group`（复选）、`member_count`（数字，默认 1）
- Expenses（支出）
  - 字段：`id`（系统）、`trip`（Relation→Trips）、`payer`（Relation→Members）、`amount`（数字，2 位小数）、`beneficiaries`（Relation→Members，允许多选，显示 name+member_count）、`note`（文本）、`created_at`（时间）
- 可选：SettlementLogs（结算记录）用于存历史结算快照（工作流触发后生成）。

## 安全与权限
- 在 HAP 中创建一个专用角色，例如“AA5-Client”，权限仅限于上述工作表的读写，不允许导出/打印。
- 为浏览器集成选择其一：
  - 方案 A（推荐）：前端→本地轻量网关（Node/Flask），网关持有 HAP 令牌并与 HAP MCP/REST 通信；前端只调用网关，避免在浏览器暴露密钥。
  - 方案 B：直接浏览器 REST 调用（仅在 CORS、匿名或公开视图可行时），令牌通过 `config.js` 注入运行时，不进版本库。

## 前端变更（AA5/src）
- 新增 `src/api/hap.js`（或 `hap.ts`）实现 DAL：
  - `listTrips() / createTrip(name) / deleteTrip(id)`
  - `listMembers(tripId) / addMember(...) / updateMember(...)`
  - `listExpenses(tripId) / addExpense(...) / updateExpense(...) / deleteExpense(id)`
  - `getSettlement(tripId)`（可选，将当前算法结果快照保存到 HAP）
- 修改现有 `store/storage.js`：
  - 抽象为 `StorageProvider`，运行时判断：有 HAP 配置→用 HAP provider，否则使用 localStorage provider。
  - 保持现有 `window.loadTrips/saveTrips` 接口不变（向下兼容），内部转发到 provider。

## 同步与离线
- 启动时：
  - 若 HAP 可用，加载 `Trips/Members/Expenses` 并填充前端状态。
  - 若不可用，回退到 `localStorage` 并提示“离线模式”。
- 写入策略：
  - HAP 成功→更新本地缓存（内存+localStorage 作为只读备份）。
  - HAP 失败→写入 localStorage 的“待同步队列”，下次在线自动重试。

## 错误处理与鲁棒性
- 统一 `try/catch`，向用户显示简短中文错误提示（例如“后台连接失败，已切换离线模式”）。
- 对 MCP/REST 的所有调用加入超时与重试（指数回退）。
- 严格校验数据（数字类型、必填、关系 ID 存在）。

## 具体实现步骤
1. 检查 HAP 应用结构：调用 `get_app_info`、`get_app_worksheets_list(responseFormat='md')`，确认是否已有 `Trips/Members/Expenses` 工作表；若没有，用 `update_worksheet` 创建或补充字段。
2. 建立最小权限角色：使用 `create_role` 为 AA5 前端创建专用角色（或复用既有角色），限制只对目标工作表读写。
3. 确认访问方式：
   - 如选方案 A：创建轻量网关（Node Express 或 Flask），暴露 `/api/trips`、`/api/members`、`/api/expenses` 等；网关内部调用 HAP 接口。
   - 如选方案 B：前端 `hap.js` 直接 `fetch` HAP REST（或 MCP 暴露的 HTTP 端点），令牌注入到 `window.HAP_TOKEN`（通过 `config.js`，不入库）。
4. 前端接入：
   - 新增 `src/api/hap.js` 与 `StorageProvider`，将现有 `loadTrips/saveTrips` 改为 provider 代理。
   - 在 `App.jsx` 的增删改操作里替换为调用 DAL 方法。
5. 关系维护：
   - 创建成员/支出时，写入正确的 `Relation` 字段（例如 `trip`、`payer`、`beneficiaries`）使用目标工作表的行 ID。
   - 列表查询时，联动取回展示字段（`showFields` 包含 `name/member_count`）。
6. 结算与日志：
   - 保留前端现有加权结算算法。
   - 可选：将结算结果以快照写入 SettlementLogs 并触发 `get_workflow_list` 中的某个工作流（如“生成结算单并分享”）。
7. 验证与回归：
   - 用 3 个成员（含 1 组）+ 3 笔支出进行 CRUD 测试，刷新后数据来自 HAP。
   - 断网/关掉网关验证离线回退仍可增删改并待同步。

## 交付与后续
- 提交：新增 `src/api/hap.js`、更新 `store/storage.js`，如选方案 A 再新增 `server/` 网关。
- 文档：提供 `config.example.js` 展示如何注入 `window.HAP_BASE_URL`、`window.HAP_TOKEN` 等。
- 后续：根据你的 HAP 实际表结构微调字段/关系与权限，并对 UI 增加同步状态指示。