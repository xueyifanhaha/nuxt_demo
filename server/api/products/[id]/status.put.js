import { PERM } from '#shared/permissions'
import { db, formatNow } from '../../../utils/db'
import { requirePerm } from '../../../utils/permission'
import { writeLog } from '../../../utils/audit'
import {
  normalizeStatus,
  readProductId,
  requireProduct,
  statusText,
} from '../../../utils/product'

/**
 * PUT /api/products/:id/status —— 上下架（product:status）
 * 单独一个权限点：2 级可以上下架，但不代表能改价格库存。
 */
export default defineEventHandler(async (event) => {
  const user = requirePerm(event, PERM.PRODUCT_STATUS)

  const id = readProductId(event)
  const before = requireProduct(id)

  const body = await readBody(event)
  const status = normalizeStatus(body?.status)

  // 状态没变就不写库也不写日志，避免日志被重复点击刷屏
  if (status === before.status) {
    return { item: before }
  }

  // 先记下旧状态：db.updateProduct 是原地改对象，更新后 before.status 会跟着变
  const fromStatus = before.status

  const product = db.updateProduct(id, {
    status,
    updatedAt: formatNow(),
    updatedBy: user.username,
  })

  writeLog(user, {
    action: 'product:status',
    targetType: '商品',
    targetId: id,
    targetName: product.name,
    detail: `${statusText(fromStatus)} → ${statusText(status)}`,
  })

  return { item: product }
})
