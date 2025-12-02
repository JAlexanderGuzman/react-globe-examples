export type MapProjection = "globe" | "mercator";

export type LayerType = "animated" | "arc";

export type MapStyle =
  | "light-v9"
  | "dark-v9"
  | "streets-v12"
  | "outdoors-v12"
  | "satellite-v9"
  | "satellite-streets-v12";

export interface MapStyleOption {
  id: MapStyle;
  label: string;
  description: string;
  url: string;
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: "light-v9",
    label: "Light",
    description: "Light theme",
    url: "mapbox://styles/mapbox/light-v9",
  },
  {
    id: "dark-v9",
    label: "Dark",
    description: "Dark theme",
    url: "mapbox://styles/mapbox/dark-v9",
  },
  {
    id: "streets-v12",
    label: "Streets",
    description: "Street map style",
    url: "mapbox://styles/mapbox/streets-v12",
  },
  {
    id: "outdoors-v12",
    label: "Outdoors",
    description: "Outdoor style",
    url: "mapbox://styles/mapbox/outdoors-v12",
  },
  {
    id: "satellite-v9",
    label: "Satellite",
    description: "Satellite imagery",
    url: "mapbox://styles/mapbox/satellite-v9",
  },
  {
    id: "satellite-streets-v12",
    label: "Satellite Streets",
    description: "Satellite with street labels",
    url: "mapbox://styles/mapbox/satellite-streets-v12",
  },
];

