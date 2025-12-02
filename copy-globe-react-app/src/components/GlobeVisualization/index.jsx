import { useRef, useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import './core/styles/style.css';
import './core/styles/select2.css';

const GlobeVisualization = ({
  data = null,
  onCountrySelect = null,
  onProductSelect = null,
  onReady = null,
  onError = null,
  noDataMessage = "No data available. Please provide data to visualize.",
  width = null,
  height = null,
}) => {
  const containerRef = useRef(null);
  const globeInstanceRef = useRef(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!data || !containerRef.current) {
      return;
    }

    if (globeInstanceRef.current) {
      return;
    }

    setIsLoading(true);
    setError(null);

    const initializeGlobe = async () => {
      try {
        const $ = (await import('jquery')).default;
        window.$ = $;
        window.jQuery = $;
        
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r68/three.min.js');
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/select2/4.0.0-rc.2/js/select2.min.js');

        addShadersToDOM();

        if (!data || !data.world || !data.countries || !data.productSpace || !data.network || !data.anchors) {
          throw new Error('Missing required data. All data files must be provided via props.');
        }

        const providedData = {
          world: data.world,
          countries: data.countries,
          productSpace: data.productSpace,
          network: data.network,
          anchors: data.anchors,
        };

        await loadScript('/src/components/GlobeVisualization/core/scripts/URLparser.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/noWebGL.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/spin.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/THREE.GeoJSON.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/cameraControls.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/THREE.FullScreen.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/ParticleLinks.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/labels.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/UI.js');
        await loadScript('/src/components/GlobeVisualization/core/scripts/script.js');

        const initGlobe = window.initializeGlobe;
        
        if (!initGlobe) {
          throw new Error('initializeGlobe function not found on window');
        }

        const globeState = initGlobe(
          containerRef.current,
          providedData,
          {
            onCountrySelect,
            onProductSelect,
            onReady: () => {
              setIsInitialized(true);
              setIsLoading(false);
              if (onReady) onReady();
            },
            onError: (err) => {
              setError(err.message || 'An error occurred');
              setIsLoading(false);
              if (onError) onError(err);
            },
          }
        );

        globeInstanceRef.current = globeState;
      } catch (err) {
        setError(err.message || 'Failed to initialize visualization');
        setIsLoading(false);
        if (onError) onError(err);
      }
    };

    initializeGlobe();

    return () => {
      if (globeInstanceRef.current && globeInstanceRef.current.destroy) {
        globeInstanceRef.current.destroy();
      }
      globeInstanceRef.current = null;
      setIsInitialized(false);
    };
  }, [data]);

  useEffect(() => {
    if (isInitialized && globeInstanceRef.current && data) {
      if (globeInstanceRef.current.updateData) {
        globeInstanceRef.current.updateData(data);
      }
    }
  }, [data, isInitialized]);

  const addShadersToDOM = () => {
    if (document.getElementById('vertexshader')) {
      return;
    }

    const vertexShader = document.createElement('script');
    vertexShader.type = 'x-shader/x-vertex';
    vertexShader.id = 'vertexshader';
    vertexShader.textContent = `
      attribute float size;
      attribute vec3 customColor;
      varying vec3 vColor;

      void main() {
        vColor = customColor;
        vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
        gl_PointSize = size * ( 300.0 / length( mvPosition.xyz ) );
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    document.head.appendChild(vertexShader);

    const fragmentShader = document.createElement('script');
    fragmentShader.type = 'x-shader/x-fragment';
    fragmentShader.id = 'fragmentshader';
    fragmentShader.textContent = `
      uniform vec3 color;
      uniform sampler2D texture;
      varying vec3 vColor;

      void main() {
        gl_FragColor = vec4( color * vColor, 1.0 );
        gl_FragColor = gl_FragColor * texture2D( texture, gl_PointCoord );
      }
    `;
    document.head.appendChild(fragmentShader);
  };

  const loadScript = (src) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  };

  const containerStyle = {
    width: width || '100%',
    height: height || '100%',
    position: 'absolute',
    top: 0,
    left: 0,
    overflow: 'hidden',
    background: '#000',
  };

  return (
    <div className="globe-visualization-wrapper" style={containerStyle}>
      {!data && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '1.2rem',
          textAlign: 'center',
          padding: '20px',
        }}>
          {noDataMessage}
        </div>
      )}

      {error && (
        <div style={{
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          color: 'white',
          padding: '10px 20px',
          borderRadius: '5px',
          zIndex: 1000,
        }}>
          Error: {error}
        </div>
      )}

      {isLoading && data && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '1.2rem',
          zIndex: 999,
        }}>
          Loading visualization...
        </div>
      )}

      <div ref={containerRef} className="globe-container" style={{ width: '100%', height: '100%' }}>
        <div id="spinner"></div>
        <div id="UI" style={{ display: 'none' }}>
          <div id="sidebar">
            <div id="buttons">
              <div id="countrySection">
                <div className="selectionBox">
                  <select className="countrySelection"></select>
                </div>
              </div>
              <div id="productSection" style={{ display: 'none' }}>
                <div className="optionSeparator">&nbsp;</div>
                <div className="productBox">
                  <select className="productSelection"></select>
                </div>
              </div>
              <div className="optionSeparator">&nbsp;</div>
              <div id="visualizations"></div>
              <div className="optionSeparator">&nbsp;</div>
              <div id="fullscreen">Fullscreen Mode</div>
              <div id="showlabels">Hide Labels</div>
              <div id="contrastbutton">High contrast</div>
              <div className="sectionTitle" style={{ position: 'absolute', bottom: '50px' }}>
                Filter by product category
              </div>
            </div>
          </div>
          <div id="countries"></div>
          <div id="categories"></div>
          <div id="pointer"></div>
          <div id="modeDescription"></div>
          <div id="productlabel"></div>
          <div id="noWebGL" style={{ display: 'none' }}>
            <div id="description">
              The globe of economic complexity dynamically maps out the entire world production of goods...
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

GlobeVisualization.propTypes = {
  data: PropTypes.shape({
    countries: PropTypes.object,
    world: PropTypes.object,
    productSpace: PropTypes.object,
    network: PropTypes.object,
  }),
  onCountrySelect: PropTypes.func,
  onProductSelect: PropTypes.func,
  onReady: PropTypes.func,
  onError: PropTypes.func,
  noDataMessage: PropTypes.string,
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

export default GlobeVisualization;

