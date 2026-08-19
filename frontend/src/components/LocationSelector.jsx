import React, { useState } from 'react';
import { 
  Navigation, 
  Search, 
  MapPin, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Loader2, 
  RotateCcw, 
  Info,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { getCurrentPosition, searchLocation } from '../services/geocodingService.js';

const QUICK_CITIES = [
  { name: 'Chhatrapati Sambhajinagar', query: 'Chhatrapati Sambhajinagar, Maharashtra', lat: 19.8762, lng: 75.3433 },
  { name: 'Pune', query: 'Pune, Maharashtra', lat: 18.5204, lng: 73.8567 },
  { name: 'Nashik', query: 'Nashik, Maharashtra', lat: 19.9975, lng: 73.7898 },
  { name: 'Mumbai', query: 'Mumbai, Maharashtra', lat: 19.0760, lng: 72.8777 },
  { name: 'Nagpur', query: 'Nagpur, Maharashtra', lat: 21.1458, lng: 79.0882 }
];

export default function LocationSelector({ locationData, onLocationSelect }) {
  const [isLocatingGPS, setIsLocatingGPS] = useState(false);
  const [isSearchingManual, setIsSearchingManual] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [gpsError, setGpsError] = useState(null);

  // Handle GPS detection
  const handleDetectGPS = async () => {
    setIsLocatingGPS(true);
    setGpsError(null);
    setErrorMessage(null);
    setSearchResults([]);

    try {
      const result = await getCurrentPosition();
      onLocationSelect({
        latitude: result.latitude,
        longitude: result.longitude,
        lat: result.lat,
        lng: result.lng,
        cityName: result.cityName,
        displayName: result.displayName,
        shortName: result.shortName,
        source: 'gps',
        method: 'gps',
        rawAddress: result.address
      });
    } catch (err) {
      setGpsError(err.message || 'Unable to retrieve your GPS location.');
    } finally {
      setIsLocatingGPS(false);
    }
  };

  // Handle Manual Search Submission
  const handleManualSearch = async (e) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) {
      setErrorMessage('Please enter a city name, pincode, or coordinates.');
      return;
    }

    setIsSearchingManual(true);
    setErrorMessage(null);
    setGpsError(null);
    setSearchResults([]);

    try {
      const results = await searchLocation(query);

      if (results.length === 0) {
        setErrorMessage(`No location results found for "${query}". Please check your spelling or try a nearby city/pincode.`);
      } else if (results.length === 1) {
        // Single exact match or parsed coordinates
        const item = results[0];
        confirmLocation(item);
      } else {
        // Multiple matches found - show selection list
        setSearchResults(results);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during location search.');
    } finally {
      setIsSearchingManual(false);
    }
  };

  // Confirm a candidate from search results or quick-cities
  const confirmLocation = (item) => {
    onLocationSelect({
      latitude: item.latitude,
      longitude: item.longitude,
      lat: item.lat ? item.lat.toString() : item.latitude.toString(),
      lng: item.lng ? item.lng.toString() : item.longitude.toString(),
      cityName: item.cityName || item.name || 'Selected Location',
      displayName: item.displayName || item.name || '',
      shortName: item.shortName || item.cityName || item.name || '',
      source: 'manual',
      method: 'manual',
      rawAddress: item.address || {}
    });
    setSearchResults([]);
    setErrorMessage(null);
  };

  // Quick City Click Handler
  const handleQuickCitySelect = (city) => {
    confirmLocation({
      latitude: city.lat,
      longitude: city.lng,
      lat: city.lat.toString(),
      lng: city.lng.toString(),
      cityName: city.name,
      displayName: `${city.name}, Maharashtra, India`,
      shortName: `${city.name}, Maharashtra`,
      source: 'manual'
    });
    setSearchQuery(city.name);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setErrorMessage(null);
  };

  const isLocationConfirmed = Boolean(
    locationData && 
    (locationData.latitude || locationData.lat) && 
    (locationData.longitude || locationData.lng)
  );

  const displayLat = locationData?.latitude ?? locationData?.lat ?? '';
  const displayLng = locationData?.longitude ?? locationData?.lng ?? '';

  return (
    <div className="location-selector-container">
      {/* Option A & B Dual Grid */}
      <div className="location-options-grid">
        {/* Option 1: Automatic GPS Detection */}
        <div className={`option-box ${locationData?.source === 'gps' ? 'selected-box' : ''}`}>
          <div className="option-header-row">
            <div className="option-icon-wrapper emerald">
              <Navigation size={22} />
            </div>
            <div className="option-text">
              <h3>Automatic GPS Detection</h3>
              <p>Detect your exact rooftop coordinates using your browser's location sensor.</p>
            </div>
          </div>

          <div className="option-action-area">
            <button 
              type="button" 
              className="btn-primary-emerald"
              onClick={handleDetectGPS}
              disabled={isLocatingGPS}
            >
              {isLocatingGPS ? (
                <>
                  <Loader2 size={16} className="spin-icon" />
                  <span>Detecting GPS Location...</span>
                </>
              ) : (
                <>
                  <Navigation size={16} />
                  <span>Detect My Location</span>
                </>
              )}
            </button>
          </div>

          {gpsError && (
            <div className="inline-error-banner">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <div className="error-text-content">
                <strong>GPS Unavailable:</strong> {gpsError}
              </div>
            </div>
          )}
        </div>

        {/* Option 2: Manual Search */}
        <div className={`option-box ${locationData?.source === 'manual' ? 'selected-box' : ''}`}>
          <div className="option-header-row">
            <div className="option-icon-wrapper gold">
              <Search size={22} />
            </div>
            <div className="option-text">
              <h3>Manual City / Pincode Search</h3>
              <p>Search by city name, 6-digit Indian pincode, or raw "Lat, Lng" coordinates.</p>
            </div>
          </div>

          <form onSubmit={handleManualSearch} className="search-form-wrapper">
            <div className="search-input-group">
              <input 
                type="text" 
                placeholder="e.g. Chhatrapati Sambhajinagar, 431001, or 19.87, 75.34"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="form-input search-field"
                disabled={isSearchingManual}
              />
              {searchQuery && (
                <button 
                  type="button" 
                  className="search-clear-btn"
                  onClick={handleClearSearch}
                  title="Clear input"
                >
                  <X size={16} />
                </button>
              )}
              <button 
                type="submit" 
                className="btn-search-submit"
                disabled={isSearchingManual || !searchQuery.trim()}
              >
                {isSearchingManual ? (
                  <Loader2 size={16} className="spin-icon" />
                ) : (
                  <Search size={16} />
                )}
                <span>Search</span>
              </button>
            </div>
          </form>

          {/* Quick suggestions chips */}
          <div className="quick-cities-row">
            <span className="quick-label">Popular in MH:</span>
            {QUICK_CITIES.map((city) => (
              <button
                key={city.name}
                type="button"
                className="quick-chip-btn"
                onClick={() => handleQuickCitySelect(city)}
              >
                {city.name}
              </button>
            ))}
          </div>

          {errorMessage && (
            <div className="inline-error-banner">
              <AlertTriangle size={16} className="flex-shrink-0" />
              <div className="error-text-content">
                {errorMessage}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disambiguation Search Results Dropdown/List */}
      {searchResults.length > 1 && (
        <div className="search-results-panel">
          <div className="results-panel-header">
            <MapPin size={16} className="text-emerald" />
            <span>Multiple matches found. Select your exact location:</span>
          </div>
          <div className="results-list">
            {searchResults.map((item, idx) => (
              <div 
                key={idx} 
                className="result-item-card"
                onClick={() => confirmLocation(item)}
              >
                <div className="result-item-info">
                  <strong>{item.shortName || item.cityName}</strong>
                  <p>{item.displayName}</p>
                </div>
                <div className="result-item-meta">
                  <span className="coord-chip">
                    {Number(item.latitude).toFixed(4)}°, {Number(item.longitude).toFixed(4)}°
                  </span>
                  <ChevronRight size={16} className="text-muted" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Confirmed Location Confirmation Card */}
      {isLocationConfirmed && (
        <div className="confirmed-location-card">
          <div className="confirmed-header">
            <div className="confirmed-badge-icon">
              <CheckCircle2 size={20} className="text-emerald" />
            </div>
            <div className="confirmed-info">
              <div className="confirmed-title-row">
                <strong>Confirmed Location:</strong>
                <span className="location-name-highlight">
                  {locationData.cityName || locationData.displayName || 'Confirmed Location'}
                </span>
                <span className={`source-pill ${locationData.source === 'gps' ? 'gps' : 'manual'}`}>
                  {locationData.source === 'gps' ? 'GPS Sensor' : 'Manual Geocode'}
                </span>
              </div>
              {locationData.displayName && locationData.displayName !== locationData.cityName && (
                <p className="confirmed-full-address">{locationData.displayName}</p>
              )}
            </div>
          </div>
          <div className="coords-tag-group">
            <div className="coords-tag">
              <span className="coord-label">Latitude:</span>
              <span className="coord-val">{Number(displayLat).toFixed(4)}° N</span>
            </div>
            <div className="coords-tag">
              <span className="coord-label">Longitude:</span>
              <span className="coord-val">{Number(displayLng).toFixed(4)}° E</span>
            </div>
          </div>
        </div>
      )}

      {/* Privacy & Educational Note */}
      <div className="info-banner">
        <Info size={18} className="flex-shrink-0" />
        <div>
          <strong>Solar Irradiance Alignment:</strong> Your latitude and longitude are strictly used to center the high-resolution satellite map (Step 2) and query monthly solar radiation from PVGIS / NASA POWER.
        </div>
      </div>
    </div>
  );
}
