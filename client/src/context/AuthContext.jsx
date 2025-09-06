import React, { createContext, useContext, useReducer, useEffect, useCallback, useRef, useMemo } from 'react';
import { io } from 'socket.io-client';

// Initial state
const initialState = {
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: false,
  loading: true,
  socket: null,
  teams: [],
  activeTeam: null,
  messages: {},
  onlineUsers: [],
  invites: []
};

// Actions
const ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_USER: 'SET_USER',
  CONNECT_SOCKET: 'CONNECT_SOCKET',
  DISCONNECT_SOCKET: 'DISCONNECT_SOCKET',
  SET_TEAMS: 'SET_TEAMS',
  ADD_TEAM: 'ADD_TEAM',
  UPDATE_TEAM: 'UPDATE_TEAM',
  SET_ACTIVE_TEAM: 'SET_ACTIVE_TEAM',
  ADD_MESSAGE: 'ADD_MESSAGE',
  SET_MESSAGES: 'SET_MESSAGES',
  SET_ONLINE_USERS: 'SET_ONLINE_USERS',
  UPDATE_USER_STATUS: 'UPDATE_USER_STATUS',
  SET_INVITES: 'SET_INVITES',
  ADD_INVITE: 'ADD_INVITE',
  UPDATE_INVITE: 'UPDATE_INVITE'
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    
    case ACTIONS.LOGIN_SUCCESS:
      localStorage.setItem('token', action.payload.token);
      return {
        ...state,
        token: action.payload.token,
        user: action.payload.user,
        isAuthenticated: true,
        loading: false
      };
    
    case ACTIONS.LOGOUT:
      localStorage.removeItem('token');
      return {
        ...initialState,
        loading: false,
        token: null,
        user: null,
        isAuthenticated: false
      };
    
    case ACTIONS.SET_USER:
      return {
        ...state,
        user: action.payload,
        isAuthenticated: !!action.payload,
        loading: false
      };
    
    case ACTIONS.CONNECT_SOCKET:
      return { ...state, socket: action.payload };
    
    case ACTIONS.DISCONNECT_SOCKET:
      return { ...state, socket: null };
    
    case ACTIONS.SET_TEAMS:
      return { ...state, teams: action.payload };
    
    case ACTIONS.ADD_TEAM:
      return { ...state, teams: [...state.teams, action.payload] };
    
    case ACTIONS.UPDATE_TEAM:
      return {
        ...state,
        teams: state.teams.map(team =>
          team.id === action.payload.id ? action.payload : team
        )
      };
    
    case ACTIONS.SET_ACTIVE_TEAM:
      return { ...state, activeTeam: action.payload };
    
    case ACTIONS.ADD_MESSAGE:
      const { teamId, message } = action.payload;
      return {
        ...state,
        messages: {
          ...state.messages,
          [teamId]: [...(state.messages[teamId] || []), message]
        }
      };
    
    case ACTIONS.SET_MESSAGES:
      return {
        ...state,
        messages: {
          ...state.messages,
          [action.payload.teamId]: action.payload.messages
        }
      };
    
    case ACTIONS.SET_ONLINE_USERS:
      return { ...state, onlineUsers: action.payload };
    
    case ACTIONS.UPDATE_USER_STATUS:
      return {
        ...state,
        onlineUsers: state.onlineUsers.map(user =>
          user.id === action.payload.userId
            ? { ...user, isOnline: action.payload.isOnline }
            : user
        )
      };
    
    case ACTIONS.SET_INVITES:
      return { ...state, invites: action.payload };
    
    case ACTIONS.ADD_INVITE:
      return { ...state, invites: [action.payload, ...state.invites] };
    
    case ACTIONS.UPDATE_INVITE:
      return {
        ...state,
        invites: state.invites.map(invite =>
          invite.id === action.payload.id ? action.payload : invite
        )
      };
    
    default:
      return state;
  }
};

