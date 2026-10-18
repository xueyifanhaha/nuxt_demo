<script setup lang="ts">
const route = useRoute()
const id = route.params.id as string

definePageMeta({ layout: 'default' })
useHead({ title: '商品详情 · 商品运营后台' })
</script>

<template>
  <div class="page">
    <h1>商品详情（ID: {{ id }}）</h1>
  </div>
</template>

<style scoped>
.page h1 {
  font-size: 20px;
  font-weight: 500;
}
</style>
