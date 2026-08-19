import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Layers, MapPin, Maximize2, RotateCcw, AlertCircle } from 'lucide-react';

const ESRI_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const ESRI_ATTRIBUTION = 'Tiles © Esri — Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';

export default function RoofMap({ 
  latitude = 19.8762, 
  longitude = 75.3433, 
  cityName = '',
  zoom = 19,
  className = ''
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Normalize numeric coordinates
  const latNum = typeof latitude === 'number' ? latitude : parseFloat(latitude) || 19.8762;
  const lngNum = typeof longitude === 'number' ? longitude : parseFloat(longitude) || 75.3433;

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Prevent duplicate initialization on the same container element
    if (mapInstanceRef.current) {
      mapInstanceRef.current.remove();
      mapInstanceRef.current = null;
    }

    try {
      // 1. Create Leaflet map instance
      const map = L.map(mapContainerRef.current, {
        center: [latNum, lngNum],
        zoom: zoom,
        maxZoom: 20,
        minZoom: 4,
        zoomControl: false, // We will add zoom control with custom position
        attributionControl: true
      });

      // 2. Add custom styled zoom control (top-right)
      L.control.zoom({ position: 'topright' }).addTo(map);

      // 3. Add Esri World Imagery Satellite TileLayer
      const esriTiles = L.tileLayer(ESRI_TILE_URL, {
        maxZoom: 20,
        maxNativeZoom: 19,
        attribution: ESRI_ATTRIBUTION
      });
      esriTiles.addTo(map);

      // 4. Create a clean pulse center pin icon
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
      mapInstanceRef.current = map;
      setMapLoaded(true);

      // 5. Invalidate size after container renders
      const timer = setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      }, 150);

      return () => {
        clearTimeout(timer);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.remove();
          mapInstanceRef.current = null;
        }
      };
    } catch (err) {
      console.error('Error initializing Leaflet map:', err);
    }
  }, []);

  // Update map view when coordinates change
  useEffect(() => {
    if (mapInstanceRef.current && latNum && lngNum) {
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
    }
  }, [latNum, lngNum, zoom, cityName]);

  // Recenter map on target coordinates
  const handleRecenter = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([latNum, lngNum], zoom, { animate: true });
    }
  };

  return (
    <div className={`roof-map-wrapper ${className}`}>
      {/* Map Control Bar Overlay */}
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

      {/* Leaflet Map DOM Container */}
      <div 
        ref={mapContainerRef} 
        id="roof-leaflet-map"
        className="roof-leaflet-map-container"
      />
    </div>
  );
}
