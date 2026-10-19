# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

商品运营后台（Nuxt 4 + Vue 3 + TypeScript + Element Plus + Pinia），中文 UI。认证已接入真实服务端（Nitro 接口 + 签名 cookie 会话 + 全局路由守卫）；商品、分类、日志、角色数据仍是 `shared/seed.ts` 里的种子数据，写操作只在客户端内存中生效，刷新即还原。除认证外尚无写接口，数据库是进程内内存单例，重启即重置。

仓库内的 `.workbuddy/memory/` 记录了此前的需求决策与踩坑（反映写入时的状态，若与代码冲突以代码为准）。

## 常用命令

```bash
npm run dev        # 开发服务器，默认 3000
npm run build      # 生产构建（SFC 编译验证的可靠方式）
npm run preview    # 预览构建产物
npm run generate   # 静态生成（本机 safe-delete shim 会拦截，见下方坑）
npx nuxt prepare   # postinstall 生成 .nuxt 类型
```

没有配置 lint / test 脚本，也没有测试框架；不要假设 `npm test` 可用。

## 架构

Nuxt 4，源码目录是 `app/`（不是根目录 `pages/`）。

- **`shared/permissions.ts` — 权限唯一来源。** 定义权限点 `PERM`、三级种子角色 `ROLE_PRESETS`、侧边栏 `ADMIN_NAV`、权限管理页分组 `PERMISSION_GROUPS`。app 与 server 都通过 `#shared/permissions` 导入，新增权限点/菜单/角色只改这一个文件。
- **`shared/seed.ts` — 种子数据。** 服务端内存库与前端页面共用（页面暂时直接 import，写接口接入后应改为请求服务端）。
- **`app/stores/auth.ts` — 登录态与当前权限的唯一前端数据源。** Pinia store，但状态底层用 `useState('auth-user' / 'auth-permissions' / 'auth-loaded')` 承载：全局路由守卫在 SSR 首次导航时早于 Pinia 插件执行，中间件里直接调 `useAuthStore()` 会报 "no active Pinia"。store 提供 `login / logout / fetchMe / can / canAny / roleLevel`。
- **`app/middleware/auth.global.ts` — 页面级那道关。** 冷启动先请求 `/api/auth/me` 恢复会话；未登录访问后台 → `/login?redirect=原地址`；已登录访问 `/login` → 回 `/products`；页面权限不足 → `/403`。路由与权限点映射写在文件底部的 `requiredPerm()`（`/products/:id` 要求 `product:edit`，其余见函数）。**中间件内同样只能用 `useState`，不要调 store。**
- **`app/composables/usePermission.ts` — 页面里的权限消费入口。** `permissions` / `can` 来自 auth store（服务端下发）；`roles` 是权限管理页的可编辑草稿 state（初值克隆 `ROLE_PRESETS`），保存只改这份本地 state，尚未写回服务端，也不影响当前会话的 `auth.permissions`。暴露 `{ roles, role, permissions, can, canAny }`。
- 三级权限语义：1 管理员=全部；2 运营=商品+分类可编辑，无操作日志/权限管理；3 只读=只有 `*:view`。导航、按钮、操作列均用 `can(PERM.*)` 控制显隐。
- **服务端认证**：`server/api/auth/{login,logout,me}`；`server/utils/session.ts` 用 HMAC-SHA256 签名的 httpOnly cookie（7 天，`SESSION_SECRET` 缺省为 dev 值）；`server/utils/db.ts` 是挂在 `globalThis` 上的内存单例（scrypt 加盐哈希密码，重启重置）；`server/utils/permission.ts` 提供 `requireUser` / `requirePerm`，是接口层的真正安全边界（401/403）。新增写接口第一行必须调 `requirePerm`。
- **布局**：`default.vue` = 232px 侧边栏（菜单按权限过滤）+ 60px 顶栏（面包屑/当前用户/退出）+ 内容区；`auth.vue` = 居中登录外壳；`403.vue` 用 `definePageMeta({ layout: false })`。
- **入口**：`app/app.vue` = `NuxtLayout` + `NuxtPage`；`app/error.vue` 处理 404/500。
- 路由：页面直接在 `app/pages/` 下，**没有 `/admin` 前缀**：`/products`、`/products/[id]`、`/categories`、`/logs`、`/roles`、`/login`、`/403`。`/` 经 routeRules 重定向到 `/products`。`/products/[id]` 是**编辑页**（详情=编辑，不做只读双态），守卫要求 `product:edit`。
- **`nuxt.config.ts` 的 `nitro.externals.inline: ['pinia']` 不能删**：否则 Nitro 把 Pinia 外置、`@pinia/nuxt` 插件却内联，两份副本会让生产 SSR 报 "no active Pinia"。
- **样式**：无 Tailwind。`app/assets/css/main.css` 用 `--app-*` 设计变量并覆盖 Element Plus 的 `--el-color-primary`（#2563eb）等主题变量，各页面用 scoped CSS。新增组件沿用这套变量，不要硬编码主色。

