/**
 * 业务接口的统一入口 —— 全项目唯一写 URL 字符串的地方。
 *
 * 三种底层调用在这里各就各位，关键是分清「谁决定链路、谁只是被传进来的」：
 *
 * 1. `$fetch` —— 默认的执行者。页面、store、事件回调里 `useApi()` 不传参，用的就是它
 *    （浏览器同源请求自动带 cookie）。
 * 2. `useRequestFetch()` —— 只在**可能跑在 SSR** 的地方把它的结果传进来：
 *    `const api = useApi(useRequestFetch())`。
 *    它返回的不是「另一个请求库」，就是一个被剥掉 Nuxt 上下文的 `$fetch`，
 *    SSR 期间会把浏览器那次的 Cookie 带上。
 * 3. `useAsyncData` —— **不归这里管**。它要配 key / watch、要进 payload，
 *    必须写在页面里；这里只负责把「发请求」这件事做干净，让页面里那一行变得很短。
 *
 * 用法：
 *   // 页面 setup（可能 SSR）
 *   const api = useApi(useRequestFetch())
 *   const { data, error } = await useAsyncData('products', () => api.products.list(query.value), { watch: [query] })
 *
 *   // 事件回调（一定在浏览器）
 *   const api = useApi()
 *   await api.products.updateStatus(id, 'off')
 *
 * 为什么不用 `createFetch({ fetch: ... })` 再包一层？
 *   createFetch 的 `fetch` 参数要的是**原生 fetch 语义**（返回 Response 对象），
 *   它靠 `response._data` / `response.body` 取结果。而 `$fetch` 返回的已经是解析好的 body，
 *   套进去之后 `hasBody` 判定为 false、`_data` 永远是 undefined —— 接口 200 也拿不到数据。
 *   所以这里不套，统一逻辑直接写在 call() 里。
 */

/**
 * 服务端 createError 的业务文案在响应体的 data.message 里；
 * ofetch 把整个响应体挂到 FetchError.data，所以实际路径是 err.data.data.message。
 * 后面两层是兜底（不同 h3 版本 / 前面加了网关时不一定是这个形状）。
 */
function pickMessage(error, fallback) {
  return error?.data?.data?.message
    ?? error?.data?.message
    ?? error?.statusMessage
    ?? error?.message
    ?? fallback
}

/** 去掉 undefined / null / ''，避免 ?q=&status= 这类空键。注意待分类 id 是 -1，必须保留 */
function cleanQuery(query) {
  if (!query) return undefined
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

/**
 * @param {typeof $fetch} fetcher 底层 HTTP 客户端；SSR 场景传 useRequestFetch() 的结果
 */
export function useApi(fetcher = $fetch) {
  /** 统一包一层：收敛错误文案，附加 bizMessage 后再抛 */
  async function call(key, url, options = {}) {
    try {
      return await fetcher(url, {
        // 写操作不能被自动重试，统一关掉，简单可预期
        retry: 0,
        ...options,
        query: cleanQuery(options.query),
      })
    }
    catch (error) {
      // 页面只需读 err.bizMessage，不用再关心错误体长什么样
      error.bizMessage = pickMessage(error, `${key}失败，请稍后重试`)
      throw error
    }
  }

  const products = {
    list: query => call('查询商品', '/api/products', { query }),
    detail: id => call('查询商品', `/api/products/${id}`),
    update: (id, body) => call('保存商品', `/api/products/${id}`, { method: 'PUT', body }),
    updateStatus: (id, status) => call('上下架', `/api/products/${id}/status`, { method: 'PUT', body: { status } }),
    remove: id => call('删除商品', `/api/products/${id}`, { method: 'DELETE' }),
  }

  const categories = {
    list: () => call('查询分类', '/api/categories'),
    create: body => call('新建分类', '/api/categories', { method: 'POST', body }),
    update: (id, body) => call('保存分类', `/api/categories/${id}`, { method: 'PUT', body }),
    remove: id => call('删除分类', `/api/categories/${id}`, { method: 'DELETE' }),
  }

  const auth = {
    login: body => call('登录', '/api/auth/login', { method: 'POST', body }),
    logout: () => call('退出登录', '/api/auth/logout', { method: 'POST' }),
    me: () => call('获取当前用户', '/api/auth/me'),
  }

  const logs = {
    list: query => call('查询日志', '/api/logs', { query }),
  }

  return {
    /** 逃生口：遇到没封装的接口，用 api.raw('/api/xxx', { method: 'POST' }) 直接用 */
    raw: (url, options = {}) => call('请求', url, options),
    products,
    categories,
    auth,
    logs,
  }
}
