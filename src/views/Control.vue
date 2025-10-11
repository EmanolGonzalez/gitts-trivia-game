<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
    <div class="max-w-7xl mx-auto space-y-6">
      <!-- Header -->
      <div class="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-bold text-white">🎮 Panel de Control</h1>
            <p class="text-white/70 mt-1">{{ gameName }}</p>
          </div>
          <div class="flex items-center gap-3">
            <!-- 👇 NUEVO: Botón condicional - Muestra "Cerrar Tabla" si está en modo leaderboard -->
            <button
              v-if="gameStatus === 'leaderboard'"
              @click="handleCloseLeaderboard"
              class="px-6 py-3 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition"
            >
              ✕ Cerrar Tabla
            </button>
            <!-- Botón normal para mostrar tabla -->
            <button
              v-else
              @click="handleShowLeaderboard"
              class="px-6 py-3 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold transition"
            >
              🏆 Ver Posiciones
            </button>
            <button
              @click="handleResetGame"
              class="px-6 py-3 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition"
            >
              🔄 Reiniciar
            </button>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Pregunta Actual -->
        <div class="lg:col-span-2 space-y-6">
          <!-- Current Question Card -->
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-semibold text-white">Pregunta Actual</h2>
              <span class="px-4 py-2 rounded-full bg-blue-500/20 text-blue-300 text-sm font-medium">
                {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
              </span>
            </div>

            <div v-if="currentQuestion" class="space-y-4">
              <div class="bg-white/5 rounded-xl p-6 border border-white/10">
                <div class="flex items-center gap-3 mb-3">
                  <span
                    class="px-3 py-1 rounded-full text-xs font-semibold"
                    :style="{
                      backgroundColor: getCategoryColor(currentQuestion.category) + '20',
                      color: getCategoryColor(currentQuestion.category),
                    }"
                  >
                    {{ currentQuestion.category }}
                  </span>
                  <span class="px-3 py-1 rounded-full bg-white/10 text-white/80 text-xs font-semibold">
                    {{ currentQuestion.difficulty }}
                  </span>
                  <span class="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-semibold">
                    {{ currentQuestion.points }} pts
                  </span>
                </div>
                <p class="text-2xl font-bold text-white leading-relaxed">
                  {{ currentQuestion.question }}
                </p>

                <!-- Respuesta (visible solo para el control) -->
                <div
                  v-if="showCorrectAnswer"
                  class="mt-4 p-4 rounded-lg bg-emerald-500/20 border border-emerald-500/30"
                >
                  <p class="text-sm text-emerald-300 font-semibold mb-1">Respuesta Correcta:</p>
                  <p class="text-xl font-bold text-emerald-100">
                    {{ currentQuestion.correctAnswer }}
                  </p>
                </div>
              </div>

              <!-- Control Buttons -->
              <div class="flex gap-3">
                <button
                  v-if="!showCorrectAnswer"
                  @click="handleShowAnswer"
                  class="flex-1 px-6 py-4 rounded-xl bg-blue-500 hover:bg-blue-600 text-white font-semibold transition flex items-center justify-center gap-2"
                >
                  <span>👁️</span>
                  Mostrar Respuesta
                </button>
                <button
                  v-if="hasNextQuestion"
                  @click="handleNextQuestion"
                  class="flex-1 px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition flex items-center justify-center gap-2"
                >
                  <span>⏭️</span>
                  Siguiente Pregunta
                </button>
                <button
                  v-else
                  @click="handleShowLeaderboard"
                  class="flex-1 px-6 py-4 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-semibold transition flex items-center justify-center gap-2"
                >
                  <span>🏆</span>
                  Ver Resultados Finales
                </button>
              </div>
            </div>

            <div v-else class="text-center py-12">
              <p class="text-white/60 text-lg mb-4">No hay pregunta activa</p>
              <button
                @click="handleNextQuestion"
                class="px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition"
              >
                🚀 Comenzar Juego
              </button>
            </div>
          </div>

          <!-- Teams Manager -->
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6">
            <h2 class="text-xl font-semibold text-white mb-4">Equipos</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                v-for="team in teams"
                :key="team.id"
                class="bg-white/5 rounded-xl p-4 border border-white/10 hover:bg-white/10 transition"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div class="w-4 h-4 rounded-full" :style="{ backgroundColor: team.color }"></div>
                    <span class="font-semibold text-white">{{ team.name }}</span>
                  </div>
                  <span class="text-2xl font-bold text-white tabular-nums">{{ team.score }}</span>
                </div>

                <div class="flex items-center justify-between text-sm text-white/60 mb-3">
                  <span>✓ {{ team.correctAnswers }} correctas</span>
                  <span>✗ {{ team.wrongAnswers }} incorrectas</span>
                </div>

                <div v-if="currentQuestion" class="flex gap-2">
                  <button
                    @click="handleMarkCorrect(team.id)"
                    class="flex-1 px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition text-sm"
                  >
                    ✓ Correcto
                  </button>
                  <button
                    @click="handleMarkWrong(team.id)"
                    class="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition text-sm"
                  >
                    ✗ Incorrecto
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Questions List Sidebar -->
        <div class="lg:col-span-1">
          <div class="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 sticky top-6">
            <h2 class="text-xl font-semibold text-white mb-4">Todas las Preguntas</h2>
            <div class="space-y-2 max-h-[600px] overflow-y-auto">
              <div
                v-for="(question, index) in questions"
                :key="question.id"
                class="p-3 rounded-lg border transition cursor-pointer"
                :class="
                  index === currentQuestionIndex
                    ? 'bg-blue-500/20 border-blue-500/50'
                    : 'bg-white/5 border-white/10 hover:bg-white/10'
                "
              >
                <div class="flex items-start gap-3">
                  <span
                    class="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm"
                    :class="
                      index === currentQuestionIndex
                        ? 'bg-blue-500 text-white'
                        : 'bg-white/10 text-white/60'
                    "
                  >
                    {{ index + 1 }}
                  </span>
                  <div class="flex-1 min-w-0">
                    <p class="text-sm text-white/90 line-clamp-2 mb-2">
                      {{ question.question }}
                    </p>
                    <div class="flex items-center gap-2">
                      <span
                        class="px-2 py-1 rounded text-xs font-semibold"
                        :style="{
                          backgroundColor: getCategoryColor(question.category) + '20',
                          color: getCategoryColor(question.category),
                        }"
                      >
                        {{ question.category }}
                      </span>
                      <span class="text-xs text-white/60">{{ question.points }} pts</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

