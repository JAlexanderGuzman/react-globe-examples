/**
 * Constants for DefinitiveDemo
 */

export const ANIMATION_SPEED = 10; // Time increment per frame (milliseconds)
export const TIME_WINDOW = 4000; // Time window in milliseconds
export const FLIGHT_DURATION = 2000; // Duration of each flight animation in milliseconds
export const NUM_CYCLES = 30; // Number of overlapping cycles per flight
export const ARC_HEIGHT = 0.2; // Arc height multiplier
export const BASE_OFFSET_MULTIPLIER = 200; // Stagger different flights

export const DARK_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

export const COLORS = {
  SELECTED: [59, 130, 246, 255] as [number, number, number, number], // Blue
  UNSELECTED: [255, 255, 255, 255] as [number, number, number, number], // White
  AIRPLANE_SELECTED: [200, 200, 200, 255] as [number, number, number, number], // Light gray
  AIRPLANE_UNSELECTED: [59, 130, 246, 255] as [number, number, number, number], // Blue
};
