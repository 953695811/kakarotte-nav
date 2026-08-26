<template>
  <div class="nav-view">
    <!-- 外网搜索引擎条 -->
    <div class="search-engine">
      <div class="engine-picker" ref="pickerRef">
        <button class="engine-picker__btn" type="button" @click="pickerOpen = !pickerOpen">
          <span>{{ currentEngineName }}</span>
          <el-icon class="engine-picker__arrow" :class="{ open: pickerOpen }"><ArrowDown /></el-icon>
        </button>
        <transition name="engine-fade">
          <div v-if="pickerOpen" class="engine-picker__menu">
            <div v-for="e in engines" :key="e.key" :class="['engine-picker__item', { active: engine === e.key }]" @click="pickEngine(e.key)">
              <span>{{ e.name }}</span>
              <el-icon v-if="engine === e.key"><Check /></el-icon>
            </div>
          </div>
        </transition>
      </div>
      <input class="search-engine__input" v-model="searchKw" :placeholder="'使用 ' + currentEngineName + ' 搜索，回车直达'" @keyup.enter="doSearch" />
      <button class="search-engine__btn" @click="doSearch">搜索</button>
    </div>

    <div v-if="loading" class="nav-view__loading">
      <el-skeleton :rows="5" animated />
    </div>

    <div v-else-if="keyword && filteredList.length === 0" class="nav-view__empty">
      <el-empty :description="emptyDesc" />
    </div>

    <div v-else-if="!keyword && displayList.length === 0" class="nav-view__empty">
      <el-empty description="该分类下暂无导航，点右上角「+ 新增网址」创建一个吧">
        <el-button type="primary" @click="openAdd">+ 新增网址</el-button>
      </el-empty>
    </div>

    <div v-else>
      <div class="nav-view__toolbar">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">
          <el-tag v-if="keyword" type="info" size="small" effect="plain" round>
            找到 {{ filteredList.length }} 条与「{{ keyword }}」相关
          </el-tag>
          <el-tag v-if="isEditing" type="warning" size="small" effect="dark" round>
            ✏️ 编辑模式开启
          </el-tag>
        </div>
        <div class="nav-view__toolbar-right">
          <div class="nav-view__size-ctrl">
            <el-tooltip content="放大卡片" placement="bottom">
              <el-button size="small" :icon="Plus" circle :disabled="cardSize >= 520" @click="changeSize(40)" />
            </el-tooltip>
            <el-tooltip content="缩小卡片" placement="bottom">
              <el-button size="small" :icon="Minus" circle :disabled="cardSize <= 180" @click="changeSize(-40)" />
            </el-tooltip>
          </div>
          <el-tooltip content="拖拽卡片可改变位置">
            <el-button :type="isEditing ? 'success' : 'primary'" plain size="small" :icon="isEditing ? Check : EditPen" @click="isEditing = !isEditing">
              {{ isEditing ? '完成排序' : '调整排序' }}
            </el-button>
          </el-tooltip>
          <el-button type="primary" size="small" :icon="Plus" @click="openAdd">新增网址</el-button>
        </div>
      </div>

      <!-- 拖拽模式 -->
      <draggable v-if="isEditing" v-model="editableList" item-key="nav_id" handle=".drag-handle" ghost-class="drag-ghost" chosen-class="drag-chosen" drag-class="drag-drag" animation="180" class="nav-view__grid" @end="onDragEnd">
        <template #item="{ element }">
          <NavCard :item="element" :editable="true" class="nav-card-wrap" @edit="openEdit(element)" @delete="handleDelete(element)" />
        </template>
      </draggable>

      <!-- 展示模式 -->
      <div v-else class="nav-view__grid">
        <NavCard v-for="item in displayList" :key="item.nav_id" :item="item" :editable="item.source === 'user'" @edit="openEdit(item)" @delete="handleDelete(item)" />
      </div>
    </div>

    <!-- 新增/编辑导航弹窗 -->
    <el-dialog v-model="navDialog.visible" :title="navDialog.edit ? '编辑导航' : '新增导航'" width="520px">
      <el-form :model="navDialog.form" label-width="80px">
        <el-form-item label="名称" required>
          <el-input v-model="navDialog.form.name" placeholder="例如：知乎" maxlength="30" />
        </el-form-item>
        <el-form-item label="网址" required>
          <el-input v-model="navDialog.form.url" placeholder="https://..." maxlength="500" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="navDialog.form.description" type="textarea" :rows="2" placeholder="一句话介绍" maxlength="80" />
        </el-form-item>
        <el-form-item label="图标">
          <el-input v-model="navDialog.form.icon" placeholder="图标地址，可留空自动用网站图标" maxlength="500" />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="navDialog.form.category" style="width:100%">
            <el-option v-for="c in categoryList" :key="c.key" :label="c.name" :value="c.key" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="navDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitNav">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen, Plus, Check, Minus, ArrowDown } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import NavCard from './NavCard.vue'
