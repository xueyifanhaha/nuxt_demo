import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import type { Category, LogEntry, Product } from '#shared/types'
import type { Permission, RoleDefinition } from '#shared/permissions'
import { ROLE_PRESETS } from '#shared/permissions'
import { SEED_CATEGORIES, SEED_LOGS, SEED_PRODUCTS } from '#shared/seed'

/**
 * 内存数据库：进程内单例，重启回到种子状态（练手项目刻意选择，省掉 fs）。
 * 接口阶段所有 server/api 读写都经过这里，将来换 SQLite/Prisma 时只改这个文件。
 */

export interface StoredUser {
  id: number
  username: string
  name: string
  passwordHash: string
  salt: string
  roleLevel: number
  createdAt: string
}

/* ---------- 密码：scrypt + 随机盐（登录验证用 constant-time 比较） ---------- */

export function hashPassword(password: string, salt = randomBytes(16).toString('hex')) {
  return { salt, passwordHash: scryptSync(password, salt, 64).toString('hex') }
}

export function verifyPassword(user: StoredUser, password: string) {
  const { passwordHash } = hashPassword(password, user.salt)
  const a = Buffer.from(passwordHash, 'hex')
  const b = Buffer.from(user.passwordHash, 'hex')
  return a.length === b.length && timingSafeEqual(a, b)
}

/* ---------- 种子 ---------- */

function seedUsers(): StoredUser[] {
  const make = (id: number, username: string, name: string, roleLevel: number): StoredUser => {
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
    roles: structuredClone(ROLE_PRESETS) as RoleDefinition[],
    categories: structuredClone(SEED_CATEGORIES) as Category[],
    products: structuredClone(SEED_PRODUCTS) as Product[],
    logs: structuredClone(SEED_LOGS) as LogEntry[],

    /* users */
    findUserByUsername(username: string) {
      return this.users.find(u => u.username === username.toLowerCase()) ?? null
    },
    findUserById(id: number) {
      return this.users.find(u => u.id === id) ?? null
    },

    /* roles */
    getRole(level: number) {
      return this.roles.find(r => r.level === level) ?? null
    },
    listRoles() {
      return this.roles
    },
    updateRolePermissions(level: number, permissions: Permission[]) {
      const role = this.getRole(level)
      if (!role || level === 1) return false // 1 级锁定
      role.permissions = [...permissions]
      return true
    },

    /* logs：只增不改不删 */
    appendLog(entry: Omit<LogEntry, 'id' | 'at'> & { at?: string }) {
      const log: LogEntry = {
        id: logSeq++,
        at: entry.at ?? new Date().toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-').slice(0, 16),
        ...entry,
      }
      this.logs.unshift(log) // 新的在前
      return log
    },
    listLogs() {
      return this.logs
    },

    /* products / categories（P3 接口用，先把读写方法备好） */
    listProducts() {
      return this.products
    },
    findProduct(id: number) {
      return this.products.find(p => p.id === id) ?? null
    },
    nextProductId() {
      return productSeq++
    },
    nextCategoryId() {
      return categorySeq++
    },
    listCategories() {
      return this.categories
    },
  }
}

const globalStore = globalThis as unknown as { __shopDb?: ReturnType<typeof createDb> }

/** 进程内单例：dev 热更新时 Nitro 重新执行模块也不会重置数据 */
export const db = (globalStore.__shopDb ??= createDb())
