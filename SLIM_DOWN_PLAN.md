# ORZ.CM 主项目代码审计与精简计划

## 审计摘要

当前项目的主要问题不是单点缺陷，而是长期以复制扩张的方式演进后形成的结构性负担。主应用同时承载短链、邮箱、存储、开放 API、后台管理等多条业务线，但缺少清晰的模块边界，导致横切逻辑重复、DTO 层过胖、页面承担过多业务拼装、类型约束和测试覆盖不足。

这份计划只聚焦主应用，不讨论 `.tgbot`。目标有两件事：

1. 基于当前代码现状，给出清晰、可共享的审计结论。
2. 将整改工作拆成可独立推进、可验收的子任务，避免“重写冲动”和无边界清理。

## 核心发现

### 1. API route 过多且横切逻辑重复

`app/api/**` 下接口数量较多，鉴权、用户状态校验、管理员权限、错误返回、配额校验等横切逻辑在多个 route 中重复出现。常见模式包括：

- `getCurrentUser() + checkUserStatus()`
- `if (user instanceof Response) return user`
- `try/catch + NextResponse.json(...)`
- 按业务手写配额限制与参数校验

这导致接口层膨胀、风格不一致、错误处理分散，后续改动成本高且容易漏改。

### 2. `lib/dto/*` 过胖，已承担 service/policy 职责

多个 `lib/dto/*` 文件不仅负责数据库查询，还混入了业务流程、配额规则、错误映射和权限假设，已经实际承担了 service 与 policy 的职责。结果是：

- 文件体积持续膨胀
- 查询逻辑与业务规则耦合
- route 只能依赖“大而全”的 DTO
- 单元测试难以下手

优先风险模块为：`email`、`short-urls`、`files`。

### 3. 后台大页面混合数据编排与展示

后台首页、S3 配置页、URL 管理页等页面同时承担数据获取、业务聚合、状态管理和视图渲染。页面代码可读性下降，也让复用、测试和局部替换变得困难。

这类页面目前更像“功能容器”，而不是边界清晰的 UI 组合。

### 4. 类型与 lint 规则偏松，缺少有效质量闸门

项目当前可以通过 `bun run lint` 和 `bun run typecheck`，但静态检查本身比较宽松：

- TypeScript 未开启完整 strict 策略
- ESLint 关闭了多条高价值规则
- 仓库中仍有较多 `any`
- 若干模块依赖 `Response` 异常流来表达控制分支

这意味着“能过检查”不等于“结构健康”，也不利于后续重构收口。

### 5. 文档与真实结构存在偏差

部分文档描述与当前代码结构不完全一致，已经开始影响维护判断。若不及时校正，会继续放大认知偏差，让后续代理或开发者基于过时入口作出错误决策。

## 整改原则

- 不重写：默认采用渐进式收口，不进行全仓推倒重来。
- 先收口重复逻辑：优先解决横切逻辑复制扩张的问题。
- 先改高频模块：优先治理 `email`、`short-urls`、`files`。
- 先建边界，再谈性能和依赖瘦身：没有边界前做体积优化收益有限。
- 先补最低限度回归保护，再扩大改造范围。

## 子任务列表

### Task 1: 收敛 API 横切逻辑

- 目标：统一鉴权、用户状态校验、管理员权限、错误响应、配额校验。
- 范围：`app/api/**` 中高频出现的 `getCurrentUser`、`checkUserStatus`、`try/catch + NextResponse.json` 模板。
- 产出：一套共享的 route helper / api helper 约定。
- 验收：
  - 新增接口不再手写重复鉴权模板。
  - `email` 模块先完成试点。
  - route 层只保留参数提取、调用 service、返回结果三类职责。

### Task 2: 拆分 DTO 为 query/service/policy

- 目标：将超大 `lib/dto/*` 文件拆成“数据查询”“业务流程”“权限/配额规则”三层。
- 优先模块：`email`、`short-urls`、`files`。
- 产出：
  - `queries`：只负责数据库读写
  - `services`：只负责编排业务流程
  - `policies`：只负责权限、配额、状态判断
- 验收：
  - route 不直接拼业务规则
  - DTO 文件长度明显下降
  - 优先模块形成清晰目录和调用边界

