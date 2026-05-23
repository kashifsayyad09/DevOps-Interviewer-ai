import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' }
});

api.interceptors.response.use(
  res => res,
  err => {
    const msg = err.response?.data?.error || err.message || 'Network error';
    return Promise.reject(new Error(msg));
  }
);

// Sessions
export const createSession = (data) => api.post('/sessions', data);
export const getSession = (token) => api.get(`/sessions/${token}`);
export const completeSession = (token) => api.patch(`/sessions/${token}/complete`);
export const getSessionHistory = (token) => api.get(`/sessions/${token}/history`);

// Questions
export const generateQuestion = (sessionToken, questionNumber) =>
  api.post('/questions/generate', { session_token: sessionToken, question_number: questionNumber });

// Answers
export const submitAnswer = (data) => api.post('/answers', data);

// Leaderboard
export const getLeaderboard = (level) =>
  api.get('/leaderboard', { params: level ? { level } : {} });
export const getStats = () => api.get('/leaderboard/stats');

export default api;
