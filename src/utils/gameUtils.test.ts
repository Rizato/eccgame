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
        challenge: {
          id: 5,
          p2pkh_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          public_key: 'test',
          tags: [],
        },
        solved: true,
      });

      expect(message).toContain('ECC Game');
      expect(message).toContain('#5');
      expect(message).toContain('🏆 I solved the private key in just 42 point operations!');
      expect(message).toContain('https://example.com');
    });

    it('generates give up message for practice mode', () => {
      const message = generateShareMessage({
        gameMode: 'practice',
        operationCount: 123,
        challenge: {
          id: 1,
          p2pkh_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          public_key: 'test',
          tags: [],
        },
        solved: false,
      });

      expect(message).toContain('ECC Game');
      expect(message).toContain('Practice');
      expect(message).toContain('🤷 I gave up after 123 tries!');
      expect(message).toContain('https://example.com');
    });

    it('falls back to default URL when env variable not set', () => {
      import.meta.env.VITE_APP_URL = '';

      const message = generateShareMessage({
        gameMode: 'daily',
        operationCount: 10,
        challenge: {
          id: 10,
          p2pkh_address: '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
          public_key: 'test',
          tags: [],
        },
        solved: true,
      });

      expect(message).toContain('https://eccgame.com');
    });
  });

  describe('copyToClipboard', () => {
    let originalClipboard: typeof navigator.clipboard;

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
    let originalShare: typeof navigator.share;
    let originalClipboard: typeof navigator.clipboard;

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

    it('uses native share when available on mobile', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });

      // Mock mobile device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      const { success, method } = await shareMessage('Test message');

      expect(shareMock).toHaveBeenCalledWith({
        text: 'Test message',
        title: 'ECC Game Result',
      });
      expect(success).toBe(true);
      expect(method).toBe('share');
    });

    it('falls back to clipboard on desktop even when share is available', async () => {
      const shareMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });

      // Mock desktop device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        configurable: true,
      });

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
        configurable: true,
      });

      const { success, method } = await shareMessage('Test message');

      expect(shareMock).not.toHaveBeenCalled();
      expect(writeTextMock).toHaveBeenCalledWith('Test message');
      expect(success).toBe(true);
      expect(method).toBe('copy');
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

    it('returns true when sharing fails but copy works on mobile', async () => {
      const shareMock = vi.fn().mockRejectedValue(new Error('Share failed'));
      Object.defineProperty(navigator, 'share', {
        value: shareMock,
        configurable: true,
      });

      // Mock mobile device
      Object.defineProperty(navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
        configurable: true,
      });

      const writeTextMock = vi.fn().mockResolvedValue(undefined);
      Object.defineProperty(navigator, 'clipboard', {
        value: { writeText: writeTextMock },
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