## 已定范围与设计约束

以下决策来自 `.workbuddy/memory/2026-10-18.md`，实现时不要自行扩大范围：

- 分类只有**一级**，不做树、不做 `parentId`。
- 商品状态只有 `'on' | 'off'`；不做草稿/审核/软删除。
- 只做登录页；不做注册、改密、用户管理，3 个种子账号写死（`admin` / `editor` / `viewer`，密码 `demo-123456`，密码哈希在服务端种子时生成）。
- 商品图片功能已移除，`Product` 类型不再有 `images` 字段；不要重新引入。
- 操作日志要做（权限点 `log:view` 已就绪）；目前只有登录成功会由服务端写日志。
- 权限落点：`product:edit` 同时控制列表编辑按钮、`/products/[id]` 路由、保存接口；上下架用独立的 `product:status`。
- **安全边界**：前端权限判断只负责体验，真正的拦截放在 Nitro 服务端（`requirePerm` 返回 403），不要只靠路由守卫。

## 当前实现状态

- **认证已闭环**：`login.vue` 调真实 `/api/auth/login`，成功后按 `redirect` 回跳；`/api/auth/me` 支持刷新恢复；`/api/auth/logout` 清 cookie；全局守卫负责跳转与页面权限。
- `products/index.vue`、`products/[id].vue`、`categories.vue`、`logs.vue`、`roles.vue`：UI 已完整（筛选/分页/弹窗/权限矩阵），但数据来自 `shared/seed.ts`，编辑、上下架、删除、保存等写操作只改客户端内存，刷新还原。
- `roles.vue` 的权限矩阵保存后只更新 `usePermission().roles` 本地 state，**不会**改变服务端角色或当前登录会话的权限。
- 尚未实现：商品/分类/日志/角色的服务端写接口与持久化；页面仍在直接 import 种子数据。新增接口时按 `requirePerm` + `db.appendLog` 的既有模式写。
- 已有页面结构（卡片、表格、弹窗、权限过滤、`headerStyle`）应作为后续页面的模板。

## 本机环境坑

- `nuxt dev` 只监听 IPv6 `[::1]:3000`，用 `127.0.0.1` 会 connection refused，改用 `http://[::1]:3000`；Nitro 产物（`node .output/server/index.mjs`）监听 0.0.0.0，`127.0.0.1` 可访问。
- 沙箱注入的 safe-delete shim 在 Vite 重优化依赖、批量清理 `node_modules/.cache/vite/client/deps` 时会抛 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 搞崩 dev server（留下占 3000 的孤儿进程和 `.nuxt/nuxt.lock`）。处理：结束孤儿进程 → 删锁 → 用 `env -u NODE_OPTIONS npm run dev` 启动，或先 `rm -rf node_modules/.cache/vite`。用户自己终端启动无此问题。
- `el-table` 的数据行不在 SSR HTML 里，只靠客户端 hydration 渲染；不要用 curl 拿到的 HTML 判断表格内容。
- `.npmrc` 设置了 `legacy-peer-deps=true`，安装依赖时保留。
- 重启预览前先停掉旧进程再 build，否则 Windows 下文件占用会导致构建失败。
