<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
    <div class="max-w-7xl mx-auto">
      <!-- Header -->
      <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mb-6">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-3xl font-black text-white mb-2">🎮 {{ gameName }}</h1>
            <p class="text-white/70">Panel de Control del Profesor</p>
          </div>
          <div class="text-right">
            <p class="text-white/70 text-sm">Pregunta</p>
            <p class="text-3xl font-bold text-white">
              {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
            </p>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <!-- Panel Principal -->
        <div class="lg:col-span-2 space-y-6">
          
          <!-- 🔥 NUEVO: Buzzer Control Section -->
          <div
            v-if="currentQuestion"
            class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <h2 class="text-xl font-bold text-white mb-4">🔴 Control de Buzzer</h2>
            
            <!-- Equipo Respondiendo -->
            <div v-if="hasActiveTeam" class="mb-6">
              <div
                class="p-6 rounded-xl border-2 animate-pulse"
                :style="{
                  backgroundColor: activeTeamColor + '20',
                  borderColor: activeTeamColor,
                }"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm text-white/70 mb-1">Respondiendo:</p>
                    <p class="text-2xl font-bold text-white">{{ activeTeamName }}</p>
                  </div>
                  <div class="text-right">
                    <p class="text-sm text-white/70 mb-1">Tiempo:</p>
                    <p
                      class="text-5xl font-black tabular-nums"
                      :class="timeRemaining <= 5 ? 'text-red-500' : 'text-white'"
                    >
                      {{ timeRemaining }}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <!-- Botones de Buzzer por Equipo -->
            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="team in teams"
                :key="team.id"
                @click="handleTeamBuzzed(team.id)"
                :disabled="
                  hasActiveTeam ||
                  disabledTeamsForQuestion.has(team.id) ||
                  gameStatus === 'show_answer'
                "
                class="relative p-4 rounded-xl font-bold text-white transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
                :style="{
                  backgroundColor: team.color + '40',
                  borderColor: team.color,
                  borderWidth: '2px',
                }"
                :class="{
                  'hover:scale-105 hover:shadow-lg': !hasActiveTeam && !disabledTeamsForQuestion.has(team.id),
                  'animate-pulse': activeRespondingTeam === team.id,
                }"
              >
                <!-- Indicador de luz (LED) -->
                <div
                  class="absolute top-2 right-2 w-4 h-4 rounded-full"
                  :class="{
                    'bg-green-500 animate-ping': activeRespondingTeam === team.id,
                    'bg-red-500': disabledTeamsForQuestion.has(team.id),
                    'bg-gray-500': !activeRespondingTeam && !disabledTeamsForQuestion.has(team.id),
                  }"
                ></div>
                
                <div class="flex items-center gap-2">
                  <span class="text-2xl">🔴</span>
                  <span>{{ team.name }}</span>
                </div>
                
                <!-- Estado -->
                <p class="text-xs mt-2 opacity-70">
                  {{ 
                    disabledTeamsForQuestion.has(team.id) ? '❌ Ya respondió' :
                    activeRespondingTeam === team.id ? '⏱️ Respondiendo' :
                    '✅ Disponible'
                  }}
                </p>
              </button>
            </div>

            <!-- Botón Resetear Pregunta -->
            <button
              v-if="disabledTeamsForQuestion.size > 0 || hasActiveTeam"
              @click="handleResetQuestionState"
              class="w-full mt-4 px-4 py-3 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-white rounded-xl font-semibold transition-colors"
            >
              🔄 Resetear Estado de Pregunta
            </button>
          </div>

          <!-- Pregunta Actual -->
          <div
            v-if="currentQuestion"
            class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6"
          >
            <div class="flex items-start justify-between mb-4">
              <span
                class="px-3 py-1 rounded-full text-sm font-bold"
                :style="{
                  backgroundColor: getCategoryColor(currentQuestion.category) + '40',
                  color: getCategoryColor(currentQuestion.category),
                }"
              >
                {{ currentQuestion.category }}
              </span>
              <div class="flex items-center gap-3">
                <span class="text-white/60 text-sm">{{ currentQuestion.points }} pts</span>
                <span class="text-white/60 text-sm">⏱️ {{ currentQuestion.timeLimit }}s</span>
              </div>
            </div>

            <h2 class="text-2xl font-bold text-white mb-4">
              {{ currentQuestion.question }}
            </h2>

            <div v-if="showCorrectAnswer" class="bg-green-500/20 border border-green-500/50 rounded-xl p-4">
              <p class="text-sm text-green-400 mb-1">Respuesta Correcta:</p>
              <p class="text-xl font-bold text-white">{{ currentQuestion.correctAnswer }}</p>
            </div>
          </div>

          <!-- Controles -->
          <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 class="text-lg font-bold text-white mb-4">⚙️ Controles</h3>
            <div class="grid grid-cols-2 gap-3">
              <button
                v-if="currentQuestionIndex === -1"
                @click="handleNextQuestion"
                class="col-span-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg transition-all"
              >
                🚀 Comenzar Juego
              </button>

              <button
                v-if="currentQuestion && !showCorrectAnswer"
                @click="handleShowAnswer"
                class="col-span-2 px-6 py-4 bg-gradient-to-r from-green-600 to-green-500 hover:from-green-700 hover:to-green-600 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                👁️ Mostrar Respuesta
              </button>

              <button
                v-if="hasNextQuestion && showCorrectAnswer"
                @click="handleNextQuestion"
                class="col-span-2 px-6 py-4 bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                ⏭️ Siguiente Pregunta
              </button>

              <button
                v-if="!hasNextQuestion && currentQuestionIndex >= 0"
                @click="handleShowLeaderboard"
                class="col-span-2 px-6 py-4 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-700 hover:to-yellow-600 text-white rounded-xl font-bold shadow-lg transition-all"
              >
                🏆 Ver Resultados Finales
              </button>

              <button
                v-if="gameStatus === 'leaderboard'"
                @click="handleCloseLeaderboard"
                class="col-span-2 px-6 py-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-white rounded-xl font-semibold transition-colors"
              >
                ✕ Cerrar Tabla
              </button>

              <button
                v-else-if="currentQuestion"
                @click="handleShowLeaderboard"
                class="col-span-2 px-6 py-4 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-white rounded-xl font-semibold transition-colors"
              >
                🏆 Ver Posiciones
              </button>

              <button
                @click="handleResetGame"
                class="col-span-2 px-6 py-4 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-white rounded-xl font-semibold transition-colors"
              >
                🔄 Reiniciar Juego
              </button>
            </div>
          </div>

          <!-- Equipos y Marcador -->
          <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 class="text-lg font-bold text-white mb-4">👥 Equipos</h3>
            <div class="space-y-3">
              <div
                v-for="team in teams"
                :key="team.id"
                class="bg-white/5 border border-white/10 rounded-xl p-4"
              >
                <div class="flex items-center justify-between mb-3">
                  <div class="flex items-center gap-3">
                    <div
                      class="w-4 h-4 rounded-full"
                      :style="{ backgroundColor: team.color }"
                    ></div>
                    <p class="font-bold text-white">{{ team.name }}</p>
                  </div>
                  <p class="text-2xl font-black text-white tabular-nums">{{ team.score }}</p>
                </div>

                <div v-if="currentQuestion" class="flex gap-2">
                  <button
                    @click="handleMarkCorrect(team.id)"
                    :disabled="!hasActiveTeam || activeRespondingTeam !== team.id"
                    class="flex-1 px-3 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400 rounded-lg font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ✓ Correcto
                  </button>
                  <button
                    @click="handleMarkWrong(team.id)"
                    :disabled="!hasActiveTeam || activeRespondingTeam !== team.id"
                    class="flex-1 px-3 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg font-semibold transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    ✗ Incorrecto
                  </button>
                </div>

                <div class="mt-3 flex gap-4 text-sm text-white/60">
                  <span>✅ {{ team.correctAnswers }} correctas</span>
                  <span>❌ {{ team.wrongAnswers }} incorrectas</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Sidebar: Lista de Preguntas -->
        <div class="space-y-6">
          <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
            <h3 class="text-lg font-bold text-white mb-4">📋 Preguntas</h3>
            <div class="space-y-2 max-h-[calc(100vh-12rem)] overflow-y-auto pr-2">
              <div
                v-for="(question, index) in questions"
                :key="question.id"
                class="p-3 rounded-xl border transition-all cursor-pointer"
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
                    <div class="flex items-center gap-2 flex-wrap">
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
                      <span class="text-xs text-white/60">⏱️ {{ question.timeLimit }}s</span>
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
const gameStatus = computed(() => gameStore.gameStatus)

