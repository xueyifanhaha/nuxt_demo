<script setup>
import { ElMessage } from 'element-plus'

/**
 * 分类新增/编辑弹窗（被 LazyCategoryEditDialog 异步加载）。
 * 纯表单职责：预填、校验、提交；父组件只管开关和刷新列表。
 */
const props = defineProps({
  // null = 新建，否则是被编辑的分类行
  editing: { type: Object, default: null },
})
const emit = defineEmits(['saved'])
// v-model 透传弹窗开关
const visible = defineModel({ type: Boolean, default: false })

const submitting = ref(false)
const formRef = ref()
const form = reactive({ name: '', description: '' })
const rules = {
  name: [
    { required: true, message: '请输入分类名称', trigger: 'blur' },
    { min: 2, max: 20, message: '长度 2 - 20 个字符', trigger: 'blur' },
  ],
  description: [{ max: 100, message: '不超过 100 个字符', trigger: 'blur' }],
}

// 每次打开时按「新建/编辑」预填。
// immediate 必须加：配合父组件的 v-if，组件挂载时 visible 已经是 true，
// 不加 immediate 的话这个 watcher 永远不会触发（实测编辑预填为空的根因）。
watch(visible, (v) => {
  if (!v) return
  form.name = props.editing?.name ?? ''
  form.description = props.editing?.description ?? ''
}, { immediate: true })

async function onSubmit() {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  const payload = { name: form.name.trim(), description: form.description.trim() }

  submitting.value = true
  try {
    if (props.editing) {
      await $fetch(`/api/categories/${props.editing.id}`, { method: 'PUT', body: payload })
      ElMessage.success(`已保存分类「${payload.name}」`)
    }
    else {
      await $fetch('/api/categories', { method: 'POST', body: payload })
      ElMessage.success(`已创建分类「${payload.name}」`)
    }
    visible.value = false
    emit('saved')
  }
  catch (err) {
    // 重名 409、长度 400 等都带服务端 message，弹窗保持打开让用户改
    ElMessage.error(err?.data?.data?.message ?? err?.data?.message ?? '保存失败，请稍后重试')
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog v-model="visible" :title="editing ? `编辑分类 · ${editing.name}` : '新建分类'" width="440px"
    destroy-on-close>
    <el-form ref="formRef" :model="form" :rules="rules" label-position="top" @submit.prevent>
      <el-form-item label="分类名称" prop="name">
        <el-input v-model="form.name" placeholder="如：手机数码" maxlength="20" show-word-limit />
      </el-form-item>
      <el-form-item label="描述" prop="description">
        <el-input v-model="form.description" type="textarea" :rows="3" placeholder="选填，简单说明这个分类放什么" maxlength="100"
          show-word-limit />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="onSubmit">保存</el-button>
    </template>
  </el-dialog>
</template>
