import { useState, useEffect } from 'react';
import './App.css';
import GlobeVisualization from './components/GlobeVisualization';

function App() {
  const [globeData, setGlobeData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  useEffect(() => {
    loadGlobeData();
  }, []);

  const loadGlobeData = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await new Promise(resolve => setTimeout(resolve, 1000));

      const [countriesRes, worldRes, productSpaceRes, networkRes, anchorsRes] = await Promise.all([
        fetch('/data/countries.json'),
        fetch('/data/world.json'),
        fetch('/data/productspace.json'),
        fetch('/data/network_hs.json'),
        fetch('/data/anchors.json'),
      ]);

      if (!countriesRes.ok || !worldRes.ok || !productSpaceRes.ok || !networkRes.ok || !anchorsRes.ok) {
        throw new Error('Failed to load one or more data files');
      }

      const [countries, world, productSpace, network, anchors] = await Promise.all([
        countriesRes.json(),
        worldRes.json(),
        productSpaceRes.json(),
        networkRes.json(),
        anchorsRes.json(),
      ]);

      const data = {
        countries,
        world,
        productSpace,
        network,
        anchors,
      };
      setGlobeData(data);

      setIsLoading(false);
    } catch (err) {
      setError(err.message || 'Failed to load data');
      setIsLoading(false);
    }
  };

  const handleCountrySelect = (country) => {
    setSelectedCountry(country);
  };

  const handleProductSelect = (product) => {
    setSelectedProduct(product);
  };

  const handleGlobeReady = () => {};

  const handleGlobeError = (error) => {
    setError(error.message || 'An error occurred in the globe visualization');
  };

  const handleRetry = () => {
    setGlobeData(null);
    setError(null);
    loadGlobeData();
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>Globe of Economic Complexity</h1>
        <p>Interactive 3D visualization of world exports and economic data</p>
      </header>

      {error && (
        <div className="error-banner">
          <p>Error: {error}</p>
          <button onClick={handleRetry} className="retry-button">
            Retry
          </button>
        </div>
      )}

      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
          <p>Loading economic data...</p>
        </div>
      )}

      <div className="visualization-container">
        <GlobeVisualization
          data={globeData}
          onCountrySelect={handleCountrySelect}
          onProductSelect={handleProductSelect}
          onReady={handleGlobeReady}
          onError={handleGlobeError}
          noDataMessage="Loading data from API..."
        />
      </div>

      {(selectedCountry || selectedProduct) && (
        <div className="info-panel">
          {selectedCountry && (
            <div className="info-section">
              <h3>Selected Country</h3>
              <pre>{JSON.stringify(selectedCountry, null, 2)}</pre>
            </div>
          )}
          {selectedProduct && (
            <div className="info-section">
              <h3>Selected Product</h3>
              <pre>{JSON.stringify(selectedProduct, null, 2)}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default App;
