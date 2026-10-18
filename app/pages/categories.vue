<script setup lang="ts">
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh } from '@element-plus/icons-vue'
import { PERM } from '#shared/permissions'
import type { Category } from '#shared/types'
import { SEED_CATEGORIES, SEED_PRODUCTS } from '#shared/seed'

definePageMeta({ layout: 'default' })
useHead({ title: '分类管理 · 商品运营后台' })

const { can, role } = usePermission()

/* ---------- 静态数据：服务端接口接入后替换 ---------- */
let nextId = Math.max(...SEED_CATEGORIES.map(item => item.id)) + 1
const categories = ref<Category[]>([...SEED_CATEGORIES])

/** 关联商品数：接接口后由服务端返回，删除校验也由服务端兜底 */
function productCount(id: number) {
  return SEED_PRODUCTS.filter(item => item.categoryId === id).length
}

const headerStyle = {
  background: '#fafbfd',
  color: '#6b7280',
  fontWeight: '500',
  fontSize: '13px',
}

/* ---------- 新增 / 编辑弹窗 ---------- */
const dialogVisible = ref(false)
const editing = ref<Category | null>(null) // null = 新建
const submitting = ref(false)

const formRef = ref()
const form = reactive({ name: '', description: '' })
const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度 2 - 20 个字符', trigger: 'blur' },
  ],
  description: [{ max: 100, message: '不超过 100 个字符', trigger: 'blur' }],
}

function openCreate() {
  editing.value = null
  form.name = ''
  form.description = ''
  dialogVisible.value = true
}

function openEdit(row: Category) {
  editing.value = row
  form.name = row.name
  form.description = row.description ?? ''
  dialogVisible.value = true
}

function onSubmit() {
  formRef.value?.validate((valid: boolean) => {
    if (!valid) return
    submitting.value = true
    // 假提交：接口阶段换成 POST /api/categories 或 PUT /api/categories/:id
    setTimeout(() => {
      if (editing.value) {
        editing.value.name = form.name
        editing.value.description = form.description
        ElMessage.success(`已保存分类「${form.name}」`)
      }
      else {
        categories.value.push({
          id: nextId++,
          name: form.name,
          description: form.description,
          createdAt: new Date().toLocaleString('zh-CN', { hour12: false }).slice(0, 16),
        })
        ElMessage.success(`已创建分类「${form.name}」`)
      }
      submitting.value = false
      dialogVisible.value = false
    }, 300)
  })
}

/* ---------- 删除（有商品在用时禁止，模拟服务端约束） ---------- */
function onDelete(row: Category) {
  const count = productCount(row.id)
  if (count > 0) {
    ElMessage.warning(`「${row.name}」下还有 ${count} 件商品，请先移走商品再删除`)
    return
  }
  ElMessageBox.confirm(`确定删除分类「${row.name}」吗？删除后不可恢复。`, '删除确认', {
    type: 'warning',
    confirmButtonText: '删除',
    cancelButtonText: '取消',
    confirmButtonClass: 'el-button--danger',
  })
    .then(() => {
      categories.value = categories.value.filter(item => item.id !== row.id)
      ElMessage.success(`已删除分类「${row.name}」`)
    })
    .catch(() => {})
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

    <section class="card table-card">
      <el-table :data="categories" :header-cell-style="headerStyle" empty-text="还没有分类">
        <el-table-column label="分类名称" min-width="180">
          <template #default="{ row }">
            <span class="cat-name">{{ row.name }}</span>
          </template>
        </el-table-column>

        <el-table-column label="描述" min-width="240">
          <template #default="{ row }">
            <span class="desc">{{ row.description || '—' }}</span>
          </template>
        </el-table-column>

        <el-table-column label="关联商品" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="productCount(row.id) > 0 ? 'primary' : 'info'" size="small" effect="plain">
              {{ productCount(row.id) }} 件
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="创建时间" width="160" prop="createdAt" />

        <el-table-column v-if="can(PERM.CATEGORY_EDIT)" label="操作" width="130" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button link type="danger" @click="onDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="table-foot">
        <span class="hint">共 {{ categories.length }} 条 · 有商品在用的分类不可删除</span>
        <el-button :icon="Refresh" size="small" text bg @click="categories = [...SEED_CATEGORIES]">
          重置演示数据
        </el-button>
      </div>
    </section>

    <el-dialog
      v-model="dialogVisible"
      :title="editing ? `编辑分类 · ${editing.name}` : '新建分类'"
      width="440px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
        <el-form-item label="分类名称" prop="name">
          <el-input v-model="form.name" placeholder="如：手机数码" maxlength="20" show-word-limit />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="选填，简单说明这个分类放什么"
            maxlength="100"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
      </template>
    </el-dialog>
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
