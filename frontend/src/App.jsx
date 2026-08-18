import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';

import Navbar from './components/Navbar.jsx';
import StepIndicator from './components/StepIndicator.jsx';
import Footer from './components/Footer.jsx';

import LocationStep from './pages/LocationStep.jsx';
import RoofTraceStep from './pages/RoofTraceStep.jsx';
import ElectricityInputsStep from './pages/ElectricityInputsStep.jsx';
import CalculationStep from './pages/CalculationStep.jsx';
import ResultsStep from './pages/ResultsStep.jsx';

const STEPS = [
  { id: 1, title: 'Location' },
  { id: 2, title: 'Trace Roof' },
  { id: 3, title: 'Inputs' },
  { id: 4, title: 'Calculate' },
  { id: 5, title: 'Results' }
];

export default function App() {
  const [currentStep, setCurrentStep] = useState(1);
  const [isCalculating, setIsCalculating] = useState(false);
  const [backendOnline, setBackendOnline] = useState(false);

  // State values collected across the step wizard
  const [locationData, setLocationData] = useState({
    method: 'manual',
    cityName: 'Chhatrapati Sambhajinagar',
    lat: '19.8762',
    lng: '75.3433'
  });

  const [roofData, setRoofData] = useState({
    traced: true,
    areaSqM: 80,
    usableAreaSqM: 60
  });

  const [inputData, setInputData] = useState({
    monthlyBill: '3500',
    perUnitRate: '8.50',
    panelWattage: 400
  });

  // Verify backend health on mount
  useEffect(() => {
    const checkBackend = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_BASE_URL || '/api';
        const res = await axios.get(`${apiUrl}/health`);
        if (res.data?.status === 'ok') {
          setBackendOnline(true);
        }
      } catch (err) {
        setBackendOnline(false);
      }
    };
    checkBackend();
  }, []);

  const updateLocationData = (fields) => {
    setLocationData(prev => ({ ...prev, ...fields }));
  };

  const updateRoofData = (fields) => {
    setRoofData(prev => ({ ...prev, ...fields }));
  };

  const updateInputData = (fields) => {
    setInputData(prev => ({ ...prev, ...fields }));
  };

  // Step Navigation Handlers
  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleStepClick = (stepId) => {
    if (stepId <= currentStep) {
      setCurrentStep(stepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleCalculate = () => {
    setIsCalculating(true);
    // Simulate calculation transition to results step for Chunk 2 UI shell
    setTimeout(() => {
      setIsCalculating(false);
      setCurrentStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 600);
  };

  const handleReset = () => {
    setCurrentStep(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="app-container">
      {/* Header */}
      <Navbar backendOnline={backendOnline} />

      {/* Main Content */}
      <main className="main-content">
        {/* Step Indicator */}
        <StepIndicator 
          steps={STEPS} 
          currentStep={currentStep} 
          onStepClick={handleStepClick}
        />

        {/* Step Body */}
        {currentStep === 1 && (
          <LocationStep 
            locationData={locationData} 
            updateLocationData={updateLocationData} 
          />
        )}

        {currentStep === 2 && (
          <RoofTraceStep 
            roofData={roofData} 
            updateRoofData={updateRoofData} 
          />
        )}

        {currentStep === 3 && (
          <ElectricityInputsStep 
            inputData={inputData} 
            updateInputData={updateInputData} 
          />
        )}

        {currentStep === 4 && (
          <CalculationStep 
            locationData={locationData}
            roofData={roofData}
            inputData={inputData}
            onCalculate={handleCalculate}
            isCalculating={isCalculating}
          />
        )}

        {currentStep === 5 && (
          <ResultsStep onReset={handleReset} />
        )}

        {/* Wizard Bottom Controls (for steps 1 to 3) */}
        {currentStep < 4 && (
          <div className="wizard-navigation-bar">
            {currentStep > 1 ? (
              <button type="button" className="btn-secondary" onClick={handlePrev}>
                <ArrowLeft size={16} />
                <span>Previous Step</span>
              </button>
            ) : (
              <div></div>
            )}

            <button type="button" className="btn-primary" onClick={handleNext}>
              <span>Continue to Next Step</span>
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {/* Wizard Bottom Controls for Step 4 back navigation */}
        {currentStep === 4 && (
          <div className="wizard-navigation-bar">
            <button type="button" className="btn-secondary" onClick={handlePrev}>
              <ArrowLeft size={16} />
              <span>Back to Inputs</span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
