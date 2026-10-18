/**
 * 前后端共用的数据结构。
 * 接口阶段 server/ 的校验和返回值都以这里的类型为准。
 */

export type ProductStatus = 'on' | 'off'

/** 登录后暴露给前端的用户信息（不含密码哈希） */
export interface AuthUser {
  id: number
  username: string
  name: string
  roleLevel: number
}

export interface Category {
  id: number
  name: string
  description?: string
  createdAt: string
}

export interface Product {
  id: number
  name: string
  sku: string
  categoryId: number
  price: number
  stock: number
  status: ProductStatus
  description: string
  createdAt: string
  updatedAt: string
  updatedBy: string
}

export interface LogEntry {
  id: number
  at: string
  actorId: number
  actorName: string
  actorRole: string
  action: string
  targetType: string
  targetId: number | string
  targetName: string
  detail: string
}
