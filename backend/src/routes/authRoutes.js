import { Router } from 'express'
import * as authController from '../controllers/authController.js'
import { authRequired } from '../auth.js'

const router = Router()

// 图片验证码
router.get('/captcha', authController.generateCaptcha)

// 短信验证码
router.post('/sms/send', authController.sendSms)

// 注册 / 登录 / 找回密码
router.post('/register', authController.register)
router.post('/login', authController.login)
router.post('/forgot-password', authController.forgotPassword)
router.get('/check-username', authController.checkUsername)

// 已登录用户验证 token
router.get('/check', authRequired, (req, res) => {
  res.json({ code: 0, data: { user: req.user }, message: '已登录' })
})

export default router
