<script setup lang="ts">
import BannerEvents from '@/components/banner-events.vue'

import { useRouter } from 'vue-router'

const router = useRouter()

function goControl() {
  router.push({ path: '/control' })
}
function goDisplay() {
  window.open('/display', '_blank')
}
</script>

<template>
  <section class="min-h-screen w-full flex justify-center items-start py-8">
    <div class="w-full max-w-[1200px] space-y-6 px-4">
      <!-- HERO / BANNER (sin tocar tu lógica interna) -->
      <BannerEvents />

      <!-- BENTO GRID NEUTRO -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 auto-rows-[160px] gap-4">
        <!-- ACCIÓN: Ir a Control -->
        <button
          @click="goControl"
          class="col-span-2 lg:col-span-1 rounded-2xl p-6 text-slate-100 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 hover:from-slate-800 hover:to-slate-700 transition-colors text-left"
        >
          <h3 class="text-lg font-semibold">Abrir Control</h3>
          <p class="text-sm opacity-80 mt-1">Calificar respuestas • Siguiente pregunta</p>
        </button>

        <!-- ACCIÓN: Ir a Display -->
        <button
          @click="goDisplay"
          class="col-span-2 lg:col-span-1 rounded-2xl p-6 text-slate-100 shadow-lg bg-gradient-to-br from-slate-900 to-slate-800 border border-white/10 hover:from-slate-800 hover:to-slate-700 transition-colors text-left"
        >
          <h3 class="text-lg font-semibold">Abrir Display</h3>
          <p class="text-sm opacity-80 mt-1">Pantalla pública del juego</p>
        </button>
      </div>
    </div>
  </section>
</template>
