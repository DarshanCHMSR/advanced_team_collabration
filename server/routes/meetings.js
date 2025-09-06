const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Generate unique meeting URL
const generateMeetingUrl = () => {
  return crypto.randomBytes(12).toString('hex');
};

// Validation middleware
const validateCreateMeeting = [
  body('title').trim().isLength({ min: 1 }).withMessage('Meeting title is required'),
  body('startTime').optional().isISO8601().withMessage('Invalid start time format'),
  body('endTime').optional().isISO8601().withMessage('Invalid end time format'),
  body('password').optional().isLength({ min: 4 }).withMessage('Password must be at least 4 characters'),
  body('teamId').optional().isInt().withMessage('Invalid team ID')
];

// Create meeting
router.post('/create', validateCreateMeeting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, startTime, endTime, password, teamId, maxParticipants, waitingRoom } = req.body;
    const hostId = req.user.id;
    
    // Generate unique meeting URL
    let meetingUrl;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      meetingUrl = generateMeetingUrl();
      const existingMeeting = await prisma.meeting.findUnique({
        where: { meetingUrl }
      });
      isUnique = !existingMeeting;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Failed to generate unique meeting URL' });
    }

    // If teamId is provided, verify user is a member
    if (teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId: hostId,
            teamId: parseInt(teamId)
          }
        }
      });

      if (!teamMember) {
        return res.status(403).json({ message: 'You are not a member of this team' });
      }
    }

    const meeting = await prisma.meeting.create({
      data: {
        title,
        description,
        meetingUrl,
        startTime: startTime ? new Date(startTime) : new Date(),
        endTime: endTime ? new Date(endTime) : null,
        password,
        hostId,
        teamId: teamId ? parseInt(teamId) : null,
        maxParticipants: maxParticipants || 50,
        waitingRoom: waitingRoom !== undefined ? waitingRoom : true
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting
    });

  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meeting by URL
router.get('/:meetingUrl', async (req, res) => {
  try {
    const { meetingUrl } = req.params;
    
    const meeting = await prisma.meeting.findUnique({
      where: { meetingUrl },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if user has access to the meeting
    const userId = req.user.id;
    let hasAccess = false;

    // Host always has access
    if (meeting.hostId === userId) {
      hasAccess = true;
    }
    // Check if user is in the team
    else if (meeting.teamId) {
      const teamMember = await prisma.teamMember.findUnique({
        where: {
          userId_teamId: {
            userId,
            teamId: meeting.teamId
          }
        }
      });
      hasAccess = !!teamMember;
    }
    // Check if user is already a participant
    else {
      const participant = await prisma.meetingParticipant.findUnique({
        where: {
          meetingId_userId: {
            meetingId: meeting.id,
            userId
          }
        }
      });
      hasAccess = !!participant;
    }

    if (!hasAccess) {
      return res.status(403).json({ message: 'Access denied to this meeting' });
    }

    res.json({ meeting });

  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Join meeting
router.post('/:meetingUrl/join', async (req, res) => {
  try {
    const { meetingUrl } = req.params;
    const { password } = req.body;
    const userId = req.user.id;

    const meeting = await prisma.meeting.findUnique({
      where: { meetingUrl },
      include: {
        participants: true
      }
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Check if meeting has ended
    if (meeting.status === 'ENDED') {
      return res.status(400).json({ message: 'Meeting has ended' });
    }

    // Check password if required
    if (meeting.password && meeting.password !== password) {
      return res.status(401).json({ message: 'Invalid meeting password' });
    }

    // Check if meeting is full
    if (meeting.participants.length >= meeting.maxParticipants) {
      return res.status(400).json({ message: 'Meeting is full' });
    }

    // Check if user is already a participant
    const existingParticipant = await prisma.meetingParticipant.findUnique({
      where: {
        meetingId_userId: {
          meetingId: meeting.id,
          userId
        }
      }
    });

    if (existingParticipant) {
      return res.status(400).json({ message: 'You are already in this meeting' });
    }

    // Add participant
    const participant = await prisma.meetingParticipant.create({
      data: {
        meetingId: meeting.id,
        userId,
        role: meeting.hostId === userId ? 'HOST' : 'PARTICIPANT'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      }
    });

    // Update meeting status to ONGOING if it's the first participant joining
    if (meeting.status === 'SCHEDULED') {
      await prisma.meeting.update({
        where: { id: meeting.id },
        data: { status: 'ONGOING' }
      });
    }

    res.json({
      message: 'Successfully joined meeting',
      participant
    });

  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Leave meeting
router.post('/:meetingUrl/leave', async (req, res) => {
  try {
    const { meetingUrl } = req.params;
    const userId = req.user.id;

    const meeting = await prisma.meeting.findUnique({
      where: { meetingUrl }
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    // Update participant left time
    await prisma.meetingParticipant.updateMany({
      where: {
        meetingId: meeting.id,
        userId,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    });

    res.json({ message: 'Successfully left meeting' });

  } catch (error) {
    console.error('Leave meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// End meeting (host only)
router.post('/:meetingUrl/end', async (req, res) => {
  try {
    const { meetingUrl } = req.params;
    const userId = req.user.id;

    const meeting = await prisma.meeting.findUnique({
      where: { meetingUrl }
    });

    if (!meeting) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    if (meeting.hostId !== userId) {
      return res.status(403).json({ message: 'Only the host can end the meeting' });
    }

    // Update meeting status and end time
    await prisma.meeting.update({
      where: { id: meeting.id },
      data: {
        status: 'ENDED',
        endTime: new Date()
      }
    });

    // Update all active participants left time
    await prisma.meetingParticipant.updateMany({
      where: {
        meetingId: meeting.id,
        leftAt: null
      },
      data: {
        leftAt: new Date()
      }
    });

    res.json({ message: 'Meeting ended successfully' });

  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's meetings
router.get('/user/meetings', async (req, res) => {
  try {
    const userId = req.user.id;

    const meetings = await prisma.meeting.findMany({
      where: {
        OR: [
          { hostId: userId },
          {
            participants: {
              some: { userId }
            }
          }
        ]
      },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        team: {
          select: {
            id: true,
            name: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    res.json({ meetings });

  } catch (error) {
    console.error('Get user meetings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get team meetings
router.get('/team/:teamId/meetings', async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;

    // Verify user is a member of the team
    const teamMember = await prisma.teamMember.findUnique({
      where: {
        userId_teamId: {
          userId,
          teamId: parseInt(teamId)
        }
      }
    });

    if (!teamMember) {
      return res.status(403).json({ message: 'You are not a member of this team' });
    }

    const meetings = await prisma.meeting.findMany({
      where: { teamId: parseInt(teamId) },
      include: {
        host: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        participants: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      },
      orderBy: {
        startTime: 'desc'
      }
    });

    res.json({ meetings });

  } catch (error) {
    console.error('Get team meetings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
