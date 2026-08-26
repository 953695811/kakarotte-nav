import { getDB, saveDB } from '../database.js'
import { runExec, runQuery } from '../auth.js'

const queryAll = (sql, params = []) => runQuery(sql, params)
const exec = (sql, params = []) => runExec(sql, params)

// ---------- 分类（合并官方 + 用户自定义分类；如果已登录，带用户自定义排序）
export const getCategories = (userId) => {
  let official = queryAll('SELECT * FROM categories ORDER BY sort_order ASC')
  let userCats = []
  if (userId) {
    userCats = queryAll('SELECT * FROM user_categories WHERE user_id = ? ORDER BY sort_order ASC', [userId])
    userCats = userCats.map((c) => ({ ...c, is_default: 0 }))
  }
  const all = [...official, ...userCats]
  if (userId) {
    const order = Object.fromEntries(
      queryAll('SELECT cat_key, sort_order FROM user_cat_order WHERE user_id = ?', [userId]).map(
        (r) => [r.cat_key, r.sort_order]
      )
    )
    all.sort((a, b) => {
      const oa = order[a.key] ?? a.sort_order ?? 999
      const ob = order[b.key] ?? b.sort_order ?? 999
      return oa - ob
    })
  }
  return all
}

// ---------- 某分类下的导航（官方 + 用户自定义；登录后：用户自定义排序优先）
export const getNavigationByCategory = (category, userId) => {
  let official = queryAll(
    'SELECT id, name, url, description, icon, category, is_default, sort_order FROM navigation WHERE category = ?',
    [category]
  ).map((n) => ({ ...n, source: 'official', nav_id: 'o_' + n.id }))
  let userNav = []
  if (userId) {
  }
  if (userId && category.startsWith('u_')) {
    userNav = queryAll(
      'SELECT id, name, url, description, icon, category, sort_order FROM user_navigation WHERE category = ? AND user_id = ?',
      [category, userId]
    ).map((n) => ({ ...n, is_default: 0, source: 'user', nav_id: 'u_' + n.id }))
  } else if (userId) {
    // 官方分类下的自定义导航，用户自己在那个分类下也可以自己加自定义
    userNav = queryAll(
      'SELECT id, name, url, description, icon, category, sort_order FROM user_navigation WHERE category = ? AND user_id = ?',
      [category, userId]
    ).map((n) => ({ ...n, is_default: 0, source: 'user', nav_id: 'u_' + n.id }))
  }
  let all = [...official, ...userNav]
  if (userId) {
    const officialIds = official.map((o) => o.id)
    const orders = Object.fromEntries(
      queryAll(
        'SELECT nav_id, sort_order FROM user_nav_order WHERE user_id = ? AND nav_id IN (' +
        officialIds.map(() => '?').join(',') + ')',
        [userId, ...officialIds]
      ).map((r) => ['o_' + r.nav_id, r.sort_order])
    )
    all.sort((a, b) => {
      const oa =
        a.source === 'official' ? orders[a.nav_id] ?? a.sort_order ?? 999 : a.sort_order ?? 999
      const ob =
        b.source === 'official' ? orders[b.nav_id] ?? b.sort_order ?? 999 : b.sort_order ?? 999
      return oa - ob
    })
  } else {
    all.sort((a, b) => (a.sort_order ?? 999) - (b.sort_order ?? 999))
  }
  return all
}

export const getAllNavigation = () => queryAll('SELECT * FROM navigation ORDER BY category, sort_order ASC')

export const searchNavigation = (keyword, category = null, userId = null) => {
  const kw = `%${keyword}%`
  let official
  if (category) {
    official = queryAll(
      `SELECT id, name, url, description, icon, category FROM navigation WHERE category = ? AND (name LIKE ? OR description LIKE ? OR url LIKE ?) ORDER BY sort_order ASC`,
      [category, kw, kw, kw]
    )
  } else {
    official = queryAll(
      `SELECT id, name, url, description, icon, category FROM navigation WHERE name LIKE ? OR description LIKE ? OR url LIKE ? ORDER BY category, sort_order ASC`,
      [kw, kw, kw]
    )
  }
  official = official.map((n) => ({ ...n, is_default: 1 }))
  let user = []
  if (userId) {
    if (category) {
      user = queryAll(
        `SELECT id, name, url, description, icon, category FROM user_navigation WHERE user_id = ? AND category = ? AND (name LIKE ? OR description LIKE ? OR url LIKE ?) ORDER BY sort_order ASC`,
        [userId, category, kw, kw, kw]
      )
    } else {
      user = queryAll(
        `SELECT id, name, url, description, icon, category FROM user_navigation WHERE user_id = ? AND (name LIKE ? OR description LIKE ? OR url LIKE ?) ORDER BY category, sort_order ASC`,
        [userId, kw, kw, kw]
      )
    }
    user = user.map((n) => ({ ...n, is_default: 0 }))
  }
  return [...official, ...user]
}

