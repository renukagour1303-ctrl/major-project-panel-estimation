import React, { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Layers, MapPin, RotateCcw } from 'lucide-react';

const ESRI_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

export default function RoofMap({ 
  latitude = 19.8762, 
  longitude = 75.3433, 
  cityName = '',
  zoom = 19,
  className = '',
  // Chunk 5: drawing callbacks
  onPolygonDrawn = null,   // (geojson, latlngs) => void
  onPolygonCleared = null, // () => void
  // Refs exposed to parent for programmatic draw/edit/clear control
  drawControlRef = null    // mutable ref parent provides
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const drawnItemsRef = useRef(null);   // L.FeatureGroup holding the polygon
  const drawControlInstanceRef = useRef(null);
  const editHandlerRef = useRef(null);

  // Normalize numeric coordinates
  const latNum = typeof latitude === 'number' ? latitude : (parseFloat(latitude) || 19.8762);
  const lngNum = typeof longitude === 'number' ? longitude : (parseFloat(longitude) || 75.3433);

  // ─── helpers exposed to parent via drawControlRef ───────────────────────────

  const startDrawing = useCallback(() => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // Cancel any active edit/delete first
    if (editHandlerRef.current) {
      try { editHandlerRef.current.disable(); } catch(_) {}
      editHandlerRef.current = null;
    }
    // Clear existing polygon before starting a fresh draw
    if (drawnItemsRef.current) drawnItemsRef.current.clearLayers();
    if (onPolygonCleared) onPolygonCleared();

    const handler = new L.Draw.Polygon(map, {
      shapeOptions: {
        color: '#10b981',
        fillColor: '#10b981',
        fillOpacity: 0.25,
        weight: 2.5,
        dashArray: null
      },
      showArea: false,
      allowIntersection: false
    });
    handler.enable();
  }, [onPolygonCleared]);

  const startEditing = useCallback(() => {
    const drawnItems = drawnItemsRef.current;
    if (!drawnItems || drawnItems.getLayers().length === 0) return;
    const editHandler = new L.EditToolbar.Edit(mapInstanceRef.current, {
      featureGroup: drawnItems,
      selectedPathOptions: {
        maintainColor: true,
        opacity: 0.3
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

    // Re-emit geometry after edit
    const drawnItems = drawnItemsRef.current;
    if (drawnItems && onPolygonDrawn) {
      const layers = drawnItems.getLayers();
      if (layers.length > 0) {
        const layer = layers[0];
        onPolygonDrawn(layer.toGeoJSON(), layer.getLatLngs());
      }
    }
  }, [onPolygonDrawn]);

  const clearPolygon = useCallback(() => {
    if (editHandlerRef.current) {
      try { editHandlerRef.current.disable(); } catch(_) {}
      editHandlerRef.current = null;
    }
    if (drawnItemsRef.current) drawnItemsRef.current.clearLayers();
    if (onPolygonCleared) onPolygonCleared();
  }, [onPolygonCleared]);

  // Expose programmatic controls to parent via drawControlRef
  useEffect(() => {
    if (drawControlRef) {
      drawControlRef.current = { startDrawing, startEditing, saveEditing, clearPolygon };
    }
  }, [drawControlRef, startDrawing, startEditing, saveEditing, clearPolygon]);

  // ─── Initialize Leaflet map (runs once on mount) ─────────────────────────────

  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate initialization
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // 1. Create map
      const map = L.map(mapContainerRef.current, {
        center: [latNum, lngNum],
        zoom,
        maxZoom: 20,
        minZoom: 4,
        zoomControl: false,
        attributionControl: true
      });

      // 2. Zoom control (top-right, below our overlay header)
      L.control.zoom({ position: 'topright' }).addTo(map);

      // 3. Esri World Imagery tile layer
      L.tileLayer(ESRI_TILE_URL, {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: ESRI_ATTRIBUTION
      }).addTo(map);

      // 4. FeatureGroup to hold drawn polygon
      const drawnItems = new L.FeatureGroup();
      drawnItems.addTo(map);
      drawnItemsRef.current = drawnItems;

      // 5. Center location pulse pin
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

      // 6. Listen for draw:created event
      map.on(L.Draw.Event.CREATED, (e) => {
        // Only allow one polygon at a time
        drawnItems.clearLayers();
        const layer = e.layer;
        // Style the completed polygon
        layer.setStyle({
          color: '#10b981',
          fillColor: '#10b981',
          fillOpacity: 0.25,
          weight: 2.5
        });
        drawnItems.addLayer(layer);
        if (onPolygonDrawn) {
          onPolygonDrawn(layer.toGeoJSON(), layer.getLatLngs());
        }
      });

      // 7. Listen for draw:edited (polygon edited via L.EditToolbar)
      map.on(L.Draw.Event.EDITED, (e) => {
        e.layers.eachLayer((layer) => {
          if (onPolygonDrawn) {
            onPolygonDrawn(layer.toGeoJSON(), layer.getLatLngs());
          }
        });
      });

      // 8. Listen for draw:deleted
      map.on(L.Draw.Event.DELETED, () => {
        if (drawnItems.getLayers().length === 0 && onPolygonCleared) {
          onPolygonCleared();
        }
      });

      mapInstanceRef.current = map;

      // Invalidate size after layout settles
      const timer = setTimeout(() => {
        if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 150);

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
      console.error('Leaflet map init error:', err);
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
  }, [latNum, lngNum, zoom, cityName]);

  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latNum, lngNum], zoom, { animate: true });
    }
  };

  return (
    <div className={`roof-map-wrapper ${className}`}>
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
