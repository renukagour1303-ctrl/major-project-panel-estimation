import React from 'react';
import { MapPin } from 'lucide-react';
import LocationSelector from '../components/LocationSelector.jsx';

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

      {/* Interactive Location Selector Component */}
      <LocationSelector 
        locationData={locationData} 
        onLocationSelect={updateLocationData} 
      />
    </div>
  );
}
