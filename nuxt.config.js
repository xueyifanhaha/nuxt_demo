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
  },

  css: ['~/assets/css/main.css'],

  // 登录态守卫会把未登录用户送去 /login；根路径直接进商品列表
  routeRules: {
    '/': { redirect: '/products' },
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
