<template>
  <div class="time-input">
    <input
      ref="hourInput"
      :value="hour"
      class="time-segment"
      inputmode="numeric"
      maxlength="2"
      placeholder="HH"
      aria-label="Jam"
      @input="onHourInput"
      @keydown.right.prevent="focusMinute"
    />
    <span class="time-separator">:</span>
    <input
      ref="minuteInput"
      :value="minute"
      class="time-segment"
      inputmode="numeric"
      maxlength="2"
      placeholder="MM"
      aria-label="Menit"
      @input="onMinuteInput"
    />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({ modelValue: { type: String, default: '' } })
const emit = defineEmits(['update:modelValue', 'change'])
const hourInput = ref(null)
const minuteInput = ref(null)
const hour = ref('')
const minute = ref('')

function syncFromValue(value) {
  const match = /^([0-2]\d):([0-5]\d)$/.exec(value || '')
  hour.value = match ? match[1] : ''
  minute.value = match ? match[2] : ''
}

watch(() => props.modelValue, (value) => {
  const currentValue = hour.value && minute.value ? `${hour.value}:${minute.value}` : ''
  // Jangan menimpa segmen yang sedang diketik ketika parent belum menerima
  // waktu lengkap (misalnya setelah jam diisi, sebelum menit selesai).
  if (value === currentValue) return
  if (!value && (hour.value.length < 2 || minute.value.length < 2)) return
  syncFromValue(value)
}, { immediate: true })

function emitTime() {
  if (!hour.value || !minute.value) return
  const value = `${hour.value}:${minute.value}`
  emit('update:modelValue', value)
  if (value) emit('change', value)
}

function onHourInput(event) {
  hour.value = event.target.value.replace(/\D/g, '').slice(0, 2)
  if (hour.value.length === 2 && Number(hour.value) > 23) hour.value = '23'
  event.target.value = hour.value
  if (hour.value.length === 2) focusMinute()
  emitTime()
}

function onMinuteInput(event) {
  minute.value = event.target.value.replace(/\D/g, '').slice(0, 2)
  if (minute.value.length === 2 && Number(minute.value) > 59) minute.value = '59'
  event.target.value = minute.value
  emitTime()
}

function focusMinute() {
  minuteInput.value?.focus()
  minuteInput.value?.select()
}
</script>
