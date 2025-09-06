import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { 
  FiVideo, 
  FiCalendar, 
  FiUsers, 
  FiPlus, 
  FiClock, 
  FiCopy,
  FiExternalLink,
  FiTrash2,
  FiEdit
} from 'react-icons/fi';
import axios from 'axios';
import { toast } from 'react-toastify';
import { format } from 'date-fns';

const DashboardContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%);
  padding: 2rem;
  padding-top: 90px;

  @media (max-width: 768px) {
    padding: 1rem;
    padding-top: 90px;
  }
`;

const Header = styled.div`
  max-width: 1200px;
  margin: 0 auto 3rem;
`;

const WelcomeText = styled.h1`
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
  color: white;

  @media (max-width: 768px) {
    font-size: 2rem;
  }
`;

const Subtitle = styled.p`
  color: #ccc;
  font-size: 1.1rem;
`;

const QuickActions = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
  max-width: 1200px;
  margin-left: auto;
  margin-right: auto;
`;

const ActionCard = styled(motion.div)`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 2rem;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    border-color: #667eea;
    transform: translateY(-5px);
    box-shadow: 0 10px 30px rgba(102, 126, 234, 0.1);
  }
`;

const ActionIcon = styled.div`
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  font-size: 1.5rem;
  color: white;
`;

const ActionTitle = styled.h3`
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.5rem;
  color: white;
`;

const ActionDescription = styled.p`
  color: #ccc;
  font-size: 0.9rem;
`;

const Section = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: white;
`;

const MeetingsGrid = styled.div`
  display: grid;
  gap: 1rem;
`;

const MeetingCard = styled(motion.div)`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 12px;
  padding: 1.5rem;
  transition: all 0.2s ease;

  &:hover {
    border-color: #555;
  }
`;

const MeetingHeader = styled.div`
  display: flex;
  justify-content: between;
  align-items: flex-start;
  margin-bottom: 1rem;
`;

const MeetingTitle = styled.h3`
  font-size: 1.1rem;
  font-weight: 600;
  color: white;
  margin-bottom: 0.5rem;
`;

const MeetingMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  color: #ccc;
  font-size: 0.9rem;
  margin-bottom: 1rem;
`;

const MeetingActions = styled.div`
  display: flex;
  gap: 0.5rem;
`;

const ActionButton = styled.button`
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  font-size: 0.8rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &.primary {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;

    &:hover {
      transform: translateY(-1px);
    }
  }

  &.secondary {
    background: #333;
    color: #ccc;
    border: 1px solid #555;

    &:hover {
      background: #444;
    }
  }

  &.danger {
    background: #e74c3c;
    color: white;

    &:hover {
      background: #c0392b;
    }
  }
`;

const EmptyState = styled.div`
  text-align: center;
  padding: 3rem;
  color: #666;
`;

const Modal = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
`;

const ModalContent = styled(motion.div)`
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 2rem;
  width: 100%;
  max-width: 500px;
`;

const ModalTitle = styled.h3`
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  color: white;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const Input = styled.input`
  padding: 1rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #0a0a0a;
  color: white;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &::placeholder {
    color: #666;
  }
`;

const TextArea = styled.textarea`
  padding: 1rem;
  border: 1px solid #333;
  border-radius: 8px;
  background: #0a0a0a;
  color: white;
  font-size: 1rem;
  resize: vertical;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #667eea;
  }

  &::placeholder {
    color: #666;
  }
`;

