import { useEffect, useRef, useState } from "react";
import Globe from "globe.gl";
import { MapControls } from "./MapControls";
import { GLOBE_MAP_STYLES } from "./types";
import type { GlobeMapStyle } from "./types";
import "./GlobeGlDemo.css";

export function GlobeGlDemo() {
  const globeEl = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globeRef = useRef<any>(null);
  const [mapStyle, setMapStyle] = useState<GlobeMapStyle>("earth-dark");

  useEffect(() => {
    if (!globeEl.current) return;

    // Initialize globe
    const globe = new Globe(globeEl.current)
      .globeImageUrl(GLOBE_MAP_STYLES.find((s) => s.id === mapStyle)?.url || "")
      .backgroundColor("rgba(0, 0, 0, 0)")
      .showAtmosphere(true)
      .atmosphereColor("#3a228a")
      .atmosphereAltitude(0.15);

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
      console.warn(`Failed to load texture: ${styleUrl} for style: ${mapStyle}`);
      // Fallback to default texture (blue marble)
      const defaultUrl = GLOBE_MAP_STYLES[0]?.url || "";
      if (defaultUrl && globeRef.current) {
        globeRef.current.globeImageUrl(defaultUrl);
      }
    };
    img.src = styleUrl;
  }, [mapStyle]);

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

