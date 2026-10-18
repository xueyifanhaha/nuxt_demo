<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import { PERM } from '#shared/permissions'

definePageMeta({ layout: 'default' })
useHead({ title: '商品管理 · 商品运营后台' })

const { can, role } = usePermission()

interface Category {
  id: number
  name: string
}

interface Product {
  id: number
  name: string
  sku: string
  categoryId: number
  price: number
  stock: number
  status: 'on' | 'off'
  updatedAt: string
  tone: string
}

/* ---------- 静态数据：服务端接口接入后替换 ---------- */
const CATEGORIES: Category[] = [
  { id: 1, name: '手机数码' },
  { id: 2, name: '家用电器' },
  { id: 3, name: '服饰鞋包' },
  { id: 4, name: '食品生鲜' },
]

const PRODUCTS: Product[] = [
  { id: 101, name: 'iPhone 15 Pro 256G', sku: 'SP-1001', categoryId: 1, price: 8999, stock: 42, status: 'on', updatedAt: '2026-10-18 21:35', tone: '#eef3fe' },
  { id: 102, name: '小米 14 Ultra 16G+512G', sku: 'SP-1002', categoryId: 1, price: 6499, stock: 8, status: 'on', updatedAt: '2026-10-18 20:12', tone: '#eef3fe' },
  { id: 103, name: 'AirPods Pro 2 无线耳机', sku: 'SP-1003', categoryId: 1, price: 1899, stock: 120, status: 'on', updatedAt: '2026-10-17 18:40', tone: '#eef3fe' },
  { id: 104, name: '索尼 WH-1000XM5 头戴耳机', sku: 'SP-1004', categoryId: 1, price: 2699, stock: 15, status: 'off', updatedAt: '2026-10-17 11:08', tone: '#eef3fe' },
  { id: 105, name: '戴森 V12 无线吸尘器', sku: 'SP-1005', categoryId: 2, price: 3699, stock: 26, status: 'on', updatedAt: '2026-10-16 15:22', tone: '#f1f0fe' },
  { id: 106, name: '美的 变频空调 1.5 匹', sku: 'SP-1006', categoryId: 2, price: 2899, stock: 5, status: 'on', updatedAt: '2026-10-16 09:50', tone: '#f1f0fe' },
  { id: 107, name: '九阳 破壁料理机', sku: 'SP-1007', categoryId: 2, price: 899, stock: 64, status: 'off', updatedAt: '2026-10-15 16:31', tone: '#f1f0fe' },
  { id: 108, name: '优衣库 轻型羽绒服', sku: 'SP-1008', categoryId: 3, price: 599, stock: 210, status: 'on', updatedAt: '2026-10-15 10:04', tone: '#eaf6f0' },
  { id: 109, name: 'Nike Air Zoom 跑鞋', sku: 'SP-1009', categoryId: 3, price: 1099, stock: 33, status: 'on', updatedAt: '2026-10-14 19:26', tone: '#eaf6f0' },
  { id: 110, name: '新秀丽 商务双肩包', sku: 'SP-1010', categoryId: 3, price: 799, stock: 0, status: 'off', updatedAt: '2026-10-14 14:19', tone: '#eaf6f0' },
  { id: 111, name: '三只松鼠 坚果礼盒', sku: 'SP-1011', categoryId: 4, price: 129, stock: 480, status: 'on', updatedAt: '2026-10-13 20:45', tone: '#fdf3e7' },
  { id: 112, name: '阳澄湖 大闸蟹 4 对装', sku: 'SP-1012', categoryId: 4, price: 399, stock: 12, status: 'on', updatedAt: '2026-10-13 09:12', tone: '#fdf3e7' },
]

/* ---------- 筛选与分页（暂时在本地算，接接口后改成 query 参数） ---------- */
const filters = reactive<{
  categoryId?: number
  status?: 'on' | 'off'
  q: string
}>({
  categoryId: undefined,
  status: undefined,
  q: '',
})

