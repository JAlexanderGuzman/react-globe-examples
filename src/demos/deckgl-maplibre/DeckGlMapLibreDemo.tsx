// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

import { useState, useEffect, useMemo } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import { Map, useControl } from "react-map-gl/maplibre";
import type { ViewState } from "react-map-gl/maplibre";
import { MapboxOverlay as DeckOverlay } from "@deck.gl/mapbox";

import { ArcLayer } from "@deck.gl/layers";
import AnimatedArcLayer from "./animated-arc-group-layer";
import { MapControls } from "./MapControls";
import { MAP_STYLES } from "./types";
import type { MapProjection, MapStyle, LayerType } from "./types";
import flightsData from "../../flights.json";

const INITIAL_VIEW_STATE: ViewState = {
  longitude: 0,
  latitude: 20,
  zoom: 2,
  pitch: 0,
  bearing: 0,
  padding: { top: 0, bottom: 0, left: 0, right: 0 },
};

const ANIMATION_SPEED = 50; // Time increment per frame (milliseconds)
const TIME_WINDOW = 2000; // Time window in milliseconds

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

export function DeckGlMapLibreDemo({
  interleaveLabels = true,
}: {
  interleaveLabels?: boolean;
}) {
  const [currentTime, setCurrentTime] = useState(0);
  const [projectionState, setProjectionState] =
    useState<MapProjection>("globe");
  const [mapStyle, setMapStyle] = useState<MapStyle>("dark-matter");
  const [layerType, setLayerType] = useState<LayerType>("animated");

  // Force mercator when using ArcLayer (globe mode not supported)
  const projection: MapProjection = useMemo(() => {
    if (layerType === "arc" && projectionState === "globe") {
      return "mercator";
    }
    return projectionState;
  }, [layerType, projectionState]);

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

  const currentStyleUrl = useMemo(() => {
    const style = MAP_STYLES.find((s) => s.id === mapStyle);
    return style?.url || MAP_STYLES[0].url;
  }, [mapStyle]);

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

  const handleProjectionChange = (newProjection: MapProjection) => {
    // Don't allow globe when using ArcLayer
    if (layerType === "arc" && newProjection === "globe") {
      return;
    }
    setProjectionState(newProjection);
  };

  // Create layers based on layer type
  const layers = useMemo(() => {
    if (layerType === "arc") {
      // Standard ArcLayer - following deck.gl arc example
      // Note: ArcLayer doesn't work well with globe projection, so we force mercator
      return new ArcLayer({
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
    } else {
      // AnimatedArcLayer
      if (animatedFlights.length === 0) return null;
      return new AnimatedArcLayer<(typeof animatedFlights)[0]>({
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
        ...(interleaveLabels ? { beforeId: "watername_ocean" } : {}),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    }
  }, [flights, animatedFlights, timeRange, interleaveLabels, layerType]);

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
        key={`${projection}-${mapStyle}`}
        projection={projection}
        id="map"
        initialViewState={INITIAL_VIEW_STATE}
        mapStyle={currentStyleUrl}
        dragRotate={false}
        maxPitch={0}
        style={{ width: "100%", height: "100%" }}
      >
        {layers && (
          <DeckGLOverlay layers={[layers]} interleaved={interleaveLabels} />
        )}
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

// Wrapper component
export function DeckGlMapLibreDemoWrapper() {
  return <DeckGlMapLibreDemo />;
}
