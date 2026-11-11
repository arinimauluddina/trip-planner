import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref, computed } from 'vue'
import {
  getTrips, getTrip, createTrip, updateTrip, deleteTrip,
  addDestination, updateDestination, deleteDestination, deleteDestinationByPlanning,
  addPlanningItem, updatePlanningItem, deletePlanningItem,
  addRundownItem, updateRundownItem, deleteRundownItem, reorderRundown,
} from '@/services/db.js'

export const useTripStore = defineStore('trips', () => {
  // ── State ──────────────────────────────────────────────────────────────────
  const trips       = ref([])
  const currentTrip = ref(null)
  const loading     = ref(false)
  const error       = ref(null)

  // ── Getters ────────────────────────────────────────────────────────────────
  const tripCount = computed(() => trips.value.length)

  // ── Actions: Trips ─────────────────────────────────────────────────────────
  async function loadTrips() {
    loading.value = true
    try {
      trips.value = await getTrips()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function loadTrip(id) {
    loading.value = true
    try {
      currentTrip.value = await getTrip(id)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addTrip(data) {
    const trip = await createTrip(data)
    trips.value.unshift(trip)
    return trip
  }

  async function editTrip(id, patch) {
    await updateTrip(id, patch)
    // Sync local lists
    const idx = trips.value.findIndex(t => t.id === id)
    if (idx !== -1) trips.value[idx] = { ...trips.value[idx], ...patch }
    if (currentTrip.value?.id === id) currentTrip.value = { ...currentTrip.value, ...patch }
  }

  async function removeTrip(id) {
    await deleteTrip(id)
    trips.value = trips.value.filter(t => t.id !== id)
    if (currentTrip.value?.id === id) currentTrip.value = null
  }

  // ── Actions: Destinations ──────────────────────────────────────────────────
  async function addDest(tripId, data) {
    const dest = await addDestination(tripId, data)
    if (currentTrip.value?.id === tripId) {
      currentTrip.value.destinations.push(dest)
    }
    return dest
  }

  async function editDest(tripId, destId, patch) {
    await updateDestination(tripId, destId, patch)
    if (currentTrip.value?.id === tripId) {
      const idx = currentTrip.value.destinations.findIndex(d => d.id === destId)
      if (idx !== -1) currentTrip.value.destinations[idx] = { ...currentTrip.value.destinations[idx], ...patch }
    }
  }

  async function removeDest(tripId, destId) {
    await deleteDestination(tripId, destId)
    if (currentTrip.value?.id === tripId) {
      currentTrip.value.destinations = currentTrip.value.destinations.filter(d => d.id !== destId)
    }
  }

  async function removeDestForPlanning(tripId, planningId, fallback = {}) {
    await deleteDestinationByPlanning(tripId, planningId, fallback)
    if (currentTrip.value?.id === tripId) {
      currentTrip.value.destinations = currentTrip.value.destinations.filter(destination => {
        if (destination.planning_id === planningId) return false
        const isLegacyMatch = !destination.planning_id && (
          destination.name === fallback.name &&
          (destination.category === fallback.category || destination.category === fallback.legacyCategory) &&
          Number(destination.cost) === Number(fallback.cost)
        )
        return !isLegacyMatch
      })
    }
  }

  // ── Actions: Planning ─────────────────────────────────────────────────────
  async function addPlanning(tripId, data) {
    const item = await addPlanningItem(tripId, data)
    if (currentTrip.value?.id === tripId) {
      if (!currentTrip.value.planning) currentTrip.value.planning = []
      currentTrip.value.planning.push(item)
    }
    return item
  }

  async function editPlanning(tripId, itemId, patch) {
    await updatePlanningItem(tripId, itemId, patch)
    if (currentTrip.value?.id === tripId) {
      const idx = (currentTrip.value.planning || []).findIndex(p => p.id === itemId)
      if (idx !== -1) currentTrip.value.planning[idx] = { ...currentTrip.value.planning[idx], ...patch }
    }
  }

  async function removePlanning(tripId, itemId) {
    await deletePlanningItem(tripId, itemId)
    if (currentTrip.value?.id === tripId) {
      currentTrip.value.planning = (currentTrip.value.planning || []).filter(p => p.id !== itemId)
    }
  }

  // ── Actions: Rundown ───────────────────────────────────────────────────────
  async function addRundown(tripId, data) {
    const item = await addRundownItem(tripId, data)
    if (currentTrip.value?.id === tripId) {
      currentTrip.value.rundown.push(item)
    }
    return item
  }

  async function editRundown(tripId, itemId, patch) {
    await updateRundownItem(tripId, itemId, patch)
    if (currentTrip.value?.id === tripId) {
      const idx = currentTrip.value.rundown.findIndex(r => r.id === itemId)
      if (idx !== -1) currentTrip.value.rundown[idx] = { ...currentTrip.value.rundown[idx], ...patch }
    }
  }

  async function removeRundown(tripId, itemId) {
    await deleteRundownItem(tripId, itemId)
    if (currentTrip.value?.id === tripId) {
      currentTrip.value.rundown = currentTrip.value.rundown.filter(r => r.id !== itemId)
    }
  }

  async function reorderRundownItems(tripId, orderedIds) {
    await reorderRundown(tripId, orderedIds)
    if (currentTrip.value?.id === tripId) {
      orderedIds.forEach((id, i) => {
        const item = currentTrip.value.rundown.find(r => r.id === id)
        if (item) item.sort_order = i
      })
    }
  }

  return {
    // State
    trips, currentTrip, loading, error,
    // Getters
    tripCount,
    // Actions
    loadTrips, loadTrip, addTrip, editTrip, removeTrip,
    addDest, editDest, removeDest, removeDestForPlanning,
    addPlanning, editPlanning, removePlanning,
    addRundown, editRundown, removeRundown, reorderRundownItems,
  }
})

// Keep setup-store actions in sync when Vite hot-reloads this module.
// Without this, a newly added action can remain undefined until a full reload.
if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useTripStore, import.meta.hot))
}

