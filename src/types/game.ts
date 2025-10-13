// src/types/game.ts

/** -----------------------------
 *  Estados y modos del juego
 *  ----------------------------- */

export type GameStatus = 'lobby' | 'question' | 'review' | 'finished'

// Modos de visualización controlados desde Control
export type DisplayMode =
  | 'waiting' // pantalla de espera / intro
  | 'question' // pregunta en curso + timer general
  | 'answer' // respuesta revelada
  | 'scoreboard' // tabla de puntuaciones
  | 'paused' // pausa técnica / intermedio

export type Role = 'control' | 'display'

/** -----------------------------
 *  Entidades del dominio
 *  ----------------------------- */

export interface Team {
  id: string
  name: string
  score: number
  /** Participa en la partida (true = participa). Por defecto true si no está presente */
  enabled?: boolean
  color?: string
}

export interface Category {
  id: string
  name: string
  color?: string
  icon?: string
}

export interface Question {
  id: string
  categoryId: string
  text: string
  answer: string
  points: number
  timeLimit?: number // override de segundos por pregunta
  buzzerTimeLimit?: number // override de segundos tras buzz
  difficulty?: 'easy' | 'med' | 'hard'
}

export interface QuestionsData {
  categories: Category[]
  questions: Question[]
}

export interface GameSettings {
  defaultTimeLimit: number // segundos
  buzzerTimeLimit: number // segundos
  // ajustes de muestreo usados por tu store
  sampleSize?: number
  sampleRandomized?: boolean
}

export interface GameData {
  teams: Team[]
  settings: GameSettings
}

/** -----------------------------
 *  Estado de runtime (lado UI)
 *  ----------------------------- */

export interface GameRuntimeState {
  status: GameStatus
  currentQuestionId: string | null
  activeTeamId: string | null
  hasAnyTeamBuzzed: boolean

  // timers (valores mostrados)
  timeRemaining: number
  isTimerActive: boolean

  // buzzer (valores mostrados)
  buzzerTimeRemaining: number
  isBuzzerTimerActive: boolean

  // disponibilidad por pregunta
  disabledTeamsForQuestion: string[]

  // Control de lo que se ve en Display
  displayMode: DisplayMode
}

/** -----------------------------
 *  Utilitarios de timer en snapshots
 *  ----------------------------- */

export interface TimerEnvelope {
  startedAt: number // epoch ms
  deadline: number // epoch ms
}

/** -----------------------------
 *  Mensajes de datos / flujo
 *  ----------------------------- */

export type LoadDataMessage = {
  type: 'LOAD_DATA'
  game: GameData
  questions: QuestionsData
}

export type StartGameMessage = { type: 'START_GAME' }
export type SelectQuestionMessage = { type: 'SELECT_QUESTION'; questionId: string }
export type ShowAnswerMessage = { type: 'SHOW_ANSWER' }
export type NextQuestionMessage = { type: 'NEXT_QUESTION' }
export type ResetQuestionStateMessage = { type: 'RESET_QUESTION_STATE' }
export type ResetGameMessage = { type: 'RESET_GAME' }

/** -----------------------------
 *  Buzzers / calificación
 *  ----------------------------- */

export type TeamBuzzedMessage = { type: 'TEAM_BUZZED'; teamId: string }
export type MarkCorrectMessage = { type: 'MARK_CORRECT'; teamId: string; points: number }
export type MarkIncorrectMessage = { type: 'MARK_INCORRECT'; teamId: string }

/** -----------------------------
 *  Timers general con deadlines + versión
 *  ----------------------------- */

export type StartTimerMessage = {
  type: 'START_TIMER'
  timeLimit: number // segundos
  startedAt: number // epoch ms
  deadline: number // epoch ms
  version: number
}

export type UpdateTimerMessage = {
  type: 'UPDATE_TIMER'
  timeRemaining: number
  version: number
}

export type TimeExpiredMessage = { type: 'TIME_EXPIRED'; version: number }
export type StopTimerMessage = { type: 'STOP_TIMER'; version: number }
export type PauseTimerMessage = { type: 'PAUSE_TIMER'; version: number }
export type ResumeTimerMessage = { type: 'RESUME_TIMER'; version: number }

