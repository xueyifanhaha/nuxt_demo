import { createError } from 'h3'
import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { assertUniqueName, normalizeCategoryBody, readCategoryId } from '../../utils/category'
import { writeLog } from '../../utils/audit'

/** PUT /api/categories/:id —— 编辑分类（category:edit） */
export default defineEventHandler(async (event) => {
  const user = requirePerm(event, PERM.CATEGORY_EDIT)
  const id = readCategoryId(event)

  const category = db.findCategory(id)
  if (!category) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { message: '分类不存在' } })
  }
  if (category.system) {
    throw createError({ statusCode: 400, statusMessage: 'Bad Request', data: { message: '系统分类不可修改' } })
  }

  const body = await readBody(event)
  const { name, description } = normalizeCategoryBody(body)
  assertUniqueName(name, id)

  // 只把真正变化的字段写进日志
  const changes = []
  if (category.name !== name) changes.push(`名称 ${category.name} → ${name}`)
  if ((category.description ?? '') !== description) {
    changes.push(description ? '描述已更新' : '描述已清空')
  }

  db.updateCategory(id, { name, description })

  if (changes.length > 0) {
    writeLog(user, {
      action: 'category:update',
      targetType: '分类',
      targetId: id,
      targetName: name,
      detail: changes.join('；'),
    })
  }

  return { item: { ...category, productCount: db.countProductsInCategory(id) } }
})
