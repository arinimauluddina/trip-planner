<template>
  <div class="space-y-5">
    <!-- Top Bar with 2 View Options Switcher -->
    <div class="tab-action-bar flex items-center justify-between flex-wrap gap-3">
      <!-- View Options Toggle -->
      <div class="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200">
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          :class="activeView === 'timeline' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
          @click="activeView = 'timeline'"
        >
          <span>🗂️</span>
          <span>Kartu</span>
        </button>
        <button
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
          :class="activeView === 'table' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'"
          @click="activeView = 'table'"
        >
          <span>📊</span>
          <span>Tabel</span>
        </button>
      </div>

      <!-- Action Button -->
      <div class="flex items-center gap-2 flex-wrap">
        <button class="btn btn-outline btn-sm" @click="openBulk">
          📋 Input Banyak
        </button>
        <button class="btn btn-rundown-primary btn-sm" @click="openAdd(1)">
          + Tambah Jadwal
        </button>
      </div>
    </div>

    <!-- Empty State -->
    <div v-if="rundown.length === 0" class="card p-10 text-center text-gray-400">
      <p class="text-5xl mb-3">📅</p>
      <p class="font-bold text-gray-700 text-base">Belum ada rundown</p>
      <p class="text-xs text-gray-400 mt-1 mb-4">Mulai susun jadwal perjalananmu hari demi hari</p>
      <button class="btn btn-rundown-primary btn-sm inline-flex" @click="openAdd(1)">
        + Tambah Jadwal Pertama
      </button>
    </div>

    <div v-else>
      <!-- ========================================================
           VIEW 1: TABEL SPREADSHEET (PERSIS SEPERTI GAMBAR)
           ======================================================== -->
      <div v-if="activeView === 'table'" class="card border border-gray-200 shadow-sm bg-white overflow-hidden">
        <!-- Title matching screenshot: "Rundown" centered -->
        <div class="py-3 text-center border-b border-gray-100 bg-white">
          <h2 class="font-extrabold text-xs text-gray-800 tracking-wide">Rundown</h2>
        </div>

        <div class="overflow-x-auto">
          <table class="rundown-debug-table w-full min-w-[620px] border border-gray-300 text-left text-xs border-collapse">
            <thead>
              <tr class="border-b border-gray-200 bg-gray-50/60 text-xs font-bold text-gray-800">
                <th class="py-2.5 px-3 w-8 text-center text-gray-400"></th>
                <th class="py-2.5 px-4 w-56 font-bold text-gray-800">Jadwal</th>
                <th class="py-2.5 px-4 font-bold text-gray-800 w-36">Pukul</th>
                <th class="py-2.5 px-4 font-bold text-gray-800 w-32">Durasi</th>
                <th class="w-16 border border-gray-300"></th>
              </tr>
            </thead>

            <!-- Loop each day -->
            <template v-for="day in dayCount" :key="day">
              <!-- Hari ke-X Section Row (soft blue background like screenshot) -->
              <tbody>
                <tr class="bg-[#F9F3F3] border-t border-b border-[#B45A6D] select-none">
                  <td colspan="5" class="py-2 px-4">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center gap-2">
                        <span class="font-bold text-xs text-[#7A2A3D]">Hari ke-{{ day }}</span>
                        <span v-if="trip.start_date" class="text-xs text-[#7A2A3D] font-medium">
                          ({{ getDayLabel(trip.start_date, day) }})
                        </span>
                      </div>
                      <button
                        class="text-xs text-[#7A2A3D] hover:text-[#7A2A3D] font-semibold bg-white/80 hover:bg-white px-2 py-0.5 rounded border border-[#B45A6D] transition-colors"
                        @click="openAdd(day)"
                      >
                        + Tambah di Hari {{ day }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>

              <!-- Draggable Rows for this day -->
              <draggable
                tag="tbody"
                :list="getDayItemsRef(day)"
                item-key="id"
                handle=".table-drag-handle"
                ghost-class="sortable-ghost"
                drag-class="sortable-drag"
                @end="(evt) => onDragEnd(evt, day)"
              >
                <template #item="{ element: item }">
                  <tr
                    class="rundown-table-row border-b border-gray-100 hover:bg-sky-50/30 transition-colors group"
                    @click="handleItemClick(item)"
                    @touchstart.passive="handleTouchStart"
                    @touchmove="handleTouchMove(item, $event)"
                    @touchend="handleTouchEnd(item, $event)"
                  >
                    <!-- Drag handle -->
                    <td class="py-2.5 px-3 text-center text-gray-300 group-hover:text-gray-500 cursor-grab active:cursor-grabbing table-drag-handle select-none" @click.stop>
                      <span class="text-xs">⠿</span>
                    </td>

                    <!-- Jadwal -->
                    <td class="py-2.5 px-4 w-56 font-medium text-gray-800">
                      <p>{{ item.title }}</p>
                      <p v-if="item.notes" class="mt-1 text-[11px] italic text-gray-500">
                        {{ item.notes }}
                      </p>
                    </td>

                    <!-- Pukul -->
                    <td class="py-2.5 px-4 text-gray-700 font-medium whitespace-nowrap text-xs">
                      {{ item.time || '-' }}
                    </td>

                    <!-- Durasi -->
                    <td class="py-2.5 px-4 w-32 text-xs whitespace-nowrap">
                        <span v-if="item.duration" class="text-[#7A2A3D] font-semibold">
                        ⏱ {{ formatDuration(item.duration) }}
                      </span>
                      <span v-else class="text-gray-300">-</span>
                    </td>

                    <td class="w-16 p-0">
                      <button
                        v-if="swipeOpenId === item.id"
                        class="trash-action flex min-h-14 w-16 items-center justify-center rounded-r-xl"
                        aria-label="Hapus jadwal"
                        @click.stop="handleDelete(item)"
                      >
                        <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
                        </svg>
                      </button>
                    </td>

                  </tr>
                </template>
              </draggable>

              <!-- Empty day notice -->
              <tbody v-if="getItemsForDay(day).length === 0">
                <tr class="border-b border-gray-100 bg-white">
                  <td colspan="5" class="py-3 px-4 text-center text-xs text-gray-300 italic">
                    Belum ada kegiatan untuk Hari ke-{{ day }}.
                  </td>
                </tr>
              </tbody>
            </template>
          </table>
        </div>
      </div>

      <!-- ========================================================
           VIEW 2: KARTU / TIMELINE (VISUAL TRAVEL CARDS)
           ======================================================== -->
      <div v-else class="space-y-4">
        <div
          v-for="day in dayCount"
          :key="day"
          class="card overflow-hidden border border-gray-200 shadow-sm"
        >
          <!-- Card Header -->
          <div class="bg-gradient-to-r from-[#B45A6D] to-[#7A2A3D] px-4 py-3 border-b border-[#B45A6D] flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="bg-[#B45A6D] text-[#F9F3F3] font-extrabold text-xs px-2.5 py-1 rounded-full">
                Hari {{ day }}
              </span>
              <span class="font-bold text-sm text-[#F9F3F3]">
                {{ getDayLabel(trip.start_date, day) }}
              </span>
              <span class="text-xs bg-white text-gray-500 font-semibold px-2 py-0.5 rounded-md border border-gray-200">
                {{ getItemsForDay(day).length }} agenda
              </span>
            </div>
            <button class="btn btn-outline btn-sm bg-white text-xs py-1 px-2.5" @click="openAdd(day)">
              + Tambah
            </button>
          </div>

          <!-- Timeline items list -->
          <div class="p-4">
            <draggable
              :list="getDayItemsRef(day)"
              item-key="id"
              handle=".card-drag-handle"
              ghost-class="sortable-ghost"
              drag-class="sortable-drag"
              @end="(evt) => onDragEnd(evt, day)"
            >
              <template #item="{ element: item }">
                <div class="relative pl-6 mb-4 last:mb-0 group">
                  <button
                    v-if="swipeOpenId === item.id"
                    class="trash-action absolute inset-y-0 right-0 z-0 flex w-20 items-center justify-center rounded-r-xl"
                    aria-label="Hapus jadwal"
                    @click.stop="handleDelete(item)"
                  >
                    <svg viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16M9 7V4h6v3m-9 0 1 13h8l1-13M10 11v5m4-5v5" />
                    </svg>
                  </button>
                  <!-- Timeline line & dot -->
                  <div class="absolute left-2 top-3 bottom-0 w-0.5 bg-gray-200 group-last:hidden"></div>
                  <div class="absolute left-0.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-[#B45A6D] shadow-xs"></div>

                  <!-- Card content -->
                  <div
                    class="rundown-item-card relative z-10 bg-gray-50 hover:bg-white hover:shadow-md border border-gray-200 rounded-xl p-3.5 transition-all flex items-start gap-3 cursor-pointer"
                    :style="{ transform: `translateX(${swipeOpenId === item.id ? -80 : 0}px)`, touchAction: 'pan-y' }"
                    @click="handleItemClick(item)"
                    @touchstart.passive="handleTouchStart"
                    @touchend="handleTouchEnd(item, $event)"
                  >
                    <!-- Drag handle -->
                    <div class="card-drag-handle cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-600 pt-0.5 select-none text-base" @click.stop>
                      ⠿
                    </div>

                    <!-- Details -->
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2 flex-wrap mb-1">
                        <span v-if="item.time" class="bg-[#F9F3F3] text-[#7A2A3D] font-bold px-2 py-0.5 rounded text-xs border border-[#B45A6D]">
                          🕒 {{ item.time }}
                        </span>
                        <span v-if="item.duration" class="bg-[#7A2A3D] text-white font-semibold px-2 py-0.5 rounded text-xs border border-[#7A2A3D]">
                          ⏱ {{ formatDuration(item.duration) }}
                        </span>
                      </div>

                      <h4 class="font-bold text-gray-800 text-sm">{{ item.title }}</h4>

                        <p v-if="item.notes" class="text-xs text-[#7A2A3D] bg-[#F9F3F3] border border-[#B45A6D] rounded-lg px-2.5 py-1 mt-2 inline-block">
                        📌 {{ item.notes }}
                      </p>
                    </div>

                  </div>
                </div>
              </template>
            </draggable>

            <div v-if="getItemsForDay(day).length === 0" class="text-center py-6 text-xs text-gray-400">
              Belum ada kegiatan di Hari ke-{{ day }}.
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Modal: Add / Edit Rundown -->
    <AppModal
      v-model="showModal"
      :title="editTarget ? '✏️ Edit Jadwal Rundown' : '➕ Tambah Jadwal Rundown'"
      :confirm-text="editTarget ? 'Simpan' : 'Tambah'"
      @confirm="submit"
    >
      <form class="space-y-4" @submit.prevent="submit">
        <!-- Jadwal / Aktivitas -->
        <div>
          <label class="form-label">Jadwal / Aktivitas *</label>
          <div class="flex gap-2">
            <input
              v-model="form.title"
              class="form-control min-w-0 flex-1"
              placeholder="Contoh: Keberangkatan Lempuyangan - Kiara Condong"
              @keydown.enter.exact.prevent="submitAndAddNext"
              @blur="form.title = formatTitleText(form.title)"
              autofocus
            />
            <button
              v-if="speechSupported"
              type="button"
              class="btn btn-outline shrink-0 px-3"
              :class="{ 'border-[#B45A6D] bg-[#F9F3F3] text-[#7A2A3D]': isListening }"
              :title="isListening ? 'Berhenti merekam' : 'Isi dengan suara'"
              @click="toggleSpeech"
            >
              {{ isListening ? '⏹️' : '🎙️' }}
            </button>
          </div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="activity in quickActivities"
              :key="activity"
              type="button"
              class="rounded-full border border-[#B45A6D] bg-[#F9F3F3] px-2.5 py-1 text-xs font-semibold text-[#7A2A3D] transition-colors hover:bg-[#D9A6B2]"
              @click="chooseActivity(activity)"
            >
              {{ activity }}
            </button>
          </div>
          <div v-if="activitySuggestions.length" class="mt-2 rounded-2xl border border-[#B45A6D] bg-[#F9F3F3] p-3">
            <p class="mb-2 text-xs font-bold uppercase text-[#7A2A3D]">DARI DESTINASI TRIP INI</p>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="suggestion in activitySuggestions"
                :key="`${suggestion.source}-${suggestion.name}`"
                type="button"
                class="max-w-full rounded-full border border-[#B45A6D] bg-white px-2.5 py-1.5 text-left text-xs font-semibold text-[#7A2A3D] transition-colors hover:bg-[#D9A6B2]"
                @click="chooseActivity(suggestion.name)"
              >
                <span class="block max-w-[15rem] truncate">{{ suggestion.name }}</span>
              </button>
            </div>
          </div>
        </div>

        <!-- Hari -->
        <div v-if="dayCount > 1">
          <label class="form-label">Hari ke-</label>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="option in dayOptions"
              :key="option.value"
              type="button"
              class="rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors"
              :class="form.day === option.value
                ? 'border-[#7A2A3D] bg-[#7A2A3D] text-white shadow-sm'
                : 'border-gray-200 bg-white text-gray-600 hover:border-[#7A2A3D]'"
              @click="form.day = option.value"
            >
              {{ option.label }}
            </button>
          </div>
        </div>

        <div
          v-if="lastScheduleInfo && !editTarget"
          class="rounded-xl border border-[#B45A6D] bg-[#F9F3F3] px-3 py-2 text-xs text-[#7A2A3D]"
        >
          <p class="font-semibold">
            Jadwal terakhir: {{ lastScheduleInfo.title }} · {{ lastScheduleInfo.time || 'Waktu belum diisi' }}
          </p>
          <p v-if="!lastScheduleInfo.end" class="mt-0.5 text-[#6b7280]">
            Waktu selesai jadwal sebelumnya belum ditentukan, jadi Mulai tetap kosong.
          </p>
        </div>

        <!-- Waktu & Durasi -->
        <div class="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
          <p class="text-xs font-bold text-gray-700 uppercase tracking-wide">Pengaturan Waktu & Durasi</p>

          <div class="grid grid-cols-2 gap-2">
            <div>
              <label class="text-xs text-gray-500 font-semibold block mb-1">Mulai</label>
              <TimeInput
                v-model="timeStart"
                :class="{ 'border-[#B45A6D] bg-[#F9F3F3]': timeError }"
                @change="onTimeChange('start')"
              />
            </div>
            <div>
              <label class="text-xs text-gray-500 font-semibold block mb-1">Selesai</label>
              <TimeInput
                v-model="timeEnd"
                :class="{ 'border-[#B45A6D] bg-[#F9F3F3]': timeError }"
                @change="onTimeChange('end')"
              />
            </div>
          </div>

          <p v-if="timeError" class="text-xs font-semibold text-[#7A2A3D]">
            {{ timeError }}
          </p>

          <div class="grid grid-cols-2 gap-2 pt-1 border-t border-gray-200">
            <div>
              <label class="form-label">Teks Pukul</label>
              <input
                v-model="form.time"
                class="form-control text-xs"
                placeholder="Contoh: 08:15 - 10:00 atau TBC"
              />
            </div>
            <div>
              <label class="form-label">Durasi (Menit)</label>
              <input
                :value="form.duration || ''"
                type="number"
                min="0"
                step="5"
                class="form-control text-xs"
                placeholder="—"
                @input="onDurationInput($event.target.value)"
              />
            </div>
          </div>

          <p v-if="form.duration > 0" class="text-xs text-[#7A2A3D] font-semibold">
            Estimasi durasi: {{ formatDuration(form.duration) }}
          </p>
        </div>

        <!-- Keterangan -->
        <div>
          <label class="form-label">Keterangan (opsional)</label>
          <input
            v-model="form.notes"
            class="form-control"
            placeholder="Contoh: Naik teman bus, Grab Bike, Bawa tiket KAI..."
          />
        </div>
      </form>
    </AppModal>

    <!-- Bulk Rundown Modal -->
    <AppModal
      :model-value="showBulkModal"
      modal-class="bulk-modal"
      title="📋 Input Banyak Jadwal"
      @update:model-value="handleBulkModalVisibility"
    >
      <div class="space-y-4">
        <div v-if="bulkDraftFound" class="flex items-center justify-between gap-3 rounded-xl border border-[#B45A6D] bg-[#F9F3F3] px-3 py-2.5 text-xs text-[#7A2A3D]">
          <span>Draft terakhir ditemukan. Lanjutkan pengisian?</span>
          <div class="flex gap-2 flex-shrink-0">
            <button type="button" class="font-semibold underline" @click="discardBulkDraft">Buang</button>
            <button type="button" class="btn btn-secondary btn-sm" @click="bulkDraftFound = false">Lanjutkan</button>
          </div>
        </div>

        <div ref="bulkList" class="space-y-3 max-h-[58vh] overflow-y-auto pr-1">
          <div
            v-for="(row, index) in bulkRows"
            :key="row.id"
            class="bulk-row-grid grid grid-cols-1 gap-2.5 rounded-2xl border border-gray-200 bg-gray-50 p-3 sm:p-4"
          >
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-extrabold uppercase tracking-wide text-gray-500">Jadwal {{ index + 1 }}</span>
              <button
                type="button"
                class="btn btn-ghost btn-icon flex-shrink-0 text-[#7A2A3D]"
                title="Hapus baris"
                @click="removeBulkRow(index)"
              >🗑️</button>
            </div>

            <div v-if="dayCount > 1" class="min-w-0">
                <label class="form-label mb-1.5">Hari</label>
                <div class="flex flex-wrap gap-2">
                  <button
                    v-for="option in dayOptions"
                    :key="option.value"
                    type="button"
                    class="rounded-xl border px-2.5 py-1.5 text-left text-xs font-semibold transition-colors"
                    :class="row.day === option.value
                      ? 'border-[#7A2A3D] bg-[#7A2A3D] text-white'
                      : 'border-gray-200 bg-white text-gray-600 hover:border-[#7A2A3D]'"
                    @click="row.day = option.value"
                  >
                    Hari {{ option.value }}
                  </button>
                </div>
            </div>

            <label class="form-label mb-0">Jadwal / Aktivitas</label>
            <input v-model="row.title" class="form-control form-control-tall" placeholder="Contoh: Sarapan" @blur="row.title = formatTitleText(row.title)" />
            <div class="flex flex-wrap gap-2">
              <button
                v-for="activity in (row.suggestionsOpen ? quickActivities : quickActivities.slice(0, 3))"
                :key="activity"
                type="button"
                class="rounded-full border border-[#B45A6D] bg-[#F9F3F3] px-2.5 py-1 text-xs font-semibold text-[#7A2A3D] transition-colors hover:bg-[#D9A6B2]"
                @click="row.title = activity"
              >
                {{ activity }}
              </button>
              <button
                v-if="quickActivities.length > 3"
                type="button"
              class="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-xs font-semibold text-gray-500 transition-colors hover:border-[#7A2A3D] hover:text-[#7A2A3D]"
                @click="row.suggestionsOpen = !row.suggestionsOpen"
              >
                {{ row.suggestionsOpen ? 'Less' : 'More' }}
              </button>
            </div>
            <div v-if="trip.destinations?.length" class="mt-2 flex flex-wrap gap-2">
              <button
                v-for="destination in trip.destinations"
                :key="destination.id"
                type="button"
            class="rounded-full border border-[#B45A6D] bg-white px-2.5 py-1 text-xs font-semibold text-[#7A2A3D] transition-colors hover:bg-[#D9A6B2]"
                @click="chooseBulkDestination(row, destination.name)"
              >
                {{ destination.name }}
              </button>
            </div>

            <div class="grid grid-cols-3 gap-2">
              <div>
                <label class="form-label mb-1.5">Mulai</label>
                <TimeInput v-model="row.start" @change="updateBulkRowTime(row)" />
              </div>
              <div>
                <label class="form-label mb-1.5">Selesai</label>
                <TimeInput v-model="row.end" @change="updateBulkRowTime(row)" />
              </div>
              <div>
                <label class="form-label mb-1.5">Durasi</label>
                <input
                  :value="row.duration || ''"
                  type="number"
                  min="0"
                  step="5"
                  class="form-control h-10"
                  placeholder="mnt"
                  @input="row.duration = $event.target.value ? Number($event.target.value) : 0"
                />
              </div>
            </div>

            <button type="button" class="bulk-notes-toggle" @click="row.notesOpen = !row.notesOpen">
              <span>📝 Keterangan (opsional)</span>
              <span class="text-[11px]">{{ row.notes ? 'Sudah diisi' : 'Tambah' }} {{ row.notesOpen ? '⌃' : '⌄' }}</span>
            </button>
            <input
              v-if="row.notesOpen"
              v-model="row.notes"
              class="form-control form-control-tall"
              placeholder="Contoh: Beli tiket online"
            />

          </div>
        </div>

        <button type="button" class="btn btn-outline btn-sm" @click="addBulkRow">+ Tambah Baris</button>
        <p class="text-xs text-gray-400">Jika modal ditutup, isian otomatis disimpan sebagai draft di perangkat ini.</p>
      </div>

      <template #footer>
        <button class="btn btn-sm btn-mint" @click="closeBulkModal">Tutup & Simpan Draft</button>
        <button class="btn btn-sm btn-secondary modal-confirm" @click="saveBulkRundown">Simpan Semua</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick, onMounted, onBeforeUnmount } from 'vue'
import draggable from 'vuedraggable'
import { Capacitor } from '@capacitor/core'
import { SpeechRecognition } from '@capacitor-community/speech-recognition'
import AppModal from '@/components/AppModal.vue'
import TimeInput from '@/components/TimeInput.vue'
import { getDayCount, getDayLabel } from '@/services/export.js'
import { formatTitleText } from '@/services/text.js'
import { useTripStore } from '@/stores/tripStore.js'
import { useToastStore } from '@/stores/toastStore.js'

const props     = defineProps({ tripId: String })
const tripStore = useTripStore()
const toast     = useToastStore()

// 2 View modes: 'timeline' (Kartu visual) | 'table' (Spreadsheet persis gambar)
const activeView = ref('timeline')

const trip     = computed(() => tripStore.currentTrip || {})
const dayCount = computed(() => getDayCount(trip.value.start_date, trip.value.end_date))
const rundown  = computed(() => tripStore.currentTrip?.rundown || [])
const dayOptions = computed(() => Array.from({ length: Math.max(dayCount.value, 1) }, (_, index) => {
  const day = index + 1
  return {
    value: day,
    label: `Hari ke-${day}${trip.value.start_date ? ` (${getDayLabel(trip.value.start_date, day)})` : ''}`,
  }
}))

// Get items sorted for a day
function getItemsForDay(day) {
  return rundown.value
    .filter(r => r.day === day)
    .sort((a, b) => (a.sort_order - b.sort_order))
}

function getDayItemsRef(day) {
  return getItemsForDay(day)
}

// Handle Drag & Drop reorder
async function onDragEnd(evt, day) {
  if (evt.oldIndex === evt.newIndex) return
  const items = [...getItemsForDay(day)]
  const [moved] = items.splice(evt.oldIndex, 1)
  items.splice(evt.newIndex, 0, moved)
  const ids = items.map(r => r.id)
  await tripStore.reorderRundownItems(props.tripId, ids)
  toast.success('Urutan jadwal diperbarui! 🔄')
}

// Format duration helper
function formatDuration(min) {
  if (!min || isNaN(min)) return '—'
  const h = Math.floor(min / 60)
  const m = min % 60
  if (h === 0) return `${m} mnt`
  if (m === 0) return `${h} jam`
  return `${h} jam ${m} mnt`
}

// Modal Form State
const showModal  = ref(false)
const editTarget = ref(null)
const timeStart  = ref('')
const timeEnd    = ref('')
const timeError  = ref('')
const touchStartX = ref(null)
const suppressClick = ref(false)
const swipeOpenId = ref(null)
const showBulkModal = ref(false)
const bulkRows = ref([])
const bulkList = ref(null)
const bulkDraftFound = ref(false)
const quickActivities = ['Sarapan', 'Berangkat', 'Perjalanan', 'Check-in', 'Makan siang', 'Wisata', 'Makan malam', 'Pulang']
const activitySuggestions = computed(() => {
  const currentTitle = form.value.title.trim()
  const journeyDestination = currentTitle.match(/^perjalanan ke (.+)$/i)?.[1] || ''
  const selectedNames = currentTitle
    .split(' — ')
    .concat(journeyDestination)
    .map(item => item.trim().toLowerCase())
    .filter(Boolean)
  const lastPart = selectedNames.at(-1) || ''
  const isQuickActivity = quickActivities.some(activity => activity.toLowerCase() === lastPart)
  const hasMultipleSelections = selectedNames.length > 1
  const isJourneyTitle = /^perjalanan(?: ke .+)?$/i.test(currentTitle)
  const query = isQuickActivity || hasMultipleSelections || isJourneyTitle ? '' : lastPart
  const candidates = [
    ...(trip.value.destinations || []).map(item => ({ name: item.name, source: 'Destinasi' })),
  ]
  const unique = candidates.filter((item, index, items) => (
    items.findIndex(candidate => candidate.name.toLowerCase() === item.name.toLowerCase()) === index
  ))
  return unique
    .filter(item => !query || item.name.toLowerCase().includes(query))
    .slice(0, 5)
})

function chooseActivity(value) {
  const next = formatTitleText(value)
  const current = form.value.title.trim()
  if (!next) return
  const isQuickActivity = quickActivities.some(
    activity => activity.toLowerCase() === next.toLowerCase()
  )
  if (next.toLowerCase() === 'perjalanan') {
    form.value.title = 'Perjalanan'
    return
  }
  if (!isQuickActivity && /^perjalanan(?: ke .+)?$/i.test(current)) {
    form.value.title = `Perjalanan ke ${next}`
    return
  }
  if (!current) {
    form.value.title = next
    return
  }
  const selected = current.split(' — ').map(item => item.trim().toLowerCase())
  if (selected.includes(next.toLowerCase())) return
  form.value.title = `${current} — ${next}`
}

function chooseBulkDestination(row, value) {
  const next = formatTitleText(value)
  if (!next) return
  if (/^perjalanan$/i.test(row.title.trim())) {
    row.title = `Perjalanan ke ${next}`
    return
  }
  row.title = next
}

const speechSupported = ref(false)
const isListening = ref(false)
let speechRecognition = null
let nativeSpeech = false

function appendTranscript(transcript) {
  const value = transcript?.trim()
  if (value) form.value.title = form.value.title ? `${form.value.title} — ${value}` : value
}

function showSpeechError(error) {
  const message = String(error?.message || error || '').toLowerCase()
  toast.error(message.includes('permission') ? 'Izin mikrofon diperlukan' : 'Input suara tidak tersedia')
}

async function setupSpeech() {
  nativeSpeech = Capacitor.isNativePlatform()

  if (nativeSpeech) {
    try {
      const result = await SpeechRecognition.available()
      speechSupported.value = result.available
    } catch {
      speechSupported.value = false
    }
    return
  }

  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
  if (!Recognition) return
  speechRecognition = new Recognition()
  speechRecognition.lang = 'id-ID'
  speechRecognition.interimResults = false
  speechRecognition.maxAlternatives = 1
  speechRecognition.onresult = (event) => {
    appendTranscript(event.results?.[0]?.[0]?.transcript)
  }
  speechRecognition.onerror = (event) => {
    isListening.value = false
    showSpeechError(event)
  }
  speechRecognition.onend = () => { isListening.value = false }
  speechSupported.value = true
}

onMounted(setupSpeech)

onBeforeUnmount(() => {
  speechRecognition?.stop()
  if (nativeSpeech) SpeechRecognition.stop().catch(() => {})
})

function newBulkRow(day = 1) {
  return { id: crypto.randomUUID(), day, title: '', start: '', end: '', duration: 0, notes: '', notesOpen: false, suggestionsOpen: false }
}

function bulkDraftKey() {
  return `tripplan_rundown_draft_${props.tripId}`
}

function hasBulkContent() {
  return bulkRows.value.some(row => row.title.trim() || row.start || row.end || row.notes.trim())
}

function persistBulkDraft() {
  if (!showBulkModal.value) return
  try {
    if (!hasBulkContent()) {
      localStorage.removeItem(bulkDraftKey())
      return
    }
    localStorage.setItem(bulkDraftKey(), JSON.stringify(bulkRows.value))
  } catch (error) {
    console.warn('Draft rundown tidak dapat disimpan.', error)
  }
}

function readBulkDraft() {
  try {
    const saved = JSON.parse(localStorage.getItem(bulkDraftKey()) || 'null')
    return Array.isArray(saved) && saved.length ? saved : null
  } catch {
    return null
  }
}

function openBulk() {
  const draft = readBulkDraft()
  bulkRows.value = draft ? draft.map(row => ({ ...newBulkRow(row.day || 1), ...row, notesOpen: row.notesOpen ?? !!row.notes })) : [newBulkRow(1)]
  bulkDraftFound.value = !!draft
  showBulkModal.value = true
}

function addBulkRow() {
  bulkRows.value.push(newBulkRow(bulkRows.value.at(-1)?.day || 1))
  nextTick(() => bulkList.value?.scrollTo({ top: bulkList.value.scrollHeight, behavior: 'smooth' }))
}

function removeBulkRow(index) {
  if (bulkRows.value.length === 1) {
    bulkRows.value[0] = newBulkRow(bulkRows.value[0].day || 1)
    return
  }
  bulkRows.value.splice(index, 1)
}

function discardBulkDraft() {
  localStorage.removeItem(bulkDraftKey())
  bulkRows.value = [newBulkRow(1)]
  bulkDraftFound.value = false
}

function handleBulkModalVisibility(value) {
  if (value) {
    showBulkModal.value = true
    return
  }
  persistBulkDraft()
  showBulkModal.value = false
}

function closeBulkModal() {
  persistBulkDraft()
  showBulkModal.value = false
}

function updateBulkRowTime(row) {
  if (row.start && row.end) {
    row.time = `${row.start} - ${row.end}`
    const [sh, sm] = row.start.split(':').map(Number)
    const [eh, em] = row.end.split(':').map(Number)
    let diff = (eh * 60 + em) - (sh * 60 + sm)
    if (diff < 0) diff += 24 * 60
    row.duration = diff
  } else if (row.start) {
    row.time = `${row.start} - TBD`
    row.duration = 0
  } else if (row.end) {
    row.time = `TBD - ${row.end}`
    row.duration = 0
  } else {
    row.time = ''
    row.duration = 0
  }
}

async function saveBulkRundown() {
  bulkRows.value.forEach(row => { row.title = formatTitleText(row.title) })
  const incompleteRow = bulkRows.value.find(row => !row.title.trim() && (row.start || row.end || row.notes.trim()))
  if (incompleteRow) {
    toast.error('Isi judul untuk semua baris yang sudah diisi!')
    return
  }
  const filledRows = bulkRows.value.filter(row => row.title.trim())
  if (!filledRows.length) {
    toast.error('Isi minimal satu jadwal terlebih dahulu!')
    return
  }
  for (const row of filledRows) {
    await tripStore.addRundown(props.tripId, {
      day: Number(row.day) || 1,
      title: row.title.trim(),
      time: row.time || '',
      duration: Number(row.duration) || 0,
      notes: row.notes.trim(),
    })
  }
  localStorage.removeItem(bulkDraftKey())
  bulkDraftFound.value = false
  showBulkModal.value = false
  toast.success(`${filledRows.length} jadwal berhasil ditambahkan! ✅`)
}

watch(bulkRows, persistBulkDraft, { deep: true })
onBeforeUnmount(persistBulkDraft)

function handleItemClick(item) {
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

function handleTouchMove(item, event) {
  if (touchStartX.value === null || swipeOpenId.value !== item.id) return

  const touch = event.touches[0]
  if (!touch) return
  const deltaX = touch.clientX - touchStartX.value
  if (deltaX > 40) {
    suppressClick.value = true
    touchStartX.value = null
    swipeOpenId.value = null
    setTimeout(() => { suppressClick.value = false }, 400)
  }
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

const defaultForm = (day = 1) => ({
  title: '',
  day: day,
  time: '',
  duration: 0,
  notes: '',
})

const form = ref(defaultForm())

function extractEndTime(time) {
  const match = String(time || '').match(/^\s*\d{1,2}:\d{2}\s*-\s*(\d{1,2}:\d{2})\s*$/)
  return match?.[1] || ''
}

const lastScheduleInfo = computed(() => {
  if (editTarget.value) return null
  const last = getItemsForDay(Number(form.value.day) || 1).at(-1)
  if (!last) return null
  return {
    title: last.title,
    time: last.time || '',
    end: extractEndTime(last.time),
  }
})

function getTimeRangeError(start, end) {
  if (!start || !end) return ''
  const [sh, sm] = start.split(':').map(Number)
  const [eh, em] = end.split(':').map(Number)
  return ((eh * 60) + em) < ((sh * 60) + sm)
    ? 'Waktu selesai tidak boleh lebih awal dari waktu mulai.'
    : ''
}

function formatTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`
}

function updateEndFromDuration() {
  if (!timeStart.value || !form.value.duration) return false

  const [sh, sm] = timeStart.value.split(':').map(Number)
  const endMinutes = (sh * 60) + sm + Number(form.value.duration)
  if (endMinutes >= 24 * 60) {
    timeEnd.value = ''
    form.value.time = `${timeStart.value} - TBD`
    timeError.value = 'Durasi melewati batas hari. Gunakan durasi yang lebih kecil.'
    return true
  }

  timeEnd.value = formatTime(endMinutes)
  onTimeChange('end')
  return true
}

function onDurationInput(value) {
  form.value.duration = value ? Math.max(0, Number(value)) : 0
  if (form.value.duration > 0 && timeStart.value) {
    updateEndFromDuration()
    return
  }
  if (!form.value.duration && timeStart.value) timeEnd.value = ''
  onTimeChange('start')
}

function onTimeChange(source = '') {
  if (source === 'start' && timeStart.value && form.value.duration > 0) {
    updateEndFromDuration()
    return
  }

  timeError.value = getTimeRangeError(timeStart.value, timeEnd.value)

  if (timeStart.value && timeEnd.value) {
    form.value.time = `${timeStart.value} - ${timeEnd.value}`
    if (timeError.value) {
      form.value.duration = 0
      return
    }

    const [sh, sm] = timeStart.value.split(':').map(Number)
    const [eh, em] = timeEnd.value.split(':').map(Number)
    const diff = ((eh * 60) + em) - ((sh * 60) + sm)
    form.value.duration = diff
  } else if (timeStart.value && !timeEnd.value) {
    form.value.time = `${timeStart.value} - TBD`
    form.value.duration = 0
  } else if (!timeStart.value && timeEnd.value) {
    form.value.time = `TBD - ${timeEnd.value}`
    form.value.duration = 0
  } else {
    form.value.time = ''
    form.value.duration = 0
  }
}

function validateTimeInput() {
  const rangeError = getTimeRangeError(timeStart.value, timeEnd.value)
  const durationNeedsEnd = timeStart.value && form.value.duration > 0 && !timeEnd.value
  timeError.value = rangeError || (durationNeedsEnd
    ? timeError.value || 'Isi waktu selesai yang sesuai dengan durasi.'
    : '')
  if (timeError.value) {
    toast.error(timeError.value)
    return false
  }
  return true
}

function openAdd(day = 1) {
  editTarget.value = null
  timeStart.value  = ''
  timeEnd.value    = ''
  timeError.value  = ''
  form.value       = defaultForm(day)
  if (lastScheduleInfo.value?.end) {
    timeStart.value = lastScheduleInfo.value.end
    onTimeChange('start')
  }
  showModal.value  = true
}

watch(() => form.value.day, () => {
  if (!showModal.value || editTarget.value) return
  timeStart.value = lastScheduleInfo.value?.end || ''
  timeEnd.value = ''
  form.value.duration = 0
  onTimeChange('start')
})

async function toggleSpeech() {
  if (nativeSpeech) {
    if (isListening.value) {
      await SpeechRecognition.stop().catch(() => {})
      isListening.value = false
      return
    }

    try {
      const permission = await SpeechRecognition.checkPermissions()
      const granted = permission.speechRecognition === 'granted'
        ? permission
        : await SpeechRecognition.requestPermissions()
      if (granted.speechRecognition !== 'granted') {
        toast.error('Izin mikrofon diperlukan untuk input suara')
        return
      }

      isListening.value = true
      const result = await SpeechRecognition.start({
        language: 'id-ID',
        maxResults: 1,
        prompt: 'Sebutkan aktivitas rundown',
        popup: true,
      })
      appendTranscript(result.matches?.[0])
    } catch (error) {
      showSpeechError(error)
    } finally {
      isListening.value = false
    }
    return
  }

  if (!speechRecognition) return
  if (isListening.value) {
    speechRecognition.stop()
    return
  }
  try {
    speechRecognition.start()
    isListening.value = true
  } catch {
    isListening.value = false
  }
}

function openEdit(item) {
  editTarget.value = item
  form.value = {
    title: item.title,
    day: item.day || 1,
    time: item.time || '',
    duration: item.duration || 0,
    notes: item.notes || '',
  }

  if (item.time && item.time.includes('-')) {
    const parts = item.time.split('-').map(s => s.trim().replace('.', ':'))
    if (parts.length === 2) {
      timeStart.value = parts[0].padStart(5, '0')
      timeEnd.value   = parts[1].padStart(5, '0')
    }
  } else {
    timeStart.value = ''
    timeEnd.value   = ''
  }
  timeError.value = getTimeRangeError(timeStart.value, timeEnd.value)

  showModal.value = true
}

async function submit() {
  form.value.title = formatTitleText(form.value.title)
  if (!form.value.title.trim()) {
    toast.error('Jadwal / Aktivitas wajib diisi!')
    return
  }
  if (!validateTimeInput()) return

  if (editTarget.value) {
    await tripStore.editRundown(props.tripId, editTarget.value.id, { ...form.value })
    toast.success('Jadwal berhasil diperbarui! ✅')
  } else {
    await tripStore.addRundown(props.tripId, { ...form.value })
    toast.success('Jadwal berhasil ditambahkan! ✅')
  }
  showModal.value = false
}

async function submitAndAddNext() {
  form.value.title = formatTitleText(form.value.title)
  if (editTarget.value) {
    await submit()
    return
  }
  if (!form.value.title.trim()) {
    toast.error('Jadwal / Aktivitas wajib diisi!')
    return
  }
  if (!validateTimeInput()) return
  await tripStore.addRundown(props.tripId, { ...form.value })
  const nextDay = Number(form.value.day) || 1
  form.value = defaultForm(nextDay)
  timeStart.value = ''
  timeEnd.value = ''
  toast.success('Jadwal ditambahkan. Silakan isi berikutnya! ✅')
}

async function handleDelete(item) {
  if (!confirm(`Hapus "${item.title}"?`)) return
  await tripStore.removeRundown(props.tripId, item.id)
  swipeOpenId.value = null
  toast.info('Jadwal dihapus.')
}
</script>