import { getNavigation, getCategories } from '../api'
import { saveSnapshot } from '../utils/snapshot.js'

const route = useRoute()

const props = defineProps({
  category: { type: String, default: '' }
})

// ---------- localStorage 工具 ----------
const LS_NAV_ITEMS = 'kakarotte_local_nav_items'
const LS_NAV_ORDER = 'kakarotte_local_nav_order'
const LS_CATEGORIES = 'kakarotte_local_categories'

const getLocalNavItems = () => { try { return JSON.parse(localStorage.getItem(LS_NAV_ITEMS) || '[]') } catch { return [] } }
const setLocalNavItems = (items) => localStorage.setItem(LS_NAV_ITEMS, JSON.stringify(items))
const getLocalNavOrder = () => { try { return JSON.parse(localStorage.getItem(LS_NAV_ORDER) || '{}') } catch { return {} } }
const setLocalNavOrder = (order) => localStorage.setItem(LS_NAV_ORDER, JSON.stringify(order))
const getLocalCategories = () => { try { return JSON.parse(localStorage.getItem(LS_CATEGORIES) || '[]') } catch { return [] } }

const navList = ref([])
const categoryList = ref([])
const loading = ref(true)
const isEditing = ref(false)
const editableList = ref([])

// 卡片大小（CSS 变量 --card-min 控制 grid 列宽 + 联动图标/字号/内边距）
const LS_CARD_SIZE = 'kakarotte_card_size'
const cardSize = ref(Number(localStorage.getItem(LS_CARD_SIZE)) || 280)
const changeSize = (delta) => {
  const next = Math.min(520, Math.max(180, cardSize.value + delta))
  if (next === cardSize.value) return
  cardSize.value = next
  localStorage.setItem(LS_CARD_SIZE, String(next))
  document.documentElement.style.setProperty('--card-min', next + 'px')
}

// 外网搜索引擎条（百度/谷歌/必应/知乎/GitHub，可切换）
const LS_ENGINE = 'kakarotte_search_engine'
const engines = [
  { key: 'baidu', name: '百度', url: 'https://www.baidu.com/s?wd=' },
  { key: 'google', name: '谷歌', url: 'https://www.google.com/search?q=' },
  { key: 'bing', name: '必应', url: 'https://www.bing.com/search?q=' },
  { key: 'sogou', name: '搜狗', url: 'https://www.sogou.com/web?query=' },
  { key: '360', name: '360', url: 'https://www.so.com/s?q=' },
  { key: 'zhihu', name: '知乎', url: 'https://www.zhihu.com/search?type=content&q=' },
  { key: 'weibo', name: '微博', url: 'https://s.weibo.com/weibo?q=' },
  { key: 'bilibili', name: 'B站', url: 'https://search.bilibili.com/all?keyword=' },
  { key: 'juejin', name: '掘金', url: 'https://juejin.cn/search?query=' },
  { key: 'github', name: 'GitHub', url: 'https://github.com/search?q=' },
  { key: 'stackoverflow', name: 'StackOverflow', url: 'https://stackoverflow.com/search?q=' },
  { key: 'mdn', name: 'MDN', url: 'https://developer.mozilla.org/zh-CN/search?q=' }
]
const engine = ref(localStorage.getItem(LS_ENGINE) || 'baidu')
const searchKw = ref('')
const currentEngineName = computed(() => engines.find((e) => e.key === engine.value)?.name || '')
const switchEngine = (key) => {
  localStorage.setItem(LS_ENGINE, key)
}
const doSearch = () => {
  const q = searchKw.value.trim()
  if (!q) return
  const e = engines.find((x) => x.key === engine.value)
  if (!e) return
  window.open(e.url + encodeURIComponent(q), '_blank', 'noopener')
}

// 自定义下拉（点击外部关闭）
const pickerRef = ref(null)
const pickerOpen = ref(false)
const onDocClick = (e) => {
  if (pickerRef.value && !pickerRef.value.contains(e.target)) pickerOpen.value = false
}
const pickEngine = (key) => {
  engine.value = key
  switchEngine(key)
  pickerOpen.value = false
}
onMounted(() => document.addEventListener('click', onDocClick))
onBeforeUnmount(() => document.removeEventListener('click', onDocClick))

