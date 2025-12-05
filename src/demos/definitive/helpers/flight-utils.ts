/**
 * Flight data transformation utilities
 */

import {
  calculateArcHeight,
  calculateBearing,
  calculateGreatCircleDistance,
  getPositionAtProgress,
} from "./geographic-calculations";
import {
  ARC_HEIGHT,
  BASE_OFFSET_MULTIPLIER,
  FLIGHT_DURATION,
  NUM_CYCLES,
} from "./constants";

export interface Flight {
  start: [number, number];
  end: [number, number];
  progress: number;
}

export interface AnimatedFlight {
  time1: number;
  time2: number;
  lon1: number;
  lat1: number;
  alt1: number;
  lon2: number;
  lat2: number;
  alt2: number;
  flightIndex: number;
  progress: number;
}

export interface AirplaneData {
  position: [number, number, number];
  orientation: [number, number, number];
  flightIndex: number;
}

/**
 * Convert flights to animated format with multiple cycles
 */
export const createAnimatedFlights = (flights: Flight[]): AnimatedFlight[] => {
  const result: AnimatedFlight[] = [];

  flights.forEach((flight, index) => {
    for (let cycle = 0; cycle < NUM_CYCLES; cycle++) {
      const baseOffset = index * BASE_OFFSET_MULTIPLIER;
      const cycleOffset = cycle * FLIGHT_DURATION;
      const time1 = baseOffset + cycleOffset;
      const time2 = time1 + FLIGHT_DURATION;

      result.push({
        time1,
        time2,
        lon1: flight.start[0],
        lat1: flight.start[1],
        alt1: 0,
        lon2: flight.end[0],
        lat2: flight.end[1],
        alt2: 0,
        flightIndex: index,
        progress: flight.progress,
      });
    }
  });

  return result;
};

/**
 * Calculate airplane position and orientation
 */
export const calculateAirplaneData = (
  flight: Flight,
  index: number,
  projection: "globe" | "mercator"
): AirplaneData => {
  const [lon, lat] = getPositionAtProgress(
    flight.start,
    flight.end,
    flight.progress
  );

  const nextProgress = Math.min(flight.progress + 1, 100);
  const [nextLon, nextLat] = getPositionAtProgress(
    flight.start,
    flight.end,
    nextProgress
  );

  const bearing = calculateBearing([lon, lat], [nextLon, nextLat]);
  const distance = calculateGreatCircleDistance(flight.start, flight.end);
  const progressRatio = flight.progress / 100;
  const arcHeight = calculateArcHeight(
    distance,
    0,
    0,
    progressRatio,
    ARC_HEIGHT
  );

  const mapType = projection === "mercator" ? "mercator" : "globe";
  const pitch = 0;
  const yaw = mapType === "mercator" ? -bearing + 90 : -bearing - 90;
  const roll = 90;

  return {
    position: [lon, lat, arcHeight],
    orientation: [pitch, yaw, roll],
    flightIndex: index,
  };
};
