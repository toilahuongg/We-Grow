import { describe, expect, it } from 'vitest'
import { HabitCompletion } from './habit-completion.model'

describe('HabitCompletion Model', () => {
  it('should create a valid habit completion', async () => {
    const validCompletion = new HabitCompletion({
      _id: 'completion-1',
      habitId: 'habit-1',
      userId: 'user-1',
      date: '2024-05-20',
      completedCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    })

    const savedCompletion = await validCompletion.save()
    expect(savedCompletion._id).toBe('completion-1')
    expect(savedCompletion.date).toBe('2024-05-20')
  })

  it('should fail if required fields are missing', async () => {
    const invalidCompletion = new HabitCompletion({
      habitId: 'habit-1',
    })

    await expect(invalidCompletion.save()).rejects.toThrow()
  })

  it('should enforce unique habitId, userId, and date', async () => {
    const data = {
      _id: 'completion-1',
      habitId: 'habit-1',
      userId: 'user-1',
      date: '2024-05-20',
      createdAt: new Date(),
      updatedAt: new Date(),
    }

    await new HabitCompletion(data).save()
    
    const duplicate = new HabitCompletion({
      ...data,
      _id: 'completion-2',
    })

    await expect(duplicate.save()).rejects.toThrow()
  })
})
