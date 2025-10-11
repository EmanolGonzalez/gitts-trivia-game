<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-8">
    <!-- Waiting Screen -->
    <transition name="fade">
      <div v-if="gameStatus === 'waiting'" class="text-center space-y-8">
        <div class="animate-pulse">
          <div class="w-32 h-32 mx-auto rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-6">
            <span class="text-6xl">🎮</span>
          </div>
        </div>
        <h1 class="text-6xl font-bold text-white mb-4">{{ gameName }}</h1>
        <p class="text-3xl text-white/70">Esperando que comience el juego...</p>
        <div class="flex items-center justify-center gap-2 mt-8">
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.1s"></div>
          <div class="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style="animation-delay: 0.2s"></div>
        </div>
      </div>
    </transition>

    <!-- Question Screen -->
    <transition name="slide-up">
      <div v-if="gameStatus === 'question' && currentQuestion" class="w-full max-w-6xl space-y-8">
        <!-- Question Header -->
        <div class="flex items-center justify-between mb-8">
          <div class="flex items-center gap-4">
            <span
              class="px-6 py-3 rounded-2xl text-xl font-bold"
              :style="{
                backgroundColor: getCategoryColor(currentQuestion.category) + '30',
                color: getCategoryColor(currentQuestion.category),
                border: `2px solid ${getCategoryColor(currentQuestion.category)}40`,
              }"
            >
              {{ currentQuestion.category }}
            </span>
            <span class="px-6 py-3 rounded-2xl bg-white/10 text-white text-xl font-bold border-2 border-white/20">
              {{ currentQuestion.difficulty }}
            </span>
          </div>
          <div class="flex items-center gap-4">
            <span class="px-6 py-3 rounded-2xl bg-emerald-500/20 text-emerald-300 text-xl font-bold border-2 border-emerald-500/30">
              {{ currentQuestion.points }} puntos
            </span>
            <span class="px-6 py-3 rounded-2xl bg-blue-500/20 text-blue-300 text-xl font-bold border-2 border-blue-500/30">
              Pregunta {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
            </span>
          </div>
        </div>

        <!-- Question Card -->
        <div class="bg-white/10 backdrop-blur-2xl rounded-3xl border-2 border-white/20 p-12 shadow-2xl">
          <p class="text-5xl sm:text-6xl font-bold text-white leading-tight text-center">
            {{ currentQuestion.question }}
          </p>
        </div>

        <!-- Waiting indicator -->
        <div class="text-center">
          <p class="text-2xl text-white/60">Esperando respuestas...</p>
        </div>
      </div>
    </transition>

    <!-- Answer Reveal Screen -->
    <transition name="scale">
      <div v-if="gameStatus === 'show_answer' && currentQuestion" class="w-full max-w-6xl space-y-8">
        <!-- Question (smaller) -->
        <div class="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-8">
          <div class="flex items-center gap-4 mb-4">
            <span
              class="px-4 py-2 rounded-xl text-lg font-bold"
              :style="{
                backgroundColor: getCategoryColor(currentQuestion.category) + '30',
                color: getCategoryColor(currentQuestion.category),
              }"
            >
              {{ currentQuestion.category }}
            </span>
            <span class="px-4 py-2 rounded-xl bg-blue-500/20 text-blue-300 text-lg font-bold">
              Pregunta {{ currentQuestionIndex + 1 }} / {{ totalQuestions }}
            </span>
          </div>
          <p class="text-3xl font-bold text-white/90">{{ currentQuestion.question }}</p>
        </div>

        <!-- Answer Card -->
        <div class="relative">
          <div class="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full"></div>
          <div class="relative bg-gradient-to-br from-emerald-500/30 to-green-600/30 backdrop-blur-2xl rounded-3xl border-4 border-emerald-400/50 p-16 shadow-2xl animate-pulse-slow">
            <p class="text-3xl text-emerald-300 font-bold mb-4 text-center">✓ Respuesta Correcta</p>
            <p class="text-6xl sm:text-7xl font-black text-white text-center leading-tight">
              {{ currentQuestion.correctAnswer }}
            </p>
          </div>
        </div>
      </div>
    </transition>

    <!-- Leaderboard Screen -->
    <transition name="fade">
      <div v-if="gameStatus === 'leaderboard'" class="w-full max-w-5xl">
        <div class="text-center mb-12">
          <h1 class="text-6xl font-black text-white mb-4">🏆 Tabla de Posiciones</h1>
          <p class="text-2xl text-white/70">Clasificación actual</p>
        </div>

        <div class="space-y-4">
          <div
            v-for="(team, index) in sortedTeams"
            :key="team.id"
            class="bg-white/10 backdrop-blur-xl rounded-2xl border-2 p-8 transition-all hover:scale-105"
            :class="{
              'border-yellow-400/50 bg-gradient-to-r from-yellow-500/20 to-yellow-600/20': index === 0,
              'border-gray-300/50': index === 1,
              'border-orange-400/50': index === 2,
              'border-white/20': index > 2,
            }"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-6">
                <!-- Position -->
                <div
                  class="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-black"
                  :class="{
                    'bg-gradient-to-br from-yellow-400 to-yellow-600 text-white': index === 0,
                    'bg-gradient-to-br from-gray-300 to-gray-500 text-white': index === 1,
                    'bg-gradient-to-br from-orange-400 to-orange-600 text-white': index === 2,
                    'bg-white/20 text-white/80': index > 2,
                  }"
                >
                  {{ index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1 }}
                </div>

                <!-- Team Info -->
                <div class="flex items-center gap-4">
                  <div class="w-6 h-6 rounded-full" :style="{ backgroundColor: team.color }"></div>
                  <span class="text-3xl font-bold text-white">{{ team.name }}</span>
                </div>
              </div>

              <!-- Stats -->
              <div class="flex items-center gap-8">
                <div class="text-center">
                  <p class="text-sm text-white/60">Correctas</p>
                  <p class="text-2xl font-bold text-emerald-400">{{ team.correctAnswers }}</p>
                </div>
                <div class="text-center">
                  <p class="text-sm text-white/60">Incorrectas</p>
                  <p class="text-2xl font-bold text-red-400">{{ team.wrongAnswers }}</p>
                </div>
                <div class="text-center px-8 py-4 rounded-2xl bg-white/10">
                  <p class="text-sm text-white/60 mb-1">Puntos</p>
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