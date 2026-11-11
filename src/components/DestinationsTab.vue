<template>
  <div>
    <!-- Budget Summary -->
    <div class="rounded-2xl p-5 text-white mb-5" style="background: linear-gradient(135deg, #7A2A3D 0%, #B45A6D 100%)">
      <p class="text-xs uppercase tracking-widest opacity-80 mb-1">💰 Total Estimasi Biaya</p>
      <p class="text-3xl font-extrabold mb-4">{{ fmtIDR(grandTotal) }}</p>
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <div
          v-for="cat in activeCats"
          :key="cat.value"
          class="bg-white/20 rounded-xl px-3 py-2"
        >
          <p class="text-xs opacity-80">{{ cat.icon }} {{ cat.label }}</p>
          <p class="font-bold text-sm">{{ fmtIDR(catTotals[cat.value]) }}</p>
        </div>
      </div>
    </div>

    <!-- Header -->
    <div class="tab-action-bar flex items-center justify-between mb-3 flex-wrap gap-2">
      <h3 class="font-bold text-gray-800">📍 Destinasi ({{ destinations.length }})</h3>
      <button class="btn btn-mint btn-sm" @click="openAdd">+ Tambah Destinasi</button>
    </div>

    <div v-if="destinations.length" class="planning-filter-bar" role="tablist" aria-label="Filter kategori destinasi">
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

    <!-- List -->
    <div v-if="destinations.length === 0" class="text-center py-16 text-gray-400">
      <p class="text-5xl mb-3">🏖️</p>
      <p class="font-semibold text-gray-600">Belum ada destinasi</p>
      <p class="text-sm mt-1">Tambahkan tempat wisata yang ingin dikunjungi!</p>
    </div>

    <div v-else-if="filteredDestinations.length === 0" class="card p-10 text-center text-gray-400">
      <p class="text-4xl mb-3">🔎</p>
      <p class="font-semibold text-gray-600">Belum ada destinasi di kategori ini</p>
      <button class="btn btn-burgundy btn-sm mt-4" @click="activeCategory = 'all'">Tampilkan Semua</button>
    </div>

    <div v-else class="space-y-4">
      <div
        v-for="group in visibleDestinationGroups"
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
          <div v-for="dest in group.items" :key="dest.id" class="relative isolate overflow-hidden bg-white" :class="{ 'rounded-2xl': activeCategory !== 'all' }">
            <button
              class="trash-action absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center rounded-r-2xl"
              aria-label="Hapus destinasi"
              @click.stop="handleDelete(dest)"
            >
              <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
              </svg>
            </button>
            <div
              class="destination-card relative z-10 flex cursor-pointer items-start gap-3 bg-white p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md"
              :class="{ card: activeCategory !== 'all' }"
              :style="{ transform: `translateX(${swipeOpenId === dest.id ? -80 : 0}px)`, touchAction: 'pan-y' }"
              @click="handleCardClick(dest)"
              @touchstart.passive="handleTouchStart"
              @touchend="handleTouchEnd(dest, $event)"
            >
              <!-- Info -->
              <div class="flex-1 min-w-0">
                <p class="font-bold text-xs text-gray-800 truncate">{{ dest.name }}</p>
                <p v-if="dest.location" class="text-xs text-gray-400 truncate">📍 {{ dest.location }}</p>
                <p v-if="dest.notes" class="text-xs text-gray-400 italic mt-0.5 truncate">{{ dest.notes }}</p>
              </div>

              <!-- Cost -->
              <div class="destination-cost flex-shrink-0 self-center text-center">
                <p class="font-extrabold text-[#7A2A3D] text-sm">{{ fmtIDR(dest.cost) }}</p>
                <p v-if="dest.category === 'ticket' && Number(dest.price_per_person) > 0" class="text-[10px] text-gray-400 whitespace-nowrap">
                  {{ fmtIDR(dest.price_per_person) }}/orang × {{ dest.people_count || 1 }} orang
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Destination Modal -->
    <AppModal
      v-model="showModal"
      :title="editTarget ? '✏️ Edit Destinasi' : '➕ Tambah Destinasi'"
      :confirm-text="editTarget ? 'Simpan' : 'Tambah'"
      @confirm="submit"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <div>
          <label class="form-label">Nama Destinasi *</label>
          <input v-model="form.name" class="form-control" placeholder="Contoh: Pantai Kuta, Bali" @blur="form.name = formatTitleText(form.name)" />
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
              :options="CATEGORIES"
              :scrollable="false"
              :visible="showModal"
              button-class="form-control form-control-tall min-w-0"
              @change="handleCategoryChange"
            />
          </div>
          <div v-if="form.category !== 'ticket'">
            <label class="form-label">Estimasi Biaya (IDR)</label>
            <input
              :value="costInput"
              type="text"
              inputmode="numeric"
              class="form-control form-control-tall min-w-0"
              placeholder="0"
              @input="onCostInput"
            />
          </div>
          <div v-else>
            <label class="form-label">Total Tiket</label>
            <div class="form-control form-control-tall flex items-center bg-[#D9A6B2] font-bold text-[#7A2A3D]">
              {{ fmtIDR(ticketTotal) }}
            </div>
          </div>
        </div>
        <div v-if="form.category === 'ticket'" class="grid grid-cols-2 gap-3">
          <div>
            <label class="form-label">Harga / Orang (IDR)</label>
            <input
              :value="priceInput"
              type="text"
              inputmode="numeric"
              class="form-control form-control-tall min-w-0"
              placeholder="Rp 0"
              @input="onPriceInput"
            />
          </div>
          <div>
            <label class="form-label">Jumlah Orang</label>
            <input
              :value="peopleInput"
              type="number"
              min="1"
              step="1"
              class="form-control form-control-tall min-w-0"
              placeholder="1"
              @input="onPeopleInput"
            />
          </div>
        </div>
        <div>
          <label class="form-label">Catatan (opsional)</label>
          <textarea v-model="form.notes" class="form-control" rows="2" placeholder="Jam buka, tips, dll..."></textarea>
        </div>
      </form>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import AppModal from '@/components/AppModal.vue'
