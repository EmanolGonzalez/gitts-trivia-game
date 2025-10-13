// src/types/game.ts

export type GameStatus = 'lobby' | 'question' | 'review' | 'finished';

// Modos de visualización controlados desde Control
export type DisplayMode =
  | 'waiting'     // pantalla de espera / intro
  | 'question'    // pregunta en curso + timer general
  | 'answer'      // respuesta revelada
  | 'scoreboard'  // tabla de puntuaciones
  | 'paused';     // pausa técnica / intermedio

export interface Team {
  id: string;
  name: string;
  score: number;
  color?: string;
}

export interface Category {
  id: string;
  name: string;
  color?: string;
}

export interface Question {
  id: string;
  categoryId: string;
  text: string;
  answer: string;
  points: number;
  timeLimit?: number;   // segundos por pregunta
  buzzerTimeLimit?: number; // segundos para responder tras buzz
}

export interface QuestionsData {
  categories: Category[];
  questions: Question[];
}

export interface GameSettings {
  defaultTimeLimit: number; // segundos
  buzzerTimeLimit: number;  // segundos
}

export interface GameData {
  teams: Team[];
  settings: GameSettings;
}

export interface GameRuntimeState {
  status: GameStatus;
  currentQuestionId: string | null;
  activeTeamId: string | null;
  hasAnyTeamBuzzed: boolean;

  timeRemaining: number;
  isTimerActive: boolean;

  buzzerTimeRemaining: number;
  isBuzzerTimerActive: boolean;

  disabledTeamsForQuestion: string[];

  // Control de lo que se ve en Display
  displayMode: DisplayMode;
}

/** ---- Mensajes de datos / flujo ---- */
export type LoadDataMessage = {
  type: 'LOAD_DATA';
  game: GameData;
  questions: QuestionsData;
};

export type StartGameMessage = { type: 'START_GAME' };
export type SelectQuestionMessage = { type: 'SELECT_QUESTION'; questionId: string };
export type ShowAnswerMessage = { type: 'SHOW_ANSWER' };
export type NextQuestionMessage = { type: 'NEXT_QUESTION' };
export type ResetQuestionStateMessage = { type: 'RESET_QUESTION_STATE' };
export type ResetGameMessage = { type: 'RESET_GAME' };

/** ---- Buzzers / calificación ---- */
export type TeamBuzzedMessage = { type: 'TEAM_BUZZED'; teamId: string };
export type MarkCorrectMessage = { type: 'MARK_CORRECT'; teamId: string; points: number };
export type MarkIncorrectMessage = { type: 'MARK_INCORRECT'; teamId: string };

/** ---- Timers general con deadlines + versión ---- */
export type StartTimerMessage = {
  type: 'START_TIMER';
  timeLimit: number; // segundos
  startedAt: number; // epoch ms
  deadline: number;  // epoch ms
  version: number;
};
export type UpdateTimerMessage = {
  type: 'UPDATE_TIMER';
  timeRemaining: number;
  version: number;
};
export type TimeExpiredMessage = { type: 'TIME_EXPIRED'; version: number };
export type StopTimerMessage = { type: 'STOP_TIMER'; version: number };
export type PauseTimerMessage = { type: 'PAUSE_TIMER'; version: number };
export type ResumeTimerMessage = { type: 'RESUME_TIMER'; version: number };

/** ---- Timers buzzer ---- */
export type StartBuzzerTimerMessage = {
  type: 'START_BUZZER_TIMER';
  timeLimit: number; // segundos
  startedAt: number;
  deadline: number;
  version: number;
};
export type UpdateBuzzerTimerMessage = {
  type: 'UPDATE_BUZZER_TIMER';
  timeRemaining: number;
  version: number;
};
export type BuzzerTimeExpiredMessage = { type: 'BUZZER_TIME_EXPIRED'; version: number };
export type StopBuzzerTimerMessage = { type: 'STOP_BUZZER_TIMER'; version: number };

/** ---- Disponibilidad por pregunta ---- */
export type SetActiveTeamMessage = { type: 'SET_ACTIVE_TEAM'; teamId: string | null };
export type DisableTeamForQuestionMessage = { type: 'DISABLE_TEAM_FOR_QUESTION'; teamId: string };
export type EnableAllTeamsForQuestionMessage = { type: 'ENABLE_ALL_TEAMS_FOR_QUESTION' };

/** ---- Control de Display ---- */
export type SetDisplayModeMessage = { type: 'SET_DISPLAY_MODE'; mode: DisplayMode };

/** ---- Handshake / snapshot ---- */
export type HelloMessage = { type: 'HELLO' };
export type AckSnapshotMessage = { type: 'ACK_SNAPSHOT'; version: number };

export type StateSnapshotMessage = {
  type: 'STATE_SNAPSHOT';
  payload: {
    version: number; // versión de estado
    status: GameStatus;
    teams: Team[];
    categories: Category[];
    currentQuestionId: string | null;

    // timers
    timeRemaining: number;
    isTimerActive: boolean;

    // buzzer
    activeTeamId: string | null;
    hasAnyTeamBuzzed: boolean;
    buzzerTimeRemaining: number;
    isBuzzerTimerActive: boolean;

    // disponibilidad
    disabledTeamsForQuestion: string[];

    // display
    displayMode: DisplayMode;
  };
};

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
  | AckSnapshotMessage;

/** ---- Helpers ---- */
export function getCurrentQuestion(
  state: Pick<GameRuntimeState, 'currentQuestionId'>,
  bank: QuestionsData
): Question | null {
  if (!state.currentQuestionId) return null;
  return bank.questions.find(q => q.id === state.currentQuestionId) ?? null;
}

export function getCurrentQuestionPoints(
  state: Pick<GameRuntimeState, 'currentQuestionId'>,
  bank: QuestionsData
): number | null {
  const q = getCurrentQuestion(state, bank);
  return q ? q.points : null;
}
