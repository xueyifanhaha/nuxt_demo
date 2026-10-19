# 商品运营后台

一个用于练习 **Nuxt 4 + Vue 3** 的电商后台管理项目，核心课题是**三层角色权限模型**如何贯穿导航、路由、按钮与接口。

> 当前状态：登录认证已接入真实服务端（Nitro 接口 + 签名 cookie 会话 + 全局路由守卫）。商品、分类、日志、角色仍使用 `shared/seed.ts` 的种子数据，写操作只在客户端生效，尚未持久化。

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Nuxt 4（Nitro / Vue 3.5 / Vite） |
| UI 组件库 | Element Plus（`@element-plus/nuxt`，主色已覆盖为 `#2563eb`） |
| 状态管理 | Pinia（`@pinia/nuxt`，登录态与权限存于 `app/stores/auth.ts`） |
| 权限定义 | `shared/permissions.ts`，前后端共用一份（`#shared` 别名） |

## 快速开始

```bash
# 安装依赖
npm install

# 启动开发服务器（http://localhost:3000）
npm run dev

# 生产构建 + 本地预览
npm run build
npm run preview
```

> 提示：新增/升级依赖后首次启动，若 Vite 报 `SAFE_DELETE_BULK_CONFIRM_REQUIRED`，
> 是依赖预构建缓存清理被批量删除护栏拦截所致，删除 `node_modules/.cache/vite` 后重启即可。

## 演示账号

| 账号 | 级别 | 能做什么 |
| --- | --- | --- |
| `admin` | 1 级 · 管理员 | 全部功能，含操作日志与权限管理 |
| `editor` | 2 级 · 运营 | 编辑商品、上下架、维护分类；看不到操作日志 |
| `viewer` | 3 级 · 只读 | 只能查看；没有编辑按钮，进不了商品详情 |

密码统一为 `demo-123456`（服务端以 scrypt 加盐哈希存储）。未登录访问后台页会跳转登录页，权限不足的页面会被全局守卫拦到 403。

## 页面与权限

| 路由 | 页面 | 所需权限 |
| --- | --- | --- |
| `/login` | 登录 | 公开 |
| `/products` | 商品列表：分类筛选、关键词、状态、分页 | `product:view` |
| `/products/[id]` | 商品编辑：价格、库存、描述、上下架 | `product:edit` |
| `/categories` | 分类管理 | `category:view`（编辑需 `category:edit`） |
| `/logs` | 操作日志 | `log:view`（仅 1 级） |
| `/roles` | 权限管理：调整 2/3 级的权限点 | `role:manage`（仅 1 级） |
| `/403` · `error.vue` | 无权限 / 404 / 500 | — |

权限分四级落地：**导航过滤 → 路由守卫 → 按钮显隐 → 服务端接口校验**。
前三层负责体验，最后一层是真正的安全边界，由 `server/utils/permission.ts` 的 `requirePerm()` 实施。

## 目录结构

```text
app/
  assets/css/main.css        # 全局样式 + Element Plus 主题变量
  layouts/                   # default（后台壳）/ auth（登录）
  middleware/
    auth.global.ts           # 全局守卫：登录态、redirect、页面权限
  stores/
    auth.ts                  # Pinia：登录态、权限、login/logout/fetchMe
  composables/
    usePermission.ts         # 页面权限判断（can / canAny / roles 草稿）
  pages/
    login.vue
    403.vue
    products/index.vue       # 商品列表
    products/[id].vue        # 商品编辑
    categories.vue
    logs.vue
    roles.vue
shared/
  permissions.ts             # 权限点、角色预设、导航与分组定义
  seed.ts                    # 服务端与页面共用的种子数据
  types.ts                   # 共享类型
server/
  api/auth/                  # login / logout / me
  utils/
    db.ts                    # 内存数据库（进程内单例）
    session.ts               # HMAC 签名 cookie 会话
    permission.ts            # requireUser / requirePerm
```

## 开发路线

- [x] 登录页与真实认证（登录 / 登出 / 刷新恢复会话）
- [x] 全局路由守卫、页面级权限与 403 / 错误页
- [x] 后台布局（侧边栏 + 顶栏 + 当前用户 / 退出）
- [x] 商品列表、商品编辑、分类管理、操作日志、权限管理页面
- [x] 服务端会话与 `requireUser` / `requirePerm` 权限关卡
- [ ] 商品 / 分类 / 日志 / 角色写接口与持久化（目前页面仍读种子数据）
- [ ] 权限管理页保存后写回服务端角色表

## 说明

- 商品、分类、日志、角色数据当前来自 `shared/seed.ts`，写操作只在页面内存中生效，刷新还原；服务端内存库同样重启重置。
- `el-table` 的数据行不做 SSR，服务端返回的 HTML 中表格为空属正常，由客户端 hydration 填充。