### Task 3: 合并重复接口与权限分支

- 目标：减少 `admin/*` 与普通接口的镜像实现。
- 范围：`url`、`storage`、`user`、`plan`、`domain` 相关 route。
- 产出：按资源归并接口，权限差异统一下沉到 policy 层或 service 层。
- 验收：
  - 接口数量下降
  - 重复逻辑不再双份维护
  - 管理员与普通用户差异通过参数或策略表达，而不是复制 route

### Task 4: 拆后台大页面

- 目标：把“页面 + 数据聚合 + 业务细节 + 交互状态”拆开。
- 优先页面：后台首页、S3 配置页、URL 管理页。
- 产出：形成 `server loader + presentational client component` 的分层模式。
- 验收：
  - 页面组件只保留渲染职责
  - 业务编排移出视图层
  - 数据加载、交互状态、纯展示职责可以独立替换和测试

### Task 5: 收紧类型与静态检查

- 目标：恢复最低限度的质量闸门。
- 范围：`tsconfig.json`、`eslint.config.mjs`、高频模块中的 `any` 和 `Response` 异常流。
- 产出：
  - 新增代码禁止引入新的 `any`
  - 逐步恢复关键 ESLint 规则
  - 为后续提升 strict 做准备
- 验收：
  - `bun run lint`、`bun run typecheck`、`bun run build` 持续通过
  - 静态规则比当前更严格
  - 关键模块减少依赖异常流控制分支

### Task 6: 补最小测试面

- 目标：给重构提供回归保护。
- 范围：优先覆盖 `email`、`short-urls`、`files` 的 service/policy 层与关键 API。
- 产出：
  - 最小单测方案
  - 最小集成测试方案
  - 核心重构路径的回归用例
- 验收：
  - 覆盖鉴权失败、配额超限、重复资源、正常成功路径
  - 重构过程中有可重复运行的回归检查，而不仅依赖人工点测

### Task 7: 校正文档与架构认知

- 目标：让文档反映真实结构，避免继续误导维护。
- 范围：`AGENTS.md`、根 README、计划文档中的过时描述。
- 产出：与实际代码一致的模块边界、关键入口和维护说明。
- 验收：
  - 不再把不存在的核心入口当成当前事实
  - 新人或代理可以基于文档快速定位真实结构

## 推进顺序

### Phase 1

- 执行 Task 1
- 执行 Task 2 的 `email` 试点

### Phase 2

- 将 Task 2 扩展到 `short-urls`、`files`
- 执行 Task 3

### Phase 3

- 执行 Task 4
- 同时推进 Task 5

### Phase 4

- 执行 Task 6
- 执行 Task 7
- 形成稳定的回归基线与维护说明

## 风险与默认假设

- 已确认：不处理 `.tgbot`
- 已确认：覆盖现有 `SLIM_DOWN_PLAN.md`
- 默认：不做全仓重写，只做渐进式收口
- 默认：短期优先解决边界、重复、可测试性，不优先处理 UI 外观
- 默认：短期不直接将全仓切到完整 strict，而是先治理高频模块和新增代码

## Implementation Checklist

### Task 1 Checklist: 收敛 API 横切逻辑

- [x] 盘点 `app/api/**` 中所有使用 `getCurrentUser`、`checkUserStatus`、`user instanceof Response` 的 route，先覆盖 `email`、`url`、`storage` 三组。
- [x] 在 `lib/` 下新增统一的 API 辅助层，至少抽出以下能力：
  - [x] 获取当前用户并返回统一结果
  - [x] 校验已登录用户
  - [x] 校验管理员用户
  - [x] 统一错误到 `NextResponse` 的映射
  - [x] 统一配额失败响应
