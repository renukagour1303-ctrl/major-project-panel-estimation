import React, { useState, useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Layers, MapPin, RotateCcw, Sparkles, Loader2, AlertCircle, X } from 'lucide-react';
import {
  fetchAutoTracedRoof,
  geoJsonToLeafletLatLngs,
  normalizeGeoJsonCoordinates
} from '../services/tracingService.js';

const ESRI_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

// High-visibility required overlay styling
const ROOF_LAYER_STYLE = {
  color: '#10B981',       // Emerald Green stroke
  weight: 3,              // Stroke width 3
  fillColor: '#34D399',   // Emerald fill
  fillOpacity: 0.4,       // Fill opacity 0.4
  pane: 'roofPolygonPane'
};

const SOLAR_PANEL_STYLE = {
  color: '#38bdf8',       // Light sky blue outline
  weight: 1.5,
  fillColor: '#0284c7',   // Photovoltaic cell blue
  fillOpacity: 0.7,
  pane: 'roofPolygonPane'
};

export default function RoofMap({ 
  latitude = 19.8762, 
  longitude = 75.3433, 
  cityName = '',
  zoom = 19,
  className = '',
  initialGeoJSON = null,
  // Drawing callbacks
  onPolygonDrawn = null,   // (geojson, latlngs) => void
  onPolygonCleared = null, // () => void
  // Programmatic controls exposed to parent
  drawControlRef = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const drawnItemsRef = useRef(null);   // L.FeatureGroup holding the polygon
  const editHandlerRef = useRef(null);

  // Keep callback refs updated to prevent stale closures
  const onPolygonDrawnRef = useRef(onPolygonDrawn);
  const onPolygonClearedRef = useRef(onPolygonCleared);

  useEffect(() => {
    onPolygonDrawnRef.current = onPolygonDrawn;
  }, [onPolygonDrawn]);

  useEffect(() => {
    onPolygonClearedRef.current = onPolygonCleared;
  }, [onPolygonCleared]);

  // Normalize numeric coordinates
  const latNum = typeof latitude === 'number' ? latitude : (parseFloat(latitude) || 19.8762);
  const lngNum = typeof longitude === 'number' ? longitude : (parseFloat(longitude) || 75.3433);

  // Auto-tracing state
  const [tracedPolygons, setTracedPolygons] = useState(null);
  const [isTracing, setIsTracing] = useState(false);
  const [traceError, setTraceError] = useState(null);
  const [autoDetectMessage, setAutoDetectMessage] = useState(null);
  const autoDetectAttemptedRef = useRef({});

  /*
  // AUTO-TRACING EXECUTION FUNCTION DISABLED
  const runAutoDetectBuilding = useCallback(async (targetLat, targetLon, force = false) => {
    const map = mapInstanceRef.current;
    const drawnItems = drawnItemsRef.current;
    if (!map || !drawnItems) return;

    // Skip if already drawn or supplied via initialGeoJSON unless forced
    if (!force && (drawnItems.getLayers().length > 0 || initialGeoJSON)) return;

    const coordKey = `${targetLat.toFixed(5)},${targetLon.toFixed(5)}`;
    if (!force && autoDetectAttemptedRef.current[coordKey]) return;
    autoDetectAttemptedRef.current[coordKey] = true;

    setIsTracing(true);
    setTraceError(null);

    try {
      const result = await fetchAutoTracedRoof(targetLat, targetLon);

      if (!result || !result.success || result.count === 0 || !result.roofFeature) {
        setTraceError('0 polygons detected for the given location/roof area.');
        return;
      }

      // 1. Update React state for traced polygons
      setTracedPolygons(result);

      // 2. Clear existing manual or previous layers
      drawnItems.clearLayers();

      // 3. Align coordinates: convert GeoJSON [lng, lat] to Leaflet [lat, lng]
      const latlngs = geoJsonToLeafletLatLngs(result.roofFeature.geometry);
      if (!latlngs || latlngs.length < 3) {
        setTraceError('Detected polygon geometry coordinates could not be aligned.');
        return;
      }

      // Ensure custom pane with zIndex 650 exists
      if (!map.getPane('roofPolygonPane')) {
        const pane = map.createPane('roofPolygonPane');
        pane.style.zIndex = '650';
      }

      // 4. Create and bind roof polygon with high visibility styling
      const roofLayer = L.polygon(latlngs, ROOF_LAYER_STYLE);
      drawnItems.addLayer(roofLayer);

      // 5. Render solar panel sub-polygons if present
      if (Array.isArray(result.panelFeatures) && result.panelFeatures.length > 0) {
        for (const panel of result.panelFeatures) {
          const panelLatLngs = geoJsonToLeafletLatLngs(panel.geometry);
          if (panelLatLngs && panelLatLngs.length >= 3) {
            const panelLayer = L.polygon(panelLatLngs, SOLAR_PANEL_STYLE);
            drawnItems.addLayer(panelLayer);
          }
        }
      }

      // 6. Automatically zoom/fit bounds to traced roof area
      const polygonBounds = roofLayer.getBounds();
      if (polygonBounds && polygonBounds.isValid()) {
        map.flyToBounds(polygonBounds, {
          padding: [50, 50],
          maxZoom: 20,
          duration: 1.0
        });
      }

      // 7. Propagate GeoJSON to Turf.js area calculator callback
      if (onPolygonDrawnRef.current) {
        onPolygonDrawnRef.current(result.roofFeature, roofLayer.getLatLngs());
      }

      setAutoDetectMessage(
        `AI roof boundary traced successfully (${result.panelFeatures?.length || 0} solar panel positions mapped).`
      );
      setTimeout(() => setAutoDetectMessage(null), 6000);
    } catch (err) {
      console.error('AI Auto-tracing unexpected error:', err);
      setTraceError('0 polygons detected for the given location/roof area.');
    } finally {
      setIsTracing(false);
    }
  }, [initialGeoJSON]);
  */

  // ─── Helpers exposed to parent via drawControlRef ───────────────────────────

  const startDrawing = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (editHandlerRef.current) {
      try { editHandlerRef.current.disable(); } catch (_) {}
      editHandlerRef.current = null;
    }
    if (drawnItemsRef.current) drawnItemsRef.current.clearLayers();
    if (onPolygonClearedRef.current) onPolygonClearedRef.current();
    setTracedPolygons(null);
    setTraceError(null);

    // Ensure custom pane with zIndex 650 exists
    if (!map.getPane('roofPolygonPane')) {
      const pane = map.createPane('roofPolygonPane');
      pane.style.zIndex = '650';
    }

    const handler = new L.Draw.Polygon(map, {
      shapeOptions: {
        color: '#10B981',
        weight: 3,
        fillColor: '#34D399',
        fillOpacity: 0.4,
        pane: 'roofPolygonPane'
      },
      showArea: false,
      allowIntersection: false
    });
    handler.enable();
  }, []);

  const startEditing = useCallback(() => {
    const drawnItems = drawnItemsRef.current;
    if (!drawnItems || drawnItems.getLayers().length === 0) return;
    const editHandler = new L.EditToolbar.Edit(mapInstanceRef.current, {
      featureGroup: drawnItems,
      selectedPathOptions: {
        maintainColor: true,
        opacity: 0.4
      }
    });
    editHandlerRef.current = editHandler;
    editHandler.enable();
  }, []);

  const saveEditing = useCallback(() => {
    if (!editHandlerRef.current) return;
    editHandlerRef.current.save();
    editHandlerRef.current.disable();
    editHandlerRef.current = null;

    const drawnItems = drawnItemsRef.current;
    if (drawnItems && onPolygonDrawnRef.current) {
      const layers = drawnItems.getLayers();
      if (layers.length > 0) {
        const layer = layers[0];
        onPolygonDrawnRef.current(layer.toGeoJSON(), layer.getLatLngs());
      }
    }
  }, []);

  const clearPolygon = useCallback(() => {
    if (editHandlerRef.current) {
      try { editHandlerRef.current.disable(); } catch (_) {}
      editHandlerRef.current = null;
    }
    if (drawnItemsRef.current) drawnItemsRef.current.clearLayers();
    if (onPolygonClearedRef.current) onPolygonClearedRef.current();
    setTracedPolygons(null);
    setTraceError(null);
  }, []);

  /*
  // AUTO-TRACING EXECUTION HOOK DISABLED
  const autoTraceRoof = useCallback(() => {
    runAutoDetectBuilding(latNum, lngNum, true);
  }, [latNum, lngNum, runAutoDetectBuilding]);
  */

  // Expose programmatic controls to parent via drawControlRef
  useEffect(() => {
    if (drawControlRef) {
      drawControlRef.current = {
        startDrawing,
        startEditing,
        saveEditing,
        clearPolygon,
        // autoTraceRoof,
        isTracing
      };
    }
  }, [drawControlRef, startDrawing, startEditing, saveEditing, clearPolygon, isTracing]);

  // ─── Initialize Leaflet map (runs once on mount) ─────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // 1. Create Leaflet map instance
      const map = L.map(mapContainerRef.current, {
        center: [latNum, lngNum],
        zoom,
        maxZoom: 20,
        minZoom: 4,
        zoomControl: false,
        attributionControl: true
      });

      // 2. Dedicated roof polygon pane with zIndex 650 (above satellite tile pane zIndex: 200)
      const roofPane = map.createPane('roofPolygonPane');
      roofPane.style.zIndex = '650';

      // 3. Zoom control (top-right)
      L.control.zoom({ position: 'topright' }).addTo(map);

      // 4. Esri World Imagery satellite tile layer
      L.tileLayer(ESRI_TILE_URL, {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: ESRI_ATTRIBUTION
      }).addTo(map);

      // 5. FeatureGroup to hold drawn and auto-detected polygons
      const drawnItems = new L.FeatureGroup();
      drawnItems.addTo(map);
      drawnItemsRef.current = drawnItems;

      // Restore initial GeoJSON if passed
      if (initialGeoJSON) {
        try {
          const normalized = {
            ...initialGeoJSON,
            geometry: initialGeoJSON.geometry ? {
              ...initialGeoJSON.geometry,
              coordinates: normalizeGeoJsonCoordinates(initialGeoJSON.geometry.coordinates)
            } : initialGeoJSON.geometry
          };

          const geoLayer = L.geoJSON(normalized, {
            pane: 'roofPolygonPane',
            style: ROOF_LAYER_STYLE
          });
          geoLayer.eachLayer((l) => drawnItems.addLayer(l));

          const bounds = geoLayer.getBounds();
          if (bounds && bounds.isValid()) {
            map.fitBounds(bounds, { padding: [40, 40], maxZoom: 20 });
          }
        } catch (err) {
          console.warn('Could not restore initial GeoJSON on map mount:', err);
        }
      }

      // 6. Center location pin
      const centerIcon = L.divIcon({
        className: 'custom-map-center-pin',
        html: `
          <div class="map-pulse-wrapper">
            <div class="map-pulse-ring"></div>
            <div class="map-center-dot"></div>
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      const marker = L.marker([latNum, lngNum], {
        icon: centerIcon,
        interactive: true,
        title: cityName || `Coordinates: ${latNum.toFixed(4)}, ${lngNum.toFixed(4)}`
      }).addTo(map);
      if (cityName) {
        marker.bindPopup(`<strong>Target Location</strong><br/>${cityName}`);
      }
      markerRef.current = marker;

      // 7. Listen for draw:created event
      map.on(L.Draw.Event.CREATED, (e) => {
        drawnItems.clearLayers();
        const layer = e.layer;
        layer.setStyle(ROOF_LAYER_STYLE);
        drawnItems.addLayer(layer);
        setTracedPolygons(layer.toGeoJSON());
        setTraceError(null);
        if (onPolygonDrawnRef.current) {
          onPolygonDrawnRef.current(layer.toGeoJSON(), layer.getLatLngs());
        }
      });

      // 8. Listen for draw:edited
      map.on(L.Draw.Event.EDITED, (e) => {
        e.layers.eachLayer((layer) => {
          if (onPolygonDrawnRef.current) {
            onPolygonDrawnRef.current(layer.toGeoJSON(), layer.getLatLngs());
          }
        });
      });

      // 9. Listen for draw:deleted
      map.on(L.Draw.Event.DELETED, () => {
        if (drawnItems.getLayers().length === 0) {
          setTracedPolygons(null);
          if (onPolygonClearedRef.current) {
            onPolygonClearedRef.current();
          }
        }
      });

      mapInstanceRef.current = map;

      // Invalidate size after layout settles and default directly to Manual Tracing Tool
      const timer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
          // Ensure the map component defaults directly to the existing Manual Tracing Tool when loaded
          if (!initialGeoJSON) {
            startDrawing();
          }
        }
      }, 150);

      /*
      // AUTO-TRACING DISABLED: Initial building auto-detection commented out
      // runAutoDetectBuilding(latNum, lngNum, false);
      */

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
          drawnItemsRef.current = null;
          markerRef.current = null;
          editHandlerRef.current = null;
        }
      };
    } catch (err) {
      console.error('Leaflet map initialization error:', err);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── React to coordinate changes ────────────────────────────────────────────

  useEffect(() => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView([latNum, lngNum], zoom, {
      animate: true,
      pan: { duration: 0.8 }
    });
    if (markerRef.current) {
      markerRef.current.setLatLng([latNum, lngNum]);
      if (cityName) {
        markerRef.current.setPopupContent(`<strong>Target Location</strong><br/>${cityName}`);
      }
    }

    /*
    // AUTO-TRACING DISABLED: Auto-detection trigger on location/pin changes commented out
    // runAutoDetectBuilding(latNum, lngNum, false);
    */
  }, [latNum, lngNum, zoom, cityName]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latNum, lngNum], zoom, { animate: true });
    }
  };

  return (
    <div className={`roof-map-wrapper ${className}`} style={{ position: 'relative' }}>
      {/* ── Tracing In-Progress Loading Spinner Overlay ───────────────────────── */}
      {isTracing && (
        <div
          className="roof-map-tracing-spinner-overlay"
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(4px)',
            zIndex: 800,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            borderRadius: '12px',
            pointerEvents: 'all'
          }}
        >
          <Loader2 size={38} className="animate-spin text-emerald" style={{ color: '#10b981' }} />
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#f8fafc', fontWeight: 700, fontSize: '0.95rem', marginBottom: '4px' }}>
              AI Auto-Tracing Rooftop...
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
              Detecting building boundary & solar panel grid layout
            </div>
          </div>
        </div>
      )}

      {/* ── Auto-Detect Success Toast ────────────────────────────────────────── */}
      {autoDetectMessage && !isTracing && (
        <div 
          className="roof-map-autodetect-toast" 
          style={{
            position: 'absolute',
            top: '3.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#ffffff',
            padding: '0.5rem 1.1rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
            border: '1px solid rgba(16, 185, 129, 0.6)',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <Sparkles size={16} style={{ color: '#10b981', flexShrink: 0 }} />
          <span>{autoDetectMessage}</span>
        </div>
      )}

      {/* ── Error Toast (0 polygons detected or network failure) ───────────────── */}
      {traceError && !isTracing && (
        <div
          className="roof-map-error-toast"
          style={{
            position: 'absolute',
            top: '3.25rem',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            color: '#fca5a5',
            padding: '0.55rem 1rem 0.55rem 1.1rem',
            borderRadius: '9999px',
            fontSize: '0.8125rem',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
            border: '1px solid rgba(239, 68, 68, 0.6)',
            backdropFilter: 'blur(6px)',
            animation: 'fadeIn 0.25s ease'
          }}
        >
          <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
          <span>{traceError}</span>
          <button
            type="button"
            onClick={() => setTraceError(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '0 2px'
            }}
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Map info overlay bar */}
      <div className="roof-map-overlay-header">
        <div className="map-layer-badge">
          <Layers size={14} className="text-emerald" />
          <span>Esri World Imagery (Satellite)</span>
        </div>

        <div className="map-center-coords-badge">
          <MapPin size={14} className="text-gold" />
          <span>
            {cityName ? `${cityName} • ` : ''}
            {latNum.toFixed(4)}° N, {lngNum.toFixed(4)}° E
          </span>
          <button
            type="button"
            className="btn-map-recenter"
            onClick={handleRecenter}
            title="Recenter on confirmed location"
          >
            <RotateCcw size={13} />
            <span>Recenter</span>
          </button>
        </div>
      </div>

      {/* Leaflet map DOM container */}
      <div
        ref={mapContainerRef}
        id="roof-leaflet-map"
        className="roof-leaflet-map-container"
      />
    </div>
  );
}
