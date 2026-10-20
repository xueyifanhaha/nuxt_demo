<script setup>
const props = defineProps({
  error: {
    type: Object,
    default: null,
  },
})

const is404 = computed(() => props.error?.statusCode === 404)

/**
 * 三段式取文案：
 * 1. 页面主动 createError({ statusMessage: '商品不存在' }) → 用它，比"页面不存在"精确得多
 * 2. 路由真的匹配不到时，statusMessage 是 h3/Nitro 填的英文 'Page Not Found' 之类，过滤掉
 * 3. 都没有才用默认句
 *
 * 注意 `data.data.message` 这一层：ofetch 把整个响应体挂在 FetchError.data 上，
 * 而服务端 createError 的中文在响应体的 data.message 里（详见 useApi.js 的 pickMessage）。
 */
const GENERIC = [
  'page not found',
  'not found',
  'internal server error',
  'undefined',
  '',
]

const detail = computed(() => {
  const err = props.error
  const candidates = [
    err?.data?.data?.message,
    err?.data?.message,
    err?.statusMessage,
  ]
  const hit = candidates.find(text => typeof text === 'string' && !GENERIC.includes(text.trim().toLowerCase()))
  return hit?.trim() ?? ''
})

const title = computed(() => {
  if (is404.value) return '页面不存在'
  return props.error?.statusCode === 403 ? '没有访问权限' : '服务开小差了'
})

const desc = computed(() => {
  if (detail.value) return detail.value
  if (is404.value) return '你访问的地址不存在或已被移除。'
  if (props.error?.statusCode === 403) return '当前账号没有这个页面的访问权限，请联系管理员。'
  return '发生了一个意外错误，请稍后重试。'
})

useHead({ title: `${props.error?.statusCode ?? 500} · 商品运营后台` })
</script>

<template>
  <div class="error-shell">
    <div class="card">
      <p class="code">{{ error?.statusCode ?? 500 }}</p>
      <h1>{{ title }}</h1>
      <p class="desc">{{ desc }}</p>
      <div class="actions">
        <NuxtLink to="/products" class="btn">回到商品列表</NuxtLink>
        <NuxtLink to="/" class="btn ghost">首页</NuxtLink>
      </div>
    </div>
  </div>
</template>

<style scoped>
.error-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
  background: var(--app-bg);
}

.card {
  text-align: center;
  padding: 44px 56px;
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 16px;
}

.code {
  font-size: 40px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #d1d5db;
  line-height: 1;
}

.card h1 {
  margin-top: 14px;
  font-size: 17px;
  font-weight: 500;
}

.desc {
  margin-top: 10px;
  font-size: 13px;
  color: var(--app-muted);
}

.btn {
  display: inline-block;
  margin-top: 24px;
  padding: 9px 22px;
  border-radius: 8px;
  background: var(--el-color-primary);
  color: #ffffff;
  font-size: 13.5px;
  transition: background 0.15s;
}

.btn:hover {
  background: var(--el-color-primary-dark-2);
}

.actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
}

.btn.ghost {
  background: transparent;
  border: 1px solid var(--app-border);
  color: var(--app-muted);
}

.btn.ghost:hover {
  background: #f8fafc;
  color: var(--app-text);
}
</style>