const navDialog = reactive({
  visible: false, edit: false, editingId: '',
  form: { name: '', url: '', description: '', icon: '', category: '' }
})

const currentCategory = computed(() => {
  if (props.category) return props.category
  if (route.meta?.category) return route.meta.category
  if (route.params?.catKey) return route.params.catKey
  return ''
})

const keyword = computed(() => (route.query.keyword || '').trim())
const emptyDesc = computed(() => '当前分类中未找到 "' + keyword.value + '" 相关结果')

const filteredList = computed(() => {
  const kw = keyword.value.toLowerCase()
  if (!kw) return navList.value
  return navList.value.filter((item) => {
    return (item.name && item.name.toLowerCase().includes(kw)) ||
      (item.description && item.description.toLowerCase().includes(kw)) ||
      (item.url && item.url.toLowerCase().includes(kw))
  })
})

const displayList = computed(() => filteredList.value)

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    categoryList.value = [...(res.data || []), ...getLocalCategories()]
  } catch (e) { console.error(e) }
}

const fetchData = async (category) => {
  if (!category) { loading.value = false; return }
  loading.value = true
  try {
    const res = await getNavigation(category)
    const official = (res.data || []).map((item) => ({ ...item, source: 'official' }))
    const local = getLocalNavItems().filter((i) => i.category === category).map((item) => ({ ...item, source: 'user' }))
    let merged = [...official, ...local]

    // 应用本地排序
    const orderMap = getLocalNavOrder()
    const order = orderMap[category]
    if (order && Array.isArray(order)) {
      const ordered = []
      const used = new Set()
      for (const id of order) {
        const found = merged.find((m) => m.nav_id === id)
        if (found) { ordered.push(found); used.add(id) }
      }
      merged = [...ordered, ...merged.filter((m) => !used.has(m.nav_id))]
    }

    navList.value = merged
  } catch (err) {
    console.error('Failed to fetch navigation:', err)
    navList.value = []
  } finally {
    loading.value = false
  }
}

// --- CRUD 操作（本地 localStorage）---
const openAdd = () => {
  navDialog.edit = false
  navDialog.editingId = ''
  navDialog.form = { name: '', url: '', description: '', icon: '', category: currentCategory.value }
  navDialog.visible = true
}

const openEdit = (item) => {
  navDialog.edit = true
  navDialog.editingId = item.nav_id
  navDialog.form = {
    name: item.name, url: item.url,
    description: item.description || '', icon: item.icon || '',
    category: item.category
  }
  navDialog.visible = true
}

const submitNav = () => {
  const f = navDialog.form
  if (!f.name?.trim() || !f.url?.trim()) return ElMessage.warning('名称和网址必填')
  if (!/^https?:\/\//i.test(f.url.trim())) f.url = 'https://' + f.url.trim()

  const items = getLocalNavItems()
  if (navDialog.edit) {
    const idx = items.findIndex((i) => i.nav_id === navDialog.editingId)
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...f }
      ElMessage.success('已更新')
    }
  } else {
    items.push({
      nav_id: 'local_nav_' + Date.now(),
      ...f,
      category: f.category || currentCategory.value
    })
    ElMessage.success('已新增')
  }
  setLocalNavItems(items)
  saveSnapshot(navDialog.edit ? '编辑网址「' + f.name + '」' : '新增网址「' + f.name + '」')
  navDialog.visible = false
  fetchData(currentCategory.value)
}

const handleDelete = (item) => {
  ElMessageBox.confirm('确定删除「' + item.name + '」吗？', '删除', {
    confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    const items = getLocalNavItems().filter((i) => i.nav_id !== item.nav_id)
    setLocalNavItems(items)
    saveSnapshot('删除网址「' + item.name + '」')
    ElMessage.success('已删除')
    fetchData(currentCategory.value)
  }).catch(() => {})
}

// --- 拖拽排序（保存到 localStorage）---
watch(isEditing, (val) => {
  if (val) editableList.value = [...navList.value]
})

const onDragEnd = () => {
  // 保存排序到 localStorage
  const orderMap = getLocalNavOrder()
  orderMap[currentCategory.value] = editableList.value.map((x) => x.nav_id)
  setLocalNavOrder(orderMap)
  saveSnapshot('排序调整')
  navList.value = [...editableList.value]
  ElMessage.success('排序已保存')
}

watch(currentCategory, (v) => {
  if (v) fetchData(v)
  isEditing.value = false
}, { immediate: false })

onMounted(async () => {
  document.documentElement.style.setProperty('--card-min', cardSize.value + 'px')
  await fetchCategories()
  if (currentCategory.value) fetchData(currentCategory.value)
  else loading.value = false
})
</script>

