<template>
  <AppLayout @new-trip="router.push('/')">
    <div class="space-y-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <h1 class="text-xl font-extrabold text-gray-800">📍 Daftar Kota</h1>
          <p class="mt-1 text-sm text-gray-400">Simpan tempat dan catatan bebas untuk tiap kota.</p>
        </div>
        <button class="btn btn-burgundy btn-sm shrink-0" @click="openAdd">+ Kota</button>
      </div>

      <div v-if="cityStore.loading" class="card p-8 text-center text-gray-400">Memuat daftar kota...</div>

      <div v-else-if="!cityStore.pages.length" class="card p-8 text-center">
        <div class="mb-3 text-5xl">🗺️</div>
        <h2 class="text-lg font-extrabold text-gray-700">Belum ada kota</h2>
        <p class="mt-1 text-sm text-gray-400">Tambahkan kota untuk mulai menulis daftar tempat, makanan, atau tips.</p>
        <button class="btn btn-burgundy mt-5" @click="openAdd">+ Tambah Kota</button>
      </div>

      <div v-else class="grid gap-4 sm:grid-cols-2">
        <div v-for="page in cityStore.pages" :key="page.id" class="relative overflow-hidden rounded-2xl">
          <button
            class="trash-action absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center rounded-r-2xl"
            aria-label="Hapus kota"
            @click.stop="removeCity(page)"
          >
            <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
            </svg>
          </button>
          <article
            class="card relative z-10 flex cursor-pointer items-center gap-3 p-4 transition-transform duration-200 hover:shadow-md"
            :style="{ transform: `translateX(${cardOffset(page.id)}px)`, touchAction: 'pan-y' }"
            @pointerdown="startSwipe(page.id, $event)"
            @pointermove="moveSwipe($event)"
            @pointerup="endSwipe(page.id)"
            @pointercancel="cancelSwipe"
            @click="openPage(page.id)"
          >
            <div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#D9A6B2] text-xs" style="font-size: 12px;">
              {{ page.icon || '📍' }}
            </div>
            <h2 class="truncate text-xs font-extrabold text-gray-800" style="font-size: 12px; line-height: 1.25;">{{ page.name }}</h2>
          </article>
        </div>
      </div>
    </div>

    <AppModal
      v-model="showModal"
      :title="editTarget ? '✏️ Edit Kota' : '📍 Tambah Kota'"
      :confirm-text="editTarget ? 'Simpan' : 'Tambah'"
      @confirm="submit"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <label class="form-label">NAMA KOTA *
          <input v-model.trim="form.name" class="form-control mt-1" placeholder="Contoh: Wonosobo" autofocus @blur="form.name = formatTitleText(form.name)" />
        </label>
        <p class="text-xs text-gray-400">Isi daftar dan catatan kotanya setelah halaman dibuat.</p>
      </form>
    </AppModal>
  </AppLayout>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import AppModal from '@/components/AppModal.vue'
import { useCityStore } from '@/stores/cityStore.js'
import { useToastStore } from '@/stores/toastStore.js'
import { formatTitleText } from '@/services/text.js'

const router = useRouter()
const cityStore = useCityStore()
const toast = useToastStore()
const showModal = ref(false)
const editTarget = ref(null)
const form = ref({ name: '', icon: '📍' })
const openSwipeId = ref(null)
const swipe = ref({ id: null, startX: 0, deltaX: 0, dragging: false })
const swipeMoved = ref(false)

onMounted(() => cityStore.loadPages())

function openAdd() {
  editTarget.value = null
  form.value = { name: '', icon: '📍' }
  showModal.value = true
}

function openEdit(page) {
  editTarget.value = page
  form.value = { name: page.name, icon: page.icon || '📍' }
  showModal.value = true
}

function openPage(id) {
  if (swipeMoved.value) {
    swipeMoved.value = false
    return
  }
  if (openSwipeId.value) {
    openSwipeId.value = null
    swipe.value.deltaX = 0
    return
  }
  router.push(`/cities/${id}`)
}

function startSwipe(id, event) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (openSwipeId.value && openSwipeId.value !== id) openSwipeId.value = null
  swipe.value = { id, startX: event.clientX, deltaX: openSwipeId.value === id ? -92 : 0, dragging: true }
  swipeMoved.value = false
  event.currentTarget.setPointerCapture?.(event.pointerId)
}

function moveSwipe(event) {
  if (!swipe.value.dragging) return
  const delta = event.clientX - swipe.value.startX
  if (Math.abs(delta) > 8) swipeMoved.value = true
  if (delta < 0) {
    const offset = openSwipeId.value === swipe.value.id ? delta - 92 : delta
    swipe.value.deltaX = Math.max(offset, -92)
  } else if (openSwipeId.value === swipe.value.id) {
    swipe.value.deltaX = Math.min(delta - 92, 0)
  } else {
    swipe.value.deltaX = 0
  }
}

function endSwipe(id) {
  if (!swipe.value.dragging || swipe.value.id !== id) return
  swipe.value.dragging = false
  if (swipe.value.deltaX <= -48) {
    openSwipeId.value = id
    swipe.value.deltaX = -92
  } else {
    openSwipeId.value = null
    swipe.value.deltaX = 0
  }
  setTimeout(() => { swipeMoved.value = false }, 0)
}

function cancelSwipe() {
  swipe.value.dragging = false
  swipe.value.deltaX = openSwipeId.value ? -92 : 0
  swipeMoved.value = false
}

function cardOffset(id) {
  if (openSwipeId.value === id) return -92
  if (swipe.value.id === id) return swipe.value.deltaX
  return 0
}

async function submit() {
  form.value.name = formatTitleText(form.value.name)
  if (!form.value.name) {
    toast.error('Nama kota wajib diisi')
    return
  }
  if (editTarget.value) {
    await cityStore.editPage(editTarget.value.id, form.value)
    toast.success('Kota diperbarui')
  } else {
    await cityStore.addPage(form.value)
    toast.success('Kota ditambahkan')
  }
  showModal.value = false
}

async function removeCity(page) {
  if (!window.confirm(`Hapus halaman ${page.name}?`)) return
  await cityStore.removePage(page.id)
  toast.success('Kota dihapus')
}

</script>
