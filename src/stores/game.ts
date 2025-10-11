// src/stores/game.ts
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  Question,
  Team,
  GameStatus,
  GameMessage,
  QuestionsData,
  GameData,
} from '@/types/game'

export const useGameStore = defineStore('game', () => {
  // Estado
  const questions = ref<Question[]>([])
  const teams = ref<Team[]>([])
  const currentQuestionIndex = ref(-1)
  const gameStatus = ref<GameStatus>('waiting')
  const showCorrectAnswer = ref(false)
  const gameChannel = ref<BroadcastChannel | null>(null)
  const gameName = ref('Torneo Inter-Grupal')

  // Computadas
  const currentQuestion = computed(() => {
    if (currentQuestionIndex.value >= 0 && currentQuestionIndex.value < questions.value.length) {
      return questions.value[currentQuestionIndex.value]
    }
    return null
  })

  const sortedTeams = computed(() => {
    return [...teams.value].sort((a, b) => b.score - a.score)
  })

  const totalQuestions = computed(() => questions.value.length)
  const hasNextQuestion = computed(() => currentQuestionIndex.value < questions.value.length - 1)

  // Acciones
  async function loadQuestions() {
    try {
      const response = await fetch('/data/questions.json')
      const data: QuestionsData = await response.json()
      questions.value = data.questions
    } catch (error) {
      console.error('Error cargando preguntas:', error)
    }
  }

  async function loadGameState() {
    try {
      const response = await fetch('/data/game-state.json')
      const data: GameData = await response.json()
      teams.value = data.teams
      gameStatus.value = data.currentGame.status
      currentQuestionIndex.value = data.currentGame.currentQuestionIndex
      gameName.value = data.currentGame.name
    } catch (error) {
      console.error('Error cargando estado del juego:', error)
    }
  }

  function initBroadcastChannel(role: 'control' | 'display') {
    if (gameChannel.value) {
      gameChannel.value.close()
    }

    gameChannel.value = new BroadcastChannel('trivia-game')

    if (role === 'display') {
      gameChannel.value.onmessage = (event: MessageEvent<GameMessage>) => {
        handleDisplayMessage(event.data)
      }
    }
  }

  function handleDisplayMessage(message: GameMessage) {
    switch (message.type) {
      case 'START_GAME':
        gameStatus.value = 'waiting'
        break
      case 'NEXT_QUESTION':
        currentQuestionIndex.value = message.questionIndex
        gameStatus.value = 'question'
        showCorrectAnswer.value = false
        break
      case 'SHOW_ANSWER':
        showCorrectAnswer.value = true
        gameStatus.value = 'show_answer'
        break
      case 'MARK_CORRECT':
        markCorrect(message.teamId, message.points)
        break
      case 'MARK_WRONG':
        markWrong(message.teamId)
        break
      case 'SHOW_LEADERBOARD':
        gameStatus.value = 'leaderboard'
        break
      case 'UPDATE_TEAMS':
        teams.value = message.teams
        break
      case 'RESET_GAME':
        resetGame()
        break
    }
  }

  function sendMessage(message: GameMessage) {
    if (gameChannel.value) {
      gameChannel.value.postMessage(message)
    }
  }

  function startGame() {
    gameStatus.value = 'waiting'
    currentQuestionIndex.value = -1
    sendMessage({ type: 'START_GAME' })
  }

  function nextQuestion() {
    if (hasNextQuestion.value) {
      currentQuestionIndex.value++
      const question = currentQuestion.value
      if (question) {
        sendMessage({
          type: 'NEXT_QUESTION',
          questionId: question.id,
          questionIndex: currentQuestionIndex.value,
        })
      }
    }
  }

  function showAnswer() {
    showCorrectAnswer.value = true
    if (currentQuestion.value) {
      sendMessage({
        type: 'SHOW_ANSWER',
        answer: currentQuestion.value.correctAnswer,
      })
    }
  }

  function markCorrect(teamId: string, points: number) {
    const team = teams.value.find((t) => t.id === teamId)
    if (team) {
      team.score += points
      team.correctAnswers++
      sendMessage({ type: 'UPDATE_TEAMS', teams: teams.value })
    }
  }

  function markWrong(teamId: string) {
    const team = teams.value.find((t) => t.id === teamId)
    if (team) {
      team.wrongAnswers++
      sendMessage({ type: 'UPDATE_TEAMS', teams: teams.value })
    }
  }

  function showLeaderboard() {
    gameStatus.value = 'leaderboard'
    sendMessage({ type: 'SHOW_LEADERBOARD' })
  }

  function resetGame() {
    currentQuestionIndex.value = -1
    gameStatus.value = 'waiting'
    showCorrectAnswer.value = false
    teams.value.forEach((team) => {
      team.score = 0
      team.correctAnswers = 0
      team.wrongAnswers = 0
    })
    sendMessage({ type: 'RESET_GAME' })
  }

  async function saveGameState() {
    // En un futuro, aquí guardarías en el archivo JSON
    // Por ahora solo en memoria
    console.log('Estado del juego guardado', {
      teams: teams.value,
      currentQuestionIndex: currentQuestionIndex.value,
      gameStatus: gameStatus.value,
    })
  }

  return {
    // Estado
    questions,
    teams,
    currentQuestionIndex,
    gameStatus,
    showCorrectAnswer,
    gameName,
    // Computadas
    currentQuestion,
    sortedTeams,
    totalQuestions,
    hasNextQuestion,
    // Acciones
    loadQuestions,
    loadGameState,
    initBroadcastChannel,
    startGame,
    nextQuestion,
    showAnswer,
    markCorrect,
    markWrong,
    showLeaderboard,
    resetGame,
    saveGameState,
    sendMessage,
  }
})