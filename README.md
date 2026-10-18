# 商品运营后台

一个用于练习 **Nuxt 4 + Vue 3** 的电商后台管理项目，核心课题是**三层角色权限模型**如何贯穿导航、路由、按钮与接口。

> 当前状态：静态页面阶段。登录、服务端接口（`server/api`）尚未接入，权限由顶栏的「预览角色」开关模拟。

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Nuxt 4（Nitro / Vue 3.5 / Vite） |
| UI 组件库 | Element Plus（`@element-plus/nuxt`，主色已覆盖为 `#2563eb`） |
| 状态管理 | Pinia（`@pinia/nuxt`，暂未大量使用，随服务端接入启用） |
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

## 演示账号（服务端接入后可用）

| 账号 | 级别 | 能做什么 |
| --- | --- | --- |
| `admin` | 1 级 · 管理员 | 全部功能，含操作日志与权限管理 |
| `editor` | 2 级 · 运营 | 编辑商品、上下架、维护分类；看不到操作日志 |
| `viewer` | 3 级 · 只读 | 只能查看；没有编辑按钮，进不了商品详情 |

密码统一为 `123456`。静态阶段可在页面顶栏用「预览角色 1 / 2 / 3」切换体验。

## 页面与权限

| 路由 | 页面 | 所需权限 |
| --- | --- | --- |
| `/login` | 登录 | 公开 |
| `/admin/products` | 商品列表：分类筛选、关键词、状态、分页 | `product:view` |
| `/admin/products/[id]` | 商品编辑：价格、库存、图片、描述、上下架 | `product:edit` |
| `/admin/categories` | 分类管理 | `category:view`（编辑需 `category:edit`） |
| `/admin/logs` | 操作日志 | `log:view`（仅 1 级） |
| `/admin/roles` | 权限管理：调整 2/3 级的权限点 | `role:manage`（仅 1 级） |
| `/403` · `error.vue` | 无权限 / 404 / 500 | — |

权限分四级落地：**导航过滤 → 路由守卫 → 按钮显隐 → 服务端接口校验**。
前三层负责体验，最后一层是真正的安全边界（接入 `server/api` 后由 `requirePerm()` 实施）。

## 目录结构

```text
app/
  assets/css/main.css        # 全局样式 + Element Plus 主题变量
  layouts/                   # default（后台壳）/ auth（登录）
  composables/
    usePermission.ts         # 权限判断入口（can / canAny）
  pages/
    login.vue
    403.vue
    admin/
      products/index.vue     # 商品列表
      products/[id].vue      # 商品编辑
      categories.vue
      logs.vue
      roles.vue
shared/
  permissions.ts             # 权限点、角色预设、导航与分组定义
server/                      # 待实现：Nitro 接口与会话
```

## 开发路线

- [x] 登录页（静态）
- [x] 后台布局（侧边栏 + 顶栏 + 角色预览开关）
- [x] 商品列表页（本地筛选与分页）
- [x] 其余页面骨架与 403 / 错误页
- [ ] 商品编辑页（图片、价格、库存、描述、上下架）
- [ ] 分类管理、操作日志、权限管理页
- [ ] `server/api`：登录会话、商品 / 分类 / 日志 / 角色接口，服务端权限校验与操作日志落库
- [ ] 移除「预览角色」临时开关，切换为真实登录态

## 说明

- 商品数据当前为页面内静态数据（12 条），接入接口后改为服务端分页筛选。
- `el-table` 的数据行不做 SSR，服务端返回的 HTML 中表格为空属正常，由客户端 hydration 填充。
