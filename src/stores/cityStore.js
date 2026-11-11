import { defineStore, acceptHMRUpdate } from 'pinia'
import { ref } from 'vue'
import {
  getCityPages,
  getCityPage,
  createCityPage,
  updateCityPage,
  deleteCityPage,
} from '@/services/db.js'

export const useCityStore = defineStore('cityPages', () => {
  const pages = ref([])
  const currentPage = ref(null)
  const loading = ref(false)
  const error = ref(null)

  async function loadPages() {
    loading.value = true
    error.value = null
    try {
      pages.value = await getCityPages()
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function loadPage(id) {
    loading.value = true
    error.value = null
    currentPage.value = null
    try {
      currentPage.value = await getCityPage(id)
    } catch (e) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addPage(data) {
    const page = await createCityPage(data)
    pages.value.unshift(page)
    return page
  }

  async function editPage(id, patch) {
    const page = await updateCityPage(id, patch)
    if (!page) return
    const index = pages.value.findIndex(item => item.id === id)
    if (index !== -1) pages.value[index] = page
    if (currentPage.value?.id === id) currentPage.value = page
    return page
  }

  async function removePage(id) {
    await deleteCityPage(id)
    pages.value = pages.value.filter(item => item.id !== id)
    if (currentPage.value?.id === id) currentPage.value = null
  }

  return {
    pages,
    currentPage,
    loading,
    error,
    loadPages,
    loadPage,
    addPage,
    editPage,
    removePage,
  }
})

if (import.meta.hot) {
  import.meta.hot.accept(acceptHMRUpdate(useCityStore, import.meta.hot))
}
