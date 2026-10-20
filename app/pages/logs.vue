<script setup>
import { Refresh, Search } from '@element-plus/icons-vue'

definePageMeta({ layout: 'default' })
useHead({ title: '操作日志 · 商品运营后台' })

/* ---------- 取数：日志是只读数据，没有任何写操作 ---------- */

/**
 * setup 顶层会发生 SSR，服务端没有浏览器的 cookie，
 * 所以这里必须用 useRequestFetch() 建 api（浏览器端它等价于 $fetch）。
 */
const api = useApi(useRequestFetch())

/** 动作类型 → 展示文案与标签色（和服务端写日志用的 action 字符串一一对应） */
const ACTION_META = {
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

function actionMeta(action) {
  return ACTION_META[action] ?? { label: action, tag: 'info' }
}

/** 筛选条件：空值表示不筛 */
const filters = reactive({
  action: undefined,
  keyword: '',
})

/** 分页状态：页码 + 每页条数 */
const pager = reactive({
  page: 1,
  pageSize: 8,
})

/**
 * 查询条件：分页与筛选合并成一个普通对象。
 * 空字符串统一转 undefined，序列化时直接丢掉；接口参数名是 q，前端字段叫 keyword。
 */
const query = computed(() => ({
  ...pager,
  action: filters.action || undefined,
  q: filters.keyword.trim() || undefined,
}))

/**
 * key 固定为 'logs'，靠 watch query 触发重新取数。
 * 日志是只读的，所以不需要 patchItem / refresh 这类回写逻辑，
 * 唯一要处理的是「删到空页」之外的页码边界 —— 日志只会增加，翻页时不会变少。
 */
const { data: logData, pending, error, refresh } = await useAsyncData(
  'logs',
  () => api.logs.list(query.value),
  { watch: [query] },
)

const items = computed(() => logData.value?.items ?? [])
const total = computed(() => logData.value?.total ?? 0)

/** 首屏取数失败（如权限不足）：useAsyncData 的 error 形状与 FetchError 一致，沿用同一套兜底 */
const loadErrorText = computed(() =>
  error.value?.data?.data?.message
  ?? error.value?.data?.message
  ?? error.value?.statusMessage
  ?? '请确认登录状态后重试',
)

/** 条件一变就回第一页，否则会停在新结果里不存在的页码上 */
function applySearch() {
  pager.page = 1
}

/**
 * 改每页条数时也要回第一页：
 * 停在第 3 页、把条数从 8 改成 30，页码早已越界，表格会直接空掉。
 * （筛选条件的复位由 query 变化本身驱动，这里只需管 pageSize。）
 */
watch(() => pager.pageSize, () => {
  pager.page = 1
})

function resetFilters() {
  filters.action = undefined
  filters.keyword = ''
  pager.page = 1
  pager.pageSize = 8
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
        <p>共 {{ total }} 条记录 · 记录所有写操作，不可修改和删除</p>
      </div>
    </div>

    <section class="card filter">
      <div class="filter-left">
        <el-select v-model="filters.action" placeholder="全部动作" clearable class="w-150">
          <el-option v-for="item in ACTION_OPTIONS" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索操作人 / 对象 / 详情"
          :prefix-icon="Search"
          clearable
          class="w-220"
          @keyup.enter="applySearch"
        />
      </div>

      <div class="filter-right">
        <el-button type="primary" :icon="Search" @click="applySearch">搜索</el-button>
        <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
      </div>
    </section>

    <section v-if="error" class="card error-card">
      <el-alert
        type="error"
        :closable="false"
        show-icon
        title="日志加载失败"
        :description="loadErrorText"
      />
      <el-button class="retry" size="small" @click="refresh()">重新加载</el-button>
    </section>

    <section v-else class="card table-card">
      <el-table
        v-loading="pending"
        :data="items"
        :header-cell-style="headerStyle"
        empty-text="没有匹配的日志"
      >
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
        <span class="hint">共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="pager.page"
          v-model:page-size="pager.pageSize"
          :total="total"
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

.error-card {
  padding: 16px;
}

.retry {
  margin-top: 12px;
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
