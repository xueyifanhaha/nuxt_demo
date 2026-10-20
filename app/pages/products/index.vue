<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { PERM } from '#shared/permissions'

definePageMeta({ layout: 'default' })
useHead({ title: '商品管理 · 商品运营后台' })

const { can, role } = usePermission()

/* 分类读服务端：新增的分类立刻能在这里筛到 */
const requestFetch = useRequestFetch()
const { data: categoryData } = await useAsyncData(
  'categories-for-products',
  () => requestFetch('/api/categories'),
)
const CATEGORIES = computed(() => categoryData.value?.items ?? [])

/* ---------- 筛选条件与分页 ---------- */

/** 三个筛选条件放在一起，空值表示不筛 */
const filters = reactive({
  categoryId: undefined,
  status: undefined,
  keyword: '',
})

/** 分页状态放在一起：页码 + 每页条数 */
const pager = reactive({
  page: 1,
  pageSize: 8,
})

/**
 * 查询条件：分页与筛选合并成一个普通对象。
 * - `...pager` 展开 page / pageSize，`...rest` 展开 categoryId / status；
 * - 空值统一取 undefined，序列化时会被直接丢掉（不会出现 `q=`、`categoryId=undefined`）；
 * - 接口参数名是 q，前端字段叫 keyword，这里做一次映射。
 */
const query = computed(() => {
  const { keyword, ...rest } = filters
  return {
    ...pager,
    ...rest,
    q: keyword.trim() || undefined,
  }
})

/**
 * key 固定为 'products'：条件变化不再靠换 key 触发，而是 watch 上面那个 query。
 * 两者效果一样（都会重新取数，且默认 dedupe: 'cancel' 会中断上一笔），
 * 但 key 固定后 payload 稳定、意图更直白。
 */
const { data: productData, pending, error, refresh } = await useAsyncData(
  'products',
  () => requestFetch('/api/products', { query: query.value }),
  { watch: [query] },
)

const items = computed(() => productData.value?.items ?? [])
const total = computed(() => productData.value?.total ?? 0)

/**
 * 上下架成功后的乐观更新：同时改两个地方。
 * - `productData.value`（shallowRef）→ 表格那一行立刻变
 * - `nuxtApp.payload.data.products` → payload 也变，否则后续 refresh 会拿旧 payload 覆盖回来
 *   （in-flight 之后的刷新会命中 payload 缓存，这也是本项目「开关弹回原状」的真正原因）
 */
function patchItem(next) {
  if (!productData.value) return

  const patched = {
    ...productData.value,
    items: productData.value.items.map(item => (item.id === next.id ? next : item)),
  }
  productData.value = patched

  const payload = useNuxtApp().payload
  if (payload?.data?.products) payload.data.products = patched
}

/**
 * 首屏取数失败时的提示。这里的 error 是 useAsyncData 的 NuxtError（不是 useApi 抛的），
 * 形状一样是 body 挂在 data 上，所以沿用同一套兜底顺序。
 */
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

