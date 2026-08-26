import { v4 as uuidv4 } from 'uuid'
import QRCode from 'qrcode'
import { runExec, runQuery, signToken } from '../auth.js'

const exec = runExec
const query = runQuery

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min

// 创建一个扫码会话，返回 token + qrcode dataURL
export const createSession = async (req, res) => {
  try {
    const token = uuidv4().replace(/-/g, '')
    // 二维码内容：
    // 真实微信流程应该是 https://open.weixin.qq.com/connect/qrconnect?appid=xxx...
    // 这里我们生成一个后端模拟扫码页地址（/wechat/scan 这个页面可以用手机浏览器访问）
    // 当你有真实 WECHAT_APPID 时，替换成真实 URL
    const appid = process.env.WECHAT_APPID
    const redirectUri = process.env.WECHAT_REDIRECT_URI || ''
    let content
    if (appid && redirectUri) {
      content =
        'https://open.weixin.qq.com/connect/qrconnect?appid=' +
        encodeURIComponent(appid) +
        '&redirect_uri=' +
        encodeURIComponent(redirectUri) +
        '&response_type=code&scope=snsapi_login&state=' +
        token +
        '#wechat_redirect'
    } else {
      // 本地模拟：把 token 塞进扫码页地址，手机打开/手动点「模拟扫码成功」
      const origin = req.protocol + '://' + req.get('host')
      content = origin + '/api/wechat/scan?token=' + token
    }
    const dataUrl = await QRCode.toDataURL(content, {
      errorCorrectionLevel: 'M',
      margin: 1,
      width: 260
    })
    // 会话有效期 10 分钟，expires_at 存 ISO 8601 字符串（含时区），确保能被 JS 正确解析
    const expireAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
    exec('INSERT INTO wechat_login_sessions (token, status, expires_at) VALUES (?, ?, ?)', [
      token,
      'pending',
      expireAt
    ])
    res.json({
      code: 0,
      data: {
        token,
        qrcode: dataUrl,
        tip: appid ? '请用微信扫一扫登录' : '请在手机浏览器访问二维码里的地址，或点击「模拟扫码成功」按钮'
      },
      message: 'success'
    })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

// 轮询扫码状态：前端每隔 2 秒拉一次
export const pollSession = (req, res) => {
  try {
    const token = req.query.token
    if (!token) return res.status(400).json({ code: 1, data: null, message: '缺少 token' })
    const row = query('SELECT * FROM wechat_login_sessions WHERE token = ?', [token])[0]
    if (!row) return res.json({ code: 0, data: { status: 'expired' }, message: '会话不存在' })
    const now = new Date()
    if (new Date(row.expires_at) < now) {
      return res.json({ code: 0, data: { status: 'expired' }, message: '二维码已过期' })
    }
    if (row.status === 'approved' && row.user_id) {
      const user = query('SELECT * FROM users WHERE id = ?', [row.user_id])[0]
      if (user) {
        const jwt = signToken(user)
        return res.json({
          code: 0,
          data: { status: 'approved', token: jwt, user: { id: user.id, nickname: user.nickname, avatar: user.avatar } },
          message: '登录成功'
        })
      }
    }
    return res.json({ code: 0, data: { status: row.status }, message: '等待扫码' })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

// 模拟扫码成功：后端在 localhost 场景下使用。在真实微信回调里替换为 code->access_token 流程。
export const mockApprove = (req, res) => {
  try {
    const { token } = req.body || {}
    if (!token) return res.status(400).json({ code: 1, data: null, message: '缺少 token' })
    const row = query('SELECT * FROM wechat_login_sessions WHERE token = ?', [token])[0]
    if (!row) return res.status(400).json({ code: 1, data: null, message: '会话不存在' })

    // 先找一个测试用户；没有就创建一个
    let user = query('SELECT * FROM users WHERE wechat_openid = ?', ['mock_openid_demo'])[0]
    if (!user) {
      const nicknames = ['微信用户_小橙', '微信用户_小鹿', '微信用户_小葵', '微信用户_小茶', '微信用户_小柠']
      const name = nicknames[randomInt(0, nicknames.length - 1)]
      exec(
        'INSERT INTO users (wechat_openid, nickname, avatar) VALUES (?, ?, ?)',
        ['mock_openid_demo', name, 'https://api.dicebear.com/9.x/thumbs/svg?seed=' + encodeURIComponent(name)]
      )
      const lastId = query('SELECT last_insert_rowid() AS id')[0].id
      user = query('SELECT * FROM users WHERE id = ?', [lastId])[0]
    }

    exec('UPDATE wechat_login_sessions SET status = ?, user_id = ? WHERE token = ?', [
      'approved',
      user.id,
      token
    ])
    res.json({ code: 0, data: true, message: '模拟扫码成功' })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

// 模拟扫码页面（GET）：用户用手机打开这个链接 → 呈现「确认登录」按钮
export const scanPage = (req, res) => {
  const token = req.query.token || ''
  res.type('text/html; charset=utf-8')
  res.send(`
<!DOCTYPE html>
<html><head><meta name="viewport" content="width=device-width,initial-scale=1"/><title>扫码确认登录</title>
<style>
body{font-family:-apple-system,sans-serif;margin:0;padding:40px 24px;background:#f5f7fa;color:#303133}
.card{max-width:420px;margin:40px auto;background:#fff;border-radius:16px;padding:32px 24px;box-shadow:0 10px 40px rgba(0,0,0,.06)}
h1{font-size:20px;margin:0 0 16px}p{color:#606266;margin:8px 0 24px;line-height:1.6}
.btn{display:block;width:100%;padding:14px;border:none;border-radius:10px;background:#409eff;color:#fff;font-size:16px;font-weight:600;cursor:pointer}
.btn:active{background:#337ecc}.tip{font-size:12px;color:#909399;margin-top:16px;text-align:center}
</style></head><body>
<div class="card">
<h1>📷 确认登录「网址导航」</h1>
<p>token: <code style="font-size:12px;background:#f0f2f5;padding:2px 6px;border-radius:4px">${token || '无'}</code></p>
<button class="btn" onclick="approve()">✅ 确认登录</button>
<p class="tip">这是本地模拟的微信扫码确认页。<br/>真实环境由微信服务器回调 /api/wechat/callback 完成</p>
</div>
<script>
async function approve(){
  const r = await fetch('/api/wechat/mock-approve',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token:'${token}'})})
  const j = await r.json()
  if (j.code === 0) document.querySelector('.btn').outerHTML = '<div style="text-align:center;color:#67c23a;font-weight:600">登录成功，请返回电脑端页面 ✓</div>'
  else alert(j.message)
}
</script>
</body></html>
  `)
}

// 真实微信回调（有 appid 时走这里，需要用 code 去微信换 openid）
export const wechatCallback = async (req, res) => {
  const { code, state } = req.query
  const appid = process.env.WECHAT_APPID
  const secret = process.env.WECHAT_APPSECRET
  const token = state
  if (!appid || !secret) {
    return res
      .status(400)
      .send('未配置 WECHAT_APPID/WECHAT_APPSECRET，请使用模拟扫码或正确配置 .env')
  }
  if (!code) return res.status(400).send('缺少 code')
  try {
    // 用 code 换 access_token + openid
    const url =
      'https://api.weixin.qq.com/sns/oauth2/access_token?appid=' +
      encodeURIComponent(appid) +
      '&secret=' +
      encodeURIComponent(secret) +
      '&code=' +
      encodeURIComponent(code) +
      '&grant_type=authorization_code'
    const r = await fetch(url)
    const json = await r.json()
    const openid = json.openid
    const accessToken = json.access_token
    if (!openid) throw new Error('微信返回 openid 失败：' + JSON.stringify(json))

    // 获取用户信息
    const userUrl =
      'https://api.weixin.qq.com/sns/userinfo?access_token=' + accessToken + '&openid=' + openid + '&lang=zh_CN'
    const ur = await fetch(userUrl)
    const userInfo = await ur.json()
    const nickname = userInfo.nickname || '微信用户'
    const avatar = userInfo.headimgurl || ''

    // 保存用户
    let user = query('SELECT * FROM users WHERE wechat_openid = ?', [openid])[0]
    if (!user) {
      exec('INSERT INTO users (wechat_openid, nickname, avatar) VALUES (?, ?, ?)', [openid, nickname, avatar])
      const lastId = query('SELECT last_insert_rowid() AS id')[0].id
      user = query('SELECT * FROM users WHERE id = ?', [lastId])[0]
    } else {
      exec('UPDATE users SET nickname = ?, avatar = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [
        nickname,
        avatar,
        user.id
      ])
      user = query('SELECT * FROM users WHERE id = ?', [user.id])[0]
    }

    if (token) {
      exec('UPDATE wechat_login_sessions SET status = ?, openid = ?, user_id = ? WHERE token = ?', [
        'approved',
        openid,
        user.id,
        token
      ])
    }

    // 前端跳回首页，把 token 写进前端本地（通过 query 传，安全方式也可以走 cookie）
    const jwt = signToken(user)
    res.redirect('/login?token=' + encodeURIComponent(jwt))
  } catch (err) {
    res.status(500).send('微信登录失败：' + err.message)
  }
}

// 当前登录用户信息
export const me = (req, res) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ code: 401, data: null, message: '未登录' })
  const row = query('SELECT id, nickname, avatar, created_at FROM users WHERE id = ?', [userId])[0]
  if (!row) return res.status(401).json({ code: 401, data: null, message: '用户不存在' })
  res.json({ code: 0, data: row, message: 'success' })
}