// Context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);
  const socketRef = useRef(null);
  const connectionAttemptedRef = useRef(false);

  // Connect to Socket.io
  const connectSocket = useCallback((token) => {
    if (socketRef.current) return;

    const newSocket = io('http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      socketRef.current = newSocket;
      dispatch({ type: ACTIONS.CONNECT_SOCKET, payload: newSocket });
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      socketRef.current = null;
      dispatch({ type: ACTIONS.DISCONNECT_SOCKET });
    });

    newSocket.on('new_message', (message) => {
      dispatch({
        type: ACTIONS.ADD_MESSAGE,
        payload: { teamId: message.teamId, message }
      });
    });

    newSocket.on('user_status_change', (data) => {
      dispatch({
        type: ACTIONS.UPDATE_USER_STATUS,
        payload: data
      });
    });

    newSocket.on('new_invite', (invite) => {
      dispatch({ type: ACTIONS.ADD_INVITE, payload: invite });
    });

    newSocket.on('invite_response', (invite) => {
      dispatch({ type: ACTIONS.UPDATE_INVITE, payload: invite });
    });

    newSocket.on('invite_cancelled', (data) => {
      dispatch({
        type: ACTIONS.UPDATE_INVITE,
        payload: { ...data.invite, status: 'cancelled' }
      });
    });

    return newSocket;
  }, []); // Remove state dependencies

  // Disconnect socket
  const disconnectSocket = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      dispatch({ type: ACTIONS.DISCONNECT_SOCKET });
    }
  }, []);

  // Login
  const login = useCallback((token, user) => {
    dispatch({ type: ACTIONS.LOGIN_SUCCESS, payload: { token, user } });
    connectSocket(token);
  }, [connectSocket]);

  // Logout
  const logout = useCallback(() => {
    disconnectSocket();
    connectionAttemptedRef.current = false;
    dispatch({ type: ACTIONS.LOGOUT });
  }, [disconnectSocket]);

  // Set user
  const setUser = useCallback((user) => {
    dispatch({ type: ACTIONS.SET_USER, payload: user });
  }, []);

  // Set loading
  const setLoading = useCallback((loading) => {
    dispatch({ type: ACTIONS.SET_LOADING, payload: loading });
  }, []);

  // Teams management
  const setTeams = useCallback((teams) => {
    dispatch({ type: ACTIONS.SET_TEAMS, payload: teams });
  }, []);

  const addTeam = useCallback((team) => {
    dispatch({ type: ACTIONS.ADD_TEAM, payload: team });
  }, []);

  const updateTeam = useCallback((team) => {
    dispatch({ type: ACTIONS.UPDATE_TEAM, payload: team });
  }, []);

  const setActiveTeam = useCallback((team) => {
    dispatch({ type: ACTIONS.SET_ACTIVE_TEAM, payload: team });
    if (socketRef.current && team) {
      socketRef.current.emit('join_team', team.id);
    }
  }, []);

  // Messages management
  const setMessages = useCallback((teamId, messages) => {
    dispatch({ type: ACTIONS.SET_MESSAGES, payload: { teamId, messages } });
  }, []);

  const sendMessage = useCallback((teamId, content, type = 'TEXT') => {
    if (socketRef.current) {
      socketRef.current.emit('send_message', { teamId, message: content, type });
    }
  }, []);

  // Invites management
  const setInvites = useCallback((invites) => {
    dispatch({ type: ACTIONS.SET_INVITES, payload: invites });
  }, []);

  // Auto-connect socket on token change
  useEffect(() => {
    if (state.token && state.user && !socketRef.current && !connectionAttemptedRef.current) {
      console.log('Connecting socket for user:', state.user.username);
      connectionAttemptedRef.current = true;
      connectSocket(state.token);
    } else if (!state.token || !state.user) {
      // Reset connection attempt flag when user logs out
      connectionAttemptedRef.current = false;
    }
  }, [state.token, state.user]);

  // Get current socket
  const getSocket = useCallback(() => socketRef.current, []);

  const value = {
    // Exclude socket from state to prevent re-renders when socket connects
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    teams: state.teams,
    activeTeam: state.activeTeam,
    messages: state.messages,
    onlineUsers: state.onlineUsers,
    invites: state.invites,
    getSocket, // Provide function to get current socket
    login,
    logout,
    setUser,
    setLoading,
    connectSocket,
    disconnectSocket,
    setTeams,
    addTeam,
    updateTeam,
    setActiveTeam,
    setMessages,
    sendMessage,
    setInvites
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
