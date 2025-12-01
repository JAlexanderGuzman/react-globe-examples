// deck.gl
// SPDX-License-Identifier: MIT
// Copyright (c) vis.gl contributors

/* global requestAnimationFrame, cancelAnimationFrame */
import {useEffect, useState} from 'react';
import './range-input.css';

export default function RangeInput({
  min,
  max,
  value,
  animationSpeed,
  onChange,
  formatLabel
}: {
  min: number;
  max: number;
  value: number;
  animationSpeed: number;
  formatLabel: (x: number) => string;
  onChange: (newValue: number) => void;
}) {
  const [isPlaying, setIsPlaying] = useState(true);

  useEffect(() => {
    if (!isPlaying) return;

    let animationFrameId: number;
    let currentValue = value;

    const animate = () => {
      currentValue += animationSpeed;
      if (currentValue > max) {
        currentValue = min;
      }
      onChange(currentValue);
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isPlaying, animationSpeed, min, max, onChange, value]);

  return (
    <div className="range-input-container">
      <button
        className="range-input-button"
        onClick={() => setIsPlaying(!isPlaying)}
        title={isPlaying ? 'Stop' : 'Animate'}
        type="button"
      >
        {isPlaying ? (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
          </svg>
        ) : (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
      </button>
      <div className="range-input-slider-wrapper">
        <input
          type="range"
          min={min}
          max={max}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="range-input-slider"
        />
        <div className="range-input-label">{formatLabel(value)}</div>
      </div>
    </div>
  );
}
