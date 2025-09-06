import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  TextField,
  IconButton,
  Typography,
  Avatar,
  Fade,
  Collapse,
  Chip,
  Tooltip,
  CircularProgress
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as BotIcon,
  Person as UserIcon,
  ExpandMore as ExpandIcon,
  ExpandLess as CollapseIcon,
  Help as HelpIcon
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([
    {
      type: 'bot',
      content: '👋 Hi! I\'m your SynergySphere AI Assistant. I can help you manage teams, tasks, invitations, and more. Just ask me what you\'d like to do!',
      timestamp: new Date().toISOString()
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef(null);
  const { token } = useAuth();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [chatHistory]);

  const sendMessage = async () => {
    if (!message.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };

    setChatHistory(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/agents/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message })
      });

      const data = await response.json();

      const botMessage = {
        type: 'bot',
        content: data.message || 'Sorry, I couldn\'t process that request.',
        timestamp: data.timestamp || new Date().toISOString(),
        agentType: data.agentType,
        success: data.success
      };

      setChatHistory(prev => [...prev, botMessage]);
    } catch (error) {
      console.error('Error sending message to AI:', error);
      const errorMessage = {
        type: 'bot',
        content: 'Sorry, I\'m having trouble connecting right now. Please try again.',
        timestamp: new Date().toISOString(),
        success: false
      };
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const getAgentColor = (agentType) => {
    const colors = {
      teamCreation: '#4CAF50',
      teamManagement: '#FF9800',
      invitation: '#2196F3',
      taskProject: '#9C27B0',
      communication: '#FF5722',
      help: '#607D8B',
      error: '#F44336'
    };
    return colors[agentType] || '#757575';
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1000 }}>
      {/* Chat Toggle Button */}
      <Tooltip title="AI Assistant">
        <IconButton
          onClick={() => setIsOpen(!isOpen)}
          sx={{
            width: 56,
            height: 56,
            bgcolor: 'primary.main',
            color: 'white',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            boxShadow: 3,
            mb: isOpen ? 1 : 0
          }}
        >
          <BotIcon />
        </IconButton>
      </Tooltip>

      {/* Chat Window */}
      <Collapse in={isOpen}>
        <Paper
          elevation={8}
          sx={{
            width: 380,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            bgcolor: 'background.paper',
            borderRadius: 2,
            overflow: 'hidden'
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'primary.main',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <BotIcon />
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                AI Assistant
              </Typography>
            </Box>
            <IconButton
              size="small"
              onClick={() => setIsOpen(false)}
              sx={{ color: 'white' }}
            >
              <CollapseIcon />
            </IconButton>
          </Box>

          {/* Chat Messages */}
          <Box
            sx={{
              flex: 1,
              overflow: 'auto',
              p: 1,
              bgcolor: '#f5f5f5'
            }}
          >
            {chatHistory.map((msg, index) => (
              <Fade in key={index} timeout={300}>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 1,
                    mb: 2,
                    flexDirection: msg.type === 'user' ? 'row-reverse' : 'row'
                  }}
                >
                  <Avatar
                    sx={{
                      width: 32,
                      height: 32,
                      bgcolor: msg.type === 'user' ? 'primary.main' : 'grey.600'
                    }}
                  >
                    {msg.type === 'user' ? <UserIcon /> : <BotIcon />}
                  </Avatar>
                  
                  <Box
                    sx={{
                      maxWidth: '70%',
                      bgcolor: msg.type === 'user' ? 'primary.main' : 'white',
                      color: msg.type === 'user' ? 'white' : 'text.primary',
                      p: 1.5,
                      borderRadius: 2,
                      boxShadow: 1
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        whiteSpace: 'pre-line',
                        wordBreak: 'break-word'
                      }}
                    >
                      {msg.content}
                    </Typography>
                    
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1,
                        mt: 0.5
                      }}
                    >
                      <Typography
                        variant="caption"
                        sx={{
                          opacity: 0.7,
                          fontSize: '0.7rem'
                        }}
                      >
                        {formatTimestamp(msg.timestamp)}
                      </Typography>
                      
                      {msg.agentType && (
                        <Chip
                          label={msg.agentType}
                          size="small"
                          sx={{
                            height: 16,
                            fontSize: '0.6rem',
                            bgcolor: getAgentColor(msg.agentType),
                            color: 'white'
                          }}
                        />
                      )}
                    </Box>
                  </Box>
                </Box>
              </Fade>
            ))}
            
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: 'grey.600' }}>
                  <BotIcon />
                </Avatar>
                <Box
                  sx={{
                    bgcolor: 'white',
                    p: 1.5,
                    borderRadius: 2,
                    boxShadow: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  <CircularProgress size={16} />
                  <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                    Thinking...
                  </Typography>
                </Box>
              </Box>
            )}
            
            <div ref={chatEndRef} />
          </Box>

          {/* Input Area */}
          <Box
            sx={{
              p: 2,
              bgcolor: 'background.paper',
              borderTop: 1,
              borderColor: 'divider'
            }}
          >
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                size="small"
                placeholder="Ask me anything about teams, tasks, or collaboration..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={3}
                disabled={isLoading}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3
                  }
                }}
              />
              <IconButton
                onClick={sendMessage}
                disabled={!message.trim() || isLoading}
                sx={{
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark'
                  },
                  '&.Mui-disabled': {
                    bgcolor: 'grey.300'
                  }
                }}
              >
                <SendIcon />
              </IconButton>
            </Box>
            
            <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {['Create team', 'Show my tasks', 'Team stats', 'Help'].map((suggestion) => (
                <Chip
                  key={suggestion}
                  label={suggestion}
                  size="small"
                  variant="outlined"
                  clickable
                  onClick={() => setMessage(suggestion)}
                  sx={{
                    fontSize: '0.7rem',
                    height: 24
                  }}
                />
              ))}
            </Box>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AIAssistant;
