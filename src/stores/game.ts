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
  OutgoingMessage as GameMessage,
  DisplayMode,
  StateSnapshotMessage,
  LoadDataMessage,
  SelectQuestionMessage,
  StartTimerMessage,
  UpdateTimerMessage,
  StartBuzzerTimerMessage,
  UpdateBuzzerTimerMessage,
  TeamBuzzedMessage,
  MarkCorrectMessage,
  MarkIncorrectMessage,
  RouletteResultMessage,
  SetActiveTeamMessage,
  DisableTeamForQuestionMessage,
  SetDisplayModeMessage,
} from '@/types/game'
import { saveUsedQuestions } from '@/utils/questionTracker'
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
  let autoNextTimeout: number | null = null
  // Audio elements for ambient and effects
  const ambientAudio = ref<HTMLAudioElement | null>(null)
  const correctAudio = ref<HTMLAudioElement | null>(null)
  const incorrectAudio = ref<HTMLAudioElement | null>(null)

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
    teams.value.filter(
      (t) => !disabledTeamsForQuestion.value.includes(t.id) && (t.enabled ?? true),
    ),
  )

  function setTeamParticipation(teamId: string, enabled: boolean) {
    const t = teams.value.find((x) => x.id === teamId)
    if (!t) return
    t.enabled = enabled
    // persist teams/settings so participation survives reload
    try {
      const gd = {
        teams: toPlain(teams.value),
        settings: {
          defaultTimeLimit: defaultTimeLimit.value,
          buzzerTimeLimit: buzzerTimeLimit.value,
          sampleSize: sampleSize.value,
          sampleRandomized: sampleRandomized.value,
        },
      }
      saveToLocalStorage(gd as GameData)
    } catch {}
    sendStateSnapshot()
  }

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
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout)
      autoNextTimeout = null
    }
    // stop any playing audio when resetting the game
    try {
      stopAllAudio()
    } catch {}
  }

  /** ---------------------
   * AUDIO (ambient + effects)
   * --------------------- */
  function initAudio(paths?: { ambient?: string; correct?: string; incorrect?: string }) {
    try {
      const aPath = paths?.ambient ?? '/sounds/ambient.mp3'
      const cPath = paths?.correct ?? '/sounds/correct.mp3'
      const iPath = paths?.incorrect ?? '/sounds/incorrect.mp3'
      // create audio elements only if not already created (idempotent)
      if (!ambientAudio.value) {
        ambientAudio.value = new Audio(aPath)
        ambientAudio.value.loop = true
        ambientAudio.value.preload = 'auto'
        ambientAudio.value.volume = 1
      } else if (ambientAudio.value.src !== aPath) {
        ambientAudio.value.src = aPath
      }

      if (!correctAudio.value) {
        correctAudio.value = new Audio(cPath)
        correctAudio.value.preload = 'auto'
      } else if (correctAudio.value.src !== cPath) {
        correctAudio.value.src = cPath
      }

      if (!incorrectAudio.value) {
        incorrectAudio.value = new Audio(iPath)
        incorrectAudio.value.preload = 'auto'
      } else if (incorrectAudio.value.src !== iPath) {
        incorrectAudio.value.src = iPath
      }

      // Try to start ambient (may be blocked by browser until user gesture)
      ambientAudio.value.play().catch(() => {
        // ignore autoplay rejection; will resume on user gesture or when nextQuestion() is called
      })
    } catch (err) {
      console.warn('initAudio failed', err)
    }
  }

  /* eslint-enable @typescript-eslint/no-unused-vars */

  function stopAllAudio() {
    try {
      if (ambientAudio.value) {
        ambientAudio.value.pause()
        try {
          ambientAudio.value.currentTime = 0
        } catch {}
      }
      if (correctAudio.value) {
        correctAudio.value.pause()
        try {
          correctAudio.value.currentTime = 0
        } catch {}
      }
      if (incorrectAudio.value) {
        incorrectAudio.value.pause()
        try {
          incorrectAudio.value.currentTime = 0
        } catch {}
      }
    } catch {}
  }

  function playCorrect() {
    try {
      // lower ambient volume smoothly, play effect and restore on end
      if (correctAudio.value) {
        correctAudio.value.currentTime = 0
        correctAudio.value.play().catch(() => {})
      }
    } catch {}
  }

  function playIncorrect() {
    try {
      // lower ambient volume smoothly, play effect and restore on end
      if (incorrectAudio.value) {
        incorrectAudio.value.currentTime = 0
        incorrectAudio.value.play().catch(() => {})
      }
    } catch {}
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
    // Cuando se agota el tiempo general, mostrar la respuesta y avanzar automáticamente
    // try {
    //   showAnswer()
    // } catch {
    //   // fallback: marcar review
    //   status.value = 'review'
    // }
    // programar avance automático a la siguiente pregunta tras 2.5s
    try {
      if (autoNextTimeout) {
        clearTimeout(autoNextTimeout)
      }
      autoNextTimeout = window.setTimeout(() => {
        autoNextTimeout = null
        try {
          nextQuestion()
        } catch {}
      }, 2500)
    } catch {}
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
    try {
      const localData = loadFromLocalStorage()
      if (localData) {
        applyLoadedData(localData.game, localData.questions)
        sendMessage({ type: 'LOAD_DATA', game: localData.game, questions: localData.questions })
        sendStateSnapshot()
        return
      }

      console.warn('No data found in localStorage. Initializing empty state.')
      applyLoadedData(
        {
          teams: [],
          settings: {
            defaultTimeLimit: 30,
            buzzerTimeLimit: 10,
            sampleSize: 10,
            sampleRandomized: true,
          },
        },
        { categories: [], questions: [] },
      )
      sendMessage({
        type: 'LOAD_DATA',
        game: {
          teams: [],
          settings: {
            defaultTimeLimit: 30,
            buzzerTimeLimit: 10,
            sampleSize: 10,
            sampleRandomized: true,
          },
        },
        questions: { categories: [], questions: [] },
      })
      sendStateSnapshot()
    } catch (error) {
      console.error('Error ensuring data loaded:', error)
    }
  }

  function finalizeGame() {
    const usedQuestions = questionDeck.value
    saveUsedQuestions(usedQuestions)
    resetGame()
  }
  // (kept for reference) loadSettingsFromLocalStorage removed because not used.

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

      // Restore teams if present in saved settings; otherwise use sane defaults
      const defaultTeams: Team[] = [
        { id: 't-azules', name: 'Azules', score: 0, color: '#3b82f6' },
        { id: 't-rojos', name: 'Rojos', score: 0, color: '#ef4444' },
        { id: 't-verdes', name: 'Verdes', score: 0, color: '#22c55e' },
        { id: 't-amarillos', name: 'Amarillos', score: 0, color: '#f59e0b' },
      ]

      const savedTeams = Array.isArray(s?.teams) && s.teams.length ? s.teams : defaultTeams

      const gameState = { teams: savedTeams, settings } as GameData

      return { game: gameState, questions: { categories: cats, questions: qs } }
    } catch {
      return null
    }
  }

  /** ---------------------
   *  SAVE TO LOCALSTORAGE
   * --------------------- */
  function saveToLocalStorage(gameData?: GameData, qd?: QuestionsData) {
    try {
      if (qd) {
        localStorage.setItem(LS_CATEGORIES, JSON.stringify(qd.categories ?? []))
        localStorage.setItem(LS_QUESTIONS, JSON.stringify(qd.questions ?? []))
      }
      // Persist both settings and teams inside LS_SETTINGS so teams are restored
      const settingsObj = gameData?.settings
        ? {
            defaultTimeLimit: gameData.settings.defaultTimeLimit,
            buzzerTimeLimit: gameData.settings.buzzerTimeLimit,
            sampleSize: gameData.settings.sampleSize,
            sampleRandomized: gameData.settings.sampleRandomized,
          }
        : {
            defaultTimeLimit: defaultTimeLimit.value,
            buzzerTimeLimit: buzzerTimeLimit.value,
            sampleSize: sampleSize.value,
            sampleRandomized: sampleRandomized.value,
          }

      const teamsToSave = gameData?.teams ?? toPlain(teams.value)

      localStorage.setItem(LS_SETTINGS, JSON.stringify({ ...settingsObj, teams: teamsToSave }))
    } catch (err) {
      console.warn('saveToLocalStorage failed', err)
    }
  }

  function saveQuestionsToLocalStorage(qd: QuestionsData) {
    saveToLocalStorage(undefined, qd)
  }

  function saveSettingsToLocalStorage() {
    saveToLocalStorage(undefined, { categories: [], questions: [] })
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
      const tmp = a[i]
      a[i] = a[j] as T
      a[j] = tmp as T
    }
    return a
  }

  /** ---------------------
   *  FLUJO DE CONTROL
   * --------------------- */
  function startGame() {
    if (questions.value.length === 0) return
    // Initialize audio on user gesture (Start game) so browsers allow playback
    try {
      initAudio()
    } catch {}
    buildQuestionDeck()
    status.value = 'question'
    displayMode.value = 'question'
    sendMessage({ type: 'START_GAME' })
    nextQuestion()
  }

  function selectQuestion(questionId: string) {
    // cancel any pending auto-next
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout)
      autoNextTimeout = null
    }
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
    // cancel pending auto-next to avoid double-advance
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout)
      autoNextTimeout = null
    }
    if (questionDeck.value.length === 0) buildQuestionDeck()
    const nextIdx = deckIndex.value + 1
    if (nextIdx >= questionDeck.value.length) {
      status.value = 'finished'
      displayMode.value = 'scoreboard'
      // stop all audio when the game finishes
      try {
        stopAllAudio()
      } catch {}
      sendMessage({ type: 'NEXT_QUESTION' })
      sendStateSnapshot()
      return
    }
    deckIndex.value = nextIdx
    const nextId = questionDeck.value[deckIndex.value]
    if (!nextId) {
      status.value = 'finished'
      displayMode.value = 'scoreboard'
      sendMessage({ type: 'NEXT_QUESTION' })
      sendStateSnapshot()
      return
    }
    selectQuestion(nextId)
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

    // Cancelar cualquier auto-next pendiente
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout)
      autoNextTimeout = null
    }

    // Detener todos los timers y resetear estado de buzz
    stopGeneralTimer()
    stopBuzzerTimer()
    activeTeamId.value = null
    hasAnyTeamBuzzed.value = false

    // Cambiar a modo review
    status.value = 'review'
    displayMode.value = 'answer'

    // Notificar a displays
    sendMessage({ type: 'MARK_CORRECT', teamId, points: pts })
    sendStateSnapshot()

    // Reproducir sonido
    try {
      playCorrect()
    } catch {}
  }

  // Reemplaza la función markIncorrect existente con esta:
  function markIncorrect(teamId: string) {
    // Cancelar cualquier auto-next pendiente
    if (autoNextTimeout) {
      clearTimeout(autoNextTimeout)
      autoNextTimeout = null
    }

    disableTeam(teamId)
    stopBuzzerTimer()
    activeTeamId.value = null
    hasAnyTeamBuzzed.value = false

    // Si no quedan equipos disponibles -> cerrar la ronda
    if (availableTeams.value.length === 0) {
      stopGeneralTimer(false)
      status.value = 'review'
      displayMode.value = 'answer'
      sendMessage({ type: 'TIME_EXPIRED', version: bump() })
      // NO llamar a onTimeExpired aquí, dejar que el usuario avance manualmente
      sendMessage({ type: 'MARK_INCORRECT', teamId })
      sendStateSnapshot()
      return
    }

    // Reanudar desde snapshot si quedan equipos
    try {
      playIncorrect()
    } catch {}
    resumeGeneralTimer()
    sendMessage({ type: 'MARK_INCORRECT', teamId })
    sendStateSnapshot()
  }

  function hardResetGame() {
    resetGame()
    teams.value = teams.value.map((t) => ({ ...t, score: 0 }))
    sendMessage({ type: 'RESET_GAME' })
    sendStateSnapshot()
    try {
      stopAllAudio()
    } catch {}
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
      if (
        msg.type === 'SHOW_ROULETTE' ||
        msg.type === 'ROULETTE_RESULT' ||
        msg.type === 'HIDE_ROULETTE'
      ) {
        console.debug('[BC] sendMessage', msg)
      }
      channel.value.postMessage(toPlain(msg))
    } catch (err) {
      console.error('BroadcastChannel postMessage failed', err)
    }
  }

  // NOTE: UX messages (SHOW_ROULETTE / HIDE_ROULETTE / ROULETTE_RESULT)
  // are part of the typed GameMessage union and are handled below.

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
    if (
      msg.type === 'SHOW_ROULETTE' ||
      msg.type === 'ROULETTE_RESULT' ||
      msg.type === 'HIDE_ROULETTE'
    ) {
      console.debug('[BC] handleIncomingMessage', msg)
    }
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

      case 'LOAD_DATA': {
        const m = msg as LoadDataMessage
        applyLoadedData(m.game, m.questions)
        break
      }

      case 'START_GAME':
        status.value = 'question'
        break

      case 'SELECT_QUESTION': {
        const m = msg as SelectQuestionMessage
        currentQuestionId.value = m.questionId
        resetQuestionState()
        status.value = 'question'
        break
      }

      case 'SHOW_ANSWER':
        status.value = 'review'
        resetTimers()
        // on displays, play correct sound as a cue
        try {
          playCorrect()
        } catch {}
        break

      case 'NEXT_QUESTION':
        break

      case 'RESET_QUESTION_STATE':
        resetQuestionState()
        break

      case 'RESET_GAME':
        resetGame()
        break

      case 'ROULETTE_RESULT': {
        // When the control receives a roulette result (sent by a display or the control itself)
        // pick a question matching the category and select it. Make selection idempotent.
        if (role.value === 'control') {
          const m = msg as RouletteResultMessage
          const catId = m.category?.id
          if (catId) {
            // prefer a question in that category that isn't already selected
            const next = questions.value.find(
              (q) => q.categoryId === catId && q.id !== currentQuestionId.value,
            )
            if (next) {
              // guard: if we're already selecting this question, ignore
              if (currentQuestionId.value === next.id) return
              selectQuestion(next.id)
            }
          }
        }
        break
      }

      // Timers general
      case 'START_TIMER':
        {
          const m = msg as StartTimerMessage
          isTimerActive.value = true
          generalStartedAt.value = m.startedAt
          generalDeadline.value = m.deadline
          generalRemainingSnapshot.value = null
          timeRemaining.value = calcRemaining(generalDeadline.value)
          // If we're a display, start a local interval to update the general timer
          try {
            if (role.value === 'display') {
              if (timerInterval.value) {
                clearInterval(timerInterval.value)
                timerInterval.value = null
              }
              timerInterval.value = window.setInterval(() => {
                try {
                  const remaining = calcRemaining(generalDeadline.value)
                  timeRemaining.value = remaining
                  if (remaining <= 0) {
                    if (timerInterval.value) {
                      clearInterval(timerInterval.value)
                      timerInterval.value = null
                    }
                    timeRemaining.value = 0
                  }
                } catch {}
              }, 300)
            }
          } catch {}
        }
        break
      case 'UPDATE_TIMER': {
        const m = msg as UpdateTimerMessage
        timeRemaining.value = m.timeRemaining
        break
      }
      case 'TIME_EXPIRED':
        // clear display interval if any
        if (timerInterval.value) {
          clearInterval(timerInterval.value)
          timerInterval.value = null
        }
        isTimerActive.value = false
        timeRemaining.value = 0
        generalDeadline.value = null
        generalStartedAt.value = null
        generalRemainingSnapshot.value = null
        onTimeExpired()
        break
      case 'STOP_TIMER':
        // clear display interval if any
        if (timerInterval.value) {
          clearInterval(timerInterval.value)
          timerInterval.value = null
        }
        isTimerActive.value = false
        generalDeadline.value = null
        generalStartedAt.value = null
        generalRemainingSnapshot.value = null
        break
      case 'PAUSE_TIMER':
        isTimerActive.value = false
        // mantener el snapshot que llega por snapshot periódico
        // clear display interval while paused
        if (timerInterval.value) {
          clearInterval(timerInterval.value)
          timerInterval.value = null
        }
        break
      case 'RESUME_TIMER':
        isTimerActive.value = true
        generalRemainingSnapshot.value = null
        // resume display interval if we have a deadline
        try {
          if (role.value === 'display' && generalDeadline.value) {
            if (timerInterval.value) {
              clearInterval(timerInterval.value)
              timerInterval.value = null
            }
            timerInterval.value = window.setInterval(() => {
              try {
                const r = calcRemaining(generalDeadline.value)
                timeRemaining.value = r
                if (r <= 0) {
                  if (timerInterval.value) {
                    clearInterval(timerInterval.value)
                    timerInterval.value = null
                  }
                  timeRemaining.value = 0
                }
              } catch {}
            }, 300)
          }
        } catch {}
        break

      // Timers buzzer
      case 'START_BUZZER_TIMER':
        {
          const m = msg as StartBuzzerTimerMessage
          isBuzzerTimerActive.value = true
          buzzerStartedAt.value = m.startedAt
          buzzerDeadline.value = m.deadline
          buzzerTimeRemaining.value = calcRemaining(buzzerDeadline.value)
          // If we're a display, start a local interval to update the buzzer countdown
          try {
            if (role.value === 'display') {
              if (buzzerTimerInterval.value) {
                clearInterval(buzzerTimerInterval.value)
                buzzerTimerInterval.value = null
              }
              buzzerTimerInterval.value = window.setInterval(() => {
                try {
                  const remaining = calcRemaining(buzzerDeadline.value)
                  buzzerTimeRemaining.value = remaining
                  if (remaining <= 0) {
                    if (buzzerTimerInterval.value) {
                      clearInterval(buzzerTimerInterval.value)
                      buzzerTimerInterval.value = null
                    }
                    buzzerTimeRemaining.value = 0
                  }
                } catch {}
              }, 300)
            }
          } catch {}
        }
        break
      case 'UPDATE_BUZZER_TIMER': {
        const m = msg as UpdateBuzzerTimerMessage
        buzzerTimeRemaining.value = m.timeRemaining
        break
      }
      case 'BUZZER_TIME_EXPIRED':
        // clear any local interval
        if (buzzerTimerInterval.value) {
          clearInterval(buzzerTimerInterval.value)
          buzzerTimerInterval.value = null
        }
        isBuzzerTimerActive.value = false
        buzzerTimeRemaining.value = 0
        buzzerDeadline.value = null
        buzzerStartedAt.value = null
        onBuzzerExpired()
        break
      case 'STOP_BUZZER_TIMER':
        // clear any local interval
        if (buzzerTimerInterval.value) {
          clearInterval(buzzerTimerInterval.value)
          buzzerTimerInterval.value = null
        }
        isBuzzerTimerActive.value = false
        buzzerDeadline.value = null
        buzzerStartedAt.value = null
        break

      case 'TEAM_BUZZED': {
        const m = msg as TeamBuzzedMessage
        if (!hasAnyTeamBuzzed.value && !disabledTeamsForQuestion.value.includes(m.teamId)) {
          hasAnyTeamBuzzed.value = true
          activeTeamId.value = m.teamId
        }
        break
      }

      case 'MARK_CORRECT': {
        const m = msg as MarkCorrectMessage
        const team = teams.value.find((t) => t.id === m.teamId)
        if (team) team.score += m.points
        status.value = 'review'
        resetTimers()
        // display plays correct sound when receiving mark
        try {
          playCorrect()
        } catch {}
        break
      }

      case 'MARK_INCORRECT': {
        const m = msg as MarkIncorrectMessage
        disableTeam(m.teamId)
        activeTeamId.value = null
        hasAnyTeamBuzzed.value = false
        // display plays incorrect sound when receiving mark_incorrect
        try {
          playIncorrect()
        } catch {}
        break
      }

      case 'SET_ACTIVE_TEAM': {
        const m = msg as SetActiveTeamMessage
        activeTeamId.value = m.teamId
        break
      }

      case 'DISABLE_TEAM_FOR_QUESTION': {
        const m = msg as DisableTeamForQuestionMessage
        disableTeam(m.teamId)
        break
      }

      case 'ENABLE_ALL_TEAMS_FOR_QUESTION':
        enableAllTeamsForQuestion()
        break

      case 'SET_DISPLAY_MODE': {
        const m = msg as SetDisplayModeMessage
        displayMode.value = m.mode
        break
      }

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
    // deck info (read-only exposure for UI control)
    questionDeck,
    deckIndex,

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
    // participation
    setTeamParticipation,

    // data
    ensureDataLoaded,
    saveToLocalStorage,
    saveQuestionsToLocalStorage,
    saveSettingsToLocalStorage,

    // display mode
    setDisplayMode,

    // canal
    initBroadcastChannel,
    destroyBroadcastChannel,
    sendMessage,
    // audio
    initAudio,
    finalizeGame,
  }
})