import CustomDropdown from '@/components/CustomDropdown.vue'
import { formatTitleText } from '@/services/text.js'
import { CATEGORIES, categoryMeta, fmtIDR } from '@/services/export.js'
import { useTripStore } from '@/stores/tripStore.js'
import { useToastStore } from '@/stores/toastStore.js'

const props = defineProps({ tripId: String })
const tripStore = useTripStore()
const toast     = useToastStore()

const destinations = computed(() => tripStore.currentTrip?.destinations || [])
const activeCategory = ref('all')
const categoryFilters = computed(() => [
  { value: 'all', label: 'Semua', icon: '📋', count: destinations.value.length },
  ...CATEGORIES.map(category => ({
    ...category,
    count: destinations.value.filter(destination => destination.category === category.value).length,
  })),
])
const filteredDestinations = computed(() => activeCategory.value === 'all'
  ? destinations.value
  : destinations.value.filter(destination => destination.category === activeCategory.value))
const visibleDestinationGroups = computed(() => {
  if (activeCategory.value !== 'all') {
    const category = categoryMeta(activeCategory.value)
    return [{ ...category, items: filteredDestinations.value }]
  }

  return CATEGORIES
    .map(category => ({
      ...category,
      items: destinations.value.filter(destination => destination.category === category.value),
    }))
    .filter(group => group.items.length)
})

const catTotals = computed(() => {
  const t = {}
  CATEGORIES.forEach(c => { t[c.value] = 0 })
  destinations.value.forEach(d => {
    t[d.category] = (t[d.category] || 0) + (Number(d.cost) || 0)
  })
  return t
})
const grandTotal  = computed(() => destinations.value.reduce((s, d) => s + (Number(d.cost) || 0), 0))
const activeCats  = computed(() => CATEGORIES.filter(c => catTotals.value[c.value] > 0))

const catBg = {
  transport:     'bg-[#B45A6D]',
  accommodation: 'bg-[#7A2A3D]',
  wisata:        'bg-[#7A2A3D]',
  food:          'bg-[#B45A6D]',
  ticket:        'bg-[#7A2A3D]',
  shopping:      'bg-[#B45A6D]',
  souvenir:      'bg-[#B45A6D]',
  other:         'bg-[#F9F3F3]',
}

