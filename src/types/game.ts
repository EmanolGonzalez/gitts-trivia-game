// src/types/game.ts

export interface Question {
  id: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  correctAnswer: string
  points: number
  timeLimit: number // Tiempo en segundos para responder (individual)
  buzzerTimeLimit: number // 👈 NUEVO: Tiempo para tocar el buzzer (general)
}

export interface Category {
  id: string
  name: string
  color: string
}

export interface Team {
  id: string
  name: string
  color: string
  score: number
  correctAnswers: number
  wrongAnswers: number
}

export type GameStatus = 'waiting' | 'question' | 'show_answer' | 'leaderboard' | 'finished'

export interface GameState {
  id: string
  name: string
  status: GameStatus
  currentQuestionIndex: number
  currentQuestionId: string | null
  startedAt: string | null
  showCorrectAnswer: boolean
}

export interface GameData {
  currentGame: GameState
  teams: Team[]
  gameStates: GameStatus[]
}

// 👇 NUEVOS: Mensajes para sistema de buzzer
export type GameMessage =
  | { type: 'START_GAME' }
  | { type: 'NEXT_QUESTION'; questionId: string; questionIndex: number }
  | { type: 'SHOW_ANSWER'; answer: string }
  | { type: 'MARK_CORRECT'; teamId: string; points: number }
  | { type: 'MARK_WRONG'; teamId: string }
  | { type: 'SHOW_LEADERBOARD'; teams: Team[] }
  | { type: 'CLOSE_LEADERBOARD' }
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_TEAMS'; teams: Team[] }
  // 🔥 NUEVOS MENSAJES PARA BUZZER
  | { type: 'TEAM_BUZZED'; teamId: string; teamName: string; teamColor: string } // Equipo tocó buzzer
  | { type: 'START_TIMER'; timeLimit: number } // Inicia countdown
  | { type: 'UPDATE_TIMER'; timeRemaining: number } // Actualiza segundos
  | { type: 'TIME_EXPIRED' } // Se acabó el tiempo
  | { type: 'STOP_TIMER' } // Detiene timer
  | { type: 'RESET_QUESTION_STATE' } // Resetea estado de pregunta actual
  | { type: 'SHOW_INCORRECT_FEEDBACK'; teamName: string; teamColor: string } // Muestra feedback de incorrecto

export interface QuestionsData {
  questions: Question[]
  categories: Category[]
}