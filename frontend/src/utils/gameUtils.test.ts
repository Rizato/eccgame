import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { copyToClipboard, generateShareMessage, shareMessage } from './gameUtils';

describe('gameUtils', () => {
  describe('generateShareMessage', () => {
    const mockEnv = import.meta.env.VITE_APP_URL;

    beforeEach(() => {
      import.meta.env.VITE_APP_URL = 'https://example.com';
    });

    afterEach(() => {
      import.meta.env.VITE_APP_URL = mockEnv;
    });

    it('generates victory message for daily mode', () => {
      const message = generateShareMessage({
        gameMode: 'daily',
        operationCount: 42,
        challengeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        solved: true,
      });

      expect(message).toContain('ECC Crypto Playground Daily');
      expect(message).toContain('1A1zP1eP...DivfNa');
      expect(message).toContain('🏆 I solved the private key in just 42 steps!');
      expect(message).toContain('https://example.com');
    });

    it('generates give up message for practice mode', () => {
      const message = generateShareMessage({
        gameMode: 'practice',
        operationCount: 123,
        challengeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        solved: false,
      });

      expect(message).toContain('ECC Crypto Playground Practice');
      expect(message).toContain('1A1zP1eP...DivfNa');
      expect(message).toContain('🤷 I gave up after 123 steps!');
      expect(message).toContain('https://example.com');
    });

    it('falls back to default URL when env variable not set', () => {
      import.meta.env.VITE_APP_URL = '';

      const message = generateShareMessage({
        gameMode: 'daily',
        operationCount: 10,
        challengeAddress: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        solved: true,
      });

      expect(message).toContain('https://cryptoplayground.com');
    });
  });

  describe('copyToClipboard', () => {
    let originalClipboard: any;

    beforeEach(() => {
      originalClipboard = navigator.clipboard;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    });

    it('copies text using modern clipboard API', async () => {
      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const result = await copyToClipboard('test text');

      expect(writeTextMock).toHaveBeenCalledWith('test text');
      expect(result).toBe(true);
    });

    it('falls back to execCommand when clipboard API not available', async () => {
      Object.defineProperty(navigator, 'clipboard', {
        value: undefined,
        configurable: true,
      });

      const execCommandMock = vi.fn().mockReturnValue(true);
      document.execCommand = execCommandMock;

      const result = await copyToClipboard('test text');

      expect(execCommandMock).toHaveBeenCalledWith('copy');
      expect(result).toBe(true);
    });

    it('returns false when copy fails', async () => {
      const writeTextMock = vi.fn().mockRejectedValue(new Error('Copy failed'));
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = await copyToClipboard('test text');

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        'Failed to copy text to clipboard:',
        expect.any(Error)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('shareMessage', () => {
    let originalShare: any;
    let originalClipboard: any;

    beforeEach(() => {
      originalShare = navigator.share;
      originalClipboard = navigator.clipboard;
    });

    afterEach(() => {
      Object.defineProperty(navigator, 'share', {
        value: originalShare,
        configurable: true,
      });
      Object.defineProperty(navigator, 'clipboard', {
        value: originalClipboard,
        configurable: true,
      });
    });

    it('uses native share when available', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });

      const { success, method } = await shareMessage('Test message');

      expect(shareMock).toHaveBeenCalledWith({
        text: 'Test message',
        title: 'ECC Crypto Playground Result',
      });
      expect(success).toBe(true);
      expect(method).toBe('share');
    });

    it('falls back to clipboard when native share not available', async () => {
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        configurable: true,
      });

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const { success, method } = await shareMessage('Test message');

      expect(writeTextMock).toHaveBeenCalledWith('Test message');
      expect(success).toBe(true);
      expect(method).toBe('copy');
    });

    it('returns true when sharing fails but copy works', async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error('Share failed'));
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const { success, method } = await shareMessage('Test message');

      expect(success).toBe(true);
      expect(method).toBe('copy');
      expect(consoleSpy).toHaveBeenCalledWith('Failed to share:', expect.any(Error));

      consoleSpy.mockRestore();
    });
  });
});
