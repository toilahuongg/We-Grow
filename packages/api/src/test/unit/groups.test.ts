import { describe, it, expect, beforeEach } from 'vitest'
import { Group, GroupMember, GroupHabit, Habit } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { groupsRouter } from '../../routers/groups'

describe('Groups Router', () => {
  const mockUserId = generateId()
  const otherUserId = generateId()
  const mockSession = createMockSession({
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
  })
  const authenticatedContext = createTestContext(mockSession.user)

  beforeEach(async () => {
    await Group.deleteMany({})
    await GroupMember.deleteMany({})
    await GroupHabit.deleteMany({})
    await Habit.deleteMany({})
  })

  describe('listMy', () => {
    it('should return empty array when user has no groups', async () => {
      const result = await groupsRouter.listMy.handler({
        context: authenticatedContext,
      })

      expect(result).toEqual([])
    })

    it('should return groups where user is a member', async () => {
      const now = new Date()
      const groupId = generateId()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'member',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.listMy.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(1)
      expect(result[0]?._id).toBe(groupId)
    })

    it('should not return groups where user is removed', async () => {
      const now = new Date()
      const groupId = generateId()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'member',
        status: 'removed',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.listMy.handler({
        context: authenticatedContext,
      })

      expect(result).toHaveLength(0)
    })
  })

  describe('getById', () => {
    it('should return group with members', async () => {
      const now = new Date()
      const groupId = generateId()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: 'Test Description',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.getById.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toBeDefined()
      expect(result?.name).toBe('Test Group')
      expect(result?.members).toHaveLength(1)
    })

    it('should return null for non-existent group', async () => {
      const result = await groupsRouter.getById.handler({
        context: authenticatedContext,
        input: { groupId: generateId() },
      })

      expect(result).toBeNull()
    })
  })

  describe('create', () => {
    it('should create a group with user as owner', async () => {
      const result = await groupsRouter.create.handler({
        context: authenticatedContext,
        input: {
          name: 'My Group',
          description: 'My Description',
          mode: 'together',
        },
      })

      expect(result).toBeDefined()
      expect(result.name).toBe('My Group')
      expect(result.description).toBe('My Description')
      expect(result.mode).toBe('together')
      expect(result.ownerId).toBe(mockUserId)
      expect(result.inviteCode).toBeDefined()

      const groupInDb = await Group.findOne({ _id: result._id })
      expect(groupInDb).toBeDefined()

      const memberInDb = await GroupMember.findOne({
        groupId: result._id,
        userId: mockUserId,
      })
      expect(memberInDb?.role).toBe('owner')
      expect(memberInDb?.status).toBe('active')
    })

    it('should generate unique invite code', async () => {
      const group1 = await groupsRouter.create.handler({
        context: authenticatedContext,
        input: {
          name: 'Group 1',
          mode: 'together',
        },
      })

      const group2 = await groupsRouter.create.handler({
        context: authenticatedContext,
        input: {
          name: 'Group 2',
          mode: 'together',
        },
      })

      expect(group1.inviteCode).not.toBe(group2.inviteCode)
    })

    it('should reject empty name', async () => {
      await expect(
        groupsRouter.create.handler({
          context: authenticatedContext,
          input: {
            name: '',
            mode: 'together',
          },
        })
      ).rejects.toThrow()
    })
  })

  describe('update', () => {
    it('should update group name and description', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Old Name',
        description: 'Old Description',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.update.handler({
        context: authenticatedContext,
        input: {
          groupId,
          name: 'New Name',
          description: 'New Description',
        },
      })

      expect(result?.name).toBe('New Name')
      expect(result?.description).toBe('New Description')
    })
  })

  describe('delete', () => {
    it('should delete group and its data', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      await GroupHabit.create({
        _id: generateId(),
        groupId,
        title: 'Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.delete.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result.success).toBe(true)

      const groupInDb = await Group.findOne({ _id: groupId })
      expect(groupInDb).toBeNull()

      const members = await GroupMember.find({ groupId })
      expect(members).toHaveLength(0)

      const habits = await GroupHabit.find({ groupId })
      expect(habits).toHaveLength(0)
    })
  })

  describe('join', () => {
    it('should join group via invite code', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'JOINME',
        ownerId: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.join.handler({
        context: authenticatedContext,
        input: { inviteCode: 'JOINME' },
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('active')

      const member = await GroupMember.findOne({
        groupId,
        userId: mockUserId,
      })
      expect(member?.role).toBe('member')
      expect(member?.status).toBe('active')
    })

    it('should throw error for invalid invite code', async () => {
      await expect(
        groupsRouter.join.handler({
          context: authenticatedContext,
          input: { inviteCode: 'INVALID' },
        })
      ).rejects.toThrow('Invalid invite code')
    })

    it('should reactivate removed user', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'REJOIN',
        ownerId: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'member',
        status: 'removed',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.join.handler({
        context: authenticatedContext,
        input: { inviteCode: 'REJOIN' },
      })

      expect(result.status).toBe('active')
    })
  })

  describe('leave', () => {
    it('should leave group', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'member',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.leave.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result.success).toBe(true)

      const member = await GroupMember.findOne({
        groupId,
        userId: mockUserId,
      })
      expect(member?.status).toBe('removed')
    })

    it('should not allow owner to leave', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      await expect(
        groupsRouter.leave.handler({
          context: authenticatedContext,
          input: { groupId },
        })
      ).rejects.toThrow('Owner cannot leave')
    })
  })

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: otherUserId,
        role: 'member',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.removeMember.handler({
        context: authenticatedContext,
        input: { groupId, userId: otherUserId },
      })

      expect(result.success).toBe(true)

      const member = await GroupMember.findOne({
        groupId,
        userId: otherUserId,
      })
      expect(member?.status).toBe('removed')
    })
  })

  describe('changeMemberRole', () => {
    it('should change member role', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: otherUserId,
        role: 'member',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.changeMemberRole.handler({
        context: authenticatedContext,
        input: {
          groupId,
          userId: otherUserId,
          role: 'moderator',
        },
      })

      expect(result.success).toBe(true)

      const member = await GroupMember.findOne({
        groupId,
        userId: otherUserId,
      })
      expect(member?.role).toBe('moderator')
    })
  })

  describe('getMemberProgress', () => {
    it('should return member progress', async () => {
      const groupId = generateId()
      const now = new Date()

      await Group.create({
        _id: groupId,
        name: 'Test Group',
        description: '',
        mode: 'together',
        inviteCode: 'TEST123',
        ownerId: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      await GroupMember.create({
        _id: generateId(),
        groupId,
        userId: mockUserId,
        role: 'owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.getMemberProgress.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.userId).toBe(mockUserId)
    })
  })
})
