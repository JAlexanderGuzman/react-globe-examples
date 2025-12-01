import { useCallback, useState, useRef, useMemo, useEffect } from "react";
import { MapboxOverlay } from "@deck.gl/mapbox";
import { ArcLayer } from "@deck.gl/layers";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { scaleLog } from "d3-scale";
import { cellToLatLng } from "h3-js";
import { load } from "@loaders.gl/core";
import { CSVLoader } from "@loaders.gl/csv";
import { Map, NavigationControl, useControl, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import "./DeckGlMapboxDemo.css";

const DATA_URL =
  "https://raw.githubusercontent.com/visgl/deck.gl-data/master/examples/safegraph/sf-pois.csv";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_API_KEY;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const colorScale = (scaleLog() as any).domain([10, 100, 1000, 10000]).range([
  [255, 255, 178],
  [254, 204, 92],
  [253, 141, 60],
  [227, 26, 28],
]);

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
  const [selectedPOI, setSelectedPOI] = useState("8a283082aa17fff");
  const [firstLabelLayerId, setFirstLabelLayerId] = useState<
    string | undefined
  >();
  const [data, setData] = useState<any>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    load(DATA_URL, CSVLoader).then((loadedData) => {
      setData(loadedData.data);
    });
  }, []);

  const onMapLoad = useCallback(() => {
    if (mapRef.current) {
      const map = mapRef.current.getMap();
      if (map) {
        setFirstLabelLayerId(getFirstLabelLayerId(map.getStyle()));
      }
    }
  }, []);

  const selectedPOICentroid = useMemo(() => {
    const [lat, lng] = cellToLatLng(selectedPOI);
    return [lng, lat];
  }, [selectedPOI]);

  const arcs = useMemo(
    () => filterArcs(data, selectedPOI),
    [data, selectedPOI]
  );

  const hexes = useMemo(() => aggregateHexes(data), [data]);

  const layers = useMemo(() => {
    if (!data || !arcs || !hexes) return [];

    const arcLayer = new ArcLayer({
      id: "deckgl-connections",
      data: arcs,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getSourcePosition: () => selectedPOICentroid as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getTargetPosition: (d: any) => [d.home_lng, d.home_lat] as any,
      getSourceColor: [255, 0, 128],
      getTargetColor: [0, 200, 255],
      getWidth: (d: any) => Math.max(2, d.count / 15),
    });

    const poiLayer = new H3HexagonLayer({
      id: "deckgl-pois",
      data: hexes,
      opacity: 0.4,
      pickable: true,
      autoHighlight: true,
      onClick: ({ object }: any) => object && setSelectedPOI(object.hex),
      getHexagon: (d: any) => d.hex,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getFillColor: (d: any) => {
        const color = colorScale(d.count);
        return [color[0], color[1], color[2], 255];
      },
      extruded: false,
      stroked: false,
      beforeId: firstLabelLayerId,
    });

    return [poiLayer, arcLayer];
  }, [arcs, hexes, selectedPOICentroid, firstLabelLayerId, data]);

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
          longitude: -122.4034,
          latitude: 37.7845,
          zoom: 15.5,
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

function filterArcs(data: any, selectedPOI: string) {
  if (!data) {
    return null;
  }
  return data.filter((d: any) => d.hex === selectedPOI);
}

function aggregateHexes(data: any) {
  if (!data) {
    return null;
  }
  const result: any = {};
  for (const object of data) {
    if (!result[object.hex]) {
      result[object.hex] = { hex: object.hex, count: 0 };
    }
    result[object.hex].count += object.count;
  }
  return Object.values(result);
}

function getFirstLabelLayerId(style: any) {
  const layers = style.layers;
  // Find the index of the first symbol (i.e. label) layer in the map style
  for (let i = 0; i < layers.length; i++) {
    if (layers[i].type === "symbol") {
      return layers[i].id;
    }
  }
  return undefined;
}
