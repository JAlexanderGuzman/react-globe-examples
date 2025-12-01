import './Dashboard.css';
import mapboxLogo from '../assets/mapbox-logo.png';

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
      </div>
    </div>
  );
}

