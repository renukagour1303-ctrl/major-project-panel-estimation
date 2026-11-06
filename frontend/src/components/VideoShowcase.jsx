import React, { useState } from 'react';
import { Play, Video, Sparkles, CheckCircle2, Film } from 'lucide-react';

export default function VideoShowcase({ videoSrc = null, posterSrc = null }) {
  const [isPlaying, setIsPlaying] = useState(false);

  return (
    <section className="video-showcase-section" id="demo-video-section">
      <div className="video-showcase-header">
        <div className="video-badge">
          <Film size={16} className="text-emerald" />
          <span>Product Walkthrough</span>
        </div>
        <h2>Website Demonstration Video</h2>
        <p>
          Discover how to trace your rooftop, run satellite solar analysis, and generate instantaneous PM Surya Ghar subsidy feasibility estimates in seconds.
        </p>
      </div>

      <div className="video-player-container">
        {videoSrc ? (
          <video
            className="video-element"
            controls
            poster={posterSrc || undefined}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          >
            <source src={videoSrc} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
        ) : (
          <div className="video-placeholder-card">
            <div className="video-placeholder-overlay">
              <div className="video-play-btn-mock" title="Demonstration video coming soon">
                <Play size={28} className="text-white fill-white" />
              </div>
              <div className="video-placeholder-text">
                <h3>Solar Calculator Live Walkthrough</h3>
                <p>High-definition demonstration video ready for Sungroves showcase</p>
                <div className="video-features-pill-row">
                  <span className="vf-pill">📍 Location Geocoding</span>
                  <span className="vf-pill">✏️ Rooftop Polygon Tracing</span>
                  <span className="vf-pill">☀️ PVGIS Solar Irradiance</span>
                  <span className="vf-pill">📄 Instant PDF Proposal</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
