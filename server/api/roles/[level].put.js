import { createError } from 'h3'
import { ALL_PERMISSIONS, PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { writeLog } from '../../utils/audit'

/**
 * PUT /api/roles/:level —— 修改某一级角色的权限点（role:manage）。
 *
 * 1 级锁定不可改（服务端也拦，不只靠页面禁用勾选框）；
 * permissions 做白名单过滤：只保留 ALL_PERMISSIONS 里定义过的权限点并去重，
 * 伪造的字符串直接丢弃，而不是报错——客户端传脏数据不该让整次保存失败。
 */
export default defineEventHandler(async (event) => {
  const user = requirePerm(event, PERM.ROLE_MANAGE)

  const level = Number(getRouterParam(event, 'level'))
  const role = Number.isInteger(level) ? db.getRole(level) : null
  if (!role) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { message: '角色不存在' } })
  }
  if (level === 1) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { message: '1 级管理员权限已锁定，不可修改' } })
  }

  const body = await readBody(event)
  const permissions = [...new Set(
    (Array.isArray(body?.permissions) ? body.permissions : [])
      .filter(p => ALL_PERMISSIONS.includes(p)),
  )]

  // 与保存前对比，日志只记真正的增量
  const added = permissions.filter(p => !role.permissions.includes(p))
  const removed = role.permissions.filter(p => !permissions.includes(p))
  const changes = []
  if (added.length > 0) changes.push(`新增 ${added.join('、')}`)
  if (removed.length > 0) changes.push(`移除 ${removed.join('、')}`)

  db.updateRolePermissions(level, permissions)

  if (changes.length > 0) {
    writeLog(user, {
      action: 'role:update',
      targetType: '角色',
      targetId: level,
      targetName: role.label,
      detail: changes.join('；'),
    })
  }

  return { item: db.getRole(level) }
})