// Modal state
const showModal  = ref(false)
const editTarget = ref(null)
const defForm    = () => ({ name: '', location: '', category: 'other', cost: 0, price_per_person: 0, people_count: 1, notes: '' })
const form       = ref(defForm())
const costInput  = ref('')
const priceInput = ref('')
const peopleInput = ref('1')
const touchStartX = ref(null)
const suppressClick = ref(false)
const swipeOpenId = ref(null)

function handleCardClick(dest) {
  if (suppressClick.value) {
    suppressClick.value = false
    return
  }
  if (swipeOpenId.value) {
    swipeOpenId.value = null
    return
  }
  openEdit(dest)
}

function handleTouchStart(event) {
  touchStartX.value = event.changedTouches[0]?.clientX ?? null
}

function handleTouchEnd(dest, event) {
  if (touchStartX.value === null) return
  const endX = event.changedTouches[0]?.clientX ?? touchStartX.value
  const deltaX = endX - touchStartX.value
  touchStartX.value = null
  if (deltaX > 80 && swipeOpenId.value === dest.id) {
    suppressClick.value = true
    swipeOpenId.value = null
    setTimeout(() => { suppressClick.value = false }, 400)
    return
  }
  if (deltaX < -80) {
    suppressClick.value = true
    swipeOpenId.value = dest.id
    setTimeout(() => { suppressClick.value = false }, 400)
  }
}

function formatNumberID(value) {
  return Number(value) > 0 ? `Rp ${Number(value).toLocaleString('id-ID')}` : ''
}

const ticketTotal = computed(() => (Number(form.value.price_per_person) || 0) * (Number(form.value.people_count) || 0))

function syncCostInput() {
  costInput.value = formatNumberID(form.value.cost)
}

function onCostInput(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.value.cost = digits ? Number(digits) : 0
  costInput.value = digits ? `Rp ${Number(digits).toLocaleString('id-ID')}` : ''
}

function syncTicketInputs() {
  priceInput.value = formatNumberID(form.value.price_per_person)
  peopleInput.value = form.value.people_count ? String(form.value.people_count) : ''
}

function updateTicketCost() {
  form.value.cost = ticketTotal.value
}

function onPriceInput(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.value.price_per_person = digits ? Number(digits) : 0
  priceInput.value = digits ? `Rp ${Number(digits).toLocaleString('id-ID')}` : ''
  updateTicketCost()
}

function onPeopleInput(event) {
  const digits = event.target.value.replace(/\D/g, '')
  form.value.people_count = digits ? Number(digits) : 0
  peopleInput.value = digits
  updateTicketCost()
}

function handleCategoryChange() {
  if (form.value.category === 'ticket') {
    if (!form.value.price_per_person) form.value.price_per_person = form.value.cost
    if (!form.value.people_count) form.value.people_count = 1
    syncTicketInputs()
    updateTicketCost()
  }
}

function openAdd() {
  editTarget.value = null
  form.value = defForm()
  syncCostInput()
  syncTicketInputs()
  showModal.value = true
}

function openEdit(dest) {
  editTarget.value = dest
  form.value = {
    name: dest.name,
    location: dest.location || '',
    category: dest.category,
    cost: dest.cost,
    price_per_person: dest.price_per_person || (dest.category === 'ticket' ? dest.cost : 0),
    people_count: dest.people_count || 1,
    notes: dest.notes,
  }
  syncCostInput()
  syncTicketInputs()
  showModal.value = true
}

async function submit() {
  form.value.name = formatTitleText(form.value.name)
  form.value.location = formatTitleText(form.value.location)
  if (!form.value.name.trim()) { toast.error('Nama destinasi wajib diisi!'); return }
  if (form.value.category === 'ticket') updateTicketCost()
  const payload = form.value.category === 'ticket'
    ? { ...form.value, cost: ticketTotal.value }
    : { ...form.value, price_per_person: 0, people_count: 1 }
  if (editTarget.value) {
    await tripStore.editDest(props.tripId, editTarget.value.id, payload)
    toast.success('Destinasi diperbarui! ✅')
  } else {
    await tripStore.addDest(props.tripId, payload)
    toast.success('Destinasi ditambahkan! ✅')
  }
  showModal.value = false
}

async function handleDelete(dest) {
  if (!confirm(`Hapus "${dest.name}"?`)) return
  await tripStore.removeDest(props.tripId, dest.id)
  toast.info('Destinasi dihapus.')
}
</script>

