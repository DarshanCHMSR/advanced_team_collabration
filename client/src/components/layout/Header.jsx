import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Button,
  Badge,
  Tooltip,
  Divider,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import {
  GroupWork,
  Notifications,
  Settings,
  Logout,
  AccountCircle,
  Groups,
  Assignment,
  Mail
} from '@mui/icons-material';
import { useAuth } from '../../context/AuthContext';
import { authAPI } from '../../services/api';

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, invites } = useAuth();
  
  const [anchorEl, setAnchorEl] = useState(null);
  const [notificationAnchor, setNotificationAnchor] = useState(null);

  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = async () => {
    try {
      await authAPI.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      logout();
      navigate('/login');
    }
  };

  const handleNavigation = (path) => {
    navigate(path);
  };

  const getActiveTab = () => {
    const path = location.pathname;
    if (path.startsWith('/teams')) return 'teams';
    if (path.startsWith('/projects')) return 'projects';
    if (path.startsWith('/invites')) return 'invites';
    return 'dashboard';
  };

  const activeTab = getActiveTab();
  const pendingInvites = invites.filter(invite => invite.status === 'PENDING').length;

  return (
    <AppBar
      position="sticky"
      elevation={1}
      sx={{
        backgroundColor: 'background.paper',
        color: 'text.primary',
        borderBottom: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: { xs: 2, sm: 3 } }}>
        {/* Left side - Logo and Navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {/* Logo */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer'
            }}
            onClick={() => navigate('/')}
          >
            <GroupWork sx={{ color: 'primary.main', fontSize: 32 }} />
            <Typography
              variant="h6"
              fontWeight="bold"
              sx={{
                background: 'linear-gradient(45deg, #2563eb 30%, #7c3aed 90%)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                display: { xs: 'none', sm: 'block' }
              }}
            >
              SynergySphere
            </Typography>
          </Box>

          {/* Navigation Tabs */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            <Button
              color={activeTab === 'dashboard' ? 'primary' : 'inherit'}
              onClick={() => handleNavigation('/')}
              sx={{ fontWeight: activeTab === 'dashboard' ? 600 : 400 }}
            >
              Dashboard
            </Button>
            <Button
              color={activeTab === 'teams' ? 'primary' : 'inherit'}
              onClick={() => handleNavigation('/teams')}
              sx={{ fontWeight: activeTab === 'teams' ? 600 : 400 }}
              startIcon={<Groups />}
            >
              Teams
            </Button>
            <Button
              color={activeTab === 'projects' ? 'primary' : 'inherit'}
              onClick={() => handleNavigation('/projects')}
              sx={{ fontWeight: activeTab === 'projects' ? 600 : 400 }}
              startIcon={<Assignment />}
            >
              Projects
            </Button>
            <Button
              color={activeTab === 'invites' ? 'primary' : 'inherit'}
              onClick={() => handleNavigation('/invites')}
              sx={{ fontWeight: activeTab === 'invites' ? 600 : 400 }}
              startIcon={
                <Badge badgeContent={pendingInvites} color="error">
                  <Mail />
                </Badge>
              }
            >
              Invites
            </Button>
          </Box>
        </Box>

        {/* Right side - User actions */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notifications */}
          <Tooltip title="Notifications">
            <IconButton
              onClick={handleNotificationMenuOpen}
              sx={{ color: 'text.primary' }}
            >
              <Badge badgeContent={pendingInvites} color="error">
                <Notifications />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* User Profile */}
          <Tooltip title="Account settings">
            <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5 }}>
              <Avatar
                src={user?.avatar}
                alt={user?.name || user?.username}
                sx={{
                  width: 36,
                  height: 36,
                  bgcolor: 'primary.main',
                  fontSize: '0.875rem'
                }}
              >
                {(user?.name || user?.username || 'U').charAt(0).toUpperCase()}
              </Avatar>
            </IconButton>
          </Tooltip>
        </Box>

        {/* Profile Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleProfileMenuClose}
          onClick={handleProfileMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 220,
              '& .MuiAvatar-root': {
                width: 24,
                height: 24,
                ml: -0.5,
                mr: 1
              },
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0
              }
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight="bold">
              {user?.name || 'User'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              @{user?.username}
            </Typography>
          </Box>
          <Divider />
          <MenuItem onClick={() => navigate('/profile')}>
            <ListItemIcon>
              <AccountCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Profile</ListItemText>
          </MenuItem>
          <MenuItem onClick={() => navigate('/settings')}>
            <ListItemIcon>
              <Settings fontSize="small" />
            </ListItemIcon>
            <ListItemText>Settings</ListItemText>
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <Logout fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText>Logout</ListItemText>
          </MenuItem>
        </Menu>

        {/* Notifications Menu */}
        <Menu
          anchorEl={notificationAnchor}
          open={Boolean(notificationAnchor)}
          onClose={handleNotificationMenuClose}
          PaperProps={{
            elevation: 0,
            sx: {
              overflow: 'visible',
              filter: 'drop-shadow(0px 2px 8px rgba(0,0,0,0.32))',
              mt: 1.5,
              minWidth: 300,
              maxHeight: 400,
              '&:before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0
              }
            }
          }}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="h6" fontWeight="bold">
              Notifications
            </Typography>
          </Box>
          <Divider />
          {pendingInvites > 0 ? (
            invites
              .filter(invite => invite.status === 'PENDING')
              .slice(0, 5)
              .map((invite) => (
                <MenuItem
                  key={invite.id}
                  onClick={() => {
                    navigate('/invites');
                    handleNotificationMenuClose();
                  }}
                >
                  <Box>
                    <Typography variant="body2" fontWeight="bold">
                      Team Invite
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {invite.sender.name} invited you to {invite.team.name}
                    </Typography>
                  </Box>
                </MenuItem>
              ))
          ) : (
            <MenuItem>
              <Typography variant="body2" color="text.secondary">
                No new notifications
              </Typography>
            </MenuItem>
          )}
          {pendingInvites > 5 && (
            <MenuItem onClick={() => navigate('/invites')}>
              <Typography variant="body2" color="primary.main">
                View all notifications
              </Typography>
            </MenuItem>
          )}
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Header;
