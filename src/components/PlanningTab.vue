<template>
  <div class="relative">
    <div class="fixed bottom-4 right-4 z-40">
      <button
        class="btn btn-mint btn-icon h-12 w-12 rounded-full p-0 text-xl shadow-lg"
        title="Tambah Planning"
        aria-label="Tambah Planning"
        @click="openAdd"
      >
        +
      </button>
    </div>

    <div v-if="planning.length" class="planning-filter-bar" role="tablist" aria-label="Filter kategori planning">
      <button
        v-for="filter in categoryFilters"
        :key="filter.value"
        type="button"
        class="planning-filter"
        :class="{ active: activeCategory === filter.value }"
        role="tab"
        :aria-selected="activeCategory === filter.value"
        @click="activeCategory = filter.value"
      >
        <span>{{ filter.icon }}</span>
        <span>{{ filter.label }}</span>
        <span class="planning-filter-count">{{ filter.count }}</span>
      </button>
    </div>

    <div v-if="planning.length === 0" class="card p-10 text-center text-gray-400">
      <p class="text-5xl mb-3">💡</p>
      <p class="font-bold text-gray-700 text-base">Belum ada planning</p>
      <p class="text-xs mt-1 mb-4">Tambahkan hotel, wisata, atau pilihan tempat lainnya.</p>
      <button class="btn btn-mint btn-sm" @click="openAdd">+ Tambah Planning</button>
    </div>

    <div v-else-if="filteredPlanning.length === 0" class="card p-10 text-center text-gray-400">
      <p class="text-4xl mb-3">🔎</p>
      <p class="font-bold text-gray-700 text-base">Belum ada item di kategori ini</p>
      <button class="btn btn-burgundy btn-sm mt-4" @click="activeCategory = 'all'">Tampilkan Semua</button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="group in visiblePlanningGroups"
        :key="group.value"
        :class="activeCategory === 'all'
          ? 'overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm'
          : 'space-y-3'"
      >
        <div
          v-if="activeCategory === 'all'"
          class="flex items-center justify-between border-b border-gray-100 bg-gray-50/70 px-4 py-2.5"
        >
          <div class="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wide text-gray-700">
            <span>{{ group.icon }}</span>
            <span>{{ group.label }}</span>
          </div>
          <span class="rounded-full bg-white px-2 py-0.5 text-[11px] font-semibold text-gray-400">
            {{ group.items.length }} item
          </span>
        </div>

        <div :class="activeCategory === 'all' ? 'divide-y divide-gray-100' : 'space-y-3'">
          <div
            v-for="item in group.items"
            :key="item.id"
            :class="activeCategory === 'all'
              ? 'relative isolate overflow-hidden bg-white'
              : 'relative isolate overflow-hidden rounded-2xl bg-white'"
          >
            <button
              class="trash-action absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center rounded-r-2xl"
              aria-label="Hapus planning"
              @click.stop="handleDelete(item)"
            >
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
              </svg>
            </button>
            <div
              :class="activeCategory === 'all'
                ? 'planning-card relative z-10 cursor-pointer bg-white p-2 transition-all duration-200 hover:bg-gray-50'
                : 'planning-card card relative z-10 cursor-pointer p-2 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md'"
              :style="{ transform: `translateX(${swipeOpenId === item.id ? -80 : 0}px)`, touchAction: 'pan-y' }"
              @click="handleCardClick(item)"
              @touchstart.passive="handleTouchStart"
              @touchend="handleTouchEnd(item, $event)"
            >
              <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                <div class="min-w-0">
                  <p class="truncate font-bold text-xs text-gray-800">{{ item.name }}</p>
                  <a
                    v-if="item.link"
                    :href="item.link"
                    target="_blank"
                    rel="noreferrer"
                    class="mt-0.5 block truncate text-[10px] font-semibold text-[#7A2A3D]"
                    @click.stop
                  >🔗 {{ item.link }}</a>
                  <p v-if="item.notes" class="mt-0.5 truncate text-[10px] text-gray-400">📝 {{ item.notes }}</p>
                </div>
                <p class="font-extrabold text-center text-[#7A2A3D] text-xs">{{ fmtIDR(item.cost) }}</p>
                <label
                  class="flex items-center justify-self-end text-[11px] font-semibold text-[#7A2A3D] cursor-pointer select-none"
                  :class="{ 'opacity-70': item.status === 'added' }"
                  title="Masuk Destinasi"
                  aria-label="Masuk Destinasi"
                  @click.stop
                >
                  <input
                    type="checkbox"
                    class="planning-destination-check"
                    :checked="item.status === 'added'"
                    @change="toggleDestination(item, $event)"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <AppModal
      v-model="showModal"
      :title="editTarget ? '✏️ Edit Planning' : '💡 Tambah Planning'"
      :confirm-text="editTarget ? 'Simpan' : 'Tambah'"
      @confirm="submit"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="form-label">Nama Tempat *</label>
          <input v-model="form.name" class="form-control" placeholder="Contoh: Hotel dekat Malioboro" @blur="form.name = formatTitleText(form.name)" />
        </div>

        <div>
          <label class="form-label">Lokasi (opsional)</label>
          <input v-model="form.location" class="form-control" placeholder="Contoh: Jalan Malioboro, Yogyakarta" @blur="form.location = formatTitleText(form.location)" />
        </div>

        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Kategori</label>
            <CustomDropdown
              v-model="form.category"
              :options="PLANNING_CATEGORIES"
              :scrollable="false"
              :visible="showModal"
              button-class="form-control form-control-tall min-w-0"
            />
          </div>
          <div>
            <label class="form-label">Estimasi Harga (IDR)</label>
            <input
              :value="costInput"
              type="text"
              inputmode="numeric"
              class="form-control form-control-tall min-w-0"
              placeholder="Rp 0"
              @input="onCostInput"
            />
          </div>
        </div>

        <div>
          <label class="form-label">Link / Referensi (opsional)</label>
          <input v-model="form.link" type="url" class="form-control" placeholder="https://..." />
        </div>

        <div>
          <label class="form-label">Catatan (opsional)</label>
          <textarea v-model="form.notes" class="form-control" rows="3" placeholder="Review, alamat, fasilitas, dan lain-lain..."></textarea>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppModal from '@/components/AppModal.vue'
