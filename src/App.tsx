import { useState } from 'react';
import './App.css';
import Dashboard from './components/Dashboard';
import { MapboxDemo } from './demos/mapbox/MapboxDemo';

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
          {activeDemo === 'mapbox' && <MapboxDemo />}
        </div>
      )}
    </div>
  );
}

export default App;