<style scoped>
.nav-view { padding: 4px 0; }

/* 外网搜索引擎条 */
.search-engine {
  display: flex; align-items: center; gap: 8px;
  max-width: 720px; margin: 0 auto 24px;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 24px; padding: 6px 6px 6px 10px;
  box-shadow: 0 4px 16px var(--hover-shadow);
  transition: background-color 0.25s ease, border-color 0.25s ease;
}
.engine-picker { position: relative; flex-shrink: 0; }
.engine-picker__btn {
  display: flex; align-items: center; gap: 4px;
  border: none; background: transparent; cursor: pointer;
  color: var(--text-secondary); font-size: 13px; padding: 6px 12px;
  border-radius: 16px; transition: all 0.2s; white-space: nowrap;
}
.engine-picker__btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.engine-picker__arrow { transition: transform 0.25s; font-size: 12px; }
.engine-picker__arrow.open { transform: rotate(180deg); }
.engine-picker__menu {
  position: absolute; top: calc(100% + 6px); left: 0;
  min-width: 130px; z-index: 30;
  background: var(--bg-card); border: 1px solid var(--border-color);
  border-radius: 10px; box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
  padding: 6px; overflow: hidden;
}
.engine-picker__item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 7px 12px; font-size: 13px; cursor: pointer; border-radius: 6px;
  color: var(--text-primary); transition: background 0.15s;
}
.engine-picker__item:hover { background: var(--bg-card-hover); }
.engine-picker__item.active { color: var(--accent); font-weight: 600; }
.engine-picker__item .el-icon { font-size: 14px; }
.engine-fade-enter-active, .engine-fade-leave-active { transition: opacity 0.18s, transform 0.18s; }
.engine-fade-enter-from, .engine-fade-leave-to { opacity: 0; transform: translateY(-6px); }
.search-engine__input {
  flex: 1; min-width: 120px; border: none; outline: none; background: transparent;
  color: var(--text-primary); font-size: 14px; padding: 6px 8px;
}
.search-engine__input::placeholder { color: var(--text-secondary); }
.search-engine__btn {
  border: none; cursor: pointer; padding: 7px 18px; font-size: 14px;
  background: var(--accent); color: #fff; border-radius: 18px;
  transition: opacity 0.2s; white-space: nowrap;
}
.search-engine__btn:hover { opacity: 0.88; }

.nav-view__toolbar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px; }
.nav-view__toolbar-right { display: flex; gap: 2px; align-items: center; }
.nav-view__size-ctrl { display: flex; gap: 0; align-items: center; margin-right: 20px; }
.nav-view__size-ctrl :deep(.el-button.is-circle) {
  background: transparent !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}
.nav-view__size-ctrl :deep(.el-button.is-circle:hover) {
  background: rgba(0, 0, 0, 0.1) !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
}
.nav-view__size-ctrl :deep(.el-button.is-circle svg) {
  color: var(--accent) !important;
  fill: var(--accent) !important;
}
.nav-view__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(var(--card-min, 280px), 1fr)); gap: 12px; }
.nav-card-wrap { width: 100%; }
.drag-ghost { opacity: 0.3; background: var(--bg-card-hover); border: 1px dashed var(--accent); border-radius: 10px; }
.drag-chosen { box-shadow: 0 10px 30px var(--hover-shadow); }
.drag-drag { cursor: grabbing; }
.nav-view__loading { padding: 20px; }
.nav-view__empty { padding: 60px 0; }

/* Force override Element Plus button colors */
.nav-view :deep(.el-button--primary) {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
  border-radius: 20px !important;
}
.nav-view :deep(.el-button--primary:hover) {
  background-color: var(--el-color-primary-light-5) !important;
  border-color: var(--el-color-primary-light-5) !important;
}
.nav-view :deep(.el-button--primary:active) {
  background-color: var(--el-color-primary-dark-2) !important;
  border-color: var(--el-color-primary-dark-2) !important;
}
.nav-view :deep(.el-button--primary.is-plain) {
  background-color: transparent !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  border-radius: 20px !important;
}
.nav-view :deep(.el-button--primary.is-plain:hover) {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}
.nav-view :deep(.el-button--success) {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
  border-radius: 20px !important;
}
.nav-view :deep(.el-button--success.is-plain) {
  background-color: transparent !important;
  border-color: var(--accent) !important;
  color: var(--accent) !important;
  border-radius: 20px !important;
}
.nav-view :deep(.el-button--success.is-plain:hover) {
  background-color: var(--accent) !important;
  border-color: var(--accent) !important;
  color: #fff !important;
}
</style>
