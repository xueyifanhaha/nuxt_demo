<script setup>
import { ElMessage } from 'element-plus'
import { Lock, User } from '@element-plus/icons-vue'

definePageMeta({ layout: 'auth' })

useHead({ title: '登录 · 商品运营后台' })

const demoAccounts = [
  { username: 'admin', role: '1 级 · 管理员', level: 1 },
  { username: 'editor', role: '2 级 · 运营', level: 2 },
  { username: 'viewer', role: '3 级 · 只读', level: 3 },
]

const formRef = ref()
const loading = ref(false)
const auth = useAuthStore()
const route = useRoute()

// 静态阶段先预填一个账号，方便直接看到校验效果
const form = reactive({
  username: 'admin',
  password: 'demo-123456',
  remember: true,
})

const rules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 3, message: '用户名至少 3 个字符', trigger: 'blur' },
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, message: '密码至少 6 位', trigger: 'blur' },
  ],
}

function fill(username) {
  form.username = username
  form.password = 'demo-123456'
  formRef.value?.clearValidate()
}

async function submit() {
  if (!formRef.value) return

  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const user = await auth.login(form.username, form.password)
    ElMessage.success(`欢迎回来，${user.name}`)
    // 登录前被守卫拦下的页面，登录后直接送回去
    await navigateTo(route.query.redirect || '/products')
  }
  catch (error) {
    const message = error?.data?.message
    ElMessage.error(message ?? '登录失败，请稍后重试')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="login">
    <section class="form-side">
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
  max-width: 440px;
  background: var(--app-surface);
  border: 1px solid rgba(15, 23, 42, 0.06);
  border-radius: 20px;
  overflow: hidden;
  box-shadow:
    0 24px 60px -32px rgba(15, 23, 42, 0.4),
    0 2px 10px rgba(15, 23, 42, 0.04);
}

/* ---------- 表单区 ---------- */
.form-side {
  display: flex;
  flex-direction: column;
  padding: 44px 40px 36px;
}

.login-head {
  text-align: center;
}

.login-head .mark {
  width: 40px;
  height: 40px;
  margin: 0 auto;
  display: grid;
  place-items: center;
  border-radius: 12px;
  background: #2563eb;
  box-shadow: 0 6px 16px -6px rgba(37, 99, 235, 0.9);
}

h2 {
  margin-top: 16px;
  font-size: 22px;
  font-weight: 500;
  letter-spacing: -0.01em;
  text-align: center;
}

.sub {
  margin-top: 6px;
  font-size: 13.5px;
  color: var(--app-muted);
  text-align: center;
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
    max-width: 420px;
  }

  .form-side {
    padding: 36px 28px 32px;
  }
}
</style>
