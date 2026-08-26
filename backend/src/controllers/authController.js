import crypto from 'crypto'
import { v4 as uuidv4 } from 'uuid'
import { runExec, runQuery, signToken } from '../auth.js'

const exec = runExec
const query = runQuery

const MAX_FAIL_BY_USER = 5 // 同账号 15 分钟内失败上限
const MAX_FAIL_BY_IP = 20  // 同 IP 1 小时内失败上限
const LOCK_MINUTES = 15
const IP_LOCK_MINUTES = 60

// ---------- 密码哈希（scrypt，Node 内置无需依赖）----------
const SALT_LEN = 16
const KEY_LEN = 32

export const hashPassword = (password) => {
  const salt = crypto.randomBytes(SALT_LEN).toString('hex')
  const hash = crypto.scryptSync(password, salt, KEY_LEN).toString('hex')
  return salt + ':' + hash
}

export const verifyPassword = (password, stored) => {
  if (!stored || !stored.includes(':')) return false
  const [salt, hash] = stored.split(':')
  const test = crypto.scryptSync(password, salt, KEY_LEN).toString('hex')
  return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(test))
}

// ---------- 获取客户端 IP ----------
const getClientIp = (req) => {
  const xf = req.headers['x-forwarded-for']
  if (xf) return xf.split(',')[0].trim()
  return req.ip || req.socket?.remoteAddress || 'unknown'
}

// ---------- 防撞库：检查是否被锁定 ----------
const checkLock = (identifier, ip) => {
  if (identifier) {
    const fails = query(
      "SELECT COUNT(*) AS c FROM login_attempts WHERE identifier = ? AND success = 0 AND created_at > datetime('now', ?)",
      [identifier, `-${LOCK_MINUTES} minutes`]
    )[0]?.c || 0
    if (fails >= MAX_FAIL_BY_USER) {
      return { locked: true, msg: `账号或密码错误次数过多，已锁定 ${LOCK_MINUTES} 分钟，请稍后再试` }
    }
  }
  const ipFails = query(
    "SELECT COUNT(*) AS c FROM login_attempts WHERE ip = ? AND success = 0 AND created_at > datetime('now', ?)",
    [ip, `-${IP_LOCK_MINUTES} minutes`]
  )[0]?.c || 0
  if (ipFails >= MAX_FAIL_BY_IP) {
    return { locked: true, msg: `该网络环境异常，已限制 ${IP_LOCK_MINUTES} 分钟` }
  }
  return { locked: false }
}

const recordAttempt = (identifier, ip, success) => {
  exec('INSERT INTO login_attempts (identifier, ip, success) VALUES (?, ?, ?)', [identifier || '', ip, success ? 1 : 0])
}

// ---------- 验证图形验证码并标记已用 ----------
const consumeCaptcha = (token, code) => {
  if (!token || !code) return { ok: false, msg: '请输入图形验证码' }
  const row = query('SELECT * FROM captcha_sessions WHERE token = ?', [token])[0]
  if (!row) return { ok: false, msg: '验证码不存在，请刷新' }
  if (new Date(row.expires_at) < new Date()) return { ok: false, msg: '验证码已过期，请刷新' }
  if (row.verified) return { ok: false, msg: '验证码已使用，请刷新' }
  if (row.code.toUpperCase() !== String(code).trim().toUpperCase()) return { ok: false, msg: '图形验证码不正确' }
  exec('UPDATE captcha_sessions SET verified = 1 WHERE token = ?', [token])
  return { ok: true }
}

