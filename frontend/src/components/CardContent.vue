<template>
  <div class="nav-card__icon">
    <img v-if="isUrlIcon" :src="highResIcon" :alt="item.name" @error="onIconError" />
    <el-icon v-else-if="item.icon" class="nav-card__icon-svg">
      <component :is="item.icon" />
    </el-icon>
    <span v-else class="nav-card__init">{{ (item.name || '?').slice(0,1) }}</span>
  </div>
  <div class="nav-card__info">
    <div class="nav-card__name">{{ item.name }}</div>
    <div class="nav-card__desc">{{ item.description || item.url }}</div>
  </div>
  <div class="nav-card__badge" v-if="item.is_default === 0 || item.source === 'user'">
    <el-tag size="small" type="success" effect="plain" round>我的</el-tag>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  item: { type: Object, required: true }
})

const isUrlIcon = computed(() => {
  const icon = props.item?.icon
  if (!icon) return false
  return icon.startsWith('http') || icon.startsWith('/') || icon.startsWith('data:')
})

const highResIcon = computed(() => {
  const icon = props.item?.icon
  if (!icon || !isUrlIcon.value) return icon
  // Skip if already an SVG or high-res logo
  if (icon.includes('.svg') || icon.includes('logo') || icon.includes('iconfont')) return icon
  // Try to extract domain from item.url or icon
  let domain = ''
  try {
    const urlStr = props.item?.url || icon
    const url = new URL(urlStr.startsWith('http') ? urlStr : 'https://' + urlStr)
    domain = url.hostname
  } catch {
    return icon
  }
  if (!domain) return icon
  // Use 360 favicon service (国内) for high-res icons
  return 'https://favicon.cccyun.cc/' + domain
})

const onIconError = (e) => {
  const el = e.target
  const parent = el.parentElement
  const currentSrc = el.src
  // First fallback: 360 search favicon (国内)
  if (currentSrc.includes('favicon.cccyun.cc')) {
    const domain = currentSrc.split('favicon.cccyun.cc/')[1]?.split('?')[0]
    if (domain) {
      el.src = 'https://code.bdstatic.com/favicon/' + domain + '/64'
      return
    }
  }
  // Second fallback: 字节跳动 favicon (国内)
  if (currentSrc.includes('code.bdstatic.com/favicon')) {
    const domain = currentSrc.split('favicon/')[1]?.split('/')[0]
    if (domain) {
      el.src = 'https://favicon.bytedance.com/' + domain
      return
    }
  }
  // Final fallback: hide icon, show first letter
  el.style.display = 'none'
  parent.classList.add('nav-card__icon--fallback')
  if (!parent.querySelector('.nav-card__init')) {
    const span = document.createElement('span')
    span.className = 'nav-card__init'
    span.textContent = (props.item?.name || '?').slice(0, 1)
    parent.appendChild(span)
  }
}
</script>

<style scoped>
.nav-card__icon {
  flex-shrink: 0;
  width: calc(var(--card-min, 280px) * 0.128);
  height: calc(var(--card-min, 280px) * 0.128);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-icon);
  border: 1px solid var(--border-light);
}
.nav-card__icon img {
  width: 100%; height: 100%; object-fit: contain; background: var(--icon-bg-img);
}
.nav-card__icon-svg {
  width: calc(var(--card-min, 280px) * 0.075);
  height: calc(var(--card-min, 280px) * 0.075);
  color: var(--accent);
  display: flex;
  align-items: center;
  justify-content: center;
}
.nav-card__icon--fallback { background: var(--bg-card-hover); }
.nav-card__init {
  font-size: calc(var(--card-min, 280px) * 0.057); font-weight: 700; color: var(--text-secondary);
  letter-spacing: -0.5px;
}
.nav-card__info {
  flex: 1; min-width: 0;
}
.nav-card__name {
  font-size: calc(var(--card-min, 280px) * 0.0535); font-weight: 600; color: var(--text-primary);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.nav-card__desc {
  font-size: calc(var(--card-min, 280px) * 0.043); color: var(--text-secondary); margin-top: 2px;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.nav-card__badge { margin-left: 6px; flex-shrink: 0; }
</style>
