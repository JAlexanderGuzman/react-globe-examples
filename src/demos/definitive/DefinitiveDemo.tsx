import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";
import { ScenegraphLayer } from "@deck.gl/mesh-layers";
import "maplibre-gl/dist/maplibre-gl.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { MapRef, ViewState } from "react-map-gl/maplibre";
import { Map, useControl } from "react-map-gl/maplibre";
import airplaneModel from "../../assets/airplane.glb?url";
import flightsData from "../../flights.json";
import AnimatedArcLayer from "./animated-arc-layer";
import "./DefinitiveDemo.css";
import {
  ANIMATION_SPEED,
  COLORS,
  DARK_STYLE_URL,
  FLIGHT_DURATION,
  NUM_CYCLES,
  TIME_WINDOW,
} from "./helpers/constants";
import {
  calculateAirplaneData,
  createAnimatedFlights,
  type Flight,
} from "./helpers/flight-utils";
import { calculateZoomFromBounds } from "./helpers/geographic-calculations";
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

  useEffect(() => {
    if (selectedFlightIndex !== null && itemRefs.current[selectedFlightIndex]) {
      itemRefs.current[selectedFlightIndex]?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    }
  }, [selectedFlightIndex]);

  const formatCoordinate = (coord: [number, number]): string =>
    `[${coord[0].toFixed(4)}, ${coord[1].toFixed(4)}]`;

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
                  {formatCoordinate(flight.start)}
                </span>
              </div>
              <div className="coordinate-row">
                <span className="coordinate-label">End:</span>
                <span className="coordinate-value">
                  {formatCoordinate(flight.end)}
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

  const airplaneData = useMemo(
    () =>
      flights.map((flight, index) =>
        calculateAirplaneData(flight, index, projection)
      ),
    [flights, projection]
  );

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

  const animatedFlights = useMemo(
    () => createAnimatedFlights(flights),
    [flights]
  );

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

    const centerLon = (flight.start[0] + flight.end[0]) / 2;
    const centerLat = (flight.start[1] + flight.end[1]) / 2;
    const minLon = Math.min(flight.start[0], flight.end[0]);
    const maxLon = Math.max(flight.start[0], flight.end[0]);
    const minLat = Math.min(flight.start[1], flight.end[1]);
    const maxLat = Math.max(flight.start[1], flight.end[1]);

    const zoom = calculateZoomFromBounds(minLon, maxLon, minLat, maxLat);

    setFlightToFocus({
      center: [centerLon, centerLat],
      zoom,
    });
  }, []);

  const createLayerClickHandler = useCallback(
    (flightIndex: number) => {
      const flight = flights[flightIndex];
      if (flight) {
        handleFlightClick(flightIndex, flight);
      }
    },
    [flights, handleFlightClick]
  );

  const getArcColor = useCallback(
    (flightIndex: number) =>
      selectedFlightIndex === flightIndex ? COLORS.SELECTED : COLORS.UNSELECTED,
    [selectedFlightIndex]
  );

  type AnimatedFlight = (typeof animatedFlights)[0];
  type AirplaneDataItem = (typeof airplaneData)[0];

  const layers = useMemo(() => {
    if (animatedFlights.length === 0) return null;

    const animatedLayer = new AnimatedArcLayer<AnimatedFlight>({
      id: `flights-animated-${selectedFlightIndex ?? "none"}`,
      data: animatedFlights,
      getSourcePosition: (d: AnimatedFlight) =>
        [d.lon1, d.lat1, d.alt1] as [number, number, number],
      getTargetPosition: (d: AnimatedFlight) =>
        [d.lon2, d.lat2, d.alt2] as [number, number, number],
      getSourceTimestamp: (d: AnimatedFlight) => d.time1,
      getTargetTimestamp: (d: AnimatedFlight) => d.time2,
      getProgress: (d: AnimatedFlight) => d.progress,
      getHeight: 0.2,
      getWidth: 3,
      timeRange,
      getSourceColor: (d: AnimatedFlight) => getArcColor(d.flightIndex),
      getTargetColor: (d: AnimatedFlight) => getArcColor(d.flightIndex),
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
      onClick: (info: { object?: AnimatedFlight }) => {
        if (info.object) {
          createLayerClickHandler(info.object.flightIndex);
        }
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);

    const scenegraphLayer = new ScenegraphLayer<AirplaneDataItem>({
      id: "airplanes",
      data: airplaneData,
      getPosition: (d: AirplaneDataItem) =>
        d.position as [number, number, number],
      getOrientation: (d: AirplaneDataItem) => d.orientation,
      getColor: (d: AirplaneDataItem) =>
        selectedFlightIndex === d.flightIndex
          ? COLORS.AIRPLANE_SELECTED
          : COLORS.AIRPLANE_UNSELECTED,
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
      onClick: (info: { object?: AirplaneDataItem }) => {
        if (info.object) {
          createLayerClickHandler(info.object.flightIndex);
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
    airplaneData,
    getArcColor,
    createLayerClickHandler,
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

export function DefinitiveDemoWrapper() {
  return <DefinitiveDemo />;
}
