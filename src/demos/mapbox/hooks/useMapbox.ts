import { useEffect, useRef, useState, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { MapProjection, MapStyle } from "../types";
import {
  DEFAULT_MAP_STYLE,
  DEFAULT_PROJECTION,
  DEFAULT_CENTER,
  DEFAULT_ZOOM,
} from "../constants";

interface UseMapboxOptions {
  container: HTMLDivElement | null;
  initialStyle?: MapStyle;
  initialProjection?: MapProjection;
  initialCenter?: [number, number];
  initialZoom?: number;
}

interface UseMapboxReturn {
  map: mapboxgl.Map | null;
  mapStyle: MapStyle;
  projection: MapProjection;
  isMapLoaded: boolean;
  changeStyle: (style: MapStyle) => void;
  changeProjection: (projection: MapProjection) => void;
}

const getApiKey = (): string | null => {
  const apiKey = import.meta.env.VITE_MAPBOX_API_KEY;
  if (!apiKey) {
    console.error("VITE_MAPBOX_API_KEY is not set in environment variables");
  }
  return apiKey || null;
};

export function useMapbox({
  container,
  initialStyle = DEFAULT_MAP_STYLE,
  initialProjection = DEFAULT_PROJECTION,
  initialCenter = DEFAULT_CENTER,
  initialZoom = DEFAULT_ZOOM,
}: UseMapboxOptions): UseMapboxReturn {
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const initializedRef = useRef(false);
  const initialValuesRef = useRef({
    style: initialStyle,
    projection: initialProjection,
    center: initialCenter,
    zoom: initialZoom,
  });

  const [map, setMap] = useState<mapboxgl.Map | null>(null);
  const [mapStyle, setMapStyle] = useState<MapStyle>(initialStyle);
  const [projection, setProjection] =
    useState<MapProjection>(initialProjection);
  const [isMapLoaded, setIsMapLoaded] = useState(false);

  // Initialize Mapbox access token
  useEffect(() => {
    const apiKey = getApiKey();
    if (apiKey) {
      mapboxgl.accessToken = apiKey;
    }
  }, []);

  // Initialize map only once when container is available
  useEffect(() => {
    if (!container || initializedRef.current) return;

    const apiKey = getApiKey();
    if (!apiKey) return;

    const { style, projection, center, zoom } = initialValuesRef.current;

    const map = new mapboxgl.Map({
      container,
      style: `mapbox://styles/mapbox/${style}`,
      center,
      zoom,
      projection,
    });

    const handleLoad = () => {
      setIsMapLoaded(true);
    };

    map.on("load", handleLoad);
    mapRef.current = map;
    setMap(map);
    initializedRef.current = true;

    return () => {
      if (mapRef.current) {
        mapRef.current.off("load", handleLoad);
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMap(null);
      setIsMapLoaded(false);
      initializedRef.current = false;
    };
  }, [container]);

  // Update map style
  const changeStyle = useCallback(
    (style: MapStyle) => {
      if (!mapRef.current || style === mapStyle) return;

      setIsMapLoaded(false);
      mapRef.current.setStyle(`mapbox://styles/mapbox/${style}`);

      mapRef.current.once("style.load", () => {
        setIsMapLoaded(true);
      });

      setMapStyle(style);
    },
    [mapStyle]
  );

  // Update projection
  const changeProjection = useCallback(
    (newProjection: MapProjection) => {
      if (!mapRef.current || newProjection === projection) return;

      mapRef.current.setProjection(newProjection);
      setProjection(newProjection);
    },
    [projection]
  );

  return {
    map,
    mapStyle,
    projection,
    isMapLoaded,
    changeStyle,
    changeProjection,
  };
}
