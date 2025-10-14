import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

// mock utils before importing the store
vi.mock('@/utils/questionTracker', () => ({
  fetchUsedQuestions: vi.fn(async () => []),
  saveUsedQuestions: vi.fn(async () => {}),
}))

import { useGameStore } from '@/stores/game'

describe('game store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('buildQuestionDeck respects sampleSize and has unique ids', async () => {
    const s = useGameStore()
    // prepare 6 questions
    s.questions = Array.from({ length: 6 }).map((_, i) => ({
      id: `q-${i + 1}`,
      categoryId: 'c-1',
      text: `Question ${i + 1}`,
      answer: 'x',
      points: 100,
    }))
    s.sampleSize = 3
    s.sampleRandomized = false

  // run build (internal function)
    // mock Audio to avoid DOM audio issues in test environment
    // @ts-expect-error: define minimal Audio in test env
    global.Audio = class {
      constructor() {}
      play() {
        return Promise.resolve()
      }
      pause() {}
    }
    await s.startGame()

    expect(s.questionDeck.length).toBeLessThanOrEqual(3)
    // unique
    const uniq = new Set(s.questionDeck)
    expect(uniq.size).toBe(s.questionDeck.length)
  })

  it('markCorrect is idempotent when called twice locally', () => {
    const s = useGameStore()
    s.teams = [
      { id: 't1', name: 'Team 1', score: 0 },
      { id: 't2', name: 'Team 2', score: 0 },
    ]
    s.questions = [
      { id: 'q1', categoryId: 'c1', text: 'Q1', answer: 'A', points: 100 },
    ]
    s.currentQuestionId = 'q1'

    s.markCorrect('t1')
    s.markCorrect('t1')

    const t = s.teams.find((x) => x.id === 't1')!
    expect(t.score).toBe(100)
  })

  it('markIncorrect disables the team and allows others to buzz', () => {
    const s = useGameStore()
    s.teams = [
      { id: 't1', name: 'Team 1', score: 0 },
      { id: 't2', name: 'Team 2', score: 0 },
    ]
    s.disabledTeamsForQuestion = []
    // simulate buzz
    s.teamBuzzed('t1')
    expect(s.activeTeamId).toBe('t1')
    expect(s.hasAnyTeamBuzzed).toBe(true)

    s.markIncorrect('t1')

    // failed team should be disabled
    expect(s.disabledTeamsForQuestion.includes('t1')).toBe(true)
    // active should be cleared and hasAnyTeamBuzzed false so others can buzz
    expect(s.activeTeamId).toBeNull()
    expect(s.hasAnyTeamBuzzed).toBe(false)
  })
})
