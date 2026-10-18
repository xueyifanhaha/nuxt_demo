<script setup lang="ts">
import { Refresh, Search } from '@element-plus/icons-vue'
import type { LogEntry } from '#shared/types'
import { MOCK_LOGS } from '~/utils/mock'

definePageMeta({ layout: 'default' })
useHead({ title: '操作日志 · 商品运营后台' })

/* ---------- 静态数据：服务端接口接入后替换（GET /api/logs） ---------- */
const logs = ref<LogEntry[]>([...MOCK_LOGS])

/** 动作类型 → 展示文案与标签色（接口阶段可与服务端共用一份枚举） */
const ACTION_META: Record<string, { label: string; tag: 'primary' | 'success' | 'warning' | 'danger' | 'info' }> = {
  login: { label: '登录', tag: 'info' },
  'product:update': { label: '编辑商品', tag: 'primary' },
  'product:status': { label: '上下架', tag: 'warning' },
  'product:delete': { label: '删除商品', tag: 'danger' },
  'category:create': { label: '新建分类', tag: 'success' },
  'category:update': { label: '编辑分类', tag: 'primary' },
  'category:delete': { label: '删除分类', tag: 'danger' },
  'role:update': { label: '权限变更', tag: 'danger' },
}

const ACTION_OPTIONS = Object.entries(ACTION_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

function actionMeta(action: string) {
  return ACTION_META[action] ?? { label: action, tag: 'info' as const }
}

/* ---------- 筛选与分页（本地算，接接口后换成 query 参数） ---------- */
const filters = reactive<{ action?: string; q: string }>({ action: undefined, q: '' })
const draftQ = ref('')
const page = ref(1)
const pageSize = ref(8)

const filtered = computed(() => {
  const keyword = filters.q.trim().toLowerCase()
  return logs.value.filter((item) => {
    if (filters.action && item.action !== filters.action) return false
    if (keyword && !`${item.actorName} ${item.targetName} ${item.detail}`.toLowerCase().includes(keyword))
      return false
    return true
  })
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch(
  [() => filters.action, () => filters.q],
  () => {
    page.value = 1
  },
)

watch(pageSize, () => {
  page.value = 1
})

function applySearch() {
  filters.q = draftQ.value.trim()
  page.value = 1
}

function resetFilters() {
  filters.action = undefined
  filters.q = ''
  draftQ.value = ''
  page.value = 1
}

/* ---------- 展示辅助 ---------- */
const headerStyle = {
  background: '#fafbfd',
  color: '#6b7280',
  fontWeight: '500',
  fontSize: '13px',
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>操作日志</h1>
        <p>共 {{ filtered.length }} 条记录 · 记录所有写操作，不可修改和删除</p>
      </div>
    </div>

    <section class="card filter">
      <div class="filter-left">
        <el-select v-model="filters.action" placeholder="全部动作" clearable class="w-150">
          <el-option v-for="item in ACTION_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>

        <el-input
          v-model="draftQ"
          placeholder="搜索操作人 / 对象 / 详情"
          :prefix-icon="Search"
          clearable
          class="w-220"
          @keyup.enter="applySearch"
          @clear="applySearch"
        />
      </div>

      <div class="filter-right">
        <el-button type="primary" :icon="Search" @click="applySearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
    </section>

    <section class="card table-card">
      <el-table :data="paged" :header-cell-style="headerStyle" empty-text="没有匹配的日志">
        <el-table-column label="时间" width="150" prop="at" />

        <el-table-column label="操作人" width="170">
          <template #default="{ row }">
            <div class="actor">
              <span class="avatar">{{ row.actorName.slice(0, 1).toUpperCase() }}</span>
              <span class="actor-meta">
                <b>{{ row.actorName }}</b>
                <span>{{ row.actorRole }}</span>
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="动作" width="110">
          <template #default="{ row }">
            <el-tag :type="actionMeta(row.action).tag" size="small" effect="light">
              {{ actionMeta(row.action).label }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="对象" min-width="180">
          <template #default="{ row }">
            <span class="target">
              <el-tag type="info" size="small" effect="plain">{{ row.targetType }}</el-tag>
              <b>{{ row.targetName }}</b>
            </span>
          </template>
        </el-table-column>

        <el-table-column label="详情" min-width="200" prop="detail">
          <template #default="{ row }">
            <span class="detail">{{ row.detail }}</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <span class="hint">共 {{ filtered.length }} 条</span>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
          :page-sizes="[8, 15, 30]"
          layout="sizes, prev, pager, next"
          background
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-head h1 {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.page-head p {
  margin-top: 6px;
  font-size: 13px;
  color: var(--app-muted);
}

.card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 14px;
  margin-bottom: 14px;
}

.filter-left,
.filter-right {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
}

.w-150 {
  width: 150px;
}

.w-220 {
  width: 220px;
}

.table-card {
  overflow: hidden;
}

.actor {
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
  background: #eef2ff;
  color: #4f46e5;
  font-size: 13px;
  font-weight: 600;
}

.actor-meta {
  display: grid;
}

.actor-meta b {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
}

.actor-meta span {
  font-size: 11.5px;
  color: #9ca3af;
}

.target {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.target b {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
}

.detail {
  font-size: 13px;
  color: #6b7280;
}

.table-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 16px;
  border-top: 1px solid var(--app-border);
}

.hint {
  font-size: 12.5px;
  color: #9ca3af;
}

:deep(.el-table) {
  --el-table-border-color: var(--app-border);
  --el-table-text-color: #374151;
  font-size: 13.5px;
}

:deep(.el-table th.el-table__cell) {
  font-weight: 500;
}
</style>
