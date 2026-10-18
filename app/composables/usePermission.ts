import type { Permission } from '#shared/permissions'
import { ROLE_PRESETS } from '#shared/permissions'

/**
 * 当前页面能做什么。
 *
 * 现在权限来源是顶栏的「预览角色」临时开关；接入登录后，
 * 只要把 permissions 换成读 store 里的当前用户权限，页面代码一行都不用改。
 */
export function usePermission() {
  const previewLevel = useState<number>('preview-role-level', () => 1)

  const role = computed(() => ROLE_PRESETS.find(r => r.level === previewLevel.value) ?? ROLE_PRESETS[0]!)

  const permissions = computed<Permission[]>(() => role.value.permissions)

  const can = (perm: Permission) => permissions.value.includes(perm)

  const canAny = (...perms: Permission[]) => perms.some(perm => can(perm))

  return { previewLevel, role, permissions, can, canAny }
}
