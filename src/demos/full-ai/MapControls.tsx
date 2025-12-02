import "./MapControls.css";
import type { MapProjection } from "./types";

interface MapControlsProps {
  projection: MapProjection;
  onProjectionChange: (projection: MapProjection) => void;
  showLabels: boolean;
  onToggleLabels: () => void;
}

export function MapControls({
  projection,
  onProjectionChange,
  showLabels,
  onToggleLabels,
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
        title="Flat projection"
      >
        🗺️
      </button>
      <button
        type="button"
        className={`control-btn ${showLabels ? "active" : ""}`}
        onClick={onToggleLabels}
        aria-label="Toggle labels"
        title={showLabels ? "Hide labels" : "Show labels"}
      >
        🏷️
      </button>
    </div>
  );
}
