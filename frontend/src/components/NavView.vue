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

    <!-- 【终极修复】全部无条件渲染 + CSS display 控制，绕开 Vue v-if patch 异常 -->
    <div class="nav-view__loading" :style="{ display: loading ? 'block' : 'none' }">
      <el-skeleton :rows="5" animated />
    </div>

    <div class="nav-view__empty" :style="{ display: showEmptyKeyword ? 'block' : 'none' }">
      <el-empty :description="emptyDesc" />
    </div>

    <div class="nav-view__empty" :style="{ display: showEmptyNoKeyword ? 'block' : 'none' }">
      <el-empty description="该分类下暂无导航，点右上角「+ 新增网址」创建一个吧">
        <el-button type="primary" @click="openAdd">+ 新增网址</el-button>
      </el-empty>
    </div>

    <div :style="{ display: showGrid ? 'block' : 'none' }">
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
          <el-tooltip content="编辑模式可拖拽排序 / 修改 / 删除卡片">
            <el-button :type="isEditing ? 'success' : 'primary'" plain size="small" :icon="isEditing ? Check : EditPen" @click="isEditing = !isEditing">
              {{ isEditing ? '完成编辑' : '编辑' }}
            </el-button>
          </el-tooltip>
          <el-button type="primary" size="small" :icon="Plus" @click="openAdd">新增网址</el-button>
        </div>
      </div>

      <!-- 【关键顺序】非编辑 Normal Grid 放在第一个兄弟节点！ -->
      <!-- vuedraggable/sortablejs 在 PROD 挂载时若崩溃会中断后续兄弟节点渲染 (toolbar OK 但之后全丢) -->
      <!-- 正常展示的卡片网格（编辑模式隐藏） -->
      <div class="nav-view__grid nav-view__grid--normal" data-mode="normal" :style="{ display: isEditing ? 'none' : '' }">
        <NavCard
          v-for="(item, idx) in renderList"
          :key="'card-' + idx"
          :item="item"
          :editable="false"
          @edit="openEdit(item)"
          @delete="handleDelete(item)"
        />
      </div>

      <!-- 编辑模式网格：v-if=isEditing 条件挂载 draggable（防止 PROD display:none 崩溃） -->
      <div class="nav-view__grid nav-view__grid--editable" :style="{ display: isEditing ? '' : 'none' }">
        <!-- 主路径：vuedraggable 拖拽排序（仅 Rank 手柄可拖拽，handle=.drag-handle） -->
        <draggable
          v-if="!draggableError && isEditing"
          v-model="editableList"
          item-key="nav_id"
          handle=".drag-handle"
          ghost-class="drag-ghost"
          chosen-class="drag-chosen"
          drag-class="drag-drag"
          @end="onDragEnd"
          class="nav-view__draggable-wrap"
          style="display:contents"
        >
          <template #item="{ element, index }">
            <div class="nav-card nav-card--editor is-editable" :key="'drag-' + (element?.nav_id || index)">
              <!-- 唯一拖拽手柄（带 class=drag-handle，对应 draggable 的 handle selector） -->
              <span class="drag-handle nav-card--editor__handle" title="拖拽排序">
                <el-icon :size="18"><Rank /></el-icon>
              </span>
              <!-- 卡片主体（图标 + 名称 + 描述 + 我的/默认 标签，跟正常卡片一致） -->
              <div class="nav-card--editor__body">
                <CardContent :item="element" />
              </div>
              <!-- 分类来源标签 + 操作按钮 -->
              <div class="nav-card--editor__side" @click.stop>
                <span
                  v-if="element && element.source === 'user'"
                  class="nav-card--editor__tag nav-card--editor__tag--user"
                >我的</span>
                <span
                  v-else
                  class="nav-card--editor__tag nav-card--editor__tag--default"
                >默认</span>
                <div class="nav-card--editor__actions">
                  <el-button link type="primary" size="small" class="nav-card__btn" @click="openEdit(element)" title="编辑">
                    <el-icon :size="16"><EditPen /></el-icon>
                  </el-button>
                  <el-button link type="danger" size="small" class="nav-card__btn" @click="handleDelete(element)" title="删除">
                    <el-icon :size="16"><Delete /></el-icon>
                  </el-button>
                </div>
              </div>
            </div>
          </template>
        </draggable>

        <!-- SafeFallback：draggable 崩溃 → 自动降级为手动 ↑↓ 排序（所有卡片仍可 Edit/Delete） -->
        <template v-else-if="isEditing">
          <div
            v-for="(item, idx) in editableList"
            :key="'edit-' + idx"
            class="nav-card nav-card--editor is-editable"
          >
            <!-- Rank 手柄（禁用，提示降级） -->
            <span class="drag-handle nav-card--editor__handle nav-card--editor__handle--disabled" title="拖拽已降级为手动排序">
              <el-icon :size="18"><Rank /></el-icon>
            </span>
            <!-- 卡片主体 -->
            <div class="nav-card--editor__body">
              <CardContent :item="item" />
            </div>
            <!-- 标签 + 上移下移 + 操作按钮 -->
            <div class="nav-card--editor__side" @click.stop>
              <span
                v-if="item && item.source === 'user'"
                class="nav-card--editor__tag nav-card--editor__tag--user"
              >我的</span>
              <span
                v-else
                class="nav-card--editor__tag nav-card--editor__tag--default"
              >默认</span>
              <div class="nav-card--editor__mover">
                <span v-if="idx > 0" class="nav-card--editor__move-btn" title="上移" @click="moveUp(idx)">↑</span>
                <span v-else class="nav-card--editor__move-btn nav-card--editor__move-btn--disabled">↑</span>
                <span v-if="idx < editableList.length - 1" class="nav-card--editor__move-btn" title="下移" @click="moveDown(idx)">↓</span>
                <span v-else class="nav-card--editor__move-btn nav-card--editor__move-btn--disabled">↓</span>
              </div>
              <div class="nav-card--editor__actions">
                <el-button link type="primary" size="small" class="nav-card__btn" @click="openEdit(item)" title="编辑">
                  <el-icon :size="16"><EditPen /></el-icon>
                </el-button>
                <el-button link type="danger" size="small" class="nav-card__btn" @click="handleDelete(item)" title="删除">
                  <el-icon :size="16"><Delete /></el-icon>
                </el-button>
              </div>
            </div>
          </div>
        </template>
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
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive, onErrorCaptured } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { EditPen, Plus, Check, Minus, ArrowDown, Delete, Rank } from '@element-plus/icons-vue'
import draggable from 'vuedraggable'
import NavCard from './NavCard.vue'
import CardContent from './CardContent.vue'
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
const LS_DELETED_DEFAULTS = 'kakarotte_deleted_default_ids'  // { catKey: [nav_id,...] }

