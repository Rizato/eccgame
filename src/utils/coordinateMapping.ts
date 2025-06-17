import Decimal from 'decimal.js';
import { CURVE_P } from './ecc';

/**
 * Maps large ECC coordinate values to screen percentage (0-100) with zoom and pan support
 *
 * @param coord - The coordinate value (bigint) to map
 * @param isY - Whether this is a Y coordinate (affects pan offset)
 * @param zoomLevel - Current zoom level (1 = normal, 2 = 2x zoom, etc.)
 * @param panX - X pan offset percentage
 * @param panY - Y pan offset percentage
 * @returns Screen coordinate as percentage (0-100+, can go outside bounds when zoomed)
 */
export function mapToScreenCoordinate(
  coord: bigint,
  isY = false,
  zoomLevel = 1,
  panX = 0,
  panY = 0
): number {
  // Use Decimal.js for precise arithmetic to avoid precision loss
  const coordDecimal = new Decimal(coord.toString());
  const curvePDecimal = new Decimal(CURVE_P.toString());

  // Calculate percentage with high precision
  const percent = coordDecimal.dividedBy(curvePDecimal);

  // Apply zoom: zoom level affects the range we're viewing
  // At zoom 1, we see 0-100% of CURVE_P (full range fits in 5-95% screen space)
  // At zoom > 1, we see a smaller portion of CURVE_P (zoomed in)
  // At zoom < 1, we see more than CURVE_P (zoomed out, but coordinates still map to same space)

  // For zoom levels, we want to scale the coordinate space, not the screen space
  // Higher zoom = coordinates spread out more (take up more screen space)
  // Lower zoom = coordinates compressed (take up less screen space)
  const zoomedPercent = percent.times(zoomLevel);

  // Apply pan offset (as percentage of screen space)
  const panOffset = isY ? panY : panX;
  const adjustedPercent = zoomedPercent.plus(panOffset / 100);

  // Convert to screen coordinate (5-95% range for zoom level 1)
  // At higher zoom levels, points can go outside this range
  // At lower zoom levels, points compress toward center
  const screenCoord = adjustedPercent.times(90).plus(5);

  return screenCoord.toNumber();
}

/**
 * Calculate the current range being displayed based on zoom level
 *
 * @param zoomLevel - Current zoom level
 * @returns Object with min and max range values
 */
export function getDisplayRange(zoomLevel: number) {
  const rangeMin = BigInt(0);
  const rangeMax = CURVE_P;

  // Ensure we don't divide by zero - minimum zoom divisor should be 1
  const zoomDivisor = Math.max(1, Math.floor(zoomLevel));

  // At zoom level 1, we show the full range
  // At higher zoom levels, we show a smaller portion
  const visibleRange = (rangeMax - rangeMin) / BigInt(zoomDivisor);

  return {
    min: rangeMin,
    max: visibleRange,
  };
}

/**
 * Check if a point should be visible given its screen coordinates and a buffer zone
 *
 * @param x - Screen X coordinate (percentage)
 * @param y - Screen Y coordinate (percentage)
 * @param buffer - Buffer percentage around visible area (default 5%)
 * @returns Whether the point should be rendered
 */
export function isPointVisible(x: number, y: number, buffer = 5): boolean {
  return x >= -buffer && x <= 100 + buffer && y >= -buffer && y <= 100 + buffer;
}
