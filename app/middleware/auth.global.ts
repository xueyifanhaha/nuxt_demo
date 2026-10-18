import type { Permission } from '#shared/permissions'
import { PERM } from '#shared/permissions'
import type { AuthUser } from '#shared/types'

/**
 * 全局路由守卫 —— 页面级权限的那道关。
 * - 未登录访问后台页 → /login?redirect=原地址
 * - 已登录访问 /login → 回后台
 * - 页面所需权限点不足 → /403
 *
 * 注意：这里直接用 useState 读写登录态而不是调 useAuthStore()——
 * SSR 首次导航发生在 Pinia 插件之前，生产环境在中间件里用 store 会报
 * "no active Pinia"。store（app/stores/auth.ts）读写的是同一批 useState，
 * 两边天然同步。
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const permissions = useState<Permission[]>('auth-permissions', () => [])
  const loaded = useState<boolean>('auth-loaded', () => false)
  const requestFetch = useRequestFetch()

  const isLogin = to.path === '/login'

  // 冷启动 / 刷新：向服务端确认会话（SSR 端 requestFetch 会带上浏览器 cookie）
  if (!loaded.value && !isLogin) {
    try {
      const res = await requestFetch<{ user: AuthUser; permissions: Permission[] }>('/api/auth/me')
      user.value = res.user
      permissions.value = res.permissions
    }
    catch {
      user.value = null
      permissions.value = []
    }
    finally {
      loaded.value = true
    }
  }

  if (isLogin) {
    // 已登录还来登录页 → 回到来源页或商品列表
    if (user.value) {
      return navigateTo((to.query.redirect as string) || '/products')
    }
    return
  }

  if (!user.value) {
    return navigateTo(`/login?redirect=${encodeURIComponent(to.fullPath)}`)
  }

  const need = requiredPerm(to.path)
  if (need && !permissions.value.includes(need)) {
    return navigateTo('/403')
  }
})

/** 路由 → 所需权限点。/login、/403 不在表里即公开 */
function requiredPerm(path: string): Permission | null {
  if (path.startsWith('/products/')) return PERM.PRODUCT_EDIT // 详情即编辑页
  if (path.startsWith('/products')) return PERM.PRODUCT_VIEW
  if (path.startsWith('/categories')) return PERM.CATEGORY_VIEW
  if (path.startsWith('/logs')) return PERM.LOG_VIEW
  if (path.startsWith('/roles')) return PERM.ROLE_MANAGE
  return null
}
