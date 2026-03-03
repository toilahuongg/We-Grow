import { describe, it, expect, beforeEach } from 'vitest'
import { Group, GroupMember, GroupHabit, Habit, HabitCompletion } from '@we-grow/db/models/index'
import { generateId } from '@we-grow/db/utils/id'

import { createTestContext, createMockSession } from '../utils/create-test-context'
import { expectORPCError } from '../utils/test-helpers'
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
    await HabitCompletion.deleteMany({})
  })

  // Helper to create a group with owner membership
  async function createGroupWithOwner(ownerId: string, overrides: Record<string, unknown> = {}) {
    const groupId = generateId()
    const now = new Date()

    await Group.create({
      _id: groupId,
      name: 'Test Group',
      description: '',
      mode: 'together',
      inviteCode: 'TEST123',
      ownerId,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    })

    await GroupMember.create({
      _id: generateId(),
      groupId,
      userId: ownerId,
      role: 'owner',
      status: 'active',
      createdAt: now,
      updatedAt: now,
    })

    return groupId
  }

  // Helper to add a member to a group
  async function addMember(groupId: string, userId: string, role = 'member', status = 'active') {
    const now = new Date()
    await GroupMember.create({
      _id: generateId(),
      groupId,
      userId,
      role,
      status,
      createdAt: now,
      updatedAt: now,
    })
  }

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
    it('should return group with enriched members', async () => {
      const groupId = await createGroupWithOwner(mockUserId, {
        name: 'Test Group',
        description: 'Test Description',
      })

      const result = await groupsRouter.getById.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toBeDefined()
      expect(result?.name).toBe('Test Group')
      expect(result?.members).toHaveLength(1)
      // Members should have userName and userImage fields
      expect(result?.members[0]).toHaveProperty('userName')
      expect(result?.members[0]).toHaveProperty('userImage')
      expect(result?.members[0]?.role).toBe('owner')
    })

    it('should include pending members', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member', 'pending')

      const result = await groupsRouter.getById.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result?.members).toHaveLength(2)
    })

    it('should not include removed members', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member', 'removed')

      const result = await groupsRouter.getById.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result?.members).toHaveLength(1)
    })

    it('should return null for non-existent group', async () => {
      // Need membership for requireGroupRole — but group doesn't exist
      // requireGroupRole will throw FORBIDDEN if no membership
      await expectORPCError(
        () => groupsRouter.getById.handler({
          context: authenticatedContext,
          input: { groupId: generateId() },
        }),
        'FORBIDDEN',
      )
    })

    it('should throw FORBIDDEN for non-member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)

      await expectORPCError(
        () => groupsRouter.getById.handler({
          context: authenticatedContext,
          input: { groupId },
        }),
        'FORBIDDEN',
      )
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

    it('should create group with share mode', async () => {
      const result = await groupsRouter.create.handler({
        context: authenticatedContext,
        input: {
          name: 'Share Group',
          mode: 'share',
        },
      })

      expect(result.mode).toBe('share')
    })
  })

  describe('update', () => {
    it('should update group name and description', async () => {
      const groupId = await createGroupWithOwner(mockUserId, {
        name: 'Old Name',
        description: 'Old Description',
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

    it('should throw FORBIDDEN for non-owner', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')

      await expectORPCError(
        () => groupsRouter.update.handler({
          context: authenticatedContext,
          input: { groupId, name: 'Hacked' },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('delete', () => {
    it('should delete group and its data', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()

      const groupHabitId = generateId()
      await GroupHabit.create({
        _id: groupHabitId,
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

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        groupHabitId,
        title: 'Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
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

      const groupHabits = await GroupHabit.find({ groupId })
      expect(groupHabits).toHaveLength(0)

      // Individual habits should be archived, not deleted
      const habits = await Habit.find({ groupId })
      expect(habits).toHaveLength(1)
      expect(habits[0]?.archived).toBe(true)
    })

    it('should throw FORBIDDEN for non-owner', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')

      await expectORPCError(
        () => groupsRouter.delete.handler({
          context: authenticatedContext,
          input: { groupId },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('regenerateInviteCode', () => {
    it('should generate new invite code', async () => {
      const groupId = await createGroupWithOwner(mockUserId, {
        inviteCode: 'OLDCODE',
      })

      const result = await groupsRouter.regenerateInviteCode.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result.inviteCode).toBeDefined()
      expect(result.inviteCode).not.toBe('OLDCODE')

      const groupInDb = await Group.findById(groupId)
      expect(groupInDb?.inviteCode).toBe(result.inviteCode)
    })

    it('should throw FORBIDDEN for non-owner', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'moderator')

      await expectORPCError(
        () => groupsRouter.regenerateInviteCode.handler({
          context: authenticatedContext,
          input: { groupId },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('lookupByInviteCode', () => {
    it('should return group info for valid invite code', async () => {
      const groupId = await createGroupWithOwner(mockUserId, {
        name: 'Lookup Group',
        description: 'Test lookup',
        mode: 'share',
        inviteCode: 'LOOKUP1',
      })

      const result = await groupsRouter.lookupByInviteCode.handler({
        context: authenticatedContext,
        input: { inviteCode: 'LOOKUP1' },
      })

      expect(result).toBeDefined()
      expect(result?._id).toBe(groupId)
      expect(result?.name).toBe('Lookup Group')
      expect(result?.description).toBe('Test lookup')
      expect(result?.mode).toBe('share')
      expect(result?.memberCount).toBe(1)
    })

    it('should return null for invalid invite code', async () => {
      const result = await groupsRouter.lookupByInviteCode.handler({
        context: authenticatedContext,
        input: { inviteCode: 'INVALID' },
      })

      expect(result).toBeNull()
    })

    it('should count only active members', async () => {
      const groupId = await createGroupWithOwner(mockUserId, {
        inviteCode: 'COUNT1',
      })
      await addMember(groupId, otherUserId, 'member', 'active')
      await addMember(groupId, generateId(), 'member', 'removed')

      const result = await groupsRouter.lookupByInviteCode.handler({
        context: authenticatedContext,
        input: { inviteCode: 'COUNT1' },
      })

      expect(result?.memberCount).toBe(2)
    })
  })

  describe('join', () => {
    it('should join group via invite code', async () => {
      const groupId = await createGroupWithOwner(otherUserId, {
        inviteCode: 'JOINME',
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
      const groupId = await createGroupWithOwner(otherUserId, {
        inviteCode: 'REJOIN',
      })

      await addMember(groupId, mockUserId, 'member', 'removed')

      const result = await groupsRouter.join.handler({
        context: authenticatedContext,
        input: { inviteCode: 'REJOIN' },
      })

      expect(result.status).toBe('active')
    })

    it('should auto-create habits from group habits for new members', async () => {
      const now = new Date()
      const groupId = await createGroupWithOwner(otherUserId, {
        inviteCode: 'HABITS1',
      })

      // Create group habits
      const gh1Id = generateId()
      await GroupHabit.create({
        _id: gh1Id,
        groupId,
        title: 'Morning Run',
        description: 'Run every morning',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      const gh2Id = generateId()
      await GroupHabit.create({
        _id: gh2Id,
        groupId,
        title: 'Weekly Review',
        description: '',
        frequency: 'weekly',
        targetDays: [],
        weeklyTarget: 3,
        createdBy: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      // Join the group
      await groupsRouter.join.handler({
        context: authenticatedContext,
        input: { inviteCode: 'HABITS1' },
      })

      // Check that habits were auto-created
      const habits = await Habit.find({ userId: mockUserId, groupId })
      expect(habits).toHaveLength(2)

      const runHabit = habits.find((h) => h.title === 'Morning Run')
      expect(runHabit?.groupHabitId).toBe(gh1Id)
      expect(runHabit?.frequency).toBe('daily')
      expect(runHabit?.description).toBe('Run every morning')

      const reviewHabit = habits.find((h) => h.title === 'Weekly Review')
      expect(reviewHabit?.groupHabitId).toBe(gh2Id)
      expect(reviewHabit?.frequency).toBe('weekly')
      expect(reviewHabit?.weeklyTarget).toBe(3)
    })

    it('should restore archived habits when removed member rejoins', async () => {
      const now = new Date()
      const groupId = await createGroupWithOwner(otherUserId, {
        inviteCode: 'REJOIN2',
      })

      const ghId = generateId()
      await GroupHabit.create({
        _id: ghId,
        groupId,
        title: 'Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      // Create archived habit for the user
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        groupHabitId: ghId,
        title: 'Group Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        archived: true,
        createdAt: now,
        updatedAt: now,
      })

      await addMember(groupId, mockUserId, 'member', 'removed')

      // Rejoin
      await groupsRouter.join.handler({
        context: authenticatedContext,
        input: { inviteCode: 'REJOIN2' },
      })

      // Habit should be unarchived
      const habit = await Habit.findOne({ userId: mockUserId, groupHabitId: ghId })
      expect(habit?.archived).toBe(false)
    })

    it('should return existing status if already active member', async () => {
      const groupId = await createGroupWithOwner(otherUserId, {
        inviteCode: 'ALREADY',
      })
      await addMember(groupId, mockUserId, 'member', 'active')

      const result = await groupsRouter.join.handler({
        context: authenticatedContext,
        input: { inviteCode: 'ALREADY' },
      })

      expect(result.success).toBe(true)
      expect(result.status).toBe('active')
    })
  })

  describe('leave', () => {
    it('should leave group', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')

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
      const groupId = await createGroupWithOwner(mockUserId)

      await expect(
        groupsRouter.leave.handler({
          context: authenticatedContext,
          input: { groupId },
        })
      ).rejects.toThrow('Owner cannot leave')
    })
  })

  describe('approveMember', () => {
    it('should approve pending member', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member', 'pending')

      const result = await groupsRouter.approveMember.handler({
        context: authenticatedContext,
        input: { groupId, userId: otherUserId },
      })

      expect(result.success).toBe(true)

      const member = await GroupMember.findOne({
        groupId,
        userId: otherUserId,
      })
      expect(member?.status).toBe('active')
    })

    it('should return false if member is not pending', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member', 'active')

      const result = await groupsRouter.approveMember.handler({
        context: authenticatedContext,
        input: { groupId, userId: otherUserId },
      })

      expect(result.success).toBe(false)
    })

    it('should allow moderator to approve', async () => {
      const ownerId = otherUserId
      const groupId = await createGroupWithOwner(ownerId)
      await addMember(groupId, mockUserId, 'moderator')
      const pendingUserId = generateId()
      await addMember(groupId, pendingUserId, 'member', 'pending')

      const result = await groupsRouter.approveMember.handler({
        context: authenticatedContext,
        input: { groupId, userId: pendingUserId },
      })

      expect(result.success).toBe(true)
    })

    it('should throw FORBIDDEN for regular member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')
      const pendingUserId = generateId()
      await addMember(groupId, pendingUserId, 'member', 'pending')

      await expectORPCError(
        () => groupsRouter.approveMember.handler({
          context: authenticatedContext,
          input: { groupId, userId: pendingUserId },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('removeMember', () => {
    it('should remove member from group', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member')

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

    it('should not allow removing yourself', async () => {
      const groupId = await createGroupWithOwner(mockUserId)

      await expect(
        groupsRouter.removeMember.handler({
          context: authenticatedContext,
          input: { groupId, userId: mockUserId },
        })
      ).rejects.toThrow('Cannot remove yourself')
    })

    it('should prevent moderator from removing owner', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'moderator')

      await expectORPCError(
        () => groupsRouter.removeMember.handler({
          context: authenticatedContext,
          input: { groupId, userId: otherUserId },
        }),
        'FORBIDDEN',
      )
    })

    it('should prevent moderator from removing another moderator', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'moderator')
      const otherModId = generateId()
      await addMember(groupId, otherModId, 'moderator')

      await expectORPCError(
        () => groupsRouter.removeMember.handler({
          context: authenticatedContext,
          input: { groupId, userId: otherModId },
        }),
        'FORBIDDEN',
      )
    })

    it('should allow moderator to remove regular member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'moderator')
      const memberId = generateId()
      await addMember(groupId, memberId, 'member')

      const result = await groupsRouter.removeMember.handler({
        context: authenticatedContext,
        input: { groupId, userId: memberId },
      })

      expect(result.success).toBe(true)
    })

    it('should allow owner to remove moderator', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const modId = generateId()
      await addMember(groupId, modId, 'moderator')

      const result = await groupsRouter.removeMember.handler({
        context: authenticatedContext,
        input: { groupId, userId: modId },
      })

      expect(result.success).toBe(true)
    })
  })

  describe('changeMemberRole', () => {
    it('should change member role to moderator', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member')

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

    it('should demote moderator to member', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'moderator')

      const result = await groupsRouter.changeMemberRole.handler({
        context: authenticatedContext,
        input: {
          groupId,
          userId: otherUserId,
          role: 'member',
        },
      })

      expect(result.success).toBe(true)

      const member = await GroupMember.findOne({
        groupId,
        userId: otherUserId,
      })
      expect(member?.role).toBe('member')
    })

    it('should not allow owner to change own role', async () => {
      const groupId = await createGroupWithOwner(mockUserId)

      await expect(
        groupsRouter.changeMemberRole.handler({
          context: authenticatedContext,
          input: {
            groupId,
            userId: mockUserId,
            role: 'member',
          },
        })
      ).rejects.toThrow('Cannot change your own role')
    })

    it('should throw FORBIDDEN for non-owner', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'moderator')
      const memberId = generateId()
      await addMember(groupId, memberId, 'member')

      await expectORPCError(
        () => groupsRouter.changeMemberRole.handler({
          context: authenticatedContext,
          input: {
            groupId,
            userId: memberId,
            role: 'moderator',
          },
        }),
        'FORBIDDEN',
      )
    })

    it('should return false for non-existent member', async () => {
      const groupId = await createGroupWithOwner(mockUserId)

      const result = await groupsRouter.changeMemberRole.handler({
        context: authenticatedContext,
        input: {
          groupId,
          userId: generateId(),
          role: 'moderator',
        },
      })

      expect(result.success).toBe(false)
    })
  })

  describe('createGroupHabit', () => {
    it('should create group habit and individual habits for all members', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member')

      const result = await groupsRouter.createGroupHabit.handler({
        context: authenticatedContext,
        input: {
          groupId,
          title: 'Daily Meditation',
          description: 'Meditate for 10 minutes',
          frequency: 'daily',
        },
      })

      expect(result).toBeDefined()
      expect(result.title).toBe('Daily Meditation')
      expect(result.description).toBe('Meditate for 10 minutes')
      expect(result.frequency).toBe('daily')
      expect(result.createdBy).toBe(mockUserId)

      // Individual habits should be created for both members
      const habits = await Habit.find({ groupHabitId: result._id as string })
      expect(habits).toHaveLength(2)

      const ownerHabit = habits.find((h) => h.userId === mockUserId)
      expect(ownerHabit?.title).toBe('Daily Meditation')
      expect(ownerHabit?.groupId).toBe(groupId)

      const memberHabit = habits.find((h) => h.userId === otherUserId)
      expect(memberHabit?.title).toBe('Daily Meditation')
    })

    it('should create weekly group habit with target', async () => {
      const groupId = await createGroupWithOwner(mockUserId)

      const result = await groupsRouter.createGroupHabit.handler({
        context: authenticatedContext,
        input: {
          groupId,
          title: 'Weekly Reading',
          frequency: 'weekly',
          weeklyTarget: 3,
        },
      })

      expect(result.frequency).toBe('weekly')
      expect(result.weeklyTarget).toBe(3)
    })

    it('should create specific_days group habit', async () => {
      const groupId = await createGroupWithOwner(mockUserId)

      const result = await groupsRouter.createGroupHabit.handler({
        context: authenticatedContext,
        input: {
          groupId,
          title: 'Weekend Yoga',
          frequency: 'specific_days',
          targetDays: [0, 6],
        },
      })

      expect(result.frequency).toBe('specific_days')
      expect(result.targetDays).toEqual([0, 6])
    })

    it('should allow moderator to create group habit', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'moderator')

      const result = await groupsRouter.createGroupHabit.handler({
        context: authenticatedContext,
        input: {
          groupId,
          title: 'Moderator Habit',
          frequency: 'daily',
        },
      })

      expect(result.title).toBe('Moderator Habit')
    })

    it('should throw FORBIDDEN for regular member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')

      await expectORPCError(
        () => groupsRouter.createGroupHabit.handler({
          context: authenticatedContext,
          input: {
            groupId,
            title: 'Member Habit',
            frequency: 'daily',
          },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('listGroupHabits', () => {
    it('should return group habits sorted by createdAt descending', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()

      await GroupHabit.create({
        _id: generateId(),
        groupId,
        title: 'First Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: mockUserId,
        createdAt: new Date(now.getTime() - 1000),
        updatedAt: now,
      })

      await GroupHabit.create({
        _id: generateId(),
        groupId,
        title: 'Second Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.listGroupHabits.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toHaveLength(2)
      expect(result[0]?.title).toBe('Second Habit')
      expect(result[1]?.title).toBe('First Habit')
    })

    it('should return empty array when no group habits exist', async () => {
      const groupId = await createGroupWithOwner(mockUserId)

      const result = await groupsRouter.listGroupHabits.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toEqual([])
    })

    it('should throw FORBIDDEN for non-member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)

      await expectORPCError(
        () => groupsRouter.listGroupHabits.handler({
          context: authenticatedContext,
          input: { groupId },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('updateGroupHabit', () => {
    it('should update group habit and sync to member habits', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()

      const ghId = generateId()
      await GroupHabit.create({
        _id: ghId,
        groupId,
        title: 'Old Title',
        description: 'Old Desc',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      // Create individual habit linked to group habit
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        groupHabitId: ghId,
        title: 'Old Title',
        description: 'Old Desc',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.updateGroupHabit.handler({
        context: authenticatedContext,
        input: {
          groupHabitId: ghId,
          title: 'New Title',
          description: 'New Desc',
        },
      })

      expect(result?.title).toBe('New Title')
      expect(result?.description).toBe('New Desc')

      // Individual habit should also be updated
      const habit = await Habit.findOne({ groupHabitId: ghId })
      expect(habit?.title).toBe('New Title')
      expect(habit?.description).toBe('New Desc')
    })

    it('should throw error for non-existent group habit', async () => {
      await expect(
        groupsRouter.updateGroupHabit.handler({
          context: authenticatedContext,
          input: {
            groupHabitId: generateId(),
            title: 'Test',
          },
        })
      ).rejects.toThrow('Group habit not found')
    })

    it('should throw FORBIDDEN for regular member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')
      const now = new Date()

      const ghId = generateId()
      await GroupHabit.create({
        _id: ghId,
        groupId,
        title: 'Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      await expectORPCError(
        () => groupsRouter.updateGroupHabit.handler({
          context: authenticatedContext,
          input: {
            groupHabitId: ghId,
            title: 'Hacked',
          },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('deleteGroupHabit', () => {
    it('should delete group habit and archive member habits', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()

      const ghId = generateId()
      await GroupHabit.create({
        _id: ghId,
        groupId,
        title: 'To Delete',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: mockUserId,
        createdAt: now,
        updatedAt: now,
      })

      const habitId = generateId()
      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        groupId,
        groupHabitId: ghId,
        title: 'To Delete',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Create completion to verify history is preserved
      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: '2024-01-01',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.deleteGroupHabit.handler({
        context: authenticatedContext,
        input: { groupHabitId: ghId },
      })

      expect(result.success).toBe(true)

      // Group habit should be deleted
      const gh = await GroupHabit.findById(ghId)
      expect(gh).toBeNull()

      // Individual habit should be archived, not deleted
      const habit = await Habit.findById(habitId)
      expect(habit).toBeDefined()
      expect(habit?.archived).toBe(true)

      // Completion history should be preserved
      const completions = await HabitCompletion.find({ habitId })
      expect(completions).toHaveLength(1)
    })

    it('should throw error for non-existent group habit', async () => {
      await expect(
        groupsRouter.deleteGroupHabit.handler({
          context: authenticatedContext,
          input: { groupHabitId: generateId() },
        })
      ).rejects.toThrow('Group habit not found')
    })

    it('should throw FORBIDDEN for regular member', async () => {
      const groupId = await createGroupWithOwner(otherUserId)
      await addMember(groupId, mockUserId, 'member')
      const now = new Date()

      const ghId = generateId()
      await GroupHabit.create({
        _id: ghId,
        groupId,
        title: 'Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdBy: otherUserId,
        createdAt: now,
        updatedAt: now,
      })

      await expectORPCError(
        () => groupsRouter.deleteGroupHabit.handler({
          context: authenticatedContext,
          input: { groupHabitId: ghId },
        }),
        'FORBIDDEN',
      )
    })
  })

  describe('getMemberProgress', () => {
    it('should return enriched member progress', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()
      const today = new Date().toISOString().split('T')[0]!

      // Create a habit for the owner
      const habitId = generateId()
      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        groupId,
        title: 'Test Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      // Complete the habit
      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: today,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.getMemberProgress.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toHaveLength(1)
      expect(result[0]?.userId).toBe(mockUserId)
      expect(result[0]?.totalHabits).toBe(1)
      expect(result[0]?.completedHabits).toBe(1)
      expect(result[0]?.role).toBe('owner')
      // Should have enriched user info fields
      expect(result[0]).toHaveProperty('userName')
      expect(result[0]).toHaveProperty('userImage')
    })

    it('should return progress for specific date', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()

      const habitId = generateId()
      await Habit.create({
        _id: habitId,
        userId: mockUserId,
        groupId,
        title: 'Test Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await HabitCompletion.create({
        _id: generateId(),
        habitId,
        userId: mockUserId,
        date: '2024-06-15',
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.getMemberProgress.handler({
        context: authenticatedContext,
        input: { groupId, date: '2024-06-15' },
      })

      expect(result[0]?.completedHabits).toBe(1)

      // Different date should show 0 completions
      const result2 = await groupsRouter.getMemberProgress.handler({
        context: authenticatedContext,
        input: { groupId, date: '2024-06-16' },
      })

      expect(result2[0]?.completedHabits).toBe(0)
    })

    it('should not count archived habits', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      const now = new Date()

      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        title: 'Archived Habit',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        archived: true,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.getMemberProgress.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result[0]?.totalHabits).toBe(0)
    })

    it('should return progress for multiple members', async () => {
      const groupId = await createGroupWithOwner(mockUserId)
      await addMember(groupId, otherUserId, 'member')
      const now = new Date()

      // Create habits for both users
      await Habit.create({
        _id: generateId(),
        userId: mockUserId,
        groupId,
        title: 'Habit 1',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      await Habit.create({
        _id: generateId(),
        userId: otherUserId,
        groupId,
        title: 'Habit 2',
        description: '',
        frequency: 'daily',
        targetDays: [],
        weeklyTarget: 1,
        createdAt: now,
        updatedAt: now,
      })

      const result = await groupsRouter.getMemberProgress.handler({
        context: authenticatedContext,
        input: { groupId },
      })

      expect(result).toHaveLength(2)
    })
  })
})
