# orz.cm

`orz.cm` 是一个基于 Next.js 16 的多产品平台，当前主要提供短链、邮箱、文件存储和开放 API 能力，并带有完整的后台管理与配额控制。

## 当前功能

- 短链
  - 自定义短链、过期时间、密码保护
  - 访问统计、实时日志、地域与设备信息
  - `POST /api/v1/short` 开放接口
- 邮箱
  - 临时邮箱 / 域名邮箱收件箱
  - 发信能力、收件箱读取与消息删除接口
  - `POST /api/v1/email`、`GET /api/v1/email/inbox` 等开放接口
- 文件存储
  - 对接 S3 兼容存储
  - 上传、管理、删除、分享文件
  - 管理员可配置存储提供商、Bucket 和限制
- 开放 API
  - 网页截图
  - 元信息抓取
  - 网页转 Markdown
  - 网页转 Text
  - 二维码生成
  - SVG 图标接口
- 管理后台
  - 用户、套餐、域名、系统配置管理
  - API Key、存储配置、认证方式开关
  - 资源用量与运营统计

## 技术栈

- Next.js 16 App Router
- React 19 + TypeScript
- Bun
- Drizzle ORM + PostgreSQL
- Better Auth
- Tailwind CSS
- next-intl

## 项目结构

- `app/`：页面与 API 路由
- `app/(marketing)`：官网与静态内容页
- `app/(auth)`：登录与注册
- `app/(protected)`：Dashboard、Admin、Setup
- `app/(standalone)`：邮箱、短链状态页、密码页等独立页面
- `lib/short-urls/*`：短链模块
- `lib/email/*`：邮箱模块
- `lib/files/*`：文件模块
- `proxy.ts`：短链解析、域名行为与请求预处理

## 本地开发

```bash
cp .env.example .env
bun install
bun run db:push
bun run dev
```

默认开发地址是 `http://localhost:3000`。

如果是全新数据库，先访问 `/login` 创建第一个账号，再访问 `/setup` 完成初始化管理员配置。

## 常用命令

```bash
bun run dev
bun run turbo
bun run lint
bun run typecheck
bun run test
bun run build
```

## 部署

推荐命令：

```bash
bun run check-db && bun run build
```

也可以使用仓库内的 `docker-compose.yml` 或 `docker-compose-localdb.yml` 进行部署。

## 回归验证

标准校验集合：

```bash
bun run test
bun run lint
bun run typecheck
bun run build
```

## 致谢

本程序由 [oiov/wr.do](https://github.com/oiov/wr.do) 重写而来，感谢原项目作者与贡献者的持续投入、开源分享与工程沉淀。