// ---------- 图片验证码：生成（SVG，无需依赖）----------
export const generateCaptcha = (req, res) => {
  try {
    const token = uuidv4().replace(/-/g, '')
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉易混淆字符 I O 0 1
    let code = ''
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)]

    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    const ip = getClientIp(req)
    exec('INSERT INTO captcha_sessions (token, code, verified, ip, expires_at) VALUES (?, ?, 0, ?, ?)', [token, code, ip, expires])

    // 生成 SVG 图片
    const W = 120, H = 42
    const colors = ['#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399', '#9254de']
    let svg = `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg">`
    svg += `<rect width="${W}" height="${H}" fill="#f0f2f5" rx="6"/>`
    // 干扰线
    for (let i = 0; i < 5; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)]
      svg += `<line x1="${Math.random() * W}" y1="${Math.random() * H}" x2="${Math.random() * W}" y2="${Math.random() * H}" stroke="${c}" stroke-width="1" opacity="0.35"/>`
    }
    // 文字
    for (let i = 0; i < 4; i++) {
      const x = 14 + i * 26
      const y = 28 + (Math.random() - 0.5) * 8
      const rot = (Math.random() - 0.5) * 35
      const c = colors[Math.floor(Math.random() * colors.length)]
      svg += `<text x="${x}" y="${y}" font-size="26" fill="${c}" font-family="Arial,sans-serif" font-weight="bold" transform="rotate(${rot} ${x} ${y})">${code[i]}</text>`
    }
    // 噪点
    for (let i = 0; i < 15; i++) {
      const c = colors[Math.floor(Math.random() * colors.length)]
      svg += `<circle cx="${Math.random() * W}" cy="${Math.random() * H}" r="0.6" fill="${c}" opacity="0.4"/>`
    }
    svg += `</svg>`

    const dataUrl = 'data:image/svg+xml;base64,' + Buffer.from(svg).toString('base64')
    res.json({ code: 0, data: { token, image: dataUrl }, message: 'success' })
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message })
  }
}

// ---------- 发送短信验证码 ----------
export const sendSms = (req, res) => {
  try {
    const { phone, purpose = 'register', captchaToken, captchaCode } = req.body || {}
    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ code: 1, message: '手机号格式不正确' })

    // 验证图形验证码
    const cap = consumeCaptcha(captchaToken, captchaCode)
    if (!cap.ok) return res.status(400).json({ code: 1, message: cap.msg })

    // 频率限制
    const recent = query(
      "SELECT * FROM sms_codes WHERE phone = ? AND purpose = ? AND created_at > datetime('now', '-60 seconds') ORDER BY id DESC LIMIT 1",
      [phone, purpose]
    )[0]
    if (recent) return res.status(429).json({ code: 1, message: '验证码已发送，请 60 秒后重试' })

    const code = String(Math.floor(100000 + Math.random() * 900000))
    const expires = new Date(Date.now() + 5 * 60 * 1000).toISOString()
    exec('INSERT INTO sms_codes (phone, code, purpose, used, expires_at) VALUES (?, ?, ?, 0, ?)', [phone, code, purpose, expires])

    console.log(`[SMS] ${phone} (${purpose}) 验证码: ${code}`)
    const isDev = !process.env.SMS_PROVIDER
    res.json({ code: 0, data: isDev ? { devCode: code } : {}, message: '验证码已发送' })
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message })
  }
}

// ---------- 注册 ----------
export const register = (req, res) => {
  try {
    const { username, password, phone, code } = req.body || {}
    if (!username || !password || !phone || !code) return res.status(400).json({ code: 1, message: '参数不完整' })
    if (username.length < 3 || username.length > 20) return res.status(400).json({ code: 1, message: '用户名 3-20 位' })
    if (password.length < 6) return res.status(400).json({ code: 1, message: '密码至少 6 位' })
    if (!/^1[3-9]\d{9}$/.test(phone)) return res.status(400).json({ code: 1, message: '手机号格式不正确' })

    const sms = query(
      "SELECT * FROM sms_codes WHERE phone = ? AND code = ? AND purpose = 'register' AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1",
      [phone, code, new Date().toISOString()]
    )[0]
    if (!sms) return res.status(400).json({ code: 1, message: '验证码不正确或已过期' })

    const existUser = query('SELECT id FROM users WHERE username = ?', [username])[0]
    if (existUser) return res.status(409).json({ code: 1, message: '用户名已被注册' })
    const existPhone = query('SELECT id FROM users WHERE phone = ?', [phone])[0]
    if (existPhone) return res.status(409).json({ code: 1, message: '该手机号已注册' })

    const hash = hashPassword(password)
    exec(
      "INSERT INTO users (username, password_hash, phone, nickname, avatar, status) VALUES (?, ?, ?, ?, ?, 'active')",
      [username, hash, phone, username, 'https://api.dicebear.com/9.x/initials/svg?seed=' + encodeURIComponent(username)]
    )
    exec('UPDATE sms_codes SET used = 1 WHERE id = ?', [sms.id])

    const user = query('SELECT id, username, phone, nickname, avatar FROM users WHERE username = ?', [username])[0]
    const jwt = signToken(user)
    res.json({ code: 0, data: { token: jwt, user }, message: '注册成功' })
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message })
  }
}

