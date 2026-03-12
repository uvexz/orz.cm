# WR.DO 项目精简与优化计划 (Slim Down Plan)

经过对当前 `wr.do` 代码库的初步全面审查，发现该项目功能丰富（包含短链、临时邮箱、子域名管理、文件存储、开放API及后台管理等多模块），因此引入了大量第三方依赖库（如图表、地图、邮件解析、Markdown处理、各种UI组件等），这导致了项目体积较大（“臃肿”）。

为了精简项目、降低维护成本并提升加载与构建性能，提出以下精简计划（分为**短期可执行**与**长期重构**两部分）：

## 一、 依赖包清理与优化 (Dependency Cleanup & Optimization)

这是见效最快、风险较低的优化方向。

1. **移除真正未使用的依赖库**
   * 项目中存在一些已经不再使用或被替代的冗余依赖。例如：通过 `npx depcheck` 检测并结合全局代码搜索（如 `@react-email/button`, `@react-email/components`, `@react-email/html`, `crypto` 等未在核心业务逻辑中直接调用的库）。
   * 逐步卸载并重新构建 (`npm run build`) 确保无副作用。

2. **精简同类替代品，统一技术栈**
   * **图表库去重：** 项目中同时引入了 `recharts` (用于 Dashboard 各类图表) 和 `@unovis/react`, `@unovis/ts` (用于地图展示 `world-map.tsx`)。考虑将所有数据可视化统一到单一库（推荐保留 `recharts` 并寻找或自定义其地图替代方案，或反之），从而干掉另一套庞大的图表库。
   * **时间处理库：** 项目中似乎同时用到了 `date-fns` 和原生的 `Intl` 格式化方案。可以考虑统一，特别是如果不依赖复杂的时区处理，可直接使用原生 API 或轻量级的 `dayjs` 替换。

3. **按需引入与动态加载 (Dynamic Imports/Lazy Loading)**
   * **3D与地图库：** 比如 `three`、`globe.gl`、`react-colorful`。这些库体积巨大，仅在特定页面（如 `dashboard/urls/globe/realtime-globe.tsx`）使用。
     * *操作：* 确保使用了 Next.js 的 `next/dynamic` 进行懒加载 (`{ ssr: false }`)。当前代码中 `WorldMap` 已经做了 dynamic 引入，可以进一步检查其他重型组件（如图表、Markdown编辑器）是否也完全实现了懒加载。
   * **富文本编辑器：** `@tiptap/*` 系列插件包体积可观，仅在后台或特定编辑场景使用，需确保通过 Dynamic 引入剥离出主 Bundle。

## 二、 代码层面的重构与精简 (Codebase Refactoring)

1. **移除未使用的UI组件库文件**
   * 项目使用了 `radix-ui` 和 `shadcn/ui`。检查 `components/ui/` 下是否存在复制进来但实际业务中从未调用过的组件（例如某些复杂的交互组件），将其删除。

2. **剥离或模块化非核心服务 (Modularization)**
   * **邮件与爬虫服务：** 如果临时邮箱（依赖 Cloudflare Worker 和 Resend）、文件存储或网页截屏抓取 (`api/v1/scraping/*`) 等功能属于“可插拔”模块，可以考虑将其核心逻辑抽离为独立的微服务 (Cloudflare Workers) 或者在项目中通过环境变量实现“编译期剪裁”。

3. **优化静态资源与样式**
   * 移除 `public/` 或 `assets/` 下未使用的图片、字体文件或冗余的占位图。
   * Tailwind CSS 已配置，确保未滥用复杂的 Arbitrary Values（如 ESLint 提示的 `z-[40]` 改为 `z-40`）。

## 三、 构建与部署配置优化 (Build & Deployment)

1. **Next.js 配置优化 (`next.config.mjs`)**
   * 当前启用了 `output: "standalone"`，这本身有助于减少 Docker 镜像体积。
   * 可以开启或检查 `experimental.optimizePackageImports`，针对 `@radix-ui`、`lucide-react` 等库进行导入优化，防止把整个库打包进去。

2. **移除冗余的 PWA 插件（如非强需求）**
   * 项目使用了 `next-pwa`。如果当前业务对离线访问和 PWA 的需求不高，可以考虑移除 `next-pwa` 及其相关配置，这能减少 Service Worker 生成和客户端资源缓存带来的复杂性。

## 四、 执行步骤建议 (Action Items)

若您同意以上计划，我们可以按照以下顺序逐步执行：

1. **Phase 1 (安全清理):** 删除未使用的 `devDependencies` 和 `dependencies`，并提交。
2. **Phase 2 (按需加载):** 审查所有涉及 `three`, `recharts`, `tiptap` 的页面，强制添加 `next/dynamic`。
3. **Phase 3 (组件瘦身):** 清理 `components/ui` 和 `app/(standalone)` 中不再使用的废弃组件与测试页面。
4. **Phase 4 (架构评估):** 讨论是否需要移除 PWA 支持或合并图表库。
