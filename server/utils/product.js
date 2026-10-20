import { createError, getQuery, getRouterParam } from 'h3'
import { db } from './db'

/** 商品字段约束：与前端表单一一致，服务端这份才是权威 */
export const PRODUCT_NAME_MIN = 2
export const PRODUCT_NAME_MAX = 40
export const PRODUCT_DESC_MAX = 500
export const PRODUCT_PRICE_MAX = 9999999
export const PRODUCT_STOCK_MAX = 999999
export const PRODUCT_STATUSES = ['on', 'off']

const badRequest = message => createError({
  statusCode: 400,
  statusMessage: 'Bad Request',
  data: { message },
})

/** 清洗并校验请求体（PUT 是全量替换，缺字段按空值处理并报错） */
export function normalizeProductBody(body) {
  const name = String(body?.name ?? '').trim()
  if (name.length < PRODUCT_NAME_MIN || name.length > PRODUCT_NAME_MAX) {
    throw badRequest(`商品名称需为 ${PRODUCT_NAME_MIN}–${PRODUCT_NAME_MAX} 个字符`)
  }

  const description = String(body?.description ?? '').trim()
  if (description.length > PRODUCT_DESC_MAX) {
    throw badRequest(`商品描述不能超过 ${PRODUCT_DESC_MAX} 个字符`)
  }

  // 合法的分类 id 都是整数（待分类是 -1），存在性交给 db 判断
  const categoryId = Number(body?.categoryId)
  if (!Number.isInteger(categoryId)) {
    throw badRequest('请选择商品分类')
  }
  if (!db.findCategory(categoryId)) {
    throw badRequest('分类不存在，请重新选择')
  }

  const price = Number(body?.price)
  if (body?.price === '' || body?.price === null || body?.price === undefined) {
    throw badRequest('请填写单价')
  }
  if (!Number.isFinite(price) || price < 0 || price > PRODUCT_PRICE_MAX) {
    throw badRequest(`单价需为 0–${PRODUCT_PRICE_MAX} 之间的数字`)
  }

  const stock = Number(body?.stock)
  if (!Number.isInteger(stock) || stock < 0 || stock > PRODUCT_STOCK_MAX) {
    throw badRequest(`库存需为 0–${PRODUCT_STOCK_MAX} 之间的整数`)
  }

  return {
    name,
    categoryId,
    price: Math.round(price * 100) / 100, // 价格只保留两位小数，避免浮点尾数
    stock,
    description,
  }
}

/** 读路由参数里的商品 id；非法值返回 NaN，交给 requireProduct 统一按 404 处理 */
export function readProductId(event) {
  const id = Number(getRouterParam(event, 'id'))
  return Number.isInteger(id) ? id : NaN
}

/** 取商品，不存在直接 404（读接口和写接口共用） */
export function requireProduct(id) {
  const product = db.findProduct(id)
  if (!product) {
    throw createError({ statusCode: 404, statusMessage: 'Not Found', data: { message: '商品不存在' } })
  }
  return product
}

/** 上下架状态只接受 on / off */
export function normalizeStatus(value) {
  if (!PRODUCT_STATUSES.includes(value)) {
    throw badRequest('上下架状态只能是 on 或 off')
  }
  return value
}

export const statusText = status => (status === 'on' ? '上架' : '下架')

/**
 * 解析列表 query。
 * 分页参数写错就回退默认值（URL 常被手改）；筛选参数写错直接 400，避免"筛了却没筛"的错觉。
 */
export function readProductQuery(event) {
  const query = getQuery(event)

  const page = Number.isNaN(Number.parseInt(query.page, 10))
    ? 1
    : Math.max(Number.parseInt(query.page, 10), 1)
  const rawPageSize = Number.parseInt(query.pageSize, 10)
  const pageSize = Number.isNaN(rawPageSize) ? 8 : Math.min(Math.max(rawPageSize, 1), 100)

  let categoryId = null
  if (query.categoryId !== undefined && query.categoryId !== '') {
    categoryId = Number(query.categoryId)
    if (!Number.isInteger(categoryId)) {
      throw badRequest('分类筛选参数不合法')
    }
  }

  let status = null
  if (query.status !== undefined && query.status !== '') {
    if (!PRODUCT_STATUSES.includes(query.status)) {
      throw badRequest('状态筛选参数只能是 on 或 off')
    }
    status = query.status
  }

  return {
    q: String(query.q ?? '').trim(),
    categoryId,
    status,
    page,
    pageSize,
  }
}

/** 只把真正变化的字段写进日志，格式与种子日志保持一致 */
export function describeProductChanges(before, after) {
  const changes = []

  if (before.name !== after.name) {
    changes.push(`名称 ${before.name} → ${after.name}`)
  }
  if (before.categoryId !== after.categoryId) {
    const from = db.findCategory(before.categoryId)?.name ?? '待分类'
    const to = db.findCategory(after.categoryId)?.name ?? '待分类'
    changes.push(`分类 ${from} → ${to}`)
  }
  if (before.price !== after.price) {
    changes.push(`价格 ${before.price} → ${after.price}`)
  }
  if (before.stock !== after.stock) {
    changes.push(`库存 ${before.stock} → ${after.stock}`)
  }
  if ((before.description ?? '') !== after.description) {
    changes.push(after.description ? '描述已更新' : '描述已清空')
  }

  return changes
}
