import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'

/**
 * GET /api/categories
 * 分类数量很少，不做分页；productCount 由服务端统计（前端不再自己数商品）。
 * 系统分类「待分类」排最后。
 */
export default defineEventHandler((event) => {
  requirePerm(event, PERM.CATEGORY_VIEW)

  const items = db
    .listCategories()
    .map(category => ({
      ...category,
      productCount: db.countProductsInCategory(category.id),
    }))
    .sort((a, b) => Number(Boolean(a.system)) - Number(Boolean(b.system)) || a.id - b.id)

  return { items }
})
