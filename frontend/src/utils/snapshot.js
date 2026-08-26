// 快照管理 — 存档/恢复/删除/重置

const LS_KEYS = [
  'kakarotte_local_categories',
  'kakarotte_local_nav_items',
  'kakarotte_local_nav_order',
  'kakarotte_hidden_cats',
  'kakarotte_renamed_cats'
]
const LS_SNAPSHOTS = 'kakarotte_snapshots'
const MAX_SNAPSHOTS = 100

// 保存快照
export function saveSnapshot(label = '') {
  const data = {}
  LS_KEYS.forEach(key => { data[key] = localStorage.getItem(key) })
  const snapshots = getSnapshots()
  const id = 'snap_' + Date.now()
  snapshots.push({
    id,
    timestamp: new Date().toISOString(),
    label: label || '自动保存',
    data
  })
  if (snapshots.length > MAX_SNAPSHOTS) snapshots.splice(0, snapshots.length - MAX_SNAPSHOTS)
  localStorage.setItem(LS_SNAPSHOTS, JSON.stringify(snapshots))
  return id
}

// 获取所有快照
export function getSnapshots() {
  try { return JSON.parse(localStorage.getItem(LS_SNAPSHOTS) || '[]') } catch { return [] }
}

// 恢复快照
export function restoreSnapshot(id) {
  const snapshots = getSnapshots()
  const snap = snapshots.find(s => s.id === id)
  if (!snap) return false
  LS_KEYS.forEach(key => {
    if (snap.data[key] != null) localStorage.setItem(key, snap.data[key])
    else localStorage.removeItem(key)
  })
  return true
}

// 删除快照
export function deleteSnapshot(id) {
  const snapshots = getSnapshots().filter(s => s.id !== id)
  localStorage.setItem(LS_SNAPSHOTS, JSON.stringify(snapshots))
}

// 重置到初始状态（清除所有本地覆盖）
export function resetAll() {
  LS_KEYS.forEach(key => localStorage.removeItem(key))
}
