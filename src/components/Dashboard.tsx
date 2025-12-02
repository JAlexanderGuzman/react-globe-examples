import './Dashboard.css';
import mapboxLogo from '../assets/mapbox-logo.png';
import maplibreLogo from '../assets/maplibre-logo.png';

interface DashboardProps {
  onDemoSelect: (demoId: string) => void;
}

export default function Dashboard({ onDemoSelect }: DashboardProps) {
  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Demo Dashboard</h1>
        <p className="dashboard-subtitle">Select a demo to get started</p>
      </div>
      
      <div className="demo-grid">
        <button 
          className="demo-card mapbox-card"
          onClick={() => onDemoSelect('mapbox')}
        >
          <div className="demo-logo-container">
            <img 
              src={mapboxLogo} 
              alt="Mapbox Logo" 
              className="demo-logo"
            />
          </div>
          <span className="demo-label">Mapbox</span>
        </button>
        <button 
          className="demo-card deckgl-card"
          onClick={() => onDemoSelect('deckgl-mapbox')}
        >
          <div className="demo-logo-container">
            <span className="demo-icon">🗺️</span>
          </div>
          <span className="demo-label">Deck.gl Mapbox</span>
        </button>
        <button 
          className="demo-card maplibre-card"
          onClick={() => onDemoSelect('deckgl-maplibre')}
        >
          <div className="demo-logo-container">
            <img 
              src={maplibreLogo} 
              alt="MapLibre Logo" 
              className="demo-logo"
            />
          </div>
          <span className="demo-label">Deck.gl MapLibre</span>
        </button>
        <button 
          className="demo-card globe-gl-card"
          onClick={() => onDemoSelect('globe-gl')}
        >
          <div className="demo-logo-container">
            <span className="demo-icon">🌍</span>
          </div>
          <span className="demo-label">vasturiano globe.gl</span>
        </button>
        <button 
          className="demo-card full-ai-card"
          onClick={() => onDemoSelect('full-ai')}
        >
          <div className="demo-logo-container">
            <span className="demo-icon">🤖</span>
          </div>
          <span className="demo-label">Full AI</span>
        </button>
      </div>
    </div>
  );
}

