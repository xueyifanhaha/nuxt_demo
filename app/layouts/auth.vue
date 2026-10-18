<template>
  <div class="auth-shell">
    <slot />
  </div>
</template>

<style scoped>
/* 登录类页面的统一外壳：居中 + 淡蓝渐变底 */
.auth-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 32px 20px;
  background:
    radial-gradient(1100px 520px at 12% -10%, #e6edfd 0%, rgba(230, 237, 253, 0) 62%),
    radial-gradient(900px 480px at 105% 110%, #eaeff8 0%, rgba(234, 239, 248, 0) 58%),
    var(--app-bg);
}
</style>
