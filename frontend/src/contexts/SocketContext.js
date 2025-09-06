import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const { user, token } = useAuth();

  useEffect(() => {
    if (user && token) {
      const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
        auth: {
          token: token
        },
        transports: ['websocket', 'polling']
      });

      newSocket.on('connect', () => {
        console.log('Connected to server');
        setConnected(true);
      });

      newSocket.on('disconnect', () => {
        console.log('Disconnected from server');
        setConnected(false);
      });

      newSocket.on('error', (error) => {
        console.error('Socket error:', error);
        toast.error('Connection error: ' + error.message);
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    } else {
      if (socket) {
        socket.close();
        setSocket(null);
        setConnected(false);
      }
    }
  }, [user, token]);

  const joinMeeting = (meetingId, meetingCode) => {
    if (socket && connected) {
      socket.emit('join-meeting', { meetingId, meetingCode });
    }
  };

  const leaveMeeting = () => {
    if (socket) {
      socket.emit('leave-meeting');
    }
  };

  const sendMessage = (message) => {
    if (socket && connected) {
      socket.emit('send-message', { message });
    }
  };

  const getChatHistory = () => {
    if (socket && connected) {
      socket.emit('get-chat-history');
    }
  };

  const toggleMute = (isMuted) => {
    if (socket && connected) {
      socket.emit('toggle-mute', { isMuted });
    }
  };

  const toggleVideo = (isVideoOn) => {
    if (socket && connected) {
      socket.emit('toggle-video', { isVideoOn });
    }
  };

  const raiseHand = () => {
    if (socket && connected) {
      socket.emit('raise-hand');
    }
  };

  const lowerHand = () => {
    if (socket && connected) {
      socket.emit('lower-hand');
    }
  };

  const startScreenShare = () => {
    if (socket && connected) {
      socket.emit('start-screen-share');
    }
  };

  const stopScreenShare = () => {
    if (socket && connected) {
      socket.emit('stop-screen-share');
    }
  };

  const muteParticipant = (userId, name) => {
    if (socket && connected) {
      socket.emit('mute-participant', { userId, name });
    }
  };

  const removeParticipant = (userId, name) => {
    if (socket && connected) {
      socket.emit('remove-participant', { userId, name });
    }
  };

  // WebRTC signaling
  const sendOffer = (offer, to) => {
    if (socket && connected) {
      socket.emit('offer', { offer, to });
    }
  };

  const sendAnswer = (answer, to) => {
    if (socket && connected) {
      socket.emit('answer', { answer, to });
    }
  };

  const sendIceCandidate = (candidate, to) => {
    if (socket && connected) {
      socket.emit('ice-candidate', { candidate, to });
    }
  };

  const value = {
    socket,
    connected,
    joinMeeting,
    leaveMeeting,
    sendMessage,
    getChatHistory,
    toggleMute,
    toggleVideo,
    raiseHand,
    lowerHand,
    startScreenShare,
    stopScreenShare,
    muteParticipant,
    removeParticipant,
    sendOffer,
    sendAnswer,
    sendIceCandidate
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
