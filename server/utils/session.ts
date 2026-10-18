import { createHmac, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'
import { getCookie, setCookie, deleteCookie } from 'h3'
import type { AuthUser } from '#shared/types'
import { db, type StoredUser } from './db'

/**
 * 会话：自实现的签名 cookie（HMAC-SHA256）。
 * 没上 JWT 库 / redis，是因为练习项目只需要「cookie 里带 uid + 防篡改签名」这一层；
 * payload 不含敏感信息，签名密钥从环境变量读，缺省给 dev 值。
 */

const COOKIE_NAME = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 天
const SECRET = process.env.SESSION_SECRET ?? 'nuxt-demo-dev-secret-change-me'

interface SessionPayload {
  uid: number
  exp: number
}

function base64url(input: Buffer | string) {
  return Buffer.from(input).toString('base64url')
}

function sign(data: string) {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function createSessionToken(user: StoredUser) {
  const payload: SessionPayload = { uid: user.id, exp: Date.now() + MAX_AGE * 1000 }
  const body = base64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

function verifySessionToken(token: string): SessionPayload | null {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload
    if (!payload?.uid || payload.exp < Date.now()) return null
    return payload
  }
  catch {
    return null
  }
}

export function setSessionCookie(event: H3Event, user: StoredUser) {
  setCookie(event, COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    // 本地练习走 http；部署到 HTTPS 后改为 true
    secure: false,
  })
}

export function clearSessionCookie(event: H3Event) {
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}

/** 从请求里还原当前用户；cookie 缺失 / 签名无效 / 用户已不存在 都返回 null */
export function getSessionUser(event: H3Event): AuthUser | null {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  const user = db.findUserById(payload.uid)
  if (!user) return null

  return { id: user.id, username: user.username, name: user.name, roleLevel: user.roleLevel }
}

/** 前端展示用的角色文案（写日志时用） */
export function roleLabel(level: number) {
  return db.getRole(level)?.label ?? `${level} 级`
}
