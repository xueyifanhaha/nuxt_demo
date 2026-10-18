import type { Permission, RoleDefinition } from '#shared/permissions'
import { ROLE_PRESETS } from '#shared/permissions'

/**
 * 当前页面能做什么。
 *
 * roles 是可变的共享状态：权限管理页保存后写回这里，侧边栏 / 按钮 / 页面权限立即跟着变，
 * 不用重新登录——接口阶段这个 state 会换成 Pinia store + 服务端返回的角色数据。
 */
export function usePermission() {
  const previewLevel = useState<number>('preview-role-level', () => 1)

  const roles = useState<RoleDefinition[]>('roles-state', () => structuredClone(ROLE_PRESETS))

  const role = computed(() => roles.value.find(r => r.level === previewLevel.value) ?? roles.value[0]!)

  const permissions = computed<Permission[]>(() => role.value.permissions)

  const can = (perm: Permission) => permissions.value.includes(perm)

  const canAny = (...perms: Permission[]) => perms.some(perm => can(perm))

  return { previewLevel, roles, role, permissions, can, canAny }
}
