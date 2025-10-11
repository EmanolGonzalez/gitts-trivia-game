<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
    <!-- Waiting Screen -->
    <transition name="fade">
      <div v-if="gameStatus === 'waiting'" class="text-center space-y-8">
        <div class="text-8xl animate-pulse-slow">🎮</div>
        <h1 class="text-6xl font-black text-white">{{ gameName }}</h1>
        <p class="text-3xl text-white/70">Esperando inicio del juego...</p>
      </div>
    </transition>

    <!-- Question Screen -->
    <transition name="slide-up">
      <div v-if="gameStatus === 'question' || gameStatus === 'show_answer'" class="w-full max-w-6xl space-y-8">
        
        <!-- Pregunta -->
        <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12 text-center">
          <div class="flex items-center justify-between mb-8">
            <span
              class="px-6 py-3 rounded-full text-xl font-bold"
              :style="{
                backgroundColor: getCategoryColor(currentQuestion?.category || '') + '40',
                color: getCategoryColor(currentQuestion?.category || ''),
              }"
            >
              {{ currentQuestion?.category }}
            </span>
            <div class="flex items-center gap-6 text-white/60">
              <span class="text-xl">{{ currentQuestion?.points }} pts</span>
              <span class="text-xl">
                Pregunta {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
              </span>
            </div>
          </div>

          <h2 class="text-6xl font-black text-white mb-8 leading-tight">
            {{ currentQuestion?.question }}
          </h2>

          <!-- 🔥 Timer solo visible cuando hay equipo activo Y no se ha calificado -->
          <transition name="scale">
            <div v-if="hasActiveTeam && gameStatus === 'question' && !showIncorrectFeedback" class="mt-8">
              <div
                class="p-8 rounded-2xl border-4 animate-pulse"
                :style="{
                  backgroundColor: activeTeamColor + '20',
                  borderColor: activeTeamColor,
                }"
              >
                <div class="flex items-center justify-center gap-6">
                  <!-- Equipo -->
                  <div class="text-left">
                    <p class="text-lg text-white/70 mb-2">Respondiendo:</p>
                    <p class="text-4xl font-black text-white">{{ activeTeamName }}</p>
                  </div>
                  
                  <!-- Timer -->
                  <div
                    class="w-32 h-32 rounded-full flex items-center justify-center border-4 transition-all duration-300"
                    :class="timeRemaining <= 5 ? 'animate-bounce border-red-500' : ''"
                    :style="{ borderColor: activeTeamColor }"
                  >
                    <span
                      class="text-6xl font-black tabular-nums"
                      :class="timeRemaining <= 5 ? 'text-red-500' : 'text-white'"
                    >
                      {{ timeRemaining }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </transition>

          <!-- Mensaje esperando buzzer (cuando NO ha tocado nadie) -->
          <transition name="fade">
            <div
              v-if="!hasActiveTeam && !hasAnyTeamBuzzed && gameStatus === 'question' && !showIncorrectFeedback"
              class="mt-8 p-6 bg-blue-500/20 border-2 border-blue-500/50 rounded-2xl"
            >
              <p class="text-3xl font-bold text-blue-400 text-center animate-pulse">
                🔔 Esperando que un equipo presione el buzzer...
              </p>
            </div>
          </transition>

          <!-- Mensaje cuando se acaba el tiempo (solo si alguien ya tocó) -->
          <transition name="fade">
            <div
              v-if="hasAnyTeamBuzzed && timeRemaining === 0 && !hasActiveTeam && gameStatus === 'question' && !showIncorrectFeedback"
              class="mt-8 p-6 bg-red-500/20 border-2 border-red-500 rounded-2xl"
            >
              <p class="text-3xl font-bold text-red-400 text-center">⏰ ¡Tiempo Agotado!</p>
            </div>
          </transition>

          <!-- 🔥 Feedback de respuesta incorrecta (REEMPLAZA al timer) -->
          <transition name="scale">
            <div
              v-if="showIncorrectFeedback && gameStatus === 'question'"
              class="mt-8 p-8 bg-red-500/30 border-4 border-red-500 rounded-2xl animate-pulse"
            >
              <div class="text-center">
                <p class="text-6xl font-black text-red-400 mb-4">❌ ¡INCORRECTO!</p>
                <p class="text-3xl text-white" :style="{ color: incorrectTeamColor }">
                  {{ incorrectTeamName }}
                </p>
              </div>
            </div>
          </transition>
        </div>

        <!-- Respuesta (cuando se muestra) -->
        <transition name="scale">
          <div
            v-if="gameStatus === 'show_answer'"
            class="bg-gradient-to-r from-green-600/30 to-green-500/30 backdrop-blur-md border-2 border-green-500/70 rounded-3xl p-12 text-center"
          >
            <p class="text-2xl text-green-400 mb-4">Respuesta Correcta:</p>
            <p class="text-7xl font-black text-white">{{ currentQuestion?.correctAnswer }}</p>
          </div>
        </transition>
      </div>
    </transition>

    <!-- Leaderboard Screen -->
    <transition name="fade">
      <div v-if="gameStatus === 'leaderboard'" class="w-full max-w-5xl">
        <div class="bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl p-12">
          <h1 class="text-6xl font-black text-white text-center mb-12">🏆 Tabla de Posiciones</h1>
          
          <div class="space-y-4">
            <div
              v-for="(team, index) in sortedTeams"
              :key="team.id"
              class="bg-white/5 border border-white/10 rounded-2xl p-6 hover:bg-white/10 transition-all"
            >
              <div class="flex items-center gap-6">
                <!-- Posición -->
                <div
                  class="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black"
                  :class="{
                    'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white': index === 0,
                    'bg-gradient-to-br from-gray-400 to-gray-500 text-white': index === 1,
                    'bg-gradient-to-br from-orange-600 to-orange-700 text-white': index === 2,
                    'bg-white/10 text-white/60': index > 2,
                  }"
                >
                  {{ index + 1 }}
                </div>

                <!-- Info del equipo -->
                <div class="flex-1">
                  <p class="text-2xl font-bold text-white mb-1">{{ team.name }}</p>
                  <div class="flex items-center gap-4 text-white/60">
                    <span>✅ {{ team.correctAnswers }}</span>
                    <span>❌ {{ team.wrongAnswers }}</span>
                  </div>
                </div>

                <!-- Score -->
                <div class="text-right">
                  <p class="text-5xl font-black text-white tabular-nums">{{ team.score }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>

    <!-- Finished Screen -->
    <transition name="fade">
      <div v-if="gameStatus === 'finished'" class="text-center space-y-12">
        <div class="text-9xl animate-bounce">🎉</div>
        <h1 class="text-7xl font-black text-white">¡Juego Terminado!</h1>
        <p class="text-3xl text-white/70">Gracias por participar</p>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const gameStore = useGameStore()

// Computed
const gameStatus = computed(() => gameStore.gameStatus)
const currentQuestion = computed(() => gameStore.currentQuestion)
const currentQuestionIndex = computed(() => gameStore.currentQuestionIndex)
const totalQuestions = computed(() => gameStore.totalQuestions)
const sortedTeams = computed(() => gameStore.sortedTeams)
const gameName = computed(() => gameStore.gameName)

// 🔥 NUEVO: Buzzer state
const activeTeamName = computed(() => gameStore.activeTeamName)
const activeTeamColor = computed(() => gameStore.activeTeamColor)
const timeRemaining = computed(() => gameStore.timeRemaining)
const hasActiveTeam = computed(() => gameStore.hasActiveTeam)
const hasAnyTeamBuzzed = computed(() => gameStore.hasAnyTeamBuzzed)
const showIncorrectFeedback = computed(() => gameStore.showIncorrectFeedback)
const incorrectTeamName = computed(() => gameStore.incorrectTeamName)
const incorrectTeamColor = computed(() => gameStore.incorrectTeamColor)

// Inicializar
onMounted(async () => {
  await gameStore.loadQuestions()
  await gameStore.loadGameState()
  gameStore.initBroadcastChannel('display')
  console.log('📺 Display Screen inicializado y escuchando...')
})

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

<style scoped>
/* Animations */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active {
  transition: all 0.6s ease-out;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(30px);
}

.scale-enter-active {
  transition: all 0.5s ease-out;
}

.scale-enter-from {
  opacity: 0;
  transform: scale(0.9);
}

@keyframes pulse-slow {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.8;
  }
}

.animate-pulse-slow {
  animation: pulse-slow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>