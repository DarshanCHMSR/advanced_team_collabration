const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all invites for a user (both sent and received)
router.get('/', auth, async (req, res) => {
  try {
    const { type = 'received' } = req.query;

    let whereClause = {};
    if (type === 'sent') {
      whereClause.senderId = req.user.userId;
    } else {
      whereClause.receiverId = req.user.userId;
    }

    const invites = await prisma.teamInvite.findMany({
      where: whereClause,
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        receiver: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        team: {
          select: { id: true, name: true, description: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(invites);
  } catch (error) {
    console.error('Error fetching invites:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send a team invite
router.post('/', auth, async (req, res) => {
  try {
    const { username, teamId, message } = req.body;

    if (!username || !teamId) {
      return res.status(400).json({ message: 'Username and team ID are required' });
    }

    // Check if sender is team owner or admin
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { ownerId: req.user.userId },
          {
            members: {
              some: {
                userId: req.user.userId,
                role: 'ADMIN'
              }
            }
          }
        ]
      }
    });

    if (!team) {
      return res.status(403).json({ message: 'You do not have permission to invite members to this team' });
    }

    // Find receiver by username
    const receiver = await prisma.user.findUnique({
      where: { username }
    });

    if (!receiver) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: receiver.id,
          teamId: teamId
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this team' });
    }

    // Check if invite already exists
    const existingInvite = await prisma.teamInvite.findUnique({
      where: {
        senderId_receiverId_teamId: {
          senderId: req.user.userId,
          receiverId: receiver.id,
          teamId: teamId
        }
      }
    });

    if (existingInvite && existingInvite.status === 'PENDING') {
      return res.status(400).json({ message: 'Invite already sent to this user' });
    }

    // Create or update invite
    const invite = await prisma.teamInvite.upsert({
      where: {
        senderId_receiverId_teamId: {
          senderId: req.user.userId,
          receiverId: receiver.id,
          teamId: teamId
        }
      },
      update: {
        status: 'PENDING',
        message,
        updatedAt: new Date()
      },
      create: {
        senderId: req.user.userId,
        receiverId: receiver.id,
        teamId: teamId,
        message,
        status: 'PENDING'
      },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        receiver: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        team: {
          select: { id: true, name: true, description: true, avatar: true }
        }
      }
    });

    // Emit notification to receiver via Socket.io
    const io = req.app.get('io');
    io.to(`user_${receiver.id}`).emit('new_invite', invite);

    res.status(201).json(invite);
  } catch (error) {
    console.error('Error sending invite:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Respond to a team invite (accept/reject)
router.put('/:id', auth, async (req, res) => {
  try {
    const { status } = req.body;
    const inviteId = parseInt(req.params.id);

    if (!['ACCEPTED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be ACCEPTED or REJECTED' });
    }

    // Find invite
    const invite = await prisma.teamInvite.findFirst({
      where: {
        id: inviteId,
        receiverId: req.user.userId,
        status: 'PENDING'
      },
      include: {
        team: true
      }
    });

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found or already responded' });
    }

    // Update invite status
    const updatedInvite = await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status },
      include: {
        sender: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        receiver: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        team: {
          select: { id: true, name: true, description: true, avatar: true }
        }
      }
    });

    // If accepted, add user to team
    if (status === 'ACCEPTED') {
      await prisma.teamMember.create({
        data: {
          userId: req.user.userId,
          teamId: invite.teamId,
          role: 'MEMBER'
        }
      });
    }

    // Emit notification to sender via Socket.io
    const io = req.app.get('io');
    io.to(`user_${invite.senderId}`).emit('invite_response', updatedInvite);

    res.json(updatedInvite);
  } catch (error) {
    console.error('Error responding to invite:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Cancel a sent invite
router.delete('/:id', auth, async (req, res) => {
  try {
    const inviteId = parseInt(req.params.id);

    // Find invite
    const invite = await prisma.teamInvite.findFirst({
      where: {
        id: inviteId,
        senderId: req.user.userId,
        status: 'PENDING'
      }
    });

    if (!invite) {
      return res.status(404).json({ message: 'Invite not found or cannot be cancelled' });
    }

    // Update invite status to cancelled
    await prisma.teamInvite.update({
      where: { id: inviteId },
      data: { status: 'CANCELLED' }
    });

    // Emit notification to receiver via Socket.io
    const io = req.app.get('io');
    io.to(`user_${invite.receiverId}`).emit('invite_cancelled', { inviteId });

    res.json({ message: 'Invite cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling invite:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Search users by username (for inviting)
router.get('/search-users', auth, async (req, res) => {
  try {
    const { query, teamId } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({ message: 'Search query must be at least 2 characters' });
    }

    // Get existing team members if teamId is provided
    let existingMemberIds = [];
    if (teamId) {
      const teamMembers = await prisma.teamMember.findMany({
        where: { teamId: parseInt(teamId) },
        select: { userId: true }
      });
      existingMemberIds = teamMembers.map(member => member.userId);

      // Add team owner to excluded list
      const team = await prisma.team.findUnique({
        where: { id: parseInt(teamId) },
        select: { ownerId: true }
      });
      if (team) {
        existingMemberIds.push(team.ownerId);
      }
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            OR: [
              { username: { contains: query, mode: 'insensitive' } },
              { name: { contains: query, mode: 'insensitive' } }
            ]
          },
          {
            id: { notIn: [...existingMemberIds, req.user.userId] }
          }
        ]
      },
      select: { id: true, username: true, name: true, avatar: true },
      take: 10
    });

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
