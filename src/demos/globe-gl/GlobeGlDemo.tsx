import { useEffect, useRef, useState, useMemo } from "react";
import Globe from "globe.gl";
import { MapControls } from "./MapControls";
import { GLOBE_MAP_STYLES } from "./types";
import type { GlobeMapStyle } from "./types";
import flightsData from "../../flights.json";
import "./GlobeGlDemo.css";

interface Flight {
  start: [number, number];
  end: [number, number];
  progress: number;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export function GlobeGlDemo() {
  const globeEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [mapStyle, setMapStyle] = useState<GlobeMapStyle>("earth-dark");

  const flights = flightsData as Flight[];

  // Convert flights.json format to globe.gl arcs format
  const arcsData = useMemo<ArcData[]>(() => {
    return flights.map((flight) => ({
      startLat: flight.start[1], // latitude
      startLng: flight.start[0], // longitude
      endLat: flight.end[1], // latitude
      endLng: flight.end[0], // longitude
    }));
  }, [flights]);

  useEffect(() => {
    if (!globeEl.current) return;

    // Initialize globe
    const globe = new Globe(globeEl.current)
      .globeImageUrl(GLOBE_MAP_STYLES.find((s) => s.id === mapStyle)?.url || "")
      .backgroundColor("rgba(0, 0, 0, 0)")
      .showAtmosphere(true)
      .atmosphereColor("#3a228a")
      .atmosphereAltitude(0.1)
      .arcsData(arcsData)
      .arcColor(() => ["rgba(64, 196, 255, 0.8)", "rgba(255, 64, 196, 0.8)"])
      .arcDashLength(0.8)
      .arcDashGap(0.2)
      .arcDashAnimateTime(800)
      .arcStroke(1)
      .arcsTransitionDuration(100);

    globeRef.current = globe;

    return () => {
      // Cleanup - remove all event listeners and clear the container
      if (globeRef.current && globeEl.current) {
        // Clear the container
        globeEl.current.innerHTML = "";
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only initialize once

  // Update globe image when style changes
  useEffect(() => {
    if (!globeRef.current) return;

    const styleOption = GLOBE_MAP_STYLES.find((s) => s.id === mapStyle);
    const styleUrl = styleOption?.url || "";

    if (!styleUrl) {
      console.warn(`No URL found for style: ${mapStyle}`);
      return;
    }

    // Preload image to check if it exists
    const img = new Image();
    img.onload = () => {
      // Image loaded successfully, set it on the globe
      if (globeRef.current) {
        globeRef.current.globeImageUrl(styleUrl);
      }
    };
    img.onerror = () => {
      console.warn(
        `Failed to load texture: ${styleUrl} for style: ${mapStyle}`
      );
      // Fallback to default texture (dark)
      const defaultUrl = GLOBE_MAP_STYLES[0]?.url || "";
      if (defaultUrl && globeRef.current) {
        globeRef.current.globeImageUrl(defaultUrl);
      }
    };
    img.src = styleUrl;
  }, [mapStyle]);

  // Update arcs data when flights change
  useEffect(() => {
    if (!globeRef.current) return;
    globeRef.current.arcsData(arcsData);
  }, [arcsData]);

  return (
    <div className="globe-gl-demo">
      <div ref={globeEl} className="globe-container" />
      <MapControls
        mapStyle={mapStyle}
        onStyleChange={setMapStyle}
        styles={GLOBE_MAP_STYLES}
      />
    </div>
  );
}
