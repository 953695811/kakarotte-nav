import { Router } from 'express'
import * as dataController from '../controllers/dataController.js'
import { authOptional, authRequired } from '../auth.js'

const router = Router()

// 公开接口（可选：带 token 时合并用户自定义数据）
router.get('/categories', authOptional, dataController.getCategories)
router.get('/navigation', dataController.getAllNavigation)
router.get('/navigation/search', authOptional, dataController.searchNavigation)
router.get('/navigation/:category', authOptional, dataController.getNavigation)

// 登录后：排序保存
router.post('/categories/order', authRequired, dataController.saveCategoryOrder)
router.post('/navigation/order', authRequired, dataController.saveNavOrder)

// 登录后：自定义分类 CRUD
router.post('/categories', authRequired, dataController.createCategory)
router.put('/categories/:key', authRequired, dataController.updateCategory)
router.delete('/categories/:key', authRequired, dataController.deleteCategory)

// 登录后：自定义导航 CRUD
router.post('/navigation', authRequired, dataController.createNav)
router.put('/navigation/:id', authRequired, dataController.updateNav)
router.delete('/navigation/:id', authRequired, dataController.deleteNav)

export default router
