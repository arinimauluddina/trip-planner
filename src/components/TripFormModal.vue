<template>
  <AppModal
    :model-value="modelValue"
    modal-class="trip-form-modal"
    :title="isEdit ? '✏️ Edit Trip' : '✈️ Buat Trip Baru'"
    :confirm-text="isEdit ? 'Simpan Perubahan' : 'Buat Trip'"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="submit"
  >
    <form class="space-y-3" @submit.prevent="submit">
      <!-- Name -->
      <div>
        <label class="form-label">Nama Trip *</label>
        <input v-model="form.name" class="form-control" placeholder="Contoh: Liburan Bali 2025" @blur="form.name = formatTitleText(form.name)" />
      </div>

      <!-- Dates -->
      <div class="grid grid-cols-2 gap-3">
        <div class="date-field">
          <label class="form-label">Tanggal Mulai</label>
          <DatePicker v-model="form.start_date" />
        </div>
        <div class="date-field">
          <label class="form-label">Tanggal Selesai</label>
          <DatePicker v-model="form.end_date" />
        </div>
      </div>

      <!-- Status & Color -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label class="form-label">Status</label>
          <div class="relative" @click.stop>
            <button
              type="button"
              class="form-control form-control-tall flex items-center justify-between text-left"
              @click="statusOpen = !statusOpen; colorOpen = false"
            >
              <span>{{ selectedStatus.emoji }} {{ selectedStatus.label }}</span>
              <span class="text-gray-500">⌄</span>
            </button>
            <div v-if="statusOpen" class="status-menu" @click.stop>
              <button
                v-for="status in statusOptions"
                :key="status.value"
                type="button"
                class="status-option"
                :class="{ active: form.status === status.value }"
                @click="chooseStatus(status.value)"
              >
                {{ status.emoji }} {{ status.label }}
              </button>
            </div>
          </div>
        </div>
        <div>
          <label class="form-label">Warna Label</label>
          <div class="relative" @click.stop>
            <button
              type="button"
              class="form-control form-control-tall flex items-center justify-between text-left"
              @click="colorOpen = !colorOpen; statusOpen = false"
            >
              <span class="flex items-center gap-2">
                <span class="color-swatch" :style="{ background: selectedColor.bg }"></span>
                {{ selectedColor.label }}
              </span>
              <span class="text-gray-500">⌄</span>
            </button>
            <div v-if="colorOpen" class="status-menu" @click.stop>
              <button
                v-for="color in TRIP_COLORS"
                :key="color.value"
                type="button"
                class="status-option"
                :class="{ active: form.color === color.value }"
                @click="chooseColor(color.value)"
              >
                <span class="color-swatch" :style="{ background: color.bg }"></span>
                {{ color.label }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { ref, watch, computed, onMounted, onBeforeUnmount } from 'vue'
import AppModal from '@/components/AppModal.vue'
import { formatTitleText } from '@/services/text.js'
import DatePicker from '@/components/DatePicker.vue'
import { STATUS_MAP, TRIP_COLORS } from '@/services/export.js'
import { useToastStore } from '@/stores/toastStore.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  trip:       { type: Object,  default: null },  // null = create mode
})
const emit  = defineEmits(['update:modelValue', 'saved'])
const toast = useToastStore()

const isEdit = computed(() => !!props.trip)
const statusOptions = computed(() => Object.entries(STATUS_MAP).map(([value, status]) => ({ value, ...status })))
const selectedStatus = computed(() => STATUS_MAP[form.value.status] || STATUS_MAP.planned)
const selectedColor = computed(() => TRIP_COLORS.find(color => color.value === form.value.color) || TRIP_COLORS[0])
const statusOpen = ref(false)
const colorOpen = ref(false)

function closeDropdowns() {
  statusOpen.value = false
  colorOpen.value = false
}

const defaultForm = () => ({
  name: '', description: '', start_date: '', end_date: '', status: 'planned', color: 'red',
})

const form = ref(defaultForm())

watch(() => props.modelValue, (val) => {
  if (val) {
    statusOpen.value = false
    colorOpen.value = false
    form.value = props.trip
      ? { name: props.trip.name, description: props.trip.description, start_date: props.trip.start_date, end_date: props.trip.end_date, status: props.trip.status, color: props.trip.color }
      : defaultForm()
  } else {
    statusOpen.value = false
    colorOpen.value = false
  }
})

onMounted(() => document.addEventListener('click', closeDropdowns))
onBeforeUnmount(() => document.removeEventListener('click', closeDropdowns))

function chooseStatus(status) {
  form.value.status = status
  statusOpen.value = false
}

function chooseColor(color) {
  form.value.color = color
  colorOpen.value = false
}

function submit() {
  form.value.name = formatTitleText(form.value.name)
  if (!form.value.name.trim()) { toast.error('Nama trip wajib diisi!'); return }
  if (form.value.start_date && form.value.end_date && form.value.start_date > form.value.end_date) {
    toast.error('Tanggal selesai harus setelah tanggal mulai!')
    return
  }
  emit('saved', { ...form.value })
  emit('update:modelValue', false)
}
</script>

