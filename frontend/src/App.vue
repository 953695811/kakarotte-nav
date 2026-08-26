<template>
  <div class="layout" @contextmenu="bgMenuOpen">
    <aside class="sidebar">
      <div class="sidebar__logo">
        <el-icon size="22" color="var(--accent)"><Link /></el-icon>
        <span class="sidebar__title">网址导航</span>
      </div>
      <el-scrollbar class="sidebar__scroll">
        <el-menu :default-active="activeMenu" class="sidebar__menu" @select="handleSelect">
          <el-menu-item v-for="cat in categoryList" :key="cat.key" :index="cat.key.startsWith('local_') ? '/cat/' + cat.key : '/' + cat.key">
            <el-icon v-if="iconMap[cat.icon]"><component :is="iconMap[cat.icon]" /></el-icon>
            <el-icon v-else><Collection /></el-icon>
            <span>{{ cat.name }}</span>
            <el-dropdown class="cat-menu-more" trigger="click" @click.stop @command="(c) => handleCatCmd(c, cat)">
              <el-icon style="margin-left:auto" @click.stop><MoreFilled /></el-icon>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="edit"><el-icon><Edit /></el-icon>重命名</el-dropdown-item>
                  <el-dropdown-item command="delete" divided><el-icon><Delete /></el-icon>删除分类</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </el-menu-item>
        </el-menu>
        <div class="sidebar__add-btn" @click="openAddCategory">
          <el-icon :color="themeColor"><CirclePlus /></el-icon>
          <span>新增分类</span>
        </div>
      </el-scrollbar>
    </aside>

    <main class="content">
      <div class="content__header">
        <h1 class="content__title">{{ currentTitle }}</h1>
        <div class="content__actions">
          <div class="content__search search-input-wrap">
            <el-input v-model="searchKeyword" :placeholder="searchPlaceholder" class="search-input" clearable @keyup.enter="handleSearchSubmit">
              <template #prefix><el-icon><Search /></el-icon></template>
              <template #append><el-button type="primary" @click="handleSearchSubmit">搜索</el-button></template>
            </el-input>
          </div>
          <div class="content__theme-history">
            <div class="btn-wrap" title="主题色">
              <div class="color-picker-wrapper" ref="colorPickerRef">
                <el-button circle class="color-btn" @click.stop="colorPickerOpen = !colorPickerOpen">
                  <el-icon :color="themeColor"><Brush /></el-icon>
                </el-button>
                <transition name="fade">
                  <div v-if="colorPickerOpen" class="color-picker-panel">
                    <div class="color-picker__title">选择主题色</div>
                    <div class="color-presets">
                      <div
                        v-for="c in presetColors"
                        :key="c.color"
                        class="color-swatch"
                        :style="{ background: c.color }"
                        :class="{ active: themeColor === c.color }"
                        :title="c.name"
                        @click="applyThemeColor(c.color); colorPickerOpen = false"
                      >
                        <el-icon v-if="themeColor === c.color" color="#fff" :size="14"><Check /></el-icon>
                      </div>
                    </div>
                    <div class="color-custom">
                      <span>自定义：</span>
                      <div class="color-custom-picker" @click.stop>
                        <input type="color" class="native-color-picker" v-model="customColor" @input="handleNativeColorInput" @change="handleNativeColorChange" />
                        <span class="color-custom-hex">{{ customColor }}</span>
                      </div>
                    </div>
                  </div>
                </transition>
              </div>
            </div>
            <div class="btn-wrap" :title="isDark ? '切换到白昼模式' : '切换到暗黑模式'">
              <el-button :icon="isDark ? Sunny : Moon" circle @click="toggleTheme" />
            </div>
            <div class="btn-wrap" title="背景设置（右键页面也可）">
              <el-button :icon="Picture" circle class="bg-menu-trigger" @click.stop="openBgMenuFromButton" />
            </div>
            <div class="btn-wrap" title="历史记录">
              <el-button :icon="Clock" circle @click="openHistory" />
            </div>
          </div>
        </div>
      </div>

      <div class="content__body">
        <router-view :key="$route.fullPath" />
      </div>
    </main>

    <!-- 新增/编辑分类弹窗 -->
    <el-dialog v-model="catDialog.visible" :title="catDialog.edit ? '编辑分类' : '新增分类'" width="440px">
      <el-form label-width="80px" :model="catDialog.form">
        <el-form-item label="名称"><el-input v-model="catDialog.form.name" placeholder="例如：效率工具" maxlength="20" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="catDialog.form.icon" placeholder="图标名称（Monitor/Brush/Cpu/Film/Headset），可留空" /></el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="catDialog.visible = false">取消</el-button>
        <el-button type="primary" @click="submitCategory">保存</el-button>
      </template>
    </el-dialog>

    <!-- 历史记录弹窗 -->
    <el-dialog v-model="historyDialog.visible" title="历史记录" width="560px">
      <div class="history-toolbar">
        <el-input v-model="historyDialog.label" placeholder="存档标签（可选）" style="width:300px" maxlength="30" @keyup.enter="manualSave" />
        <el-button type="primary" :icon="FolderAdd" @click="manualSave">存档</el-button>
        <el-button type="warning" plain :icon="RefreshLeft" @click="resetToDefault">恢复默认</el-button>
      </div>
      <el-divider />
      <div v-if="historyDialog.list.length === 0" style="text-align:center;padding:40px 0;color:#909399">
        暂无历史记录，编辑后自动存档
      </div>
      <div v-else class="history-list">
        <div v-for="snap in historyDialog.list" :key="snap.id" class="history-item">
          <div class="history-item__info">
            <el-icon color="var(--accent)"><Clock /></el-icon>
            <div>
              <div class="history-item__label">{{ snap.label }}</div>
              <div class="history-item__time">{{ formatTime(snap.timestamp) }}</div>
            </div>
          </div>
          <div class="history-item__actions">
            <el-button size="small" type="primary" plain @click="restoreSnap(snap)">恢复</el-button>
            <el-button size="small" type="danger" plain :icon="Delete" @click="removeSnap(snap)" />
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 右键背景菜单 -->
    <teleport to="body">
      <div v-if="bgMenu.visible" class="bg-context-menu" :style="{ left: bgMenu.x + 'px', top: bgMenu.y + 'px' }" @click.stop>
        <div class="bg-menu-item" @click="bgMenuSwitchImage">
          <el-icon><Picture /></el-icon>切换背景图
        </div>
        <div class="bg-menu-divider"></div>
        <div class="bg-menu-label">纯色背景</div>
        <div class="bg-solid-colors">
          <div
            v-for="sc in solidBgColors"
            :key="sc.color"
            class="bg-solid-swatch"
            :style="{ background: sc.color }"
            :class="{ active: currentBg === sc.color && bgMode === 'solid' }"
            :title="sc.name"
            @click="setSolidBg(sc.color)"
          ></div>
        </div>
        <div class="bg-menu-divider"></div>
        <div class="bg-menu-item" @click="bgMenuRandom">
          <el-icon><Refresh /></el-icon>随机换一张
        </div>
        <div class="bg-menu-item" @click="clearBackground(); bgMenuClose()">
          <el-icon><Delete /></el-icon>清除背景
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, reactive, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Monitor, Brush, Cpu, Film, Headset, Search, Link, Collection,
  CirclePlus, MoreFilled, Edit, Delete, Clock, FolderAdd, RefreshLeft,
  Moon, Sunny, Opportunity, Picture, Check, Refresh
} from '@element-plus/icons-vue'
import { getCategories } from './api'
import { saveSnapshot, getSnapshots, restoreSnapshot, deleteSnapshot, resetAll } from './utils/snapshot.js'