// 🔥 NUEVO: Buzzer state
const activeRespondingTeam = computed(() => gameStore.activeRespondingTeam)
const activeTeamName = computed(() => gameStore.activeTeamName)
const activeTeamColor = computed(() => gameStore.activeTeamColor)
const timeRemaining = computed(() => gameStore.timeRemaining)
const disabledTeamsForQuestion = computed(() => gameStore.disabledTeamsForQuestion)
const hasActiveTeam = computed(() => gameStore.hasActiveTeam)

// Inicializar
onMounted(async () => {
  await gameStore.loadQuestions()
  await gameStore.loadGameState()
  gameStore.initBroadcastChannel('control')
  console.log('✅ Control Panel inicializado')
  console.log('📺 Abre /display en otra pestaña para ver la proyección')
})

// Handlers existentes
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

function handleCloseLeaderboard() {
  gameStore.closeLeaderboard()
}

function handleResetGame() {
  if (confirm('¿Estás seguro de reiniciar el juego? Se perderán todos los puntos.')) {
    gameStore.resetGame()
  }
}

// 🔥 NUEVO: Buzzer handlers
function handleTeamBuzzed(teamId: string) {
  gameStore.teamBuzzed(teamId)
}

function handleResetQuestionState() {
  if (confirm('¿Resetear el estado de esta pregunta? Todos los equipos podrán responder de nuevo.')) {
    gameStore.resetQuestionState()
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