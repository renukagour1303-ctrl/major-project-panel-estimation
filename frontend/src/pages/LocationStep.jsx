import React from 'react';
import { MapPin, Navigation, Search, Info, CheckCircle2 } from 'lucide-react';

export default function LocationStep({ locationData, updateLocationData }) {
  return (
    <div className="step-content-card">
      <div className="step-header-block">
        <div className="step-icon-badge">
          <MapPin size={24} />
        </div>
        <div>
          <h2>Step 1: Detect or Enter Your Location</h2>
          <p>
            We use your geographical coordinates to retrieve regional solar irradiance data from PVGIS and NASA POWER.
          </p>
        </div>
      </div>

      <div className="location-options-grid">
        {/* Option A: GPS Auto-Detect Mockup */}
        <div className="option-box">
          <div className="option-icon-wrapper emerald">
            <Navigation size={22} />
          </div>
          <div className="option-text">
            <h3>Automatic GPS Detection</h3>
            <p>Locate your property using your device's browser location sensor.</p>
          </div>
          <button 
            type="button" 
            className="btn-secondary"
            onClick={() => updateLocationData({ 
              method: 'gps', 
              cityName: 'Chhatrapati Sambhajinagar (Auto-detected)', 
              lat: '19.8762', 
              lng: '75.3433' 
            })}
          >
            <Navigation size={16} />
            Detect My Location
          </button>
        </div>

        {/* Option B: Manual Search */}
        <div className="option-box">
          <div className="option-icon-wrapper gold">
            <Search size={22} />
          </div>
          <div className="option-text">
            <h3>Manual City or Pincode Search</h3>
            <p>Search your town or pincode in Maharashtra (via Nominatim Geocoding).</p>
          </div>
          <div className="search-input-group">
            <input 
              type="text" 
              placeholder="e.g. Chhatrapati Sambhajinagar, 431001"
              value={locationData.cityName || ''}
              onChange={(e) => updateLocationData({ cityName: e.target.value, method: 'manual' })}
              className="form-input"
            />
          </div>
        </div>
      </div>

      {/* Confirmed Location Preview Pill */}
      {locationData.cityName && (
        <div className="confirmed-location-card">
          <div className="confirmed-header">
            <CheckCircle2 size={18} className="text-emerald" />
            <strong>Selected Location:</strong>
            <span>{locationData.cityName}</span>
          </div>
          <div className="coords-tag">
            <span>Lat: {locationData.lat || '19.8762'}° N</span>
            <span>Lng: {locationData.lng || '75.3433'}° E</span>
          </div>
        </div>
      )}

      <div className="info-banner">
        <Info size={18} />
        <div>
          <strong>Privacy Note:</strong> Your location is strictly used to center satellite imagery and calculate solar solar irradiance. No personal address data is stored without permission.
        </div>
      </div>
    </div>
  );
}