import CustomDropdown from '@/components/CustomDropdown.vue'
import { formatTitleText } from '@/services/text.js'
import { fmtIDR, PLANNING_CATEGORIES } from '@/services/export.js'
import {
  addPlanningItem,
  updatePlanningItem,
  deletePlanningItem,
  addDestination,
  deleteDestinationByPlanning,
} from '@/services/db.js'
import { useTripStore } from '@/stores/tripStore.js'
import { useToastStore } from '@/stores/toastStore.js'

const props = defineProps({ tripId: String })
const tripStore = useTripStore()
const toast = useToastStore()
const planning = computed(() => tripStore.currentTrip?.planning || [])
const activeCategory = ref('all')
const categoryFilters = computed(() => [
  { value: 'all', label: 'Semua', icon: '📋', count: planning.value.length },
  ...PLANNING_CATEGORIES.map(category => ({
    ...category,
    count: planning.value.filter(item => item.category === category.value).length,
  })),
])
const filteredPlanning = computed(() => activeCategory.value === 'all'
  ? planning.value
  : planning.value.filter(item => item.category === activeCategory.value))
const visiblePlanningGroups = computed(() => {
  if (activeCategory.value !== 'all') {
    const category = planningMeta(activeCategory.value)
    return [{ ...category, items: filteredPlanning.value }]
  }

  return PLANNING_CATEGORIES
    .map(category => ({
      ...category,
      items: planning.value.filter(item => item.category === category.value),
    }))
    .filter(group => group.items.length)
})

const showModal = ref(false)
const editTarget = ref(null)
const costInput = ref('')
const touchStartX = ref(null)
const suppressClick = ref(false)
const swipeOpenId = ref(null)
const defaultForm = () => ({ name: '', location: '', category: 'wisata', cost: 0, link: '', notes: '', status: 'considering' })
const form = ref(defaultForm())

function planningMeta(category) {
  return PLANNING_CATEGORIES.find(item => item.value === category) || PLANNING_CATEGORIES.at(-1)
}

function handleCardClick(item) {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  if (swipeOpenId.value) {
    swipeOpenId.value = null
    return
  }
  openEdit(item)
}

function handleTouchStart(event) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function handleTouchEnd(item, event) {
  if (touchStartX.value === null) return
  const endX = event.changedTouches[0]?.clientX ?? touchStartX.value
  const deltaX = endX - touchStartX.value
  touchStartX.value = null
  if (deltaX > 80 && swipeOpenId.value === item.id) {
    suppressClick.value = true
    swipeOpenId.value = null
    setTimeout(() => { suppressClick.value = false }, 400)
    return
  }
  if (deltaX < -80) {
    suppressClick.value = true
    swipeOpenId.value = item.id
    setTimeout(() => { suppressClick.value = false }, 400)
  }
}

function formatNumberID(value) {
  return Number(value) > 0 ? `Rp ${Number(value).toLocaleString('id-ID')}` : ''
}

function syncCostInput() {
  costInput.value = formatNumberID(form.value.cost)
}

function onCostInput(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.value.cost = digits ? Number(digits) : 0
  costInput.value = digits ? `Rp ${Number(digits).toLocaleString('id-ID')}` : ''
}

function openAdd() {
  editTarget.value = null
  form.value = defaultForm()
  syncCostInput()
  showModal.value = true
}

function openEdit(item) {
  editTarget.value = item
  form.value = { name: item.name, location: item.location || '', category: item.category, cost: item.cost, link: item.link || '', notes: item.notes || '', status: item.status || 'considering' }
  syncCostInput()
  showModal.value = true
}

async function savePlanning(data) {
  if (typeof tripStore.addPlanning === 'function') {
    return tripStore.addPlanning(props.tripId, data)
  }

  // Compatibility fallback for a stale Pinia instance left by Vite HMR.
  const item = await addPlanningItem(props.tripId, data)
  if (tripStore.currentTrip?.id === props.tripId) {
    if (!tripStore.currentTrip.planning) tripStore.currentTrip.planning = []
    tripStore.currentTrip.planning.push(item)
  }
  return item
}

