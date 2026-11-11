<template>
  <AppLayout @new-trip="openNewForm">
    <!-- Loading -->
    <div v-if="tripStore.loading" class="text-center py-16 text-gray-400">
      <p class="text-4xl mb-2">✈️</p>
      <p>Memuat data...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="tripStore.trips.length === 0" class="text-center py-20 text-gray-400">
      <p class="text-6xl mb-4">🗺️</p>
      <h3 class="font-bold text-gray-600 text-lg">Belum ada trip</h3>
      <p class="text-sm mt-1 mb-5">Yuk buat rencana trip pertamamu!</p>
      <button class="btn btn-primary" @click="openNewForm">✈️ Buat Trip Baru</button>
    </div>

    <!-- Grid -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <TripCard
        v-for="trip in tripStore.trips"
        :key="trip.id"
        :trip="trip"
        @open="onOpen"
        @edit="onEdit"
        @delete="onDelete"
        @complete="onComplete"
      />
    </div>

    <!-- Trip Form Modal -->
    <TripFormModal
      v-model="showForm"
      :trip="editTarget"
      @saved="onSaved"
    />
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useTripStore }   from '@/stores/tripStore.js'
import { useToastStore }  from '@/stores/toastStore.js'
import AppLayout          from '@/components/AppLayout.vue'
import TripCard           from '@/components/TripCard.vue'
import TripFormModal      from '@/components/TripFormModal.vue'

const tripStore  = useTripStore()
const toast      = useToastStore()
const router     = useRouter()
const showForm   = ref(false)
const editTarget = ref(null)

onMounted(() => tripStore.loadTrips())

function onOpen(trip) {
  router.push(`/trip/${trip.id}`)
}

function openNewForm() {
  editTarget.value = null
  showForm.value = true
}

function onEdit(trip) {
  editTarget.value = trip
  showForm.value = true
}

async function onDelete(trip) {
  if (!confirm(`Hapus trip "${trip.name}"? Data tidak bisa dikembalikan.`)) return
  await tripStore.removeTrip(trip.id)
  toast.info('Trip dihapus.')
}

async function onComplete(trip) {
  if (!confirm(`Tandai trip "${trip.name}" sebagai selesai?`)) return
  await tripStore.editTrip(trip.id, { status: 'completed' })
  toast.success('Trip selesai! 🎉')
}

async function onSaved(data) {
  try {
    if (editTarget.value) {
      await tripStore.editTrip(editTarget.value.id, data)
      toast.success('Trip diperbarui! ✅')
    } else {
      await tripStore.addTrip(data)
      toast.success('Trip baru dibuat! 🎉')
    }
  } catch (error) {
    console.error('Gagal menyimpan trip:', error)
    toast.error(`Trip gagal disimpan: ${error.message || 'periksa database'}`)
    return
  }
  editTarget.value = null
}
</script>

