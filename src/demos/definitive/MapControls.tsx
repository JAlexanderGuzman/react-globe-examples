import "./MapControls.css";
import type { MapProjection } from "./types";

interface MapControlsProps {
  projection: MapProjection;
  onProjectionChange: (projection: MapProjection) => void;
}

export function MapControls({
  projection,
  onProjectionChange,
}: MapControlsProps) {
  return (
    <div className="map-controls">
      <button
        type="button"
        className={`control-btn ${projection === "globe" ? "active" : ""}`}
        onClick={() => onProjectionChange("globe")}
        aria-label="Globe projection"
        title="Globe projection"
      >
        🌍
      </button>
      <button
        type="button"
        className={`control-btn ${projection === "mercator" ? "active" : ""}`}
        onClick={() => onProjectionChange("mercator")}
        aria-label="Mercator projection"
        title="Mercator projection"
      >
        🗺️
      </button>
    </div>
  );
}

