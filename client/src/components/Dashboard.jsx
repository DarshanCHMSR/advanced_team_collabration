
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Container,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  IconButton,
  Badge,
  Divider,
  Paper,
  Fab
} from '@mui/material';
import {
  Groups,
  Assignment,
  Add,
  Chat,
  Person,
  Notifications,
  TrendingUp,
  Schedule,
  VideoCall
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { teamsAPI, invitesAPI } from '../services/api';

// Import team-related components
import TeamsList from './teams/TeamsList';
import TeamChat from './teams/TeamChat';
import CreateTeamDialog from './teams/CreateTeamDialog';
import InvitesList from './invites/InvitesList';
import MeetingsList from './meetings/MeetingsList';
import AIAssistant from './AIAssistant';

const Dashboard = () => {
  const { teamId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, teams = [], setTeams, activeTeam, setActiveTeam, invites = [], setInvites } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [createTeamOpen, setCreateTeamOpen] = useState(false);

  // Determine current view based on URL
  const getCurrentView = () => {
    if (location.pathname.includes('/meetings')) return 'meetings';
    if (location.pathname.includes('/invites')) return 'invites';
    if (teamId) return 'chat';
    return 'overview';
  };

  const currentView = getCurrentView();

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (teamId && Array.isArray(teams) && teams.length > 0) {
      const team = teams.find(t => t.id === parseInt(teamId));
      if (team) {
        setActiveTeam(team);
      }
    } else if (!teamId && activeTeam) {
      setActiveTeam(null);
    }
  }, [teamId, teams]);

  const fetchData = async () => {
    try {
      const [teamsResponse, invitesResponse] = await Promise.all([
        teamsAPI.getTeams(),
        invitesAPI.getInvites()
      ]);
      
      console.log('Teams API Response:', teamsResponse);
      console.log('Teams Data:', teamsResponse.data);
      console.log('Is teams data an array?', Array.isArray(teamsResponse.data));
      
      setTeams(teamsResponse.data);
      setInvites(invitesResponse.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTeamSelect = (team) => {
    navigate(`/teams/${team.id}`);
  };

  const handleCreateTeam = async (teamData) => {
    try {
      const response = await teamsAPI.createTeam(teamData);
      setTeams(prev => [...prev, response.data]);
      setCreateTeamOpen(false);
    } catch (error) {
      console.error('Error creating team:', error);
    }
  };

  const renderOverview = () => (
    <Grid container spacing={3}>
      {/* Welcome Card */}
      <Grid item xs={12}>
        <Card
          sx={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            mb: 3
          }}
        >
          <CardContent sx={{ py: 4 }}>
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Welcome back, {user?.name || user?.username}! 👋
            </Typography>
            <Typography variant="h6" sx={{ opacity: 0.9 }}>
              Ready to collaborate and achieve great things together?
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      {/* Stats Cards */}
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'primary.main' }}>
                <Groups />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {Array.isArray(teams) ? teams.length : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Teams
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                <Assignment />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {Array.isArray(teams) ? teams.reduce((total, team) => total + (team._count?.projects || 0), 0) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Projects
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'success.main' }}>
                <Notifications />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {Array.isArray(invites) ? invites.filter(invite => invite.status === 'PENDING').length : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Pending Invites
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Avatar sx={{ bgcolor: 'warning.main' }}>
                <TrendingUp />
              </Avatar>
              <Box>
                <Typography variant="h4" fontWeight="bold">
                  {Array.isArray(teams) ? teams.reduce((total, team) => total + (team._count?.members || 0), 0) : 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Total Members
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      {/* Recent Activity */}
      <Grid item xs={12} md={8}>
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
              <Typography variant="h6" fontWeight="bold">
                Your Teams
              </Typography>
              <Button
                variant="contained"
                startIcon={<Add />}
                onClick={() => setCreateTeamOpen(true)}
                size="small"
              >
                Create Team
              </Button>
            </Box>
            <TeamsList
              teams={teams}
              onTeamSelect={handleTeamSelect}
              compact={true}
            />
          </CardContent>
        </Card>
      </Grid>

      {/* Quick Actions */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" fontWeight="bold" gutterBottom>
              Quick Actions
            </Typography>
            <List>
              <ListItem
                component="button"
                onClick={() => setCreateTeamOpen(true)}
                sx={{ borderRadius: 1, mb: 1, cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Groups />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Start Meeting"
                  secondary="Create a video meeting"
                />
              </ListItem>
              <ListItem
                component="button"
                onClick={() => navigate('/meetings')}
                sx={{ borderRadius: 1, mb: 1, cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'secondary.main' }}>
                    <VideoCall />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="View Meetings"
                  secondary="Manage your meetings"
                />
              </ListItem>
              <ListItem
                component="button"
                onClick={() => setCreateTeamOpen(true)}
                sx={{ borderRadius: 1, mb: 1, cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <Groups />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Create Team"
                  secondary="Start a new collaboration"
                />
              </ListItem>
              <ListItem
                component="button"
                onClick={() => navigate('/invites')}
                sx={{ borderRadius: 1, mb: 1, cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'warning.main' }}>
                    <Person />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="View Invites"
                  secondary="Check pending invitations"
                />
              </ListItem>
              <ListItem
                component="button"
                onClick={() => navigate('/invites')}
                sx={{ borderRadius: 1, mb: 1, cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Badge badgeContent={Array.isArray(invites) ? invites.filter(i => i.status === 'PENDING').length : 0} color="error">
                    <Avatar sx={{ bgcolor: 'secondary.main' }}>
                      <Notifications />
                    </Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary="View Invites"
                  secondary="Check pending invitations"
                />
              </ListItem>
              <ListItem
                component="button"
                onClick={() => navigate('/projects')}
                sx={{ borderRadius: 1, cursor: 'pointer' }}
              >
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: 'success.main' }}>
                    <Assignment />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary="Manage Projects"
                  secondary="View and organize projects"
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderTeamView = () => (
    <Grid container spacing={3} sx={{ height: 'calc(100vh - 140px)' }}>
      <Grid item xs={12} md={4} lg={3}>
        <Paper sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Typography variant="h6" fontWeight="bold">
                Teams
              </Typography>
              <IconButton onClick={() => setCreateTeamOpen(true)} size="small">
                <Add />
              </IconButton>
            </Box>
          </Box>
          <Box sx={{ flex: 1, overflow: 'auto' }}>
            <TeamsList
              teams={teams}
              onTeamSelect={handleTeamSelect}
              selectedTeam={activeTeam}
            />
          </Box>
        </Paper>
      </Grid>
      <Grid item xs={12} md={8} lg={9}>
        {activeTeam ? (
          <TeamChat team={activeTeam} />
        ) : (
          <Paper
            sx={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: 2
            }}
          >
            <Chat sx={{ fontSize: 64, color: 'text.secondary' }} />
            <Typography variant="h6" color="text.secondary">
              Select a team to start chatting
            </Typography>
          </Paper>
        )}
      </Grid>
    </Grid>
  );

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography>Loading...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {(() => {
        switch (currentView) {
          case 'meetings':
            return <MeetingsList teams={teams} />;
          case 'invites':
            return <InvitesList invites={invites} onInviteUpdate={fetchData} />;
          case 'chat':
            return renderTeamView();
          default:
            return renderOverview();
        }
      })()}
      
      {/* Create Team Dialog */}
      <CreateTeamDialog
        open={createTeamOpen}
        onClose={() => setCreateTeamOpen(false)}
        onCreateTeam={handleCreateTeam}
      />

      {/* Floating Action Button for mobile */}
      {!teamId && (
        <Fab
          color="primary"
          aria-label="add"
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            display: { xs: 'flex', md: 'none' }
          }}
          onClick={() => setCreateTeamOpen(true)}
        >
          <Add />
        </Fab>
      )}

      {/* AI Assistant */}
      <AIAssistant />
    </Container>
  );
};

export default Dashboard;
