<template>
  <div class="relative">
    <button
      class="btn btn-outline btn-sm gap-1.5"
      @click.stop="open = !open"
    >
      💾 Backup
      <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
      </svg>
    </button>

    <!-- Dropdown -->
    <div
      v-if="open"
      v-click-outside="() => open = false"
      class="absolute right-0 top-full mt-1 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden"
    >
      <div class="p-1">
        <button class="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-gray-50 flex items-center gap-2" @click="doBackupDB">
          📦 Export file .db (SQLite)
        </button>
        <button class="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-gray-50 flex items-center gap-2" @click="triggerRestore">
          📥 Import file .db
        </button>
        <div class="border-t border-gray-100 my-1" />
        <button
          v-if="currentTripId"
          class="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-gray-50 flex items-center gap-2 text-secondary"
          @click="doExportExcel"
        >
          📊 Export Excel (trip ini)
        </button>
        <button
          v-else
          class="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-gray-50 flex items-center gap-2 text-secondary"
          @click="openExcelPicker"
        >
          📊 Export Excel
        </button>
        <button class="w-full text-left px-3 py-2.5 text-xs rounded-xl hover:bg-gray-50 flex items-center gap-2" @click="triggerImportExcel">
          📤 Import Excel
        </button>
      </div>
    </div>

    <!-- Hidden file inputs -->
    <input ref="restoreInput" type="file" accept=".db,.json" class="hidden" @change="onRestore" />
    <input ref="importExcelInput" type="file" accept=".xlsx,.xls" class="hidden" @change="onImportExcel" />
  </div>

  <!-- Import Excel Modal -->
  <AppModal v-model="showImportModal" title="📤 Import Excel" confirm-text="Selesai" @confirm="showImportModal = false">
    <div class="text-sm text-gray-600 space-y-2">
      <p>Data yang diimport dari Excel akan ditambahkan ke trip yang sedang aktif.</p>
      <div v-if="importResult" class="bg-[#F9F3F3] text-[#7A2A3D] rounded-xl p-3 text-sm">
        ✅ {{ importResult }}
      </div>
      <div v-if="importError" class="bg-[#D9A6B2] text-primary rounded-xl p-3 text-sm">
        ❌ {{ importError }}
      </div>
    </div>
  </AppModal>

  <!-- Select a trip before exporting from the Dashboard -->
  <AppModal v-model="showExportModal" title="📊 Export Excel" confirm-text="Tutup" @confirm="showExportModal = false">
    <div class="space-y-2">
      <p class="text-sm text-gray-500 mb-3">Pilih trip yang ingin diekspor:</p>
      <button
        v-for="trip in tripStore.trips"
        :key="trip.id"
        type="button"
        class="flex w-full items-center justify-between rounded-xl border border-gray-200 px-3 py-3 text-left transition-colors hover:border-[#F9F3F3] hover:bg-[#D9A6B2]"
        @click="exportExcelForTrip(trip.id)"
      >
        <span class="min-w-0 truncate font-semibold text-gray-700">{{ trip.name }}</span>
        <span class="ml-3 shrink-0 text-[#7A2A3D]">Ekspor ›</span>
      </button>
      <p v-if="!tripStore.trips.length" class="py-5 text-center text-sm text-gray-400">Belum ada trip.</p>
    </div>
    <template #footer>
      <button class="btn btn-mint" @click="showExportModal = false">Batal</button>
    </template>
  </AppModal>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useToastStore } from '@/stores/toastStore.js'
import { backupDB, restoreDB, exportTripExcel, importFromExcel } from '@/services/export.js'
import { useTripStore } from '@/stores/tripStore.js'
import AppModal from '@/components/AppModal.vue'

const toast         = useToastStore()
const tripStore     = useTripStore()
const route         = useRoute()
const open          = ref(false)
const restoreInput  = ref(null)
const importExcelInput = ref(null)
const showImportModal  = ref(false)
const showExportModal  = ref(false)
const importResult  = ref('')
const importError   = ref('')

const currentTripId = ref(route.params.id || null)

// Watch route changes
watch(() => route.params.id, (id) => { currentTripId.value = id || null })

async function doBackupDB() {
  open.value = false
  try {
    await backupDB()
    toast.success('Backup .db berhasil diunduh! 📦')
  } catch (e) {
    toast.error('Gagal backup: ' + e.message)
  }
}

function triggerRestore() {
  open.value = false
  restoreInput.value?.click()
}

async function onRestore(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    await restoreDB(file)
    await tripStore.loadTrips()
    toast.success('Data berhasil dipulihkan! ✅')
  } catch (err) {
    toast.error(err.message)
  }
  e.target.value = ''
}

async function doExportExcel() {
  open.value = false
  if (!currentTripId.value) return
  await exportExcelForTrip(currentTripId.value)
}

async function exportExcelForTrip(tripId) {
  try {
    await tripStore.loadTrip(tripId)
    const trip = tripStore.currentTrip
    if (!trip) throw new Error('Trip tidak ditemukan')
    exportTripExcel(trip)
    toast.success('Export Excel berhasil! 📊')
    showExportModal.value = false
  } catch (e) {
    toast.error('Gagal export: ' + e.message)
  }
}

async function openExcelPicker() {
  open.value = false
  await tripStore.loadTrips()
  showExportModal.value = true
}

function triggerImportExcel() {
  open.value = false
  importResult.value = ''
  importError.value  = ''
  showImportModal.value = true
  setTimeout(() => importExcelInput.value?.click(), 100)
}

async function onImportExcel(e) {
  const file = e.target.files[0]
  if (!file) return
  try {
    const data = await importFromExcel(file)
    importResult.value = `Berhasil membaca ${data.destinations?.length || 0} destinasi dan ${data.rundown?.length || 0} aktivitas dari file Excel.`
    importError.value  = ''
    toast.info('File Excel dibaca. Silakan tambahkan ke trip secara manual.')
  } catch (err) {
    importError.value  = err.message
    importResult.value = ''
  }
  e.target.value = ''
}

// Simple v-click-outside directive inline
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => { if (!el.contains(e.target)) binding.value(e) }
    document.addEventListener('click', el._clickOutside)
  },
  unmounted(el) { document.removeEventListener('click', el._clickOutside) },
}
</script>

