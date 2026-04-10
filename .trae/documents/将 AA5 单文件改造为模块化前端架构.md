## 功能梳理

* UI组件：`Button`、`Card`、`Input`、提示气泡（`warningMessage`）

* 页面视图：账单列表、创建账单、行程主页、添加成员、记一笔、结算方案

* 业务逻辑：`calculateSettlements` 最小化转账算法、`updateActiveTrip`、表单状态管理

* 数据持久化：`localStorage` 保存 `trips`，初始化读取、刷新自动保留

* 账单维护：支持新增、删除（列表卡片右上角），返回列表与页面切换（`view`）

## 目标与原则

* 按职责拆分为独立模块，避免单文件损坏牵连全站

* 为每个页面增加错误边界，隔离运行时异常

* 将持久化与算法从视图中解耦，方便测试与复用

* 保持现有视觉与交互不变，逐步迁移

## 推荐方案（专业工程化：Vite + React）

* 使用已存在的 AA3 项目结构模式，迁移 AA5 代码到模块化 React 项目

* 好处：开箱支持 ESModules、代码分割、错误边界、Tailwind、生产构建与部署

### 目录结构

* `AA5/`

  * `index.html`（入口，仅挂载 root）

  * `src/`

    * `main.tsx`（应用启动）

    * `App.tsx`（路由或视图切换壳）

    * `components/`：`Button.tsx`、`Card.tsx`、`Input.tsx`、`WarningToast.tsx`

    * `pages/`：`TripList.tsx`、`CreateTrip.tsx`、`TripHome.tsx`、`AddMember.tsx`、`AddExpense.tsx`、`Settlement.tsx`

    * `store/`：`tripStore.ts`（trips 状态、持久化；带版本号与校验）

    * `utils/`：`settlement.ts`（算法）、`money.ts`（格式化）、`id.ts`（ID生成）

    * `errors/`：`ErrorBoundary.tsx`（页面级隔离）

    * `styles/`：`index.css`（Tailwind入口与自定义样式）

  * `tailwind.config.js`、`postcss.config.js`、`vite.config.ts`、`tsconfig.json`

  * `vercel.json`（将根路径重写到站点入口或直出 SPA）

### 模块职责

* `tripStore.ts`

  * 导出 `trips`、`activeTripId`、`view` 等状态与操作：新增、删除、更新当前行程、切视图

  * `persist()`：`localStorage` 存储；`load()`：读取并做 schema 校验，失败回退到示例数据

  * 使用版本号 `schemaVersion` 防止历史缓存结构污染

* `settlement.ts`

  * 保持算法与阈值处理（±0.01），提供纯函数与类型定义

  * 单元测试：债权/债务分离、排序、匹配与舍入

* `pages/*`

  * 每页只负责渲染与操作调用；外层用 `ErrorBoundary` 包裹，单页异常不影响其他页

  * `TripList`：显示卡片、右上角删除；点击进入 `TripHome`

  * `TripHome`：顶部总支出卡（右上角“查看结算”）；参与人 Pill、明细列表、底部“记一笔”

* `components/*`

  * 纯展示组件；不持业务状态

* `vercel.json`

  * `rewrites` 将 `/` → `/index.html` 或 `/AA5/`；`headers` 可加 `cache-control`

### 错误隔离与健壮性

* `ErrorBoundary` 包裹各 `pages/*`，渲染友好错误与“返回列表”按钮

* `tripStore.load()` try/catch + schema 校验；异常时提示并使用示例数据

* 懒加载页面：`import('./pages/Settlement')`，单页加载失败不影响其他页

* 算法函数、持久化单元测试（可用 Vitest）

### 迁移步骤

1. 初始化 Vite + React + Tailwind（参考 AA3 一致配置）
2. 提取 `settlement`、`formatMoney`、`generateId` 到 `utils/*`
3. 实现 `tripStore` 并迁移新增/删除/更新行为；接管 `localStorage` 持久化
4. 将每个视图拆到 `pages/*`；页面用 `ErrorBoundary` 包裹
5. 组件抽取与复用；清理内联逻辑
6. 替换入口：`index.html` 只保留 `#root` 与打包资源；移除浏览器端 Babel
7. 本地验证、加测试、部署到 Vercel（根路径 404 用 `rewrites` 修复）

## 备选方案（无打包器：CDN + Babel 多文件）

* 维持 CDN + Babel，但把逻辑拆到多个 `src/*.jsx` 文件，`index.html` 通过多个 `<script type="text/babel" src="...">` 加载

* 目录：`src/App.jsx`、`src/pages/*`、`src/components/*`、`src/utils/*`、`src/store/*`

* 注意：运行时编译影响性能与可维护性；不支持标准 ES 模块生态；不建议用于生产

## 交付内容

* 新的模块化项目骨架与迁移后的代码

* 基础单元测试（算法与持久化）

* 部署配置（Vercel 重写规则）、错误边界与懒加载

请确认采用“Vite + React”方案进行模块化改造（推荐），或选择“CDN + Babel 多文件”保留无打包器的形式。

使用CDN + Babel 多文件，保留无打包器的形式
