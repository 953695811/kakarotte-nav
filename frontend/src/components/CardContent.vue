<template>
  <div class="nav-card__icon">
    <img v-if="isUrlIcon" :src="highResIcon" :alt="item.name" @error="onIconError" />
    <!-- 安全文本图标（单字母或短 ASCII / emoji） -->
    <!-- 禁用 <component :is="item.icon">：icon 为 emoji unicode 时 Vue prod resolveComponent 静默崩溃中止 v-for -->
    <span v-else-if="item.icon" class="nav-card__text-icon">{{ iconText }}</span>
    <span v-else class="nav-card__init">{{ firstChar }}</span>
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

// 非 URL 图标：显示为纯文本（emoji / 缩写），安全不抛错
const iconText = computed(() => {
  const s = props.item?.icon
  if (!s) return ''
  // emoji 或 1-3 字符短文本直接显示
  return s
})

const firstChar = computed(() => {
  return (props.item?.name || '?').slice(0, 1)
})

const highResIcon = computed(() => {
  const icon = props.item?.icon
  if (!icon) return ''
  if (isUrlIcon.value) {
    // 已经是可用图片 URL（favicon CDN / SVG CDN / 带扩展名的图片）→ 直接用，不再二次包装
    const readyPicRe = /(favicon\.cccyun\.cc|code\.bdstatic\.com\/favicon|favicon\.bytedance\.com|cdn\.simpleicons\.org|www\.google\.com\/s2\/favicons|s2\.googleusercontent\.com|\.(?:svg|png|jpe?g|webp|gif|ico)(?:\?|$))/i
    if (readyPicRe.test(icon)) return icon
    // 否则认为 icon 存的是网站首页 URL → 提取域名走 favicon.cccyun.cc
    let domain = ''
    try {
      const urlStr = icon.startsWith('http') ? icon : 'https://' + icon
      domain = new URL(urlStr).hostname
    } catch (e) {
      return icon
    }
    return domain ? 'https://favicon.cccyun.cc/' + domain : icon
  }
  return icon
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
    span.textContent = firstChar.value
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
.nav-card__text-icon {
  font-size: calc(var(--card-min, 280px) * 0.075);
  line-height: 1;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: var(--accent);
  user-select: none;
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
