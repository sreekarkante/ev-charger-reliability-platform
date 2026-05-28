# ChargeSentinel — Intelligent EV Charger Reliability & Availability Platform

This is a production-style, smart-city infrastructure operations panel built to handle crowdsourced charging station reports, run geographic validation, track automated user reputations, calculate weighted consensus, and sync dashboards in real-time.

---

## Technical Architecture & Engines

1.  **Trust Score Engine**: Employs Laplace Smoothing to compute user reliability dynamically based on reports and outcomes ($TrustScore = \frac{VerifiedCorrectReports + 1.5}{TotalReports + 3.0}$).
2.  **Weighted Consensus Engine**: Recalculates charger states on the fly. Recent reports carry higher weight through exponential age-decay coefficients ($D(\Delta t) = e^{-0.05 \Delta t}$). Includes data density volume scaling to prevent false positive confirmations.
3.  **GPS & Anti-Fraud Boundary**: Validates reporter proximity to within 200 meters using geodetic distance (Haversine formula). Includes velocity checks between successive reports to block remote spoofer bots (impossible speed threshold: >150 km/h).
4.  **WebSocket Synchronizer**: Socket.IO binds broadcasts instantly so other open operations panels update map colors and logs live without reloading.
5.  **Smart-City Dashboard**: Sleek cybernetic dark-themed dashboard using Leaflet Maps with custom telemetry indicators and Recharts analytics.

---

## Directory Structure

*   `backend/`: Express API server, Prisma ORM Models, Sockets bindings, and Consensus Engines.
*   `frontend/`: React Vite App, Leaflet Integration, Recharts dashboard, and the GPS Simulator Toolbar.

---

## Installation & Setup

### 1. Database Configuration
By default, the backend connects to **PostgreSQL**.
1. Ensure PostgreSQL is running on your system.
2. Edit `backend/.env` and update the `DATABASE_URL` with your database credentials:
   ```env
   DATABASE_URL="postgresql://<username>:<password>@localhost:5432/<dbname>?schema=public"
   ```

### 2. Dependency Installation
In the project root, run the unified installer to fetch packages for both backend and frontend:
```bash
npm run install:all
```
*(This concurrently triggers `npm install` in the root, `backend/`, and `frontend/` folders.)*

### 3. Database Initialization & Seeding
Deploy database tables and populate mock stations, user tiers, and baseline logs:
```bash
# Run Prisma migrations
npm run prisma:migrate

# Seed database
npm run db:seed
```

### 4. Running the Platform
Launch both backend API server and Vite React server concurrently with a single command:
```bash
npm run dev
```
*   **Frontend**: Center of operations runs at [http://localhost:3000](http://localhost:3000)
*   **Backend API**: Serves JSON on [http://localhost:5000](http://localhost:5000)

---

## Walkthrough Scenarios (How to Test)

Open the dashboard [http://localhost:3000](http://localhost:3000) in your browser:

### Scenario 1: GPS Proximity Rejection (Antifraud)
1. Go to the Sign In page, click the **Elon Tesla (High-Trust)** quick access profile.
2. Back on the map, select **Signature Towers Charging Hub** marker, and look at the detail panel.
3. In the GPS Simulator Toolbar at the top, select **"Out of Range (3.2 km away)"**. Your light-blue simulated position indicator and its dotted geofencing circle will teleport away from the charger.
4. Try to submit a "Working" report.
5. **Outcome**: The report is rejected with a red error alert showing: *"GPS Verification Failed: You must be physically near the charger. Distance: 3200m (Limit: 200m)"*.

### Scenario 2: Anti-Spam Velocity Cheating (Banning Spammer Bots)
1. In the GPS Simulator Toolbar, select **"Nexus Alpha (Valid Range)"**.
2. Click **"Submit Verified Telemetry"** (Operational status) for Nexus Tech Park Charger. (Report succeeds).
3. Now, in the Simulator Toolbar, click **"Cheat Velocity: Bangalore -> Hyderabad"** preset. Your simulated position instantly teleports 500km away.
4. Select the supercharger on the map and try to submit another report.
5. **Outcome**: The system calculates that you traveled 500km in under 2 seconds (implied speed of 900,000 km/h). The backend immediately rejects the report, logs a `SUSPICIOUS_ACTIVITY` entry, reduces your trust score by `0.25`, and puts your account on a **24-hour COOLDOWN lock** (subsequent reports are blocked!).
6. Repeated velocity infractions will result in permanent **SUSPENDED** status!

### Scenario 3: Real-Time Sockets Sync
1. Open two separate browser tabs side-by-side on [http://localhost:3000](http://localhost:3000).
2. Log in in Tab A as **Elon Tesla (High-Trust)** and in Tab B as **Average Joe**.
3. Teleport Tab B user near **Delta Square Supercharger** and submit a "Broken" report.
4. **Outcome**: You will hear/see Tab A's live terminal log immediately populate the incoming report and update the map marker status in real-time without refreshing!

### Scenario 4: Admin Moderation Command Console
1. Sign in using the **System Administrator** quick access profile.
2. A premium **Admin Command** button will appear in your profile card. Click it.
3. Review user trust distributions, lift bans, view anti-abuse travel speed flags, and decommission nodes.