const route = useRoute()
const router = useRouter()

const searchKeyword = ref(route.query.keyword || '')
const categoryList = ref([])
let debounceTimer = null

const iconMap = { Monitor, Brush, Cpu, Film, Headset, Opportunity }

// ---------- 背景图 / 纯色（可随机切换 / 右键菜单） ----------
const LS_BG = 'kakarotte_bg'
const LS_BG_MODE = 'kakarotte_bg_mode'
const backgrounds = [
  { name: '雪山晨光', url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80' },
  { name: '海岸日落', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80' },
  { name: '云雾山脉', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=1920&q=80' },
  { name: '星空夜晚', url: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=1920&q=80' },
  { name: '森林小径', url: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=1920&q=80' },
  { name: '极光之境', url: 'https://images.unsplash.com/photo-1483347756197-71ef80e95f73?w=1920&q=80' },
  { name: '湖光山色', url: 'https://images.unsplash.com/photo-1470252649378-9c29740c9fa8?w=1920&q=80' },
  { name: '沙漠星空', url: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=1920&q=80' },
  { name: '城市夜景', url: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=1920&q=80' },
  { name: '草原天空', url: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?w=1920&q=80' },
  { name: '樱花春日', url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?w=1920&q=80' },
  { name: '海浪拍岸', url: 'https://images.unsplash.com/photo-1505142468610-359e7d316be0?w=1920&q=80' }
]
const solidBgColors = [
  { name: '雾霾蓝', color: '#a8c8e7' },
  { name: '薄荷绿', color: '#b5e8c9' },
  { name: '蜜桃粉', color: '#fbc4ab' },
  { name: '薰衣草', color: '#c4b5e8' },
  { name: '奶油黄', color: '#fde7a3' },
  { name: '天空蓝', color: '#89c4f4' },
  { name: '樱花粉', color: '#f4b6c2' },
  { name: '湖水绿', color: '#7ec8c8' },
  { name: '暮色紫', color: '#b8a9d9' },
  { name: '暖阳橙', color: '#f8b06e' },
  { name: '草地绿', color: '#a3d977' },
  { name: '霞光红', color: '#f08a8a' }
]
const bgMode = ref(localStorage.getItem(LS_BG_MODE) || '')
const currentBg = ref(localStorage.getItem(LS_BG) || '')
const applyBackground = (val, mode) => {
  const layout = document.querySelector('.layout')
  if (!layout) return
  const m = mode || bgMode.value
  if (val) {
    if (m === 'solid') {
      layout.classList.remove('has-bg-img')
      layout.classList.add('has-bg-solid')
      layout.style.setProperty('--bg-solid-color', val)
      layout.style.removeProperty('--bg-image')
    } else {
      layout.classList.remove('has-bg-solid')
      layout.classList.add('has-bg-img')
      layout.style.setProperty('--bg-image', `url("${val}")`)
      layout.style.removeProperty('--bg-solid-color')
    }
    layout.classList.add('has-bg')
  } else {
    layout.classList.remove('has-bg', 'has-bg-img', 'has-bg-solid')
    layout.style.removeProperty('--bg-image')
    layout.style.removeProperty('--bg-solid-color')
  }
}
const randomBackground = () => {
  const others = backgrounds.filter(b => b.url !== currentBg.value)
  const pool = others.length > 0 ? others : backgrounds
  const pick = pool[Math.floor(Math.random() * pool.length)]
  currentBg.value = pick.url
  bgMode.value = ''
  localStorage.setItem(LS_BG, pick.url)
  localStorage.setItem(LS_BG_MODE, '')
  applyBackground(pick.url)
  ElMessage.success('背景：' + pick.name)
}
const clearBackground = () => {
  currentBg.value = ''
  bgMode.value = ''
  localStorage.removeItem(LS_BG)
  localStorage.removeItem(LS_BG_MODE)
  applyBackground('')
}
const setSolidBg = (color) => {
  currentBg.value = color
  bgMode.value = 'solid'
  localStorage.setItem(LS_BG, color)
  localStorage.setItem(LS_BG_MODE, 'solid')
  applyBackground(color, 'solid')
  bgMenuClose()
  ElMessage.success('纯色背景已应用')
}

// ---------- 右键背景菜单 ----------
const bgMenu = reactive({ visible: false, x: 0, y: 0 })
let bgMenuSource = ''
const positionBgMenu = (x, y) => {
  const menuW = 220
  const menuH = 300
  const vw = window.innerWidth
  const vh = window.innerHeight
  if (x + menuW > vw) x = Math.max(10, vw - menuW - 10)
  if (x < 10) x = 10
  if (y + menuH > vh) y = Math.max(10, vh - menuH - 10)
  if (y < 10) y = 10
  bgMenu.x = x
  bgMenu.y = y
}
const bgMenuOpen = (e) => {
  e.preventDefault()
  bgMenuSource = 'right'
  positionBgMenu(e.clientX, e.clientY)
  bgMenu.visible = true
}
const bgMenuClose = () => {
  bgMenu.visible = false
}
const bgMenuSwitchImage = () => {
  bgMenuClose()
  randomBackground()
}
const bgMenuRandom = () => {
  bgMenuClose()
  if (bgMode.value === 'solid') {
    const others = solidBgColors.filter(c => c.color !== currentBg.value)
    const pool = others.length > 0 ? others : solidBgColors
    const pick = pool[Math.floor(Math.random() * pool.length)]
    setSolidBg(pick.color)
  } else {
    randomBackground()
  }
}
const handleBgMenuDocClick = (e) => {
  if (!bgMenu.visible) return
  if (e.target.closest('.bg-context-menu')) return
  if (e.target.closest('.bg-menu-trigger')) return
  bgMenuClose()
}
const openBgMenuFromButton = (e) => {
  bgMenuSource = 'button'
  const btn = e.target.closest('button')
  if (btn) {
    const rect = btn.getBoundingClientRect()
    positionBgMenu(rect.left, rect.bottom + 8)
  } else {
    positionBgMenu(e.clientX || 0, e.clientY || 0)
  }
  bgMenu.visible = !bgMenu.visible
}

// ---------- 主题（白昼 / 暗黑） ----------
const LS_THEME = 'kakarotte_theme'
const isDark = ref(localStorage.getItem(LS_THEME) === 'dark')
const applyTheme = () => {
  const root = document.documentElement
  if (isDark.value) {
    root.setAttribute('data-theme', 'dark')
    root.classList.add('dark')
  } else {
    root.setAttribute('data-theme', 'light')
    root.classList.remove('dark')
  }
}
const toggleTheme = () => {
  isDark.value = !isDark.value
  localStorage.setItem(LS_THEME, isDark.value ? 'dark' : 'light')
  applyTheme()
  applyThemeColor(themeColor.value)
  applyBackground(currentBg.value)
}

// ---------- 主题色（高对比度 + 可自定义） ----------
const LS_ACCENT = 'kakarotte_accent'
const presetColors = [
  { name: '青绿', color: '#0d9488' },
  { name: '天蓝', color: '#0284c7' },
  { name: '深紫', color: '#7c3aed' },
  { name: '玫红', color: '#e11d48' },
  { name: '橙色', color: '#ea580c' },
  { name: '金黄', color: '#d97706' },
  { name: '翠绿', color: '#16a34a' },
  { name: '靛蓝', color: '#4f46e5' },
  { name: '粉紫', color: '#d946ef' },
  { name: '青色', color: '#0891b2' },
  { name: '森林', color: '#059669' },
  { name: '珊瑚', color: '#f43f5e' }
]
const themeColor = ref(localStorage.getItem(LS_ACCENT) || '#0d9488')
const customColor = ref(themeColor.value)
const colorPickerOpen = ref(false)
const colorPickerRef = ref(null)

const handleNativeColorInput = (e) => {
  const hex = e.target.value
  if (hex && /^#[0-9a-fA-F]{6}$/.test(hex)) {
    applyThemeColor(hex)
  }
}

const handleNativeColorChange = (e) => {
  const hex = e.target.value
  if (hex) {
    applyThemeColor(hex)
  }
}

const handleDocClick = (e) => {
  if (!colorPickerOpen.value) return
  const target = e.target
  const el = colorPickerRef.value
  if (el && el.contains(target)) return
  // Element Plus color picker panel is teleported to body, need to detect it
  if (target.closest('.el-color-picker-panel') || target.closest('.el-color-dropdown')) return
  colorPickerOpen.value = false
}
onMounted(() => {
  applyTheme()
  applyThemeColor(themeColor.value)
  applyBackground(currentBg.value, bgMode.value)
  fetchCategories()
  document.addEventListener('click', handleDocClick)
  document.addEventListener('click', handleBgMenuDocClick)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocClick)
  document.removeEventListener('click', handleBgMenuDocClick)
})

// hex → hsl
const hexToHsl = (hex) => {
  hex = hex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16) / 255
  const g = parseInt(hex.substring(2, 4), 16) / 255
  const b = parseInt(hex.substring(4, 6), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break
      case g: h = ((b - r) / d + 2); break
      case b: h = ((r - g) / d + 4); break
    }
    h *= 60
  }
  return [h, s * 100, l * 100]
}
// hsl → hex
const hslToHex = (h, s, l) => {
  h = ((h % 360) + 360) % 360
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let r, g, b
  if (h < 60) { r = c; g = x; b = 0 }
  else if (h < 120) { r = x; g = c; b = 0 }
  else if (h < 180) { r = 0; g = c; b = x }
  else if (h < 240) { r = 0; g = x; b = c }
  else if (h < 300) { r = x; g = 0; b = c }
  else { r = c; g = 0; b = x }
  const toHex = (v) => Math.round((v + m) * 255).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}
const mixColor = (hex1, hex2, weight) => {
  const h1 = hexToHsl(hex1), h2 = hexToHsl(hex2)
  const h = h1[0] * weight + h2[0] * (1 - weight)
  const s = h1[1] * weight + h2[1] * (1 - weight)
  const l = h1[2] * weight + h2[2] * (1 - weight)
  return hslToHex(h, s, l)
}

const applyThemeColor = (color) => {
  if (!color) return
  themeColor.value = color
  customColor.value = color
  localStorage.setItem(LS_ACCENT, color)

  const [h, s, l] = hexToHsl(color)
  const root = document.documentElement
  const dark = isDark.value

  // Light mode palette
  const lightVars = {
    '--accent': color,
    '--hover-shadow': `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.18)`,
    '--el-color-primary': color,
    '--el-color-primary-light-1': hslToHex(h, Math.min(s, 60), 95),
    '--el-color-primary-light-2': hslToHex(h, Math.min(s, 55), 88),
    '--el-color-primary-light-3': hslToHex(h, Math.min(s, 50), 78),
    '--el-color-primary-light-4': hslToHex(h, Math.min(s, 45), 65),
    '--el-color-primary-light-5': hslToHex(h, Math.min(s, 50), 52),
    '--el-color-primary-light-6': hslToHex(h, Math.min(s, 55), 42),
    '--el-color-primary-light-7': color,
    '--el-color-primary-light-8': hslToHex(h, Math.min(s, 60), 30),
    '--el-color-primary-light-9': hslToHex(h, Math.min(s, 65), 22),
    '--el-color-primary-dark-2': hslToHex(h, Math.min(s, 60), 30),
    '--el-color-success': color,
    '--el-color-success-light-3': hslToHex(h, Math.min(s, 50), 78),
    '--el-color-success-light-5': hslToHex(h, Math.min(s, 50), 52),
    '--el-color-success-light-7': hslToHex(h, Math.min(s, 45), 65),
    '--el-color-success-light-9': hslToHex(h, Math.min(s, 55), 88),
    '--el-color-success-dark-2': hslToHex(h, Math.min(s, 60), 30)
  }

  // Dark mode palette - brighter, more saturated
  const darkVars = {
    '--accent': hslToHex(h, Math.min(s + 10, 100), Math.min(l + 10, 60)),
    '--hover-shadow': `rgba(${parseInt(color.slice(1,3),16)},${parseInt(color.slice(3,5),16)},${parseInt(color.slice(5,7),16)},0.3)`,
    '--el-color-primary': hslToHex(h, Math.min(s + 10, 100), Math.min(l + 10, 60)),
    '--el-color-primary-light-1': hslToHex(h, Math.min(s, 50), 15),
    '--el-color-primary-light-2': hslToHex(h, Math.min(s, 55), 20),
    '--el-color-primary-light-3': hslToHex(h, Math.min(s, 60), 30),
    '--el-color-primary-light-4': hslToHex(h, Math.min(s, 55), 38),
    '--el-color-primary-light-5': hslToHex(h, Math.min(s + 5, 65), 48),
    '--el-color-primary-light-6': hslToHex(h, Math.min(s + 10, 70), 58),
    '--el-color-primary-light-7': hslToHex(h, Math.min(s + 10, 75), 65),
    '--el-color-primary-light-8': hslToHex(h, Math.min(s + 5, 60), 52),
    '--el-color-primary-light-9': hslToHex(h, Math.min(s, 55), 40),
    '--el-color-primary-dark-2': hslToHex(h, Math.min(s, 60), 30),
    '--el-color-success': hslToHex(h, Math.min(s + 10, 100), Math.min(l + 10, 60)),
    '--el-color-success-light-3': hslToHex(h, Math.min(s, 60), 30),
    '--el-color-success-light-5': hslToHex(h, Math.min(s + 5, 65), 48),
    '--el-color-success-light-7': hslToHex(h, Math.min(s + 10, 70), 58),
    '--el-color-success-light-9': hslToHex(h, Math.min(s, 55), 40),
    '--el-color-success-dark-2': hslToHex(h, Math.min(s, 60), 30)
  }

  const vars = dark ? darkVars : lightVars
  const target = dark ? document.querySelector('[data-theme="dark"]') || root : root
  Object.entries(vars).forEach(([k, v]) => target.style.setProperty(k, v))
}

// ---------- localStorage 工具 ----------
const LS_CATEGORIES = 'kakarotte_local_categories'
const LS_HIDDEN = 'kakarotte_hidden_cats'
const LS_RENAMED = 'kakarotte_renamed_cats'
const getLocalCategories = () => { try { return JSON.parse(localStorage.getItem(LS_CATEGORIES) || '[]') } catch { return [] } }
const setLocalCategories = (cats) => localStorage.setItem(LS_CATEGORIES, JSON.stringify(cats))
const getHiddenCats = () => { try { return JSON.parse(localStorage.getItem(LS_HIDDEN) || '[]') } catch { return [] } }
const setHiddenCats = (arr) => localStorage.setItem(LS_HIDDEN, JSON.stringify(arr))
const getRenamedCats = () => { try { return JSON.parse(localStorage.getItem(LS_RENAMED) || '{}') } catch { return {} } }
const setRenamedCats = (obj) => localStorage.setItem(LS_RENAMED, JSON.stringify(obj))

const catDialog = reactive({
  visible: false, edit: false, editingKey: '', isOfficial: false,
  form: { name: '', icon: '' }
})

// ---------- 历史记录 ----------
const historyDialog = reactive({
  visible: false, label: '', list: []
})

const openHistory = () => {
  historyDialog.list = getSnapshots().reverse()
  historyDialog.visible = true
}

const manualSave = () => {
  const label = historyDialog.label.trim() || '手动存档'
  saveSnapshot(label)
  historyDialog.label = ''
  historyDialog.list = getSnapshots().reverse()
  ElMessage.success('已存档：' + label)
}

const restoreSnap = (snap) => {
  ElMessageBox.confirm('恢复到「' + snap.label + '」（' + formatTime(snap.timestamp) + '）？当前数据将被覆盖', '恢复存档', {
    confirmButtonText: '确认恢复', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    // 恢复前先存一份当前状态
    saveSnapshot('恢复前自动备份')
    restoreSnapshot(snap.id)
    ElMessage.success('已恢复到：' + snap.label)
    historyDialog.visible = false
    fetchCategories()
    // 刷新当前页面
    const key = currentCategoryKey.value
    if (key) {
      const route = key.startsWith('local_') ? '/cat/' + key : '/' + key
      router.replace(route).catch(() => {})
    }
    setTimeout(() => window.location.reload(), 500)
  }).catch(() => {})
}

const removeSnap = (snap) => {
  deleteSnapshot(snap.id)
  historyDialog.list = getSnapshots().reverse()
  ElMessage.success('已删除存档')
}

const resetToDefault = () => {
  ElMessageBox.confirm('恢复到初始状态？所有自定义分类、网址、排序、隐藏/重命名都会被清除', '恢复默认', {
    confirmButtonText: '确认恢复', cancelButtonText: '取消', type: 'warning'
  }).then(() => {
    saveSnapshot('恢复默认前自动备份')
    resetAll()
    clearBackground()
    ElMessage.success('已恢复到默认状态')
    historyDialog.visible = false
    fetchCategories()
    router.replace('/hot')
    setTimeout(() => window.location.reload(), 500)
  }).catch(() => {})
}

const formatTime = (iso) => {
  const d = new Date(iso)
  const pad = (n) => String(n).padStart(2, '0')
  return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) +
    ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds())
}

// ---------- 路由 & 搜索 ----------
const currentCategoryKey = computed(() => {
  if (route.params.catKey) return route.params.catKey
  if (route.meta.category) return route.meta.category
  const map = { '/frontend': 'frontend', '/design': 'design', '/backend': 'backend', '/movie': 'movie', '/music': 'music', '/hot': 'hot' }
  return map[route.path] || 'hot'
})

const activeMenu = computed(() => {
  if (route.path === '/search') return ''
  if (currentCategoryKey.value.startsWith('local_')) return '/cat/' + currentCategoryKey.value
  return '/' + (currentCategoryKey.value || 'hot')
})

const currentTitle = computed(() => {
  if (route.path === '/search') return '全局搜索："' + (route.query.keyword || '') + '"'
  const found = categoryList.value.find((c) => c.key === currentCategoryKey.value)
  if (found) return found.name
  if (route.meta.title) return route.meta.title
  return '网址导航'
})

const searchPlaceholder = computed(() => {
  if (route.path === '/search') return '输入关键词，全站搜索（按回车/点按钮搜索）'
  if (!currentCategoryKey.value) return '输入关键词搜索'
  const cat = categoryList.value.find((c) => c.key === currentCategoryKey.value)
  return '在「' + (cat?.name || '当前分类') + '」中搜索（输入即可实时过滤）'
})

const handleSelect = (index) => {
  searchKeyword.value = ''
  router.push(index)
}

const fetchCategories = async () => {
  try {
    const res = await getCategories()
    const hidden = getHiddenCats()
    const renamed = getRenamedCats()
    const official = (res.data || [])
      .filter((c) => !hidden.includes(c.key))
      .map((c) => ({ ...c, name: renamed[c.key] || c.name }))
    const local = getLocalCategories()
    categoryList.value = [...official, ...local]
  } catch (e) { console.error(e) }
}

const handleSearchSubmit = () => {
  const keyword = searchKeyword.value.trim()
  if (!keyword) {
    if (route.path === '/search') router.replace('/hot')
    else {
      const q = { ...route.query }
      delete q.keyword
      router.replace({ path: route.path, query: q })
    }
    return
  }
  router.push({ path: '/search', query: { keyword } })
}

const updateQueryKeyword = (val) => {
  if (route.path === '/search') return
  const trimmed = val.trim()
  const query = { ...route.query }
  if (!trimmed) delete query.keyword
  else query.keyword = trimmed
  router.replace({ path: route.path, query })
}

// ---------- 分类 CRUD（本地 localStorage + 自动存档）----------
const openAddCategory = () => {
  catDialog.edit = false
  catDialog.editingKey = ''
  catDialog.isOfficial = false
  catDialog.form = { name: '', icon: '' }
  catDialog.visible = true
}

const handleCatCmd = (cmd, cat) => {
  if (cmd === 'edit') {
    catDialog.edit = true
    catDialog.editingKey = cat.key
    catDialog.isOfficial = !cat.key.startsWith('local_')
    catDialog.form = { name: cat.name, icon: cat.icon || '' }
    catDialog.visible = true
  } else if (cmd === 'delete') {
    ElMessageBox.confirm('删除「' + cat.name + '」会同时删除该分类下的自定义网址，是否继续？', '删除分类', {
      confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning'
    }).then(() => {
      if (cat.key.startsWith('local_')) {
        const cats = getLocalCategories().filter((c) => c.key !== cat.key)
        setLocalCategories(cats)
      } else {
        const hidden = getHiddenCats()
        if (!hidden.includes(cat.key)) hidden.push(cat.key)
        setHiddenCats(hidden)
      }
      const items = JSON.parse(localStorage.getItem('kakarotte_local_nav_items') || '[]')
      const filtered = items.filter((i) => i.category !== cat.key)
      localStorage.setItem('kakarotte_local_nav_items', JSON.stringify(filtered))
      saveSnapshot('删除分类「' + cat.name + '」')
      ElMessage.success('已删除分类')
      fetchCategories()
      if (currentCategoryKey.value === cat.key) {
        const remaining = categoryList.value.filter((c) => c.key !== cat.key)
        if (remaining.length > 0) {
          const first = remaining[0]
          router.replace(first.key.startsWith('local_') ? '/cat/' + first.key : '/' + first.key)
        }
      }
    }).catch(() => {})
  }
}

const submitCategory = () => {
  if (!catDialog.form.name.trim()) return ElMessage.warning('请填写分类名称')
  if (catDialog.edit) {
    if (catDialog.isOfficial) {
      const renamed = getRenamedCats()
      renamed[catDialog.editingKey] = catDialog.form.name.trim()
      setRenamedCats(renamed)
    } else {
      const cats = getLocalCategories()
      const idx = cats.findIndex((c) => c.key === catDialog.editingKey)
      if (idx >= 0) {
        cats[idx].name = catDialog.form.name.trim()
        cats[idx].icon = catDialog.form.icon || ''
      }
      setLocalCategories(cats)
    }
  } else {
    const cats = getLocalCategories()
    cats.push({
      key: 'local_' + Date.now(),
      name: catDialog.form.name.trim(),
      icon: catDialog.form.icon || ''
    })
    setLocalCategories(cats)
  }
  saveSnapshot(catDialog.edit ? '重命名分类' : '新增分类')
  ElMessage.success(catDialog.edit ? '已更新' : '已新增分类')
  catDialog.visible = false
  fetchCategories()
}

watch(searchKeyword, (newVal) => {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => updateQueryKeyword(newVal), 150)
})
watch(() => route.query.keyword, (v) => {
  const x = v || ''
  if (searchKeyword.value !== x) searchKeyword.value = x
})
</script>

<style>
:root {
  --bg-app: #f5f7fa;
  --bg-sidebar: #fff;
  --bg-header: #fff;
  --bg-card: #fff;
  --bg-card-hover: #f5f7fa;
  --bg-icon: #fafbfc;
  --text-primary: #303133;
  --text-secondary: #909399;
  --border-color: #ebeef5;
  --border-light: #f0f0f0;
  --input-border: #dcdfe6;
  --accent: #0d9488;
  --hover-shadow: rgba(13, 148, 136, 0.18);
  --icon-bg-img: #fff;
  --el-color-primary: #0d9488;
  --el-color-primary-light-1: #f0fdfa;
  --el-color-primary-light-2: #ccfbf1;
  --el-color-primary-light-3: #99f6e4;
  --el-color-primary-light-4: #5eead4;
  --el-color-primary-light-5: #2dd4bf;
  --el-color-primary-light-6: #14b8a6;
  --el-color-primary-light-7: #0d9488;
  --el-color-primary-light-8: #0f766e;
  --el-color-primary-light-9: #115e59;
  --el-color-primary-dark-2: #0f766e;
  --el-color-success: #0d9488;
  --el-color-success-light-3: #99f6e4;
  --el-color-success-light-5: #5eead4;
  --el-color-success-light-7: #2dd4bf;
  --el-color-success-light-9: #ccfbf1;
  --el-color-success-dark-2: #0f766e;
  --el-color-text-primary: #303133;
  --el-color-text-regular: #606266;
  --el-color-text-secondary: #909399;
  --el-color-text-placeholder: #a8abb2;
  --el-border-color: #ebeef5;
  --el-border-color-light: #f0f0f0;
  --el-bg-color: #f5f7fa;
  --el-fill-color: #f5f7fa;
}
[data-theme="dark"] {
  --bg-app: #1a1b22;
  --bg-sidebar: #1c1d24;
  --bg-header: #20212a;
  --bg-card: #1c1d24;
  --bg-card-hover: #23242e;
  --bg-icon: #20212a;
  --text-primary: #d4d4d4;
  --text-secondary: #8b8da3;
  --border-color: #2a2b34;
  --border-light: #23242e;
  --input-border: #2a2b34;
  --accent: #14b8a6;
  --hover-shadow: rgba(20, 184, 166, 0.3);
  --icon-bg-img: #1a1b22;
  --el-color-primary: #14b8a6;
  --el-color-primary-light-1: #042f2e;
  --el-color-primary-light-2: #064e3b;
  --el-color-primary-light-3: #0f766e;
  --el-color-primary-light-4: #0d9488;
  --el-color-primary-light-5: #14b8a6;
  --el-color-primary-light-6: #2dd4bf;
  --el-color-primary-light-7: #5eead4;
  --el-color-primary-light-8: #99f6e4;
  --el-color-primary-light-9: #ccfbf1;
  --el-color-primary-dark-2: #0f766e;
  --el-color-success: #14b8a6;
  --el-color-success-light-3: #0f766e;
  --el-color-success-light-5: #14b8a6;
  --el-color-success-light-7: #2dd4bf;
  --el-color-success-light-9: #99f6e4;
  --el-color-success-dark-2: #0f766e;
  --el-color-text-primary: #e5eaf3;
  --el-color-text-regular: #cfd3dc;
  --el-color-text-secondary: #a3a6ad;
  --el-color-text-placeholder: #8b8da3;
  --el-border-color: #4c4d56;
  --el-border-color-light: #414249;
  --el-bg-color: #1a1b22;
  --el-fill-color: #23242e;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: var(--bg-app); transition: background-color 0.25s ease, color 0.25s ease; }
.layout { display: flex; min-height: 100vh; }
.layout.has-bg { position: relative; }
.layout.has-bg::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-image: var(--bg-image);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
  transition: opacity 0.4s ease;
}
.layout.has-bg::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background: var(--bg-overlay);
  transition: background 0.25s ease;
  pointer-events: none;
}
:root {
  --bg-overlay: linear-gradient(135deg, rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.35) 100%);
  --sidebar-bg-override: rgba(255, 255, 255, 0.65);
  --header-bg-override: rgba(255, 255, 255, 0.65);
  --card-bg-override: rgba(255, 255, 255, 0.55);
}
[data-theme="dark"] {
  --bg-overlay: linear-gradient(135deg, rgba(26,27,34,0.7) 0%, rgba(26,27,34,0.5) 100%);
  --sidebar-bg-override: rgba(28, 29, 36, 0.65);
  --header-bg-override: rgba(32, 33, 42, 0.65);
  --card-bg-override: rgba(28, 29, 36, 0.55);
}
.layout.has-bg .sidebar {
  background-color: var(--sidebar-bg-override) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.layout.has-bg .content__header {
  background-color: var(--header-bg-override) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
.layout.has-bg .nav-card,
.layout.has-bg .search-engine {
  background: var(--card-bg-override) !important;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-color: var(--border-color);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
}
.layout.has-bg .nav-card:hover {
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.14);
  border-color: var(--accent);
}
.layout.has-bg .nav-card__icon {
  background: transparent !important;
  border-color: rgba(255, 255, 255, 0.3) !important;
}
.layout.has-bg .search-engine__input::placeholder {
  color: var(--text-secondary);
}
.sidebar { width: 224px; background-color: var(--bg-sidebar); border-right: 1px solid var(--border-color); display: flex; flex-direction: column; flex-shrink: 0; position: sticky; top: 0; height: 100vh; transition: background-color 0.25s ease, border-color 0.25s ease; }
.sidebar__logo { padding: 18px 16px; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border-light); }
.sidebar__title { font-size: 17px; font-weight: 700; color: var(--text-primary); }
.sidebar__scroll { flex: 1; overflow: hidden; }
.sidebar__menu { border-right: none; background-color: transparent !important; }
.sidebar__menu .el-menu-item { display: flex; align-items: center; gap: 8px; color: var(--text-primary); }
.sidebar__menu .el-menu-item.is-active { color: var(--accent); }
.sidebar__add-btn { display: flex; align-items: center; gap: 8px; padding: 0 20px; height: 50px; cursor: pointer; color: var(--accent); font-size: 14px; transition: background 0.2s, border-color 0.2s; border-left: 2px solid transparent; }
.sidebar__add-btn:hover { background: var(--bg-card-hover); border-left-color: var(--accent); }
.cat-menu-more { margin-left: auto; opacity: 0.6; }
.el-menu-item:hover .cat-menu-more { opacity: 1; }
.content { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.content__header { padding: 14px 24px; background-color: var(--bg-header); border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; transition: background-color 0.25s ease, border-color 0.25s ease; }
.content__title { font-size: 20px; font-weight: 600; color: var(--text-primary); margin: 0; flex-shrink: 0; }
.content__actions { display: flex; align-items: center; gap: 6px; flex: 1; justify-content: flex-end; flex-wrap: wrap; }
.content__search { min-width: 260px; max-width: 520px; flex: 1; }
.content__theme-history { display: flex; align-items: center; gap: 4px; margin-left: 8px; }
.content__theme-history .btn-wrap { display: inline-flex; line-height: 0; }
.content__theme-history .el-button { margin: 0 !important; }
.content__theme-history .color-picker-wrapper { display: inline-flex; line-height: 0; margin: 0 !important; padding: 0 !important; }
.search-input-wrap .el-input-group { border-radius: 20px !important; overflow: hidden; }
.search-input-wrap .el-input__wrapper { box-shadow: 0 0 0 1px var(--input-border) inset !important; background-color: var(--bg-card) !important; border-radius: 20px 0 0 20px !important; }
.search-input-wrap .el-input-group__append { border-radius: 0 20px 20px 0 !important; background-color: var(--accent) !important; border-color: var(--accent) !important; color: #fff !important; }
.search-input-wrap .el-input-group__append .el-button { background: transparent !important; border: none !important; color: #fff !important; }
.search-input-wrap .el-input__inner { color: var(--text-primary) !important; }
.content__body { padding: 24px; flex: 1; }
.history-toolbar { display: flex; gap: 10px; align-items: center; margin-bottom: 8px; }
.history-list { max-height: 400px; overflow-y: auto; }
.history-item { display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
.history-item:last-child { border-bottom: none; }
.history-item__info { display: flex; align-items: center; gap: 10px; }
.history-item__label { font-size: 14px; color: var(--text-primary); font-weight: 500; }
.history-item__time { font-size: 12px; color: var(--text-secondary); }
.history-item__actions { display: flex; gap: 8px; }

/* Color picker */
.color-picker-wrapper { position: relative; }
.color-btn { position: relative; }
.color-btn::after {
  content: '';
  position: absolute;
  bottom: 1px;
  left: 50%;
  transform: translateX(-50%);
  width: 14px;
  height: 3px;
  border-radius: 2px;
  background: var(--accent);
}
.color-picker-panel {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 240px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 100;
}
.color-picker__title { font-size: 13px; color: var(--text-secondary); margin-bottom: 8px; }
.color-presets { display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 12px; }
.color-swatch {
  width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 2px solid transparent;
}
.color-swatch:hover { transform: scale(1.15); }
.color-swatch.active { border-color: var(--text-primary); box-shadow: 0 0 0 2px var(--bg-card); }
.color-custom { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-secondary); }
.color-custom-picker { display: inline-flex; align-items: center; gap: 8px; padding: 4px 10px; border-radius: 6px; border: 1px solid var(--border-color); cursor: pointer; transition: border-color 0.2s; background: var(--bg-card); }
.color-custom-picker:hover { border-color: var(--accent); }
.native-color-picker { width: 28px; height: 28px; border: none; padding: 0; cursor: pointer; background: transparent; border-radius: 4px; }
.native-color-picker::-webkit-color-swatch-wrapper { padding: 0; }
.native-color-picker::-webkit-color-swatch { border: 2px solid var(--border-color); border-radius: 4px; }
.native-color-picker::-moz-color-swatch { border: 2px solid var(--border-color); border-radius: 4px; }
.color-custom-hex { font-family: 'Consolas', 'Monaco', monospace; font-size: 12px; color: var(--text-primary); min-width: 64px; }

.fade-enter-active, .fade-leave-active { transition: opacity 0.18s, transform 0.18s; }
.fade-enter-from, .fade-leave-to { opacity: 0; transform: translateY(-6px); }

/* Global Element Plus button color override */
.el-button--primary {
  --el-button-bg-color: var(--el-color-primary) !important;
  --el-button-border-color: var(--el-color-primary) !important;
  --el-button-hover-bg-color: var(--el-color-primary-light-5) !important;
  --el-button-hover-border-color: var(--el-color-primary-light-5) !important;
  --el-button-active-bg-color: var(--el-color-primary-dark-2) !important;
  --el-button-active-border-color: var(--el-color-primary-dark-2) !important;
  --el-button-text-color: #fff !important;
  --el-button-hover-text-color: #fff !important;
  --el-button-active-text-color: #fff !important;
}
.el-button--primary.is-plain {
  --el-button-bg-color: transparent !important;
  --el-button-border-color: var(--el-color-primary) !important;
  --el-button-text-color: var(--el-color-primary) !important;
  --el-button-hover-bg-color: var(--el-color-primary) !important;
  --el-button-hover-border-color: var(--el-color-primary) !important;
  --el-button-hover-text-color: #fff !important;
}
.el-button--success {
  --el-button-bg-color: var(--el-color-success) !important;
  --el-button-border-color: var(--el-color-success) !important;
  --el-button-hover-bg-color: var(--el-color-success-light-5) !important;
  --el-button-hover-border-color: var(--el-color-success-light-5) !important;
  --el-button-active-bg-color: var(--el-color-success-dark-2) !important;
  --el-button-active-border-color: var(--el-color-success-dark-2) !important;
  --el-button-text-color: #fff !important;
}
.el-button--success.is-plain {
  --el-button-bg-color: transparent !important;
  --el-button-border-color: var(--el-color-success) !important;
  --el-button-text-color: var(--el-color-success) !important;
  --el-button-hover-bg-color: var(--el-color-success) !important;
  --el-button-hover-border-color: var(--el-color-success) !important;
  --el-button-hover-text-color: #fff !important;
}
.el-tag--success {
  --el-tag-bg-color: var(--el-color-success-light-9) !important;
  --el-tag-border-color: var(--el-color-success-light-7) !important;
  --el-tag-text-color: var(--el-color-success) !important;
}
.el-tag--info {
  --el-tag-bg-color: var(--el-color-primary-light-9) !important;
  --el-tag-border-color: var(--el-color-primary-light-7) !important;
  --el-tag-text-color: var(--el-color-primary) !important;
}
.el-menu-item.is-active {
  color: var(--el-color-primary) !important;
}
.el-menu-item.is-active .el-menu-item__icon,
.el-menu-item.is-active span {
  color: var(--el-color-primary) !important;
}

/* Solid background support */
.layout.has-bg-solid::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: var(--bg-solid-color);
  transition: opacity 0.4s ease;
}

/* Context menu */
.bg-context-menu {
  position: fixed;
  min-width: 180px;
  background: var(--bg-card);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 6px;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.18);
  z-index: 9999;
  user-select: none;
}
.bg-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-primary);
  transition: background 0.15s;
}
.bg-menu-item:hover {
  background: var(--bg-card-hover);
  color: var(--accent);
}
.bg-menu-item .el-icon { font-size: 15px; }
.bg-menu-divider {
  height: 1px;
  background: var(--border-color);
  margin: 6px 8px;
}
.bg-menu-label {
  padding: 6px 12px 4px;
  font-size: 11px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.bg-solid-colors {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 4px 8px 8px;
}
.bg-solid-swatch {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  transition: transform 0.15s, box-shadow 0.15s;
  border: 2px solid transparent;
}
.bg-solid-swatch:hover {
  transform: scale(1.2);
}
.bg-solid-swatch.active {
  border-color: var(--text-primary);
  box-shadow: 0 0 0 2px var(--bg-card);
}
</style>
