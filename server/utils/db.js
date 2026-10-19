import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { ROLE_PRESETS } from '#shared/permissions'
import { SEED_CATEGORIES, SEED_LOGS, SEED_PRODUCTS, UNCATEGORIZED_ID } from '#shared/seed'

/**
 * 内存数据库：进程内单例，重启回到种子状态（练手项目刻意选择，省掉 fs）。
 * 接口阶段所有 server/api 读写都经过这里，将来换 SQLite/Prisma 时只改这个文件。
 */

/* ---------- 密码：scrypt + 随机盐（登录验证用 constant-time 比较） ---------- */

export function hashPassword(password, salt = randomBytes(16).toString('hex')) {
  return { salt, passwordHash: scryptSync(password, salt, 64).toString('hex') }
}

export function verifyPassword(user, password) {
  const { passwordHash } = hashPassword(password, user.salt)
  const a = Buffer.from(passwordHash, 'hex')
  const b = Buffer.from(user.passwordHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/* ---------- 种子 ---------- */

/** 统一的时间格式：2026-10-19 20:08 */
export function formatNow() {
  return new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16)
}

function seedUsers() {
  const make = (id, username, name, roleLevel) => {
    const { salt, passwordHash } = hashPassword('demo-123456')
    return { id, username, name, passwordHash, salt, roleLevel, createdAt: '2026-08-01 09:00' }
  }
  return [
    make(1, 'admin', '管理员', 1),
    make(2, 'editor', '小运', 2),
    make(3, 'viewer', '小看', 3),
  ]
}

function createDb() {
  let logSeq = Math.max(...SEED_LOGS.map(l => l.id)) + 1
  let productSeq = Math.max(...SEED_PRODUCTS.map(p => p.id)) + 1
  let categorySeq = Math.max(...SEED_CATEGORIES.map(c => c.id)) + 1

  return {
    users: seedUsers(),
    roles: structuredClone(ROLE_PRESETS),
    categories: structuredClone(SEED_CATEGORIES),
    products: structuredClone(SEED_PRODUCTS),
    logs: structuredClone(SEED_LOGS),

    /* users */
    findUserByUsername(username) {
      return this.users.find(u => u.username === username.toLowerCase()) ?? null
    },
    findUserById(id) {
      return this.users.find(u => u.id === id) ?? null
    },

    /* roles */
    getRole(level) {
      return this.roles.find(r => r.level === level) ?? null
    },
    listRoles() {
      return this.roles
    },
    updateRolePermissions(level, permissions) {
      const role = this.getRole(level)
      if (!role || level === 1) return false // 1 级锁定
      role.permissions = [...permissions]
      return true
    },

    /* logs：只增不改不删 */
    appendLog(entry) {
      const log = {
        id: logSeq++,
        at: entry.at ?? formatNow(),
        ...entry,
      }
      this.logs.unshift(log) // 新的在前
      return log
    },
    listLogs() {
      return this.logs
    },

    /* products（列表接口下一步用） */
    listProducts() {
      return this.products
    },
    findProduct(id) {
      return this.products.find(p => p.id === id) ?? null
    },
    nextProductId() {
      return productSeq++
    },

    /* categories */
    listCategories() {
      return this.categories
    },
    findCategory(id) {
      return this.categories.find(c => c.id === id) ?? null
    },
    findCategoryByName(name, excludeId = null) {
      const target = name.trim().toLowerCase()
      return this.categories.find(c => c.id !== excludeId && c.name.toLowerCase() === target) ?? null
    },
    countProductsInCategory(id) {
      return this.products.filter(p => p.categoryId === id).length
    },
    createCategory({ name, description }) {
      const category = {
        id: categorySeq++,
        name,
        description,
        createdAt: formatNow(),
      }
      this.categories.push(category)
      return category
    },
    updateCategory(id, { name, description }) {
      const category = this.findCategory(id)
      if (!category) return null
      category.name = name
      category.description = description
      return category
    },
    /** 删除分类：该分类下的商品先移到「未分类」，再移除分类本身 */
    deleteCategory(id) {
      const index = this.categories.findIndex(c => c.id === id)
      if (index < 0) return null

      const [removed] = this.categories.splice(index, 1)
      let moved = 0
      for (const product of this.products) {
        if (product.categoryId === id) {
          product.categoryId = UNCATEGORIZED_ID
          moved += 1
        }
      }
      return { removed, moved }
    },
  }
}

const globalStore = globalThis

/** 进程内单例：dev 热更新时 Nitro 重新执行模块也不会重置数据 */
export const db = (globalStore.__shopDb ??= createDb())
