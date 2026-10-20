<script setup>
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import { PERM } from '#shared/permissions'

definePageMeta({ layout: 'default' })

const route = useRoute()
const router = useRouter()
const { can } = usePermission()

/**
 * 新建与编辑共用这一个页面：/products/new 命中 [id].vue，id 是字符串 'new'。
 * 真正的商品 id 永远是数字，所以 'new' 不会和任何商品撞车。
 */
const isNew = computed(() => route.params.id === 'new')

useHead({
  title: computed(() => `${isNew.value ? '新建商品' : '商品编辑'} · 商品运营后台`),
})

/**
 * 详情页可能跑在 SSR（首屏直出），所以 api 必须用 useRequestFetch 建：
 * 服务端没有浏览器的 cookie，靠它把当前请求的 Cookie 转发过去。
 */
const api = useApi(useRequestFetch())

/* ---------- 分类下拉 ---------- */
const { data: categoryData } = await useAsyncData(
  'categories-for-product-edit',
  () => api.categories.list(),
)
const categories = computed(() => categoryData.value?.items ?? [])

/* ---------- 商品详情 ---------- */
const productKey = computed(() => `product-${route.params.id}`)

const { data: productData, error: loadError } = await useAsyncData(
  productKey,
  () => (isNew.value ? { item: null } : api.products.detail(route.params.id)),
)

/**
 * useAsyncData 把 4xx 收进 error 而不抛。这里手动转成页面级错误交给 error.vue。
 *
 * 用 import.meta.server 守卫：这段代码 SSR 和客户端 hydration 各执行一次，
 * 不守卫的话会抛两次（客户端那次还会刷一条控制台错误）。
 * 只让服务端那次抛，客户端直接复用 SSR 出来的错误页。
 */
if (import.meta.server && loadError.value) {
  throw createError({
    statusCode: loadError.value.statusCode ?? 500,
    statusMessage: loadError.value.data?.data?.message ?? '商品加载失败',
    fatal: true,
  })
}

const product = computed(() => productData.value?.item ?? null)

/** 进入本页的条件是 product:edit；无权限在中间件层已 403，这里只是无 JS 兜底 */
const canEdit = computed(() => can(PERM.PRODUCT_EDIT))

/* ---------- 表单：草稿直接由服务端对象初始化 ---------- */

const formRef = ref()
const saving = ref(false)

/**
 * 兜底空表单：商品为 null（加载失败）时用它初始化，避免读 null.name 直接崩。
 * 页面模板有 v-if 守着，所以这个空表单不会被渲染出去。
 */
const EMPTY_FORM = { name: '', categoryId: undefined, price: 0, stock: 0, description: '' }

/**
 * 新建时的初始草稿：价格与库存留空（undefined）而不是 0。
 * 0 能通过 required 校验，会让「没填价格」被当成「卖 0 元」提交。
 */
const NEW_FORM = { name: '', categoryId: undefined, price: undefined, stock: undefined, description: '' }

/** 把服务端对象映射成表单字段；字段白名单显式写出，避免把 sku/updatedAt 一起塞进 body */
function toForm(source) {
  if (!source) return { ...EMPTY_FORM }
  return {
    name: source.name,
    categoryId: source.categoryId,
    price: source.price,
    stock: source.stock,
    description: source.description ?? '',
  }
}

/** 草稿态。编辑时首屏 productData 已就绪（上面 await 过），新建时是一张空表 */
const form = reactive(isNew.value ? { ...NEW_FORM } : toForm(product.value))

const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' },
    { min: 2, max: 40, message: '长度在 2 到 40 个字符', trigger: 'blur' },
  ],
  categoryId: [{ required: true, message: '请选择商品分类', trigger: 'change' }],
  price: [{ required: true, message: '请填写单价', trigger: 'blur' }],
  stock: [{ required: true, message: '请填写库存', trigger: 'blur' }],
}

/**
 * 保存成功后用服务端返回的对象刷新页面数据与草稿。
 * 本页不做脏值追踪（取消即离开），因此不需要再维护一份「已保存快照」。
 */
function syncProduct(item) {
  productData.value = { item }
  Object.assign(form, toForm(item))
  formRef.value?.clearValidate()
}

