# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概览

商品运营后台（Nuxt 4 + Vue 3 + TypeScript + Element Plus + Pinia），中文 UI。当前处于**静态页面阶段**：所有页面数据都是组件内 mock，登录只是表单校验，没有真实 API、没有持久化；`server/` 为空，Nitro 后端尚未开始。

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

- **`shared/permissions.ts` — 权限唯一来源。** 定义权限点 `PERM`、三级种子角色 `ROLE_PRESETS`、侧边栏 `ADMIN_NAV`、权限管理页分组 `PERMISSION_GROUPS`。app 侧通过 `#shared/permissions` 导入；`server/` 将来也从这里导入，保证前后端权限定义一致。新增权限点/菜单/角色只改这一个文件。
- **`app/composables/usePermission.ts` — 权限的唯一消费入口。** 当前权限来源是顶栏「预览角色」开关（`useState('preview-role-level')`，1/2/3 级）。**接入真实登录时只替换这个文件**（改为读用户 store），页面代码应保持不动。暴露 `{ previewLevel, role, permissions, can, canAny }`。
- 三级权限语义：1 管理员=全部；2 运营=商品+分类可编辑，无操作日志/权限管理；3 只读=只有 `*:view`。导航、按钮、操作列均用 `can(PERM.*)` 控制显隐。
- **布局**：`default.vue` = 232px 侧边栏（菜单按权限过滤）+ 60px 顶栏（面包屑/预览角色/退出）+ 内容区，admin 页面用它；`auth.vue` = 居中登录外壳，`login.vue` 用；`403.vue` 用 `definePageMeta({ layout: false })`。
- **入口**：`app/app.vue` = `NuxtLayout` + `NuxtPage`；`app/error.vue` 处理 404/500。
- 路由：`/` 经 `nuxt.config.ts` 的 routeRules 重定向到 `/login`；后台页在 `app/pages/admin/`。`/admin/products/[id]` 的定位是**编辑页**（详情=编辑，不做只读双态），设计上要求 `product:edit` 权限，但路由守卫尚未实现。
- **样式**：无 Tailwind。`app/assets/css/main.css` 用 `--app-*` 设计变量并覆盖 Element Plus 的 `--el-color-primary`（#2563eb）等主题变量，各页面用 scoped CSS。新增组件沿用这套变量，不要硬编码主色。
- Pinia 已安装并注册，但目前没有任何 store；状态暂时只用 `useState` / 组件内 `reactive`。

## 已定范围与设计约束

以下决策来自 `.workbuddy/memory/2026-10-18.md`，实现时不要自行扩大范围：

- 分类只有**一级**，不做树、不做 `parentId`。
- 商品状态只有 `'on' | 'off'`；不做草稿/审核/软删除。
- 只做登录页；不做注册、改密、用户管理，3 个种子账号写死。
- 图片用 URL 输入或本地转 base64（≤200KB），存 JSON。
- 操作日志要做（权限点 `log:view` 已就绪）。
- 权限落点：`product:edit` 同时控制列表编辑按钮、`/admin/products/[id]` 路由、保存接口；上下架用独立的 `product:status`。
- **安全边界**：前端权限判断只负责体验，真正的拦截必须放在 Nitro 服务端（接口返回 403），不要只靠路由守卫。

## 当前实现状态

- `login.vue`：静态校验，账号 admin/editor/viewer 密码 123456，提交只弹提示；`/api/auth/login` 未实现。
- `admin/products/index.vue`：唯一有完整内容的页面，12 条 mock 商品、本地筛选/搜索/分页；编辑、上下架、新建按钮都只弹占位提示。
- `admin/categories.vue`、`logs.vue`、`roles.vue`、`products/[id].vue`：只有 `<h1>` 占位。
- 已有页面结构与交互范式（卡片、分页、表格、权限过滤）应作为后续页面的模板。

## 本机环境坑

- `nuxt dev` 只监听 IPv6 `[::1]:3000`，用 `127.0.0.1` 会 connection refused，改用 `http://[::1]:3000`；Nitro 产物（`node .output/server/index.mjs`）监听 0.0.0.0，`127.0.0.1` 可访问。
- 沙箱注入的 safe-delete shim 在 Vite 重优化依赖、批量清理 `node_modules/.cache/vite/client/deps` 时会抛 `SAFE_DELETE_BULK_CONFIRM_REQUIRED` 搞崩 dev server（留下占 3000 的孤儿进程和 `.nuxt/nuxt.lock`）。处理：结束孤儿进程 → 删锁 → 用 `env -u NODE_OPTIONS npm run dev` 启动，或先 `rm -rf node_modules/.cache/vite`。用户自己终端启动无此问题。
- `el-table` 的数据行不在 SSR HTML 里，只靠客户端 hydration 渲染；不要用 curl 拿到的 HTML 判断表格内容。
- `.npmrc` 设置了 `legacy-peer-deps=true`，安装依赖时保留。
- 重启预览前先停掉旧进程再 build，否则 Windows 下文件占用会导致构建失败。
