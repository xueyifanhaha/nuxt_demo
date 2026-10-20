import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'

/**
 * GET /api/logs —— 操作日志列表（log:view）
 * 这一步先提供只读列表，用于验证写操作确实落库；日志页的完整改造在下一步。
 */
export default defineEventHandler((event) => {
  requirePerm(event, PERM.LOG_VIEW)

  const query = getQuery(event)
  const page = Math.max(1, Number(query.page) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20))
  const action = String(query.action ?? '').trim()
  const keyword = String(query.q ?? '').trim().toLowerCase()

  const matched = db.listLogs().filter((log) => {
    if (action && log.action !== action) return false
    if (keyword && !`${log.actorName} ${log.targetName} ${log.detail}`.toLowerCase().includes(keyword)) {
      return false
    }
    return true
  })

  const total = matched.length
  const start = (page - 1) * pageSize

  return {
    items: matched.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  }
})
