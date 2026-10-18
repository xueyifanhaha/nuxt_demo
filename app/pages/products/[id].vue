<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { PERM } from '#shared/permissions'
import type { ProductStatus } from '#shared/types'
import { MOCK_CATEGORIES, MOCK_PRODUCTS } from '~/utils/mock'

definePageMeta({ layout: 'default' })
useHead({ title: '商品编辑 · 商品运营后台' })

const route = useRoute()
const id = route.params.id as string

/* 静态阶段从 mock 数据里找；接接口后换成 GET /api/products/:id */
const product = MOCK_PRODUCTS.find(item => String(item.id) === id)

// 找不到直接抛给 error.vue，顺便演示 404 链路
if (!product) {
  throw createError({ statusCode: 404, statusMessage: '商品不存在', fatal: true })
}

const { can } = usePermission()
/** 此页进入条件就是 product:edit；接入路由守卫后，无权限会在中间件层直接 403 */
const canEdit = computed(() => can(PERM.PRODUCT_EDIT))

const formRef = ref<FormInstance>()
const saving = ref(false)

const form = reactive({
  name: product.name,
  categoryId: product.categoryId,
  price: product.price,
  stock: product.stock,
  status: product.status as ProductStatus,
  description: product.description,
})

const rules: FormRules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 40, message: '长度在 2 到 40 个字符', trigger: 'blur' },
  ],
  categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  price: [{ required: true, message: '请填写单价', trigger: 'blur' }],
  stock: [{ required: true, message: '请填写库存', trigger: 'blur' }],
}

/* ---------- 保存 / 重置 ---------- */
async function save() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  // 静态页面：接口接入后替换为 PUT /api/products/:id
  setTimeout(() => {
    saving.value = false
    ElMessage.success('校验通过，保存接口下一步接入')
  }, 400)
}

function resetForm() {
  form.name = product!.name
  form.categoryId = product!.categoryId
  form.price = product!.price
  form.stock = product!.stock
  form.status = product!.status
  form.description = product!.description
  formRef.value?.clearValidate()
}

const categoryName = computed(
  () => MOCK_CATEGORIES.find(item => item.id === form.categoryId)?.name ?? '—',
)
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div class="head-left">
        <NuxtLink to="/products" class="back">
          <el-icon :size="14"><ArrowLeft /></el-icon>
          返回列表
        </NuxtLink>
        <h1>{{ form.name || '商品编辑' }}</h1>
        <p class="head-meta">
          <span>{{ product!.sku }}</span>
          <i>/</i>
          <span>{{ categoryName }}</span>
          <i>/</i>
          <el-tag :type="form.status === 'on' ? 'success' : 'info'" size="small" effect="light">
            {{ form.status === 'on' ? '已上架' : '已下架' }}
          </el-tag>
        </p>
      </div>

      <div v-if="canEdit" class="head-actions">
        <el-button @click="resetForm">重置</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存修改</el-button>
      </div>
    </div>

    <el-alert
      v-if="!canEdit"
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="当前预览角色没有编辑权限"
      description="商品编辑页需要 product:edit 权限。接入路由守卫后，无权限角色访问此页将被直接拦截到 403，表单整体只读只是静态阶段的兜底展示。"
    />

    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      :disabled="!canEdit"
      label-position="top"
      class="form"
      @submit.prevent="save"
    >
      <div class="layout">
        <div class="col">
          <section class="card">
            <h2>基本信息</h2>
            <el-form-item label="商品名称" prop="name">
              <el-input v-model="form.name" placeholder="请输入商品名称" maxlength="40" show-word-limit />
            </el-form-item>
            <el-form-item label="商品分类" prop="categoryId">
              <el-select v-model="form.categoryId" placeholder="请选择分类" class="w-full">
                <el-option
                  v-for="item in MOCK_CATEGORIES"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
            </el-form-item>
          </section>

          <section class="card">
            <h2>商品描述</h2>
            <el-form-item prop="description">
              <el-input
                v-model="form.description"
                type="textarea"
                :rows="6"
                maxlength="500"
                show-word-limit
                placeholder="商品卖点、规格参数、售后说明等（接口阶段可升级为富文本编辑器）"
              />
            </el-form-item>
          </section>
        </div>

        <div class="col side">
          <section class="card">
            <h2>价格与库存</h2>
            <el-form-item label="单价（元）" prop="price">
              <el-input-number
                v-model="form.price"
                :min="0"
                :max="9999999"
                :precision="2"
                :step="1"
                class="w-full"
                controls-position="right"
              />
            </el-form-item>
            <el-form-item label="库存（件）" prop="stock">
              <el-input-number
                v-model="form.stock"
                :min="0"
                :max="999999"
                :precision="0"
                :step="1"
                class="w-full"
                controls-position="right"
              />
            </el-form-item>
            <p class="hint" :class="{ warn: form.stock < 20 }">
              {{ form.stock < 20 ? '库存低于 20，列表页会标红提醒' : '库存充足' }}
            </p>
          </section>

          <section class="card">
            <h2>其他信息</h2>
            <div class="meta-row">
              <span>SKU</span>
              <b>{{ product!.sku }}</b>
            </div>
            <div class="meta-row">
              <span>创建时间</span>
              <b>{{ product!.createdAt }}</b>
            </div>
            <div class="meta-row">
              <span>最近更新</span>
              <b>{{ product!.updatedAt }}</b>
            </div>
            <div class="meta-row">
              <span>最近操作人</span>
              <b>{{ product!.updatedBy }}</b>
            </div>
          </section>
        </div>
      </div>
    </el-form>
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

.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  color: #9ca3af;
  transition: color 0.15s;
}

.back:hover {
  color: var(--el-color-primary);
}

.page-head h1 {
  margin-top: 6px;
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.head-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 6px;
  font-size: 12.5px;
  color: var(--app-muted);
}

.head-meta i {
  font-style: normal;
  color: #d1d5db;
}

.head-actions {
  display: flex;
  gap: 10px;
}

.notice {
  margin-bottom: 14px;
}

.form :deep(.el-form-item) {
  margin-bottom: 16px;
}

.layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: 14px;
  align-items: start;
}

.col {
  display: grid;
  gap: 14px;
  min-width: 0;
}

.card {
  padding: 18px 20px 20px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.card h2 {
  margin-bottom: 14px;
  font-size: 14px;
  font-weight: 500;
  color: #374151;
}

.hint {
  margin: 2px 0 12px;
  font-size: 12.5px;
  color: #9ca3af;
}

.hint.warn {
  color: #dc2626;
}

.w-full {
  width: 100%;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  font-size: 13px;
  border-bottom: 1px dashed var(--app-border);
}

.meta-row:last-child {
  border-bottom: 0;
}

.meta-row span {
  color: var(--app-muted);
}

.meta-row b {
  font-weight: 500;
  color: var(--app-text);
  font-variant-numeric: tabular-nums;
}

@media (max-width: 1100px) {
  .layout {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
