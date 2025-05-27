import axios from 'axios';
import { Challenge, GuessRequest, GuessResponse } from '../types/api';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // For session-based authentication
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add CSRF token handling for Django
api.interceptors.request.use(config => {
  const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]') as HTMLInputElement;
  if (csrfToken) {
    config.headers['X-CSRFToken'] = csrfToken.value;
  }
  return config;
});

export const challengeApi = {
  // Get the current daily challenge
  getDailyChallenge: async (): Promise<Challenge> => {
    const response = await api.get('/api/daily/');
    return response.data;
  },

  // Get a specific challenge by UUID
  getChallenge: async (uuid: string): Promise<Challenge> => {
    const response = await api.get(`/api/challenges/${uuid}/`);
    return response.data;
  },

  // Submit a guess for a challenge
  submitGuess: async (challengeUuid: string, guess: GuessRequest): Promise<GuessResponse> => {
    const response = await api.post(`/api/challenges/${challengeUuid}/guess/`, guess);
    return response.data;
  },
};

export default api;
