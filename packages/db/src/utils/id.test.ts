import { describe, expect, it } from 'vitest'
import { generateId } from './id'

describe('ID Utility', () => {
  it('should generate a valid UUID', () => {
    const id = generateId()
    expect(id).toBeDefined()
    expect(typeof id).toBe('string')
    // UUID v4 format regex
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(id).toMatch(uuidRegex)
  })

  it('should generate unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })
})
