import { createRouter, createWebHashHistory } from 'vue-router'
import Dashboard from '@/views/Dashboard.vue'
import TripDetail from '@/views/TripDetail.vue'
import Cities from '@/views/Cities.vue'
import CityDetail from '@/views/CityDetail.vue'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: Dashboard,
  },
  {
    path: '/trip/:id',
    name: 'trip-detail',
    component: TripDetail,
    props: true,
  },
  {
    path: '/cities',
    name: 'cities',
    component: Cities,
  },
  {
    path: '/cities/:id',
    name: 'city-detail',
    component: CityDetail,
    props: true,
  },
]

// WebHashHistory agar bekerja di Capacitor (file://) tanpa server
const router = createRouter({
  history: createWebHashHistory(),
  routes,
})

export default router

