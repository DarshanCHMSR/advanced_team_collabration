import React, { useState, useEffect, useRef } from 'react';
import {
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  List,
  ListItem,
  Divider,
  Chip,
  Menu,
  MenuItem,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Autocomplete,
  Badge
} from '@mui/material';
import {
  Send,
  AttachFile,
  EmojiEmotions,
  MoreVert,
  PersonAdd,
  Settings,
  ExitToApp,
  Groups,
  FiberManualRecord
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { teamsAPI, invitesAPI } from '../../services/api';

const TeamChat = ({ team }) => {
  const { user, getSocket, messages, setMessages, sendMessage } = useAuth();
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [searchUsers, setSearchUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const messagesEndRef = useRef(null);
  const socketRef = useRef(null);

  const teamMessages = messages[team.id] || [];

  // Update socket ref when socket changes
  useEffect(() => {
    socketRef.current = getSocket();
  }, [getSocket]);

  useEffect(() => {
    if (team) {
      fetchMessages();
      if (socketRef.current) {
        socketRef.current.emit('join_team', team.id);
      }
    }

    return () => {
      if (socketRef.current && team) {
        socketRef.current.emit('leave_team', team.id);
      }
    };
  }, [team]); // Remove socket from dependencies

  useEffect(() => {
    scrollToBottom();
  }, [teamMessages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchMessages = async () => {
    try {
      const response = await teamsAPI.getMessages(team.id);
      setMessages(team.id, response.data);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const messageContent = newMessage.trim();
    setNewMessage('');

    try {
      // Send via Socket.io for real-time delivery
      sendMessage(team.id, messageContent);
      
      // Also send via API for persistence
      await teamsAPI.sendMessage(team.id, { content: messageContent });
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleInviteUser = async () => {
    if (!selectedUser) return;

    try {
      await invitesAPI.sendInvite({
        username: selectedUser.username,
        teamId: team.id,
        message: `You've been invited to join the ${team.name} team!`
      });
      setInviteDialogOpen(false);
      setSelectedUser(null);
      setUserSearchQuery('');
    } catch (error) {
      console.error('Error sending invite:', error);
    }
  };

  const searchForUsers = async (query) => {
    if (query.length < 2) {
      setSearchUsers([]);
      return;
    }

    try {
      const response = await invitesAPI.searchUsers(query, team.id);
      setSearchUsers(response.data);
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));

    if (hours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  const getOnlineMembers = () => {
    return team.members?.filter(member => member.user.isOnline) || [];
  };

  return (
    <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Chat Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            src={team.avatar}
            sx={{ bgcolor: 'primary.main' }}
          >
            {team.name.charAt(0).toUpperCase()}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              {team.name}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2" color="text.secondary">
                {team.members?.length || 0} members
              </Typography>
              <FiberManualRecord sx={{ fontSize: 4, color: 'text.secondary' }} />
              <Badge
                badgeContent={getOnlineMembers().length}
                color="success"
                sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
              >
                <Typography variant="body2" color="text.secondary">
                  online
                </Typography>
              </Badge>
            </Box>
          </Box>
        </Box>

        <IconButton onClick={(e) => setMenuAnchor(e.currentTarget)}>
          <MoreVert />
        </IconButton>

        {/* Team Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem
            onClick={() => {
              setInviteDialogOpen(true);
              setMenuAnchor(null);
            }}
          >
            <PersonAdd sx={{ mr: 2 }} />
            Invite Members
          </MenuItem>
          <MenuItem>
            <Settings sx={{ mr: 2 }} />
            Team Settings
          </MenuItem>
          <Divider />
          <MenuItem sx={{ color: 'error.main' }}>
            <ExitToApp sx={{ mr: 2 }} />
            Leave Team
          </MenuItem>
        </Menu>
      </Box>

      {/* Messages Area */}
      <Box
        sx={{
          flex: 1,
          overflow: 'auto',
          p: 1
        }}
      >
        <List>
          {teamMessages.map((message, index) => {
            const isOwnMessage = message.userId === user.id;
            const showAvatar = index === 0 || teamMessages[index - 1].userId !== message.userId;

            return (
              <ListItem
                key={message.id}
                sx={{
                  display: 'flex',
                  flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                  alignItems: 'flex-start',
                  py: 0.5
                }}
              >
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: isOwnMessage ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: 1,
                    maxWidth: '70%'
                  }}
                >
                  {showAvatar && (
                    <Avatar
                      src={message.user?.avatar}
                      sx={{
                        width: 32,
                        height: 32,
                        bgcolor: 'primary.main',
                        fontSize: '0.875rem'
                      }}
                    >
                      {(message.user?.name || message.user?.username || 'U').charAt(0).toUpperCase()}
                    </Avatar>
                  )}

                  <Box
                    sx={{
                      ml: showAvatar ? 0 : isOwnMessage ? 0 : 5,
                      mr: showAvatar ? 0 : isOwnMessage ? 5 : 0
                    }}
                  >
                    {showAvatar && (
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 1,
                          mb: 0.5,
                          flexDirection: isOwnMessage ? 'row-reverse' : 'row'
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          {isOwnMessage ? 'You' : (message.user?.name || message.user?.username)}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatMessageTime(message.createdAt)}
                        </Typography>
                      </Box>
                    )}

                    <Paper
                      sx={{
                        p: 1.5,
                        bgcolor: isOwnMessage ? 'primary.main' : 'grey.100',
                        color: isOwnMessage ? 'primary.contrastText' : 'text.primary',
                        borderRadius: 2,
                        borderBottomRightRadius: isOwnMessage ? 4 : 16,
                        borderBottomLeftRadius: isOwnMessage ? 16 : 4
                      }}
                    >
                      <Typography variant="body2">
                        {message.content}
                      </Typography>
                    </Paper>
                  </Box>
                </Box>
              </ListItem>
            );
          })}
        </List>
        <div ref={messagesEndRef} />
      </Box>

      {/* Message Input */}
      <Box
        component="form"
        onSubmit={handleSendMessage}
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          display: 'flex',
          gap: 1,
          alignItems: 'flex-end'
        }}
      >
        <TextField
          fullWidth
          multiline
          maxRows={4}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder={`Message ${team.name}...`}
          variant="outlined"
          size="small"
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage(e);
            }
          }}
        />
        <IconButton>
          <AttachFile />
        </IconButton>
        <IconButton>
          <EmojiEmotions />
        </IconButton>
        <IconButton
          type="submit"
          color="primary"
          disabled={!newMessage.trim()}
        >
          <Send />
        </IconButton>
      </Box>

      {/* Invite Dialog */}
      <Dialog
        open={inviteDialogOpen}
        onClose={() => setInviteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Invite Members to {team.name}</DialogTitle>
        <DialogContent>
          <Autocomplete
            options={searchUsers}
            getOptionLabel={(option) => `${option.name} (@${option.username})`}
            value={selectedUser}
            onChange={(event, newValue) => setSelectedUser(newValue)}
            inputValue={userSearchQuery}
            onInputChange={(event, newInputValue) => {
              setUserSearchQuery(newInputValue);
              searchForUsers(newInputValue);
            }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Search users by name or username"
                variant="outlined"
                fullWidth
                margin="normal"
              />
            )}
            renderOption={(props, option) => (
              <Box component="li" {...props}>
                <Avatar
                  src={option.avatar}
                  sx={{ mr: 2, width: 32, height: 32 }}
                >
                  {option.name.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="body1">{option.name}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    @{option.username}
                  </Typography>
                </Box>
              </Box>
            )}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setInviteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleInviteUser}
            variant="contained"
            disabled={!selectedUser}
          >
            Send Invite
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default TeamChat;