// ---------- 分类排序（一次保存整个分类数组的顺序，按数组索引）
export const saveCategoryOrder = (userId, orderList) => {
  orderList.forEach((catKey, index) => {
    const exists = queryAll('SELECT 1 FROM user_cat_order WHERE user_id = ? AND cat_key = ?', [userId, catKey])
    if (exists.length) {
      exec('UPDATE user_cat_order SET sort_order = ? WHERE user_id = ? AND cat_key = ?', [index, userId, catKey])
    } else {
      exec('INSERT INTO user_cat_order (user_id, cat_key, sort_order) VALUES (?, ?, ?)', [userId, catKey, index])
    }
  })
  return true
}

// ---------- 导航排序（保存某分类下所有导航的新顺序）
export const saveNavOrder = (userId, category, orderedItems) => {
  orderedItems.forEach((item, idx) => {
    if (item.source === 'official') {
      const id = Number(item.nav_id.replace('o_', ''))
      const exists = queryAll('SELECT 1 FROM user_nav_order WHERE user_id = ? AND nav_id = ?', [userId, id])
      if (exists.length) {
        exec('UPDATE user_nav_order SET sort_order = ? WHERE user_id = ? AND nav_id = ?', [idx, userId, id])
      } else {
        exec('INSERT INTO user_nav_order (user_id, nav_id, sort_order) VALUES (?, ?, ?)', [userId, id, idx])
      }
    } else if (item.source === 'user') {
      const id = Number(item.nav_id.replace('u_', ''))
      exec('UPDATE user_navigation SET sort_order = ? WHERE user_id = ? AND id = ?', [idx, userId, id])
    }
  })
  return true
}

// ---------- 新增用户自定义分类
export const createUserCategory = (userId, { name, icon = null }) => {
  const key = 'u_' + userId + '_' + Date.now()
  const list = queryAll('SELECT COALESCE(MAX(sort_order), -1) + 1 AS s FROM user_categories WHERE user_id = ?', [userId])
  const sortOrder = list[0]?.s ?? 0
  exec('INSERT INTO user_categories (user_id, key, name, icon, sort_order) VALUES (?, ?, ?, ?, ?)', [userId, key, name, icon, sortOrder])
  const created = queryAll('SELECT * FROM user_categories WHERE user_id = ? AND key = ?', [userId, key])[0]
  return { ...created, is_default: 0 }
}

export const updateUserCategory = (userId, catKey, data) => {
  const row = queryAll('SELECT * FROM user_categories WHERE user_id = ? AND key = ?', [userId, catKey])[0]
  if (!row) throw new Error('分类不存在')
  const name = data.name ?? row.name
  const icon = data.icon ?? row.icon
  exec('UPDATE user_categories SET name = ?, icon = ? WHERE user_id = ? AND key = ?', [name, icon, userId, catKey])
  return queryAll('SELECT * FROM user_categories WHERE user_id = ? AND key = ?', [userId, catKey])[0]
}

export const deleteUserCategory = (userId, catKey) => {
  exec('DELETE FROM user_categories WHERE user_id = ? AND key = ?', [userId, catKey])
  exec('DELETE FROM user_navigation WHERE user_id = ? AND category = ?', [userId, catKey])
  exec('DELETE FROM user_cat_order WHERE user_id = ? AND cat_key = ?', [userId, catKey])
  return true
}

// ---------- 用户自定义导航
export const createUserNav = (userId, { name, url, description = '', icon = '', category = 'frontend', sort_order = 999 }) => {
  if (!name || !url) throw new Error('名称和网址必填')
  exec(
    'INSERT INTO user_navigation (user_id, name, url, description, icon, category, sort_order) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [userId, name, url, description, icon, category, sort_order]
  )
  const row = queryAll('SELECT last_insert_rowid() AS id')[0]
  const lastId = row.id
  return { ...queryAll('SELECT * FROM user_navigation WHERE id = ?', [lastId])[0], source: 'user', nav_id: 'u_' + lastId, is_default: 0 }
}

export const updateUserNav = (userId, navId, data) => {
  const id = Number(String(navId).startsWith('u_') ? navId.slice(2) : navId)
  const row = queryAll('SELECT * FROM user_navigation WHERE id = ? AND user_id = ?', [id, userId])[0]
  if (!row) throw new Error('自定义导航不存在')
  const name = data.name ?? row.name
  const url = data.url ?? row.url
  const description = data.description ?? row.description
  const icon = data.icon ?? row.icon
  const category = data.category ?? row.category
  exec(
    'UPDATE user_navigation SET name = ?, url = ?, description = ?, icon = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?',
    [name, url, description, icon, category, id, userId]
  )
  return queryAll('SELECT * FROM user_navigation WHERE id = ?', [id])[0]
}

export const deleteUserNav = (userId, navId) => {
  const id = Number(String(navId).startsWith('u_') ? navId.slice(2) : navId)
  exec('DELETE FROM user_navigation WHERE id = ? AND user_id = ?', [id, userId])
  return true
}
