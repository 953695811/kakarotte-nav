import * as dataModel from '../models/dataModel.js'

export const getCategories = (req, res) => {
  try {
    const userId = req.user?.id || null
    const data = dataModel.getCategories(userId)
    res.json({ code: 0, data, message: 'success' })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

export const getNavigation = (req, res) => {
  try {
    const { category } = req.params
    const userId = req.user?.id || null
    const data = dataModel.getNavigationByCategory(category, userId)
    res.json({ code: 0, data, message: 'success' })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

export const getAllNavigation = (req, res) => {
  try {
    const data = dataModel.getAllNavigation()
    res.json({ code: 0, data, message: 'success' })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

export const searchNavigation = (req, res) => {
  try {
    const { keyword, category } = req.query
    const userId = req.user?.id || null
    if (!keyword) return res.json({ code: 0, data: [], message: 'success' })
    const data = dataModel.searchNavigation(keyword, category || null, userId)
    res.json({ code: 0, data, message: 'success' })
  } catch (error) {
    res.status(500).json({ code: 1, data: null, message: error.message })
  }
}

export const saveCategoryOrder = (req, res) => {
  try {
    const userId = req.user.id
    const { order } = req.body
    if (!Array.isArray(order)) throw new Error('order 必须是分类 key 的数组')
    dataModel.saveCategoryOrder(userId, order)
    res.json({ code: 0, data: true, message: '分类排序已保存' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const saveNavOrder = (req, res) => {
  try {
    const userId = req.user.id
    const { category, order } = req.body
    if (!category || !Array.isArray(order)) throw new Error('缺少参数 category 或 order')
    dataModel.saveNavOrder(userId, category, order)
    res.json({ code: 0, data: true, message: '排序已保存' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const createCategory = (req, res) => {
  try {
    const userId = req.user.id
    const row = dataModel.createUserCategory(userId, req.body || {})
    res.json({ code: 0, data: row, message: '分类已创建' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const updateCategory = (req, res) => {
  try {
    const userId = req.user.id
    const { key } = req.params
    const row = dataModel.updateUserCategory(userId, key, req.body || {})
    res.json({ code: 0, data: row, message: '分类已更新' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const deleteCategory = (req, res) => {
  try {
    const userId = req.user.id
    const { key } = req.params
    if (!key.startsWith('u_')) throw new Error('只允许删除自定义分类')
    dataModel.deleteUserCategory(userId, key)
    res.json({ code: 0, data: true, message: '分类已删除' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const createNav = (req, res) => {
  try {
    const userId = req.user.id
    const row = dataModel.createUserNav(userId, req.body || {})
    res.json({ code: 0, data: row, message: '导航已新增' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const updateNav = (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    const row = dataModel.updateUserNav(userId, id, req.body || {})
    res.json({ code: 0, data: row, message: '导航已更新' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}

export const deleteNav = (req, res) => {
  try {
    const userId = req.user.id
    const { id } = req.params
    dataModel.deleteUserNav(userId, id)
    res.json({ code: 0, data: true, message: '导航已删除' })
  } catch (error) {
    res.status(400).json({ code: 1, data: null, message: error.message })
  }
}
