<template>
  <div class="nav-card" :class="{ 'is-editable': editable }">
    <a v-if="!editable" :href="item.url" target="_blank" rel="noopener" class="nav-card__link">
      <CardContent :item="item" />
    </a>
    <div v-else class="nav-card__link">
      <CardContent :item="item" />
    </div>

    <div v-if="editable" class="nav-card__actions" @click.stop>
      <el-tooltip content="按住拖拽排序">
        <span class="drag-handle nav-card__btn" title="拖拽" style="cursor:grab">
          <el-icon><Rank /></el-icon>
        </span>
      </el-tooltip>
      <el-tooltip content="编辑">
        <el-button link type="primary" size="small" class="nav-card__btn" @click="$emit('edit', item)">
          <el-icon><EditPen /></el-icon>
        </el-button>
      </el-tooltip>
      <el-tooltip content="删除">
        <el-button link type="danger" size="small" class="nav-card__btn" @click="$emit('delete', item)">
          <el-icon><Delete /></el-icon>
        </el-button>
      </el-tooltip>
    </div>
  </div>
</template>

<script setup>
import { EditPen, Delete, Rank } from '@element-plus/icons-vue'
import CardContent from './CardContent.vue'

defineProps({
  item: { type: Object, required: true },
  editable: { type: Boolean, default: false }
})
defineEmits(['edit', 'delete'])
</script>

<style scoped>
.nav-card {
  position: relative;
  display: flex;
  align-items: stretch;
  padding: 0;
  background: var(--bg-card);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  transition: all 0.25s ease;
  min-height: calc(var(--card-min, 280px) * 0.243);
}
.nav-card:hover {
  border-color: var(--accent);
  box-shadow: 0 4px 16px var(--hover-shadow);
  transform: translateY(-2px);
  z-index: 2;
}
.nav-card__link {
  flex: 1; display: flex; align-items: center; gap: calc(var(--card-min, 280px) * 0.043);
  padding: calc(var(--card-min, 280px) * 0.05) calc(var(--card-min, 280px) * 0.057);
  text-decoration: none; color: inherit;
  min-width: 0;
}
.nav-card.is-editable .nav-card__link { cursor: default; }

.nav-card__actions {
  display: none;
  align-items: center;
  padding-right: 8px;
  gap: 2px;
}
.nav-card.is-editable .nav-card__actions { display: flex; }

.nav-card__btn {
  width: 30px; height: 30px; display: inline-flex !important;
  align-items: center; justify-content: center;
  border-radius: 6px;
}
.drag-handle {
  width: 30px; height: 30px; display:inline-flex;
  align-items:center; justify-content:center;
  color: var(--text-secondary);
  border-radius: 6px;
}
.drag-handle:hover { background: var(--bg-card-hover); color: var(--accent); }
</style>
