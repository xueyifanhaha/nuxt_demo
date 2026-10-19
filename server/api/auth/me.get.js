import { db } from '../../utils/db.js'
import { requireUser } from '../../utils/permission.js'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  return {
    user,
    permissions: db.getRole(user.roleLevel)?.permissions ?? [],
  }
})
