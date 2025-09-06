const express = require('express');
const { PrismaClient } = require('@prisma/client');
const auth = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

// Get all teams for a user
router.get('/', auth, async (req, res) => {
  try {
    const teams = await prisma.team.findMany({
      where: {
        OR: [
          { ownerId: req.user.userId },
          {
            members: {
              some: {
                userId: req.user.userId
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatar: true, isOnline: true }
            }
          }
        },
        _count: {
          select: { members: true, projects: true }
        }
      }
    });

    res.json(teams);
  } catch (error) {
    console.error('Error fetching teams:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get a specific team
router.get('/:id', auth, async (req, res) => {
  try {
    const team = await prisma.team.findFirst({
      where: {
        id: parseInt(req.params.id),
        OR: [
          { ownerId: req.user.userId },
          {
            members: {
              some: {
                userId: req.user.userId
              }
            }
          }
        ]
      },
      include: {
        owner: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatar: true, isOnline: true }
            }
          }
        },
        projects: {
          include: {
            owner: {
              select: { id: true, username: true, name: true }
            },
            _count: {
              select: { tasks: true }
            }
          }
        }
      }
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found' });
    }

    res.json(team);
  } catch (error) {
    console.error('Error fetching team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create a new team
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic = false } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Team name is required' });
    }

    const team = await prisma.team.create({
      data: {
        name,
        description,
        isPublic,
        ownerId: req.user.userId
      },
      include: {
        owner: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatar: true, isOnline: true }
            }
          }
        }
      }
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a team
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const teamId = parseInt(req.params.id);

    // Check if user is the owner
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: req.user.userId
      }
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found or you are not the owner' });
    }

    const updatedTeam = await prisma.team.update({
      where: { id: teamId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(isPublic !== undefined && { isPublic })
      },
      include: {
        owner: {
          select: { id: true, username: true, name: true, avatar: true }
        },
        members: {
          include: {
            user: {
              select: { id: true, username: true, name: true, avatar: true, isOnline: true }
            }
          }
        }
      }
    });

    res.json(updatedTeam);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete a team
router.delete('/:id', auth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);

    // Check if user is the owner
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        ownerId: req.user.userId
      }
    });

    if (!team) {
      return res.status(404).json({ message: 'Team not found or you are not the owner' });
    }

    await prisma.team.delete({
      where: { id: teamId }
    });

    res.json({ message: 'Team deleted successfully' });
  } catch (error) {
    console.error('Error deleting team:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add member to team by username
router.post('/:id/members', auth, async (req, res) => {
  try {
    const { username } = req.body;
    const teamId = parseInt(req.params.id);

    if (!username) {
      return res.status(400).json({ message: 'Username is required' });
    }

    // Check if user is team owner or admin
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
      return res.status(403).json({ message: 'You do not have permission to add members to this team' });
    }

    // Find user by username
    const user = await prisma.user.findUnique({
      where: { username }
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check if user is already a member
    const existingMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId: user.id,
          teamId: teamId
        }
      }
    });

    if (existingMember) {
      return res.status(400).json({ message: 'User is already a member of this team' });
    }

    // Add user to team
    const teamMember = await prisma.teamMember.create({
      data: {
        userId: user.id,
        teamId: teamId,
        role: 'MEMBER'
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatar: true, isOnline: true }
        }
      }
    });

    res.status(201).json(teamMember);
  } catch (error) {
    console.error('Error adding team member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Remove member from team
router.delete('/:id/members/:userId', auth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const userId = parseInt(req.params.userId);

    // Check if user is team owner or admin, or removing themselves
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

    if (!team && userId !== req.user.userId) {
      return res.status(403).json({ message: 'You do not have permission to remove this member' });
    }

    // Cannot remove team owner
    if (userId === team.ownerId) {
      return res.status(400).json({ message: 'Cannot remove team owner' });
    }

    await prisma.teamMember.delete({
      where: {
        userId_teamId: {
          userId: userId,
          teamId: teamId
        }
      }
    });

    res.json({ message: 'Member removed successfully' });
  } catch (error) {
    console.error('Error removing team member:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get team messages
router.get('/:id/messages', auth, async (req, res) => {
  try {
    const teamId = parseInt(req.params.id);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;

    // Check if user is a member of the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { ownerId: req.user.userId },
          {
            members: {
              some: {
                userId: req.user.userId
              }
            }
          }
        ]
      }
    });

    if (!team) {
      return res.status(403).json({ message: 'You are not a member of this team' });
    }

    const messages = await prisma.message.findMany({
      where: { teamId },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatar: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit
    });

    res.json(messages.reverse());
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Send message to team
router.post('/:id/messages', auth, async (req, res) => {
  try {
    const { content, type = 'TEXT' } = req.body;
    const teamId = parseInt(req.params.id);

    if (!content) {
      return res.status(400).json({ message: 'Message content is required' });
    }

    // Check if user is a member of the team
    const team = await prisma.team.findFirst({
      where: {
        id: teamId,
        OR: [
          { ownerId: req.user.userId },
          {
            members: {
              some: {
                userId: req.user.userId
              }
            }
          }
        ]
      }
    });

    if (!team) {
      return res.status(403).json({ message: 'You are not a member of this team' });
    }

    const message = await prisma.message.create({
      data: {
        content,
        type,
        userId: req.user.userId,
        teamId
      },
      include: {
        user: {
          select: { id: true, username: true, name: true, avatar: true }
        }
      }
    });

    // Emit to team room via Socket.io
    const io = req.app.get('io');
    io.to(`team_${teamId}`).emit('new_message', message);

    res.status(201).json(message);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
