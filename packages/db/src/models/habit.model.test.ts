import { describe, expect, it } from 'vitest'
import { Habit } from './habit.model'

describe('Habit Model', () => {
  it('should create a valid habit', async () => {
    const validHabit = new Habit({
      _id: 'habit-1',
      userId: 'user-1',
      title: 'Workout',
      frequency: 'daily',
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const savedHabit = await validHabit.save()
    expect(savedHabit._id).toBe('habit-1')
    expect(savedHabit.title).toBe('Workout')
    expect(savedHabit.frequency).toBe('daily')
  })

  it('should fail if required fields are missing', async () => {
    const invalidHabit = new Habit({
      title: 'Workout',
    })

    await expect(invalidHabit.save()).rejects.toThrow()
  })

  it('should fail if frequency is invalid', async () => {
    const invalidHabit = new Habit({
      _id: 'habit-2',
      userId: 'user-1',
      title: 'Workout',
      frequency: 'monthly', // invalid enum value
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    await expect(invalidHabit.save()).rejects.toThrow()
  })
})
