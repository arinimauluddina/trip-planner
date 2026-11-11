<template>
  <div ref="root" class="date-picker">
    <button type="button" class="date-picker-trigger" :class="{ 'is-empty': !modelValue }" @click="toggle">
      <span class="date-picker-icon">📅</span>
      <span>{{ displayValue }}</span>
      <span class="date-picker-chevron">⌄</span>
    </button>

    <Teleport to="body">
      <div v-if="open" ref="popover" class="date-picker-popover" :style="popoverStyle" @click.stop>
        <div class="date-picker-header">
          <button type="button" class="date-picker-nav" aria-label="Bulan sebelumnya" @click="changeMonth(-1)">‹</button>
          <span>{{ monthLabel }}</span>
          <button type="button" class="date-picker-nav" aria-label="Bulan berikutnya" @click="changeMonth(1)">›</button>
        </div>

        <div class="date-picker-weekdays">
          <span v-for="day in weekdays" :key="day">{{ day }}</span>
        </div>

        <div class="date-picker-grid">
          <span v-for="blank in firstDay" :key="`blank-${blank}`" class="date-picker-day is-blank" />
          <button
            v-for="day in daysInMonth"
            :key="day"
            type="button"
            class="date-picker-day"
            :class="{ 'is-today': isToday(day), 'is-selected': isSelected(day) }"
            @click="select(day)"
          >{{ day }}</button>
        </div>

        <button v-if="modelValue" type="button" class="date-picker-clear" @click="clear">Hapus tanggal</button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue'])
const root = ref(null)
const popover = ref(null)
const open = ref(false)
const popoverStyle = ref({})
const viewDate = ref(parseDate(props.modelValue) || new Date())
const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min']

const monthLabel = computed(() => viewDate.value.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }))
const firstDay = computed(() => {
  const day = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth(), 1).getDay()
  return day === 0 ? 6 : day - 1
})
const daysInMonth = computed(() => new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + 1, 0).getDate())
const displayValue = computed(() => {
  const date = parseDate(props.modelValue)
  return date ? date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : 'Pilih tanggal'
})

watch(() => props.modelValue, (value) => {
  const date = parseDate(value)
  if (date) viewDate.value = date
})

function parseDate(value) {
  if (!value) return null
  const [year, month, day] = value.split('-').map(Number)
  return year && month && day ? new Date(year, month - 1, day) : null
}
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    positionPopover()
  }
}
function positionPopover() {
  const trigger = root.value?.querySelector('.date-picker-trigger')
  if (!trigger || !popover.value) return

  const triggerRect = trigger.getBoundingClientRect()
  const popoverRect = popover.value.getBoundingClientRect()
  const gap = 8
  const edge = 8
  const viewport = window.visualViewport
  const viewportTop = viewport?.offsetTop || 0
  const viewportHeight = viewport?.height || window.innerHeight
  const viewportBottom = viewportTop + viewportHeight
  const left = Math.min(
    Math.max(triggerRect.left, edge),
    window.innerWidth - popoverRect.width - edge,
  )
  const belowTop = triggerRect.bottom + gap
  const aboveTop = triggerRect.top - popoverRect.height - gap
  const preferredTop = belowTop + popoverRect.height <= viewportBottom - edge
    ? belowTop
    : aboveTop
  const maxTop = viewportBottom - popoverRect.height - edge
  const top = Math.min(
    Math.max(preferredTop, viewportTop + edge),
    Math.max(viewportTop + edge, maxTop),
  )

  popoverStyle.value = {
    left: `${left}px`,
    top: `${top}px`,
  }
}
function changeMonth(offset) { viewDate.value = new Date(viewDate.value.getFullYear(), viewDate.value.getMonth() + offset, 1) }
function select(day) {
  emit('update:modelValue', dateKey(viewDate.value.getFullYear(), viewDate.value.getMonth(), day))
  open.value = false
}
function clear() { emit('update:modelValue', ''); open.value = false }
function isSelected(day) { return props.modelValue === dateKey(viewDate.value.getFullYear(), viewDate.value.getMonth(), day) }
function isToday(day) {
  const today = new Date()
  return today.getFullYear() === viewDate.value.getFullYear() && today.getMonth() === viewDate.value.getMonth() && today.getDate() === day
}
function closeOnOutside(event) {
  if (root.value?.contains(event.target) || popover.value?.contains(event.target)) return
  open.value = false
}
function repositionOnResize() { if (open.value) positionPopover() }
function repositionOnViewportChange() { if (open.value) positionPopover() }

onMounted(() => {
  document.addEventListener('click', closeOnOutside)
  window.addEventListener('resize', repositionOnResize)
  window.visualViewport?.addEventListener('resize', repositionOnViewportChange)
  window.visualViewport?.addEventListener('scroll', repositionOnViewportChange)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutside)
  window.removeEventListener('resize', repositionOnResize)
  window.visualViewport?.removeEventListener('resize', repositionOnViewportChange)
  window.visualViewport?.removeEventListener('scroll', repositionOnViewportChange)
})
</script>
