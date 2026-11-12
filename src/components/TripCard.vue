<template>
  <div class="relative overflow-hidden rounded-2xl bg-white">
    <button
      class="trash-action absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center rounded-r-2xl"
      aria-label="Hapus trip"
      @click.stop="emit('delete', trip)"
    >
      <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
      </svg>
    </button>

    <!-- Trip Card -->
    <div
      class="trip-card card relative z-10 cursor-pointer transition-all duration-200"
      :class="{ 'completed-card': trip.status === 'completed' }"
      :style="{ transform: swipeOpen ? 'translateX(-80px)' : 'translateX(0)', touchAction: 'pan-y' }"
      @click="handleClick"
      @touchstart.passive="handleTouchStart"
      @touchend="handleTouchEnd"
    >
    <!-- Color banner -->
    <div class="h-2" :style="{ background: colorBg }"></div>

    <div v-if="trip.status === 'completed'" class="completed-stamp" aria-label="Trip selesai">
      <span class="completed-stamp-icon">✈</span>
      <span>TRIP SELESAI</span>
    </div>

    <div class="relative z-10 p-4">
      <div class="flex items-center justify-between gap-2">
        <div class="flex min-w-0 items-center gap-2">
          <h3 class="min-w-0 flex-1 font-bold text-gray-800 text-base truncate">{{ trip.name || 'Trip Tanpa Nama' }}</h3>
          <span class="badge shrink-0" :class="`badge-${statusKey}`" :style="statusBadgeStyle">
            {{ statusMeta.emoji }} {{ statusMeta.label }}
          </span>
        </div>
        <button
          class="btn btn-ghost btn-icon -mr-2 text-gray-400 hover:text-primary"
          type="button"
          title="Edit trip"
          aria-label="Edit trip"
          @click.stop="$emit('edit', trip)"
        >
          ✏️
        </button>
      </div>
      <p class="text-xs text-gray-400 mb-3 flex items-center gap-1">
        📅 {{ dateRange }}
      </p>

      <div class="flex gap-8 flex-wrap">
        <div class="flex flex-col">
          <span class="font-bold text-sm">{{ destCount }}</span>
          <span class="text-xs text-gray-400">Destinasi</span>
        </div>
        <div class="flex flex-col">
        <span class="font-bold text-sm text-[#7A2A3D]">{{ fmtIDR(totalCost) }}</span>
          <span class="text-xs text-gray-400">Est. Biaya</span>
        </div>
        <div class="flex flex-col">
          <span class="font-bold text-sm">⏳ {{ durationLabel }}</span>
          <span class="text-xs text-gray-400">Durasi</span>
        </div>
      </div>
    </div>

    <div v-if="trip.status === 'ongoing'" class="px-4 py-3 border-t border-gray-50">
      <button
        class="btn btn-secondary btn-sm w-full"
        title="Selesaikan trip"
        @click.stop="$emit('complete', trip)"
      >
        ✅ Selesaikan Trip
      </button>
    </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { fmtIDR, fmtDate, getDayCount, STATUS_MAP, TRIP_COLORS } from '@/services/export.js'

const props = defineProps({
  trip: { type: Object, required: true },
})
const emit = defineEmits(['open', 'edit', 'delete', 'complete'])
const touchStartX = ref(null)
const suppressClick = ref(false)
const swipeOpen = ref(false)

function handleClick() {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  if (swipeOpen.value) {
    swipeOpen.value = false
    return
  }
  emit('open', props.trip)
}

function handleTouchStart(event) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function handleTouchEnd(event) {
  if (touchStartX.value === null) return
  const endX = event.changedTouches[0]?.clientX ?? touchStartX.value
  const deltaX = endX - touchStartX.value
  touchStartX.value = null

  if (deltaX > 80 && swipeOpen.value) {
    suppressClick.value = true
    swipeOpen.value = false
    setTimeout(() => { suppressClick.value = false }, 400)
    return
  }

  if (deltaX < -80) {
    suppressClick.value = true
    swipeOpen.value = true
    setTimeout(() => { suppressClick.value = false }, 400)
  }
}

const totalCost = computed(() => {
  const destinations = props.trip.destinations || []
  const destinationCost = destinations.reduce((sum, destination) => sum + (Number(destination.cost) || 0), 0)

  if (!['planned', 'planning'].includes(props.trip.status)) return destinationCost

  const addedPlanningIds = new Set(
    destinations.map(destination => destination.planning_id).filter(Boolean),
  )
  const planningCost = (props.trip.planning || [])
    .filter(item => item.status !== 'added' && !addedPlanningIds.has(item.id))
    .reduce((sum, item) => sum + (Number(item.cost) || 0), 0)

  return destinationCost + planningCost
})
const destCount = computed(() => (props.trip.destinations || []).length)
const colorBg = computed(() => {
  return TRIP_COLORS.find(c => c.value === props.trip.color)?.bg || '#B45A6D'
})
const statusKey = computed(() => ({
  planning: 'planned',
  planned: 'planned',
  ongoing: 'ongoing',
  'on-going': 'ongoing',
  completed: 'completed',
  done: 'completed',
}[props.trip.status] || 'planned'))
const statusMeta = computed(() => STATUS_MAP[statusKey.value])
const statusBadgeStyle = computed(() => ({
  backgroundColor: {
    planned: '#D9A6B2',
    ongoing: '#F9F3F3',
    completed: '#D9A6B2',
  }[statusKey.value],
  color: {
    planned: '#7A2A3D',
    ongoing: '#7A2A3D',
    completed: '#7A2A3D',
  }[statusKey.value],
  borderColor: {
    planned: '#F9F3F3',
    ongoing: '#B45A6D',
    completed: '#F9F3F3',
  }[statusKey.value],
}))

const dateRange = computed(() => {
  if (props.trip.start_date && props.trip.end_date) {
    return `${fmtDate(props.trip.start_date)} — ${fmtDate(props.trip.end_date)}`
  }
  return 'Belum diset'
})
const durationLabel = computed(() => {
  if (!props.trip.start_date || !props.trip.end_date) return '—'
  return `${getDayCount(props.trip.start_date, props.trip.end_date)} Hari`
})
</script>

