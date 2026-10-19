import { createError } from 'h3'
import { db } from './db'
import { getSessionUser } from './session'

/**
 * 接口层的权限关卡：所有写接口的第一行。
 * 401 = 未登录；403 = 登录了但没有这个权限点。
 * 前端藏按钮只是体验，这里才是真正的安全边界。
 */

export function requireUser(event) {
  const user = getSessionUser(event)
  if (!user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized',
      data: { message: '登录已过期，请重新登录' },
    })
  }
  return user
}

export function requirePerm(event, perm) {
  const user = requireUser(event)
  const role = db.getRole(user.roleLevel)

  if (!role || !role.permissions.includes(perm)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
      data: { message: `没有权限：${perm}` },
    })
  }
  return user
}