const Button = styled.button`
  padding: 1rem;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    start_time: '',
    end_time: '',
    password: ''
  });

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    try {
      const response = await axios.get('/api/meetings');
      setMeetings(response.data);
    } catch (error) {
      console.error('Failed to fetch meetings:', error);
      toast.error('Failed to load meetings');
    } finally {
      setLoading(false);
    }
  };

  const createInstantMeeting = async () => {
    try {
      const response = await axios.post('/api/meetings/create', {
        title: 'Instant Meeting',
        start_time: new Date().toISOString(),
        end_time: new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour from now
      });

      const meeting = response.data.meeting;
      toast.success('Meeting created successfully!');
      navigate(`/meeting/${meeting.meeting_code}`);
    } catch (error) {
      console.error('Failed to create meeting:', error);
      toast.error('Failed to create meeting');
    }
  };

  const createScheduledMeeting = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('/api/meetings/create', formData);
      toast.success('Meeting scheduled successfully!');
      setShowScheduleModal(false);
      setFormData({ title: '', start_time: '', end_time: '', password: '' });
      fetchMeetings();
    } catch (error) {
      console.error('Failed to schedule meeting:', error);
      toast.error('Failed to schedule meeting');
    }
  };

  const joinMeeting = (meetingCode) => {
    navigate(`/meeting/${meetingCode}`);
  };

  const copyMeetingLink = (meetingCode) => {
    const link = `${window.location.origin}/meeting/${meetingCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Meeting link copied to clipboard!');
  };

  const endMeeting = async (meetingId) => {
    if (window.confirm('Are you sure you want to end this meeting?')) {
      try {
        await axios.post(`/api/meetings/${meetingId}/end`);
        toast.success('Meeting ended successfully');
        fetchMeetings();
      } catch (error) {
        console.error('Failed to end meeting:', error);
        toast.error('Failed to end meeting');
      }
    }
  };

  if (loading) {
    return (
      <DashboardContainer>
        <div style={{ textAlign: 'center', padding: '4rem' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
          <p style={{ color: '#ccc' }}>Loading your meetings...</p>
        </div>
      </DashboardContainer>
    );
  }

  return (
    <DashboardContainer>
      <Header>
        <WelcomeText>Welcome back, {user?.name}!</WelcomeText>
        <Subtitle>Manage your meetings and connect with your team</Subtitle>
      </Header>

      <QuickActions>
        <ActionCard
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={createInstantMeeting}
        >
          <ActionIcon>
            <FiVideo />
          </ActionIcon>
          <ActionTitle>Start Instant Meeting</ActionTitle>
          <ActionDescription>Create and join a meeting right now</ActionDescription>
        </ActionCard>

        <ActionCard
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowScheduleModal(true)}
        >
          <ActionIcon>
            <FiCalendar />
          </ActionIcon>
          <ActionTitle>Schedule Meeting</ActionTitle>
          <ActionDescription>Plan a meeting for later</ActionDescription>
        </ActionCard>

        <ActionCard
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate('/profile')}
        >
          <ActionIcon>
            <FiUsers />
          </ActionIcon>
          <ActionTitle>Profile Settings</ActionTitle>
          <ActionDescription>Manage your account and preferences</ActionDescription>
        </ActionCard>
      </QuickActions>

      <Section>
        <SectionTitle>Your Meetings</SectionTitle>
        {meetings.hosted_meetings?.length > 0 || meetings.participated_meetings?.length > 0 ? (
          <MeetingsGrid>
            {meetings.hosted_meetings?.map((meeting) => (
              <MeetingCard key={meeting.id}>
                <MeetingHeader>
                  <div>
                    <MeetingTitle>{meeting.title}</MeetingTitle>
                    <MeetingMeta>
                      <span><FiClock /> {format(new Date(meeting.start_time), 'MMM dd, yyyy HH:mm')}</span>
                      <span><FiUsers /> {meeting.participants_count} participants</span>
                    </MeetingMeta>
                  </div>
                </MeetingHeader>
                <MeetingActions>
                  <ActionButton
                    className="primary"
                    onClick={() => joinMeeting(meeting.meeting_code)}
                  >
                    <FiVideo />
                    Join
                  </ActionButton>
                  <ActionButton
                    className="secondary"
                    onClick={() => copyMeetingLink(meeting.meeting_code)}
                  >
                    <FiCopy />
                    Copy Link
                  </ActionButton>
                  {meeting.status === 'scheduled' && (
                    <ActionButton
                      className="danger"
                      onClick={() => endMeeting(meeting.id)}
                    >
                      <FiTrash2 />
                      End
                    </ActionButton>
                  )}
                </MeetingActions>
              </MeetingCard>
            ))}
          </MeetingsGrid>
        ) : (
          <EmptyState>
            <FiCalendar size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <p>No meetings yet. Create your first meeting to get started!</p>
          </EmptyState>
        )}
      </Section>

      {/* Schedule Meeting Modal */}
      {showScheduleModal && (
        <Modal onClick={() => setShowScheduleModal(false)}>
          <ModalContent
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <ModalTitle>Schedule New Meeting</ModalTitle>
            <Form onSubmit={createScheduledMeeting}>
              <Input
                type="text"
                placeholder="Meeting title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
              />
              <Input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                required
              />
              <Input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                required
              />
              <Input
                type="password"
                placeholder="Meeting password (optional)"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <Button type="submit">Schedule Meeting</Button>
            </Form>
          </ModalContent>
        </Modal>
      )}
    </DashboardContainer>
  );
};

export default Dashboard;