// ---------- 登录 ----------
export const login = (req, res) => {
  try {
    const { username, password, captchaToken, captchaCode } = req.body || {}
    if (!username || !password) return res.status(400).json({ code: 1, message: '请输入账号和密码' })

    // 验证图形验证码
    const cap = consumeCaptcha(captchaToken, captchaCode)
    if (!cap.ok) return res.status(400).json({ code: 1, message: cap.msg })

    const ip = getClientIp(req)
    const lockInfo = checkLock(username, ip)
    if (lockInfo.locked) return res.status(429).json({ code: 1, message: lockInfo.msg })

    const user = query('SELECT * FROM users WHERE username = ? OR phone = ?', [username, username])[0]
    if (!user || !user.password_hash) {
      recordAttempt(username, ip, false)
      return res.status(401).json({ code: 1, message: '账号或密码错误' })
    }
    if (user.status === 'locked') return res.status(403).json({ code: 1, message: '账号已被锁定，请联系管理员' })

    if (!verifyPassword(password, user.password_hash)) {
      recordAttempt(username, ip, false)
      const fails = query(
        "SELECT COUNT(*) AS c FROM login_attempts WHERE identifier = ? AND success = 0 AND created_at > datetime('now', ?)",
        [username, `-${LOCK_MINUTES} minutes`]
      )[0]?.c || 0
      const remain = MAX_FAIL_BY_USER - fails
      const msg = remain > 0 ? `账号或密码错误，还剩 ${remain} 次机会` : `失败次数过多，已锁定 ${LOCK_MINUTES} 分钟`
      return res.status(401).json({ code: 1, message: msg })
    }

    recordAttempt(username, ip, true)
    const jwt = signToken({ id: user.id, nickname: user.nickname, avatar: user.avatar })
    res.json({
      code: 0,
      data: { token: jwt, user: { id: user.id, username: user.username, nickname: user.nickname, avatar: user.avatar } },
      message: '登录成功'
    })
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message })
  }
}

// ---------- 找回密码 ----------
export const forgotPassword = (req, res) => {
  try {
    const { phone, code, newPassword } = req.body || {}
    if (!phone || !code || !newPassword) return res.status(400).json({ code: 1, message: '参数不完整' })
    if (newPassword.length < 6) return res.status(400).json({ code: 1, message: '密码至少 6 位' })

    const sms = query(
      "SELECT * FROM sms_codes WHERE phone = ? AND code = ? AND purpose = 'reset' AND used = 0 AND expires_at > ? ORDER BY id DESC LIMIT 1",
      [phone, code, new Date().toISOString()]
    )[0]
    if (!sms) return res.status(400).json({ code: 1, message: '验证码不正确或已过期' })

    const user = query('SELECT id FROM users WHERE phone = ?', [phone])[0]
    if (!user) return res.status(404).json({ code: 1, message: '该手机号未注册' })

    const hash = hashPassword(newPassword)
    exec('UPDATE users SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [hash, user.id])
    exec('UPDATE sms_codes SET used = 1 WHERE id = ?', [sms.id])

    res.json({ code: 0, message: '密码重置成功，请用新密码登录' })
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message })
  }
}

// ---------- 检查用户名是否可用 ----------
export const checkUsername = (req, res) => {
  try {
    const { username } = req.query
    if (!username) return res.json({ code: 0, data: { available: false } })
    const exist = query('SELECT id FROM users WHERE username = ?', [username])[0]
    res.json({ code: 0, data: { available: !exist } })
  } catch (e) {
    res.status(500).json({ code: 1, message: e.message })
  }
}
