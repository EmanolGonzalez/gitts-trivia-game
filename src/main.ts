import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import '@/assets/main.css'
import {Roulette} from 'vue3-roulette'

const app = createApp(App)

app.use(createPinia())
app.use(router)
app.component('Roulette', Roulette)

app.mount('#app')
