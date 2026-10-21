<script setup>
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { PERM } from '#shared/permissions'

definePageMeta({ layout: 'default' })
useHead({ title: '分类管理 · 商品运营后台' })

const { can, role } = usePermission()

/**
 * 读列表必须用 useRequestFetch：SSR 阶段直接发请求时，裸 $fetch 不带浏览器 cookie，
 * 会被服务端的 category:view 权限挡成 401。
 */
const requestFetch = useRequestFetch()
const { data, pending, error, refresh } = await useAsyncData(
  'categories',
  () => requestFetch('/api/categories'),
)

const categories = computed(() => data.value?.items ?? [])

function errorMessage(err, fallback) {
  return err?.data?.message ?? err?.statusMessage ?? fallback
}

const headerStyle = {
  background: '#fafbfd',
  color: '#6b7280',
  fontWeight: '500',
  fontSize: '13px',
}

/* ---------- 新增 / 编辑弹窗（LazyCategoryEditDialog 异步加载，打开时才下载） ---------- */
const dialogVisible = ref(false)
const editing = ref(null) // null = 新建

function openCreate() {
  editing.value = null
  dialogVisible.value = true
}

function openEdit(row) {
  if (row.system) return
  editing.value = row
  dialogVisible.value = true
}

/* ---------- 删除：有商品也允许，商品会移入「待分类」 ---------- */
async function onDelete(row) {
  if (row.system) return

  const warning = row.productCount > 0
    ? `确定删除分类「${row.name}」吗？
    该分类下有 ${row.productCount} 件商品，删除后这些商品将移入「待分类」。`
    : `确定删除分类「${row.name}」吗？`

  try {
    await ElMessageBox.confirm(
      warning,
      '删除确认',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消',
        confirmButtonClass: 'el-button--danger',
      },
    )
  }
  catch {
    return // 用户取消
  }

  try {
    const res = await $fetch(`/api/categories/${row.id}`, { method: 'DELETE' })
    ElMessage.success(res.moved > 0 ? `已删除，${res.moved} 件商品移入「待分类」` : '已删除')
    await refresh()
  }
  catch (err) {
    ElMessage.error(errorMessage(err, '删除失败，请稍后重试'))
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>分类管理</h1>
        <p>共 {{ categories.length }} 个分类 · 当前身份 {{ role.level }} 级 {{ role.label }}</p>
      </div>
      <el-button v-if="can(PERM.CATEGORY_EDIT)" type="primary" :icon="Plus" @click="openCreate">
        新建分类
      </el-button>
    </div>

    <section v-if="error" class="card error-card">
      <el-alert type="error" :closable="false" show-icon title="分类加载失败"
        :description="errorMessage(error, '请确认登录状态后重试')" />
      <el-button class="retry" @click="refresh()">重新加载</el-button>
    </section>

    <section v-else class="card table-card">
      <el-table v-loading="pending" :data="categories" :header-cell-style="headerStyle" empty-text="还没有分类">
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">
            <span class="cat-name">{{ row.name }}</span>
            <el-tag v-if="row.system" size="small" type="info" effect="plain" class="sys-tag">系统</el-tag>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="240">
          <template #default="{ row }">
            <span class="desc">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="关联商品" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="row.productCount > 0 ? 'primary' : 'info'" size="small" effect="plain">
              {{ row.productCount }} 件
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160" prop="createdAt" />

        <el-table-column v-if="can(PERM.CATEGORY_EDIT)" label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <template v-if="!row.system">
              <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" @click="onDelete(row)">删除</el-button>
            </template>
            <span v-else class="locked">不可操作</span>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <span class="hint">共 {{ categories.length }} 条 · 删除分类后，其下商品会自动移入「待分类」</span>
      </div>
    </section>

    <!-- v-if 才是真按需：关闭时组件整个卸载，chunk 只在首次点开时下载。
         不加 v-if 的话 Nuxt 会把异步 chunk 预加载进路由（实测首访照样拉）。 -->
    <LazyCategoryEditDialog v-if="dialogVisible" v-model="dialogVisible" :editing="editing" @saved="refresh()" />
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

.table-card {
  overflow: hidden;
}

.cat-name {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--app-text);
}

.sys-tag {
  margin-left: 8px;
}

.locked {
  font-size: 12.5px;
  color: #c0c4cc;
}

.error-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
}

.error-card :deep(.el-alert) {
  flex: 1;
}

.retry {
  flex: none;
}

.desc {
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
