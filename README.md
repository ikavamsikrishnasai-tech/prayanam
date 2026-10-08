# Prayanam – Smart Tourist Safety Monitoring & Incident Response System

A college-level working prototype for intelligent tourist safety, real-time monitoring, geo-fencing, risk detection, SOS alerts, and incident response.

**Technology:** React + Express + MongoDB Atlas + Leaflet/OpenStreetMap

> **Note:** All identity information used in this project is demo data. There is no real Aadhaar, police, FIR, or emergency-service integration.

---

## 🌍 Project Overview

**Prayanam** is a smart tourist safety platform designed to monitor tourist activity, detect potential risks, and provide rapid incident response.

### Main Flow

```text
Register / Login
       ↓
Tourist Dashboard
       ↓
Digital ID
       ↓
Location Tracking
       ↓
Geo-fence / Risk Detection
       ↓
SOS / Safety Alert
       ↓
Backend API
       ↓
MongoDB Atlas
       ↓
Police Dashboard
       ↓
Incident Management
```

---

## ✨ Key Features

- 🔐 Tourist registration and secure login
- 🪪 Digital Tourist ID
- 📍 Real-time location tracking
- 🗺️ Interactive maps using Leaflet/OpenStreetMap
- 🚧 Geo-fence monitoring
- ⚠️ Risk and anomaly detection
- 🆘 SOS emergency button
- 🚨 Automatic alert generation
- 👮 Police/Admin dashboard
- 📋 Incident management
- 📊 Tourist safety score
- 🔒 JWT authentication and role-based access
- 🗄️ MongoDB Atlas data storage
- 🌐 Responsive web interface

---

## 🏗️ Project Structure

```text
prayanam/
│
├── render.yaml
│
├── backend/
│   ├── package.json
│   ├── .env.example
│   │
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── seed.js
│       │
│       ├── config/
│       │   └── db.js
│       │
│       ├── middleware/
│       │   ├── auth.js
│       │   ├── validate.js
│       │   └── errorHandler.js
│       │
│       ├── models/
│       │   ├──