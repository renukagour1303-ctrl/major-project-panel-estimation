# AI-Powered Solar Calculator Web Tool

A client-facing pre-sales estimation tool developed for **Sungroves Innovations LLP** (Solar Installation Company, Chhatrapati Sambhajinagar, Maharashtra, India).

The tool automates preliminary rooftop solar assessments by enabling users to locate their property, trace their roof boundary on high-resolution satellite imagery, specify their electricity bill details, and obtain instant deterministic technical, financial, and environmental estimations accompanied by AI explanations.

---

## 🏛️ Architecture Overview

The system strictly adheres to a decoupled architecture with two primary layers:
1. **Deterministic Calculation Engine (Backend)**: Explicit JavaScript mathematical formulas compute system capacity (kWp), generation (kWh), savings (₹), PM Surya Ghar subsidy, net metering estimates, payback period, and CO₂ reduction.
2. **AI Explanation Layer (Claude via Backend)**: Generates human-friendly explanations and recommendations based solely on computed results without inventing or modifying numerical figures.

```
User Inputs (Location, Traced Roof, Bill, Tariff, Panel Wattage)
         │
         ▼
Satellite Map & Turf.js Geometry Calculation
         │
         ▼
Backend REST API
         │
    ┌────┴────────────────────────┐
    ▼                             ▼
PVGIS / NASA POWER API      Deterministic Calculation Engine
(Solar Resource Data)       (Capacity, Generation, Savings, Subsidy)
    │                             │
    └──────────────┬──────────────┘
                   │
                   ▼
         Claude AI Explanation (Backend)
                   │
                   ▼
         SQLite Database History
                   │
                   ▼
      Interactive Results Dashboard
```

---

## 📁 Project Structure

```
solar-calculator/
├── frontend/                     # React.js (Vite) Single Page Application
│   ├── src/
│   │   ├── components/           # UI Components (Map, Inputs, Summary Cards)
│   │   ├── pages/                # Step-by-Step workflow views
│   │   ├── services/             # API client services
│   │   ├── utils/                # Helpers & formatters
│   │   ├── App.jsx               # Root Application Component
│   │   ├── main.jsx              # React Entry Point
│   │   └── index.css             # Sungroves Design System & Styles
│   ├── index.html                # HTML Document Template
│   ├── vite.config.js            # Vite Configuration
│   └── package.json              # Frontend Dependencies & Scripts
│
├── backend/                      # Node.js + Express.js REST API
│   ├── src/
│   │   ├── routes/               # API Route Handlers
│   │   ├── controllers/          # Business logic controllers
│   │   ├── services/             # PVGIS, NASA POWER, Claude AI clients
│   │   ├── calculations/         # Pure deterministic calculation functions
│   │   ├── database/             # SQLite configuration and schema
│   │   ├── utils/                # Validation and formatting utilities
│   │   └── server.js             # Express Application Entry Point
│   └── package.json              # Backend Dependencies & Scripts
│
├── SPEC.md                       # Complete Project Specification
├── .gitignore                    # Git Exclusions
├── .env.example                  # Environment Configuration Template
└── README.md                     # Project Documentation
```

---

## 🛠️ Technology Stack

- **Frontend**: React.js (Vite), JavaScript, Axios, Leaflet.js / Leaflet.draw, Turf.js, Recharts, Lucide Icons.
- **Backend**: Node.js, Express.js, CORS, Dotenv.
- **Database**: SQLite.
- **External Services**: PVGIS API (Primary Solar Data), NASA POWER API (Solar Fallback), Anthropic Claude API (AI Explanations), Nominatim (Geocoding), Esri World Imagery (Satellite Tiles).

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **Git**

### 1. Clone & Environment Configuration

Copy the example environment file:
```bash
# In project root
cp .env.example .env
```
Update any API keys or configuration options in your `.env` file as needed (API keys remain securely on the backend).

---

### 2. Backend Setup & Run

Open a terminal and navigate to the `backend/` directory:

```bash
cd backend
npm install
npm start
```
The backend server will start on `http://localhost:5000`.  
Health check endpoint: `http://localhost:5000/api/health`.

For hot-reloading during development:
```bash
npm run dev
```

---

### 3. Frontend Setup & Run

Open a separate terminal and navigate to the `frontend/` directory:

```bash
cd frontend
npm install
npm run dev
```
The Vite development server will start on `http://localhost:5173`.

---

## 📌 Development Progress (Chunked Strategy)

- [x] **Chunk 1: Project Setup** - Directory structure, package configs, environment templates, Git, and backend health verification.
- [ ] **Chunk 2: Frontend Shell & Navigation** - Step-by-step wizard workflow layout and responsive navigation.
- [ ] **Chunk 3: Location Detection** - GPS geolocation and Nominatim manual fallback.
- [ ] **Chunk 4: Satellite Map Integration** - Leaflet map with Esri World Imagery.
- [ ] **Chunk 5: Roof Drawing** - Leaflet.draw polygon tracing, editing, and deletion.
- [ ] **Chunk 6: Roof Area Calculation** - Turf.js polygon area and 75% usable space logic.
- [ ] **Chunk 7: Electricity Inputs** - Bill amount, tariff rate, and panel wattage selection.
- [ ] **Chunk 8: Calculation Engine** - Deterministic solar calculation formulas and unit tests.
- [ ] **Chunk 9: PVGIS Integration** - Backend retrieval of solar resource irradiance.
- [ ] **Chunk 10: NASA POWER Fallback** - Automatic fallback solar-resource data.
- [ ] **Chunk 11: Backend/Frontend Integration** - Complete calculation pipeline.
- [ ] **Chunk 12: Results Dashboard** - Technical, financial, and environmental metrics.
- [ ] **Chunk 13: SQLite Persistence** - Calculation history and tracking.
- [ ] **Chunk 14: Claude AI Recommendation** - Natural language explanation layer.
- [ ] **Chunk 15: Full Integration & Validation**
- [ ] **Chunk 16: Comprehensive Testing**
- [ ] **Chunk 17: Final UI Polish & Client Readiness**

---

## ⚖️ Client Disclaimer

This application generates preliminary pre-sales estimates. It does not replace physical on-site structural or electrical inspections, final engineering designs, utility approvals, or formal installation contracts. Estimates should be reviewed with **Sungroves Innovations LLP**.
