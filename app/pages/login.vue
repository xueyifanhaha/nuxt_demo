<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

definePageMeta({ layout: 'auth' })

useHead({ title: '登录 · 商品运营后台' })

interface DemoAccount {
  username: string
  role: string
  level: number
}

const demoAccounts: DemoAccount[] = [
  { username: 'admin', role: '1 级 · 管理员', level: 1 },
  { username: 'editor', role: '2 级 · 运营', level: 2 },
  { username: 'viewer', role: '3 级 · 只读', level: 3 },
]

const features = ['商品与分类维护', '库存、价格与上下架', '角色级权限与操作日志']

const formRef = ref<FormInstance>()
const loading = ref(false)

// 静态阶段先预填一个账号，方便直接看到校验效果
const form = reactive({
  username: 'admin',
  password: '123456',
  remember: true,
})

const rules: FormRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

function fill(username: string) {
  form.username = username
  form.password = '123456'
  formRef.value?.clearValidate()
}

async function submit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  // 静态页面：等下一步接上 /api/auth/login 后替换成真实请求
  setTimeout(() => {
    loading.value = false
    ElMessage.success(`校验通过（${form.username}），登录接口下一步接入`)
  }, 350)
}
</script>

<template>
  <div class="login">
    <section class="panel">
      <div class="brand">
        <span class="mark">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 8.5 12 4l9 4.5-9 4.5-9-4.5Z" />
            <path d="M3 8.5v7L12 20l9-4.5v-7" />
            <path d="M12 13v7" />
          </svg>
        </span>
        <span class="brand-name">商品运营后台</span>
      </div>

      <h1>商品、库存、权限<br />一个后台管完</h1>
      <p class="desc">基于 Nuxt 4 + Vue 3 的练手项目，三层角色权限贯穿页面与接口。</p>

      <ul class="features">
        <li v-for="item in features" :key="item">
          <span class="tick">
            <svg viewBox="0 0 12 12" fill="none" stroke="#7ba7ff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <path d="M2.5 6.2 4.8 8.4 9.5 3.6" />
            </svg>
          </span>
          {{ item }}
        </li>
      </ul>

      <p class="foot">演示账号：admin / editor / viewer<br />密码均为 123456</p>
    </section>

    <section class="form-side">
      <h2>登录</h2>
      <p class="sub">登录后按角色展示可用的功能与按钮</p>

      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        :hide-required-asterisk="true"
        @submit.prevent="submit"
      >
        <el-form-item prop="username">
          <el-input
            v-model="form.username"
            placeholder="用户名"
            :prefix-icon="User"
            autocomplete="username"
          />
        </el-form-item>

        <el-form-item prop="password">
          <el-input
            v-model="form.password"
            type="password"
            placeholder="密码"
            :prefix-icon="Lock"
            show-password
            autocomplete="current-password"
          />
        </el-form-item>

        <div class="row">
          <el-checkbox v-model="form.remember">记住我</el-checkbox>
          <span class="muted">忘记密码请联系管理员</span>
        </div>

        <el-button type="primary" native-type="submit" class="submit" :loading="loading">
          登 录
        </el-button>
      </el-form>

      <div class="demo">
        <span class="demo-label">一键填入演示账号</span>
        <div class="demo-list">
          <button
            v-for="account in demoAccounts"
            :key="account.username"
            type="button"
            class="demo-item"
            @click="fill(account.username)"
          >
            <b>{{ account.role }}</b>
            <span>{{ account.username }}</span>
          </button>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.login {
  width: 100%;
  max-width: 940px;
  display: grid;
  grid-template-columns: 0.92fr 1fr;
  background: var(--app-surface);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 24px 60px -32px rgba(15, 23, 42, 0.4),
    0 2px 10px rgba(15, 23, 42, 0.04);
}

/* ---------- 左侧品牌区 ---------- */
.panel {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 44px 40px 36px;
  background: #0f1b2e;
  color: #e2e8f0;
  overflow: hidden;
}

.panel::after {
  content: '';
  position: absolute;
  inset: -40% 40% 40% -30%;
  background: radial-gradient(closest-side, rgba(37, 99, 235, 0.45), rgba(37, 99, 235, 0));
  pointer-events: none;
}

.panel > * {
  position: relative;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
}

.mark {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #2563eb;
  box-shadow: 0 6px 16px -6px rgba(37, 99, 235, 0.9);
}

.brand-name {
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.02em;
  color: #ffffff;
}

h1 {
  margin-top: 38px;
  font-size: 25px;
  font-weight: 500;
  line-height: 1.45;
  letter-spacing: -0.01em;
  color: #ffffff;
}

.desc {
  margin-top: 14px;
  font-size: 13.5px;
  line-height: 1.7;
  color: #93a4bd;
}

.features {
  margin-top: 30px;
  display: grid;
  gap: 12px;
}

.features li {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13.5px;
  color: #c9d5e5;
}

.tick {
  flex: none;
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(37, 99, 235, 0.18);
  border: 1px solid rgba(96, 150, 255, 0.45);
}

.foot {
  margin-top: auto;
  padding-top: 32px;
  font-size: 12px;
  line-height: 1.8;
  color: #64748b;
}

/* ---------- 右侧表单区 ---------- */
.form-side {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 52px 48px;
}

h2 {
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.sub {
  margin-top: 6px;
  font-size: 13.5px;
  color: var(--app-muted);
}

.el-form {
  margin-top: 26px;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -2px 0 20px;
}

.muted {
  font-size: 12.5px;
  color: #9ca3af;
}

.submit {
  width: 100%;
  height: 44px;
  font-size: 15px;
  letter-spacing: 0.1em;
}

/* ---------- 演示账号 ---------- */
.demo {
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px dashed var(--app-border);
}

.demo-label {
  font-size: 12px;
  color: #9ca3af;
}

.demo-list {
  margin-top: 10px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.demo-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  text-align: left;
  font-family: inherit;
  background: #fbfcfe;
  border: 1px solid var(--app-border);
  border-radius: 10px;
  cursor: pointer;
  transition:
    border-color 0.15s,
    background 0.15s;
}

.demo-item b {
  font-size: 12.5px;
  font-weight: 500;
  color: #374151;
}

.demo-item span {
  font-size: 11.5px;
  color: #9ca3af;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}

.demo-item:hover {
  border-color: var(--el-color-primary-light-7);
  background: #f5f8ff;
}

.demo-item:hover b {
  color: var(--el-color-primary);
}

@media (max-width: 880px) {
  .login {
    grid-template-columns: 1fr;
    max-width: 420px;
  }

  .panel {
    display: none;
  }

  .form-side {
    padding: 36px 28px 32px;
  }
}
</style>
