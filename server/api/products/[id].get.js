import { PERM } from '#shared/permissions'
import { requirePerm } from '../../utils/permission'
import { readProductId, requireProduct } from '../../utils/product'

/** GET /api/products/:id —— 商品详情（product:view） */
export default defineEventHandler((event) => {
  requirePerm(event, PERM.PRODUCT_VIEW)

  const id = readProductId(event)
  const product = requireProduct(id)

  return { item: product }
})
