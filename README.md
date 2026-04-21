# TransitIQ

A production-focused, real-time university transit platform with role-based dashboards for admins, drivers, and students.

TransitIQ helps campus operations teams manage buses, approve users, assign drivers, and track live trips using driver geolocation.

## Why TransitIQ

- Real-time fleet visibility for administrators
- Live bus tracking for students
- Driver workflows optimized for mobile use
- Approval-first onboarding for student and driver accounts
- Firebase-backed auth + data with role-based access

## Core Features

| Area | What it does |
|---|---|
| Authentication | Sign in + sign up with role-specific onboarding |
| Approval Workflow | Drivers and students require admin approval before dashboard access |
| Admin Console | Manage buses, approve drivers/users, assign drivers, monitor fleet, history, notifications |
| Driver Operations | View assigned bus, start/end trips, stream geolocation updates |
| Student Experience | View live buses and track assigned route data |
| Realtime Data | Firestore listeners across buses, users, trips, and notifications |
| Mobile UX | Responsive navigation and mobile-optimized dashboard layout |

## Product Flows

### 1. Signup and Approval

1. Student or driver creates account from Sign Up.
2. Account is created with `approvalStatus = pending`.
3. Admin reviews request in:
	 - `Manage Drivers` (for drivers)
	 - `Manage Users` (for students)
4. On approval, user can access their dashboard.

### 2. Driver Trip Lifecycle

1. Admin approves driver.
2. Admin assigns driver to a bus.
3. Driver sees assigned bus on dashboard.
4. Driver starts trip.
5. Bus status changes to `active` and location is updated from driver GPS.
6. Students/admin can track live bus movement.
7. Driver ends trip and bus returns to idle.

### 3. Location Update Behavior

GPS writes are throttled using these defaults:

- `GPS_THROTTLE_METERS = 10`
- `GPS_THROTTLE_MS = 8000`

This means a Firestore location update is pushed when movement exceeds 10m or 8 seconds pass, whichever comes first.

## Tech Stack

- Frontend: React 18 + TypeScript + Vite
- UI: Tailwind CSS + Radix/shadcn components
- Maps: Leaflet + OpenStreetMap (Carto dark tiles)
- Backend Services: Firebase Auth + Firestore
- Testing: Vitest + Testing Library
- Deployment: Vercel

## Project Structure

```text
src/
	components/        Shared UI and layout components
	context/           Auth context
	hooks/             Realtime Firestore + utility hooks
	pages/
		admin/           Admin dashboards and management pages
		driver/          Driver dashboard and trip lifecycle
		student/         Student dashboard and tracking
	routes/            Protected route logic
	services/          Firebase and domain services (auth, trips)
	utils/             Constants, geospatial utilities, seed helpers
```

## Local Development

### Prerequisites

- Node.js 18+ recommended
- npm 9+
- Firebase project with Auth + Firestore enabled

### Setup

1. Install dependencies

```bash
npm install
```

2. Create local env file from template

```bash
cp .env.example .env
```

3. Fill `.env` values (`VITE_FIREBASE_*`)

4. Start dev server

```bash
npm run dev
```

### Useful Scripts

```bash
npm run dev        # local development
npm run build      # production build
npm run preview    # preview built app
npm run test       # run tests once
npm run test:watch # watch mode
npm run lint       # lint codebase
```

## Environment Variables

TransitIQ uses these Vite variables:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

Map API key is not required (Leaflet + OSM).

## Authentication Details

### Admin Access

Current implementation supports bootstrap admin credentials:

- Username: `srmadmin`
- Password: `srmadmin@123`

Important: rotate this strategy for strict production hardening (server-side admin provisioning preferred).

### Signup Constraints

- Student signup requires:
	- Name
	- College email ending with `.edu.in`
	- Registration number
	- Phone number
- Driver signup requires:
	- Name
	- Personal email
	- Phone number

## Security and Access Model

Firestore rules enforce role-based write constraints:

- `users/*`: self-write or admin-write
- `buses/*`: admin or driver write
- `trips/*`: admin or driver create/update
- `notifications/*`: admin write

See `firestore.rules` for active policy.

## Deployment (Vercel)

This project includes SPA rewrites via `vercel.json`.

1. Import repo into Vercel
2. Build command: `npm run build`
3. Output directory: `dist`
4. Set all `VITE_FIREBASE_*` env vars in Vercel
5. Deploy

## Production Readiness Checklist

1. Add Vercel domain(s) to Firebase Auth authorized domains
2. Deploy Firestore rules
3. Verify admin account bootstrap policy (or migrate to server-managed admin)
4. Ensure all required indexes exist for trip history queries
5. Validate mobile UX on real devices (driver + student)
6. Confirm browser geolocation permission flow for drivers

### Suggested Firestore Indexes

- `trips`: `driverId` (ASC), `startTime` (DESC)
- `trips`: `busId` (ASC), `startTime` (DESC)
- `trips`: `busId` (ASC), `driverId` (ASC), `startTime` (DESC)

## Current Limitations

- Driver `Trip History` and `Notifications` routes are currently placeholder pages.
- Bundle size can be further reduced with route-level code splitting.

## Roadmap Ideas

- Push notifications for approvals, trip events, and delays
- Driver attendance and shift scheduling
- Route geofencing and stop ETA predictions
- Admin analytics dashboard (trip duration, delay, utilization)
- Fully server-side approval/audit workflows

## License

Internal/Private project unless otherwise specified.
