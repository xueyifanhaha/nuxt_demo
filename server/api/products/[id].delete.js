import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { writeLog } from '../../utils/audit'
import { readProductId, requireProduct } from '../../utils/product'

/**
 * DELETE /api/products/:id —— 删除商品（product:edit）
 * 商品删除是硬删除（内存库），删除后不可恢复；日志保留。
 */
export default defineEventHandler((event) => {
  const user = requirePerm(event, PERM.PRODUCT_EDIT)

  const id = readProductId(event)
  const product = requireProduct(id)

  db.deleteProduct(id)

  writeLog(user, {
    action: 'product:delete',
    targetType: '商品',
    targetId: id,
    targetName: product.name,
    detail: '删除商品',
  })

  return { ok: true, id }
})
