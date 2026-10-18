// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: false },

  modules: ['@element-plus/nuxt', '@pinia/nuxt'],

  css: ['~/assets/css/main.css'],

  // 根路径暂时指向登录页，后续接上权限后改成商品列表
  routeRules: {
    '/': { redirect: '/login' },
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
