import { clearSessionCookie } from '../../utils/session.js'

export default defineEventHandler((event) => {
  clearSessionCookie(event)
  return { ok: true }
})
