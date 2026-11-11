<template>
  <div class="trip-shell min-h-screen flex flex-col">
    <!-- Top Nav -->
    <nav class="app-nav sticky top-0 z-40 border-b shadow-sm">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink v-if="!detailTabs" to="/" class="flex items-center gap-2 font-extrabold text-lg text-primary">
          <span class="text-2xl">✈️</span>
          <span class="hidden sm:inline">Trip Plan</span>
        </RouterLink>
        <div v-else class="flex min-w-0 items-center gap-2 text-lg font-extrabold text-primary">
          <span class="text-2xl">✈️</span>
          <span class="flex min-w-0 flex-col leading-tight">
            <span class="max-w-[8rem] truncate text-sm font-extrabold text-gray-700 sm:text-base">{{ detailTitle }}</span>
            <span class="text-[10px] font-bold text-gray-500 sm:text-xs">📅 {{ detailDate }}</span>
          </span>
        </div>
        <div class="flex gap-2">
          <RouterLink v-if="!detailTabs" to="/cities" class="btn btn-outline btn-sm">
            📍 <span class="hidden sm:inline">Kota</span>
          </RouterLink>
          <BackupMenu />
          <button
            v-if="!detailTabs"
            class="btn btn-burgundy btn-sm"
            @click="$emit('new-trip')"
          >
            + Trip Baru
          </button>
        </div>
      </div>

      <div v-if="detailTabs" class="app-detail-tabs max-w-5xl mx-auto w-full px-4 pb-2">
        <div class="flex gap-1 bg-white rounded-2xl p-1 shadow-sm overflow-hidden">
          <button
            class="tab-btn planning-tab"
            :class="{ active: activeTab === 'planning' }"
            @click="$emit('update:activeTab', 'planning')"
          >
            💡 <span>Planning</span>
          </button>
          <button
            class="tab-btn destination-tab"
            :class="{ active: activeTab === 'destinations' }"
            @click="$emit('update:activeTab', 'destinations')"
          >
            📍 <span class="hidden sm:inline">Destinasi & Biaya</span><span class="sm:hidden">Destinasi</span>
          </button>
          <button
            class="tab-btn rundown-tab"
            :class="{ active: activeTab === 'rundown' }"
            @click="$emit('update:activeTab', 'rundown')"
          >
            📋 Rundown
          </button>
        </div>
      </div>
    </nav>

    <!-- Page Content -->
    <main class="flex-1 max-w-5xl mx-auto w-full px-4 py-5">
      <slot />
    </main>

    <!-- Toast Container -->
    <ToastContainer />
  </div>
</template>

<script setup>
import BackupMenu from '@/components/BackupMenu.vue'
import ToastContainer from '@/components/ToastContainer.vue'

defineProps({
  detailTabs: { type: Boolean, default: false },
  activeTab: { type: String, default: '' },
  detailTitle: { type: String, default: '' },
  detailDate: { type: String, default: 'Belum diset' },
})

defineEmits(['new-trip', 'update:activeTab'])
</script>

