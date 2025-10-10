<!-- src/pages/Home.vue (o donde lo muestres) -->
<script setup lang="ts">
import EventBanner from '@/components/banner-events.vue'
import KPIGrid from '@/components/kpis-grid.vue'

const kpis = [
  { label: 'Estudiantes', value: '1,234', subLabel: 'Total registrados' },
  { label: 'Grupos', value: '58', subLabel: 'Grupos activos' },
  { label: 'Preguntas', value: '4,201', subLabel: 'Banco actual' },
  { label: 'Partidas', value: '312', subLabel: 'Jugadas este mes' },
]
</script>

<template>
  <div class="px-4 md:px-6 lg:px-8 py-6 space-y-6">
    <EventBanner
      target="2025-10-15T13:00:00"
      title="Torneo Inter-Grupal"
      image-src="/image-reference.webp"
      details-label="Ver detalles"
      locale="es-PA"
      @details="() => console.log('Ver detalles')"
    >
      <!-- chip opcional dentro del banner -->
      <div
        class="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 text-xs font-medium"
      >
        Inscripciones abiertas
      </div>
    </EventBanner>

    <KPIGrid :items="kpis">
      <!-- Ejemplo de íconos por índice (slot) -->
      <template #icon="{ index }">
        <svg
          v-if="index === 0"
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-white/90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path
            d="M20 21v-2a4 4 0 0 0-3-3.87M4 21v-2a4 4 0 0 1 3-3.87M7 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
          />
          <path d="M17 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" />
        </svg>
        <svg
          v-else-if="index === 1"
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-white/90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 3h18v4H3zM3 10h18v11H3z" />
          <path d="M7 10v11M12 10v11M17 10v11" />
        </svg>
        <svg
          v-else-if="index === 2"
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-white/90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M3 12h18M3 6h18M3 18h18" />
        </svg>
        <svg
          v-else
          xmlns="http://www.w3.org/2000/svg"
          class="w-5 h-5 text-white/90"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
        >
          <path d="M4 19h16M4 15h10M4 11h7M4 7h13" />
        </svg>
      </template>
    </KPIGrid>
  </div>
</template>
