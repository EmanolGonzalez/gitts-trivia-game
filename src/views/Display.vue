<script setup lang="ts">
import { onMounted, onBeforeUnmount, computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'

type DecisionKind = 'correct' | 'incorrect' | null

const game = useGameStore()

// ----------- Derivados de estado -----------
const q = computed(() => game.currentQuestion)
const category = computed(() => game.categories.find((c) => c.id === q.value?.categoryId))
// Only include teams that are enabled (participating)
const teamsSorted = computed(() =>
  [...game.teams].filter((t) => t.enabled ?? true).sort((a, b) => b.score - a.score),
)
const activeTeam = computed(() => game.activeTeam)
const timeMain = computed(() => game.timeRemaining)
const timeBuzzer = computed(() => game.buzzerTimeRemaining)
const isPaused = computed(() => !game.isTimerActive && game.timeRemaining > 0)
const isQuestion = computed(() => game.displayMode === 'question')

// Progreso (aprox) para barras
const generalProgress = computed(() => {
  const total = q.value?.timeLimit ?? game.defaultTimeLimit
  if (!total || total <= 0) return 0
  return Math.min(100, Math.max(0, Math.round((Math.max(0, game.timeRemaining) / total) * 100)))
})
const buzzerProgress = computed(() => {
  const total = q.value?.buzzerTimeLimit ?? game.buzzerTimeLimit
  if (!total || total <= 0) return 0
  return Math.min(
    100,
    Math.max(0, Math.round((Math.max(0, game.buzzerTimeRemaining) / total) * 100)),
  )
})

// ----------- UX del overlay de calificación -----------
const decisionKind = ref<DecisionKind>(null)
const decisionTeamId = ref<string | null>(null)
const decisionPoints = ref<number | null>(null)
const decisionVisible = ref(false)
let decisionTimer: number | null = null

function showDecision(kind: DecisionKind, teamId: string | null, pts: number | null) {
  decisionKind.value = kind
  decisionTeamId.value = teamId
  decisionPoints.value = pts
  decisionVisible.value = true
  if (decisionTimer) window.clearTimeout(decisionTimer)
  decisionTimer = window.setTimeout(() => {
    decisionVisible.value = false
    decisionKind.value = null
    decisionTeamId.value = null
    decisionPoints.value = null
  }, 1800)
}

const decisionTeam = computed(() => game.teams.find((t) => t.id === decisionTeamId.value) ?? null)

// ----------- Oír el canal SOLO para UX (no muta estado) -----------
let uxChannel: BroadcastChannel | null = null
function initUXChannel() {
  uxChannel = new BroadcastChannel('trivia')
  uxChannel.onmessage = (ev: MessageEvent) => {
    const msg = ev.data as { type?: string; teamId?: string; points?: number }
    if (!msg?.type) return
    if (msg.type === 'MARK_CORRECT') {
      const pts = typeof msg.points === 'number' ? msg.points : (q.value?.points ?? null)
      showDecision('correct', msg.teamId ?? null, pts)
    }
    if (msg.type === 'MARK_INCORRECT') {
      showDecision('incorrect', msg.teamId ?? null, null)
    }
  }
}

onMounted(() => {
  game.initBroadcastChannel('display')
  initUXChannel()
})

onBeforeUnmount(() => {
  if (uxChannel) {
    try {
      uxChannel.close()
    } catch {}
    uxChannel = null
  }
})

// ----------- Helpers visuales -----------
const displayIs = (m: string) => game.displayMode === (m as any)

// para el header de categoría (opcional si tienes icon en Category)
const categoryIconPath = computed(() => {
  switch ((category.value as any)?.icon) {
    case 'Sparkles':
      return 'M12 2l2.39 4.84L20 8l-4 3.9L17 18l-5-2.6L7 18l1-6.1L4 8l5.61-1.16L12 2z'
    case 'Atom':
      return 'M12 2a10 10 0 100 20 10 10 0 000-20zm0 6a2 2 0 110 4 2 2 0 010-4z'
    case 'Building':
      return 'M4 20h16V6l-8-4-8 4v14zm6-2H6v-2h4v2zm4 0h4v-2h-4v2zM6 14h4v-2H6v2zm8 0h4v-2h-4v2z'
    case 'Trophy':
      return 'M8 4h8v2h2a3 3 0 01-3 3h-1a5 5 0 01-10 0H3a3 3 0 01-3-3h2V4h6zM6 20h12v-2H6v2z'
    case 'Cpu':
      return 'M9 7h6v6H9zM5 9h2v2H5zM17 9h2v2h-2zM9 17h2v2H9zM13 17h2v2h-2z'
    case 'Palette':
      return 'M12 3a9 9 0 100 18c3 0 3-2 3-3h3a3 3 0 000-6h-1a5 5 0 10-5-9z'
    default:
      return null
  }
})

// Color de equipo activo
const activeRing = computed(() => activeTeam.value?.color ?? '#60a5fa')

// Helpers para estilo/scale cuando mostramos la decisión
function boxStyle(
  team: { id?: string; color?: string } | undefined,
  prominence: 'small' | 'med' | 'large' = 'med',
) {
  if (!team) return {}
  const color = team.color ?? '#94a3b8'
  if (team.id === decisionTeamId.value) {
    if (prominence === 'large') return { boxShadow: `0 22px 60px -22px ${color}aa` }
    return { boxShadow: `0 18px 48px -12px ${color}88, 0 6px 18px -8px ${color}55 inset` }
  }
  if (prominence === 'large') return { boxShadow: `0 18px 40px -18px ${color}88` }
  return { boxShadow: `0 10px 30px -10px ${color}66` }
}

function scaleClass(team: { id?: string } | undefined) {
  return team && team.id === decisionTeamId.value ? 'scale-105' : ''
}
</script>

<template>
  <div class="min-h-dvh w-full relative overflow-hidden">
    <!-- HEADER -->
    <header
      class="relative z-10 container mx-auto px-4 pt-6 pb-3 flex items-center justify-between"
    >
      <div class="flex items-center gap-3">
        <div
          v-if="categoryIconPath"
          class="h-10 w-10 grid place-items-center rounded-xl bg-white/10 ring-1 ring-white/10"
        >
          <svg viewBox="0 0 24 24" class="h-6 w-6">
            <path :d="categoryIconPath!" fill="currentColor"></path>
          </svg>
        </div>
        <div>
          <p class="text-xs uppercase tracking-widest text-slate-400">Categoría</p>
          <h2 class="text-xl font-semibold leading-tight">{{ category?.name ?? '—' }}</h2>
        </div>
      </div>

      <!-- Timers (Header): muestra buzzer si está activo; si no, el general -->
      <div class="flex items-center gap-3">
        <!-- Timer general -->
        <div
          v-if="!game.isBuzzerTimerActive && game.displayMode === 'question'"
          class="rounded-xl bg-sky-500/15 ring-1 ring-sky-400/30 px-3 py-2 flex items-center gap-3"
          aria-label="Tiempo de pregunta"
        >
          <div
            class="hidden sm:block w-28 h-1.5 rounded bg-white/10 overflow-hidden"
            role="progressbar"
            :aria-valuenow="generalProgress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-1.5 bg-sky-400 transition-[width] duration-200"
              :style="{ width: generalProgress + '%' }"
            ></div>
          </div>
          <span class="text-xs text-sky-200">Tiempo</span>
          <span class="tabular-nums text-lg font-bold">
            <template v-if="game.isTimerActive">{{ timeMain }}</template>
            <template v-else>⏸</template>
          </span>
        </div>

        <!-- Timer buzzer -->
        <div
          v-if="game.isBuzzerTimerActive"
          class="rounded-xl bg-rose-500/20 ring-1 ring-rose-400/30 px-3 py-2 flex items-center gap-3"
          aria-label="Tiempo de respuesta del equipo"
        >
          <div
            class="hidden sm:block w-28 h-1.5 rounded bg-white/10 overflow-hidden"
            role="progressbar"
            :aria-valuenow="buzzerProgress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div
              class="h-1.5 bg-rose-400 transition-[width] duration-200"
              :style="{ width: buzzerProgress + '%' }"
            ></div>
          </div>
          <span class="text-xs text-rose-200">Buzzer</span>
          <span class="tabular-nums text-lg font-bold">{{ timeBuzzer }}</span>
        </div>
      </div>
    </header>

    <!-- CONTENIDO PRINCIPAL -->
    <main class="relative z-10 container mx-auto px-4 pb-8">
      <!-- Espera -->
      <section v-if="displayIs('waiting')" class="h-[68vh] grid place-items-center">
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl font-extrabold tracking-tight">
            ¡Prepárense para jugar!
          </h1>
          <p class="mt-3 text-slate-300">El controlador iniciará la partida en breve…</p>
        </div>
      </section>

      <!-- Pausa -->
      <section v-else-if="displayIs('paused')" class="h-[68vh] grid place-items-center">
        <div class="text-center">
          <h1 class="text-4xl md:text-5xl font-extrabold">Pausa</h1>
          <p class="mt-3 text-slate-300">La partida se reanuda en instantes.</p>
        </div>
      </section>

      <!-- Marcador: podium style para top3 + lista para el resto -->
      <section v-else-if="displayIs('scoreboard')" class="mt-4">
        <h3 class="text-2xl font-bold mb-4">Tabla de puntuaciones</h3>

        <!-- Podium top 3 -->
        <div class="flex items-end justify-center gap-4 mb-6 px-2">
          <!-- Plata (2do) -->
          <div v-if="teamsSorted[1]" class="flex-1 flex items-end justify-center">
            <div class="w-full max-w-[14rem] text-center">
              <div
                :class="[
                  'rounded-2xl p-4 ring-1 ring-white/10 bg-white/5 transform translate-y-6 transition-transform duration-300',
                  scaleClass(teamsSorted[1]),
                ]"
                :style="boxStyle(teamsSorted[1])"
              >
                <div class="text-sm text-slate-300">2º</div>
                <div class="mt-2 font-semibold text-lg">{{ teamsSorted[1].name }}</div>
                <div class="mt-3 text-2xl font-extrabold tabular-nums">
                  {{ teamsSorted[1].score }}
                </div>
              </div>
              <div
                class="-mt-2 mx-auto w-10 h-10 rounded-b-md bg-slate-200/40 border border-white/10 flex items-center justify-center text-slate-800 font-bold text-sm"
              >
                ②
              </div>
            </div>
          </div>

          <!-- Oro (1ro) -->
          <div v-if="teamsSorted[0]" class="flex-1 flex items-end justify-center">
            <div class="w-full max-w-[18rem] text-center">
              <div
                :class="[
                  'rounded-3xl p-5 ring-1 ring-white/10 bg-gradient-to-br from-yellow-400/20 to-amber-500/10 transition-transform duration-300',
                  scaleClass(teamsSorted[0]),
                ]"
                :style="boxStyle(teamsSorted[0], 'large')"
              >
                <div class="text-sm text-amber-200">1º</div>
                <div class="mt-2 font-extrabold text-2xl">{{ teamsSorted[0].name }}</div>
                <div class="mt-3 text-4xl font-extrabold tabular-nums">
                  {{ teamsSorted[0].score }}
                </div>
              </div>
              <div
                class="-mt-3 mx-auto w-14 h-14 rounded-b-md bg-amber-400/80 border border-white/20 flex items-center justify-center text-slate-900 font-black text-lg"
              >
                ★
              </div>
            </div>
          </div>

          <!-- Bronce (3ro) -->
          <div v-if="teamsSorted[2]" class="flex-1 flex items-end justify-center">
            <div class="w-full max-w-[14rem] text-center">
              <div
                :class="[
                  'rounded-2xl p-4 ring-1 ring-white/10 bg-white/5 transform translate-y-6 transition-transform duration-300',
                  scaleClass(teamsSorted[2]),
                ]"
                :style="boxStyle(teamsSorted[2])"
              >
                <div class="text-sm text-slate-300">3º</div>
                <div class="mt-2 font-semibold text-lg">{{ teamsSorted[2].name }}</div>
                <div class="mt-3 text-2xl font-extrabold tabular-nums">
                  {{ teamsSorted[2].score }}
                </div>
              </div>
              <div
                class="-mt-2 mx-auto w-10 h-10 rounded-b-md bg-amber-700/30 border border-white/10 flex items-center justify-center text-slate-50 font-bold text-sm"
              >
                ③
              </div>
            </div>
          </div>
        </div>

        <!-- PUESTOS 4 Y 5 (si existen) como lista vertical, límite top5 -->
        <div class="mt-4 space-y-3 max-w-xl mx-auto">
          <article
            v-for="(t, idx) in teamsSorted.slice(3, 5)"
            :key="t.id"
            class="rounded-lg bg-white/5 ring-1 ring-white/6 p-3 flex items-center justify-between transition-transform duration-300"
            :class="{ 'scale-105': t.id === decisionTeamId }"
            :style="
              t.id === decisionTeamId
                ? {
                    boxShadow: `0 20px 40px -16px ${t.color ?? '#94a3b8'}88, 0 6px 18px -8px ${t.color ?? '#94a3b8'}55 inset`,
                  }
                : { boxShadow: `0 6px 18px -8px ${t.color ?? '#94a3b8'}55 inset` }
            "
          >
            <div>
              <div class="text-sm text-slate-300">#{{ idx + 4 }}</div>
              <div class="font-semibold">{{ t.name }}</div>
            </div>
            <div class="text-2xl font-black tabular-nums">{{ t.score }}</div>
          </article>
        </div>
      </section>

      <!-- Pregunta -->
      <section v-else-if="displayIs('question')" class="mt-2">
        <div
          class="relative rounded-3xl bg-white/5 ring-1 ring-white/10 p-6 md:p-8 overflow-hidden"
        >
          <!-- Glow -->
          <div
            class="absolute -inset-1 opacity-20 pointer-events-none"
            :style="{
              background: `radial-gradient(600px circle at 50% -10%, ${activeRing}33, transparent 40%)`,
            }"
          ></div>

          <div class="flex items-center justify-between gap-4">
            <div>
              <p class="text-sm uppercase tracking-widest text-slate-400">Pregunta</p>
              <h1 class="mt-2 text-3xl md:text-4xl font-bold leading-tight">
                {{ q?.text ?? '—' }}
              </h1>
            </div>

            <!-- Indicador de pausado -->
            <div v-if="isPaused" class="hidden md:flex items-center gap-2">
              <span class="text-xs text-slate-300">Reloj</span>
              <span class="px-2 py-1 rounded bg-slate-800/80 ring-1 ring-white/10 text-xs"
                >⏸ Pausado</span
              >
            </div>
          </div>

          <!-- Equipo activo -->
          <div class="mt-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div
                class="h-3 w-3 rounded-full"
                :style="{ backgroundColor: activeRing }"
                :class="{ 'animate-pulse': !!activeTeam }"
                aria-hidden="true"
              />
              <p class="text-sm text-slate-300">
                <span v-if="activeTeam">
                  Turno de
                  <span class="font-semibold" :style="{ color: activeRing }">
                    {{ activeTeam.name }}
                  </span>
                </span>
                <span v-else>Esperando timbre de algún equipo…</span>
              </p>
            </div>

            <div class="text-right">
              <p class="text-xs text-slate-400">Puntos</p>
              <p class="text-2xl font-extrabold tabular-nums">{{ q?.points ?? 0 }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Respuesta revelada -->
      <section v-else-if="displayIs('answer')" class="mt-4">
        <div class="rounded-3xl bg-emerald-500/10 ring-1 ring-emerald-400/20 p-6 md:p-8">
          <p class="text-sm uppercase tracking-widest text-emerald-300">Respuesta</p>
          <h2 class="mt-2 text-3xl md:text-4xl font-bold text-emerald-200">
            {{ q?.answer ?? '—' }}
          </h2>
        </div>
      </section>

      <!-- Fallback -->
      <section v-else class="h-[60vh] grid place-items-center text-slate-400">
        <p>Esperando instrucciones del controlador…</p>
      </section>
    </main>

    <!-- OVERLAY: Correcto / Incorrecto -->
    <transition name="fade">
      <div
        v-if="decisionVisible"
        class="absolute inset-0 z-20 grid place-items-center backdrop-blur-[2px]"
      >
        <div
          class="rounded-3xl px-8 py-6 text-center shadow-2xl"
          :class="
            decisionKind === 'correct'
              ? 'bg-emerald-600/90 ring-1 ring-emerald-300/40'
              : 'bg-rose-600/90 ring-1 ring-rose-300/40'
          "
        >
          <p class="text-sm uppercase tracking-widest text-white/80">
            {{ decisionKind === 'correct' ? '¡Respuesta correcta!' : 'Respuesta incorrecta' }}
          </p>

          <h3 class="mt-2 text-4xl font-black text-white drop-shadow-sm">
            <span v-if="decisionTeam">{{ decisionTeam.name }}</span>
            <span v-else>Equipo</span>
          </h3>

          <p
            v-if="decisionKind === 'correct' && decisionPoints != null"
            class="mt-1 text-xl font-semibold text-white/90"
          >
            +{{ decisionPoints }} puntos
          </p>

          <p v-else class="mt-3 text-white/90">Otro equipo puede responder…</p>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.25s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
