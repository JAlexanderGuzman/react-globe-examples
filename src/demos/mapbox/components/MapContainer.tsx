import { useRef, useEffect, useState, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "./MapContainer.css";
import { useMapbox } from "../hooks/useMapbox";
import { MapControls } from "./MapControls";
import { MAP_STYLES } from "../types";
import {
  DEFAULT_MAP_STYLE,
  DEFAULT_PROJECTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "../constants";
import flightsData from "../../../flights.json";

const API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

interface Flight {
  start: [number, number];
  end: [number, number];
  progress: number;
}

export function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const controlsAddedRef = useRef(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);
  const [iconLoaded, setIconLoaded] = useState(false);
  const flights = flightsData as Flight[];

  const {
    map,
    mapStyle,
    projection,
    isMapLoaded,
    changeStyle,
    changeProjection,
  } = useMapbox({
    container,
    initialStyle: DEFAULT_MAP_STYLE,
    initialProjection: DEFAULT_PROJECTION,
    initialCenter: DEFAULT_CENTER,
    initialZoom: DEFAULT_ZOOM,
  });

  // Set container when ref is available
  useEffect(() => {
    if (mapContainerRef.current) {
      setContainer(mapContainerRef.current);
    }
  }, []);

  // Add navigation controls when map is loaded
  useEffect(() => {
    if (!map || !isMapLoaded || controlsAddedRef.current) return;

    const nav = new mapboxgl.NavigationControl();
    map.addControl(nav, "top-left");
    controlsAddedRef.current = true;
  }, [map, isMapLoaded]);

  // Generate great circle arc points between two coordinates
  const generateArcPoints = (
    start: [number, number],
    end: [number, number],
    numPoints: number = 100
  ): [number, number][] => {
    const points: [number, number][] = [];

    // Normalize longitudes to ensure we take the shorter route
    const lon1 = start[0];
    let lon2 = end[0];

    // Calculate longitude difference and normalize to [-180, 180]
    let lonDiff = lon2 - lon1;
    if (lonDiff > 180) {
      lonDiff -= 360;
    } else if (lonDiff < -180) {
      lonDiff += 360;
    }

    // Adjust lon2 to use the shorter path
    lon2 = lon1 + lonDiff;

    for (let i = 0; i <= numPoints; i++) {
      const t = i / numPoints;

      // Convert to radians
      const lat1 = (start[1] * Math.PI) / 180;
      const lon1Rad = (lon1 * Math.PI) / 180;
      const lat2 = (end[1] * Math.PI) / 180;
      const lon2Rad = (lon2 * Math.PI) / 180;

      // Great circle distance
      const d = Math.acos(
        Math.sin(lat1) * Math.sin(lat2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2Rad - lon1Rad)
      );

      // Handle edge cases
      if (isNaN(d) || d === 0) {
        points.push([lon1, start[1]]);
        continue;
      }

      // Intermediate point calculation
      const a = Math.sin((1 - t) * d) / Math.sin(d);
      const b = Math.sin(t * d) / Math.sin(d);

      const x =
        a * Math.cos(lat1) * Math.cos(lon1Rad) +
        b * Math.cos(lat2) * Math.cos(lon2Rad);
      const y =
        a * Math.cos(lat1) * Math.sin(lon1Rad) +
        b * Math.cos(lat2) * Math.sin(lon2Rad);
      const z = a * Math.sin(lat1) + b * Math.sin(lat2);

      const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
      let lon = Math.atan2(y, x);

      // Convert back to degrees and normalize longitude
      lon = (lon * 180) / Math.PI;

      // Normalize to [-180, 180] range
      while (lon < -180) lon += 360;
      while (lon > 180) lon -= 360;

      points.push([lon, (lat * 180) / Math.PI]);
    }

    return points;
  };

  // Split line at 180° meridian to prevent Mapbox duplicate line bug
  // Returns array of coordinate arrays (segments)
  const splitLineAt180 = (
    coordinates: [number, number][]
  ): [number, number][][] => {
    const segments: [number, number][][] = [];
    let currentSegment: [number, number][] = [coordinates[0]];

    for (let i = 1; i < coordinates.length; i++) {
      const prev = coordinates[i - 1];
      const curr = coordinates[i];

      // Check if we cross the 180° meridian
      const prevLon = prev[0];
      const currLon = curr[0];
      const lonDiff = currLon - prevLon;
      const crosses180 = Math.abs(lonDiff) > 180;

      if (crosses180) {
        // Calculate intersection point using great circle interpolation
        // Find t where longitude crosses ±180
        let t = 0.5;
        const tolerance = 0.00001;
        const maxIterations = 30;

        // Convert to radians
        const lat1Rad = (prev[1] * Math.PI) / 180;
        const lon1Rad = (prev[0] * Math.PI) / 180;
        const lat2Rad = (curr[1] * Math.PI) / 180;
        const lon2Rad = (curr[0] * Math.PI) / 180;

        const d = Math.acos(
          Math.sin(lat1Rad) * Math.sin(lat2Rad) +
            Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad)
        );

        if (d > 0 && !isNaN(d)) {
          // Binary search for crossing point
          let tLow = 0;
          let tHigh = 1;
          let iterations = 0;

          while (iterations < maxIterations) {
            const a = Math.sin((1 - t) * d) / Math.sin(d);
            const b = Math.sin(t * d) / Math.sin(d);

            const x =
              a * Math.cos(lat1Rad) * Math.cos(lon1Rad) +
              b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
            const y =
              a * Math.cos(lat1Rad) * Math.sin(lon1Rad) +
              b * Math.cos(lat2Rad) * Math.sin(lon2Rad);

            const lonRad = Math.atan2(y, x);
            let lonDeg = (lonRad * 180) / Math.PI;
            // Normalize to [0, 360] for comparison
            if (lonDeg < 0) lonDeg += 360;

            const distTo180 = Math.min(
              Math.abs(lonDeg - 180),
              Math.abs(lonDeg - 540)
            );

            if (distTo180 < tolerance) break;

            if (lonDeg < 180 || lonDeg > 540) {
              tLow = t;
            } else {
              tHigh = t;
            }
            t = (tLow + tHigh) / 2;
            iterations++;
          }
        }

        // Calculate exact crossing point
        const a = Math.sin((1 - t) * d) / Math.sin(d);
        const b = Math.sin(t * d) / Math.sin(d);

        const x =
          a * Math.cos(lat1Rad) * Math.cos(lon1Rad) +
          b * Math.cos(lat2Rad) * Math.cos(lon2Rad);
        const y =
          a * Math.cos(lat1Rad) * Math.sin(lon1Rad) +
          b * Math.cos(lat2Rad) * Math.sin(lon2Rad);
        const z = a * Math.sin(lat1Rad) + b * Math.sin(lat2Rad);

        const latAt180 =
          (Math.atan2(z, Math.sqrt(x * x + y * y)) * 180) / Math.PI;

        // Determine sides
        const prevSide = prevLon > 0;
        const currSide = currLon > 0;

        // Add point just before 180° - extremely close to minimize gap
        const pointBefore180: [number, number] = [
          prevSide ? 179.99999 : -179.99999,
          latAt180,
        ];

        // Add point just after 180° - extremely close to minimize gap
        const pointAfter180: [number, number] = [
          currSide ? 180.00001 : -180.00001,
          latAt180,
        ];

        // Close current segment
        currentSegment.push(pointBefore180);
        segments.push([...currentSegment]);

        // Start new segment
        currentSegment = [pointAfter180, curr];
      } else {
        currentSegment.push(curr);
      }
    }

    if (currentSegment.length > 0) {
      segments.push(currentSegment);
    }

    return segments;
  };

  // Calculate bearing (angle) from point A to point B in degrees
  const calculateBearing = (
    start: [number, number],
    end: [number, number]
  ): number => {
    const lat1 = (start[1] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const lon1 = (start[0] * Math.PI) / 180;
    const lon2 = (end[0] * Math.PI) / 180;

    const dLon = lon2 - lon1;

    const y = Math.sin(dLon) * Math.cos(lat2);
    const x =
      Math.cos(lat1) * Math.sin(lat2) -
      Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);

    let bearing = Math.atan2(y, x);
    bearing = (bearing * 180) / Math.PI;
    bearing = (bearing + 360) % 360;

    return bearing;
  };

  // Get position along great circle arc at given progress percentage
  const getPositionAtProgress = (
    start: [number, number],
    end: [number, number],
    progress: number
  ): [number, number] => {
    const t = progress / 100;

    // Convert to radians
    const lat1 = (start[1] * Math.PI) / 180;
    const lon1 = (start[0] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const lon2 = (end[0] * Math.PI) / 180;

    // Normalize longitude difference
    let lonDiff = lon2 - lon1;
    if (lonDiff > Math.PI) lonDiff -= 2 * Math.PI;
    if (lonDiff < -Math.PI) lonDiff += 2 * Math.PI;

    // Great circle distance
    const d = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDiff)
    );

    // Handle edge cases
    if (isNaN(d) || d === 0) {
      return start;
    }

    // Intermediate point calculation
    const a = Math.sin((1 - t) * d) / Math.sin(d);
    const b = Math.sin(t * d) / Math.sin(d);

    const x =
      a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
    const y =
      a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
    const z = a * Math.sin(lat1) + b * Math.sin(lat2);

    const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
    let lon = Math.atan2(y, x);

    // Convert back to degrees and normalize longitude
    lon = (lon * 180) / Math.PI;
    while (lon < -180) lon += 360;
    while (lon > 180) lon -= 360;

    return [lon, (lat * 180) / Math.PI];
  };

  // Create GeoJSON for flight arcs
  const flightGeoJSON = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: any[] = [];

    flights.forEach((flight, index) => {
      const arcPoints = generateArcPoints(flight.start, flight.end);
      const segments = splitLineAt180(arcPoints);

      // Create a feature for each segment to avoid Mapbox rendering bug
      segments.forEach((segment, segmentIndex) => {
        features.push({
          type: "Feature" as const,
          properties: {
            id: index,
            segmentId: segmentIndex,
            progress: flight.progress,
          },
          geometry: {
            type: "LineString" as const,
            coordinates: segment,
          },
        });
      });
    });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [flights]);

  // Create GeoJSON for airplane icons
  const airplanesGeoJSON = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const features: any[] = [];

    flights.forEach((flight, index) => {
      const position = getPositionAtProgress(
        flight.start,
        flight.end,
        flight.progress
      );
      const bearing = calculateBearing(position, flight.end);

      features.push({
        type: "Feature" as const,
        properties: {
          id: index,
          bearing,
        },
        geometry: {
          type: "Point" as const,
          coordinates: position,
        },
      });
    });

    return {
      type: "FeatureCollection" as const,
      features,
    };
  }, [flights]);

  // Load airplane icon image
  useEffect(() => {
    if (!map || !isMapLoaded || iconLoaded) return;

    // Create airplane icon as SVG
    const svgIcon = `
      <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#40c4ff"/>
      </svg>
    `;

    const img = new Image();
    const svgBlob = new Blob([svgIcon], {
      type: "image/svg+xml;charset=utf-8",
    });
    const url = URL.createObjectURL(svgBlob);

    img.onload = () => {
      if (!map.hasImage("airplane-icon")) {
        map.addImage("airplane-icon", img);
        setIconLoaded(true);
      }
    };
    img.src = url;

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [map, isMapLoaded, iconLoaded]);

  // Add flight arcs layer when map is loaded
  useEffect(() => {
    if (!map || !isMapLoaded) return;

    // Check if source already exists
    if (map.getSource("flights")) {
      (map.getSource("flights") as mapboxgl.GeoJSONSource).setData(
        flightGeoJSON
      );
    } else {
      // Add source
      map.addSource("flights", {
        type: "geojson",
        data: flightGeoJSON,
      });

      // Add layer for flight arcs
      map.addLayer({
        id: "flight-arcs",
        type: "line",
        source: "flights",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": [
            "interpolate",
            ["linear"],
            ["get", "progress"],
            0,
            "rgba(64, 196, 255, 0.8)",
            50,
            "rgba(128, 128, 255, 0.8)",
            100,
            "rgba(255, 64, 196, 0.8)",
          ],
          "line-width": 2,
          "line-opacity": 0.8,
        },
      });
    }

    return () => {
      if (map.getLayer("flight-arcs")) {
        map.removeLayer("flight-arcs");
      }
      if (map.getSource("flights")) {
        map.removeSource("flights");
      }
    };
  }, [map, isMapLoaded, flightGeoJSON]);

  // Add airplane icons layer when map is loaded and icon is ready
  useEffect(() => {
    if (!map || !isMapLoaded || !iconLoaded) return;

    // Check if source already exists
    if (map.getSource("airplanes")) {
      (map.getSource("airplanes") as mapboxgl.GeoJSONSource).setData(
        airplanesGeoJSON
      );
    } else {
      // Add source
      map.addSource("airplanes", {
        type: "geojson",
        data: airplanesGeoJSON,
      });

      // Add layer for airplane icons
      map.addLayer({
        id: "airplanes",
        type: "symbol",
        source: "airplanes",
        layout: {
          "icon-image": "airplane-icon",
          "icon-size": 1,
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });
    }

    return () => {
      if (map.getLayer("airplanes")) {
        map.removeLayer("airplanes");
      }
      if (map.getSource("airplanes")) {
        map.removeSource("airplanes");
      }
    };
  }, [map, isMapLoaded, iconLoaded, airplanesGeoJSON]);

  if (!API_KEY) {
    return (
      <div className="map-container">
        <div className="error-message">
          <h2>Mapbox API Key Missing</h2>
          <p>Please set VITE_MAPBOX_API_KEY in your .env file</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map-container">
      <div ref={mapContainerRef} className="map-wrapper" />
      <MapControls
        projection={projection}
        mapStyle={mapStyle}
        onProjectionChange={changeProjection}
        onStyleChange={changeStyle}
        styles={MAP_STYLES}
      />
    </div>
  );
}
