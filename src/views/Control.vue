<script setup lang="ts">
import { onMounted, onUnmounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const game = useGameStore()

// --------- Lifecycle ---------
onMounted(() => {
  game.initBroadcastChannel('control') // auto-carga (localStorage o /data) + snapshots
})
onUnmounted(() => {
  game.destroyBroadcastChannel()
})

// --------- Derivados útiles ---------
const q = computed(() => game.currentQuestion)
const isFinished = computed(() => game.status === 'finished')
const isReview = computed(() => game.status === 'review')
const isQuestion = computed(() => game.status === 'question')
const canPause = computed(() => isQuestion.value && game.isTimerActive)
const canResume = computed(() => isQuestion.value && !game.isTimerActive && game.timeRemaining > 0)

const canBuzz = (teamId: string) =>
  isQuestion.value &&
  !game.hasAnyTeamBuzzed &&
  !game.disabledTeamsForQuestion.includes(teamId) &&
  game.isTimerActive && // solo permitir buzz si el timer global corre
  game.timeRemaining > 0

const noTeamsAvailable = computed(
  () =>
    game.teams.length > 0 && game.teams.every((t) => game.disabledTeamsForQuestion.includes(t.id)),
)

// --------- Acciones ---------
function start() {
  if (game.questions.length === 0) {
    alert('No hay preguntas cargadas. Revisa Questions.vue o /data/questions.json')
    return
  }
  game.startGame()
}

function next() {
  game.nextQuestion()
}

function showAnswer() {
  game.showAnswer()
}

function buzz(teamId: string) {
  if (!canBuzz(teamId)) return
  game.teamBuzzed(teamId)
}

function correct(teamId?: string) {
  const id = teamId ?? game.activeTeamId ?? ''
  if (!id) return
  game.markCorrect(id)
}

function incorrect(teamId?: string) {
  const id = teamId ?? game.activeTeamId ?? ''
  if (!id) return
  game.markIncorrect(id)
}

function resetGame() {
  if (confirm('¿Reiniciar la partida y puntajes a 0?')) {
    game.hardResetGame()
  }
}

function toMode(mode: 'question' | 'answer' | 'scoreboard' | 'paused' | 'waiting') {
  game.setDisplayMode(mode)
}

function pauseClock() {
  if (canPause.value) game.pauseGeneralTimer()
}
function resumeClock() {
  if (canResume.value) game.resumeGeneralTimer()
}

// --------- Accesos rápidos por teclado ---------
//   Espacio: Mostrar respuesta (si está en pregunta) / Siguiente (si está en review)
//   N: Siguiente pregunta
//   1..9: simular buzz de equipo por índice
function onKey(e: KeyboardEvent) {
  if (e.target && (e.target as HTMLElement).tagName === 'INPUT') return
  if (e.code === 'Space') {
    e.preventDefault()
    if (game.status === 'question') showAnswer()
    else if (game.status === 'review') next()
  } else if (e.key.toLowerCase() === 'n') {
    next()
  } else if (/^[1-9]$/.test(e.key)) {
    const idx = Number(e.key) - 1
    const team = game.teams[idx]
    if (team) buzz(team.id)
  }
}
window.addEventListener('keydown', onKey)
onUnmounted(() => window.removeEventListener('keydown', onKey))

// --------- UI helpers ---------
const generalProgress = computed(() => {
  // porcentaje aproximado para barra (solo si hay tiempo configurado)
  const total = q.value?.timeLimit ?? game.defaultTimeLimit
  if (!total || total <= 0) return 0
  const remain = Math.max(0, game.timeRemaining)
  return Math.min(100, Math.round((remain / total) * 100))
})

const buzzerProgress = computed(() => {
  const total = q.value?.buzzerTimeLimit ?? game.buzzerTimeLimit
  if (!total || total <= 0) return 0
  const remain = Math.max(0, game.buzzerTimeRemaining)
  return Math.min(100, Math.round((remain / total) * 100))
})
</script>

<template>
  <div class="min-h-screen bg-slate-900 text-slate-100">
    <!-- Top bar -->
    <header class="sticky top-0 z-20 backdrop-blur bg-slate-900/70 border-b border-slate-800">
      <div class="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div
            class="h-8 w-8 rounded-lg bg-sky-500/20 border border-sky-400/30 grid place-content-center"
          >
            🎮
          </div>
          <div>
            <h1 class="text-xl font-semibold leading-tight">Sala de Control</h1>
            <p class="text-xs text-slate-400">
              Status: <span class="font-medium text-slate-200">{{ game.status }}</span> · Display:
              <span class="font-medium text-slate-200">{{ game.displayMode }}</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            @click="toMode('question')"
            title="Mostrar pregunta en pantalla"
          >
            Pregunta
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            @click="toMode('answer')"
            title="Mostrar respuesta en pantalla"
          >
            Respuesta
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            @click="toMode('scoreboard')"
            title="Mostrar puntuaciones"
          >
            Puntuaciones
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-sm"
            @click="toMode('paused')"
            title="Pausar visual"
          >
            Pausa
          </button>
          <button
            class="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 border border-rose-500 text-sm"
            @click="resetGame"
            title="Reiniciar partida"
          >
            Reiniciar
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Columna izquierda: Controles principales -->
      <section class="lg:col-span-2 space-y-6">
        <!-- Panel: Flujo de partida -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div class="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 class="font-semibold">Flujo de partida</h2>
            <div class="flex items-center gap-2">
              <button
                class="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
                @click="start"
                :disabled="game.status !== 'lobby' && game.questions.length > 0"
              >
                Iniciar
              </button>
              <button
                class="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium"
                @click="next"
                :disabled="isFinished"
                title="N o Espacio en review"
              >
                Siguiente
              </button>
            </div>
          </div>

          <div class="p-4 grid sm:grid-cols-2 gap-4">
            <!-- Pregunta actual -->
            <div class="rounded-xl border border-slate-800 p-4 bg-slate-950/40">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-slate-300">Pregunta actual</h3>

                <div class="flex items-center gap-2">
                  <button
                    class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs"
                    @click="pauseClock"
                    :disabled="!canPause"
                    title="Pausar reloj"
                  >
                    ⏸ Pausar
                  </button>
                  <button
                    class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs"
                    @click="resumeClock"
                    :disabled="!canResume"
                    title="Reanudar reloj"
                  >
                    ▶️ Reanudar
                  </button>

                  <span
                    v-if="game.isTimerActive"
                    class="text-xs px-2 py-1 rounded bg-sky-500/20 border border-sky-400/30"
                  >
                    ⏱ {{ game.timeRemaining }}s
                  </span>
                  <span
                    v-else
                    class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700"
                  >
                    ⏱ pausado
                  </span>
                </div>
              </div>

              <div v-if="q" class="space-y-2">
                <p class="text-lg leading-snug">{{ q.text }}</p>
                <div class="text-xs text-slate-400 flex items-center gap-3">
                  <span
                    >Puntos: <span class="font-semibold text-slate-200">{{ q.points }}</span></span
                  >
                  <span v-if="q.categoryId"
                    >· Cat: <span class="font-medium">{{ q.categoryId }}</span></span
                  >
                </div>

                <!-- Barra de progreso general -->
                <div class="mt-3">
                  <div class="h-2 rounded bg-slate-800 overflow-hidden">
                    <div
                      class="h-2 bg-sky-500 transition-[width] duration-200"
                      :style="{ width: generalProgress + '%' }"
                      role="progressbar"
                      aria-label="Tiempo de pregunta"
                      :aria-valuenow="generalProgress"
                      aria-valuemin="0"
                      aria-valuemax="100"
                    />
                  </div>
                  <div class="mt-1 text-[11px] text-slate-400">
                    {{ generalProgress }}%
                    <span v-if="q.timeLimit"> · tl={{ q.timeLimit }}s</span>
                  </div>
                </div>

                <div
                  v-if="isReview"
                  class="mt-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30"
                >
                  <div class="text-xs uppercase tracking-wide text-emerald-300 mb-1">Respuesta</div>
                  <div class="text-emerald-100">{{ q.answer }}</div>
                </div>
              </div>
              <div v-else class="text-slate-400 text-sm">No hay pregunta seleccionada.</div>

              <!-- Advertencia sin equipos disponibles -->
              <div
                v-if="isQuestion && noTeamsAvailable"
                class="mt-3 p-2 rounded-md bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200"
              >
                No quedan equipos disponibles para esta pregunta. Muestra la respuesta o avanza.
              </div>
            </div>

            <!-- Turno activo / buzzer -->
            <div class="rounded-xl border border-slate-800 p-4 bg-slate-950/40">
              <div class="flex items-center justify-between mb-2">
                <h3 class="text-sm font-semibold text-slate-300">Turno activo</h3>
                <span
                  v-if="game.isBuzzerTimerActive"
                  class="text-xs px-2 py-1 rounded bg-amber-500/20 border border-amber-400/30"
                >
                  🔔 {{ game.buzzerTimeRemaining }}s
                </span>
                <span v-else class="text-xs px-2 py-1 rounded bg-slate-800 border border-slate-700">
                  🔔 listo
                </span>
              </div>

              <div v-if="game.activeTeamId" class="flex items-center gap-3">
                <div class="h-2.5 w-2.5 rounded-full bg-emerald-400"></div>
                <div class="text-base font-medium">
                  {{ game.teams.find((t) => t.id === game.activeTeamId)?.name }}
                </div>
              </div>
              <div v-else class="text-slate-400 text-sm">Sin equipo activo.</div>

              <!-- Barra de progreso buzzer -->
              <div class="mt-3">
                <div class="h-2 rounded bg-slate-800 overflow-hidden">
                  <div
                    class="h-2 bg-amber-500 transition-[width] duration-200"
                    :style="{ width: buzzerProgress + '%' }"
                    role="progressbar"
                    aria-label="Tiempo del equipo"
                    :aria-valuenow="buzzerProgress"
                    aria-valuemin="0"
                    aria-valuemax="100"
                  />
                </div>
                <div class="mt-1 text-[11px] text-slate-400">{{ buzzerProgress }}%</div>
              </div>

              <div class="mt-3 flex items-center gap-2">
                <button
                  class="px-3 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm"
                  @click="correct()"
                  :disabled="!game.activeTeamId"
                >
                  Correcto
                </button>
                <button
                  class="px-3 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-sm"
                  @click="incorrect()"
                  :disabled="!game.activeTeamId"
                >
                  Incorrecto
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Panel: Equipos -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div class="p-4 border-b border-slate-800 flex items-center justify-between">
            <h2 class="font-semibold">Equipos</h2>
            <p class="text-xs text-slate-400">
              Tip: teclas <span class="font-semibold">1..9</span> hacen <em>buzz</em>.
            </p>
          </div>

          <div class="p-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div
              v-for="(t, idx) in game.teams"
              :key="t.id"
              class="rounded-xl border border-slate-800 p-4 bg-slate-950/40 flex flex-col gap-3"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span
                    class="inline-block h-2.5 w-2.5 rounded-full"
                    :style="{ backgroundColor: t.color || '#94a3b8' }"
                    :title="t.color"
                  />
                  <div class="font-medium">{{ t.name }}</div>
                </div>
                <div class="text-sm text-slate-300">
                  <span class="text-slate-400">Puntos:</span>
                  <span class="font-semibold">{{ t.score }}</span>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  class="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  @click="buzz(t.id)"
                  :disabled="!canBuzz(t.id)"
                  :title="`Tecla ${idx + 1}`"
                >
                  Buzz
                </button>
              </div>

              <div
                v-if="game.disabledTeamsForQuestion.includes(t.id)"
                class="text-xs text-rose-300"
              >
                Deshabilitado para esta pregunta
              </div>
              <div v-else-if="game.hasAnyTeamBuzzed" class="text-xs text-slate-400">
                Esperando calificación del equipo activo…
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Columna derecha: Configuración rápida y estado -->
      <aside class="space-y-6">
        <!-- Configuración -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div class="p-4 border-b border-slate-800">
            <h2 class="font-semibold">Configuración</h2>
          </div>
          <div class="p-4 space-y-4">
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm text-slate-300">Tiempo por pregunta (s)</label>
              <input
                type="number"
                class="w-28 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                v-model.number="game.defaultTimeLimit"
                min="5"
              />
            </div>
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm text-slate-300">Buzzer (s)</label>
              <input
                type="number"
                class="w-28 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                v-model.number="game.buzzerTimeLimit"
                min="3"
              />
            </div>
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm text-slate-300">Muestra (N)</label>
              <input
                type="number"
                class="w-28 rounded-lg bg-slate-800 border border-slate-700 px-3 py-2 text-sm"
                v-model.number="game.sampleSize"
                :min="1"
                :max="Math.max(1, game.questions.length)"
              />
            </div>
            <div class="flex items-center justify-between gap-3">
              <label class="text-sm text-slate-300">Aleatorizar muestra</label>
              <input
                type="checkbox"
                class="h-4 w-4 accent-sky-500"
                v-model="game.sampleRandomized"
              />
            </div>
            <p class="text-xs text-slate-400">
              La muestra se construye cuando inicias la partida. “Siguiente” avanza en ese deck.
            </p>
          </div>
        </div>

        <!-- Estado rápido -->
        <div class="rounded-2xl border border-slate-800 bg-slate-900/50">
          <div class="p-4 border-b border-slate-800">
            <h2 class="font-semibold">Estado</h2>
          </div>
          <div class="p-4 space-y-2 text-sm">
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Preguntas:</span>
              <span class="font-medium">{{ game.questions.length }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Equipos:</span>
              <span class="font-medium">{{ game.teams.length }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Modo Display:</span>
              <span class="font-medium">{{ game.displayMode }}</span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Reloj:</span>
              <span class="font-medium">
                <template v-if="game.isTimerActive">⏱ {{ game.timeRemaining }}s</template>
                <template v-else>⏸ pausado</template>
              </span>
            </div>
            <div class="flex items-center justify-between">
              <span class="text-slate-400">Buzzer:</span>
              <span class="font-medium">
                <template v-if="game.isBuzzerTimerActive"
                  >🔔 {{ game.buzzerTimeRemaining }}s</template
                >
                <template v-else>—</template>
              </span>
            </div>
          </div>

          <div class="px-4 pb-4 text-[11px] text-slate-400">
            Atajos: <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">Espacio</kbd> muestra/avanza ·
            <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">N</kbd> siguiente ·
            <kbd class="px-1.5 py-0.5 bg-slate-800 rounded">1..9</kbd> buzz por equipo
          </div>
        </div>
      </aside>
    </main>
  </div>
</template>
