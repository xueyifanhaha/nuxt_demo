import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { readProductQuery } from '../../utils/product'

/**
 * GET /api/products
 * 分页 + 筛选（q 关键词 / categoryId / status），返回 total 供前端分页器使用。
 * 排序由 db 固定为 id 升序。
 */
export default defineEventHandler((event) => {
  requirePerm(event, PERM.PRODUCT_VIEW)

  const { q, categoryId, status, page, pageSize } = readProductQuery(event)
  const { items, total } = db.listProducts({ q, categoryId, status, page, pageSize })

  return { items, total, page, pageSize }
})