async function editPlanning(itemId, patch) {
  if (typeof tripStore.editPlanning === 'function') {
    return tripStore.editPlanning(props.tripId, itemId, patch)
  }

  // Compatibility fallback for a stale Pinia instance left by Vite HMR.
  await updatePlanningItem(props.tripId, itemId, patch)
  const item = (tripStore.currentTrip?.planning || []).find(entry => entry.id === itemId)
  if (item) Object.assign(item, patch)
}

async function removePlanning(itemId) {
  if (typeof tripStore.removePlanning === 'function') {
    return tripStore.removePlanning(props.tripId, itemId)
  }

  // Compatibility fallback for a stale Pinia instance left by Vite HMR.
  await deletePlanningItem(props.tripId, itemId)
  if (tripStore.currentTrip?.id === props.tripId) {
    tripStore.currentTrip.planning = (tripStore.currentTrip.planning || []).filter(item => item.id !== itemId)
  }
}

async function addDestinationFromPlanning(item) {
  const category = planningMeta(item.category)
  const destination = await addDestination(props.tripId, {
    planning_id: item.id,
    name: item.name,
    location: item.location,
    category: category.destinationCategory,
    cost: item.cost,
    notes: item.notes,
  })
  if (tripStore.currentTrip?.id === props.tripId) {
    tripStore.currentTrip.destinations.push(destination)
  }
}

async function removeDestinationFromPlanning(item) {
  const category = planningMeta(item.category)
  const fallback = {
    name: item.name,
    category: category.destinationCategory,
    legacyCategory: category.destinationCategory === 'wisata' ? 'other' : category.destinationCategory,
    cost: item.cost,
  }
  if (typeof tripStore.removeDestForPlanning === 'function') {
    return tripStore.removeDestForPlanning(props.tripId, item.id, fallback)
  }

  // Compatibility fallback for a stale Pinia instance left by Vite HMR.
  await deleteDestinationByPlanning(props.tripId, item.id, fallback)
  if (tripStore.currentTrip?.id === props.tripId) {
    tripStore.currentTrip.destinations = tripStore.currentTrip.destinations.filter(destination => {
      if (destination.planning_id === item.id) return false
      const isLegacyMatch = !destination.planning_id &&
        destination.name === fallback.name &&
        (destination.category === fallback.category || destination.category === fallback.legacyCategory) &&
        Number(destination.cost) === Number(fallback.cost)
      return !isLegacyMatch
    })
  }
}

async function submit() {
  form.value.name = formatTitleText(form.value.name)
  form.value.location = formatTitleText(form.value.location)
  if (!form.value.name.trim()) {
    toast.error('Nama planning wajib diisi!')
    return
  }
  try {
    if (editTarget.value) {
      await editPlanning(editTarget.value.id, { ...form.value })
      toast.success('Planning diperbarui! ✅')
    } else {
      await savePlanning({ ...form.value })
      toast.success('Planning ditambahkan! ✅')
    }
    showModal.value = false
  } catch (error) {
    console.error('Gagal menyimpan planning:', error)
    toast.error(`Planning gagal disimpan: ${error.message || 'periksa database'}`)
  }
}

async function promoteToDestination(item) {
  const category = planningMeta(item.category)
  const alreadyAdded = (tripStore.currentTrip?.destinations || []).some(destination => (
    destination.planning_id === item.id || (
      !destination.planning_id &&
      destination.name === item.name &&
      (destination.category === category.destinationCategory ||
        (category.destinationCategory === 'wisata' && destination.category === 'other')) &&
      Number(destination.cost) === Number(item.cost)
    )
  ))

  if (!alreadyAdded) {
    await addDestinationFromPlanning(item)
  }
  await editPlanning(item.id, { status: 'added' })
  toast.success(`${item.name} masuk ke Destinasi! ✅`)
}

async function toggleDestination(item, event) {
  if (item.status === 'added' && !event.target.checked) {
    try {
      await removeDestinationFromPlanning(item)
      await editPlanning(item.id, { status: 'considering' })
      toast.info(`${item.name} dihapus dari Destinasi.`)
    } catch (error) {
      event.target.checked = true
      console.error('Gagal menghapus planning dari destinasi:', error)
      toast.error(`Gagal menghapus dari Destinasi: ${error.message || 'periksa database'}`)
    }
    return
  }

  if (!event.target.checked || item.status === 'added') return

  try {
    await promoteToDestination(item)
  } catch (error) {
    event.target.checked = false
    console.error('Gagal memasukkan planning ke destinasi:', error)
    toast.error(`Gagal memasukkan ke Destinasi: ${error.message || 'periksa database'}`)
  }
}

async function handleDelete(item) {
  if (!confirm(`Hapus planning "${item.name}"?`)) return
  await removePlanning(item.id)
  toast.info('Planning dihapus.')
}
</script>
