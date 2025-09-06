import { useState, useEffect, useRef, useCallback } from 'react';
import { useSocket } from '../contexts/SocketContext';

const useWebRTC = (meetingId) => {
  const [localStream, setLocalStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState(new Map());
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState(null);
  
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef(new Map());
  const peerConnections = useRef(new Map());
  const localStreamRef = useRef(null);
  const screenStreamRef = useRef(null);
  
  const { socket, sendOffer, sendAnswer, sendIceCandidate } = useSocket();

  // STUN/TURN servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      // Add your TURN server here if you have one
      // {
      //   urls: 'turn:your-turn-server.com:3478',
      //   username: 'your-username',
      //   credential: 'your-password'
      // }
    ]
  };

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

      // Set up audio level detection for active speaker
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(stream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      const detectActiveSpeaker = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average > 30) { // Threshold for active speaker
          setActiveSpeaker('local');
        } else if (activeSpeaker === 'local') {
          setActiveSpeaker(null);
        }
        
        requestAnimationFrame(detectActiveSpeaker);
      };
      
      detectActiveSpeaker();

      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }, [activeSpeaker]);

  // Create peer connection
  const createPeerConnection = useCallback((userId) => {
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
      setRemoteStreams(prev => new Map(prev.set(userId, remoteStream)));
      
      // Set up audio level detection for remote speakers
      const audioContext = new AudioContext();
      const analyser = audioContext.createAnalyser();
      const microphone = audioContext.createMediaStreamSource(remoteStream);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      
      analyser.fftSize = 256;
      microphone.connect(analyser);

      const detectRemoteActiveSpeaker = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        
        if (average > 30) {
          setActiveSpeaker(userId);
        } else if (activeSpeaker === userId) {
          setActiveSpeaker(null);
        }
        
        requestAnimationFrame(detectRemoteActiveSpeaker);
      };
      
      detectRemoteActiveSpeaker();
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        sendIceCandidate(event.candidate, userId);
      }
    };

    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log(`Connection state with ${userId}:`, peerConnection.connectionState);
    };

    peerConnections.current.set(userId, peerConnection);
    return peerConnection;
  }, [sendIceCandidate, activeSpeaker]);

  // Handle incoming offer
  const handleOffer = useCallback(async (offer, fromUserId) => {
    try {
      let peerConnection = peerConnections.current.get(fromUserId);
      
      if (!peerConnection) {
        peerConnection = createPeerConnection(fromUserId);
      }

      await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peerConnection.createAnswer();
      await peerConnection.setLocalDescription(answer);
      
      sendAnswer(answer, fromUserId);
    } catch (error) {
      console.error('Error handling offer:', error);
    }
  }, [createPeerConnection, sendAnswer]);

  // Handle incoming answer
  const handleAnswer = useCallback(async (answer, fromUserId) => {
    try {
      const peerConnection = peerConnections.current.get(fromUserId);
      if (peerConnection) {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
      }
    } catch (error) {
      console.error('Error handling answer:', error);
    }
  }, []);

  // Handle incoming ICE candidate
  const handleIceCandidate = useCallback(async (candidate, fromUserId) => {
    try {
      const peerConnection = peerConnections.current.get(fromUserId);
      if (peerConnection) {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
    }
  }, []);

  // Send offer to new participant
  const sendOfferToUser = useCallback(async (userId) => {
    try {
      let peerConnection = peerConnections.current.get(userId);
      
      if (!peerConnection) {
        peerConnection = createPeerConnection(userId);
      }

      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);
      
      sendOffer(offer, userId);
    } catch (error) {
      console.error('Error sending offer:', error);
    }
  }, [createPeerConnection, sendOffer]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsVideoOn(videoTrack.enabled);
      }
    }
  }, []);

  // Start screen sharing
  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: true
      });

      screenStreamRef.current = screenStream;
      setIsScreenSharing(true);

      // Replace video track in all peer connections
      const videoTrack = screenStream.getVideoTracks()[0];
      peerConnections.current.forEach((peerConnection) => {
        const sender = peerConnection.getSenders().find(s => 
          s.track && s.track.kind === 'video'
        );
        if (sender) {
          sender.replaceTrack(videoTrack);
        }
      });

      // Handle screen share end
      videoTrack.onended = () => {
        stopScreenShare();
      };

    } catch (error) {
      console.error('Error starting screen share:', error);
    }
  }, []);

  // Stop screen sharing
  const stopScreenShare = useCallback(() => {
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);

      // Restore camera track
      if (localStreamRef.current) {
        const videoTrack = localStreamRef.current.getVideoTracks()[0];
        peerConnections.current.forEach((peerConnection) => {
          const sender = peerConnection.getSenders().find(s => 
            s.track && s.track.kind === 'video'
          );
          if (sender && videoTrack) {
            sender.replaceTrack(videoTrack);
          }
        });
      }
    }
  }, []);

  // Clean up
  const cleanup = useCallback(() => {
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Stop screen share
    if (screenStreamRef.current) {
      screenStreamRef.current.getTracks().forEach(track => track.stop());
    }

    // Close peer connections
    peerConnections.current.forEach(peerConnection => {
      peerConnection.close();
    });
    peerConnections.current.clear();

    // Clear streams
    setLocalStream(null);
    setRemoteStreams(new Map());
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    const handleUserJoined = (data) => {
      sendOfferToUser(data.userId);
    };

    const handleOffer = (data) => {
      handleOffer(data.offer, data.from);
    };

    const handleAnswer = (data) => {
      handleAnswer(data.answer, data.from);
    };

    const handleIceCandidate = (data) => {
      handleIceCandidate(data.candidate, data.from);
    };

    socket.on('user-joined', handleUserJoined);
    socket.on('offer', handleOffer);
    socket.on('answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);

    return () => {
      socket.off('user-joined', handleUserJoined);
      socket.off('offer', handleOffer);
      socket.off('answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
    };
  }, [socket, sendOfferToUser, handleOffer, handleAnswer, handleIceCandidate]);

  // Initialize on mount
  useEffect(() => {
    initializeLocalStream();

    return () => {
      cleanup();
    };
  }, [initializeLocalStream, cleanup]);

  return {
    localStream,
    remoteStreams,
    isMuted,
    isVideoOn,
    isScreenSharing,
    activeSpeaker,
    localVideoRef,
    remoteVideoRefs,
    toggleMute,
    toggleVideo,
    startScreenShare,
    stopScreenShare,
    cleanup
  };
};

export default useWebRTC;
