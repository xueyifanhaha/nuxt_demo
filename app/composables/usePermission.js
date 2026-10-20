import { ROLE_PRESETS } from '#shared/permissions'

/**
 * 当前页面能做什么。
 *
 * 权限来自 Pinia 的 useAuthStore（服务端下发）；role 只做展示（级别 + 名称文案），
 * 直接读 ROLE_PRESETS——权限管理页只改 permissions，角色的 label 是静态的，
 * 没必要为了一个文案维护一份跨页面共享的可变状态。
 */
export function usePermission() {
  const auth = useAuthStore()

  const role = computed(() =>
    ROLE_PRESETS.find(r => r.level === auth.roleLevel) ?? ROLE_PRESETS[0],
  )

  const permissions = computed(() => auth.permissions)

  const can = perm => auth.can(perm)

  const canAny = (...perms) => perms.some(perm => can(perm))

  return { role, permissions, can, canAny }
}
