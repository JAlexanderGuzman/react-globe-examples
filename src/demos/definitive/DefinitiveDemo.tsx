import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapRef, ViewState } from "react-map-gl/maplibre";
import { Map, useControl } from "react-map-gl/maplibre";
import airplaneModel from "../../assets/airplane.glb?url";
import flightsData from "../../flights.json";
import AnimatedArcLayer from "./animated-arc-group-layer";
import "./DefinitiveDemo.css";
import { MapControls } from "./MapControls";
import type { MapProjection } from "./types";

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

  // Calculate bearing (direction) from start to end point
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

  // Calculate great circle distance in meters (same as ArcLayer uses)
  const EARTH_RADIUS = 6371000; // Earth radius in meters
  const calculateGreatCircleDistance = (
    start: [number, number],
    end: [number, number]
  ): number => {
    const lat1 = (start[1] * Math.PI) / 180;
    const lon1 = (start[0] * Math.PI) / 180;
    const lat2 = (end[1] * Math.PI) / 180;
    const lon2 = (end[0] * Math.PI) / 180;

    // Normalize longitude difference
    let lonDiff = lon2 - lon1;
    if (lonDiff > Math.PI) lonDiff -= 2 * Math.PI;
    if (lonDiff < -Math.PI) lonDiff += 2 * Math.PI;

    // Great circle distance in radians
    const angularDist = Math.acos(
      Math.sin(lat1) * Math.sin(lat2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.cos(lonDiff)
    );

    // Convert to meters
    return angularDist * EARTH_RADIUS;
  };

  // Replicate ArcLayer's paraboloid function to calculate arc height
  // This matches the calculation in arc-layer-vertex.glsl.ts
  const calculateArcHeight = (
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

    // Handle negative deltaZ by flipping
    const dir = deltaZ < 0 ? 1 : 0;
    const z0 = dir === 0 ? sourceZ : targetZ;
    const r = dir === 0 ? ratio : 1.0 - ratio;

    return Math.sqrt(r * (p2 - r)) * dh + z0;
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

  // Calculate airplane positions and orientations based on progress
  // Based on deck.gl scenegraph example: https://github.com/visgl/deck.gl/tree/9.2-release/examples/website/scenegraph
  const ARC_HEIGHT = 0.2; // Same as getHeight in AnimatedArcLayer
  const airplaneData = useMemo(() => {
    return flights.map((flight, index) => {
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

      // Calculate arc height at this progress point
      // Replicate the same calculation ArcLayer uses
      const distance = calculateGreatCircleDistance(flight.start, flight.end);
      const progressRatio = flight.progress / 100; // Convert to 0-1
      const sourceZ = 0; // Arc starts at ground level
      const targetZ = 0; // Arc ends at ground level
      const arcHeight = calculateArcHeight(
        distance,
        sourceZ,
        targetZ,
        progressRatio,
        ARC_HEIGHT
      );
      // Elevate airplane 50 meters above the arc
      const airplaneHeight = arcHeight;

      // Based on deck.gl scenegraph example:
      // Orientation format: [pitch, yaw, roll] in DEGREES (not radians!)
      // - pitch: 0 for level flight (we don't have vertical rate)
      // - yaw: -bearing (negated, like in the example with TRUE_TRACK)
      // - roll: 90 degrees (this rotates the model to correct orientation)
      const mapType = projection === "mercator" ? "mercator" : "globe";
      const pitch = 0; // Level flight
      const yaw = mapType === "mercator" ? -bearing + 90 : -bearing - 90; // Negated bearing in degrees
      const roll = 90; // Rotate model 90 degrees

      return {
        position: [lon, lat, airplaneHeight], // Height calculated from arc + 50 meters above
        orientation: [pitch, yaw, roll], // [pitch, yaw, roll] in DEGREES
        flightIndex: index,
      };
    });
  }, [flights, projection]);

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

    const scenegraphLayer = new ScenegraphLayer<(typeof airplaneData)[0]>({
      id: "airplanes",
      data: airplaneData,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getPosition: (d: (typeof airplaneData)[0]) => d.position as any,
      getOrientation: (d: (typeof airplaneData)[0]) =>
        d.orientation as [number, number, number],
      getColor: (d: (typeof airplaneData)[0]) => {
        const isSelected = selectedFlightIndex === d.flightIndex;
        // Blue when not selected: rgba(59, 130, 246, 255)
        // Light gray when selected: rgba(200, 200, 200, 255)
        return isSelected ? [200, 200, 200, 255] : [59, 130, 246, 255];
      },
      scenegraph: airplaneModel,
      sizeScale: 1,
      _animations: {
        "*": {
          speed: 1,
        },
      },
      sizeMinPixels: 3,
      sizeMaxPixels: 3,
      _lighting: "flat",
      pickable: true,
      onClick: (info: { object?: (typeof airplaneData)[0] }) => {
        if (info.object) {
          const flightIndex = info.object.flightIndex;
          const flight = flights[flightIndex];
          if (flight) {
            handleFlightClick(flightIndex, flight);
          }
        }
      },
      updateTriggers: {
        getColor: [selectedFlightIndex],
      },
    });

    return [animatedLayer, scenegraphLayer];
  }, [
    animatedFlights,
    timeRange,
    selectedFlightIndex,
    flights,
    handleFlightClick,
    airplaneData,
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