const page = ref(1)
const pageSize = ref(8)

const filtered = computed(() => {
  const keyword = filters.q.trim().toLowerCase()
  return PRODUCTS.filter((item) => {
    if (filters.categoryId && item.categoryId !== filters.categoryId) return false
    if (filters.status && item.status !== filters.status) return false
    if (keyword && !`${item.name} ${item.sku}`.toLowerCase().includes(keyword)) return false
    return true
  })
})

const paged = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})

watch(
  [() => filters.categoryId, () => filters.status, () => filters.q],
  () => {
    page.value = 1
  },
)

watch(pageSize, () => {
  page.value = 1
})

function resetFilters() {
  filters.categoryId = undefined
  filters.status = undefined
  filters.q = ''
  page.value = 1
}

/* ---------- 展示辅助 ---------- */
const headerStyle = {
  background: '#fafbfd',
  color: '#6b7280',
  fontWeight: '500',
  fontSize: '13px',
}

function categoryName(id: number) {
  return CATEGORIES.find(item => item.id === id)?.name ?? '—'
}

function money(value: number) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function onCreate() {
  ElMessage.info('新建商品：详情页画完后接上')
}

function onEdit(row: Product) {
  ElMessage.info(`编辑「${row.name}」：详情页下一步做`)
}

function onToggleStatus(row: Product) {
  ElMessage.info(`${row.status === 'on' ? '下架' : '上架'}「${row.name}」：接口下一步接`)
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>商品管理</h1>
        <p>
          共 {{ filtered.length }} 件商品 · 当前身份 {{ role.level }} 级 {{ role.label }}
        </p>
      </div>
      <el-button v-if="can(PERM.PRODUCT_EDIT)" type="primary" :icon="Plus" @click="onCreate">
        新建商品
      </el-button>
    </div>

    <section class="card filter">
      <el-select v-model="filters.categoryId" placeholder="全部分类" clearable class="w-150">
        <el-option v-for="item in CATEGORIES" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>

      <el-select v-model="filters.status" placeholder="全部状态" clearable class="w-130">
        <el-option label="已上架" value="on" />
        <el-option label="已下架" value="off" />
      </el-select>

      <el-input
        v-model="filters.q"
        placeholder="搜索商品名称或 SKU"
        :prefix-icon="Search"
        clearable
        class="grow"
      />

      <el-button :icon="Refresh" @click="resetFilters">重置</el-button>
    </section>

    <section class="card table-card">
      <el-table :data="paged" :header-cell-style="headerStyle" empty-text="没有匹配的商品">
        <el-table-column label="商品" min-width="280">
          <template #default="{ row }">
            <div class="cell-product">
              <span class="thumb" :style="{ background: row.tone }">{{ row.name.slice(0, 1) }}</span>
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

        <el-table-column label="状态" width="96">
          <template #default="{ row }">
            <el-tag :type="row.status === 'on' ? 'success' : 'info'" size="small" effect="light">
              {{ row.status === 'on' ? '已上架' : '已下架' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="更新时间" width="150" prop="updatedAt" />

        <el-table-column
          v-if="can(PERM.PRODUCT_EDIT) || can(PERM.PRODUCT_STATUS)"
          label="操作"
          width="140"
          fixed="right"
        >
          <template #default="{ row }">
            <el-button v-if="can(PERM.PRODUCT_EDIT)" link type="primary" @click="onEdit(row)">
              编辑
            </el-button>
            <el-button
              v-if="can(PERM.PRODUCT_STATUS)"
              link
              :type="row.status === 'on' ? 'warning' : 'success'"
              @click="onToggleStatus(row)"
            >
              {{ row.status === 'on' ? '下架' : '上架' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <span class="hint">共 {{ filtered.length }} 条</span>
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="filtered.length"
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

.filter {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 14px;
  margin-bottom: 14px;
}

.w-150 {
  width: 150px;
}

.w-130 {
  width: 130px;
}

.grow {
  flex: 1;
  min-width: 200px;
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
