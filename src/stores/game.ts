// src/stores/game.ts
import { defineStore } from 'pinia'
import { ref, computed, onUnmounted } from 'vue'
import type {
  GameStatus,
  Team,
  Category,
  Question,
  GameData,
  QuestionsData,
  GameMessage,
  DisplayMode,
  StateSnapshotMessage,
} from '@/types/game'

// Claves para LocalStorage
const LS_CATEGORIES = 'trivia.categories'
const LS_QUESTIONS = 'trivia.questions'
const LS_SETTINGS = 'trivia.settings'

type Role = 'control' | 'display'

function toPlain<T>(x: T): T {
  // rompe proxies/reactive, funciones, símbolos, etc.
  return JSON.parse(JSON.stringify(x))
}

export const useGameStore = defineStore('game', () => {
  /** ---------------------
   *  ESTADO BASE
   * --------------------- */
  const status = ref<GameStatus>('lobby')
  const teams = ref<Team[]>([])
  const categories = ref<Category[]>([])
  const questions = ref<Question[]>([])

  const currentQuestionId = ref<string | null>(null)
  const activeTeamId = ref<string | null>(null)
  const hasAnyTeamBuzzed = ref<boolean>(false)

  // Modo visual actual del Display
  const displayMode = ref<DisplayMode>('waiting')

  // Timers (GENERAL)
  const timeRemaining = ref<number>(0)
  const isTimerActive = ref<boolean>(false)
  const generalDeadline = ref<number | null>(null)
  const generalStartedAt = ref<number | null>(null)
  // ⚠️ NUEVO: snapshot del tiempo restante al pausar
  const generalRemainingSnapshot = ref<number | null>(null)

  // Timers (BUZZER)
  const buzzerTimeRemaining = ref<number>(0)
  const isBuzzerTimerActive = ref<boolean>(false)
  const buzzerDeadline = ref<number | null>(null)
  const buzzerStartedAt = ref<number | null>(null)

  const timerInterval = ref<number | null>(null)
  const buzzerTimerInterval = ref<number | null>(null)

  const disabledTeamsForQuestion = ref<string[]>([])

  // Configuración
  const defaultTimeLimit = ref<number>(30)
  const buzzerTimeLimit = ref<number>(10)
  const sampleSize = ref<number>(10)
  const sampleRandomized = ref<boolean>(true)

  // Deck de preguntas (IDs seleccionadas)
  const questionDeck = ref<string[]>([])
  const deckIndex = ref<number>(-1)

  // Versión del estado
  const version = ref<number>(0)

  // Canal de comunicación
  const role = ref<Role>('display')
  const channel = ref<BroadcastChannel | null>(null)

  let snapshotInterval: number | null = null
  let helloRetryInterval: number | null = null

  /** ---------------------
   *  DERIVADOS
   * --------------------- */
  const currentQuestion = computed<Question | null>(
    () => questions.value.find((q) => q.id === currentQuestionId.value) ?? null,
  )

  const activeTeam = computed<Team | null>(
    () => teams.value.find((t) => t.id === activeTeamId.value) ?? null,
  )

  const availableTeams = computed<Team[]>(() =>
    teams.value.filter((t) => !disabledTeamsForQuestion.value.includes(t.id)),
  )

  /** ---------------------
   *  UTILIDADES
   * --------------------- */
  const now = () => Date.now()
  const calcRemaining = (deadline: number | null) =>
    deadline ? Math.max(0, Math.ceil((deadline - now()) / 1000)) : 0
  const bump = () => ++version.value

  function resetTimers() {
    if (timerInterval.value) clearInterval(timerInterval.value)
    timerInterval.value = null
    isTimerActive.value = false
    timeRemaining.value = 0
    generalDeadline.value = null
    generalStartedAt.value = null
    generalRemainingSnapshot.value = null // ← limpiar snapshot

    if (buzzerTimerInterval.value) clearInterval(buzzerTimerInterval.value)
    buzzerTimerInterval.value = null
    isBuzzerTimerActive.value = false
    buzzerTimeRemaining.value = 0
    buzzerDeadline.value = null
    buzzerStartedAt.value = null
  }

  function disableTeam(teamId: string) {
    if (!disabledTeamsForQuestion.value.includes(teamId))
      disabledTeamsForQuestion.value.push(teamId)
  }

  function enableAllTeamsForQuestion() {
    disabledTeamsForQuestion.value = []
  }

  function resetQuestionState() {
    activeTeamId.value = null
    hasAnyTeamBuzzed.value = false
    enableAllTeamsForQuestion()
    resetTimers()
  }

  function resetGame() {
    status.value = 'lobby'
    currentQuestionId.value = null
    displayMode.value = 'waiting'
    resetQuestionState()
    questionDeck.value = []
    deckIndex.value = -1
  }

  /** ---------------------
   *  TIMERS
   * --------------------- */
  function startGeneralTimer(seconds: number) {
    stopGeneralTimer()
    const v = bump()
    generalStartedAt.value = now()
    generalDeadline.value = generalStartedAt.value + seconds * 1000
    generalRemainingSnapshot.value = null // ← importante
    timeRemaining.value = seconds
    isTimerActive.value = true

    sendMessage({
      type: 'START_TIMER',
      timeLimit: seconds,
      startedAt: generalStartedAt.value!,
      deadline: generalDeadline.value!,
      version: v,
    })

    timerInterval.value = window.setInterval(() => {
      const remaining = calcRemaining(generalDeadline.value)
      timeRemaining.value = remaining
      if (remaining <= 0) {
        stopGeneralTimer(false)
        const v2 = bump()
        sendMessage({ type: 'TIME_EXPIRED', version: v2 })
        onTimeExpired()
      }
    }, 300)
  }

  function stopGeneralTimer(emit = true) {
    if (timerInterval.value) clearInterval(timerInterval.value)
    timerInterval.value = null
    isTimerActive.value = false
    generalDeadline.value = null
    generalStartedAt.value = null
    generalRemainingSnapshot.value = null // ← limpiar snapshot al stop
    if (emit) sendMessage({ type: 'STOP_TIMER', version: bump() })
  }

  // ⚠️ Cambiado: pausa REAL con snapshot (el deadline deja de correr)
  function pauseGeneralTimer() {
    if (!generalDeadline.value && generalRemainingSnapshot.value == null) {
      // nada que pausar
      return
    }
    // tomar remanente actual (en segundos)
    const remaining = calcRemaining(generalDeadline.value)
    generalRemainingSnapshot.value = remaining
    if (timerInterval.value) clearInterval(timerInterval.value)
    timerInterval.value = null
    isTimerActive.value = false

    // anular deadline para que no siga decreciendo en segundo plano
    generalDeadline.value = null
    generalStartedAt.value = null

    // mantener visible el remanente en timeRemaining (opcional)
    timeRemaining.value = remaining

    sendMessage({ type: 'PAUSE_TIMER', version: bump() })
  }

  // ⚠️ Cambiado: reanudar desde snapshot reconstruyendo deadline
  function resumeGeneralTimer() {
    if (isTimerActive.value) return

    // si tenemos snapshot úsalo; si no, calcula desde deadline (fallback)
    let remaining = generalRemainingSnapshot.value
    if (remaining == null) {
      remaining = calcRemaining(generalDeadline.value)
    }

    if (!remaining || remaining <= 0) {
      // no queda tiempo, comportarse como expirado
      stopGeneralTimer(false)
      sendMessage({ type: 'TIME_EXPIRED', version: bump() })
      onTimeExpired()
      return
    }

    const v = bump()
    generalStartedAt.value = now()
    generalDeadline.value = generalStartedAt.value + remaining * 1000
    isTimerActive.value = true
    generalRemainingSnapshot.value = null // ← consumir snapshot

    sendMessage({
      type: 'RESUME_TIMER',
      version: v,
    })

    timerInterval.value = window.setInterval(() => {
      const r = calcRemaining(generalDeadline.value)
      timeRemaining.value = r
      if (r <= 0) {
        stopGeneralTimer(false)
        sendMessage({ type: 'TIME_EXPIRED', version: bump() })
        onTimeExpired()
      }
    }, 300)
  }

  function startBuzzerTimer(seconds: number) {
    stopBuzzerTimer()
    const v = bump()
    buzzerStartedAt.value = now()
    buzzerDeadline.value = buzzerStartedAt.value + seconds * 1000
    buzzerTimeRemaining.value = seconds
    isBuzzerTimerActive.value = true

    sendMessage({
      type: 'START_BUZZER_TIMER',
      timeLimit: seconds,
      startedAt: buzzerStartedAt.value!,
      deadline: buzzerDeadline.value!,
      version: v,
    })

    buzzerTimerInterval.value = window.setInterval(() => {
      const remaining = calcRemaining(buzzerDeadline.value)
      buzzerTimeRemaining.value = remaining
      if (remaining <= 0) {
        stopBuzzerTimer(false)
        sendMessage({ type: 'BUZZER_TIME_EXPIRED', version: bump() })
        onBuzzerExpired()
      }
    }, 300)
  }

  function stopBuzzerTimer(emit = true) {
    if (buzzerTimerInterval.value) clearInterval(buzzerTimerInterval.value)
    buzzerTimerInterval.value = null
    isBuzzerTimerActive.value = false
    buzzerTimeRemaining.value = 0
    buzzerDeadline.value = null
    buzzerStartedAt.value = null
    if (emit) sendMessage({ type: 'STOP_BUZZER_TIMER', version: bump() })
  }

  function onTimeExpired() {
    // Mantienes tu flujo: review y luego decides avanzar
    status.value = 'review'
  }

  function onBuzzerExpired() {
    if (activeTeamId.value) disableTeam(activeTeamId.value)
    activeTeamId.value = null
    hasAnyTeamBuzzed.value = false

    // Si no quedan equipos disponibles, cerrar la ronda actual
    if (availableTeams.value.length === 0) {
      stopGeneralTimer(false)
      sendMessage({ type: 'TIME_EXPIRED', version: bump() })
      onTimeExpired()
      return
    }

    // Reanudar el general desde el snapshot
    resumeGeneralTimer()
  }

  /** ---------------------
   *  AUTO-LOAD DE DATOS
   * --------------------- */
  async function ensureDataLoaded() {
    const local = loadFromLocalStorage()
    if (local) {
      applyLoadedData(local.game, local.questions)
      sendMessage({ type: 'LOAD_DATA', game: local.game, questions: local.questions })
      sendStateSnapshot()
    } else {
      await loadFromPublicData()
    }
  }

  function loadFromLocalStorage(): { game: GameData; questions: QuestionsData } | null {
    try {
      const cats = JSON.parse(localStorage.getItem(LS_CATEGORIES) || 'null')
      const qs = JSON.parse(localStorage.getItem(LS_QUESTIONS) || 'null')
      const s = JSON.parse(localStorage.getItem(LS_SETTINGS) || 'null')

      if (!qs || !cats) return null

      const settings = {
        defaultTimeLimit: s?.defaultTimeLimit ?? defaultTimeLimit.value,
        buzzerTimeLimit: s?.buzzerTimeLimit ?? buzzerTimeLimit.value,
        sampleSize: s?.sampleSize ?? sampleSize.value,
        sampleRandomized: s?.sampleRandomized ?? sampleRandomized.value,
      }

      const gameState = {
        teams: [
          { id: 't-azules', name: 'Azules', score: 0, color: '#3b82f6' },
          { id: 't-rojos', name: 'Rojos', score: 0, color: '#ef4444' },
          { id: 't-verdes', name: 'Verdes', score: 0, color: '#22c55e' },
          { id: 't-amarillos', name: 'Amarillos', score: 0, color: '#f59e0b' },
        ],
        settings,
      } as GameData

      return { game: gameState, questions: { categories: cats, questions: qs } }
    } catch {
      return null
    }
  }

  async function loadFromPublicData() {
    const [qres, gres] = await Promise.all([
      fetch('/data/questions.json'),
      fetch('/data/game-state.json'),
    ])
    const questionsData = (await qres.json()) as QuestionsData
    const gameData = (await gres.json()) as GameData
    applyLoadedData(gameData, questionsData)
    sendMessage({ type: 'LOAD_DATA', game: gameData, questions: questionsData })
    sendStateSnapshot()
  }

  function applyLoadedData(game: GameData, qd: QuestionsData) {
    teams.value = (game.teams ?? []).map((t) => ({ ...t, score: t.score ?? 0 }))
    categories.value = qd.categories ?? []
    questions.value = qd.questions ?? []

    if (game.settings?.defaultTimeLimit != null)
      defaultTimeLimit.value = game.settings.defaultTimeLimit
    if (game.settings?.buzzerTimeLimit != null)
      buzzerTimeLimit.value = game.settings.buzzerTimeLimit
    if (game.settings?.sampleSize != null) sampleSize.value = game.settings.sampleSize
    if (game.settings?.sampleRandomized != null)
      sampleRandomized.value = game.settings.sampleRandomized
  }

  /** ---------------------
   *  DECK DE PREGUNTAS
   * --------------------- */
  function buildQuestionDeck() {
    const ids = questions.value.map((q) => q.id)
    const N = Math.max(1, Math.min(sampleSize.value, ids.length))
    const final = sampleRandomized.value ? shuffle(ids).slice(0, N) : ids.slice(0, N)
    questionDeck.value = final
    deckIndex.value = -1
  }

  function shuffle<T>(array: T[]): T[] {
    const a = [...array]
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[a[i], a[j]] = [a[j], a[i]]
    }
    return a
  }

  /** ---------------------
   *  FLUJO DE CONTROL
   * --------------------- */
  function startGame() {
    if (questions.value.length === 0) return
    buildQuestionDeck()
    status.value = 'question'
    displayMode.value = 'question'
    sendMessage({ type: 'START_GAME' })
    nextQuestion()
  }

  function selectQuestion(questionId: string) {
    currentQuestionId.value = questionId
    resetQuestionState()
    status.value = 'question'
    displayMode.value = 'question'
    if (defaultTimeLimit.value > 0) startGeneralTimer(defaultTimeLimit.value)
    sendMessage({ type: 'SELECT_QUESTION', questionId })
    sendStateSnapshot()
  }

  function showAnswer() {
    status.value = 'review'
    displayMode.value = 'answer'
    stopGeneralTimer()
    stopBuzzerTimer()
    sendMessage({ type: 'SHOW_ANSWER' })
    sendStateSnapshot()
  }

  function nextQuestion() {
    if (questionDeck.value.length === 0) buildQuestionDeck()
    const nextIdx = deckIndex.value + 1
    if (nextIdx >= questionDeck.value.length) {
      status.value = 'finished'
      displayMode.value = 'scoreboard'
      sendMessage({ type: 'NEXT_QUESTION' })
      sendStateSnapshot()
      return
    }
    deckIndex.value = nextIdx
    selectQuestion(questionDeck.value[deckIndex.value])
    sendMessage({ type: 'NEXT_QUESTION' })
  }

  function teamBuzzed(teamId: string) {
    if (hasAnyTeamBuzzed.value || disabledTeamsForQuestion.value.includes(teamId)) return
    hasAnyTeamBuzzed.value = true
    activeTeamId.value = teamId
    // Pausa REAL con snapshot
    pauseGeneralTimer()
    startBuzzerTimer(buzzerTimeLimit.value)
    sendMessage({ type: 'TEAM_BUZZED', teamId })
    sendStateSnapshot()
  }

  function markCorrect(teamId: string, points?: number) {
    const team = teams.value.find((t) => t.id === teamId)
    const pts = points ?? currentQuestion.value?.points ?? 0
    if (team) team.score += pts
    stopGeneralTimer()
    stopBuzzerTimer()
    status.value = 'review'
    sendMessage({ type: 'MARK_CORRECT', teamId, points: pts })
    sendStateSnapshot()
  }

  function markIncorrect(teamId: string) {
    disableTeam(teamId)
    stopBuzzerTimer()
    activeTeamId.value = null
    hasAnyTeamBuzzed.value = false

    // Si no quedan equipos disponibles -> cerrar la ronda
    if (availableTeams.value.length === 0) {
      stopGeneralTimer(false)
      sendMessage({ type: 'TIME_EXPIRED', version: bump() })
      onTimeExpired()
      sendMessage({ type: 'MARK_INCORRECT', teamId })
      sendStateSnapshot()
      return
    }

    // Reanudar desde snapshot
    resumeGeneralTimer()
    sendMessage({ type: 'MARK_INCORRECT', teamId })
    sendStateSnapshot()
  }

  function hardResetGame() {
    resetGame()
    teams.value = teams.value.map((t) => ({ ...t, score: 0 }))
    sendMessage({ type: 'RESET_GAME' })
    sendStateSnapshot()
  }

  function setDisplayMode(mode: DisplayMode) {
    displayMode.value = mode
    sendMessage({ type: 'SET_DISPLAY_MODE', mode })
    sendStateSnapshot()
  }

  /** ---------------------
   *  BROADCAST CHANNEL
   * --------------------- */
  function initBroadcastChannel(asRole: Role = 'display') {
    role.value = asRole
    if (channel.value) {
      try {
        channel.value.close()
      } catch {}
      channel.value = null
    }

    const bc = new BroadcastChannel('trivia')
    channel.value = bc
    bc.onmessage = (ev) => handleIncomingMessage(ev.data as GameMessage)

    if (role.value === 'display') {
      const ping = () => sendMessage({ type: 'HELLO' })
      ping()
      helloRetryInterval = window.setInterval(ping, 1000)
    }

    if (role.value === 'control') {
      ensureDataLoaded()
      startAutoSnapshots()
      // Primer snapshot de cortesía
      setTimeout(sendStateSnapshot, 300)
    }
  }

  function destroyBroadcastChannel() {
    if (channel.value) {
      try {
        channel.value.close()
      } catch {}
      channel.value = null
    }
    stopAutoSnapshots()
    if (helloRetryInterval) clearInterval(helloRetryInterval)
  }

  function sendMessage(msg: GameMessage) {
    if (!channel.value) return
    try {
      channel.value.postMessage(toPlain(msg))
    } catch (err) {
      console.error('BroadcastChannel postMessage failed', err)
    }
  }

  function sendStateSnapshot() {
    if (role.value !== 'control') return

    const snapshot: StateSnapshotMessage = {
      type: 'STATE_SNAPSHOT',
      payload: {
        version: version.value,
        status: status.value,
        // ⚠️ NO envies refs/proxies; usa copias planas
        teams: toPlain(teams.value),
        categories: toPlain(categories.value),
        questions: toPlain(questions.value),
        currentQuestionId: currentQuestionId.value,
        activeTeamId: activeTeamId.value,
        hasAnyTeamBuzzed: hasAnyTeamBuzzed.value,
        timeRemaining:
          generalRemainingSnapshot.value != null
            ? generalRemainingSnapshot.value
            : calcRemaining(generalDeadline.value),
        isTimerActive: isTimerActive.value,
        buzzerTimeRemaining: calcRemaining(buzzerDeadline.value),
        isBuzzerTimerActive: isBuzzerTimerActive.value,
        disabledTeamsForQuestion: toPlain(disabledTeamsForQuestion.value),
        settings: {
          defaultTimeLimit: defaultTimeLimit.value,
          buzzerTimeLimit: buzzerTimeLimit.value,
          sampleSize: sampleSize.value,
          sampleRandomized: sampleRandomized.value,
        },
        generalTimer:
          generalDeadline.value && generalStartedAt.value
            ? { startedAt: generalStartedAt.value, deadline: generalDeadline.value }
            : null,
        buzzerTimer:
          buzzerDeadline.value && buzzerStartedAt.value
            ? { startedAt: buzzerStartedAt.value, deadline: buzzerDeadline.value }
            : null,
        displayMode: displayMode.value,
      },
    }

    // 💡 enviar SIEMPRE como JSON plano
    channel.value?.postMessage(toPlain(snapshot))
  }

  function startAutoSnapshots() {
    if (snapshotInterval) clearInterval(snapshotInterval)
    snapshotInterval = window.setInterval(sendStateSnapshot, 2000)
  }

  function stopAutoSnapshots() {
    if (snapshotInterval) clearInterval(snapshotInterval)
    snapshotInterval = null
  }

  function handleIncomingMessage(msg: GameMessage) {
    switch (msg.type) {
      case 'HELLO':
        if (role.value === 'control') sendStateSnapshot()
        break

      case 'STATE_SNAPSHOT':
        if (role.value === 'display') {
          const s = msg.payload
          version.value = s.version
          status.value = s.status
          teams.value = s.teams
          categories.value = s.categories
          questions.value = s.questions
          currentQuestionId.value = s.currentQuestionId
          activeTeamId.value = s.activeTeamId
          hasAnyTeamBuzzed.value = s.hasAnyTeamBuzzed

          const gt = s.generalTimer ?? null
          const bt = s.buzzerTimer ?? null
          generalStartedAt.value = gt?.startedAt ?? null
          generalDeadline.value = gt?.deadline ?? null
          buzzerStartedAt.value = bt?.startedAt ?? null
          buzzerDeadline.value = bt?.deadline ?? null

          // si el control está en pausa con snapshot, respetarlo
          if (!s.isTimerActive && s.timeRemaining != null) {
            generalRemainingSnapshot.value = s.timeRemaining
          } else {
            generalRemainingSnapshot.value = null
          }

          timeRemaining.value = s.timeRemaining
          isTimerActive.value = s.isTimerActive
          buzzerTimeRemaining.value = s.buzzerTimeRemaining
          isBuzzerTimerActive.value = s.isBuzzerTimerActive

          disabledTeamsForQuestion.value = s.disabledTeamsForQuestion

          defaultTimeLimit.value = s.settings.defaultTimeLimit
          buzzerTimeLimit.value = s.settings.buzzerTimeLimit
          sampleSize.value = s.settings.sampleSize
          sampleRandomized.value = s.settings.sampleRandomized

          displayMode.value = s.displayMode ?? 'waiting'

          if (helloRetryInterval) {
            clearInterval(helloRetryInterval)
            helloRetryInterval = null
          }
          sendMessage({ type: 'ACK_SNAPSHOT', version: version.value })
        }
        break

      case 'LOAD_DATA':
        applyLoadedData((msg as any).game as GameData, (msg as any).questions as QuestionsData)
        break

      case 'START_GAME':
        status.value = 'question'
        break

      case 'SELECT_QUESTION':
        currentQuestionId.value = (msg as any).questionId
        resetQuestionState()
        status.value = 'question'
        break

      case 'SHOW_ANSWER':
        status.value = 'review'
        resetTimers()
        break

      case 'NEXT_QUESTION':
        break

      case 'RESET_QUESTION_STATE':
        resetQuestionState()
        break

      case 'RESET_GAME':
        resetGame()
        break

      // Timers general
      case 'START_TIMER':
        isTimerActive.value = true
        generalStartedAt.value = (msg as any).startedAt
        generalDeadline.value = (msg as any).deadline
        generalRemainingSnapshot.value = null
        timeRemaining.value = calcRemaining(generalDeadline.value)
        break
      case 'UPDATE_TIMER':
        timeRemaining.value = (msg as any).timeRemaining
        break
      case 'TIME_EXPIRED':
        isTimerActive.value = false
        timeRemaining.value = 0
        generalDeadline.value = null
        generalStartedAt.value = null
        generalRemainingSnapshot.value = null
        onTimeExpired()
        break
      case 'STOP_TIMER':
        isTimerActive.value = false
        generalDeadline.value = null
        generalStartedAt.value = null
        generalRemainingSnapshot.value = null
        break
      case 'PAUSE_TIMER':
        isTimerActive.value = false
        // mantener el snapshot que llega por snapshot periódico
        break
      case 'RESUME_TIMER':
        isTimerActive.value = true
        generalRemainingSnapshot.value = null
        break

      // Timers buzzer
      case 'START_BUZZER_TIMER':
        isBuzzerTimerActive.value = true
        buzzerStartedAt.value = (msg as any).startedAt
        buzzerDeadline.value = (msg as any).deadline
        buzzerTimeRemaining.value = calcRemaining(buzzerDeadline.value)
        break
      case 'UPDATE_BUZZER_TIMER':
        buzzerTimeRemaining.value = (msg as any).timeRemaining
        break
      case 'BUZZER_TIME_EXPIRED':
        isBuzzerTimerActive.value = false
        buzzerTimeRemaining.value = 0
        buzzerDeadline.value = null
        buzzerStartedAt.value = null
        onBuzzerExpired()
        break
      case 'STOP_BUZZER_TIMER':
        isBuzzerTimerActive.value = false
        buzzerDeadline.value = null
        buzzerStartedAt.value = null
        break

      case 'TEAM_BUZZED':
        if (
          !hasAnyTeamBuzzed.value &&
          !disabledTeamsForQuestion.value.includes((msg as any).teamId)
        ) {
          hasAnyTeamBuzzed.value = true
          activeTeamId.value = (msg as any).teamId
        }
        break

      case 'MARK_CORRECT': {
        const team = teams.value.find((t) => t.id === (msg as any).teamId)
        if (team) team.score += (msg as any).points
        status.value = 'review'
        resetTimers()
        break
      }

      case 'MARK_INCORRECT':
        disableTeam((msg as any).teamId)
        activeTeamId.value = null
        hasAnyTeamBuzzed.value = false
        break

      case 'SET_ACTIVE_TEAM':
        activeTeamId.value = (msg as any).teamId
        break

      case 'DISABLE_TEAM_FOR_QUESTION':
        disableTeam((msg as any).teamId)
        break

      case 'ENABLE_ALL_TEAMS_FOR_QUESTION':
        enableAllTeamsForQuestion()
        break

      case 'SET_DISPLAY_MODE':
        displayMode.value = (msg as any).mode
        break

      case 'ACK_SNAPSHOT':
        break
    }
  }

  onUnmounted(() => {
    if (timerInterval.value) clearInterval(timerInterval.value)
    if (buzzerTimerInterval.value) clearInterval(buzzerTimerInterval.value)
    destroyBroadcastChannel()
  })

  return {
    // estado
    status,
    teams,
    categories,
    questions,
    currentQuestionId,
    activeTeamId,
    hasAnyTeamBuzzed,
    timeRemaining,
    isTimerActive,
    buzzerTimeRemaining,
    isBuzzerTimerActive,
    disabledTeamsForQuestion,
    defaultTimeLimit,
    buzzerTimeLimit,
    displayMode,

    // NUEVO settings muestra
    sampleSize,
    sampleRandomized,

    // derivados
    currentQuestion,
    activeTeam,
    availableTeams,

    // control principal
    startGame,
    selectQuestion,
    showAnswer,
    nextQuestion,
    teamBuzzed,
    markCorrect,
    markIncorrect,
    hardResetGame,

    // timers
    startGeneralTimer,
    stopGeneralTimer,
    pauseGeneralTimer,
    resumeGeneralTimer,
    startBuzzerTimer,
    stopBuzzerTimer,

    // data
    ensureDataLoaded,
    loadFromPublicData,

    // display mode
    setDisplayMode,

    // canal
    initBroadcastChannel,
    destroyBroadcastChannel,
    sendMessage,
  }
})