/** -----------------------------
 *  Timers buzzer
 *  ----------------------------- */

export type StartBuzzerTimerMessage = {
  type: 'START_BUZZER_TIMER'
  timeLimit: number // segundos
  startedAt: number
  deadline: number
  version: number
}

export type UpdateBuzzerTimerMessage = {
  type: 'UPDATE_BUZZER_TIMER'
  timeRemaining: number
  version: number
}

export type BuzzerTimeExpiredMessage = { type: 'BUZZER_TIME_EXPIRED'; version: number }
export type StopBuzzerTimerMessage = { type: 'STOP_BUZZER_TIMER'; version: number }

/** -----------------------------
 *  Disponibilidad por pregunta
 *  ----------------------------- */

export type SetActiveTeamMessage = { type: 'SET_ACTIVE_TEAM'; teamId: string | null }
export type DisableTeamForQuestionMessage = { type: 'DISABLE_TEAM_FOR_QUESTION'; teamId: string }
export type EnableAllTeamsForQuestionMessage = { type: 'ENABLE_ALL_TEAMS_FOR_QUESTION' }

/** -----------------------------
 *  Control de Display
 *  ----------------------------- */

export type SetDisplayModeMessage = { type: 'SET_DISPLAY_MODE'; mode: DisplayMode }

/** -----------------------------
 *  Handshake / snapshot
 *  ----------------------------- */

export type HelloMessage = { type: 'HELLO' }
export type AckSnapshotMessage = { type: 'ACK_SNAPSHOT'; version: number }

export type StateSnapshotMessage = {
  type: 'STATE_SNAPSHOT'
  payload: {
    version: number // versión de estado
    status: GameStatus

    // banco completo (tu store ya los envía a display)
    teams: Team[]
    categories: Category[]
    questions: Question[]

    currentQuestionId: string | null

    // timers (valores renderizados)
    timeRemaining: number
    isTimerActive: boolean

    // buzzer (valores renderizados)
    activeTeamId: string | null
    hasAnyTeamBuzzed: boolean
    buzzerTimeRemaining: number
    isBuzzerTimerActive: boolean

    // disponibilidad
    disabledTeamsForQuestion: string[]

    // settings vigentes
    settings: {
      defaultTimeLimit: number
      buzzerTimeLimit: number
      sampleSize: number
      sampleRandomized: boolean
    }

    // sobres con tiempos absolutos (opcional: null si no corren)
    generalTimer: TimerEnvelope | null
    buzzerTimer: TimerEnvelope | null

    // display
    displayMode: DisplayMode
  }
}

/** -----------------------------
 *  Unión de mensajes salientes
 *  ----------------------------- */

export type OutgoingMessage =
  | LoadDataMessage
  | StartGameMessage
  | SelectQuestionMessage
  | ShowAnswerMessage
  | NextQuestionMessage
  | ResetQuestionStateMessage
  | ResetGameMessage
  | TeamBuzzedMessage
  | MarkCorrectMessage
  | MarkIncorrectMessage
  | StartTimerMessage
  | UpdateTimerMessage
  | TimeExpiredMessage
  | StopTimerMessage
  | PauseTimerMessage
  | ResumeTimerMessage
  | StartBuzzerTimerMessage
  | UpdateBuzzerTimerMessage
  | BuzzerTimeExpiredMessage
  | StopBuzzerTimerMessage
  | SetActiveTeamMessage
  | DisableTeamForQuestionMessage
  | EnableAllTeamsForQuestionMessage
  | SetDisplayModeMessage
  | HelloMessage
  | StateSnapshotMessage
  | AckSnapshotMessage

/** -----------------------------
 *  Helpers
 *  ----------------------------- */

export function getCurrentQuestion(
  state: Pick<GameRuntimeState, 'currentQuestionId'>,
  bank: QuestionsData,
): Question | null {
  if (!state.currentQuestionId) return null
  return bank.questions.find((q) => q.id === state.currentQuestionId) ?? null
}

export function getCurrentQuestionPoints(
  state: Pick<GameRuntimeState, 'currentQuestionId'>,
  bank: QuestionsData,
): number | null {
  const q = getCurrentQuestion(state, bank)
  return q ? q.points : null
}
