import { describe, expect, it } from 'vitest'
import { Habit } from './habit.model'

describe('Habit Model', () => {
  it('should validate a valid habit', async () => {
    const validHabit = new Habit({
      _id: 'habit-1',
      userId: 'user-1',
      title: 'Workout',
      frequency: 'daily',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const err = await validHabit.validate()
    expect(err).toBeUndefined()
  })

  it('should fail validation if required fields are missing', async () => {
    const invalidHabit = new Habit({
      title: 'Workout',
    })

    await expect(invalidHabit.validate()).rejects.toThrow()
  })

  it('should fail validation if frequency is invalid', async () => {
    const invalidHabit = new Habit({
      _id: 'habit-2',
      userId: 'user-1',
      title: 'Workout',
      frequency: 'monthly', // invalid enum value
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(invalidHabit.validate()).rejects.toThrow()
  })
})

