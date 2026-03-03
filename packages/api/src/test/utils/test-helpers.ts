import { describe, it, expect, beforeEach } from 'vitest'
import type { ORPCError } from '@orpc/server'

import { ORPCError as ORPCErrorClass } from '@orpc/server'

/**
 * Helper to check if error is an ORPCError
 */
export function isORPCError(error: unknown): error is ORPCError {
  return error instanceof ORPCErrorClass
}

/**
 * Helper to assert that a function throws an ORPCError with a specific code
 */
export async function expectORPCError(
  fn: () => Promise<unknown>,
  code: ORPCError['code']
) {
  try {
    await fn()
    throw new Error('Expected function to throw ORPCError')
  } catch (error) {
    if (!isORPCError(error)) {
      throw new Error(`Expected ORPCError, got: ${error}`)
    }
    expect(error.code).toBe(code)
  }
}

/**
 * Helper to assert that a function throws an ORPCError with a specific code and message
 */
export async function expectORPCErrorWithMessage(
  fn: () => Promise<unknown>,
  code: ORPCError['code'],
  message: string
) {
  try {
    await fn()
    throw new Error('Expected function to throw ORPCError')
  } catch (error) {
    if (!isORPCError(error)) {
      throw new Error(`Expected ORPCError, got: ${error}`)
    }
    expect(error.code).toBe(code)
    expect(error.message).toContain(message)
  }
}

/**
 * Helper to run a test suite with different user roles
 */
export function describeWithRoles(
  name: string,
  fn: (role: 'owner' | 'admin' | 'member' | 'anonymous') => void
) {
  describe(name, () => {
    describe('when user is owner', () => fn('owner'))
    describe('when user is admin', () => fn('admin'))
    describe('when user is member', () => fn('member'))
    describe('when user is anonymous', () => fn('anonymous'))
  })
}

/**
 * Helper to skip tests based on environment
 */
export function skipIf(condition: boolean) {
  return condition ? it.skip : it
}

/**
 * Helper to run tests only in specific environment
 */
export function onlyIf(condition: boolean) {
  return condition ? it : it.skip
}
