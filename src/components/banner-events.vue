<template>
  <section class="w-full" aria-labelledby="event-heading" role="region">
    <div
      class="mx-auto w-full max-w-[1200px] rounded-2xl border border-white/15 bg-white/10 backdrop-blur-xl shadow-[0_10px_40px_rgba(0,0,0,0.4)] overflow-hidden"
    >
      <!-- GRID: texto / imagen -->
      <div class="grid grid-cols-1 md:grid-cols-2">
        <!-- Columna: Texto -->
        <div class="p-5 sm:p-6 lg:p-8 flex flex-col gap-4">
          <div class="text-white">
            <p class="text-[11px] uppercase tracking-wider text-white/70">Próximo evento</p>
            <h3 id="event-heading" class="text-2xl sm:text-3xl font-semibold leading-tight">
              {{ title }}
            </h3>
            <p class="text-xs sm:text-sm text-white/80 mt-1">{{ formattedDate }}</p>

            <!-- Countdown -->
            <div v-if="!isLive" class="mt-4">
              <div
                class="cdwrap flex flex-wrap items-center gap-2"
                aria-live="polite"
                aria-atomic="true"
              >
                <div class="cd-block">
                  <div :class="['cd-pill', { 'is-anim': animate.days }]">{{ days }}</div>
                  <span class="cd-label">Días</span>
                </div>
                <span class="cd-sep">:</span>
                <div class="cd-block">
                  <div :class="['cd-pill', { 'is-anim': animate.hours }]">{{ hours }}</div>
                  <span class="cd-label">Horas</span>
                </div>
                <span class="cd-sep">:</span>
                <div class="cd-block">
                  <div :class="['cd-pill', { 'is-anim': animate.minutes }]">{{ minutes }}</div>
                  <span class="cd-label">Min</span>
                </div>
                <span class="cd-sep">:</span>
                <div class="cd-block">
                  <div :class="['cd-pill', { 'is-anim': animate.seconds }]">{{ seconds }}</div>
                  <span class="cd-label">Seg</span>
                </div>
              </div>
            </div>

            <!-- En vivo -->
            <div v-else class="mt-4 flex items-center gap-2">
              <span class="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
              <span class="text-sm font-semibold text-white">EN VIVO</span>
            </div>
          </div>

          <!-- CTA / Slot externo -->
          <div class="pt-2">
            <div class="flex flex-col sm:flex-row gap-3 items-start">
              <slot />
            </div>
          </div>

          <!-- Hint accesible -->
          <p class="text-[11px] text-white/60">
            Consejo: permite ventanas emergentes si abrirás pantallas en nuevas pestañas.
          </p>
        </div>

        <!-- Columna: Imagen -->
        <div class="relative min-h-[220px] md:min-h-[100%]">
          <img
            :src="imageSrc"
            :alt="`Imagen del evento: ${title}`"
            class="absolute inset-0 w-full h-full object-contain md:object-center"
            loading="lazy"
            decoding="async"
          />
          <div
            class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/25 to-transparent"
          ></div>

          <!-- Etiqueta pegada a la imagen (opcional visual) -->
          <div class="absolute bottom-4 left-4">
            <span
              class="inline-flex items-center gap-2 rounded-full px-3 py-1 bg-emerald-400/20 text-emerald-100 border border-emerald-300/30 text-xs font-medium"
            >
              Próximo • {{ shortDate }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  target?: string | Date
  title?: string
  imageSrc?: string
  detailsLabel?: string
  locale?: string
  timeZone?: string
}>()

defineEmits<{ (e: 'details'): void }>()

// Defaults
const title = computed(() => props.title ?? 'Torneo Inter-Grupal')
const imageSrc = computed(() => props.imageSrc ?? '/image-reference.webp')
const detailsLabel = computed(() => props.detailsLabel ?? 'Ver detalles')

