// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, useControl } from "react-map-gl/maplibre";
import type { ViewState, MapRef } from "react-map-gl/maplibre";
import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";

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

const ANIMATION_SPEED = 10; // Time increment per frame (milliseconds) - increased for faster animation
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

function FlightList({
  flights,
  onFlightClick,
  selectedFlightIndex,
}: {
  flights: Flight[];
  onFlightClick: (index: number, flight: Flight) => void;
  selectedFlightIndex: number | null;
}) {
  const itemRefs = useRef<{ [key: number]: HTMLDivElement | null }>({});

  // Scroll to selected item when it changes
  useEffect(() => {
    if (selectedFlightIndex !== null && itemRefs.current[selectedFlightIndex]) {
      itemRefs.current[selectedFlightIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedFlightIndex]);

  return (
    <div className="flight-list-panel">
      <h3 className="flight-list-title">Flights</h3>
      <div className="flight-list">
        {flights.map((flight, index) => (
          <div
            key={index}
            ref={(el) => {
              itemRefs.current[index] = el;
            }}
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
  const [flightToFocus, setFlightToFocus] = useState<{
    center: [number, number];
    zoom: number;
  } | null>(null);
  const mapRef = useRef<MapRef>(null);

  const flights = flightsData as Flight[];

  // Handle map flyTo when flightToFocus changes
  useEffect(() => {
    if (!flightToFocus || !mapRef.current) return;

    const map = mapRef.current.getMap();
    if (map && typeof map.flyTo === "function") {
      map.flyTo({
        center: flightToFocus.center,
        zoom: flightToFocus.zoom,
        duration: 1500,
      });
    }
    // Reset after a delay to avoid cascading renders
    const timeoutId = setTimeout(() => {
      setFlightToFocus(null);
    }, 1600); // Slightly longer than flyTo duration

    return () => clearTimeout(timeoutId);
  }, [flightToFocus]);

  const FLIGHT_DURATION = 2000; // Duration of each flight animation in milliseconds
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
      progress: number;
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
          progress: flight.progress,
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
    // Use a simple linear formula: zoom = 8 - (maxDiff * scale), clamped to [3, 8]
    // You can tweak scale (e.g., 5) for how fast zoom drops with distance
    const scale = 5;
    const zoom = Math.max(3, Math.min(9, 9 - maxDiff * scale));

    // Set flight to focus, which will trigger useEffect to fly to location
    setFlightToFocus({
      center: [centerLon, centerLat],
      zoom: zoom,
    });
  }, []);

  // Create animated arc layer
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
      getProgress: (d: (typeof animatedFlights)[0]) => d.progress,
      getHeight: 0.2,
      getWidth: 3,
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
      pickable: true,
      onClick: (info: { object?: (typeof animatedFlights)[0] }) => {
        if (info.object) {
          const flightIndex = info.object.flightIndex;
          const flight = flights[flightIndex];
          if (flight) {
            handleFlightClick(flightIndex, flight);
          }
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    return [animatedLayer];
  }, [
    animatedFlights,
    timeRange,
    selectedFlightIndex,
    flights,
    handleFlightClick,
  ]);

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
