// src/stores/game.ts
import { ref, computed, toRaw } from 'vue'
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
  // Estado existente
  const questions = ref<Question[]>([])
  const teams = ref<Team[]>([])
  const currentQuestionIndex = ref(-1)
  const gameStatus = ref<GameStatus>('waiting')
  const previousGameStatus = ref<GameStatus | null>(null)
  const showCorrectAnswer = ref(false)
  const gameChannel = ref<BroadcastChannel | null>(null)
  const gameName = ref('Torneo Inter-Grupal')

  // 🔥 NUEVO: Estado del sistema de buzzer
  const activeRespondingTeam = ref<string | null>(null) // ID del equipo respondiendo
  const activeTeamName = ref<string>('') // Nombre del equipo
  const activeTeamColor = ref<string>('') // Color del equipo
  const timeRemaining = ref<number>(0) // Segundos restantes
  const timerInterval = ref<number | null>(null) // Referencia del interval
  const disabledTeamsForQuestion = ref<Set<string>>(new Set()) // Equipos que ya no pueden responder

  // Computadas existentes
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

  // 🔥 NUEVO: Computadas para buzzer
  const availableTeams = computed(() => {
    return teams.value.filter((team) => !disabledTeamsForQuestion.value.has(team.id))
  })

  const hasActiveTeam = computed(() => activeRespondingTeam.value !== null)

  // Acciones existentes
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
        resetQuestionState() // 👈 Resetear estado de buzzer en nueva pregunta
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
        teams.value = message.teams
        previousGameStatus.value = gameStatus.value
        gameStatus.value = 'leaderboard'
        break
      case 'CLOSE_LEADERBOARD':
        if (previousGameStatus.value) {
          gameStatus.value = previousGameStatus.value
          previousGameStatus.value = null
        }
        break
      case 'UPDATE_TEAMS':
        teams.value = message.teams
        break
      case 'RESET_GAME':
        resetGame()
        break
      // 🔥 NUEVOS: Handlers para buzzer
      case 'TEAM_BUZZED':
        activeRespondingTeam.value = message.teamId
        activeTeamName.value = message.teamName
        activeTeamColor.value = message.teamColor
        break
      case 'START_TIMER':
        timeRemaining.value = message.timeLimit
        startTimerCountdown()
        break
      case 'UPDATE_TIMER':
        timeRemaining.value = message.timeRemaining
        break
      case 'TIME_EXPIRED':
        handleTimeExpired()
        break
      case 'STOP_TIMER':
        stopTimer()
        break
      case 'RESET_QUESTION_STATE':
        resetQuestionState()
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
        resetQuestionState() // 👈 Limpiar estado de pregunta anterior
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
      
      // 🔥 NUEVO: Deshabilitar equipo después de responder correctamente
      disabledTeamsForQuestion.value.add(teamId)
      
      // Detener timer y limpiar equipo activo
      stopTimer()
      activeRespondingTeam.value = null
      activeTeamName.value = ''
      activeTeamColor.value = ''
      
      sendMessage({ type: 'UPDATE_TEAMS', teams: toRaw(teams.value) })
      sendMessage({ type: 'STOP_TIMER' })
    }
  }

  function markWrong(teamId: string) {
    const team = teams.value.find((t) => t.id === teamId)
    if (team) {
      team.wrongAnswers++
      
      // 🔥 NUEVO: Deshabilitar equipo después de fallar
      disabledTeamsForQuestion.value.add(teamId)
      
      // Detener timer y limpiar equipo activo (permitir que otro equipo toque)
      stopTimer()
      activeRespondingTeam.value = null
      activeTeamName.value = ''
      activeTeamColor.value = ''
      
      sendMessage({ type: 'UPDATE_TEAMS', teams: toRaw(teams.value) })
      sendMessage({ type: 'STOP_TIMER' })
    }
  }

  function showLeaderboard() {
    previousGameStatus.value = gameStatus.value
    gameStatus.value = 'leaderboard'
    sendMessage({ type: 'SHOW_LEADERBOARD', teams: toRaw(teams.value) })
  }

  function closeLeaderboard() {
    if (previousGameStatus.value) {
      gameStatus.value = previousGameStatus.value
      previousGameStatus.value = null
      sendMessage({ type: 'CLOSE_LEADERBOARD' })
    }
  }

  // 🔥 NUEVO: Cuando un equipo toca el buzzer
  function teamBuzzed(teamId: string) {
    // Solo permitir si no hay equipo activo y el equipo no está deshabilitado
    if (activeRespondingTeam.value || disabledTeamsForQuestion.value.has(teamId)) {
      return
    }

    const team = teams.value.find((t) => t.id === teamId)
    if (!team || !currentQuestion.value) {
      return
    }

    // Establecer equipo activo
    activeRespondingTeam.value = teamId
    activeTeamName.value = team.name
    activeTeamColor.value = team.color
    
    // Enviar a display
    sendMessage({
      type: 'TEAM_BUZZED',
      teamId: team.id,
      teamName: team.name,
      teamColor: team.color,
    })

    // Iniciar timer
    const timeLimit = currentQuestion.value.timeLimit || 30
    timeRemaining.value = timeLimit
    
    sendMessage({
      type: 'START_TIMER',
      timeLimit,
    })

    // Iniciar countdown local
    startTimerCountdown()
  }

  // 🔥 NUEVO: Countdown del timer
  function startTimerCountdown() {
    // Limpiar cualquier timer existente
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
    }

    timerInterval.value = window.setInterval(() => {
      if (timeRemaining.value > 0) {
        timeRemaining.value--
        sendMessage({
          type: 'UPDATE_TIMER',
          timeRemaining: timeRemaining.value,
        })
      } else {
        // Tiempo expirado
        stopTimer()
        sendMessage({ type: 'TIME_EXPIRED' })
        handleTimeExpired()
      }
    }, 1000)
  }

  // 🔥 NUEVO: Detener timer
  function stopTimer() {
    if (timerInterval.value) {
      clearInterval(timerInterval.value)
      timerInterval.value = null
    }
  }

  // 🔥 NUEVO: Manejar cuando expira el tiempo
  function handleTimeExpired() {
    if (activeRespondingTeam.value) {
      // Deshabilitar equipo que se quedó sin tiempo
      disabledTeamsForQuestion.value.add(activeRespondingTeam.value)
      
      // Limpiar equipo activo
      activeRespondingTeam.value = null
      activeTeamName.value = ''
      activeTeamColor.value = ''
      timeRemaining.value = 0
    }
    stopTimer()
  }

  // 🔥 NUEVO: Resetear estado de pregunta (para nueva pregunta)
  function resetQuestionState() {
    stopTimer()
    activeRespondingTeam.value = null
    activeTeamName.value = ''
    activeTeamColor.value = ''
    timeRemaining.value = 0
    disabledTeamsForQuestion.value.clear() // Limpiar equipos deshabilitados
    sendMessage({ type: 'RESET_QUESTION_STATE' })
  }

  function resetGame() {
    currentQuestionIndex.value = -1
    gameStatus.value = 'waiting'
    showCorrectAnswer.value = false
    previousGameStatus.value = null
    
    // 🔥 NUEVO: Resetear estado de buzzer
    stopTimer()
    resetQuestionState()
    
    teams.value.forEach((team) => {
      team.score = 0
      team.correctAnswers = 0
      team.wrongAnswers = 0
    })
    sendMessage({ type: 'RESET_GAME' })
  }

  async function saveGameState() {
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
    // 🔥 NUEVO: Estado buzzer
    activeRespondingTeam,
    activeTeamName,
    activeTeamColor,
    timeRemaining,
    disabledTeamsForQuestion,
    // Computadas
    currentQuestion,
    sortedTeams,
    totalQuestions,
    hasNextQuestion,
    // 🔥 NUEVO: Computadas buzzer
    availableTeams,
    hasActiveTeam,
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
    closeLeaderboard,
    resetGame,
    saveGameState,
    sendMessage,
    // 🔥 NUEVO: Acciones buzzer
    teamBuzzed,
    stopTimer,
    resetQuestionState,
  }
})