- [x] 调整 `lib/dto/user.ts` 中 `checkUserStatus` 的职责，避免继续依赖抛 `Response` 做控制流。
- [x] 先改造 `/app/api/email/route.ts`、`/app/api/email/[id]/route.ts`、`/app/api/email/read/route.ts`、`/app/api/email/inbox/route.ts`、`/app/api/email/send/route.ts`、`/app/api/email/send/list/route.ts`。
- [x] 将 route 中重复的 `try/catch + NextResponse.json(...)` 模板压缩到共享 helper，只保留参数解析、service 调用、返回结果。
- [x] 确认改造后 `email` 相关 route 不再手写 `if (user instanceof Response) return user`。
- [x] 完成后再扩展到 `/app/api/url/**` 和 `/app/api/storage/**`。
- [x] 验收：`email` 组 route 的重复模板明显减少，helper 能覆盖后续新接口。

### Task 2 Checklist: 拆分 DTO 为 query/service/policy

- [x] 为 `email` 模块建立目标结构，例如 `lib/email/queries.ts`、`lib/email/services.ts`、`lib/email/policies.ts`，或等价目录结构。
- [x] 从 `/lib/dto/email.ts` 拆出纯数据库访问函数到 `queries`。
- [x] 将“创建邮箱”“读取收件箱”“发送邮件”“标记已读”“统计数量”等流程编排迁移到 `services`。
- [x] 将用户状态、管理员范围、配额限制、保留地址校验等规则迁移到 `policies`。
- [x] 保证 route 层只调用 service，不再跨层直接拼 DTO 查询和业务规则。
- [x] 复用 `email` 的拆分模板到 `/lib/dto/short-urls.ts` 与 `/lib/dto/files.ts`。
- [x] 在拆分过程中补齐模块内的共享类型，避免继续从大 DTO 文件导出过多混合类型。
- [x] 保持旧导出在短期内可兼容，必要时增加过渡导出，避免一次性改太多调用方。
- [x] 验收：`email`、`short-urls`、`files` 三个模块都形成清晰的 query/service/policy 边界。

Task 2 完成说明：

- `email`、`short-urls`、`files` 已形成独立的 `types / queries / services / policies` 模块边界。
- 旧的 `lib/dto/*.ts` 已缩为兼容导出，供现有页面与组件渐进迁移。
- `app/api/email/**`、`app/api/url/**`、`app/api/storage/**` 的核心业务规则已下沉到新 service，route 保留鉴权、参数解析、错误映射和响应返回。

### Task 3 Checklist: 合并重复接口与权限分支

- [x] 比对以下镜像接口组，确认哪些只是权限不同、哪些存在真实行为差异：
  - [x] `/app/api/storage/s3/files/route.ts` 与 `/app/api/storage/admin/s3/files/route.ts`
  - [x] `/app/api/storage/s3/files/short/route.ts` 与 `/app/api/storage/admin/s3/files/short/route.ts`
  - [x] `/app/api/storage/s3/files/configs/route.ts` 与 `/app/api/storage/admin/s3/files/configs/route.ts`
  - [x] `/app/api/url/route.ts` 与 `/app/api/url/admin/route.ts`
  - [x] `/app/api/url/status/route.ts` 与 `/app/api/url/admin/status/route.ts`
  - [x] `/app/api/url/update/route.ts` 与 `/app/api/url/admin/update/route.ts`
  - [x] `/app/api/url/delete/route.ts` 与 `/app/api/url/admin/delete/route.ts`
  - [x] `/app/api/user/admin/*.ts` 与普通用户接口
  - [x] `/app/api/admin/plan/route.ts`、`/app/api/plan/route.ts`、`/app/api/plan/names/route.ts`
- [x] 为每组接口整理“公共 service + 权限策略”的归并方案。
- [x] 能合并的优先合并到单一资源接口；不能合并的，至少共用同一 service/policy 实现。
- [x] 在接口层明确管理员是否支持查看全部、普通用户是否只看自己，避免查询逻辑埋在 route 条件分支里。
- [x] 补齐每组合并后的参数和返回结构说明，避免后续调用方猜测。
- [x] 验收：重复 route 数量下降，或至少共享底层实现且不再双份维护逻辑。

Task 3 完成说明：

