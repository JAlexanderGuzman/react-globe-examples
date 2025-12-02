import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import { MapControls } from "./MapControls";
import type { MapProjection } from "./types";
import "./FullAiDemo.css";

interface GeoJSONFeature {
  type: string;
  geometry: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
  id?: string;
}

interface GeoJSON {
  type: string;
  features: GeoJSONFeature[];
}

interface CountryLabel {
  name: string;
  lat: number;
  lon: number;
}

export function FullAiDemo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const globeRef = useRef<THREE.Group | null>(null);
  const flatMapRef = useRef<THREE.Group | null>(null);
  const labelRendererRef = useRef<CSS2DRenderer | null>(null);
  const labelsRef = useRef<CSS2DObject[]>([]);
  const showLabelsRef = useRef<boolean>(true);
  const [projection, setProjection] = useState<MapProjection>("globe");
  const [isLoading, setIsLoading] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [cameraInfo, setCameraInfo] = useState({
    lat: 0,
    lon: 0,
    distance: 0,
  });

  useEffect(() => {
    const currentContainer = containerRef.current;
    if (!currentContainer) return;

    // Initialize showLabelsRef
    showLabelsRef.current = showLabels;

    // Initialize Three.js
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    scene.fog = new THREE.FogExp2(0x000000, 0.001);

    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );

    // Center camera on United States by default
    // Camera position: Lat: 34.26°, Lon: -88.08°, Distance: 600
    const defaultLat = 34.26;
    const defaultLon = -88.08;
    const cameraDistance = 600;

    // Convert to radians
    const latRad = (defaultLat * Math.PI) / 180;
    const lonRad = (defaultLon * Math.PI) / 180;

    // Convert to 3D position using same coordinate system as globe
    // x = r*cos(lat)*cos(lon), y = r*cos(lat)*sin(lon), z = r*sin(lat)
    const x = cameraDistance * Math.cos(latRad) * Math.cos(lonRad);
    const y = cameraDistance * Math.cos(latRad) * Math.sin(lonRad);
    const z = cameraDistance * Math.sin(latRad);

    camera.position.set(x, y, z);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    // Clear any existing content
    currentContainer.innerHTML = "";

    // Append canvas first
    currentContainer.appendChild(renderer.domElement);

    // Then set styles
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.touchAction = "none";
    renderer.domElement.style.cursor = "grab";
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.pointerEvents = "auto";
    renderer.domElement.setAttribute("tabindex", "0");

    // Create CSS2D renderer for labels
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0";
    labelRenderer.domElement.style.left = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    labelRenderer.domElement.style.zIndex = "100";
    labelRenderer.domElement.style.width = "100%";
    labelRenderer.domElement.style.height = "100%";
    currentContainer.appendChild(labelRenderer.domElement);
    labelRendererRef.current = labelRenderer;
    console.log("CSS2DRenderer initialized and appended to container");

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);

    // Orbit controls - create after canvas is in DOM
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05; // Smoother damping
    controls.enablePan = false; // Disable pan for globe mode
    controls.enableZoom = true;
    controls.enableRotate = true;
    controls.rotateSpeed = 0.5; // Reduced rotation speed for more natural control
    controls.zoomSpeed = 0.8;
    controls.panSpeed = 0.8;
    // Set zoom limits
    controls.minDistance = 500; // Minimum zoom (can't get too close)
    controls.maxDistance = 1200; // Maximum zoom (can't get too far)
    controls.target.set(0, 0, 0);

    // Intercept mouse events to invert horizontal rotation for natural globe feel
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let velocityX = 0; // Angular velocity for horizontal rotation
    let velocityY = 0; // Angular velocity for vertical rotation
    const damping = 0.95; // Friction factor (0.95 = 5% reduction per frame)

    const handleMouseDown = (event: MouseEvent) => {
      isDragging = true;
      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
      velocityX = 0; // Reset velocity when starting new drag
      velocityY = 0;
    };

    const handleMouseMove = (event: MouseEvent) => {
      if (!isDragging) return;

      const deltaX = event.clientX - lastMouseX;
      const deltaY = event.clientY - lastMouseY;

      // Store velocity for momentum effect
      // Horizontal: drag right = rotate right (no inversion needed, just use deltaX directly)
      velocityX = deltaX * 0.002 * controls.rotateSpeed;
      // Vertical: drag up = rotate up (inverted)
      velocityY = -deltaY * 0.002 * controls.rotateSpeed;

      // Natural globe interaction: dragging right rotates globe right
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(camera.position.clone().sub(controls.target));

      // Adjust rotation: horizontal natural, vertical inverted
      spherical.theta -= velocityX; // Horizontal: drag right (positive deltaX) → rotate right (theta decreases)
      spherical.phi += velocityY; // Vertical: drag up (negative deltaY) → rotate up (phi increases)

      // Clamp phi to prevent flipping
      spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

      const newPosition = new THREE.Vector3()
        .setFromSpherical(spherical)
        .add(controls.target);
      camera.position.copy(newPosition);
      camera.lookAt(controls.target);

      lastMouseX = event.clientX;
      lastMouseY = event.clientY;
    };

    const handleMouseUp = () => {
      isDragging = false;
      // Keep the last velocity for momentum effect
      // Velocity will be applied in the animation loop
    };

    // Temporarily disable OrbitControls rotation and use custom handlers
    controls.enableRotate = false;
    renderer.domElement.addEventListener("mousedown", handleMouseDown);
    renderer.domElement.addEventListener("mousemove", handleMouseMove);
    renderer.domElement.addEventListener("mouseup", handleMouseUp);
    renderer.domElement.addEventListener("mouseleave", handleMouseUp);

    controls.update();

    // Debug: verify controls are working
    console.log("OrbitControls initialized:", {
      enabled: controls.enabled,
      enableRotate: controls.enableRotate,
      enableZoom: controls.enableZoom,
      enablePan: controls.enablePan,
    });

    sceneRef.current = scene;
    rendererRef.current = renderer;
    cameraRef.current = camera;
    controlsRef.current = controls;

    // Handle window resize
    const handleResize = () => {
      if (!camera || !renderer || !labelRenderer) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    // Animation loop
    let animationId: number;
    const animate = () => {
      animationId = requestAnimationFrame(animate);

      // Apply momentum/inertia when not dragging
      if (
        !isDragging &&
        (Math.abs(velocityX) > 0.001 || Math.abs(velocityY) > 0.001)
      ) {
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position.clone().sub(controls.target));

        // Apply velocity (same direction as during drag)
        spherical.theta -= velocityX; // Horizontal: same as during drag
        spherical.phi += velocityY; // Vertical: same as during drag

        // Clamp phi to prevent flipping
        spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

        const newPosition = new THREE.Vector3()
          .setFromSpherical(spherical)
          .add(controls.target);
        camera.position.copy(newPosition);
        camera.lookAt(controls.target);

        // Apply damping (friction)
        velocityX *= damping;
        velocityY *= damping;
      }

      if (controls) {
        controls.update();
      }

      // Update camera info for debug display
      if (camera && projection === "globe") {
        // Convert camera position to spherical coordinates
        const spherical = new THREE.Spherical();
        spherical.setFromVector3(camera.position);

        // Convert to lat/lon (latitude is phi, longitude is theta)
        // phi: 0 to PI (0 = north pole, PI = south pole)
        // theta: 0 to 2PI (0 = prime meridian)
        const lat = (Math.PI / 2 - spherical.phi) * (180 / Math.PI); // Convert to degrees, 90 - phi
        const lon = ((spherical.theta * (180 / Math.PI) + 180) % 360) - 180; // Convert to degrees, adjust for -180 to 180 range
        const distance = spherical.radius;

        setCameraInfo({
          lat: Math.round(lat * 100) / 100,
          lon: Math.round(lon * 100) / 100,
          distance: Math.round(distance),
        });
      }

      // Hide labels that are behind the globe
      if (labelsRef.current.length > 0 && camera) {
        const globeCenter = new THREE.Vector3(0, 0, 0);

        // Vector from globe center to camera (normalized)
        const centerToCamera = new THREE.Vector3()
          .subVectors(camera.position, globeCenter)
          .normalize();

        labelsRef.current.forEach((label) => {
          // First check if toggle is off
          if (!showLabelsRef.current) {
            label.visible = false;
            return;
          }

          // Vector from globe center to label (normalized)
          const centerToLabel = new THREE.Vector3()
            .subVectors(label.position, globeCenter)
            .normalize();

          // Dot product:
          // positive = label and camera are on same side of center (label visible)
          // negative = label and camera are on opposite sides (label behind globe)
          const dotProduct = centerToCamera.dot(centerToLabel);

          // Label is behind if dot product is negative
          label.visible = dotProduct > 0;
        });
      }

      if (renderer && scene && camera) {
        renderer.render(scene, camera);
      }
      if (labelRenderer && scene && camera) {
        labelRenderer.render(scene, camera);
      }
    };
    animate();

    // Ensure canvas can receive events
    renderer.domElement.setAttribute("tabindex", "0");
    renderer.domElement.focus();

    // Define loadLabels function inside useEffect
    const loadLabels = async (
      scene: THREE.Scene,
      initialVisibility: boolean
    ) => {
      try {
        const response = await fetch("/data/country-labels.json");
        if (!response.ok) {
          throw new Error("Failed to load country-labels.json");
        }
        const data: { countries: CountryLabel[] } = await response.json();

        const globeSize = 150;
        const lineRadius = globeSize * 1.43; // Same as in createGlobeVisualization
        const labelRadius = lineRadius * 1.05; // Slightly outside the lines

        console.log(
          `Loading ${data.countries.length} labels with visibility: ${initialVisibility}`
        );

        data.countries.forEach((country) => {
          // Convert lat/lon to 3D position (same as createSphereLine)
          const latRad = (country.lat * Math.PI) / 180;
          const lonRad = (country.lon * Math.PI) / 180;

          const x = labelRadius * Math.cos(latRad) * Math.cos(lonRad);
          const y = labelRadius * Math.cos(latRad) * Math.sin(lonRad);
          const z = labelRadius * Math.sin(latRad);

          // Create HTML element for label
          const labelDiv = document.createElement("div");
          labelDiv.className = "country-label";
          labelDiv.textContent = country.name;
          labelDiv.style.color = "#ffffff";
          labelDiv.style.fontSize = "14px";
          labelDiv.style.fontFamily = "Arial, sans-serif";
          labelDiv.style.fontWeight = "bold";
          labelDiv.style.pointerEvents = "none";
          labelDiv.style.userSelect = "none";
          labelDiv.style.whiteSpace = "nowrap";
          labelDiv.style.textShadow = "2px 2px 4px rgba(0,0,0,0.9)";
          labelDiv.style.backgroundColor = "rgba(0,0,0,0.5)";
          labelDiv.style.padding = "2px 6px";
          labelDiv.style.borderRadius = "3px";

          // Create CSS2DObject
          const label = new CSS2DObject(labelDiv);
          label.position.set(x, y, z);
          label.visible = initialVisibility; // Set initial visibility

          scene.add(label);
          labelsRef.current.push(label);
        });

        console.log(`Successfully loaded ${labelsRef.current.length} labels`);
      } catch (error) {
        console.error("Error loading labels:", error);
      }
    };

    // Define helper functions inside useEffect
    const interpolateCoordinates = (coordinates: number[][]): number[][] => {
      if (coordinates.length < 2) return coordinates;

      const interpolated: number[][] = [coordinates[0]];

      for (let i = 1; i < coordinates.length; i++) {
        const prev = coordinates[i - 1];
        const curr = coordinates[i];
        const lonDiff = Math.abs(curr[0] - prev[0]);
        const latDiff = Math.abs(curr[1] - prev[1]);

        // Interpolate if distance is greater than 5 degrees
        if (lonDiff > 5 || latDiff > 5) {
          const steps = Math.ceil(Math.max(lonDiff, latDiff) / 5);
          for (let j = 1; j < steps; j++) {
            const t = j / steps;
            const lon = prev[0] + (curr[0] - prev[0]) * t;
            const lat = prev[1] + (curr[1] - prev[1]) * t;
            interpolated.push([lon, lat]);
          }
        }
        interpolated.push(curr);
      }

      return interpolated;
    };

    const createSphereLine = (
      coordinates: number[][],
      radius: number
    ): THREE.Line | null => {
      const points: THREE.Vector3[] = [];
      const interpolatedCoords = interpolateCoordinates(coordinates);

      for (let i = 0; i < interpolatedCoords.length; i++) {
        const [lon, lat] = interpolatedCoords[i];
        // Convert lat/lon to spherical coordinates
        const latRad = (lat * Math.PI) / 180;
        const lonRad = (lon * Math.PI) / 180;

        const x = radius * Math.cos(latRad) * Math.cos(lonRad);
        const y = radius * Math.cos(latRad) * Math.sin(lonRad);
        const z = radius * Math.sin(latRad);

        points.push(new THREE.Vector3(x, y, z));
      }

      if (points.length < 2) return null;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x7e7e7e,
        linewidth: 2,
        transparent: true,
        opacity: 0.5,
      });

      return new THREE.Line(geometry, material);
    };

    const createPlaneLine = (
      coordinates: number[][],
      scale: number
    ): THREE.Line | null => {
      const points: THREE.Vector3[] = [];

      for (let i = 0; i < coordinates.length; i++) {
        const [lon, lat] = coordinates[i];
        const x = (lon / 180) * scale;
        const y = (lat / 180) * scale;
        const z = 0;

        points.push(new THREE.Vector3(x, y, z));
      }

      if (points.length < 2) return null;

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0x7e7e7e,
        linewidth: 2,
        transparent: true,
        opacity: 0.5,
      });

      return new THREE.Line(geometry, material);
    };

    const drawGeoJSONOnSphere = (
      geoJson: GeoJSON,
      radius: number
    ): THREE.Group => {
      const group = new THREE.Group();

      geoJson.features.forEach((feature) => {
        if (feature.geometry.type === "Polygon") {
          const coordinates = feature.geometry.coordinates[0] as number[][];
          const line = createSphereLine(coordinates, radius);
          if (line) group.add(line);
        } else if (feature.geometry.type === "MultiPolygon") {
          const polygons = feature.geometry.coordinates as number[][][][];
          polygons.forEach((polygon) => {
            polygon.forEach((ring) => {
              const line = createSphereLine(ring, radius);
              if (line) group.add(line);
            });
          });
        }
      });

      return group;
    };

    const drawGeoJSONOnPlane = (
      geoJson: GeoJSON,
      scale: number
    ): THREE.Group => {
      const group = new THREE.Group();

      geoJson.features.forEach((feature) => {
        if (feature.geometry.type === "Polygon") {
          const coordinates = feature.geometry.coordinates[0] as number[][];
          const line = createPlaneLine(coordinates, scale);
          if (line) group.add(line);
        } else if (feature.geometry.type === "MultiPolygon") {
          const polygons = feature.geometry.coordinates as number[][][][];
          polygons.forEach((polygon) => {
            polygon.forEach((ring) => {
              const line = createPlaneLine(ring, scale);
              if (line) group.add(line);
            });
          });
        }
      });

      return group;
    };

    const createGlobeVisualization = (geoJson: GeoJSON): THREE.Group => {
      const group = new THREE.Group();
      const globeSize = 150;
      const lineRadius = globeSize * 1.43;

      // Create base sphere - make it closer to the line radius
      const sphereGeometry = new THREE.SphereGeometry(lineRadius, 32, 32);
      const sphereMaterial = new THREE.MeshBasicMaterial({
        color: 0x2a2a2a, // Medium gray (not too dark)
      });
      const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial);
      group.add(sphere);

      // Draw GeoJSON on sphere
      const linesGroup = drawGeoJSONOnSphere(geoJson, lineRadius);
      group.add(linesGroup);

      return group;
    };

    const createFlatMapVisualization = (geoJson: GeoJSON): THREE.Group => {
      const group = new THREE.Group();

      // Draw GeoJSON on flat plane
      const linesGroup = drawGeoJSONOnPlane(geoJson, 400);
      group.add(linesGroup);

      return group;
    };

    // Define loadWorldData function inside useEffect
    const loadWorldData = async (scene: THREE.Scene) => {
      try {
        const response = await fetch("/data/world.json");
        if (!response.ok) {
          throw new Error("Failed to load world.json");
        }
        const geoJson: GeoJSON = await response.json();

        // Create globe visualization
        const globeGroup = createGlobeVisualization(geoJson);
        globeGroup.visible = projection === "globe";
        scene.add(globeGroup);
        globeRef.current = globeGroup;

        // Create flat map visualization
        const flatGroup = createFlatMapVisualization(geoJson);
        flatGroup.visible = projection === "mercator";
        scene.add(flatGroup);
        flatMapRef.current = flatGroup;

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading world data:", error);
        setIsLoading(false);
      }
    };

    // Load world data and labels
    Promise.all([loadWorldData(scene), loadLabels(scene, showLabels)]).catch(
      (error) => {
        console.error("Error loading data:", error);
        setIsLoading(false);
      }
    );

    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.domElement.removeEventListener("mousedown", handleMouseDown);
      renderer.domElement.removeEventListener("mousemove", handleMouseMove);
      renderer.domElement.removeEventListener("mouseup", handleMouseUp);
      renderer.domElement.removeEventListener("mouseleave", handleMouseUp);
      if (animationId) {
        cancelAnimationFrame(animationId);
      }
      if (
        currentContainer &&
        renderer.domElement &&
        currentContainer.contains(renderer.domElement)
      ) {
        currentContainer.removeChild(renderer.domElement);
      }
      if (
        currentContainer &&
        labelRenderer.domElement &&
        currentContainer.contains(labelRenderer.domElement)
      ) {
        currentContainer.removeChild(labelRenderer.domElement);
      }
      // Remove all labels from scene
      labelsRef.current.forEach((label) => {
        scene.remove(label);
      });
      labelsRef.current = [];
      if (controls) controls.dispose();
      if (renderer) renderer.dispose();
      if (labelRenderer) labelRenderer.domElement.remove();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          if (object.geometry) object.geometry.dispose();
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((mat) => mat.dispose());
            } else {
              object.material.dispose();
            }
          }
        }
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projection]);

  // Handle projection change
  useEffect(() => {
    if (
      !globeRef.current ||
      !flatMapRef.current ||
      !cameraRef.current ||
      !controlsRef.current
    )
      return;

    if (projection === "globe") {
      globeRef.current.visible = true;
      flatMapRef.current.visible = false;

      // Center camera on United States by default
      // Camera position: Lat: 34.26°, Lon: -88.08°, Distance: 600
      const defaultLat = 34.26;
      const defaultLon = -88.08;
      const cameraDistance = 600;

      // Convert to radians
      const latRad = (defaultLat * Math.PI) / 180;
      const lonRad = (defaultLon * Math.PI) / 180;

      // Convert to 3D position using same coordinate system as globe
      const x = cameraDistance * Math.cos(latRad) * Math.cos(lonRad);
      const y = cameraDistance * Math.cos(latRad) * Math.sin(lonRad);
      const z = cameraDistance * Math.sin(latRad);

      cameraRef.current.position.set(x, y, z);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    } else {
      globeRef.current.visible = false;
      flatMapRef.current.visible = true;
      // Reset camera for flat view with more zoom out
      cameraRef.current.position.set(0, 0, 600);
      cameraRef.current.lookAt(0, 0, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  }, [projection]);

  return (
    <div className="full-ai-demo">
      <div ref={containerRef} className="three-container" />
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-text">Loading world data...</div>
        </div>
      )}
      {!isLoading && (
        <>
          <MapControls
            projection={projection}
            onProjectionChange={setProjection}
            showLabels={showLabels}
            onToggleLabels={() => {
              const newShowLabels = !showLabels;
              setShowLabels(newShowLabels);
              showLabelsRef.current = newShowLabels;
              // Visibility will be controlled by the animate loop
            }}
          />
          {projection === "globe" && (
            <div className="camera-debug">
              <div className="debug-title">Camera Info</div>
              <div className="debug-row">
                <span className="debug-label">Lat:</span>
                <span className="debug-value">{cameraInfo.lat}°</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Lon:</span>
                <span className="debug-value">{cameraInfo.lon}°</span>
              </div>
              <div className="debug-row">
                <span className="debug-label">Distance:</span>
                <span className="debug-value">{cameraInfo.distance}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
