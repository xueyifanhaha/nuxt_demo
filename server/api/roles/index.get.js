import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'

/** GET /api/roles —— 角色与权限点列表（role:manage） */
export default defineEventHandler((event) => {
  requirePerm(event, PERM.ROLE_MANAGE)

  return { items: db.listRoles() }
})
