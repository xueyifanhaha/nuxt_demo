import { createError } from 'h3'
import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { readCategoryId } from '../../utils/category'
import { writeLog } from '../../utils/audit'

/**
 * DELETE /api/categories/:id —— 删除分类（category:edit）
 * 分类下还有商品也允许删除：这些商品先移到系统分类「未分类」，再删分类。
 * 前端会在确认框里提示将迁移的商品数量。
 */
export default defineEventHandler((event) => {
  const user = requirePerm(event, PERM.CATEGORY_EDIT)
  const id = readCategoryId(event)

  const category = db.findCategory(id)
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { message: '分类不存在' } })
  }
  if (category.system) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { message: '系统分类不可删除' } })
  }

  const { removed, moved } = db.deleteCategory(id)

  writeLog(user, {
    action: 'category:delete',
    targetType: '分类',
    targetId: id,
    targetName: removed.name,
    detail: moved > 0 ? `删除分类，${moved} 件商品移入「未分类」` : '删除分类（无关联商品）',
  })

  return { ok: true, moved }
})
