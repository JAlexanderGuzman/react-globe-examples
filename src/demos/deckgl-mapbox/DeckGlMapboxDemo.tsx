import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { Map, NavigationControl, useControl, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import "./DeckGlMapboxDemo.css";
import flightsData from "../../flights.json";
import AnimatedArcLayer from "./animated-arc-group-layer";
import { MapControls } from "./MapControls";
import { MAP_STYLES } from "./types";
import type { MapProjection, MapStyle, LayerType } from "./types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

const ANIMATION_SPEED = 50; // Time increment per frame (milliseconds)
const TIME_WINDOW = 2000; // Time window in milliseconds

interface Flight {
  start: [number, number];
  end: [number, number];
  progress: number;
}

const buildings3DLayer = {
  id: "3d-buildings",
  source: "composite",
  "source-layer": "building",
  filter: ["==", "extrude", "true"],
  type: "fill-extrusion",
  minzoom: 14,
  paint: {
    "fill-extrusion-color": "#ccc",
    "fill-extrusion-height": ["get", "height"],
  },
};

function DeckGLOverlay(props: any) {
  const overlay = useControl(() => new MapboxOverlay(props));
  overlay.setProps(props);
  return null;
}

export function DeckGlMapboxDemo() {
  const mapRef = useRef<any>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [projectionState, setProjectionState] =
    useState<MapProjection>("globe");
  const [mapStyle, setMapStyle] = useState<MapStyle>("light-v9");
  const [layerType, setLayerType] = useState<LayerType>("animated");

  // Force mercator when using ArcLayer (globe mode not supported)
  const projection: MapProjection = useMemo(() => {
    if (layerType === "arc" && projectionState === "globe") {
      return "mercator";
    }
    return projectionState;
  }, [layerType, projectionState]);

  const onMapLoad = useCallback(() => {
    // Map loaded
  }, []);

  const flights = flightsData as Flight[];

  // Convert flights.json format to animated arc format
  const animatedFlights = useMemo(() => {
    return flights.map((flight, index) => {
      // Create a time range for each flight
      // Each flight gets a time window, and we animate through them
      const baseTime = index * 1000; // Each flight starts at a different base time
      const duration = 1000; // Duration of each flight animation

      return {
        time1: baseTime,
        time2: baseTime + duration,
        lon1: flight.start[0],
        lat1: flight.start[1],
        alt1: 0,
        lon2: flight.end[0],
        lat2: flight.end[1],
        alt2: 0,
      };
    });
  }, [flights]);

  // Animate time in infinite loop (only for animated layer)
  useEffect(() => {
    if (layerType !== "animated") return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const animate = (timestamp: number) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      setCurrentTime((prev) => {
        const increment = (ANIMATION_SPEED * delta) / 16.67; // Normalize to 60fps
        const maxTime =
          animatedFlights.length > 0
            ? Math.max(...animatedFlights.map((f) => f.time2))
            : 20000;
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
  }, [animatedFlights, layerType]);

  // Calculate time range based on current time
  const timeRange: [number, number] = useMemo(() => {
    return [currentTime, currentTime + TIME_WINDOW];
  }, [currentTime]);

  const currentStyleUrl = useMemo(() => {
    const style = MAP_STYLES.find((s) => s.id === mapStyle);
    return style?.url || MAP_STYLES[0].url;
  }, [mapStyle]);

  const handleProjectionChange = (newProjection: MapProjection) => {
    // Don't allow globe when using ArcLayer
    if (layerType === "arc" && newProjection === "globe") {
      return;
    }
    setProjectionState(newProjection);
  };

  const layers = useMemo(() => {
    if (layerType === "arc") {
      // Standard ArcLayer - following deck.gl arc example
      const arcLayer = new ArcLayer({
        id: "flight-arcs",
        data: flights,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getSourcePosition: (d: Flight) => d.start as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        getTargetPosition: (d: Flight) => d.end as any,
        getSourceColor: [64, 196, 255, 200],
        getTargetColor: [255, 64, 196, 200],
        getWidth: 4,
        getHeight: 1,
        numSegments: 100,
        pickable: true,
        greatCircle: true,
        widthMinPixels: 1,
        widthMaxPixels: 4,
      });

      return [arcLayer];
    } else {
      // AnimatedArcLayer
      if (animatedFlights.length === 0) return [];
      return [
        new AnimatedArcLayer<(typeof animatedFlights)[0]>({
          id: "flights",
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
          getSourceColor: [63, 81, 181],
          getTargetColor: [63, 181, 173],
          parameters: { cullMode: "none" },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any),
      ];
    }
  }, [flights, animatedFlights, timeRange, layerType]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="error-message">
        <h2>Mapbox API Key Missing</h2>
        <p>Please set VITE_MAPBOX_API_KEY in your .env file</p>
      </div>
    );
  }

  return (
    <div className="deckgl-mapbox-demo">
      <Map
        key={`${projection}-${mapStyle}`}
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle={currentStyleUrl}
        antialias={true}
        style={{
          width: "100%",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        projection={projection}
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 2,
          bearing: 0,
          pitch: 0,
        }}
        dragRotate={false}
        maxPitch={0}
        onLoad={onMapLoad}
      >
        {layers.length > 0 && (
          <DeckGLOverlay
            interleaved={projection === "mercator"}
            layers={layers}
          />
        )}
        <NavigationControl />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...(buildings3DLayer as any)} />
      </Map>
      <MapControls
        projection={projection}
        mapStyle={mapStyle}
        layerType={layerType}
        onProjectionChange={handleProjectionChange}
        onStyleChange={setMapStyle}
        onLayerTypeChange={setLayerType}
        styles={MAP_STYLES}
      />
    </div>
  );
}
