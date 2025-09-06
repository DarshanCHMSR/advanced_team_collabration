const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const router = express.Router();

// Generate unique meeting code
const generateMeetingCode = () => {
  return crypto.randomBytes(3).toString('hex').toUpperCase();
};

// Validation middleware
const validateCreateMeeting = [
  body('title').trim().isLength({ min: 1 }).withMessage('Meeting title is required'),
  body('start_time').optional().isISO8601().withMessage('Invalid start time format'),
  body('end_time').optional().isISO8601().withMessage('Invalid end time format'),
  body('password').optional().isLength({ min: 4 }).withMessage('Password must be at least 4 characters')
];

// Create meeting
router.post('/create', validateCreateMeeting, async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, start_time, end_time, password } = req.body;
    const hostId = req.user.id;
    
    // Generate unique meeting code
    let meetingCode;
    let isUnique = false;
    let attempts = 0;
    
    while (!isUnique && attempts < 10) {
      meetingCode = generateMeetingCode();
      const existingMeeting = await pool.query(
        'SELECT id FROM meetings WHERE meeting_code = $1',
        [meetingCode]
      );
      isUnique = existingMeeting.rows.length === 0;
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({ message: 'Failed to generate unique meeting code' });
    }

    // Create meeting
    const result = await pool.query(
      `INSERT INTO meetings (id, host_id, title, start_time, end_time, meeting_code, password, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, title, start_time, end_time, meeting_code, password, status, created_at`,
      [uuidv4(), hostId, title, start_time, end_time, meetingCode, password, 'scheduled']
    );

    const meeting = result.rows[0];

    // Add host as participant
    await pool.query(
      'INSERT INTO participants (id, meeting_id, user_id, name, email, role) VALUES ($1, $2, $3, $4, $5, $6)',
      [uuidv4(), meeting.id, hostId, req.user.name, req.user.email, 'host']
    );

    res.status(201).json({
      message: 'Meeting created successfully',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meeting_code: meeting.meeting_code,
        has_password: !!meeting.password,
        status: meeting.status,
        created_at: meeting.created_at,
        meeting_url: `${process.env.CLIENT_URL}/meeting/${meeting.meeting_code}`
      }
    });
  } catch (error) {
    console.error('Create meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meeting by code
router.get('/:code', async (req, res) => {
  try {
    const { code } = req.params;

    const result = await pool.query(
      `SELECT m.*, u.name as host_name, u.email as host_email
       FROM meetings m
       JOIN users u ON m.host_id = u.id
       WHERE m.meeting_code = $1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const meeting = result.rows[0];

    // Get participants count
    const participantsResult = await pool.query(
      'SELECT COUNT(*) as count FROM participants WHERE meeting_id = $1 AND is_active = true',
      [meeting.id]
    );

    res.json({
      meeting: {
        id: meeting.id,
        title: meeting.title,
        start_time: meeting.start_time,
        end_time: meeting.end_time,
        meeting_code: meeting.meeting_code,
        has_password: !!meeting.password,
        status: meeting.status,
        host_name: meeting.host_name,
        host_email: meeting.host_email,
        participants_count: parseInt(participantsResult.rows[0].count),
        created_at: meeting.created_at
      }
    });
  } catch (error) {
    console.error('Get meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Join meeting
router.post('/join', async (req, res) => {
  try {
    const { meeting_code, password, name, email } = req.body;

    // Find meeting
    const meetingResult = await pool.query(
      'SELECT * FROM meetings WHERE meeting_code = $1',
      [meeting_code]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found' });
    }

    const meeting = meetingResult.rows[0];

    // Check password if required
    if (meeting.password && meeting.password !== password) {
      return res.status(401).json({ message: 'Invalid meeting password' });
    }

    // Check if meeting is active
    if (meeting.status === 'ended') {
      return res.status(400).json({ message: 'Meeting has ended' });
    }

    // Check if user is already a participant
    let participantId = null;
    if (req.user) {
      const existingParticipant = await pool.query(
        'SELECT id FROM participants WHERE meeting_id = $1 AND user_id = $2',
        [meeting.id, req.user.id]
      );
      participantId = existingParticipant.rows[0]?.id;
    }

    // Add or update participant
    if (participantId) {
      await pool.query(
        'UPDATE participants SET is_active = true, joined_at = CURRENT_TIMESTAMP WHERE id = $1',
        [participantId]
      );
    } else {
      const newParticipantId = uuidv4();
      await pool.query(
        'INSERT INTO participants (id, meeting_id, user_id, name, email, role) VALUES ($1, $2, $3, $4, $5, $6)',
        [newParticipantId, meeting.id, req.user?.id || null, name, email || req.user?.email || null, 'participant']
      );
      participantId = newParticipantId;
    }

    res.json({
      message: 'Successfully joined meeting',
      meeting: {
        id: meeting.id,
        title: meeting.title,
        meeting_code: meeting.meeting_code,
        status: meeting.status
      },
      participant_id: participantId
    });
  } catch (error) {
    console.error('Join meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get user's meetings
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get meetings where user is host
    const hostedMeetings = await pool.query(
      `SELECT m.*, COUNT(p.id) as participants_count
       FROM meetings m
       LEFT JOIN participants p ON m.id = p.meeting_id AND p.is_active = true
       WHERE m.host_id = $1
       GROUP BY m.id
       ORDER BY m.created_at DESC`,
      [userId]
    );

    // Get meetings where user is participant
    const participatedMeetings = await pool.query(
      `SELECT m.*, COUNT(p.id) as participants_count
       FROM meetings m
       JOIN participants part ON m.id = part.meeting_id
       LEFT JOIN participants p ON m.id = p.meeting_id AND p.is_active = true
       WHERE part.user_id = $1 AND part.role = 'participant'
       GROUP BY m.id
       ORDER BY part.joined_at DESC`,
      [userId]
    );

    res.json({
      hosted_meetings: hostedMeetings.rows,
      participated_meetings: participatedMeetings.rows
    });
  } catch (error) {
    console.error('Get meetings error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// End meeting
router.post('/:id/end', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Verify user is the host
    const meetingResult = await pool.query(
      'SELECT * FROM meetings WHERE id = $1 AND host_id = $2',
      [id, userId]
    );

    if (meetingResult.rows.length === 0) {
      return res.status(404).json({ message: 'Meeting not found or you are not the host' });
    }

    // Update meeting status
    await pool.query(
      'UPDATE meetings SET status = $1, end_time = CURRENT_TIMESTAMP WHERE id = $2',
      ['ended', id]
    );

    // Deactivate all participants
    await pool.query(
      'UPDATE participants SET is_active = false, left_at = CURRENT_TIMESTAMP WHERE meeting_id = $1',
      [id]
    );

    res.json({ message: 'Meeting ended successfully' });
  } catch (error) {
    console.error('End meeting error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Get meeting participants
router.get('/:id/participants', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT p.*, u.avatar_url
       FROM participants p
       LEFT JOIN users u ON p.user_id = u.id
       WHERE p.meeting_id = $1 AND p.is_active = true
       ORDER BY p.joined_at ASC`,
      [id]
    );

    res.json({ participants: result.rows });
  } catch (error) {
    console.error('Get participants error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
