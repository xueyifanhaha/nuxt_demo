import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { writeLog } from '../../utils/audit'
import { normalizeProductBody } from '../../utils/product'

/**
 * POST /api/products —— 新建商品（product:edit）
 *
 * 与 PUT 共用 normalizeProductBody，校验规则只有一份。
 * 请求体里即使带了 sku / status / id 也会被忽略：这三个由服务端决定，
 * 其中 status 固定从「下架」起步 —— 新建即上架容易把没填完的商品直接暴露出去。
 */
export default defineEventHandler(async (event) => {
  const user = requirePerm(event, PERM.PRODUCT_EDIT)

  const body = await readBody(event)
  const fields = normalizeProductBody(body)

  const product = db.createProduct({ ...fields, updatedBy: user.username })

  writeLog(user, {
    action: 'product:create',
    targetType: '商品',
    targetId: product.id,
    targetName: product.name,
    detail: `新建商品 ${product.sku}，初始状态：下架`,
  })

  // 201 表示「已创建」，与 PUT 的 200 区分开
  setResponseStatus(event, 201)
  return { item: product }
})
