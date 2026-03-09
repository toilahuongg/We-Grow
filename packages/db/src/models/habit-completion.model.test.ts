import { describe, expect, it } from 'vitest'
import { HabitCompletion } from './habit-completion.model'

describe('HabitCompletion Model', () => {
  it('should validate a valid habit completion', async () => {
    const validCompletion = new HabitCompletion({
      _id: 'completion-1',
      habitId: 'habit-1',
      userId: 'user-1',
      date: '2024-05-20',
      completedCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const err = await validCompletion.validate()
    expect(err).toBeUndefined()
  })

  it('should fail validation if required fields are missing', async () => {
    const invalidCompletion = new HabitCompletion({
      habitId: 'habit-1',
    })

    await expect(invalidCompletion.validate()).rejects.toThrow()
  })
})