- `url` 与 `storage` 的主资源接口已改为根据当前登录用户角色决定查询范围，后台页面改为直接调用统一的 `/api/url` 与 `/api/storage` 资源入口。
- 原有 `admin/*` URL 与 S3 文件 route 保留为兼容转发层，不再维护独立业务逻辑；权限差异统一由主 route 和既有 service/policy 参数表达。
- `/api/plan` 已合并公共配额读取与管理员列表/CRUD 能力，后台计划页改用统一入口；`/api/admin/plan` 仅做兼容导出。
- `/api/user/admin` 已收敛为单一资源 route，`GET/POST/PUT/DELETE` 分别覆盖列表、创建、更新、删除；旧的 `add/update/delete` 子 route 仅保留兼容包装。

### Task 4 Checklist: 拆后台大页面

- [x] 拆分 `/app/(protected)/admin/page.tsx`，把统计数据获取从页面组件中移到独立 loader。
- [x] 识别后台首页中的卡片、图表、日志区块，区分哪些是 server data section，哪些是纯展示组件。
- [x] 拆分 `/app/(protected)/admin/system/s3-list.tsx`，将配置编辑逻辑、表单状态、持久化请求、纯展示区块分层。
- [x] 梳理 `/app/(protected)/dashboard/urls/url-list.tsx` 的职责，把筛选条件、数据请求、表格展示、弹窗编辑拆开。
- [x] 对 `/app/(protected)/dashboard/page.tsx` 和 URL 相关页面统一采用 loader + presentational 结构。
- [x] 为复杂 client 组件定义稳定的 props 边界，避免继续直接依赖多个 DTO 类型。
- [x] 补最少量的加载态、空态、错误态约定，避免每个页面各写一套。
- [x] 验收：重点页面的业务编排不再塞在单个页面文件中，视图层职责变清晰。

Task 4 完成说明：

- `admin/page.tsx` 与 `dashboard/page.tsx` 已改为 `loader + overview component` 结构，页面文件只负责装配元数据与调用 loader。
- 后台首页的数据加载集中到 `admin-page-data.ts`，卡片、图表、日志区块渲染集中到 `admin-overview.tsx`，server data section 与纯展示边界已明确。
- `dashboard/urls/url-list.tsx` 已拆为 `toolbar / results / modals / page-data / types`，主容器只保留筛选状态、数据请求与交互编排。
- `admin/system/s3-list.tsx` 已拆为 `editor / state helpers / types`，配置同步、保存请求、不可变更新与纯展示分层完成。
- 新增 `components/shared/page-states.tsx`，统一重点页面的 section skeleton 与 empty state，错误态继续使用现有 `ErrorBoundary`。

### Task 5 Checklist: 收紧类型与静态检查

- [x] 梳理 `tsconfig.json` 当前关闭或放宽的关键项，列出分阶段收紧顺序。
- [x] 保持现有构建可通过的前提下，先禁止新增显式 `any`。
- [x] 在 `eslint.config.mjs` 中优先恢复最有价值且改动可控的规则，例如未使用变量、部分 hooks 规则、明显的 React 反模式规则。
- [x] 先治理高频模块中的 `any`，优先顺序为 `lib/dto/user.ts`、`lib/auth/server.ts`、`app/(protected)/admin/system/s3-list.tsx` 及新抽出的 helper/service。
- [x] 逐步移除使用 `Response` 作为异常流的写法，改成显式结果类型或统一错误对象。
- [x] 将 `bun run lint`、`bun run typecheck`、`bun run build` 作为每个阶段结束前的固定检查。
- [x] 验收：新增代码不继续放大技术债，静态规则比当前更有约束力且不阻塞推进。

Task 5 进度说明（阶段 1）：

