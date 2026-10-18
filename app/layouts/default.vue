<script setup lang="ts">
import type { Component } from 'vue'
import { ElMessage } from 'element-plus'
import { CollectionTag, Goods, Lock, SwitchButton, Tickets } from '@element-plus/icons-vue'
import { ADMIN_NAV } from '#shared/permissions'

const { role, can, previewLevel } = usePermission()
const route = useRoute()

const iconMap: Record<string, Component> = {
  goods: Goods,
  tag: CollectionTag,
  log: Tickets,
  shield: Lock,
}

/** 菜单按权限过滤：2/3 级自动看不到操作日志与权限管理 */
const menus = computed(() => ADMIN_NAV.filter(item => can(item.permission)))

const currentLabel = computed(
  () => ADMIN_NAV.find(item => route.path.startsWith(item.to))?.label ?? '后台',
)

const avatarText = computed(() => role.value.key.charAt(0).toUpperCase())
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="#ffffff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
            <path d="M3 8.5v7L12 20l9-4.5v-7" />
            <path d="M12 13v7" />
          </svg>
        </span>
        <span class="brand-name">商品运营后台</span>
      </div>

      <nav class="menu">
        <NuxtLink
          v-for="item in menus"
          :key="item.to"
          :to="item.to"
          class="menu-item"
          active-class="is-active"
        >
          <el-icon :size="16"><component :is="iconMap[item.icon]" /></el-icon>
          <span>{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="side-foot">
        <div class="user">
          <span class="avatar">{{ avatarText }}</span>
          <span class="user-meta">
            <b>{{ role.label }}</b>
            <span>{{ role.level }} 级 · 预览模式</span>
          </span>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="crumb">后台管理 <i>/</i> <b>{{ currentLabel }}</b></div>

        <div class="tools">
          <span class="preview-label">预览角色</span>
          <div class="seg">
            <button
              v-for="level in [1, 2, 3]"
              :key="level"
              type="button"
              :class="{ on: previewLevel === level }"
              @click="previewLevel = level"
            >
              {{ level }}
            </button>
          </div>
          <el-button text :icon="SwitchButton" @click="ElMessage.info('接入登录后可用')">
            退出
          </el-button>
        </div>
      </header>

      <main class="content">
        <slot />
      </main>
    </div>
  </div>
</template>

<style scoped>
.shell {
  display: grid;
  grid-template-columns: 232px minmax(0, 1fr);
  min-height: 100vh;
  background: var(--app-bg);
}

/* ---------- 侧边栏 ---------- */
.sidebar {
  position: sticky;
  top: 0;
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--app-surface);
  border-right: 1px solid var(--app-border);
}

.brand {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 60px;
  padding: 0 18px;
  border-bottom: 1px solid var(--app-border);
}

.mark {
  width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--el-color-primary);
}

.brand-name {
  font-size: 13.5px;
  font-weight: 500;
  letter-spacing: 0.01em;
}

.menu {
  display: grid;
  gap: 2px;
  padding: 12px 10px;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 14px;
  color: #4b5563;
  transition:
    background 0.15s,
    color 0.15s;
}

.menu-item:hover {
  background: #f4f7fc;
  color: var(--app-text);
}

.menu-item.is-active {
  background: #eef3fe;
  color: var(--el-color-primary);
  font-weight: 500;
}

.side-foot {
  margin-top: auto;
  padding: 14px;
  border-top: 1px solid var(--app-border);
}

.user {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  flex: none;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eef3fe;
  color: var(--el-color-primary);
  font-size: 13px;
  font-weight: 500;
}

.user-meta {
  display: grid;
  min-width: 0;
}

.user-meta b {
  font-size: 13px;
  font-weight: 500;
}

.user-meta span {
  font-size: 11.5px;
  color: #9ca3af;
}

/* ---------- 主区域 ---------- */
.main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  height: 60px;
  padding: 0 24px;
  background: var(--app-surface);
  border-bottom: 1px solid var(--app-border);
}

.crumb {
  font-size: 13px;
  color: #9ca3af;
}

.crumb i {
  margin: 0 6px;
  font-style: normal;
  color: #d1d5db;
}

.crumb b {
  color: var(--app-text);
  font-weight: 500;
}

.tools {
  display: flex;
  align-items: center;
  gap: 10px;
}

.preview-label {
  font-size: 12px;
  color: #9ca3af;
}

.seg {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: #f1f3f7;
  border-radius: 8px;
}

.seg button {
  width: 26px;
  height: 24px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  font-family: inherit;
  font-size: 12px;
  color: #6b7280;
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;
}

.seg button.on {
  background: #ffffff;
  color: var(--el-color-primary);
  font-weight: 500;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.14);
}

.content {
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 24px 28px 40px;
}

@media (max-width: 900px) {
  .shell {
    grid-template-columns: minmax(0, 1fr);
  }

  .sidebar {
    display: none;
  }
}
</style>
