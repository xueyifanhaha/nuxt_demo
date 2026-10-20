# 商品运营后台

一个用于练习 **Nuxt 4 + Vue 3** 的电商后台管理项目，核心课题是**三层角色权限模型**如何贯穿导航、路由、按钮与接口。

> 当前状态：认证、分类、商品（列表 + 详情 + 新建）、操作日志、权限管理已全部接入真实服务端（Nitro 接口 + 签名 cookie 会话 + 全局路由守卫）。数据存在内存库中，进程重启回到种子状态。

## 技术栈

| 分类 | 选型 |
| --- | --- |
| 框架 | Nuxt 4（Nitro / Vue 3.5 / Vite） |
| UI 组件库 | Element Plus（`@element-plus/nuxt`，主色已覆盖为 `#2563eb`） |
| 状态管理 | Pinia（`@pinia/nuxt`，登录态与权限存于 `app/stores/auth.js`） |
| 权限定义 | `shared/permissions.js`，前后端共用一份（`#shared` 别名） |

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
    auth.global.js           # 全局守卫：登录态、redirect、页面权限
  stores/
    auth.js                  # Pinia：登录态、权限、login/logout/fetchMe
  composables/
    usePermission.js         # 页面权限判断（can / canAny / roles 草稿）
    useApi.js                # 接口统一入口（products / categories / auth / logs + raw）
  pages/
    login.vue
    403.vue
    products/index.vue       # 商品列表（服务端分页筛选）
    products/[id].vue        # 商品编辑
    categories.vue
    logs.vue
    roles.vue
shared/
  permissions.js             # 权限点、角色预设、导航与分组定义
  seed.js                    # 服务端种子数据（前端已不再直接引用）
server/
  api/
    auth/                    # login / logout / me
    categories/              # 分类增删改查
    products/                # 列表 / 详情 / 编辑 / 上下架 / 删除
    logs/index.get.js        # 操作日志（只读，分页 + 筛选）
  utils/
    db.js                    # 内存数据库（进程内单例）
    session.js               # HMAC 签名 cookie 会话
    permission.js            # requireUser / requirePerm
    audit.js                 # writeLog：写操作日志
    category.js              # 分类参数校验
    product.js               # 商品参数校验 + 变更文案
```

## 开发路线

- [x] 登录页与真实认证（登录 / 登出 / 刷新恢复会话）
- [x] 全局路由守卫、页面级权限与 403 / 错误页
- [x] 后台布局（侧边栏 + 顶栏 + 当前用户 / 退出）
- [x] 商品列表、商品编辑、分类管理、操作日志、权限管理页面
- [x] 服务端会话与 `requireUser` / `requirePerm` 权限关卡
- [x] 分类接口（增删改查 + 权限校验 + 操作日志，删除时商品移入「待分类」）
- [x] 商品接口（分页筛选 + 详情 + 新建 + 编辑 + 上下架 + 删除，写操作落日志）
- [x] 商品列表页接入真实接口（筛选/分页合并成 `query`，上下架与删除走 `useApi`）
- [x] 商品详情页接入真实接口（SSR 取数、404 → 错误页、保存后清列表缓存）
- [x] 新建商品（`POST /api/products`，与详情页共用 `/products/[id]`，`/products/new` 为空表模式）
- [x] 日志页接入真实接口（`useAsyncData('logs')` + `api.logs.list`，筛选/分页全走服务端）
- [x] 权限管理页写回服务端（`GET/PUT /api/roles`，保存落库并写 `role:update` 日志；1 级锁定由服务端兜底）

## 说明

- 五个模块（认证、分类、商品、日志、权限）全部走服务端接口。权限管理页保存后，相关角色用户的**下一次请求**即按新矩阵校验；在线用户界面上的导航与按钮来自登录时的权限快照，重新登录后同步。服务端内存库重启回到种子状态。
- 所有接口调用统一走 `app/composables/useApi.js`（全项目唯一写 URL 的地方）。事件回调用 `useApi()`，可能跑在 SSR 的地方用 `useApi(useRequestFetch())`；`useAsyncData` 不进封装，留在页面里配 key/watch。
- 商品列表的筛选与分页只存在页面内存中，不写入 URL；刷新页面会回到默认视图（全部商品、第一页）。日志页同理。
- 日志页是纯只读：没有乐观更新，筛选/翻页/改每页条数都只靠 `query` 变化触发重新取数；改每页条数会回到第 1 页，避免页码越界后表格空白。
- Element Plus 未配置 `zh-cn` locale，分页器每页条数显示为 `8/page`（商品页同样如此）。
- 商品详情页保存成功后会 `clearNuxtData('products')`，避免返回列表时命中保存前的旧快照。
- 新建商品复用 `/products/[id]` 页面：路由 `/products/new`（`id` 是字符串 `new`，与数字 id 不会冲突）。`POST` 的 `id / sku / status / 时间戳` 全由服务端生成，初始状态固定为「下架」；SKU 走独立递增序列，删除商品后也不复用旧号。
- `el-table` 的数据行不做 SSR，服务端返回的 HTML 中表格为空属正常，数据由 payload 在客户端 hydration 时填充。
