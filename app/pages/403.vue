<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: '无权限访问 · 商品运营后台' })
</script>

<template>
  <div class="forbidden">
    <div class="card">
      <p class="code">403</p>
      <h1>没有权限访问这个页面</h1>
      <p class="desc">当前账号的角色没有该页面的访问权限，如需开通请联系管理员。</p>
      <NuxtLink to="/login" class="btn">返回登录</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.forbidden {
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
</style>
