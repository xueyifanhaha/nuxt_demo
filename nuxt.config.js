// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@element-plus/nuxt', '@pinia/nuxt'],

  // 关键：把 pinia 内联进服务端产物。
  // 否则 Nitro 会把 pinia 外置成 node_modules/pinia，而 @pinia/nuxt 的插件是内联的，
  // 两个副本导致 setActivePinia / getActivePinia 各自为政，生产环境 SSR 报 "no active Pinia"。
  nitro: {
    externals: {
      inline: ['pinia'],
    },
    // 构建时预生成 .gz/.br 文件，服务时按 Accept-Encoding 直发，
    // 不用运行时压缩（省 CPU，且 brotli 比运行时 gzip 小 15-20%）。
    compressPublicAssets: true,
  },

  // 分包策略（vite 8 = rolldown 内核，chunk 名会被 Nuxt 的 [hash].js 掩盖，
  // 验证分包效果只能靠构建产物实测，不能看文件名）。
  // 实测结论（2026-10-20，login 首访 gzip）：
  //   默认分包 131KB < 按组件细拆 143KB < element-plus 整块 vendor 189KB。
  // element-plus 交给默认分包最划算：ElMessage/ElForm 等共享代码本来就该
  // 和组件合并进同一 chunk。这里只拆走最稳定的 vue 全家桶和 dayjs 吃长缓存。
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return
            if (id.includes('dayjs')) return 'dayjs'
            if (
              /[\\/]node_modules[\\/](@vue|vue|vue-router|vue-demi|pinia)[\\/]/.test(id)
            ) {
              return 'vue-vendor'
            }
            // 其余（含 element-plus）不动，用默认分包
          },
        },
      },
    },
  },

  css: ['~/assets/css/main.css'],

  // 登录态守卫会把未登录用户送去 /login；根路径直接进商品列表。
  // _nuxt 下的产物带内容 hash，内容永不变 → 永久强缓存，
  // immutable 让浏览器连条件请求（304 协商）都省掉。
  routeRules: {
    '/': { redirect: '/products' },
    '/_nuxt/**': {
      headers: { 'Cache-Control': 'public, max-age=31536000, immutable' },
    },
  },

  app: {
    head: {
      title: '商品运营后台',
      htmlAttrs: { lang: 'zh-CN' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { name: 'description', content: '商品运营后台：商品、分类、库存与角色权限管理' },
      ],
    },
  },
})
