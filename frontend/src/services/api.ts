/**
 * CRYPTO GUESSER API MODULE - TRANSPARENCY NOTICE
 *
 * This file is intentionally unminified in production builds to allow
 * users to verify that private keys are NEVER transmitted to the server.
 *
 * PRIVACY GUARANTEE:
 * - Only public keys and cryptographic signatures are sent to the server
 * - Private keys remain in your browser and are never transmitted
 * - All cryptographic operations happen client-side
 *
 * You can inspect this code in your browser's developer tools to verify
 * that no private key data is included in any API requests.
 */
import axios from 'axios';
import type { Challenge, GuessRequest, GuessResponse } from '../types/api';

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
  // TRANSPARENCY: This only sends public_key and signature - NO private key data
  submitGuess: async (challengeUuid: string, guess: GuessRequest): Promise<GuessResponse> => {
    /*
     * PRIVACY VERIFICATION:
     * The 'guess' object only contains:
     * - public_key: string (derived from private key, safe to transmit)
     * - signature: string (cryptographic proof, safe to transmit)
     *
     * Private keys are NEVER included in this request
     */
    const response = await api.post(`/api/challenges/${challengeUuid}/guess/`, guess);
    return response.data;
  },
};

export default api;
