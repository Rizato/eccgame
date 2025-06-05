/**
 * DAILY GAME SAVE SUBMISSION MODULE
 *
 * This module handles submitting individual saves as they happen,
 * with frontend deduplication to avoid re-submitting the same save.
 */
import { challengeApi } from '../services/api';
import { pointToPublicKey } from './ecc';
import type { ECPoint } from '../types/ecc';
import type { SaveResponse } from '../types/api';

// Track submitted saves to avoid re-submission
// Key format: `{challengeUuid}::{publicKey}`
const submittedSaves = new Set<string>();

/**
 * Create a unique key for tracking submitted saves
 */
function createSaveKey(challengeUuid: string, publicKey: string): string {
  return `${challengeUuid}::${publicKey}`;
}

/**
 * Check if a save has already been submitted
 */
export function hasSubmittedSave(challengeUuid: string, point: ECPoint): boolean {
  if (point.isInfinity) {
    return false; // Don't track infinity points
  }

  const publicKey = pointToPublicKey(point);
  const saveKey = createSaveKey(challengeUuid, publicKey);
  return submittedSaves.has(saveKey);
}

/**
 * Submit a save to the backend if not already submitted
 * Returns SaveResponse if submitted, null if already submitted or failed
 */
export async function submitSaveToBackend(
  challengeUuid: string,
  point: ECPoint,
  label: string
): Promise<SaveResponse | null> {
  if (point.isInfinity) {
    console.log('Skipping save submission for infinity point');
    return null;
  }

  const publicKey = pointToPublicKey(point);
  const saveKey = createSaveKey(challengeUuid, publicKey);

  // Check if already submitted
  if (submittedSaves.has(saveKey)) {
    console.log(`Save already submitted for ${label} (${publicKey.slice(0, 10)}...)`);
    return null;
  }

  try {
    console.log(`🔄 Submitting save to backend: ${label}`);

    const saveRequest = {
      public_key: publicKey,
    };

    const response = await challengeApi.submitSave(challengeUuid, saveRequest);

    // Mark as submitted to prevent re-submission
    submittedSaves.add(saveKey);

    console.log(`✅ Save submitted successfully: ${label}`, {
      uuid: response.uuid,
      public_key: response.public_key.slice(0, 10) + '...',
    });

    return response;
  } catch (error) {
    console.error(`❌ Failed to submit save ${label}:`, error);
    return null;
  }
}

/**
 * Clear all submitted save tracking (useful for new challenges)
 */
export function clearSubmittedSaves(): void {
  submittedSaves.clear();
  console.log('🧹 Cleared submitted save tracking');
}

/**
 * Get the number of submitted saves for debugging
 */
export function getSubmittedSaveCount(): number {
  return submittedSaves.size;
}

/**
 * Check if this is a daily mode challenge and submit if appropriate
 */
export async function submitSaveIfDaily(
  challengeUuid: string | undefined,
  gameMode: string,
  point: ECPoint,
  label: string
): Promise<SaveResponse | null> {
  // Only submit for daily mode
  if (gameMode !== 'daily') {
    return null;
  }

  // Must have a challenge UUID
  if (!challengeUuid) {
    console.warn('Cannot submit save - no challenge UUID available');
    return null;
  }

  return submitSaveToBackend(challengeUuid, point, label);
}
