import { useState } from "react";
import "./App.css";
import Dashboard from "./components/Dashboard";
import { MapboxDemo } from "./demos/mapbox/MapboxDemo";
import { DeckGlMapboxDemo } from "./demos/deckgl-mapbox/DeckGlMapboxDemo";
import { DeckGlMapLibreDemoWrapper } from "./demos/deckgl-maplibre/DeckGlMapLibreDemo";
import { GlobeGlDemo } from "./demos/globe-gl/GlobeGlDemo";

function App() {
  const [activeDemo, setActiveDemo] = useState<string | null>(null);

  const handleDemoSelect = (demoId: string) => {
    setActiveDemo(demoId);
  };

  const handleBackToDashboard = () => {
    setActiveDemo(null);
  };

  return (
    <div className="app">
      {activeDemo === null ? (
        <Dashboard onDemoSelect={handleDemoSelect} />
      ) : (
        <div className="demo-container">
          <button className="back-button" onClick={handleBackToDashboard}>
            ← Back to Dashboard
          </button>
          {activeDemo === "mapbox" && <MapboxDemo />}
          {activeDemo === "deckgl-mapbox" && <DeckGlMapboxDemo />}
          {activeDemo === "deckgl-maplibre" && <DeckGlMapLibreDemoWrapper />}
          {activeDemo === "globe-gl" && <GlobeGlDemo />}
        </div>
      )}
    </div>
  );
}

export default App;