const getLocalNavItems = () => { try { return JSON.parse(localStorage.getItem(LS_NAV_ITEMS) || '[]') } catch { return [] } }
const setLocalNavItems = (items) => localStorage.setItem(LS_NAV_ITEMS, JSON.stringify(items))
const getLocalNavOrder = () => { try { return JSON.parse(localStorage.getItem(LS_NAV_ORDER) || '{}') } catch { return {} } }
const setLocalNavOrder = (order) => localStorage.setItem(LS_NAV_ORDER, JSON.stringify(order))
const getLocalCategories = () => { try { return JSON.parse(localStorage.getItem(LS_CATEGORIES) || '[]') } catch { return [] } }
const getDeletedDefaults = () => { try { return JSON.parse(localStorage.getItem(LS_DELETED_DEFAULTS) || '{}') } catch { return {} } }
const setDeletedDefaults = (m) => localStorage.setItem(LS_DELETED_DEFAULTS, JSON.stringify(m))

const navList = ref([])
// v-for 直接用纯 ref renderList，不走 computed 链（绕开 template computed reactivity 异常）
const renderList = ref([])
const categoryList = ref([])
const loading = ref(true)
const isEditing = ref(false)
const editableList = ref([])
// PROD 模式下 vuedraggable/sortablejs 若崩溃自动降级为手动 ↑↓ 排序
const draggableError = ref(false)
onErrorCaptured((err, instance, info) => {
  if (info && info.includes('draggable')) {
    console.warn('[SafeFallback] vuedraggable error → 降级为手动排序:', err)
    draggableError.value = true
    return true
  }
  return false
})

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

// 【生产模式核心修复：手动同步 renderList】
// 绕开 Vue computed + watcher reactivity 在 prod build 下的 patch 时序问题：
// 1) 所有数据变更点（fetchData/onDragEnd/keyword）显式调用 syncRenderList()
// 2) syncRenderList 内部自己过滤 + 直接写 renderList ref，100% 同步可预测
const syncRenderList = () => {
  const kw = (keyword.value || '').toLowerCase()
  const list = Array.isArray(navList.value) ? navList.value : []
  let result
  if (!kw) {
    result = list.slice()  // 浅拷贝 → 强制触发 Vue re-render（哪怕顺序/内容相同）
  } else {
    result = list.filter((item) => {
      const name = (item.name || '').toLowerCase()
      const desc = (item.description || '').toLowerCase()
      const url = (item.url || '').toLowerCase()
      return name.includes(kw) || desc.includes(kw) || url.includes(kw)
    })
  }
  renderList.value = result
  // 保留 console（生产构建也需要排查时看）
  if (typeof console !== 'undefined') {
    console.log('[NavView] syncRenderList kw=', JSON.stringify(kw), 'result.len=', result.length, 'list.len=', list.length)
  }
}