// Fecha objetivo segura
function parseTarget(input: string | Date | undefined): Date | null {
  if (!input) return new Date('2025-10-15T13:00:00')
  if (input instanceof Date) return isNaN(input.getTime()) ? null : input
  if (typeof input === 'string') {
    const d = new Date(input)
    return isNaN(d.getTime()) ? null : d
  }
  return null
}

const targetDate = parseTarget(props.target)

const loc = computed(() => props.locale ?? 'es-PA')
const tzOpt = computed(() => (props.timeZone ? { timeZone: props.timeZone } : {}))

const formattedDate = computed(() => {
  if (!targetDate) return '—'
  const datePart = new Intl.DateTimeFormat(loc.value, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...tzOpt.value,
  }).format(targetDate)
  const timePart = new Intl.DateTimeFormat(loc.value, {
    hour: 'numeric',
    minute: '2-digit',
    ...tzOpt.value,
  }).format(targetDate)
  return `${datePart} · ${timePart}`
})

const shortDate = computed(() => {
  if (!targetDate) return '—'
  return new Intl.DateTimeFormat(loc.value, {
    month: 'short',
    day: '2-digit',
    ...tzOpt.value,
  }).format(targetDate)
})

// Countdown
const days = ref('0')
const hours = ref('00')
const minutes = ref('00')
const seconds = ref('00')
const isLive = ref(false)
const animate = ref({ days: false, hours: false, minutes: false, seconds: false })

let timer: number | undefined
let resetAnimTimeout: number | undefined

function tick() {
  if (!targetDate) return
  const now = new Date()
  const diff = targetDate.getTime() - now.getTime()

  if (diff <= 0) {
    isLive.value = true
    days.value = '0'
    hours.value = '00'
    minutes.value = '00'
    seconds.value = '00'
    if (timer) clearInterval(timer)
    return
  }

  isLive.value = false
  const d = Math.floor(diff / 86400000)
  const h = Math.floor((diff / 3600000) % 24)
  const m = Math.floor((diff / 60000) % 60)
  const s = Math.floor((diff / 1000) % 60)

  const next = {
    days: String(d),
    hours: String(h).padStart(2, '0'),
    minutes: String(m).padStart(2, '0'),
    seconds: String(s).padStart(2, '0'),
  }

  const changed =
    days.value !== next.days ||
    hours.value !== next.hours ||
    minutes.value !== next.minutes ||
    seconds.value !== next.seconds

  animate.value = {
    days: days.value !== next.days,
    hours: hours.value !== next.hours,
    minutes: minutes.value !== next.minutes,
    seconds: seconds.value !== next.seconds,
  }

  days.value = next.days
  hours.value = next.hours
  minutes.value = next.minutes
  seconds.value = next.seconds

  if (changed) {
    if (resetAnimTimeout) clearTimeout(resetAnimTimeout)
    resetAnimTimeout = window.setTimeout(() => {
      animate.value = { days: false, hours: false, minutes: false, seconds: false }
    }, 250)
  }
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
  if (resetAnimTimeout) clearTimeout(resetAnimTimeout)
})
</script>

<style scoped>
.cdwrap .cd-block {
  display: grid;
  grid-template-rows: auto auto;
  gap: 0.25rem;
  text-align: center;
  min-width: 56px;
}
.cd-label {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.75);
}
.cd-sep {
  font-weight: 700;
  font-size: 1.1rem;
  opacity: 0.9;
  color: rgba(255, 255, 255, 0.95);
}
.cd-pill {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 56px;
  padding: 0.45rem 0.7rem;
  font-weight: 800;
  font-size: 1.05rem;
  color: white;
  border-radius: 0.9rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow:
    0 6px 16px rgba(0, 0, 0, 0.35),
    inset 0 2px 6px rgba(255, 255, 255, 0.08);
  transition: transform 0.24s cubic-bezier(0.2, 0.9, 0.3, 1);
  will-change: transform;
}
.cd-pill.is-anim {
  transform: translateY(-4px) scale(1.03);
}
</style>