- `tsconfig.json` 已先开启 `noFallthroughCasesInSwitch`、`noImplicitThis`、`noImplicitOverride`，暂不直接打开完整 `strict`、`noImplicitReturns`、`useUnknownInCatchVariables`，以避免一次性引爆现有存量问题。
- `eslint.config.mjs` 已对 `auth.ts`、`lib/auth/*`、`lib/api/*`、`lib/email/*`、`lib/files/*`、`lib/short-urls/*` 以及 `app/api/email|url|storage` 恢复 `@typescript-eslint/no-unused-vars`，并对同一批边界层开启 `@typescript-eslint/no-explicit-any`。
- lint 收紧范围已继续扩展到 `app/api/admin/*`、`app/api/domain/*`、`app/api/keys/*`、`app/api/setup/*`、`app/api/user/*`、`app/api/v1/email/*`，把更多旧 route 纳入同一套约束。
- lint 收紧范围已进一步覆盖 `lib/dto/system-config.ts`、`app/api/v1/email-catcher/*`、`app/api/v1/icon/*`，把 Task 5 当前剩余的高频 `any` 热点也纳入约束。
- lint 收紧范围已继续扩展到 `app/(protected)/admin/system/app-configs.tsx`、`app/(standalone)/emails/*`、`components/email/*`，开始从 API / config 边界向低风险 UI 页面推进。
- `app/(protected)/admin/system/**/*.tsx` 已恢复 `react-hooks/exhaustive-deps`，先把 Task 4 刚拆出来的后台系统页作为 hooks 规则试点。
- 已清理 `lib/auth/server.ts`、`auth.ts`、`lib/email/brevo.ts` 中的显式 `any`，并顺手修复 `app/api/storage/s3/upload*.ts` 的未使用导入。
- 为保证 `bun run build` 可持续通过，顺手修复了两个兼容 route 的 `dynamic` 非法 re-export 问题：`app/api/admin/plan/route.ts`、`app/api/url/admin/route.ts`。
- `app/api/keys`、`app/api/domain/*`、`app/api/admin/*`、`app/api/user`、`app/api/setup`、`app/api/v1/email` 已统一到 `lib/api/route` / `ApiError` 风格，`app/api` 下已不再依赖 `user instanceof Response`、`error instanceof Response` 做异常控制流。
- `lib/dto/system-config.ts` 已改为递归 `SystemConfigValue` + 泛型读取接口，`app/api/v1/email-catcher/route.ts` 与 `app/api/v1/icon/route.ts` 的显式 `any` 也已移除。
- `lib/db.ts`、`lib/utils.ts`、`lib/umami.ts` 的显式 `any` 也已清理，并纳入现有 lint 约束。
- `app/(protected)/admin/system/app-configs.tsx`、`app/(standalone)/emails/*`、`components/email/*` 的显式 `any` 已清理，`standalone/emails` 不再依赖 `user as any` 透传 session user。
- `app/(standalone)/password-prompt/card.tsx`、`app/(protected)/dashboard/urls/globe/*`、`app/(protected)/dashboard/urls/world-map.tsx`、`app/(protected)/dashboard/urls/meta-chart.tsx`、`app/(protected)/dashboard/urls/export.tsx` 的显式 `any` 已清理，并补齐了地图 tooltip / JSON 导出字段选择的显式类型边界。
- lint 收紧范围已继续扩展到 `app/(protected)/dashboard/urls/meta-chart.tsx` 与 `app/(protected)/dashboard/urls/export.tsx`，把 URL 分析页剩余的可视化与导出逻辑也纳入 `no-explicit-any` / `no-unused-vars` 约束。
- `components/layout/notification.tsx` 已补齐 `system_notification` 返回结构类型，并在渲染前收窄为字符串；`components/content/mdx-components.tsx` 也已移除 `MDXImage` 和 `components` 映射上的显式 `any`，改为具体 props 类型与 `MDXContentProps["components"]` 断言。
- lint 收紧范围已继续扩展到 `components/layout/notification.tsx` 与 `components/content/mdx-components.tsx`，开始从产品页面推进到更通用的壳层与内容渲染组件。
- `components/shared/pagination.tsx` 已把页码集合收紧为 `React.ReactNode[]`；`components/forms/user-auth-form.tsx` 也已补齐 `/api/feature` 返回结构类型，并顺手删除了不再使用的 magic-link 表单状态与 `type="register"` 兼容尾巴。
- lint 收紧范围已继续扩展到 `components/shared/pagination.tsx` 与 `components/forms/user-auth-form.tsx`，登录/注册共享表单与通用分页组件现在也受 `no-explicit-any` / `no-unused-vars` 约束。
- `components/shared/tiptap/tiptap-ui-primitive/tooltip/tooltip.tsx` 已补齐子节点 `ref` 读取的显式类型；`components/chat/chat-room.tsx` 也已改为 `PeerJS DataConnection + 显式消息 payload`，把连接引用与事件数据上的显式 `any` 全部移除，并顺手清掉一批已经失效的 UI 余量。
- lint 收紧范围已继续扩展到 `components/chat/chat-room.tsx` 与 `components/shared/tiptap/tiptap-ui-primitive/tooltip/tooltip.tsx`，把通用聊天组件和 tiptap tooltip 也纳入 `no-explicit-any` / `no-unused-vars` 约束。
- `components/shared/tiptap/tiptap-node/image-upload-node/image-upload-node-extension.ts` 的 `HTMLAttributes` 也已改成显式属性值联合类型，并纳入现有 lint 收紧范围。
- 当前 `app/`、`lib/`、`components/` 代码里的真实显式 `any` 已清空；仓库剩余 `rg "\\bany\\b"` 命中已基本都是注释、示例代码片段或文案文本。

