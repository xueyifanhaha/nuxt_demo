import { PERM } from '#shared/permissions'
import { db, formatNow } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { writeLog } from '../../utils/audit'
import {
  describeProductChanges,
  normalizeProductBody,
  readProductId,
  requireProduct,
} from '../../utils/product'

/** PUT /api/products/:id —— 编辑商品（product:edit），全量更新 */
export default defineEventHandler(async (event) => {
  const user = requirePerm(event, PERM.PRODUCT_EDIT)

  const id = readProductId(event)
  const before = requireProduct(id)

  const body = await readBody(event)
  const next = normalizeProductBody(body)

  // 先算差异再写库，日志里才有「改前 → 改后」
  const changes = describeProductChanges(before, next)

  const product = db.updateProduct(id, {
    ...next,
    updatedAt: formatNow(),
    updatedBy: user.username,
  })

  if (changes.length > 0) {
    writeLog(user, {
      action: 'product:update',
      targetType: '商品',
      targetId: id,
      targetName: product.name,
      detail: changes.join('；'),
    })
  }

  return { item: product }
})
