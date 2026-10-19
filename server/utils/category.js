import { createError, getRouterParam } from 'h3'
import { db } from './db'

/** 分类字段约束：前端表单校验同值，服务端这份才是权威 */
export const CATEGORY_NAME_MIN = 2
export const CATEGORY_NAME_MAX = 20
export const CATEGORY_DESC_MAX = 100

/** 清洗并校验请求体，不合法直接抛 400 */
export function normalizeCategoryBody(body) {
  const name = String(body?.name ?? '').trim()
  const description = String(body?.description ?? '').trim()

  if (name.length < CATEGORY_NAME_MIN || name.length > CATEGORY_NAME_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { message: `分类名称需为 ${CATEGORY_NAME_MIN}–${CATEGORY_NAME_MAX} 个字符` },
    })
  }

  if (description.length > CATEGORY_DESC_MAX) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Bad Request',
      data: { message: `分类描述不能超过 ${CATEGORY_DESC_MAX} 个字符` },
    })
  }

  return { name, description }
}

/** 同名分类拒绝（编辑时排除自身）：分类下拉里出现两个同名项就没法选了 */
export function assertUniqueName(name, excludeId = null) {
  const exists = db.findCategoryByName(name, excludeId)
  if (exists) {
    throw createError({
      statusCode: 409,
      statusMessage: 'Conflict',
      data: { message: `分类「${exists.name}」已存在` },
    })
  }
}

/** 读路由参数里的分类 id；非法值一律按 404 处理 */
export function readCategoryId(event) {
  const id = Number(getRouterParam(event, 'id'))
  return Number.isInteger(id) ? id : NaN
}