function resetFilters() {
  filters.categoryId = undefined
  filters.status = undefined
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

function categoryName(id) {
  return CATEGORIES.value.find(item => item.id === id)?.name ?? '—'
}

function money(value) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/**
 * 新建走同一个详情页组件，路由是 /products/new（命中 [id].vue，id 为字符串 'new'）。
 * 不另开 new.vue：表单、校验、布局、分类下拉全都一样，复制一份只会两边不同步。
 */
function onCreate() {
  navigateTo('/products/new')
}

function onEdit(row) {
  navigateTo(`/products/${row.id}`)
}

/* ---------- 上下架：列表内直接切换（权限 product:status） ---------- */
const switchingId = ref(null)

/**
 * 事件回调一律跑在浏览器，所以直接 useApi()（内部用 $fetch，同源请求自带 cookie）。
 * 页面首屏那次取数仍走上面的 useAsyncData + useRequestFetch —— 那条链路可能跑在服务端。
 */
const api = useApi()

async function onToggleStatus(row, value) {
  switchingId.value = row.id
  try {
    const { item } = await api.products.updateStatus(row.id, value)

    if (filters.status) {
      // 有状态筛选时，改完状态的这一行已经不属于当前结果集（total 也变了），只能重新取数
      await refresh()
      if (items.value.length === 0 && pager.page > 1) pager.page -= 1
    }
    else {
      patchItem(item)
    }

    ElMessage.success(`「${item.name}」已${value === 'on' ? '上架' : '下架'}`)
    return true
  }
  catch (err) {
    // bizMessage 由 useApi 统一收敛（服务端中文文案 → 兜底文案），页面只负责展示
    ElMessage.error(err.bizMessage)
    return false
  }
  finally {
    switchingId.value = null
  }
}

/**
 * el-switch 的 before-change 只负责「这次改动要不要放行」，不负责选值：
 * 成功返回 true → 组件把 modelValue 改到新值；返回 false → 开关弹回原状。
 *
 * 注意 before-change 拿不到目标值（Element Plus 只传个空参），所以这里自己算：
 * 当前是 'on' 就切成 'off'，反之亦然。
 */
function beforeToggleStatus(row) {
  return onToggleStatus(row, row.status === 'on' ? 'off' : 'on')
}

async function onDelete(row) {
  try {
    await ElMessageBox.confirm(`确定删除商品「${row.name}」吗？删除后不可恢复。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  }
  catch {
    return // 用户取消
  }

  try {
    await api.products.remove(row.id)
    ElMessage.success(`已删除「${row.name}」`)
    // 删掉当前页最后一条时回退一页，否则停在空页上
    if (items.value.length === 1 && pager.page > 1) pager.page -= 1
    else await refresh()
  }
  catch (err) {
    ElMessage.error(err.bizMessage)
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>商品管理</h1>
        <p>
          共 {{ total }} 件商品 · 当前身份 {{ role.level }} 级 {{ role.label }}
        </p>
      </div>
      <el-button v-if="can(PERM.PRODUCT_EDIT)" type="primary" :icon="Plus" @click="onCreate">
        新建商品
      </el-button>
    </div>

    <section class="card filter">
      <div class="filter-left">
        <el-select
          v-model="filters.categoryId"
          placeholder="全部分类"
          clearable
          class="w-150"
        >
          <el-option v-for="item in CATEGORIES" :key="item.id" :label="item.name" :value="item.id" />
        </el-select>

        <el-select
          v-model="filters.status"
          placeholder="全部状态"
          clearable
          class="w-130"
        >
          <el-option label="已上架" value="on" />
          <el-option label="已下架" value="off" />
        </el-select>

        <el-input
          v-model="filters.keyword"
          placeholder="搜索名称或 SKU"
          :prefix-icon="Search"
          clearable
          class="w-200"
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
        title="商品加载失败"
        :description="loadErrorText"
      />
      <el-button class="retry" size="small" @click="refresh()">重新加载</el-button>
    </section>

    <section v-else class="card table-card">
      <el-table
        v-loading="pending"
        :data="items"
        :header-cell-style="headerStyle"
        empty-text="没有匹配的商品"
      >
        <el-table-column label="商品" min-width="280">
          <template #default="{ row }">
            <div class="cell-product">
              <span class="meta">
                <b>{{ row.name }}</b>
                <span>{{ row.sku }}</span>
              </span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="分类" width="110">
          <template #default="{ row }">
            <el-tag type="info" effect="plain" size="small">{{ categoryName(row.categoryId) }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="单价" width="120" align="right">
          <template #default="{ row }">¥{{ money(row.price) }}</template>
        </el-table-column>

        <el-table-column label="库存" width="100" align="right">
          <template #default="{ row }">
            <span :class="['stock', { low: row.stock < 20 }]">{{ row.stock }}</span>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="110">
          <template #default="{ row }">
            <!-- 有 product:status 权限：列表内直接切换；否则只读标签 -->
            <el-switch
              v-if="can(PERM.PRODUCT_STATUS)"
              :model-value="row.status"
              active-value="on"
              inactive-value="off"
              inline-prompt
              active-text="上架"
              inactive-text="下架"
              class="status-switch"
              :loading="switchingId === row.id"
              :before-change="() => beforeToggleStatus(row)"
            />
            <el-tag v-else :type="row.status === 'on' ? 'success' : 'info'" size="small" effect="light">
              {{ row.status === 'on' ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="150" prop="updatedAt" />

        <el-table-column
          v-if="can(PERM.PRODUCT_EDIT)"
          label="操作"
          width="130"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button link type="primary" @click="onEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <span class="hint">共 {{ total }} 条</span>
        <el-pagination
          v-model:current-page="pager.page"
          v-model:page-size="pager.pageSize"
          :total="total"
          :page-sizes="[5, 8, 12]"
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

.error-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px;
}

.retry {
  flex-shrink: 0;
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

.w-130 {
  width: 130px;
}

.w-200 {
  width: 200px;
}

.status-switch.el-switch {
  width: 58px;
}

.table-card {
  overflow: hidden;
}

.cell-product {
  display: flex;
  align-items: center;
  gap: 10px;
}

.thumb {
  flex: none;
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #475569;
}

.meta {
  display: grid;
  min-width: 0;
}

.meta b {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--app-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.meta span {
  font-size: 11.5px;
  color: #9ca3af;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.stock {
  font-variant-numeric: tabular-nums;
}

.stock.low {
  color: #dc2626;
  font-weight: 500;
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
