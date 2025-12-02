import * as THREE from "three";
import $ from "jquery";
import "select2";

window.THREE = THREE;
window.$ = $;
window.jQuery = $;

export class GlobeInstance {
  constructor(config) {
    this.container = config.container;
    this.data = config.data;
    this.callbacks = config.callbacks || {};
    this.isInitialized = false;
    this.globeState = null;
  }

  async initialize() {
    if (this.isInitialized) {
      console.warn("Globe already initialized");
      return;
    }

    try {
      await this.loadScripts();
      await this.initializeGlobe();
      this.isInitialized = true;

      if (this.callbacks.onReady) {
        this.callbacks.onReady();
      }
    } catch (error) {
      console.error("Error initializing globe:", error);
      if (this.callbacks.onError) {
        this.callbacks.onError(error);
      }
      throw error;
    }
  }

  async loadScripts() {
    const scripts = [
      "/src/components/GlobeVisualization/core/scripts/noWebGL.js",
      "/src/components/GlobeVisualization/core/scripts/spin.js",
      "/src/components/GlobeVisualization/core/scripts/URLparser.js",
      "/src/components/GlobeVisualization/core/scripts/THREE.GeoJSON.js",
      "/src/components/GlobeVisualization/core/scripts/cameraControls.js",
      "/src/components/GlobeVisualization/core/scripts/THREE.FullScreen.js",
      "/src/components/GlobeVisualization/core/scripts/ParticleLinks.js",
      "/src/components/GlobeVisualization/core/scripts/labels.js",
      "/src/components/GlobeVisualization/core/scripts/UI.js",
      "/src/components/GlobeVisualization/core/scripts/script.js",
    ];

    for (const scriptPath of scripts) {
      await this.loadScript(scriptPath);
    }
  }

  loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async initializeGlobe() {
    const container = this.container;
    this.setupDOMStructure();

    if (this.data) {
      window.globeData = this.data;

      if (typeof window.initializeGlobe === "function") {
        this.globeState = window.initializeGlobe(
          container,
          this.data,
          this.callbacks
        );
      } else {
        throw new Error(
          "initializeGlobe function not found. Make sure script.js is loaded."
        );
      }
    }
  }

  setupDOMStructure() {
    const html = `
      <div id="spinner"></div>
      <div id="UI">
        <div id="sideBar">
          <div id="buttons">
            <div id="countrySection">
              <div class="selectionBox">
                <select class="countrySelection"></select>
              </div>
            </div>
            <div id="productSection" style="display:none">
              <div class="optionSeparator">&nbsp;</div>
              <div class="productBox">
                <select class="productSelection"></select>
              </div>
            </div>
            <div class="optionSeparator">&nbsp;</div>
            <div id="visualizations"></div>
            <div class="optionSeparator">&nbsp;</div>
            <div id="fullscreen">Fullscreen Mode</div>
            <div id="showlabels">Hide Labels</div>
            <div id="contrastbutton">High contrast</div>
            <div class="sectionTitle" style="position:absolute;bottom:50px;">Filter by product category</div>
          </div>
        </div>
        <div id="countries"></div>
        <div id="categories"></div>
        <div id="pointer"></div>
        <div id="modeDescription"></div>
        <div id="productlabel"></div>
        <div id="noWebGL" style="display:none">
          <div id='description'>
            The globe of economic complexity dynamically maps out the entire world production of goods to create an economic landscape of countries around the globe.<br/> 
            This project was built with WebGL and needs it to run properly, your current web browser is not compatible.<br/> 
            See <a href='https://get.webgl.org/'>get.webgl.org</a> to fix this issue or enjoy the following teaser:
            <iframe width="420" style="padding-top:30px" height="315" src="https://www.youtube.com/embed/Obuq_L2U4VU" frameborder="0" allowfullscreen></iframe>
          </div>
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  updateData(newData) {
    if (!this.isInitialized) {
      console.warn("Globe not initialized yet");
      return;
    }

    this.data = newData;

    if (this.globeState && this.globeState.updateData) {
      this.globeState.updateData(newData);
    }
  }

  destroy() {
    if (!this.isInitialized) return;

    try {
      if (this.globeState) {
        if (this.globeState.scene) {
          this.globeState.scene.traverse((object) => {
            if (object.geometry) object.geometry.dispose();
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose());
              } else {
                object.material.dispose();
              }
            }
          });
        }

        if (this.globeState.renderer) {
          this.globeState.renderer.dispose();
        }
      }

      if (this.container) {
        this.container.innerHTML = "";
      }

      this.isInitialized = false;
      this.globeState = null;
    } catch (error) {
      console.error("Error destroying globe:", error);
    }
  }
}

export function createGlobe(config) {
  return new GlobeInstance(config);
}
