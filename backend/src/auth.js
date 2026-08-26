import jwt from 'jsonwebtoken'
import { saveDB, getDB } from './database.js'

const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me-please'
const EXPIRES = process.env.JWT_EXPIRES_IN || '7d'

export const signToken = (user) => {
  return jwt.sign(
    { sub: user.id, nickname: user.nickname, avatar: user.avatar },
    SECRET,
    { expiresIn: EXPIRES }
  )
}

export const authRequired = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (!token) {
    return res.status(401).json({ code: 401, data: null, message: '未登录，请先扫码登录' })
  }
  try {
    const payload = jwt.verify(token, SECRET)
    req.user = { id: payload.sub, nickname: payload.nickname, avatar: payload.avatar }
    next()
  } catch (err) {
    return res.status(401).json({ code: 401, data: null, message: '登录已过期，请重新扫码' })
  }
}

export const authOptional = (req, res, next) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : null
  if (token) {
    try {
      const payload = jwt.verify(token, SECRET)
      req.user = { id: payload.sub, nickname: payload.nickname, avatar: payload.avatar }
    } catch (_) {}
  }
  next()
}

export const runExec = (sql, params = []) => {
  const db = getDB()
  const stmt = db.prepare(sql)
  stmt.bind(params)
  stmt.step()
  stmt.free()
  saveDB()
}

export const runQuery = (sql, params = []) => {
  const db = getDB()
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) results.push(stmt.getAsObject())
  stmt.free()
  return results
}