// Computed
const questions = computed(() => gameStore.questions)
const teams = computed(() => gameStore.teams)
const currentQuestion = computed(() => gameStore.currentQuestion)
const currentQuestionIndex = computed(() => gameStore.currentQuestionIndex)
const totalQuestions = computed(() => gameStore.totalQuestions)
const hasNextQuestion = computed(() => gameStore.hasNextQuestion)
const showCorrectAnswer = computed(() => gameStore.showCorrectAnswer)
const gameName = computed(() => gameStore.gameName)
const gameStatus = computed(() => gameStore.gameStatus) // 👈 NUEVO: Necesitamos el estado del juego

// Inicializar
onMounted(async () => {
  await gameStore.loadQuestions()
  await gameStore.loadGameState()
  gameStore.initBroadcastChannel('control')
  console.log('✅ Control Panel inicializado')
  console.log('📺 Abre /display en otra pestaña para ver la proyección')
})

// Handlers
function handleNextQuestion() {
  gameStore.nextQuestion()
}

function handleShowAnswer() {
  gameStore.showAnswer()
}

function handleMarkCorrect(teamId: string) {
  if (currentQuestion.value) {
    gameStore.markCorrect(teamId, currentQuestion.value.points)
  }
}

function handleMarkWrong(teamId: string) {
  gameStore.markWrong(teamId)
}

function handleShowLeaderboard() {
  gameStore.showLeaderboard()
}

// 👇 NUEVA FUNCIÓN
function handleCloseLeaderboard() {
  gameStore.closeLeaderboard()
}

function handleResetGame() {
  if (confirm('¿Estás seguro de reiniciar el juego? Se perderán todos los puntajes.')) {
    gameStore.resetGame()
  }
}

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Historia: '#f59e0b',
    Geografía: '#10b981',
    Ciencias: '#3b82f6',
    Matemáticas: '#8b5cf6',
    Literatura: '#ec4899',
  }
  return colors[category] || '#6b7280'
}
</script>