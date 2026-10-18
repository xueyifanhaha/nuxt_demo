import { defineStore } from 'pinia'
import type { Permission } from '#shared/permissions'
import type { AuthUser } from '#shared/types'

/**
 * 登录态与当前用户权限的唯一前端数据源。
 *
 * 实现说明：状态底层用 useState 承载而不是 store 内部 ref——
 * 因为全局路由中间件（SSR）的执行时机早于 Pinia 插件，中间件里
 * 直接调 useAuthStore() 在生产构建会报 "no active Pinia"。
 * useState 存入 nuxt payload，刷新页面时服务端还原，客户端不丢。
 * store 负责业务动作（login/logout/fetchMe），页面只跟 store 打交道。
 */
export const useAuthStore = defineStore('auth', () => {
  const user = useState<AuthUser | null>('auth-user', () => null)
  const permissions = useState<Permission[]>('auth-permissions', () => [])
  /** 是否已经向服务端确认过一次会话（防止守卫重复请求 /me） */
  const loaded = useState<boolean>('auth-loaded', () => false)

  const loggedIn = computed(() => user.value !== null)
  const roleLevel = computed(() => user.value?.roleLevel ?? 0)

  const can = (perm: Permission) => permissions.value.includes(perm)
  const canAny = (...perms: Permission[]) => perms.some(p => can(p))

  async function login(username: string, password: string) {
    const res = await $fetch<{ user: AuthUser; permissions: Permission[] }>('/api/auth/login', {
      method: 'POST',
      body: { username, password },
    })
    user.value = res.user
    permissions.value = res.permissions
    loaded.value = true
    return res.user
  }

  async function fetchMe(requestFetch: typeof $fetch = $fetch) {
    try {
      const res = await requestFetch<{ user: AuthUser; permissions: Permission[] }>('/api/auth/me')
      user.value = res.user
      permissions.value = res.permissions
    }
    catch {
      // 401 等：视为未登录
      user.value = null
      permissions.value = []
    }
    finally {
      loaded.value = true
    }
  }

  async function logout() {
    try {
      await $fetch('/api/auth/logout', { method: 'POST' })
    }
    catch {
      // cookie 清理失败也照常本地登出
    }
    user.value = null
    permissions.value = []
  }

  return { user, permissions, loaded, loggedIn, roleLevel, can, canAny, login, fetchMe, logout }
})
