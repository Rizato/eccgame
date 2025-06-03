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

// Rate limiter configuration
const RATE_LIMIT_CONFIG = {
  maxRequests: 10, // Maximum requests per window
  windowMs: 60000, // 1 minute window
  retryAfterMs: 2000, // Wait 2 seconds before retry
};

// Simple in-memory cache for GET requests
const cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
const CACHE_TTL = {
  dailyChallenge: 30000, // 30 seconds for daily challenge
  challenge: 300000, // 5 minutes for specific challenges
};

// Rate limiter state
const rateLimiter = {
  requests: [] as number[],
  isRateLimited: false,
};

/**
 * Simple rate limiter implementation
 */
function checkRateLimit(): Promise<void> {
  return new Promise((resolve, reject) => {
    const now = Date.now();

    // Clean up old requests outside the window
    rateLimiter.requests = rateLimiter.requests.filter(
      timestamp => now - timestamp < RATE_LIMIT_CONFIG.windowMs
    );

    // Check if we're within the rate limit
    if (rateLimiter.requests.length < RATE_LIMIT_CONFIG.maxRequests) {
      rateLimiter.requests.push(now);
      rateLimiter.isRateLimited = false;
      resolve();
    } else {
      // Rate limited - wait before allowing the next request
      rateLimiter.isRateLimited = true;
      console.warn('Rate limit exceeded. Waiting before retry...');

      setTimeout(() => {
        rateLimiter.requests.push(Date.now());
        resolve();
      }, RATE_LIMIT_CONFIG.retryAfterMs);
    }
  });
}

/**
 * Get cached data if available and not expired
 */
function getCachedData(key: string): any | null {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < cached.ttl) {
    return cached.data;
  }
  // Remove expired cache entry
  if (cached) {
    cache.delete(key);
  }
  return null;
}

/**
 * Set data in cache
 */
function setCachedData(key: string, data: any, ttl: number): void {
  cache.set(key, {
    data,
    timestamp: Date.now(),
    ttl,
  });
}

/**
 * Rate-limited API request wrapper
 */
async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  await checkRateLimit();
  return requestFn();
}

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
    const cacheKey = 'daily-challenge';

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Make rate-limited request
    const data = await rateLimitedRequest(async () => {
      const response = await api.get('/api/daily/');
      return response.data;
    });

    // Cache the result
    setCachedData(cacheKey, data, CACHE_TTL.dailyChallenge);
    return data;
  },

  // Get a specific challenge by UUID
  getChallenge: async (uuid: string): Promise<Challenge> => {
    const cacheKey = `challenge-${uuid}`;

    // Check cache first
    const cachedData = getCachedData(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    // Make rate-limited request
    const data = await rateLimitedRequest(async () => {
      const response = await api.get(`/api/challenges/${uuid}/`);
      return response.data;
    });

    // Cache the result
    setCachedData(cacheKey, data, CACHE_TTL.challenge);
    return data;
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

    // Rate limit POST requests but don't cache them
    return rateLimitedRequest(async () => {
      const response = await api.post(`/api/challenges/${challengeUuid}/guess/`, guess);
      return response.data;
    });
  },

  // Clear cache (useful for testing or manual refresh)
  clearCache: (): void => {
    cache.clear();
  },

  // Get rate limiter status
  getRateLimitStatus: () => ({
    isRateLimited: rateLimiter.isRateLimited,
    requestsInWindow: rateLimiter.requests.length,
    maxRequests: RATE_LIMIT_CONFIG.maxRequests,
    windowMs: RATE_LIMIT_CONFIG.windowMs,
  }),
};

export default api;
