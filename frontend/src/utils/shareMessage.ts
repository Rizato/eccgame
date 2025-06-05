/**
 * Utility for generating share messages for Crypto Guesser results
 */

interface ShareMessageOptions {
  gameMode: 'daily' | 'practice';
  solved: boolean;
  operationCount: number;
  challengeAddress: string;
  gaveUp?: boolean;
}

/**
 * Generate a shareable message based on game results
 */
export function generateShareMessage({
  gameMode,
  solved,
  operationCount,
  challengeAddress,
  gaveUp: _gaveUp = false,
}: ShareMessageOptions): string {
  const gameType = gameMode === 'daily' ? 'Daily' : 'Practice';
  const shortAddress = `${challengeAddress.slice(0, 8)}...${challengeAddress.slice(-6)}`;

  if (solved) {
    return `🏆 Crypto Guesser ${gameType} ${shortAddress}
Cracked in ${operationCount} operations!

Think you can do better? 🔐
https://cryptoguesser.com`;
  }

  // Unsolved/gave up - same message for both states
  return `🤷 Crypto Guesser ${gameType} ${shortAddress}
${operationCount} operations attempted

Can you crack the private key? 🔐
https://cryptoguesser.com`;
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
    // Try native share API first (mobile devices)
    if (navigator.share) {
      await navigator.share({
        title: 'Crypto Guesser Result',
        text: text,
      });
      return { success: true, method: 'share' };
    }

    // Fallback to clipboard
    const copied = await copyToClipboard(text);
    return { success: copied, method: 'copy' };
  } catch (err) {
    console.error('Failed to share:', err);
    // Try clipboard as final fallback
    const copied = await copyToClipboard(text);
    return { success: copied, method: 'copy' };
  }
}
