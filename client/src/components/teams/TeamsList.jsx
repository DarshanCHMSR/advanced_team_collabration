import React from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Box,
  Chip,
  Badge
} from '@mui/material';
import {
  Groups,
  Public,
  Lock,
  FiberManualRecord
} from '@mui/icons-material';

const TeamsList = ({ teams, onTeamSelect, selectedTeam, compact = false }) => {
  // Ensure teams is always an array
  const safeTeams = Array.isArray(teams) ? teams : [];
  
  if (!safeTeams || safeTeams.length === 0) {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          py: 4,
          textAlign: 'center'
        }}
      >
        <Groups sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
        <Typography variant="h6" color="text.secondary" gutterBottom>
          No teams yet
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Create your first team to start collaborating
        </Typography>
      </Box>
    );
  }

  return (
    <List disablePadding>
      {safeTeams.map((team) => {
        const isSelected = selectedTeam && selectedTeam.id === team.id;
        const memberCount = team._count?.members || 0;
        const projectCount = team._count?.projects || 0;
        const onlineMembers = team.members?.filter(member => member.user.isOnline).length || 0;

        return (
          <ListItem
            key={team.id}
            disablePadding
            sx={{
              borderRadius: compact ? 1 : 0,
              mb: compact ? 1 : 0
            }}
          >
            <ListItemButton
              onClick={() => onTeamSelect(team)}
              selected={isSelected}
              sx={{
                borderRadius: compact ? 1 : 0,
                '&.Mui-selected': {
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  },
                  '& .MuiListItemText-secondary': {
                    color: 'primary.contrastText',
                    opacity: 0.8
                  }
                }
              }}
            >
              <ListItemAvatar>
                <Avatar
                  src={team.avatar}
                  sx={{
                    bgcolor: isSelected ? 'primary.contrastText' : 'primary.main',
                    color: isSelected ? 'primary.main' : 'primary.contrastText'
                  }}
                >
                  {team.avatar ? null : team.name.charAt(0).toUpperCase()}
                </Avatar>
              </ListItemAvatar>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography
                      variant="subtitle1"
                      fontWeight="bold"
                      sx={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1
                      }}
                    >
                      {team.name}
                    </Typography>
                    {team.isPublic ? (
                      <Public sx={{ fontSize: 16, opacity: 0.7 }} />
                    ) : (
                      <Lock sx={{ fontSize: 16, opacity: 0.7 }} />
                    )}
                  </Box>
                }
                secondary={
                  compact ? (
                    <Typography variant="caption">
                      {memberCount} members • {projectCount} projects
                    </Typography>
                  ) : (
                    <Box>
                      <Typography variant="body2" sx={{ mb: 0.5 }}>
                        {team.description || 'No description'}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="caption">
                          {memberCount} members
                        </Typography>
                        <Typography variant="caption">
                          {projectCount} projects
                        </Typography>
                        {onlineMembers > 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FiberManualRecord
                              sx={{
                                fontSize: 8,
                                color: 'success.main'
                              }}
                            />
                            <Typography variant="caption">
                              {onlineMembers} online
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Box>
                  )
                }
              />

              {!compact && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                  <Chip
                    label={team.isPublic ? 'Public' : 'Private'}
                    size="small"
                    variant="outlined"
                    sx={{
                      fontSize: '0.75rem',
                      height: 20,
                      borderColor: isSelected ? 'primary.contrastText' : 'divider',
                      color: isSelected ? 'primary.contrastText' : 'text.secondary'
                    }}
                  />
                  {onlineMembers > 0 && (
                    <Badge
                      badgeContent={onlineMembers}
                      color="success"
                      sx={{ '& .MuiBadge-badge': { fontSize: '0.6rem', minWidth: 16, height: 16 } }}
                    >
                      <Groups sx={{ fontSize: 16, opacity: 0.7 }} />
                    </Badge>
                  )}
                </Box>
              )}
            </ListItemButton>
          </ListItem>
        );
      })}
    </List>
  );
};

export default TeamsList;
