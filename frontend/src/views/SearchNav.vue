<template>
  <div class="search-view">
    <el-alert
      type="success"
      :closable="false"
      style="margin-bottom: 16px"
    >
      <template #title>
        <span>当前为「全局搜索」结果，跨 6 个分类。若只想搜某一类，可从左侧切换到对应分类，在该页输入时会实时过滤。</span>
      </template>
    </el-alert>

    <div v-if="loading" class="search-view__loading">
      <el-skeleton :rows="5" animated />
    </div>
    <div v-else-if="!keyword" class="search-view__empty">
      <el-empty description="请在顶部搜索框输入关键词后按回车或点「搜索」按钮" />
    </div>
    <div v-else-if="navList.length === 0" class="search-view__empty">
      <el-empty :description="emptyDesc" />
    </div>
    <div v-else class="search-view__result">
      <el-alert
        type="info"
        :title="resultTitle"
        show-icon
        :closable="false"
        style="margin-bottom: 16px"
      />
      <div v-for="(group, cat) in groupedList" :key="cat" class="search-group">
        <h3 class="search-group__title">
          <span class="search-group__tag">{{ categoryMap[cat] || cat }}</span>
          <span class="search-group__count">{{ group.length }} 个结果</span>
        </h3>
        <div class="search-group__grid">
          <NavCard v-for="item in group" :key="item.nav_id" :item="item" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute } from 'vue-router'
import { searchNavigation, getCategories } from '../api'
import NavCard from '../components/NavCard.vue'

const route = useRoute()

const keyword = computed(() => route.query.keyword || '')
const navList = ref([])
const loading = ref(false)
const categoryMap = ref({})

const emptyDesc = computed(() => '未找到与 "' + keyword.value + '" 相关的结果')
const resultTitle = computed(() => '共找到 ' + navList.value.length + ' 个与 "' + keyword.value + '" 相关的结果')

const groupedList = computed(() => {
  const map = {}
  navList.value.forEach((item) => {
    if (!map[item.category]) map[item.category] = []
    map[item.category].push(item)
  })
  return map
})

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    const obj = {}
    ;(res.data || []).forEach((c) => {
      obj[c.key] = c.name
    })
    categoryMap.value = obj
  } catch (e) {
    console.error(e)
  }
}

const fetchData = async (kw) => {
  if (!kw) {
    navList.value = []
    return
  }
  loading.value = true
  try {
    const res = await searchNavigation(kw)
    const raw = res.data || []
    // 适配结构：给搜索结果补上 nav_id 和 source 字段，与 NavCard/NavView 保持一致
    navList.value = raw.map((item) => {
      const isUser = item.is_default === 0
      return {
        ...item,
        source: isUser ? 'user' : 'official',
        nav_id: (isUser ? 'u_' : 'o_') + (item.id ?? Math.random().toString(36).slice(2))
      }
    })
  } catch (err) {
    console.error('Failed to search:', err)
    navList.value = []
  } finally {
    loading.value = false
  }
}

if (Object.keys(categoryMap.value).length === 0) {
  fetchCategories()
}

watch(keyword, (newVal) => {
  fetchData(newVal)
}, { immediate: true })
</script>

<style scoped>
.search-view {
  padding: 4px 0;
}

.search-view__loading {
  padding: 20px;
}

.search-view__empty {
  padding: 60px 0;
}

.search-group {
  margin-bottom: 28px;
}

.search-group__title {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 0 0 12px 0;
  font-size: 14px;
}

.search-group__tag {
  display: inline-block;
  padding: 4px 12px;
  background: var(--bg-card-hover);
  color: var(--accent);
  border-radius: 4px;
  font-weight: 600;
}

.search-group__count {
  color: var(--text-secondary);
  font-size: 12px;
}

.search-group__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--card-min, 280px), 1fr));
  gap: 12px;
}
</style>
