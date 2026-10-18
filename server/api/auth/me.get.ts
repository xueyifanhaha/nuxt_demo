import { db } from '../../utils/db'
import { requireUser } from '../../utils/permission'

export default defineEventHandler((event) => {
  const user = requireUser(event)
  return {
    user,
    permissions: db.getRole(user.roleLevel)?.permissions ?? [],
  }
})
