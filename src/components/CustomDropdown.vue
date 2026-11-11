<template>
  <div ref="root" class="relative" @click.stop>
    <button
      type="button"
      :class="buttonClass"
      class="flex w-full items-center justify-between gap-2 text-left"
      @click="toggle"
    >
      <span class="flex min-w-0 items-center gap-3 truncate">
        <span v-if="selected?.icon" class="shrink-0">{{ selected.icon }}</span>
        <span class="truncate">{{ selected?.label || placeholder }}</span>
      </span>
      <span class="shrink-0 text-gray-500">⌄</span>
    </button>

    <Teleport to="body">
      <div v-if="open" ref="menu" class="custom-dropdown-menu" :class="{ 'is-scrollable': scrollable }" :style="menuStyle" @click.stop>
        <button
          v-for="option in options"
          :key="option.value"
          type="button"
          class="status-option"
          :class="{ active: option.value === modelValue }"
          @click="choose(option)"
        >
          <span v-if="option.icon" class="shrink-0">{{ option.icon }}</span>
          <span class="truncate">{{ option.label }}</span>
        </button>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  buttonClass: { type: String, default: 'form-control form-control-tall' },
  placeholder: { type: String, default: 'Pilih' },
  scrollable: { type: Boolean, default: true },
  visible: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'change'])
const open = ref(false)
const root = ref(null)
const menu = ref(null)
const menuStyle = ref({})
const selected = computed(() => props.options.find(option => option.value === props.modelValue) || props.options[0])

function closeOnOutsideClick() {
  open.value = false
}

function reposition() {
  const trigger = root.value?.querySelector('button')
  if (!trigger || !menu.value) return

  const triggerRect = trigger.getBoundingClientRect()
  const menuRect = menu.value.getBoundingClientRect()
  const gap = 4
  const openDown = window.innerHeight - triggerRect.bottom >= menuRect.height + gap || triggerRect.top < menuRect.height + gap
  const top = openDown ? triggerRect.bottom + gap : triggerRect.top - menuRect.height - gap
  const left = Math.min(triggerRect.left, window.innerWidth - triggerRect.width - 8)

  menuStyle.value = {
    top: `${Math.max(8, top)}px`,
    left: `${Math.max(8, left)}px`,
    width: `${triggerRect.width}px`,
  }
}

async function toggle() {
  open.value = !open.value
  if (open.value) {
    await nextTick()
    reposition()
  }
}

function choose(option) {
  emit('update:modelValue', option.value)
  emit('change', option.value)
  open.value = false
}

watch(open, (isOpen) => {
  if (isOpen) {
    window.addEventListener('resize', reposition)
    window.addEventListener('scroll', reposition, true)
  } else {
    window.removeEventListener('resize', reposition)
    window.removeEventListener('scroll', reposition, true)
  }
})
watch(() => props.visible, (isVisible) => {
  if (!isVisible) open.value = false
}, { immediate: true })

onMounted(() => document.addEventListener('click', closeOnOutsideClick))
onBeforeUnmount(() => {
  document.removeEventListener('click', closeOnOutsideClick)
  window.removeEventListener('resize', reposition)
  window.removeEventListener('scroll', reposition, true)
})
</script>
