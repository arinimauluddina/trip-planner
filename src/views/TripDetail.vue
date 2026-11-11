<template>
  <AppLayout
    :detail-tabs="Boolean(trip)"
    :active-tab="tab"
    :detail-title="trip?.name || ''"
    :detail-date="dateRange"
    @update:activeTab="tab = $event"
  >
    <!-- Loading -->
    <div v-if="tripStore.loading" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-2">✈️</p>
      <p>Memuat trip...</p>
    </div>

    <!-- Not Found -->
    <div v-else-if="!trip" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-3">🔍</p>
      <p class="font-semibold">Trip tidak ditemukan.</p>
      <RouterLink to="/" class="btn btn-primary mt-4 inline-flex">← Kembali</RouterLink>
    </div>

    <template v-else>
      <!-- Tab Content -->
      <PlanningTab     v-if="tab === 'planning'"     :trip-id="id" />
      <DestinationsTab v-if="tab === 'destinations'" :trip-id="id" />
      <RundownTab      v-if="tab === 'rundown'"      :trip-id="id" />
    </template>

  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useTripStore }    from '@/stores/tripStore.js'
import { fmtDate } from '@/services/export.js'
import AppLayout           from '@/components/AppLayout.vue'
import DestinationsTab     from '@/components/DestinationsTab.vue'
import RundownTab          from '@/components/RundownTab.vue'
import PlanningTab         from '@/components/PlanningTab.vue'

const props    = defineProps({ id: String })
const tripStore = useTripStore()
const tab       = ref('destinations')

onMounted(() => tripStore.loadTrip(props.id))

const trip      = computed(() => tripStore.currentTrip)
function defaultTabForStatus(status) {
  if (status === 'planned') return 'planning'
  if (status === 'ongoing') return 'rundown'
  return 'destinations'
}

watch(trip, (value) => {
  if (value) tab.value = defaultTabForStatus(value.status)
}, { immediate: true })

const dateRange = computed(() =>
  trip.value?.start_date && trip.value?.end_date
    ? `${fmtDate(trip.value.start_date)} — ${fmtDate(trip.value.end_date)}`
    : 'Belum diset'
)

</script>

