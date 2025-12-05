/**
 * Geographic calculation utilities for flight visualization
 */

export const EARTH_RADIUS = 6371000; // Earth radius in meters

/**
 * Convert degrees to radians
 */
export const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/**
 * Convert radians to degrees
 */
export const toDegrees = (radians: number): number => (radians * 180) / Math.PI;

/**
 * Normalize longitude difference to [-π, π]
 */
export const normalizeLonDiff = (lon1: number, lon2: number): number => {
  let diff = lon2 - lon1;
  if (diff > Math.PI) diff -= 2 * Math.PI;
  if (diff < -Math.PI) diff += 2 * Math.PI;
  return diff;
};

/**
 * Calculate bearing (direction) from start to end point in degrees
 */
export const calculateBearing = (
  start: [number, number],
  end: [number, number]
): number => {
  const lat1 = toRadians(start[1]);
  const lat2 = toRadians(end[1]);
  const lon1 = toRadians(start[0]);
  const lon2 = toRadians(end[0]);

  const dLon = normalizeLonDiff(lon1, lon2);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

  let bearing = Math.atan2(y, x);
  bearing = toDegrees(bearing);
  return (bearing + 360) % 360;
};

/**
 * Calculate great circle distance in meters
 */
export const calculateGreatCircleDistance = (
  start: [number, number],
  end: [number, number]
): number => {
  const lat1 = toRadians(start[1]);
  const lon1 = toRadians(start[0]);
  const lat2 = toRadians(end[1]);
  const lon2 = toRadians(end[0]);

  const lonDiff = normalizeLonDiff(lon1, lon2);
  const angularDist = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDiff)
  );

  return angularDist * EARTH_RADIUS;
};

/**
 * Calculate arc height using paraboloid function (matches ArcLayer calculation)
 */
export const calculateArcHeight = (
  distance: number,
  sourceZ: number,
  targetZ: number,
  ratio: number,
  heightMultiplier: number
): number => {
  const deltaZ = targetZ - sourceZ;
  const dh = distance * heightMultiplier;

  if (dh === 0) {
    return sourceZ + deltaZ * ratio;
  }

  const unitZ = deltaZ / dh;
  const p2 = unitZ * unitZ + 1.0;
  const dir = deltaZ < 0 ? 1 : 0;
  const z0 = dir === 0 ? sourceZ : targetZ;
  const r = dir === 0 ? ratio : 1.0 - ratio;

  return Math.sqrt(r * (p2 - r)) * dh + z0;
};

/**
 * Get position along great circle arc at given progress percentage (0-100)
 */
export const getPositionAtProgress = (
  start: [number, number],
  end: [number, number],
  progress: number
): [number, number] => {
  const t = progress / 100;
  const lat1 = toRadians(start[1]);
  const lon1 = toRadians(start[0]);
  const lat2 = toRadians(end[1]);
  const lon2 = toRadians(end[0]);

  const lonDiff = normalizeLonDiff(lon1, lon2);
  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDiff)
  );

  if (isNaN(d) || d === 0) {
    return start;
  }

  const a = Math.sin((1 - t) * d) / Math.sin(d);
  const b = Math.sin(t * d) / Math.sin(d);

  const x =
    a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
  const y =
    a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  let lon = Math.atan2(y, x);

  lon = toDegrees(lon);
  while (lon < -180) lon += 360;
  while (lon > 180) lon -= 360;

  return [lon, toDegrees(lat)];
};

/**
 * Calculate zoom level based on bounding box
 */
export const calculateZoomFromBounds = (
  minLon: number,
  maxLon: number,
  minLat: number,
  maxLat: number,
  scale: number = 5,
  minZoom: number = 3,
  maxZoom: number = 9
): number => {
  const lonDiff = maxLon - minLon;
  const latDiff = maxLat - minLat;
  const maxDiff = Math.max(lonDiff, latDiff);
  return Math.max(minZoom, Math.min(maxZoom, maxZoom - maxDiff * scale));
};
