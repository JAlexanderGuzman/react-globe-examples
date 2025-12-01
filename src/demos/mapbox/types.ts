export type MapProjection = "globe" | "mercator";

export type MapStyle =
  | "streets-v12"
  | "outdoors-v12"
  | "light-v11"
  | "dark-v11"
  | "satellite-v9"
  | "satellite-streets-v12"
  | "navigation-day-v1"
  | "navigation-night-v1";

export interface MapStyleOption {
  id: MapStyle;
  label: string;
  description: string;
}

export const MAP_STYLES: MapStyleOption[] = [
  {
    id: "streets-v12",
    label: "Streets",
    description: "Detailed street map with labels",
  },
  {
    id: "outdoors-v12",
    label: "Outdoors",
    description: "Topographic map for outdoor activities",
  },
  {
    id: "light-v11",
    label: "Light",
    description: "Light-themed minimal map",
  },
  {
    id: "dark-v11",
    label: "Dark",
    description: "Dark-themed minimal map",
  },
  {
    id: "satellite-v9",
    label: "Satellite",
    description: "Satellite imagery",
  },
  {
    id: "satellite-streets-v12",
    label: "Satellite Streets",
    description: "Satellite imagery with street labels",
  },
  {
    id: "navigation-day-v1",
    label: "Navigation Day",
    description: "Optimized for daytime navigation",
  },
  {
    id: "navigation-night-v1",
    label: "Navigation Night",
    description: "Optimized for nighttime navigation",
  },
];

