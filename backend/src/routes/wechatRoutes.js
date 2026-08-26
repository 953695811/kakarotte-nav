import { Router } from 'express'
import * as wechatController from '../controllers/wechatController.js'
import { authRequired } from '../auth.js'

const router = Router()

router.get('/qrcode', wechatController.createSession)
router.get('/poll', wechatController.pollSession)
router.post('/mock-approve', wechatController.mockApprove)
router.get('/scan', wechatController.scanPage)
router.get('/callback', wechatController.wechatCallback)
router.get('/me', authRequired, wechatController.me)

export default router
