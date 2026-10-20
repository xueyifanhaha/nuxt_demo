<script setup>
import { ElMessage } from 'element-plus'
import { CollectionTag, Goods, Lock, SwitchButton, Tickets } from '@element-plus/icons-vue'
import { ADMIN_NAV } from '#shared/permissions'

const { role, can } = usePermission()
const auth = useAuthStore()
const route = useRoute()

const iconMap = {
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

const avatarText = computed(() => (auth.user?.name ?? '?').charAt(0).toUpperCase())

const loggingOut = ref(false)

async function onLogout() {
  loggingOut.value = true
  try {
    await auth.logout()
    ElMessage.success('已退出登录')
    await navigateTo('/login')
  }
  finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="shell">
    <aside class="sidebar">
      <div class="brand">
        <span class="mark">
          
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
            <b>{{ auth.user?.name ?? role.label }}</b>
            <span>{{ role.level }} 级 · {{ role.label }}</span>
          </span>
        </div>
      </div>
    </aside>

    <div class="main">
      <header class="topbar">
        <div class="crumb">后台管理 <i>/</i> <b>{{ currentLabel }}</b></div>

        <div class="tools">
          <span class="whoami">{{ auth.user?.username }}</span>
          <el-button text :icon="SwitchButton" :loading="loggingOut" @click="onLogout">
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

.whoami {
  font-size: 12.5px;
  color: #6b7280;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
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
