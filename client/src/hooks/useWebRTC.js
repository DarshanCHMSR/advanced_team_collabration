import { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';

const useWebRTC = (meetingUrl, token) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [socket, setSocket] = useState(null);
  
  const localVideoRef = useRef(null);
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);

  // STUN/TURN servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' }
    ]
  };

  // Initialize socket connection
  useEffect(() => {
    if (!token || !meetingUrl) return;

    const newSocket = io(process.env.REACT_APP_SERVER_URL || 'http://localhost:5000', {
      auth: { token }
    });

    setSocket(newSocket);

    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, [token, meetingUrl]);

  // Initialize local media stream
  const initializeLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      
      setLocalStream(stream);
      localStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, []);

  // Create peer connection
  const createPeerConnection = useCallback((socketId) => {
    const peerConnection = new RTCPeerConnection(iceServers);
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        peerConnection.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream
    peerConnection.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setRemoteStreams(prev => new Map(prev.set(socketId, remoteStream)));
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', {
          candidate: event.candidate,
          targetSocketId: socketId
        });
      }
    };

    peerConnections.current.set(socketId, peerConnection);
    return peerConnection;
  }, [socket]);

  // Create offer
  const createOffer = useCallback(async (socketId) => {
    const peerConnection = createPeerConnection(socketId);
    
    try {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      if (socket) {
        socket.emit('offer', {
          offer,
          targetSocketId: socketId
        });
      }
    } catch (error) {
      console.error('Error creating offer:', error);
    }
  }, [createPeerConnection, socket]);

  // Create answer
  const createAnswer = useCallback(async (offer, fromSocketId) => {
    const peerConnection = createPeerConnection(fromSocketId);
    
    try {
      await peerConnection.setRemoteDescription(offer);
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      if (socket) {
        socket.emit('answer', {
          answer,
          targetSocketId: fromSocketId
        });
      }
    } catch (error) {
      console.error('Error creating answer:', error);
    }
  }, [createPeerConnection, socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    socket.on('user-joined', ({ userId, socketId }) => {
      console.log('User joined:', userId, socketId);
      setParticipants(prev => [...prev.filter(p => p.socketId !== socketId), { userId, socketId }]);
      createOffer(socketId);
    });

    socket.on('user-left', ({ userId, socketId }) => {
      console.log('User left:', userId, socketId);
      setParticipants(prev => prev.filter(p => p.socketId !== socketId));
      setRemoteStreams(prev => {
        const newStreams = new Map(prev);
        newStreams.delete(socketId);
        return newStreams;
      });
      
      const peerConnection = peerConnections.current.get(socketId);
      if (peerConnection) {
        peerConnection.close();
        peerConnections.current.delete(socketId);
      }
    });

    socket.on('offer', ({ offer, fromSocketId }) => {
      createAnswer(offer, fromSocketId);
    });

    socket.on('answer', async ({ answer, fromSocketId }) => {
      const peerConnection = peerConnections.current.get(fromSocketId);
      if (peerConnection) {
        try {
          await peerConnection.setRemoteDescription(answer);
        } catch (error) {
          console.error('Error setting remote description:', error);
        }
      }
    });

    socket.on('ice-candidate', async ({ candidate, fromSocketId }) => {
      const peerConnection = peerConnections.current.get(fromSocketId);
      if (peerConnection) {
        try {
          await peerConnection.addIceCandidate(candidate);
        } catch (error) {
          console.error('Error adding ICE candidate:', error);
        }
      }
    });

    socket.on('user-audio-toggle', ({ userId, isMuted: userMuted }) => {
      // Handle remote user audio toggle
      console.log(`User ${userId} ${userMuted ? 'muted' : 'unmuted'}`);
    });

    socket.on('user-video-toggle', ({ userId, isVideoOn: userVideoOn }) => {
      // Handle remote user video toggle
      console.log(`User ${userId} ${userVideoOn ? 'turned on' : 'turned off'} video`);
    });

    return () => {
      socket.off('user-joined');
      socket.off('user-left');
      socket.off('offer');
      socket.off('answer');
      socket.off('ice-candidate');
      socket.off('user-audio-toggle');
      socket.off('user-video-toggle');
    };
  }, [socket, createOffer, createAnswer]);

  // Join meeting
  const joinMeeting = useCallback(async () => {
    try {
      await initializeLocalStream();
      if (socket) {
        socket.emit('join-meeting', { meetingUrl });
      }
    } catch (error) {
      console.error('Error joining meeting:', error);
      throw error;
    }
  }, [initializeLocalStream, socket, meetingUrl]);

  // Leave meeting
  const leaveMeeting = useCallback(() => {
    if (socket) {
      socket.emit('leave-meeting');
    }

    // Close all peer connections
    peerConnections.current.forEach(pc => pc.close());
    peerConnections.current.clear();

    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Stop screen share if active
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    setLocalStream(null);
    setRemoteStreams(new Map());
    setParticipants([]);
  }, [socket]);

  // Toggle audio
  const toggleAudio = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        
        if (socket) {
          socket.emit('toggle-audio', { isMuted: !audioTrack.enabled });
        }
      }
    }
  }, [socket]);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
        
        if (socket) {
          socket.emit('toggle-video', { isVideoOn: videoTrack.enabled });
        }
      }
    }
  }, [socket]);

  // Toggle screen share
  const toggleScreenShare = useCallback(async () => {
    try {
      if (!isScreenSharing) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        
        screenStreamRef.current = screenStream;
        
        // Replace video track in all peer connections
        const videoTrack = screenStream.getVideoTracks()[0];
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender) {
            sender.replaceTrack(videoTrack);
          }
        });

        // Update local video
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        setIsScreenSharing(true);

        // Handle screen share end
        videoTrack.onended = () => {
          stopScreenShare();
        };
      } else {
        stopScreenShare();
      }

      if (socket) {
        socket.emit('toggle-screen-share', { isScreenSharing: !isScreenSharing });
      }
    } catch (error) {
      console.error('Error toggling screen share:', error);
    }
  }, [isScreenSharing, socket]);

  // Stop screen share
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Replace screen share track with camera track
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      peerConnections.current.forEach(pc => {
        const sender = pc.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Update local video
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
    }

    setIsScreenSharing(false);
  }, []);

  return {
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
  };
};

export default useWebRTC;
