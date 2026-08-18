import React from 'react';
import { MapPin, PenTool, Zap, Calculator, BarChart3, Check } from 'lucide-react';

export default function StepIndicator({ steps, currentStep, onStepClick }) {
  const getIcon = (id) => {
    switch (id) {
      case 1:
        return <MapPin size={18} />;
      case 2:
        return <PenTool size={18} />;
      case 3:
        return <Zap size={18} />;
      case 4:
        return <Calculator size={18} />;
      case 5:
        return <BarChart3 size={18} />;
      default:
        return null;
    }
  };

  const progressPercentage = ((currentStep - 1) / (steps.length - 1)) * 100;

  return (
    <div className="stepper-container">
      {/* Mobile Step Header */}
      <div className="mobile-stepper-header">
        <span className="mobile-step-badge">Step {currentStep} of {steps.length}</span>
        <span className="mobile-step-title">{steps[currentStep - 1]?.title}</span>
      </div>

      {/* Progress Track Line */}
      <div className="stepper-track-bg">
        <div 
          className="stepper-track-fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Steps List */}
      <div className="steps-list">
        {steps.map((step) => {
          const isCompleted = step.id < currentStep;
          const isActive = step.id === currentStep;
          const isPending = step.id > currentStep;

          let statusClass = 'pending';
          if (isActive) statusClass = 'active';
          else if (isCompleted) statusClass = 'completed';

          return (
            <button
              key={step.id}
              type="button"
              className={`step-item ${statusClass}`}
              onClick={() => onStepClick && onStepClick(step.id)}
              disabled={isPending}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="step-circle">
                {isCompleted ? (
                  <Check size={16} strokeWidth={3} />
                ) : (
                  getIcon(step.id)
                )}
              </div>
              <div className="step-text-wrapper">
                <span className="step-num">Step {step.id}</span>
                <span className="step-title">{step.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
