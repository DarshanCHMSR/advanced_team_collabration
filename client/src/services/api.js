import axios from 'axios';

const API_BASE_URL = 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['x-auth-token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
  updateProfile: (profileData) => api.put('/auth/profile', profileData),
  // Generic methods for authenticated requests
  get: (url) => api.get(url),
  post: (url, data) => api.post(url, data),
  put: (url, data) => api.put(url, data),
  delete: (url) => api.delete(url)
};

// Teams API
export const teamsAPI = {
  getTeams: () => api.get('/teams'),
  getTeam: (id) => api.get(`/teams/${id}`),
  createTeam: (teamData) => api.post('/teams', teamData),
  updateTeam: (id, teamData) => api.put(`/teams/${id}`, teamData),
  deleteTeam: (id) => api.delete(`/teams/${id}`),
  addMember: (teamId, username) => api.post(`/teams/${teamId}/members`, { username }),
  removeMember: (teamId, userId) => api.delete(`/teams/${teamId}/members/${userId}`),
  getMessages: (teamId, page = 1, limit = 50) => 
    api.get(`/teams/${teamId}/messages?page=${page}&limit=${limit}`),
  sendMessage: (teamId, messageData) => api.post(`/teams/${teamId}/messages`, messageData)
};

// Projects API
export const projectsAPI = {
  getProjects: () => api.get('/projects'),
  getProject: (id) => api.get(`/projects/${id}`),
  createProject: (projectData) => api.post('/projects', projectData),
  updateProject: (id, projectData) => api.put(`/projects/${id}`, projectData),
  deleteProject: (id) => api.delete(`/projects/${id}`)
};

// Invites API
export const invitesAPI = {
  getInvites: (type = 'received') => api.get(`/invites?type=${type}`),
  sendInvite: (inviteData) => api.post('/invites', inviteData),
  respondToInvite: (id, status) => api.put(`/invites/${id}`, { status }),
  cancelInvite: (id) => api.delete(`/invites/${id}`),
  searchUsers: (query, teamId) => api.get(`/invites/search-users?query=${query}&teamId=${teamId}`)
};

// Meetings API
export const meetingsAPI = {
  getMeetings: () => api.get('/meetings/user/meetings'),
  getMeeting: (meetingUrl) => api.get(`/meetings/${meetingUrl}`),
  createMeeting: (meetingData) => api.post('/meetings/create', meetingData),
  joinMeeting: (meetingUrl, password) => api.post(`/meetings/${meetingUrl}/join`, { password }),
  leaveMeeting: (meetingUrl) => api.post(`/meetings/${meetingUrl}/leave`),
  endMeeting: (meetingUrl) => api.post(`/meetings/${meetingUrl}/end`),
  getTeamMeetings: (teamId) => api.get(`/meetings/team/${teamId}/meetings`)
};

export default api;
