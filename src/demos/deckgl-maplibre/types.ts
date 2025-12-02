export type MapProjection = "globe" | "mercator";

export type LayerType = "animated" | "arc";

export type MapStyle =
  | "dark-matter"
  | "positron"
  | "voyager"
  | "osm-bright"
  | "dark-matter-nolabels"
  | "positron-nolabels"
  | "voyager-nolabels";

export interface MapStyleOption {
  id: MapStyle;
  label: string;
  description: string;
  url: string;
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: "dark-matter",
    label: "Dark Matter",
    description: "Dark theme with labels",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  {
    id: "positron",
    label: "Positron",
    description: "Light theme with labels",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  {
    id: "voyager",
    label: "Voyager",
    description: "Colorful theme with labels",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  {
    id: "osm-bright",
    label: "OSM Bright",
    description: "OpenStreetMap bright style",
    url: "https://basemaps.cartocdn.com/gl/osm-bright-gl-style/style.json",
  },
  {
    id: "dark-matter-nolabels",
    label: "Dark Matter (No Labels)",
    description: "Dark theme without labels",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-nolabels-gl-style/style.json",
  },
  {
    id: "positron-nolabels",
    label: "Positron (No Labels)",
    description: "Light theme without labels",
    url: "https://basemaps.cartocdn.com/gl/positron-nolabels-gl-style/style.json",
  },
  {
    id: "voyager-nolabels",
    label: "Voyager (No Labels)",
    description: "Colorful theme without labels",
    url: "https://basemaps.cartocdn.com/gl/voyager-nolabels-gl-style/style.json",
  },
];