/* ---------- 保存 / 取消 ---------- */
async function save() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  saving.value = true
  try {
    if (isNew.value) {
      // POST 只收白名单字段；id / sku / status / 时间戳全由服务端生成
      const { item } = await api.products.create({ ...form })
      syncProduct(item)
      clearNuxtData('products')

      ElMessage.success(`商品已创建（${item.sku}）`)

      /**
       * replace 而不是 push：创建完地址栏应该直接是商品详情，
       * 不能让「后退」回到那张已经提交过的空表单。
       */
      await navigateTo(`/products/${item.id}`, { replace: true })
      return
    }

    // PUT 是全量替换，body 只放白名单字段（sku / status 由服务端维护）
    const { item } = await api.products.update(route.params.id, { ...form })
    syncProduct(item)

    /**
     * 列表页的 useAsyncData key 是 'products'，它可能还挂在内存里带着旧数据。
     * 清掉它的 payload 缓存与实例状态，下次进列表页会重新取数，
     * 不会立刻拿到保存前的旧快照。
     *
     * 用 clearNuxtData 而不是 refreshNuxtData：列表页此刻没挂载，
     * 没必要为了"顺手刷新"发一笔没人看的请求。
     */
    clearNuxtData('products')

    ElMessage.success('商品已保存')
  }
  catch (err) {
    ElMessage.error(err.bizMessage)
  }
  finally {
    saving.value = false
  }
}

/**
 * 取消：直接返回上一级，不做任何回滚（本来就没有本地快照要回滚）。
 *
 * 判断依据是 vue-router 写在历史记录里的 `state.back`：
 * - 站内跳进来（列表 → 详情）→ `back` 是上一页的路径，可以退；
 * - 从地址栏、书签、新标签直接打开 → `back` 是 null，此时 router.back()
 *   要么没反应、要么把人退出站（实测会回到 about:blank）。
 * 用 history.length 判断不可靠：直开时它也可能是 1，但并不代表能退。
 */
function cancel() {
  if (import.meta.client && window.history.state?.back) {
    router.back()
    return
  }
  navigateTo('/products')
}

const categoryName = computed(
  () => categories.value.find(item => item.id === form.categoryId)?.name ?? '—',
)
</script>

<template>
  <div v-if="product || isNew" class="page">
    <div class="page-head">
      <div class="head-left">
        <NuxtLink to="/products" class="back">
          <el-icon :size="14"><ArrowLeft /></el-icon>
          返回列表
        </NuxtLink>
        <h1>{{ form.name || (isNew ? '新建商品' : '商品编辑') }}</h1>
        <p v-if="product" class="head-meta">
          <span>{{ product.sku }}</span>
          <i>/</i>
          <span>{{ categoryName }}</span>
          <i>/</i>
          <el-tag :type="product.status === 'on' ? 'success' : 'info'" size="small" effect="light">
            {{ product.status === 'on' ? '已上架' : '已下架' }}
          </el-tag>
        </p>
        <p v-else class="head-meta">
          <span>保存后自动生成 SKU，初始状态为「下架」</span>
        </p>
      </div>

      <div v-if="canEdit" class="head-actions">
        <el-button @click="cancel">返回</el-button>
        <el-button type="primary" :loading="saving" @click="save">
          {{ isNew ? '创建商品' : '保存修改' }}
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="!canEdit"
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="当前账号没有编辑权限"
      description="商品编辑页需要 product:edit 权限。路由守卫已会在进入前拦截，这里只是无 JS 场景下的兜底展示。"
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
                  v-for="item in categories"
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

          <section v-if="product" class="card">
            <h2>其他信息</h2>
            <div class="meta-row">
              <span>SKU</span>
              <b>{{ product.sku }}</b>
            </div>
            <div class="meta-row">
              <span>创建时间</span>
              <b>{{ product.createdAt }}</b>
            </div>
            <div class="meta-row">
              <span>最近更新</span>
              <b>{{ product.updatedAt }}</b>
            </div>
            <div class="meta-row">
              <span>最近操作人</span>
              <b>{{ product.updatedBy }}</b>
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
