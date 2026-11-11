import { createApp } from 'vue'
import { createPinia } from 'pinia'
import router from './router'
import App from './App.vue'
import './assets/main.css'
import { initDB, seedDemoData } from '@/services/db.js'

async function bootstrap() {
  await initDB()

  if (new URLSearchParams(window.location.search).get('seed') === 'demo') {
    const result = await seedDemoData()
    console.info(`[Trip Plan] Demo seed: ${result.seeded ? `${result.count} trip ditambahkan` : result.reason}`)
  }

  const app = createApp(App)
  app.use(createPinia())
  app.use(router)
  app.mount('#app')
}

bootstrap()

