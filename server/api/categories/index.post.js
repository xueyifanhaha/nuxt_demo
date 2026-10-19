import { PERM } from '#shared/permissions'
import { db } from '../../utils/db'
import { requirePerm } from '../../utils/permission'
import { assertUniqueName, normalizeCategoryBody } from '../../utils/category'
import { writeLog } from '../../utils/audit'

/** POST /api/categories —— 新建分类（category:edit） */
export default defineEventHandler(async (event) => {
  const user = requirePerm(event, PERM.CATEGORY_EDIT)
  const body = await readBody(event)

  const { name, description } = normalizeCategoryBody(body)
  assertUniqueName(name)

  const category = db.createCategory({ name, description })

  writeLog(user, {
    action: 'category:create',
    targetType: '分类',
    targetId: category.id,
    targetName: category.name,
    detail: '新建分类',
  })

  setResponseStatus(event, 201)
  return { item: { ...category, productCount: 0 } }
})
