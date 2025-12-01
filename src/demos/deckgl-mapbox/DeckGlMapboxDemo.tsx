import { useCallback, useRef, useMemo } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { Map, NavigationControl, useControl, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import "./DeckGlMapboxDemo.css";
import flightsData from "../../flights.json";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

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

  const onMapLoad = useCallback(() => {
    // Map loaded
  }, []);

  const flights = flightsData as Flight[];

  const layers = useMemo(() => {
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

    const layersArray: any[] = [arcLayer];

    // Note: Airplane layer removed - ScatterplotLayer doesn't properly position at arc height
    // with MapboxOverlay. Would need SimpleMeshLayer with proper 3D geometry to work correctly.

    return layersArray;
  }, [flights]);

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
        ref={mapRef}
        mapboxAccessToken={MAPBOX_TOKEN}
        mapStyle="mapbox://styles/mapbox/light-v9"
        antialias={true}
        style={{
          width: "100%",
          height: "100vh",
          position: "absolute",
          top: 0,
          left: 0,
        }}
        projection="mercator"
        initialViewState={{
          longitude: 0,
          latitude: 20,
          zoom: 2,
          bearing: 0,
          pitch: 0,
        }}
        onLoad={onMapLoad}
      >
        <DeckGLOverlay interleaved={true} layers={layers} />
        <NavigationControl />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Layer {...(buildings3DLayer as any)} />
      </Map>
      <div className="projection-controls">
        <div className="projection-info">
          <span>Mercator mode only</span>
          <small>Globe mode not supported with deck.gl</small>
        </div>
      </div>
    </div>
  );
}
