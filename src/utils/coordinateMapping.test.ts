import { describe, it, expect } from 'vitest';
import { mapToScreenCoordinate, getDisplayRange, isPointVisible } from './coordinateMapping';
import { CURVE_P } from './ecc';

describe('coordinateMapping utilities', () => {
  describe('mapToScreenCoordinate', () => {
    describe('Default Zoom Level (1x)', () => {
      it('should map coordinate 0 to screen position 5%', () => {
        const result = mapToScreenCoordinate(BigInt(0), false, 1, 0, 0);
        expect(result).toBe(5);
      });

      it('should map CURVE_P to screen position 95%', () => {
        const result = mapToScreenCoordinate(CURVE_P, false, 1, 0, 0);
        expect(result).toBe(95);
      });

      it('should map middle coordinate to screen position 50%', () => {
        const middleCoord = CURVE_P / BigInt(2);
        const result = mapToScreenCoordinate(middleCoord, false, 1, 0, 0);
        expect(result).toBeCloseTo(50, 1);
      });

      it('should handle both X and Y coordinates identically at zoom 1', () => {
        const testCoord = CURVE_P / BigInt(4);
        const xResult = mapToScreenCoordinate(testCoord, false, 1, 0, 0);
        const yResult = mapToScreenCoordinate(testCoord, true, 1, 0, 0);
        expect(xResult).toBe(yResult);
      });
    });

    describe('2x Zoom Level', () => {
      it('should zoom coordinates by factor of 2', () => {
        const testCoord = CURVE_P / BigInt(4); // 25% of CURVE_P
        const result = mapToScreenCoordinate(testCoord, false, 2, 0, 0);

        // At 2x zoom, 25% becomes 50%, then scaled to screen: 50% * 90 + 5 = 50%
        expect(result).toBeCloseTo(50, 1);
      });

      it('should allow coordinates to go beyond screen bounds when zoomed', () => {
        const testCoord = CURVE_P / BigInt(2); // 50% of CURVE_P
        const result = mapToScreenCoordinate(testCoord, false, 2, 0, 0);

        // At 2x zoom, 50% becomes 100%, then scaled: 100% * 90 + 5 = 95%
        expect(result).toBeCloseTo(95, 1);
      });

      it('should handle coordinates that would go off-screen', () => {
        const largeCoord = (CURVE_P * BigInt(3)) / BigInt(4); // 75% of CURVE_P
        const result = mapToScreenCoordinate(largeCoord, false, 2, 0, 0);

        // At 2x zoom, 75% becomes 150%, scaled: 150% * 90 + 5 = 140%
        // This is off-screen (> 100%), which is expected behavior
        expect(result).toBeGreaterThan(100);
      });
    });

    describe('Pan Offset Effects', () => {
      it('should apply X pan offset for X coordinates', () => {
        const testCoord = CURVE_P / BigInt(4);
        const noPanResult = mapToScreenCoordinate(testCoord, false, 1, 0, 0);
        const withPanResult = mapToScreenCoordinate(testCoord, false, 1, 10, 0); // 10% pan offset

        expect(withPanResult).toBeCloseTo(noPanResult + 9, 1); // 10% of 90 range = 9%
      });

      it('should apply Y pan offset for Y coordinates', () => {
        const testCoord = CURVE_P / BigInt(4);
        const noPanResult = mapToScreenCoordinate(testCoord, true, 1, 0, 0);
        const withPanResult = mapToScreenCoordinate(testCoord, true, 1, 0, 10); // 10% pan offset

        expect(withPanResult).toBeCloseTo(noPanResult + 9, 1); // 10% of 90 range = 9%
      });

      it('should not apply Y pan to X coordinates and vice versa', () => {
        const testCoord = CURVE_P / BigInt(4);
        const xWithYPan = mapToScreenCoordinate(testCoord, false, 1, 0, 10);
        const xNoPan = mapToScreenCoordinate(testCoord, false, 1, 0, 0);

        expect(xWithYPan).toBe(xNoPan);
      });
    });

    describe('Combined Zoom and Pan', () => {
      it('should correctly combine zoom and pan effects', () => {
        const testCoord = CURVE_P / BigInt(4); // 25% of CURVE_P

        // 2x zoom + 5% pan offset
        const result = mapToScreenCoordinate(testCoord, false, 2, 5, 0);

        // Expected: 25% * 2 = 50%, + 5% = 55%, scaled: 55% * 90 + 5 = 54.5%
        expect(result).toBeCloseTo(54.5, 1);
      });

      it('should handle negative pan values', () => {
        const testCoord = CURVE_P / BigInt(2); // 50% of CURVE_P

        // 1x zoom + negative pan
        const result = mapToScreenCoordinate(testCoord, false, 1, -10, 0);

        // Expected: 50% - 10% = 40%, scaled: 40% * 90 + 5 = 41%
        expect(result).toBeCloseTo(41, 1);
      });
    });

    describe('Edge Cases', () => {
      it('should handle very small coordinates', () => {
        const smallCoord = BigInt(1);
        const result = mapToScreenCoordinate(smallCoord, false, 1, 0, 0);

        // Should be very close to 5% (the minimum)
        expect(result).toBeCloseTo(5, 2);
      });

      it('should handle maximum safe integer zoom levels', () => {
        const testCoord = CURVE_P / BigInt(4);
        const result = mapToScreenCoordinate(testCoord, false, 10, 0, 0); // 10x zoom

        // Should not throw errors and return a number
        expect(typeof result).toBe('number');
        expect(Number.isFinite(result)).toBe(true);
      });

      it('should maintain precision with Decimal.js', () => {
        // Test that we don't lose precision with large numbers
        const largeCoord = (CURVE_P * BigInt(99)) / BigInt(100); // 99% of CURVE_P
        const result = mapToScreenCoordinate(largeCoord, false, 1, 0, 0);

        // Should be very close to 94.1% (99% * 90 + 5 = 94.1)
        expect(result).toBeCloseTo(94.1, 1);
        expect(result).toBeGreaterThan(94);
        expect(result).toBeLessThan(95);
      });
    });
  });

  describe('getDisplayRange', () => {
    it('should return full range at zoom level 1', () => {
      const range = getDisplayRange(1);
      expect(range.min).toBe(BigInt(0));
      expect(range.max).toBe(CURVE_P);
    });

    it('should return half range at zoom level 2', () => {
      const range = getDisplayRange(2);
      expect(range.min).toBe(BigInt(0));
      expect(range.max).toBe(CURVE_P / BigInt(2));
    });

    it('should handle fractional zoom levels', () => {
      const range = getDisplayRange(1.5);
      expect(range.min).toBe(BigInt(0));
      // Math.floor(1.5) = 1, so should return full range
      expect(range.max).toBe(CURVE_P);
    });

    it('should handle high zoom levels', () => {
      const range = getDisplayRange(10);
      expect(range.min).toBe(BigInt(0));
      expect(range.max).toBe(CURVE_P / BigInt(10));
    });
  });

  describe('isPointVisible', () => {
    it('should include points within visible area', () => {
      expect(isPointVisible(50, 50)).toBe(true);
      expect(isPointVisible(10, 90)).toBe(true);
      expect(isPointVisible(0, 0)).toBe(true);
      expect(isPointVisible(100, 100)).toBe(true);
    });

    it('should include points within buffer zone', () => {
      expect(isPointVisible(-3, 50)).toBe(true); // Within 5% buffer
      expect(isPointVisible(103, 50)).toBe(true); // Within 5% buffer
      expect(isPointVisible(50, -2)).toBe(true);
      expect(isPointVisible(50, 102)).toBe(true);
    });

    it('should exclude points outside buffer zone', () => {
      expect(isPointVisible(-10, 50)).toBe(false); // Outside 5% buffer
      expect(isPointVisible(110, 50)).toBe(false); // Outside 5% buffer
      expect(isPointVisible(50, -10)).toBe(false);
      expect(isPointVisible(50, 110)).toBe(false);
    });

    it('should work with custom buffer sizes', () => {
      expect(isPointVisible(-8, 50, 10)).toBe(true); // Within 10% buffer
      expect(isPointVisible(-12, 50, 10)).toBe(false); // Outside 10% buffer
    });

    it('should handle edge cases at exactly buffer boundaries', () => {
      expect(isPointVisible(-5, 50, 5)).toBe(true); // Exactly at buffer edge
      expect(isPointVisible(105, 50, 5)).toBe(true); // Exactly at buffer edge
      expect(isPointVisible(-6, 50, 5)).toBe(false); // Just outside buffer
      expect(isPointVisible(106, 50, 5)).toBe(false); // Just outside buffer
    });
  });
});
