export type GlobeMapStyle =
  | "earth-dark"
  | "earth-blue-marble"
  | "earth-night"
  | "earth-topology";

export interface GlobeMapStyleOption {
  id: GlobeMapStyle;
  label: string;
  description: string;
  url: string;
}

export const GLOBE_MAP_STYLES: GlobeMapStyleOption[] = [
  {
    id: "earth-dark",
    label: "Dark",
    description: "Dark Earth texture",
    url: "https://unpkg.com/three-globe/example/img/earth-dark.jpg",
  },
  {
    id: "earth-blue-marble",
    label: "Blue Marble",
    description: "NASA Blue Marble texture",
    url: "https://unpkg.com/three-globe/example/img/earth-blue-marble.jpg",
  },
  {
    id: "earth-night",
    label: "Earth Night",
    description: "Earth with night lights",
    url: "https://unpkg.com/three-globe/example/img/earth-night.jpg",
  },
  {
    id: "earth-topology",
    label: "Topology",
    description: "Topological map texture",
    url: "https://unpkg.com/three-globe/example/img/earth-topology.png",
  },
];

