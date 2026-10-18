import { createError, readBody } from 'h3'
import { db, verifyPassword } from '../../utils/db'
import { roleLabel, setSessionCookie } from '../../utils/session'

export default defineEventHandler(async (event) => {
  const body = await readBody<{ username?: string; password?: string }>(event)
  const username = String(body?.username ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!username || !password) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { message: '请输入用户名和密码' } })
  }

  const user = db.findUserByUsername(username)
  // 用户不存在和密码错误返回同一句提示，不暴露账号是否存在
  if (!user || !verifyPassword(user, password)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized', data: { message: '用户名或密码错误' } })
  }

  setSessionCookie(event, user)

  db.appendLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: `${user.roleLevel} 级 · ${roleLabel(user.roleLevel)}`,
    action: 'login',
    targetType: '系统',
    targetId: user.id,
    targetName: user.username,
    detail: '登录成功',
  })

  return {
    user: { id: user.id, username: user.username, name: user.name, roleLevel: user.roleLevel },
    permissions: db.getRole(user.roleLevel)?.permissions ?? [],
  }
})
