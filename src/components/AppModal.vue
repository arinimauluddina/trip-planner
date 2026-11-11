<template>
  <Teleport to="body">
    <div v-if="modelValue" class="modal-overlay" @click.self="$emit('update:modelValue', false)">
      <div class="modal" :class="modalClass">
        <div class="modal-header">
          <span class="modal-title">{{ title }}</span>
          <button class="btn btn-ghost btn-icon text-gray-400" @click="$emit('update:modelValue', false)">✕</button>
        </div>
        <div class="modal-body">
          <slot />
        </div>
        <div class="modal-footer">
          <slot name="footer">
            <button class="btn btn-mint modal-cancel" @click="$emit('update:modelValue', false)">Batal</button>
            <button class="btn btn-secondary modal-confirm" @click="$emit('confirm')">{{ confirmText }}</button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  modelValue:  { type: Boolean, default: false },
  title:       { type: String,  default: '' },
  confirmText: { type: String,  default: 'Simpan' },
  modalClass:  { type: String,  default: '' },
})
defineEmits(['update:modelValue', 'confirm'])

const previousBodyOverflow = ref('')
const previousHtmlOverflow = ref('')
let bodyScrollLocked = false

function setBodyScrollLocked(locked) {
  if (typeof document === 'undefined') return
  if (locked && !bodyScrollLocked) {
    previousBodyOverflow.value = document.body.style.overflow
    previousHtmlOverflow.value = document.documentElement.style.overflow
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    bodyScrollLocked = true
  } else if (!locked && bodyScrollLocked) {
    document.documentElement.style.overflow = previousHtmlOverflow.value
    document.body.style.overflow = previousBodyOverflow.value
    bodyScrollLocked = false
  }
}

watch(() => props.modelValue, setBodyScrollLocked, { immediate: true })
onBeforeUnmount(() => setBodyScrollLocked(false))
</script>

