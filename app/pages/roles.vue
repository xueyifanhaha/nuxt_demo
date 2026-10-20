<script setup>
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { PERMISSION_GROUPS, ROLE_PRESETS } from '#shared/permissions'

definePageMeta({ layout: 'default' })
useHead({ title: '权限管理 · 商品运营后台' })

/**
 * 本页会 SSR（首屏直出矩阵），api 必须用 useRequestFetch 创建，服务端才能带上 cookie。
 * 角色数据只有本页用，直接在这里取，不再放 usePermission 的共享 state。
 */
const api = useApi(useRequestFetch())

const { data: rolesData } = await useAsyncData(
  'roles',
  () => api.roles.list(),
)

/** 已保存的角色（服务端为准），draft 与它比较得出「是否有未保存修改」 */
const savedRoles = computed(() => rolesData.value?.items ?? [])

/** 矩阵列：1 级锁定全选，2/3 级可编辑 */
const LEVELS = [
  { level: 1, label: '1 级 · 管理员', locked: true },
  { level: 2, label: '2 级 · 运营', locked: false },
  { level: 3, label: '3 级 · 只读', locked: false },
]

/** 草稿：{ 1: [...], 2: [...], 3: [...] } */
const draft = reactive(Object.fromEntries(savedRoles.value.map(r => [r.level, [...r.permissions]])))

function isChecked(level, perm) {
  return draft[level]?.includes(perm) ?? false
}

function toggle(level, perm) {
  const list = draft[level]
  if (!list) return
  const index = list.indexOf(perm)
  if (index >= 0) list.splice(index, 1)
  else list.push(perm)
}

/** 与已保存版本不一致的角色级别，保存时逐个提交 */
const changedLevels = computed(() =>
  savedRoles.value
    .filter((r) => {
      const d = draft[r.level] ?? []
      return r.permissions.length !== d.length || r.permissions.some(p => !d.includes(p))
    })
    .map(r => r.level),
)

const dirty = computed(() => changedLevels.value.length > 0)

/** 规则：2/3 级至少保留「查看商品」，否则整级变空白后台（黄色提示，不阻止保存） */
const emptyRisk = computed(() =>
  LEVELS.some(({ level, locked }) => !locked && !isChecked(level, 'product:view')),
)

const saving = ref(false)

async function save() {
  if (changedLevels.value.length === 0) return
  saving.value = true
  try {
    for (const level of changedLevels.value) {
      const { item } = await api.roles.update(level, draft[level])
      // useAsyncData 的 data 是 shallowRef，深层改动不触发更新；
      // 与商品列表页 patchItem 同款手法，整体换新数组
      rolesData.value = {
        items: rolesData.value.items.map(r => (r.level === level ? item : r)),
      }
    }
    ElMessage.success('权限已保存：相关角色用户的下一次请求即按新权限校验，在线用户重新登录后界面同步')
  }
  catch (err) {
    // 部分成功时已落库的级别保留，失败的留在草稿里，可直接重试
    ElMessage.error(err.bizMessage)
  }
  finally {
    saving.value = false
  }
}

/** 放弃未保存的修改，回到已保存状态 */
function discard() {
  for (const r of savedRoles.value) {
    draft[r.level] = [...r.permissions]
  }
}

/** 恢复种子角色预设（只是草稿操作，要点保存才会落库） */
function resetToPreset() {
  for (const r of structuredClone(ROLE_PRESETS)) {
    draft[r.level] = [...r.permissions]
  }
}
</script>

<template>
  <div class="page">
    <div class="page-head">
      <div>
        <h1>权限管理</h1>
        <p>勾选每个角色拥有的权限点，保存后相关角色用户的下一次请求即按新权限校验 · 1 级管理员固定全量权限，不可修改</p>
      </div>
      <div class="head-actions">
        <el-button :icon="Refresh" :disabled="!dirty" @click="resetToPreset">恢复默认</el-button>
        <el-button :disabled="!dirty" @click="discard">放弃修改</el-button>
        <el-button type="primary" :loading="saving" :disabled="!dirty" @click="save">
          保存修改
        </el-button>
      </div>
    </div>

    <el-alert
      v-if="emptyRisk"
      class="notice"
      type="warning"
      :closable="false"
      show-icon
      title="有角色将失去「查看商品」权限"
      description="取消后该级别登录将看不到任何菜单和商品数据，成为空白后台。可以保存，但请确认这是你想要的。"
    />

    <section class="card matrix">
      <!-- 表头行 -->
      <div class="head">
        <span class="perm-name">权限点</span>
        <span class="head-spacer" />
        <div class="cells">
          <div v-for="col in LEVELS" :key="col.level" class="cell role-col">
            <b>{{ col.label }}</b>
            <el-tag v-if="col.locked" size="small" type="info" effect="plain">锁定</el-tag>
          </div>
        </div>
      </div>

      <div v-for="group in PERMISSION_GROUPS" :key="group.group" class="group">
        <h2>{{ group.group }}</h2>

        <div v-for="item in group.items" :key="item.perm" class="row">
          <span class="perm-name">{{ item.label }}</span>
          <code class="perm-key">{{ item.perm }}</code>

          <div class="cells">
            <div v-for="col in LEVELS" :key="col.level" class="cell">
              <el-checkbox
                :model-value="isChecked(col.level, item.perm)"
                :disabled="col.locked"
                @change="toggle(col.level, item.perm)"
              />
            </div>
          </div>
        </div>
      </div>
    </section>

    <p class="foot-hint">
      权限模型：角色 → 权限点。导航按权限过滤、页面由路由守卫拦截、按钮按权限渲染、接口由服务端校验——
      保存后服务端立即按新矩阵校验；在线用户界面上的导航与按钮来自登录时下发的权限快照，重新登录后同步。
    </p>
  </div>
</template>

<style scoped>
.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.page-head h1 {
  font-size: 20px;
  font-weight: 500;
  letter-spacing: -0.01em;
}

.page-head p {
  margin-top: 6px;
  font-size: 13px;
  color: var(--app-muted);
}

.head-actions {
  display: flex;
  gap: 10px;
}

.notice {
  margin-bottom: 14px;
}

.card {
  background: var(--app-surface);
  border: 1px solid var(--app-border);
  border-radius: 12px;
}

.matrix {
  padding: 6px 20px 16px;
}

.head {
  display: grid;
  grid-template-columns: 130px 130px 1fr;
  align-items: center;
  gap: 12px;
  padding: 12px 0 14px;
  border-bottom: 1px solid var(--app-border);
}

.head .perm-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--app-text);
}

.role-col {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.role-col b {
  font-size: 13px;
  font-weight: 500;
  color: var(--app-text);
}

.cells {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
}

.cell {
  display: flex;
  justify-content: center;
}

.group h2 {
  margin: 16px 0 2px;
  font-size: 13px;
  font-weight: 600;
  color: #4f46e5;
}

.row {
  display: grid;
  grid-template-columns: 130px 130px 1fr;
  align-items: center;
  gap: 12px;
  padding: 11px 0;
}

.row + .row {
  border-top: 1px dashed var(--app-border);
}

.perm-name {
  font-size: 13.5px;
  color: var(--app-text);
}

.perm-key {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 11.5px;
  color: #9ca3af;
}

.foot-hint {
  margin-top: 14px;
  font-size: 12.5px;
  line-height: 1.7;
  color: #9ca3af;
}
</style>
