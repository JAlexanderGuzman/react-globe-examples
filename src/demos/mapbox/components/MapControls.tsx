import { useState, useEffect, useRef, useMemo } from "react";
import "./MapControls.css";
import type { MapProjection, MapStyle, MapStyleOption } from "../types";

interface MapControlsProps {
  projection: MapProjection;
  mapStyle: MapStyle;
  onProjectionChange: (projection: MapProjection) => void;
  onStyleChange: (style: MapStyle) => void;
  styles: MapStyleOption[];
}

export function MapControls({
  projection,
  mapStyle,
  onProjectionChange,
  onStyleChange,
  styles,
}: MapControlsProps) {
  const [showStyles, setShowStyles] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentStyle = useMemo(
    () => styles.find((s) => s.id === mapStyle),
    [styles, mapStyle]
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!showStyles) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(target) &&
        !target.closest(".style-toggle")
      ) {
        setShowStyles(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStyles]);

  const handleStyleSelect = (styleId: MapStyle) => {
    onStyleChange(styleId);
    setShowStyles(false);
  };

  return (
    <div className="map-controls">
      <div className="controls-row">
        <div className="projection-controls">
          <button
            type="button"
            className={`projection-btn ${
              projection === "globe" ? "active" : ""
            }`}
            onClick={() => onProjectionChange("globe")}
            aria-label="Globe projection"
            title="Globe projection"
          >
            🌍
          </button>
          <button
            type="button"
            className={`projection-btn ${
              projection === "mercator" ? "active" : ""
            }`}
            onClick={() => onProjectionChange("mercator")}
            aria-label="Mercator projection"
            title="Flat projection"
          >
            🗺️
          </button>
        </div>

        <div className="style-controls">
          <button
            type="button"
            className="style-toggle"
            onClick={() => setShowStyles((prev) => !prev)}
            aria-label="Toggle style selector"
            aria-expanded={showStyles}
          >
            <span className="style-toggle-text">
              {currentStyle?.label || "Style"}
            </span>
            <span className="style-toggle-icon">{showStyles ? "▲" : "▼"}</span>
          </button>
          {showStyles && (
            <div className="style-dropdown" ref={dropdownRef} role="menu">
              {styles.map((style) => (
                <button
                  key={style.id}
                  type="button"
                  className={`style-option ${
                    mapStyle === style.id ? "active" : ""
                  }`}
                  onClick={() => handleStyleSelect(style.id)}
                  title={style.description}
                  role="menuitem"
                >
                  {style.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
