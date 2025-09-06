import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Tooltip,
  Menu,
  MenuItem,
  Divider
} from '@mui/material';
import {
  Add,
  VideoCall,
  Schedule,
  People,
  Lock,
  MoreVert,
  ContentCopy,
  Delete,
  Edit
} from '@mui/icons-material';
import { format, isToday, isTomorrow, isYesterday, isPast } from 'date-fns';
import { authAPI } from '../../services/api';
import CreateMeetingDialog from './CreateMeetingDialog';

const MeetingsList = ({ teams = [] }) => {
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showJoinDialog, setShowJoinDialog] = useState(false);
  const [joinMeetingUrl, setJoinMeetingUrl] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joiningMeeting, setJoiningMeeting] = useState(false);
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedMeeting, setSelectedMeeting] = useState(null);

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      setLoading(true);
      const response = await authAPI.get('/meetings/user/meetings');
      setMeetings(response.data.meetings);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      setError('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const handleMeetingCreated = (newMeeting) => {
    setMeetings(prev => [newMeeting, ...prev]);
  };

  const handleJoinMeeting = async () => {
    if (!joinMeetingUrl.trim()) {
      return;
    }

    try {
      setJoiningMeeting(true);
      
      // Extract meeting URL from full URL if needed
      const urlParts = joinMeetingUrl.split('/');
      const meetingUrl = urlParts[urlParts.length - 1];

      // Join the meeting
      await authAPI.post(`/meetings/${meetingUrl}/join`, {
        password: joinPassword
      });

      // Navigate to meeting room
      navigate(`/meeting/${meetingUrl}`);
    } catch (error) {
      console.error('Error joining meeting:', error);
      setError(error.response?.data?.message || 'Failed to join meeting');
    } finally {
      setJoiningMeeting(false);
    }
  };

  const handleStartMeeting = async (meeting) => {
    try {
      // Join the meeting
      await authAPI.post(`/meetings/${meeting.meetingUrl}/join`);
      
      // Navigate to meeting room
      navigate(`/meeting/${meeting.meetingUrl}`);
    } catch (error) {
      console.error('Error starting meeting:', error);
      setError(error.response?.data?.message || 'Failed to start meeting');
    }
  };

  const handleCopyMeetingLink = (meeting) => {
    const meetingLink = `${window.location.origin}/meeting/${meeting.meetingUrl}`;
    navigator.clipboard.writeText(meetingLink);
    setAnchorEl(null);
  };

  const handleDeleteMeeting = async (meeting) => {
    try {
      await authAPI.post(`/meetings/${meeting.meetingUrl}/end`);
      setMeetings(prev => prev.filter(m => m.id !== meeting.id));
      setAnchorEl(null);
    } catch (error) {
      console.error('Error ending meeting:', error);
      setError('Failed to end meeting');
    }
  };

  const formatMeetingTime = (startTime) => {
    const date = new Date(startTime);
    
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else if (isYesterday(date)) {
      return `Yesterday at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy \'at\' h:mm a');
    }
  };

  const getMeetingStatus = (meeting) => {
    const now = new Date();
    const startTime = new Date(meeting.startTime);
    const endTime = meeting.endTime ? new Date(meeting.endTime) : null;

    if (meeting.status === 'ENDED') {
      return { label: 'Ended', color: 'default' };
    } else if (meeting.status === 'CANCELLED') {
      return { label: 'Cancelled', color: 'error' };
    } else if (meeting.status === 'ONGOING') {
      return { label: 'Live', color: 'error' };
    } else if (isPast(startTime)) {
      return { label: 'Missed', color: 'warning' };
    } else {
      return { label: 'Scheduled', color: 'primary' };
    }
  };

  const canStartMeeting = (meeting) => {
    return meeting.status === 'SCHEDULED' && !isPast(new Date(meeting.startTime));
  };

  const canJoinMeeting = (meeting) => {
    return meeting.status === 'ONGOING' || meeting.status === 'SCHEDULED';
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={4}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Meetings
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<VideoCall />}
            onClick={() => setShowJoinDialog(true)}
            sx={{ mr: 1 }}
          >
            Join Meeting
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setShowCreateDialog(true)}
          >
            New Meeting
          </Button>
        </Box>
      </Box>

      <Paper elevation={2}>
        {meetings.length === 0 ? (
          <Box p={4} textAlign="center">
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No meetings yet
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Create your first meeting to get started with video collaboration.
            </Typography>
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => setShowCreateDialog(true)}
            >
              Create Meeting
            </Button>
          </Box>
        ) : (
          <List>
            {meetings.map((meeting, index) => (
              <React.Fragment key={meeting.id}>
                <ListItem>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle1">
                          {meeting.title}
                        </Typography>
                        <Chip
                          label={getMeetingStatus(meeting).label}
                          color={getMeetingStatus(meeting).color}
                          size="small"
                        />
                        {meeting.password && (
                          <Tooltip title="Password protected">
                            <Lock fontSize="small" color="action" />
                          </Tooltip>
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {formatMeetingTime(meeting.startTime)}
                        </Typography>
                        {meeting.team && (
                          <Typography variant="caption" color="text.secondary">
                            Team: {meeting.team.name}
                          </Typography>
                        )}
                        {meeting.description && (
                          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            {meeting.description}
                          </Typography>
                        )}
                        <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                          <People fontSize="small" color="action" />
                          <Typography variant="caption" color="text.secondary">
                            {meeting.participants?.length || 0} participants
                          </Typography>
                        </Box>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Box display="flex" alignItems="center" gap={1}>
                      {canJoinMeeting(meeting) && (
                        <Button
                          variant="contained"
                          size="small"
                          startIcon={<VideoCall />}
                          onClick={() => handleStartMeeting(meeting)}
                          color={meeting.status === 'ONGOING' ? 'error' : 'primary'}
                        >
                          {meeting.status === 'ONGOING' ? 'Join' : 'Start'}
                        </Button>
                      )}
                      <IconButton
                        onClick={(e) => {
                          setAnchorEl(e.currentTarget);
                          setSelectedMeeting(meeting);
                        }}
                      >
                        <MoreVert />
                      </IconButton>
                    </Box>
                  </ListItemSecondaryAction>
                </ListItem>
                {index < meetings.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </Paper>

      {/* Create Meeting Dialog */}
      <CreateMeetingDialog
        open={showCreateDialog}
        onClose={() => setShowCreateDialog(false)}
        onMeetingCreated={handleMeetingCreated}
        teams={teams}
      />

      {/* Join Meeting Dialog */}
      <Dialog open={showJoinDialog} onClose={() => setShowJoinDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Join Meeting</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Meeting URL or ID"
            value={joinMeetingUrl}
            onChange={(e) => setJoinMeetingUrl(e.target.value)}
            margin="normal"
            placeholder="Enter meeting URL or meeting ID"
            helperText="You can paste the full meeting URL or just the meeting ID"
          />
          <TextField
            fullWidth
            label="Password (if required)"
            type="password"
            value={joinPassword}
            onChange={(e) => setJoinPassword(e.target.value)}
            margin="normal"
            placeholder="Enter meeting password"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowJoinDialog(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleJoinMeeting}
            disabled={!joinMeetingUrl.trim() || joiningMeeting}
          >
            {joiningMeeting ? <CircularProgress size={20} /> : 'Join'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Meeting Options Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleCopyMeetingLink(selectedMeeting)}>
          <ContentCopy fontSize="small" sx={{ mr: 1 }} />
          Copy meeting link
        </MenuItem>
        {selectedMeeting?.status !== 'ENDED' && (
          <MenuItem onClick={() => handleDeleteMeeting(selectedMeeting)}>
            <Delete fontSize="small" sx={{ mr: 1 }} />
            End meeting
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};

export default MeetingsList;
