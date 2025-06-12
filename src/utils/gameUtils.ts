/**
 * GAME UTILITY MODULE
 *
 * This module contains utilities for game features like sharing
 * and debugging functionality.
 */

import type { Challenge } from '../types/game';

/**
 * Utility for generating share messages for ECC Game results
 */
interface ShareMessageOptions {
  gameMode: 'daily' | 'practice';
  solved: boolean;
  operationCount: number;
  challenge: Challenge | null;
  gaveUp?: boolean;
}

/**
 * Generate a shareable message based on game results
 */
export function generateShareMessage({
  gameMode,
  solved,
  operationCount,
  challenge,
  gaveUp: _gaveUp = false,
}: ShareMessageOptions): string {
  const walletType =
    gameMode === 'daily' && challenge?.id !== undefined
      ? `Daily Wallet #${challenge.id}`
      : 'Practice Wallet';

  if (solved) {
    return `ECC Game ${walletType}
🏆 I solved the private key in just ${operationCount} steps!

${import.meta.env.VITE_APP_URL || 'https://eccgame.com'}`;
  }

  // Gave up
  return `ECC Game ${walletType}
🤷 I gave up after ${operationCount} steps!

${import.meta.env.VITE_APP_URL || 'https://eccgame.com'}`;
}

/**
 * Detect if the device is mobile
 */
function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern async clipboard API
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);

    return successful;
  } catch (err) {
    console.error('Failed to copy text to clipboard:', err);
    return false;
  }
}

/**
 * Open native share dialog if available, otherwise copy to clipboard
 */
export async function shareMessage(
  text: string
): Promise<{ success: boolean; method: 'share' | 'copy' }> {
  try {
    // Try native share API only on mobile devices
    if (navigator.share && isMobileDevice()) {
      await navigator.share({
        title: 'ECC Game Result',
        text: text,
      });
      return { success: true, method: 'share' };
    }

    // Fallback to clipboard for desktop and unsupported devices
    const copied = await copyToClipboard(text);
    return { success: copied, method: 'copy' };
  } catch (err) {
    console.error('Failed to share:', err);
    // Try clipboard as final fallback
    const copied = await copyToClipboard(text);
    return { success: copied, method: 'copy' };
  }
}
