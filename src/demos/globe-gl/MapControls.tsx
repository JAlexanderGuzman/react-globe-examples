import { useState, useEffect, useRef, useMemo } from "react";
import "./MapControls.css";
import type { GlobeMapStyle, GlobeMapStyleOption } from "./types";

interface MapControlsProps {
  mapStyle: GlobeMapStyle;
  onStyleChange: (style: GlobeMapStyle) => void;
  styles: GlobeMapStyleOption[];
}

export function MapControls({
  mapStyle,
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
        !target.closest(".control-btn")
      ) {
        setShowStyles(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showStyles]);

  const handleStyleSelect = (styleId: GlobeMapStyle) => {
    onStyleChange(styleId);
    setShowStyles(false);
  };

  return (
    <div className="map-controls">
      <div className="style-controls">
        <button
          type="button"
          className="control-btn style-toggle"
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
                className={`style-option ${mapStyle === style.id ? "active" : ""}`}
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
  );
}

