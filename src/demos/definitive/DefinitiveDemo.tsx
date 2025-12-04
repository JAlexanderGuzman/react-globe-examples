// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, useControl } from "react-map-gl/maplibre";
import type { ViewState, MapRef } from "react-map-gl/maplibre";
import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";

import AnimatedArcLayer from "./animated-arc-group-layer";
import { MapControls } from "./MapControls";
import type { MapProjection } from "./types";
import flightsData from "../../flights.json";
import "./DefinitiveDemo.css";

const INITIAL_VIEW_STATE: ViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

const ANIMATION_SPEED = 5; // Time increment per frame (milliseconds) - increased for faster animation
const TIME_WINDOW = 4000; // Time window in milliseconds - increased to show more flights continuously
const DARK_STYLE_URL =
  "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

interface Flight {
  start: [number, number];
  end: [number, number];
  progress: number;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function DeckGLOverlay(props: any) {
  const overlay = useControl(() => new DeckOverlay(props));
  overlay.setProps(props);
  return null;
}

// Calculate bearing (direction) from start to end point
function calculateBearing(
  start: [number, number],
  end: [number, number]
): number {
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
}

// Get position along great circle arc at given progress percentage
function getPositionAtProgress(
  start: [number, number],
  end: [number, number],
  progress: number
): [number, number] {
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
}

// Airplane model URL from deck.gl examples
const AIRPLANE_MODEL_URL =
  "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/scenegraph-layer/airplane.glb";

function FlightList({
  flights,
  onFlightClick,
  selectedFlightIndex,
}: {
  flights: Flight[];
  onFlightClick: (index: number, flight: Flight) => void;
  selectedFlightIndex: number | null;
}) {
  return (
    <div className="flight-list-panel">
      <h3 className="flight-list-title">Flights</h3>
      <div className="flight-list">
        {flights.map((flight, index) => (
          <div
            key={index}
            className={`flight-item ${
              selectedFlightIndex === index ? "selected" : ""
            }`}
            onClick={() => onFlightClick(index, flight)}
          >
            <div className="flight-item-header">
              <span className="flight-number">Flight {index + 1}</span>
              <span className="flight-progress">{flight.progress}%</span>
            </div>
            <div className="flight-coordinates">
              <div className="coordinate-row">
                <span className="coordinate-label">Start:</span>
                <span className="coordinate-value">
                  [{flight.start[0].toFixed(4)}, {flight.start[1].toFixed(4)}]
                </span>
              </div>
              <div className="coordinate-row">
                <span className="coordinate-label">End:</span>
                <span className="coordinate-value">
                  [{flight.end[0].toFixed(4)}, {flight.end[1].toFixed(4)}]
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DefinitiveDemo() {
  const [currentTime, setCurrentTime] = useState(0);
  const [projection, setProjection] = useState<MapProjection>("globe");
  const [selectedFlightIndex, setSelectedFlightIndex] = useState<number | null>(
    null
  );
  const [viewState, setViewState] = useState<ViewState>(INITIAL_VIEW_STATE);
  const mapRef = useRef<MapRef>(null);

  const flights = flightsData as Flight[];

  const FLIGHT_DURATION = 3000; // Duration of each flight animation in milliseconds
  const NUM_CYCLES = 30; // Number of overlapping cycles per flight for continuous animation

  // Convert flights.json format to animated arc format
  // Duplicate each flight with different time offsets so they cycle independently
  const animatedFlights = useMemo(() => {
    const result: Array<{
      time1: number;
      time2: number;
      lon1: number;
      lat1: number;
      alt1: number;
      lon2: number;
      lat2: number;
      alt2: number;
      flightIndex: number;
    }> = [];

    flights.forEach((flight, index) => {
      // Create multiple cycles for each flight with different start times
      for (let cycle = 0; cycle < NUM_CYCLES; cycle++) {
        const baseOffset = index * 200; // Stagger different flights
        const cycleOffset = cycle * FLIGHT_DURATION; // Offset for each cycle
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
        });
      }
    });

    return result;
  }, [flights]);

  // Animate time in infinite loop
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (timestamp: number) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      setCurrentTime((prev) => {
        const increment = (ANIMATION_SPEED * delta) / 16.67; // Normalize to 60fps
        const maxTime = FLIGHT_DURATION * NUM_CYCLES + TIME_WINDOW;
        const next = prev + increment;
        // Loop back to 0 when reaching max time
        return next >= maxTime ? 0 : next;
      });

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, []);

  // Calculate time range based on current time
  const timeRange: [number, number] = useMemo(() => {
    return [currentTime, currentTime + TIME_WINDOW];
  }, [currentTime]);

  // Calculate airplane positions and orientations based on progress
  // Based on deck.gl scenegraph example: https://github.com/visgl/deck.gl/tree/9.2-release/examples/website/scenegraph
  const airplaneData = useMemo(() => {
    return flights.map((flight) => {
      const [lon, lat] = getPositionAtProgress(
        flight.start,
        flight.end,
        flight.progress
      );

      // Calculate direction by looking at a point slightly ahead on the path
      // This ensures the airplane points in the direction it's moving
      const nextProgress = Math.min(flight.progress + 1, 100);
      const [nextLon, nextLat] = getPositionAtProgress(
        flight.start,
        flight.end,
        nextProgress
      );

      // Calculate bearing from current position to next position
      const bearing = calculateBearing([lon, lat], [nextLon, nextLat]);

      // Based on deck.gl scenegraph example:
      // Orientation format: [pitch, yaw, roll] in DEGREES (not radians!)
      // - pitch: 0 for level flight (we don't have vertical rate)
      // - yaw: -bearing (negated, like in the example with TRUE_TRACK)
      // - roll: 90 degrees (this rotates the model to correct orientation)
      const pitch = 0; // Level flight
      const yaw = -bearing; // Negated bearing in degrees
      const roll = 90; // Rotate model 90 degrees

      return {
        position: [lon, lat, 500000], // Same height as arcs
        orientation: [pitch, yaw, roll], // [pitch, yaw, roll] in DEGREES
      };
    });
  }, [flights]);

  // Create animated arc layer in white + scenegraph layer for airplanes
  const layers = useMemo(() => {
    if (animatedFlights.length === 0) return null;

    const animatedLayer = new AnimatedArcLayer<(typeof animatedFlights)[0]>({
      id: `flights-animated-${selectedFlightIndex ?? "none"}`,
      data: animatedFlights,
      getSourcePosition: (d: (typeof animatedFlights)[0]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [d.lon1, d.lat1, d.alt1] as any;
      },
      getTargetPosition: (d: (typeof animatedFlights)[0]) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return [d.lon2, d.lat2, d.alt2] as any;
      },
      getSourceTimestamp: (d: (typeof animatedFlights)[0]) => d.time1,
      getTargetTimestamp: (d: (typeof animatedFlights)[0]) => d.time2,
      getHeight: 0.3,
      getWidth: 2,
      timeRange,
      getSourceColor: (d: (typeof animatedFlights)[0]) => {
        // Blue color for selected: rgba(59, 130, 246, 255)
        // White color for unselected: rgba(255, 255, 255, 255)
        const isSelected = selectedFlightIndex === d.flightIndex;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (isSelected ? [59, 130, 246, 255] : [255, 255, 255, 255]) as any;
      },
      getTargetColor: (d: (typeof animatedFlights)[0]) => {
        const isSelected = selectedFlightIndex === d.flightIndex;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (isSelected ? [59, 130, 246, 255] : [255, 255, 255, 255]) as any;
      },
      updateTriggers: {
        getSourceColor: [selectedFlightIndex],
        getTargetColor: [selectedFlightIndex],
        data: selectedFlightIndex,
      },
      parameters: { cullMode: "none" },
      beforeId: "watername_ocean",
      greatCircle: true,
      numSegments: 100,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const scenegraphLayer = new ScenegraphLayer<(typeof airplaneData)[0]>({
      id: "airplanes",
      data: airplaneData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getPosition: (d: (typeof airplaneData)[0]) => d.position as any,
      getOrientation: (d: (typeof airplaneData)[0]) =>
        d.orientation as [number, number, number],
      scenegraph: AIRPLANE_MODEL_URL,
      sizeScale: 1000,
      _animations: {
        "*": {
          speed: 1,
        },
      },
      _lighting: "flat",
      pickable: true,
    });

    return [animatedLayer, scenegraphLayer];
  }, [animatedFlights, timeRange, airplaneData, selectedFlightIndex]);

  const handleFlightClick = useCallback((index: number, flight: Flight) => {
    setSelectedFlightIndex(index);

    // Calculate center point between start and end
    const centerLon = (flight.start[0] + flight.end[0]) / 2;
    const centerLat = (flight.start[1] + flight.end[1]) / 2;

    // Calculate bounds to fit both points
    const minLon = Math.min(flight.start[0], flight.end[0]);
    const maxLon = Math.max(flight.start[0], flight.end[0]);
    const minLat = Math.min(flight.start[1], flight.end[1]);
    const maxLat = Math.max(flight.start[1], flight.end[1]);

    // Calculate zoom level based on distance
    const lonDiff = maxLon - minLon;
    const latDiff = maxLat - minLat;
    const maxDiff = Math.max(lonDiff, latDiff);

    // Estimate zoom level (adjust these values as needed)
    let zoom = 2;
    if (maxDiff < 0.1) zoom = 6;
    else if (maxDiff < 0.5) zoom = 5;
    else if (maxDiff < 1) zoom = 4;
    else if (maxDiff < 5) zoom = 3;
    else zoom = 2;

    // Use the map ref to fly to the location
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map && typeof map.flyTo === "function") {
        map.flyTo({
          center: [centerLon, centerLat],
          zoom: zoom,
          duration: 1500,
        });
      }
    }
  }, []);

  return (
    <div
      style={{
        position: "absolute",
        height: "100%",
        width: "100%",
        top: 0,
        left: 0,
        background: "linear-gradient(0, #000, #223)",
      }}
    >
      <Map
        ref={mapRef}
        key={`${projection}`}
        projection={projection}
        id="map"
        {...viewState}
        onMove={(evt) => setViewState(evt.viewState)}
        mapStyle={DARK_STYLE_URL}
        dragRotate={false}
        maxPitch={0}
        style={{ width: "100%", height: "100%" }}
      >
        {layers && <DeckGLOverlay layers={layers} interleaved={true} />}
      </Map>
      <FlightList
        flights={flights}
        onFlightClick={handleFlightClick}
        selectedFlightIndex={selectedFlightIndex}
      />
      <MapControls projection={projection} onProjectionChange={setProjection} />
    </div>
  );
}

// Wrapper component
export function DefinitiveDemoWrapper() {
  return <DefinitiveDemo />;
}
