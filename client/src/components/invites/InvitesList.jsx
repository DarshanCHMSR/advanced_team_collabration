import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Avatar,
  Button,
  Chip,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  CheckCircle,
  Cancel,
  Schedule,
  Groups,
  Person,
  Delete,
  Info
} from '@mui/icons-material';
import { invitesAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const InvitesList = ({ invites, onInviteUpdate }) => {
  const { user } = useAuth();
  const [selectedTab, setSelectedTab] = useState(0);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, invite: null, action: null });
  const [loading, setLoading] = useState(false);

  const receivedInvites = invites.filter(invite => invite.receiverId === user.id);
  const sentInvites = invites.filter(invite => invite.senderId === user.id);

  const handleTabChange = (event, newValue) => {
    setSelectedTab(newValue);
  };

  const handleInviteAction = async (invite, action) => {
    setLoading(true);
    try {
      if (action === 'accept' || action === 'reject') {
        const status = action === 'accept' ? 'ACCEPTED' : 'REJECTED';
        await invitesAPI.respondToInvite(invite.id, status);
      } else if (action === 'cancel') {
        await invitesAPI.cancelInvite(invite.id);
      }
      
      onInviteUpdate && onInviteUpdate();
      setConfirmDialog({ open: false, invite: null, action: null });
    } catch (error) {
      console.error('Error handling invite:', error);
    } finally {
      setLoading(false);
    }
  };

  const openConfirmDialog = (invite, action) => {
    setConfirmDialog({ open: true, invite, action });
  };

  const getStatusChip = (status) => {
    const statusConfig = {
      PENDING: { color: 'warning', icon: <Schedule /> },
      ACCEPTED: { color: 'success', icon: <CheckCircle /> },
      REJECTED: { color: 'error', icon: <Cancel /> },
      CANCELLED: { color: 'default', icon: <Delete /> }
    };

    const config = statusConfig[status] || statusConfig.PENDING;
    
    return (
      <Chip
        label={status.toLowerCase()}
        color={config.color}
        size="small"
        icon={config.icon}
        variant="outlined"
      />
    );
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now - date) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      const diffInDays = Math.floor(diffInHours / 24);
      return `${diffInDays}d ago`;
    }
  };

  const renderInviteItem = (invite, isReceived = true) => (
    <ListItem
      key={invite.id}
      sx={{
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        mb: 2,
        bgcolor: invite.status === 'PENDING' ? 'action.hover' : 'background.paper'
      }}
    >
      <ListItemAvatar>
        <Avatar
          src={isReceived ? invite.sender.avatar : invite.receiver.avatar}
          sx={{ bgcolor: 'primary.main' }}
        >
          {(isReceived ? invite.sender.name : invite.receiver.name)?.charAt(0).toUpperCase()}
        </Avatar>
      </ListItemAvatar>
      
      <ListItemText
        primary={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <Typography variant="subtitle1" fontWeight="bold">
              {invite.team.name}
            </Typography>
            {getStatusChip(invite.status)}
          </Box>
        }
        secondary={
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Groups sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body2" color="text.secondary">
                {isReceived
                  ? `Invited by ${invite.sender.name} (@${invite.sender.username})`
                  : `Invited ${invite.receiver.name} (@${invite.receiver.username})`
                }
              </Typography>
            </Box>
            {invite.message && (
              <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1 }}>
                "{invite.message}"
              </Typography>
            )}
            <Typography variant="caption" color="text.secondary">
              {formatDate(invite.createdAt)}
            </Typography>
          </Box>
        }
      />

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, ml: 2 }}>
        {isReceived && invite.status === 'PENDING' && (
          <>
            <Button
              variant="contained"
              color="success"
              size="small"
              startIcon={<CheckCircle />}
              onClick={() => openConfirmDialog(invite, 'accept')}
              sx={{ minWidth: 100 }}
            >
              Accept
            </Button>
            <Button
              variant="outlined"
              color="error"
              size="small"
              startIcon={<Cancel />}
              onClick={() => openConfirmDialog(invite, 'reject')}
              sx={{ minWidth: 100 }}
            >
              Decline
            </Button>
          </>
        )}
        
        {!isReceived && invite.status === 'PENDING' && (
          <Button
            variant="outlined"
            color="error"
            size="small"
            startIcon={<Delete />}
            onClick={() => openConfirmDialog(invite, 'cancel')}
            sx={{ minWidth: 100 }}
          >
            Cancel
          </Button>
        )}
      </Box>
    </ListItem>
  );

  return (
    <Box>
      <Card>
        <CardContent>
          <Typography variant="h5" fontWeight="bold" gutterBottom>
            Team Invitations
          </Typography>

          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}
          >
            <Tab
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  Received
                  {receivedInvites.filter(i => i.status === 'PENDING').length > 0 && (
                    <Chip
                      label={receivedInvites.filter(i => i.status === 'PENDING').length}
                      size="small"
                      color="error"
                    />
                  )}
                </Box>
              }
            />
            <Tab label="Sent" />
          </Tabs>

          {/* Received Invites Tab */}
          {selectedTab === 0 && (
            <Box>
              {receivedInvites.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: 'text.secondary'
                  }}
                >
                  <Groups sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No invitations received
                  </Typography>
                  <Typography variant="body2">
                    When teams invite you, they'll appear here
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {receivedInvites.map(invite => renderInviteItem(invite, true))}
                </List>
              )}
            </Box>
          )}

          {/* Sent Invites Tab */}
          {selectedTab === 1 && (
            <Box>
              {sentInvites.length === 0 ? (
                <Box
                  sx={{
                    textAlign: 'center',
                    py: 4,
                    color: 'text.secondary'
                  }}
                >
                  <Person sx={{ fontSize: 48, mb: 2 }} />
                  <Typography variant="h6" gutterBottom>
                    No invitations sent
                  </Typography>
                  <Typography variant="body2">
                    Invitations you send to others will appear here
                  </Typography>
                </Box>
              ) : (
                <List disablePadding>
                  {sentInvites.map(invite => renderInviteItem(invite, false))}
                </List>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, invite: null, action: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Info color="primary" />
            Confirm Action
          </Box>
        </DialogTitle>
        <DialogContent>
          {confirmDialog.invite && (
            <Typography>
              {confirmDialog.action === 'accept' && 
                `Are you sure you want to accept the invitation to join "${confirmDialog.invite.team.name}"?`
              }
              {confirmDialog.action === 'reject' && 
                `Are you sure you want to decline the invitation to join "${confirmDialog.invite.team.name}"?`
              }
              {confirmDialog.action === 'cancel' && 
                `Are you sure you want to cancel the invitation sent to ${confirmDialog.invite.receiver.name}?`
              }
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setConfirmDialog({ open: false, invite: null, action: null })}
            color="inherit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => handleInviteAction(confirmDialog.invite, confirmDialog.action)}
            variant="contained"
            color={confirmDialog.action === 'accept' ? 'success' : 'error'}
            disabled={loading}
          >
            {loading ? 'Processing...' : 'Confirm'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InvitesList;