### Task 6 Checklist: 补最小测试面

- [x] 选择测试栈并补齐基础配置，优先支持 service/policy 层测试和关键 API 测试。
- [x] 先为 `email` 模块建立第一批回归用例，覆盖：
  - [x] 未登录
  - [x] 用户被禁用
  - [x] 超出配额
  - [x] 地址重复
  - [x] 正常创建成功
  - [x] 正常查询成功
- [x] 为 `short-urls` 模块补充“创建短链”“状态查询”“删除/更新”的最小回归路径。
- [x] 为 `files` 模块补充“列表”“下载地址”“删除文件”的最小回归路径。
- [x] 将 policy 层测试和 API 层测试分开，避免所有测试都依赖完整请求链路。
- [x] 在文档中写清楚如何运行测试，避免测试引入后无人使用。
- [x] 验收：重构 `email`、`short-urls`、`files` 时至少有一批自动化回归保护。

Task 6 完成说明：

- 已引入 `bun run test` 作为仓库统一测试入口，当前回归测试基于 Bun 内置测试运行器，无需额外安装 Jest/Vitest。
- 新增的测试覆盖 `tests/lib/email/policies.test.ts`、`tests/lib/short-urls/policies.test.ts`、`tests/lib/short-urls/services.test.ts`、`tests/lib/files/policies.test.ts`、`tests/lib/files/services.test.ts`、`tests/app/api/email.route.test.ts`。
- `email` 当前已覆盖未登录、禁用用户、超出配额、地址重复、创建成功、查询成功等高频路径。
- `short-urls` 已覆盖创建、状态统计、删除/更新，以及统一 `/api/url` 入口的关键读写路径。
- `files` 已覆盖查询参数归一化、按路径读取、删除文件记录，以及统一 `/api/storage/s3/files` 入口的列表、下载地址、删除路径。
- 当前测试默认使用 mock 隔离数据库、S3 与邮件服务，适合作为结构重构期间的最小回归基线。

### Task 7 Checklist: 校正文档与架构认知

- [x] 对照当前仓库实际结构，更新 `AGENTS.md` 中已经过时或不准确的描述。
- [x] 更新根 README 中关于项目架构、关键模块、运行方式、验证方式的描述。
- [x] 保留 `SLIM_DOWN_PLAN.md` 作为主计划文档，并在需要时补充阶段性完成记录。
- [x] 如果后续引入新的 helper/service/policy 目录结构，及时同步到文档中。
- [x] 将“当前不处理 `.tgbot`”写明为主计划边界，避免后续再次混入。
- [x] 验收：文档能真实反映当前结构，新人或 agent 不会再被过时入口误导。

Task 7 完成说明：

- `AGENTS.md` 已更新测试命令、`proxy.ts` 路由入口、`lib/api/*` 辅助层，以及 `email / short-urls / files` 的 `types / queries / services / policies` 边界说明。
- 根 `README.md` 已补充当前架构、回归验证命令、`proxy.ts` / loader + presentational 分层说明，并删除了过时的默认管理员账号描述。
- `SLIM_DOWN_PLAN.md` 继续作为主计划文档，当前阶段的测试覆盖与文档校正结果已同步记录。
- 计划文档中已再次明确：当前收敛范围仅限主应用，不处理 `.tgbot`。
