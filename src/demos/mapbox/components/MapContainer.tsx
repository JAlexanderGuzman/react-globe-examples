import { useRef, useEffect, useState } from "react";
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

const API_KEY = import.meta.env.VITE_MAPBOX_API_KEY;

export function MapContainer() {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const controlsAddedRef = useRef(false);
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

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
