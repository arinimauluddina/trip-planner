<template>
  <AppLayout @new-trip="router.push('/')">
    <div v-if="cityStore.loading" class="card p-8 text-center text-gray-400">Memuat halaman kota...</div>

    <div v-else-if="!page" class="card p-8 text-center">
      <div class="mb-3 text-4xl">🗺️</div>
      <h1 class="text-lg font-extrabold text-gray-700">Kota tidak ditemukan</h1>
      <RouterLink to="/cities" class="btn btn-burgundy mt-5">← Kembali ke Daftar Kota</RouterLink>
    </div>

    <div v-else class="space-y-4">
      <RouterLink to="/cities" class="inline-flex items-center text-sm font-bold text-[#7A2A3D] hover:underline">
        ← Daftar Kota
      </RouterLink>

      <section class="card p-5">
        <div class="mb-5 flex items-center gap-3">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#D9A6B2] text-xs" style="font-size: 12px;">{{ page.icon || '📍' }}</div>
          <div>
            <h1 class="text-xs font-extrabold text-gray-800" style="font-size: 12px; line-height: 1.25;">{{ page.name }}</h1>
            <p class="text-sm text-gray-400">Catatan bebas untuk rencana kota ini</p>
          </div>
        </div>

        <textarea
          v-model="content"
          class="form-control min-h-[22rem] resize-y leading-relaxed"
          placeholder="Contoh:\n\n• Tempat yang ingin dikunjungi\n• Kuliner yang wajib dicoba\n• Tips transportasi\n• Catatan lainnya..."
        />

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p class="text-xs text-gray-400">{{ lineCount }} baris catatan</p>
          <button class="btn btn-burgundy" :disabled="saving" @click="save">
            {{ saving ? 'Menyimpan...' : '💾 Simpan Catatan' }}
          </button>
        </div>
      </section>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppLayout from '@/components/AppLayout.vue'
import { useCityStore } from '@/stores/cityStore.js'
import { useToastStore } from '@/stores/toastStore.js'

const props = defineProps({ id: { type: String, required: true } })
const router = useRouter()
const cityStore = useCityStore()
const toast = useToastStore()
const content = ref('')
const saving = ref(false)
const page = computed(() => cityStore.currentPage)
const lineCount = computed(() => content.value.split('\n').filter(line => line.trim()).length)

watch(page, value => {
  if (value) content.value = value.content || ''
}, { immediate: true })

watch(() => props.id, id => cityStore.loadPage(id), { immediate: true })

async function save() {
  saving.value = true
  try {
    await cityStore.editPage(props.id, { content: content.value })
    toast.success('Catatan disimpan')
  } finally {
    saving.value = false
  }
}
</script>