// 原来的 watch(filteredList → render) 移除（生产模式时序不可靠）
// 保留 filteredList computed 给 showEmptyKeyword 用
const displayList = computed(() => filteredList.value)

// keyword 变化 → 重新同步 renderList（搜索过滤）
watch([keyword], () => {
  syncRenderList()
})

// 【关键修复】独立 computed 判断（不用 v-else-if 链式），避免 Vue patch 丢失整个块
const showEmptyKeyword = computed(() => !loading.value && !!keyword.value && renderList.value.length === 0)
const showEmptyNoKeyword = computed(() => !loading.value && !keyword.value && renderList.value.length === 0)
const showGrid = computed(() => !loading.value && !showEmptyKeyword.value && !showEmptyNoKeyword.value)

console.log('[NavView] computed declared. showGrid initial =', showGrid.value, 'displayListLen=', displayList.value.length)

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    categoryList.value = [...(res.data || []), ...getLocalCategories()]
  } catch (e) { console.error(e) }
}

const fetchData = async (category) => {
  console.log('[NavView] fetchData called with category=', category)
  if (!category) { loading.value = false; return }
  loading.value = true
  try {
    const res = await getNavigation(category)
    console.log('[NavView] getNavigation response:', res)
    const official = (res.data || []).map((item) => ({ ...item, source: 'official' }))
    const local = getLocalNavItems().filter((i) => i.category === category).map((item) => ({ ...item, source: 'user' }))
    // 读取"默认卡片删除黑名单"：用户删过的官方卡片不再出现在合并列表中
    const deletedMap = getDeletedDefaults()
    const deletedSet = new Set((deletedMap[category] || []).filter(Boolean))
    const filteredOfficial = official.filter((o) => !deletedSet.has(o.nav_id))
    let merged = [...filteredOfficial, ...local]
    console.log('[NavView] merged list count:', merged.length, 'official:', filteredOfficial.length, 'local:', local.length, 'deleted:', deletedSet.size)

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
    console.log('[NavView] navList.value final count =', navList.value.length)
    // 【生产修复】数据变更后立刻手动同步 renderList（不依赖 watcher）
    syncRenderList()
  } catch (err) {
    console.error('Failed to fetch navigation:', err)
    navList.value = []
    syncRenderList()  // catch 分支也要同步
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

  const cat = f.category || currentCategory.value
  const items = getLocalNavItems()
  if (navDialog.edit) {
    // ============== 编辑模式 ==============
    const oldId = navDialog.editingId
    const idxLocal = items.findIndex((i) => i.nav_id === oldId)

    if (idxLocal >= 0) {
      // A) 用户自定义卡片：直接覆盖
      items[idxLocal] = { ...items[idxLocal], ...f }
      ElMessage.success('已更新')
    } else {
      // B) 默认卡片：把原默认 nav_id 加入删除黑名单 → 以新的用户自定义 nav_id 写入
      const newNavId = 'local_nav_' + Date.now()
      items.push({
        nav_id: newNavId,
        ...f,
        category: cat,
        source: 'user'
      })
      const dm = getDeletedDefaults()
      const arr = dm[cat] ? [...dm[cat]] : []
      if (!arr.includes(oldId)) arr.push(oldId)
      dm[cat] = arr
      setDeletedDefaults(dm)
      ElMessage.success('已保存为自定义卡片')
    }
  } else {
    // 新增
    items.push({
      nav_id: 'local_nav_' + Date.now(),
      ...f,
      category: cat
    })
    ElMessage.success('已新增')
  }
  setLocalNavItems(items)
  saveSnapshot(navDialog.edit ? '编辑网址「' + f.name + '」' : '新增网址「' + f.name + '」')
  navDialog.visible = false
  fetchData(cat)
}

const handleDelete = (item) => {
  ElMessageBox.confirm('确定删除「' + item.name + '」吗？', '删除', {
    confirmButtonText: '删除', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    const cat = item.category || currentCategory.value
    const id = item.nav_id
    const isOfficial = (item.source === 'official' || (!item.source && /^(local_nav_|user_)/.test(id) === false))

    // 1) 用户自定义：从 LS_NAV_ITEMS 移除
    const items = getLocalNavItems().filter((i) => i.nav_id !== id)
    setLocalNavItems(items)

    // 2) 默认卡片：加入删除黑名单（下次合并时跳过）
    if (isOfficial) {
      const dm = getDeletedDefaults()
      const arr = dm[cat] ? [...dm[cat]] : []
      if (!arr.includes(id)) arr.push(id)
      dm[cat] = arr
      setDeletedDefaults(dm)
    }

    // 3) 从排序映射里也去掉（保持 order map 干净）
    const orderMap = getLocalNavOrder()
    if (orderMap[cat] && Array.isArray(orderMap[cat])) {
      orderMap[cat] = orderMap[cat].filter((x) => x !== id)
      setLocalNavOrder(orderMap)
    }

    saveSnapshot('删除网址「' + item.name + '」')
    ElMessage.success('已删除')
    fetchData(cat)
  }).catch(() => {})
}

// --- 排序：默认 vuedraggable 拖拽；生产构建若 sortablejs 崩溃自动降级为手动 ↑↓ ---
const saveEditedOrder = () => {
  const ids = editableList.value.map((x) => x && x.nav_id).filter(Boolean)
  const orderMap = getLocalNavOrder()
  orderMap[currentCategory.value] = ids
  setLocalNavOrder(orderMap)
  saveSnapshot('排序调整')
  navList.value = [...editableList.value]
  syncRenderList()
  ElMessage.success('编辑已保存')
}

watch(isEditing, (val, prev) => {
  if (val && !prev) {
    // 进入编辑模式：复制可编辑数组 + 重置 draggable 错误标记
    editableList.value = Array.isArray(navList.value) ? [...navList.value] : []
    draggableError.value = false
  } else if (!val && prev) {
    // 退出编辑模式（点击"完成编辑"）：统一保存排序
    saveEditedOrder()
  }
})

// 上移/下移（仅当 draggable 崩溃 fallback 时使用）
const moveUp = (idx) => {
  if (idx <= 0) return
  const arr = editableList.value
  const tmp = arr[idx - 1]; arr[idx - 1] = arr[idx]; arr[idx] = tmp
  editableList.value = [...arr]
}
const moveDown = (idx) => {
  const arr = editableList.value
  if (idx >= arr.length - 1) return
  const tmp = arr[idx + 1]; arr[idx + 1] = arr[idx]; arr[idx] = tmp
  editableList.value = [...arr]
}

// vuedraggable @end 事件：拖拽结束不需要额外处理，退出编辑模式统一 saveEditedOrder
const onDragEnd = () => {
  // no-op：排序结果在 editableList 中（vuedraggable v-model 双向绑定）
  console.log('[NavView] onDragEnd called. new editableList order:', editableList.value.map(x => x && x.nav_id))
}

watch(currentCategory, (v) => {
  console.log('[NavView] watch currentCategory changed to:', v)
  if (v) fetchData(v)
  isEditing.value = false
}, { immediate: false })

onMounted(async () => {
  console.log('[NavView] onMounted. props.category=', props.category, '| route.meta=', route.meta, '| route.params=', route.params)
  console.log('[NavView] onMounted currentCategory.value =', currentCategory.value)
  // 暴露 debug 对象
  window.__NAV_DEBUG__ = {
    propsCategory: props.category,
    routeMetaCategory: route.meta?.category,
    routeParams: route.params,
    routeQuery: route.query,
    get computedSnapshot() {
      return {
        currentCategory: currentCategory.value,
        keyword: keyword.value,
        navListLen: navList.value?.length ?? 'N/A',
        filteredListLen: filteredList.value?.length ?? 'N/A',
        displayListLen: displayList.value?.length ?? 'N/A',
        emptyDesc: emptyDesc.value,
        loading: loading.value,
        isEditing: isEditing.value
      }
    },
    fetchData,
    getNavigation: (c) => fetchData(c),
    navList,
    keyword,
    loading,
    currentCategory
  }
  document.documentElement.style.setProperty('--card-min', cardSize.value + 'px')
  await fetchCategories()
  console.log('[NavView] fetchCategories done. Now checking if should fetchData:', currentCategory.value)
  if (currentCategory.value) {
    console.log('[NavView] calling fetchData(', currentCategory.value, ')')
    fetchData(currentCategory.value)
  } else {
    loading.value = false
  }
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

/* ===================== 编辑模式卡片（nav-card--editor）=====================
   之前模板用了这些类名但 CSS 完全缺失 → 序号/手柄/主体/侧栏全以默认 block 堆叠，
   卡片被撑得很高、视觉错乱。这里补全 flex 布局，与普通卡片视觉一致。
   遵循项目约定：毛玻璃 55% 透明 + backdrop-filter blur 12px、accent 主题色、
   圆角 10px、卡片尺寸系数基于 --card-min。 */
.nav-card--editor {
  position: relative;
  display: flex;
  align-items: center;
  gap: calc(var(--card-min, 280px) * 0.036);
  padding: calc(var(--card-min, 280px) * 0.043) calc(var(--card-min, 280px) * 0.05);
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  min-height: calc(var(--card-min, 280px) * 0.243);
  transition: border-color 0.25s ease, box-shadow 0.25s ease, transform 0.25s ease;
}
.nav-card--editor:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 16px var(--hover-shadow);
  transform: translateY(-2px);
}

/* 拖拽手柄 */
.nav-card--editor__handle {
  flex-shrink: 0;
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: grab;
  transition: background 0.15s ease, color 0.15s ease;
}
.nav-card--editor__handle:hover {
  background: var(--bg-card-hover);
  color: var(--accent);
}
.nav-card--editor__handle:active {
  cursor: grabbing;
}
.nav-card--editor__handle--disabled {
  cursor: not-allowed;
  opacity: 0.4;
}
.nav-card--editor__handle--disabled:hover {
  background: transparent;
  color: var(--text-secondary);
}

/* 卡片主体（容纳 CardContent：图标 + 名称 + 描述 + 我的/默认徽章）
   CardContent 是多根 fragment，其 .nav-card__icon / .nav-card__info / .nav-card__badge
   会直接成为本容器的子节点，设 flex 即可让它们横排。 */
.nav-card--editor__body {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: calc(var(--card-min, 280px) * 0.043);
}

/* 右侧栏：来源标签 + 操作按钮（竖排，靠右）*/
.nav-card--editor__side {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 6px;
  padding-left: 4px;
}

/* 来源标签（默认 / 我的）*/
.nav-card--editor__tag {
  display: inline-flex;
  align-items: center;
  font-size: calc(var(--card-min, 280px) * 0.032);
  padding: 2px 8px;
  border-radius: 10px;
  white-space: nowrap;
  border: 1px solid transparent;
  line-height: 1.4;
}
.nav-card--editor__tag--default {
  color: var(--text-secondary);
  background: var(--bg-card-hover);
}
.nav-card--editor__tag--user {
  color: #fff;
  background: var(--accent);
}

/* 操作按钮组（编辑 / 删除）*/
.nav-card--editor__actions {
  display: flex;
  align-items: center;
  gap: 2px;
}
/* link 按钮纯图标无背景（编辑=主题色、删除=红色），避免被全局 .el-button--primary
   的 !important 背景覆盖影响，保持与 danger link 同样的无背景风格 */
.nav-card--editor__actions :deep(.el-button),
.nav-card--editor__actions :deep(.el-button.is-link),
.nav-card--editor__actions :deep(.el-button.is-link:hover) {
  width: 30px;
  height: 30px;
  padding: 0;
  border-radius: 6px !important;
  background: transparent !important;
  border: none !important;
}
/* hover 时仅给一个浅色圆角反馈，不破坏无背景风格 */
.nav-card--editor__actions :deep(.el-button.is-link:hover) {
  background: var(--bg-card-hover) !important;
}
/* 编辑按钮（primary link）图标色强制为主题色，
   避免被全局 .el-button--primary 的 color:#fff 覆盖成白色；
   删除按钮（danger link）保持 Element Plus 默认红色，不覆盖 */
.nav-card--editor__actions :deep(.el-button--primary.is-link),
.nav-card--editor__actions :deep(.el-button--primary.is-link:hover) {
  color: var(--accent) !important;
}

/* 手动上移/下移（vuedraggable 崩溃降级时使用）*/
.nav-card--editor__mover {
  display: flex;
  gap: 2px;
}
.nav-card--editor__move-btn {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-secondary);
  border-radius: 6px;
  cursor: pointer;
  user-select: none;
  transition: background 0.15s ease, color 0.15s ease;
}
.nav-card--editor__move-btn:hover {
  background: var(--bg-card-hover);
  color: var(--accent);
}
.nav-card--editor__move-btn--disabled {
  cursor: not-allowed;
  opacity: 0.3;
}
.nav-card--editor__move-btn--disabled:hover {
  background: transparent;
  color: var(--text-secondary);
}
</style>
