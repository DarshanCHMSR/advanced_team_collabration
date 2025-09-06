import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { format } from 'date-fns';
import { authAPI } from '../../services/api';

const CreateMeetingDialog = ({ open, onClose, onMeetingCreated, teams = [] }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    teamId: '',
    password: '',
    maxParticipants: 50,
    waitingRoom: true
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      const now = new Date();
      const defaultStartTime = format(now, "yyyy-MM-dd'T'HH:mm");
      
      setFormData({
        title: '',
        description: '',
        startTime: defaultStartTime,
        endTime: '',
        teamId: '',
        password: '',
        maxParticipants: 50,
        waitingRoom: true
      });
      setError(null);
    }
  }, [open]);

  const handleInputChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.value
    }));
  };

  const handleSwitchChange = (field) => (event) => {
    setFormData(prev => ({
      ...prev,
      [field]: event.target.checked
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    
    if (!formData.title.trim()) {
      setError('Meeting title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const meetingData = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        startTime: formData.startTime ? new Date(formData.startTime).toISOString() : new Date().toISOString(),
        endTime: formData.endTime ? new Date(formData.endTime).toISOString() : undefined,
        teamId: formData.teamId || undefined,
        password: formData.password.trim() || undefined,
        maxParticipants: formData.maxParticipants,
        waitingRoom: formData.waitingRoom
      };

      const response = await authAPI.post('/meetings/create', meetingData);
      
      if (onMeetingCreated) {
        onMeetingCreated(response.data.meeting);
      }
      
      onClose();
    } catch (error) {
      console.error('Error creating meeting:', error);
      setError(error.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Create New Meeting</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}

            <TextField
              fullWidth
              label="Meeting Title"
              value={formData.title}
              onChange={handleInputChange('title')}
              margin="normal"
              required
              disabled={loading}
              placeholder="Enter meeting title"
            />

            <TextField
              fullWidth
              label="Description (Optional)"
              value={formData.description}
              onChange={handleInputChange('description')}
              margin="normal"
              multiline
              rows={3}
              disabled={loading}
              placeholder="Enter meeting description"
            />

            {teams.length > 0 && (
              <FormControl fullWidth margin="normal">
                <InputLabel>Team (Optional)</InputLabel>
                <Select
                  value={formData.teamId}
                  onChange={handleInputChange('teamId')}
                  label="Team (Optional)"
                  disabled={loading}
                >
                  <MenuItem value="">
                    <em>No team - Personal meeting</em>
                  </MenuItem>
                  {teams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Start Time"
              type="datetime-local"
              value={formData.startTime}
              onChange={handleInputChange('startTime')}
              margin="normal"
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              fullWidth
              label="End Time (Optional)"
              type="datetime-local"
              value={formData.endTime}
              onChange={handleInputChange('endTime')}
              margin="normal"
              disabled={loading}
              InputLabelProps={{
                shrink: true,
              }}
            />

            <TextField
              fullWidth
              label="Meeting Password (Optional)"
              value={formData.password}
              onChange={handleInputChange('password')}
              margin="normal"
              type="password"
              disabled={loading}
              placeholder="Leave empty for no password"
              helperText="Participants will need this password to join"
            />

            <TextField
              fullWidth
              label="Maximum Participants"
              type="number"
              value={formData.maxParticipants}
              onChange={handleInputChange('maxParticipants')}
              margin="normal"
              disabled={loading}
              inputProps={{ min: 2, max: 100 }}
              helperText="Maximum number of participants (2-100)"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={formData.waitingRoom}
                  onChange={handleSwitchChange('waitingRoom')}
                  disabled={loading}
                />
              }
              label="Enable waiting room"
              sx={{ mt: 2 }}
            />
            <Typography variant="caption" color="text.secondary" display="block">
              Participants will wait for the host to admit them
            </Typography>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || !formData.title.trim()}
            startIcon={loading && <CircularProgress size={20} />}
          >
            {loading ? 'Creating...' : 'Create Meeting'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default CreateMeetingDialog;
