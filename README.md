# TransitIQ

Realtime university bus tracking app for admins, drivers, and students.

## Stack

- Vite + React + TypeScript
- Firebase Auth + Firestore
- Leaflet + OpenStreetMap (Carto dark tiles)
- Tailwind + shadcn/ui

## Local development

1. Install dependencies:

	```bash
	npm install --legacy-peer-deps
	```

2. Copy environment values from `.env.example` into `.env`.

3. Start dev server:

	```bash
	npm run dev
	```

4. Quality checks:

	```bash
	npm run lint
	npm run test
	npm run build
	```

## Environment variables

Map does not require any API key now (Leaflet + OSM).

Required Firebase vars:

- `VITE_FIREBASE_API_KEY`
- `VITE_FIREBASE_AUTH_DOMAIN`
- `VITE_FIREBASE_PROJECT_ID`
- `VITE_FIREBASE_STORAGE_BUCKET`
- `VITE_FIREBASE_MESSAGING_SENDER_ID`
- `VITE_FIREBASE_APP_ID`
- `VITE_FIREBASE_MEASUREMENT_ID`

## Deploy to Vercel

This repo includes `vercel.json` with SPA rewrite support for client-side routes.

1. Import this repository into Vercel.
2. Framework preset: `Vite`.
3. Build command: `npm run build`.
4. Output directory: `dist`.
5. Add all `VITE_FIREBASE_*` variables in Vercel Project Settings -> Environment Variables.
6. Deploy.

## Firebase production checklist

1. Add Vercel domain(s) to Firebase Auth -> Authorized domains.
2. Deploy Firestore rules from `firestore.rules`.
3. Ensure user role docs exist under `users/{uid}`.
4. Create composite indexes for trip history filters when prompted by Firestore errors.

Suggested indexes:

- `trips`: `driverId` (ASC), `startTime` (DESC)
- `trips`: `busId` (ASC), `startTime` (DESC)
- `trips`: `busId` (ASC), `driverId` (ASC), `startTime` (DESC) for combined filter screens

## Notes

- Driver `Trip History` and `Notifications` routes currently point to `ComingSoon` pages.
- Lint currently passes with warnings only (no errors).
