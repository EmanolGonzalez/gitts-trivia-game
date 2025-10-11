// src/types/game.ts

export interface Question {
  id: string
  category: string
  difficulty: 'easy' | 'medium' | 'hard'
  question: string
  correctAnswer: string
  points: number
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

// Mensajes del BroadcastChannel para comunicación Control → Display
export type GameMessage =
  | { type: 'START_GAME' }
  | { type: 'NEXT_QUESTION'; questionId: string; questionIndex: number }
  | { type: 'SHOW_ANSWER'; answer: string }
  | { type: 'MARK_CORRECT'; teamId: string; points: number }
  | { type: 'MARK_WRONG'; teamId: string }
  | { type: 'SHOW_LEADERBOARD'; teams: Team[] } // 👈 MODIFICADO: Incluye teams
  | { type: 'CLOSE_LEADERBOARD' } // 👈 NUEVO MENSAJE
  | { type: 'RESET_GAME' }
  | { type: 'UPDATE_TEAMS'; teams: Team[] }

export interface QuestionsData {
  questions: Question[]
  categories: Category[]
}