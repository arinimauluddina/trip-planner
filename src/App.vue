<template>
  <div class="app-root">
    <div
      v-if="pullDistance > 0 || isRefreshing"
      class="pull-refresh-indicator"
      :class="{ 'is-refreshing': isRefreshing }"
      :style="{ '--pull-offset': `${Math.min(4, pullDistance / 24)}rem` }"
      role="status"
      aria-live="polite"
    >
      <span class="pull-refresh-icon" aria-hidden="true">↑</span>
    </div>
    <RouterView />
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const pullThreshold = 96
let pullStart = null
let reloadTimer = null
const pullDistance = ref(0)
const isRefreshing = ref(false)

function isAtTop() {
  return (window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0) <= 0
}

function canStartPull(target) {
  return !target?.closest?.('.modal, .modal-overlay, .custom-dropdown-menu, input, textarea, select, button, a')
}

function handlePullStart(event) {
  if (event.touches.length !== 1 || !isAtTop() || !canStartPull(event.target)) {
    pullStart = null
    pullDistance.value = 0
    return
  }

  const touch = event.touches[0]
  pullStart = { x: touch.clientX, y: touch.clientY }
  pullDistance.value = 0
}

function handlePullMove(event) {
  if (!pullStart || event.touches.length !== 1 || !isAtTop()) return

  const touch = event.touches[0]
  const deltaX = touch.clientX - pullStart.x
  const deltaY = touch.clientY - pullStart.y
  if (deltaY > 0 && deltaY > Math.abs(deltaX) * 1.25 && event.cancelable) {
    pullDistance.value = Math.min(deltaY, pullThreshold + 48)
    event.preventDefault()
  } else if (deltaY <= 0) {
    pullDistance.value = 0
  }
}

function handlePullEnd(event) {
  if (!pullStart) return

  const touch = event.changedTouches[0]
  if (!touch) {
    pullStart = null
    pullDistance.value = 0
    return
  }
  const deltaX = touch.clientX - pullStart.x
  const deltaY = touch.clientY - pullStart.y
  pullStart = null

  if (deltaY >= pullThreshold && deltaY > Math.abs(deltaX) * 1.25 && isAtTop()) {
    isRefreshing.value = true
    pullDistance.value = pullThreshold + 48
    reloadTimer = window.setTimeout(() => window.location.reload(), 500)
  } else {
    pullDistance.value = 0
  }
}

function handlePullCancel() {
  pullStart = null
  pullDistance.value = 0
}

onMounted(() => {
  window.addEventListener('touchstart', handlePullStart, { passive: true })
  window.addEventListener('touchmove', handlePullMove, { passive: false })
  window.addEventListener('touchend', handlePullEnd, { passive: true })
  window.addEventListener('touchcancel', handlePullCancel, { passive: true })
})

onBeforeUnmount(() => {
  if (reloadTimer) window.clearTimeout(reloadTimer)
  window.removeEventListener('touchstart', handlePullStart)
  window.removeEventListener('touchmove', handlePullMove)
  window.removeEventListener('touchend', handlePullEnd)
  window.removeEventListener('touchcancel', handlePullCancel)
})
</script>


