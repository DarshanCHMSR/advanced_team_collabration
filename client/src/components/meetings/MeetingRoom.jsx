import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Paper,
  Grid,
  IconButton,
  Typography,
  Tooltip,
  AppBar,
  Toolbar,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Mic,
  MicOff,
  Videocam,
  VideocamOff,
  ScreenShare,
  StopScreenShare,
  CallEnd,
  Chat,
  Settings,
  People,
  MoreVert
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';
import useWebRTC from '../../hooks/useWebRTC';

const MeetingRoom = () => {
  const { meetingUrl } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [meeting, setMeeting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showParticipants, setShowParticipants] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  const {
    localStream,
    remoteStreams,
    participants,
    isMuted,
    isVideoOn,
    isScreenSharing,
    localVideoRef,
    joinMeeting,
    leaveMeeting,
    toggleAudio,
    toggleVideo,
    toggleScreenShare
  } = useWebRTC(meetingUrl, localStorage.getItem('token'));

  const remoteVideoRefs = useRef(new Map());

  // Fetch meeting details
  useEffect(() => {
    const fetchMeeting = async () => {
      try {
        setLoading(true);
        const response = await authAPI.get(`/meetings/${meetingUrl}`);
        setMeeting(response.data.meeting);
      } catch (error) {
        console.error('Error fetching meeting:', error);
        setError(error.response?.data?.message || 'Failed to load meeting');
      } finally {
        setLoading(false);
      }
    };

    if (meetingUrl) {
      fetchMeeting();
    }
  }, [meetingUrl]);

  // Update remote video refs when participants change
  useEffect(() => {
    participants.forEach(participant => {
      if (!remoteVideoRefs.current.has(participant.socketId)) {
        remoteVideoRefs.current.set(participant.socketId, React.createRef());
      }
    });

    // Remove refs for participants who left
    remoteVideoRefs.current.forEach((ref, socketId) => {
      if (!participants.some(p => p.socketId === socketId)) {
        remoteVideoRefs.current.delete(socketId);
      }
    });
  }, [participants]);

  // Update remote video elements when streams change
  useEffect(() => {
    remoteStreams.forEach((stream, socketId) => {
      const ref = remoteVideoRefs.current.get(socketId);
      if (ref && ref.current) {
        ref.current.srcObject = stream;
      }
    });
  }, [remoteStreams]);

  const handleJoinMeeting = async () => {
    try {
      setIsJoining(true);
      await joinMeeting();
      setHasJoined(true);
    } catch (error) {
      console.error('Error joining meeting:', error);
      setError('Failed to join meeting. Please check your camera and microphone permissions.');
    } finally {
      setIsJoining(false);
    }
  };

  const handleLeaveMeeting = async () => {
    try {
      await leaveMeeting();
      navigate('/dashboard');
    } catch (error) {
      console.error('Error leaving meeting:', error);
      navigate('/dashboard');
    }
  };

  const formatDuration = (startTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const diff = Math.floor((now - start) / 1000);
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" p={3}>
        <Alert severity="error" sx={{ mb: 2, maxWidth: 400 }}>
          {error}
        </Alert>
        <Button variant="contained" onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </Button>
      </Box>
    );
  }

  if (!hasJoined) {
    return (
      <Box display="flex" flexDirection="column" alignItems="center" justifyContent="center" height="100vh" p={3}>
        <Paper elevation={3} sx={{ p: 4, maxWidth: 500, textAlign: 'center' }}>
          <Typography variant="h4" gutterBottom>
            {meeting?.title}
          </Typography>
          {meeting?.team && (
            <Chip label={meeting.team.name} color="primary" sx={{ mb: 2 }} />
          )}
          <Typography variant="body1" color="text.secondary" paragraph>
            Ready to join this meeting?
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            Please make sure your camera and microphone are working.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleJoinMeeting}
            disabled={isJoining}
            sx={{ mt: 2 }}
          >
            {isJoining ? <CircularProgress size={24} /> : 'Join Meeting'}
          </Button>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', bgcolor: '#1a1a1a' }}>
      {/* Header */}
      <AppBar position="static" sx={{ bgcolor: '#2d2d2d' }}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            {meeting?.title}
          </Typography>
          {meeting?.status === 'ONGOING' && (
            <Chip 
              label={`🔴 ${formatDuration(meeting.startTime)}`} 
              color="error" 
              size="small" 
              sx={{ mr: 2 }}
            />
          )}
          <Tooltip title="Participants">
            <IconButton color="inherit" onClick={() => setShowParticipants(true)}>
              <People />
            </IconButton>
          </Tooltip>
          <Tooltip title="Chat">
            <IconButton color="inherit" onClick={() => setShowChat(true)}>
              <Chat />
            </IconButton>
          </Tooltip>
          <Tooltip title="Settings">
            <IconButton color="inherit" onClick={() => setShowSettings(true)}>
              <Settings />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      {/* Video Grid */}
      <Box sx={{ flexGrow: 1, p: 2 }}>
        <Grid container spacing={2} sx={{ height: '100%' }}>
          {/* Local Video */}
          <Grid item xs={12} md={participants.length === 0 ? 12 : 6}>
            <Paper
              sx={{
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
                bgcolor: '#000',
                border: '2px solid transparent'
              }}
            >
              <video
                ref={localVideoRef}
                autoPlay
                muted
                playsInline
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
              <Box
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  left: 8,
                  bgcolor: 'rgba(0,0,0,0.7)',
                  color: 'white',
                  px: 1,
                  py: 0.5,
                  borderRadius: 1,
                  fontSize: '0.875rem'
                }}
              >
                You {isMuted && '(Muted)'}
              </Box>
              {!isVideoOn && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: '#333',
                    color: 'white'
                  }}
                >
                  <Typography variant="h6">Camera Off</Typography>
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Remote Videos */}
          {Array.from(remoteStreams.entries()).map(([socketId], index) => (
            <Grid item xs={12} md={6} key={socketId}>
              <Paper
                sx={{
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                  bgcolor: '#000'
                }}
              >
                <video
                  ref={remoteVideoRefs.current.get(socketId)}
                  autoPlay
                  playsInline
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover'
                  }}
                />
                <Box
                  sx={{
                    position: 'absolute',
                    bottom: 8,
                    left: 8,
                    bgcolor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    fontSize: '0.875rem'
                  }}
                >
                  Participant {index + 1}
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Controls */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          bgcolor: '#2d2d2d'
        }}
      >
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <IconButton
            color={isMuted ? 'error' : 'primary'}
            onClick={toggleAudio}
            sx={{
              bgcolor: isMuted ? 'error.main' : 'background.paper',
              color: isMuted ? 'white' : 'primary.main',
              '&:hover': {
                bgcolor: isMuted ? 'error.dark' : 'background.default'
              }
            }}
          >
            {isMuted ? <MicOff /> : <Mic />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isVideoOn ? 'Turn off camera' : 'Turn on camera'}>
          <IconButton
            color={isVideoOn ? 'primary' : 'error'}
            onClick={toggleVideo}
            sx={{
              bgcolor: isVideoOn ? 'background.paper' : 'error.main',
              color: isVideoOn ? 'primary.main' : 'white',
              '&:hover': {
                bgcolor: isVideoOn ? 'background.default' : 'error.dark'
              }
            }}
          >
            {isVideoOn ? <Videocam /> : <VideocamOff />}
          </IconButton>
        </Tooltip>

        <Tooltip title={isScreenSharing ? 'Stop sharing' : 'Share screen'}>
          <IconButton
            color={isScreenSharing ? 'secondary' : 'primary'}
            onClick={toggleScreenShare}
            sx={{
              bgcolor: isScreenSharing ? 'secondary.main' : 'background.paper',
              color: isScreenSharing ? 'white' : 'primary.main',
              '&:hover': {
                bgcolor: isScreenSharing ? 'secondary.dark' : 'background.default'
              }
            }}
          >
            {isScreenSharing ? <StopScreenShare /> : <ScreenShare />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Leave meeting">
          <IconButton
            color="error"
            onClick={handleLeaveMeeting}
            sx={{
              bgcolor: 'error.main',
              color: 'white',
              '&:hover': {
                bgcolor: 'error.dark'
              }
            }}
          >
            <CallEnd />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Participants Dialog */}
      <Dialog
        open={showParticipants}
        onClose={() => setShowParticipants(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Participants ({participants.length + 1})</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              {user?.name} (You) {meeting?.hostId === user?.id && '(Host)'}
            </Typography>
          </Box>
          {participants.map((participant, index) => (
            <Box key={participant.socketId} sx={{ mb: 1 }}>
              <Typography variant="body2">
                Participant {index + 1}
              </Typography>
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowParticipants(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MeetingRoom;
