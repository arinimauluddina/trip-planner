<template>
  <Teleport to="body">
    <div class="fixed inset-x-0 bottom-4 z-[9999] flex flex-col items-center gap-2 px-4 pointer-events-none">
      <TransitionGroup name="toast">
        <div
          v-for="t in toastStore.toasts"
          :key="t.id"
          class="toast pointer-events-auto"
          :class="{
            'bg-secondary': t.type === 'success',
            'bg-primary':   t.type === 'error',
            'bg-purple':    t.type === 'info',
          }"
        >
          <span class="toast-icon">{{ icons[t.type] }}</span>
          <span>{{ displayMessage(t.message, t.type) }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<script setup>
import { useToastStore } from '@/stores/toastStore.js'
const toastStore = useToastStore()
const icons = { success: '✅', error: '❌', info: 'ℹ️' }

function displayMessage(message, type) {
  const text = String(message).trim()
  const icon = icons[type]
  if (text.startsWith(icon)) return text.slice(icon.length).trim()
  if (text.endsWith(icon)) return text.slice(0, -icon.length).trim()
  return text
}
</script>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.25s ease; }
.toast-enter-from { opacity: 0; transform: translateX(40px); }
.toast-leave-to   { opacity: 0; transform: translateX(40px); }
</style>

