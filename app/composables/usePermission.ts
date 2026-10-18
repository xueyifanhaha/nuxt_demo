import type { Permission, RoleDefinition } from '#shared/permissions'
import { ROLE_PRESETS } from '#shared/permissions'

/**
 * 当前页面能做什么。
 *
 * 权限来自 Pinia 的 useAuthStore（服务端下发）；roles 是权限管理页的可编辑草稿态，
 * 保存后写回这个共享 state——导航、按钮立即跟着变（接口阶段会换成读服务端 roles 表）。
 */
export function usePermission() {
  const auth = useAuthStore()

  const roles = useState<RoleDefinition[]>('roles-state', () => structuredClone(ROLE_PRESETS))

  const role = computed(() => roles.value.find(r => r.level === auth.roleLevel) ?? roles.value[0]!)

  const permissions = computed<Permission[]>(() => auth.permissions)

  const can = (perm: Permission) => auth.can(perm)

  const canAny = (...perms: Permission[]) => perms.some(perm => can(perm))

  return { roles, role, permissions, can, canAny }
}
