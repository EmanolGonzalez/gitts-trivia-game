<template>
  <section class="w-full flex justify-center">
    <div class="w-full max-w-[1200px] space-y-4">
      <!-- Imagen superior -->
      <div
        class="relative w-full max-h-[400px] aspect-square overflow-hidden rounded-2xl border border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.5)]"
        role="img"
        :aria-label="`Imagen del evento ${title}`"
      >
        <img
          :src="imageSrc"
          alt="Banner del evento"
          class="absolute inset-0 w-full h-full object-contain md:object-center"
          loading="lazy"
          decoding="async"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent"
        ></div>
      </div>

      <!-- Tarjeta de información -->
      <div
        class="rounded-2xl backdrop-blur-xl bg-white/10 border border-white/15 p-5 sm:p-6 lg:p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-[0_10px_40px_rgba(0,0,0,0.4)]"
      >
        <!-- Texto -->
        <div class="text-white flex-1">
          <p class="text-[11px] uppercase tracking-wider text-white/80">Próximo evento</p>
          <h3 class="text-xl sm:text-2xl font-semibold leading-tight">{{ title }}</h3>
          <p class="text-xs sm:text-sm text-white/80 mt-1">{{ formattedDate }}</p>

          <!-- Countdown -->
          <div v-if="!isLive" class="mt-3 flex flex-wrap items-center gap-2">
            <div class="cdwrap flex items-center gap-1 sm:gap-2">
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
          <div v-else class="mt-3 flex items-center gap-2">
            <span class="inline-block w-3 h-3 rounded-full bg-green-400 animate-pulse"></span>
            <span class="text-sm font-semibold text-white">EN VIVO</span>
          </div>
        </div>

        <!-- CTA -->
        <div class="flex flex-col items-start md:items-end gap-3">
          <slot />
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

const title = computed(() => props.title ?? 'Torneo Inter-Grupal')
const imageSrc = computed(() => props.imageSrc ?? '/image-reference.webp')
const detailsLabel = computed(() => props.detailsLabel ?? 'Ver detalles')

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
const formattedDate = computed(() => {
  if (!targetDate) return '—'
  const loc = props.locale ?? 'es-PA'
  const tzOpt = props.timeZone ? { timeZone: props.timeZone } : {}
  const datePart = new Intl.DateTimeFormat(loc, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...tzOpt,
  }).format(targetDate)
  const timePart = new Intl.DateTimeFormat(loc, {
    hour: 'numeric',
    minute: '2-digit',
    ...tzOpt,
  }).format(targetDate)
  return `${datePart} · ${timePart}`
})

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
  const d = Math.floor(diff / (1000 * 60 * 60 * 24))
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const m = Math.floor((diff / (1000 * 60)) % 60)
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
    }, 300)
  }
}

onMounted(() => {
  tick()
  timer = window.setInterval(tick, 1000)
})
onUnmounted(() => {
  if (timer) clearInterval(timer)
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
  color: rgba(255, 255, 255, 0.7);
}
.cd-sep {
  font-weight: 700;
  font-size: 1.1rem;
  opacity: 0.85;
  color: rgba(255, 255, 255, 0.95);
}
.cd-pill {
  display: inline-flex;
  justify-content: center;
  align-items: center;
  min-width: 56px;
  padding: 0.4rem 0.6rem;
  font-weight: 700;
  font-size: 1.1rem;
  color: white;
  border-radius: 0.8rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.35);
  transition: transform 0.26s cubic-bezier(0.2, 0.9, 0.3, 1);
}
.cd-pill.is-anim {
  transform: translateY(-4px) scale(1.03);
}
</style>
