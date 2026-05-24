# MealNest IoT Command Centre

## Overview

This is a front-end enterprise demo for MealNest IoT monitoring. Live readings are simulated for demonstration purposes, while the UI is designed to represent timestamped, export-ready telemetry for regulated food operations.

The app supports a private setup flow for presenters and a client-facing dashboard mode for customer demonstrations.

## Features

- Setup Mode for selecting sector, customer template, site, branding, alert posture, demo speed, and optional reading overrides
- Client-facing dashboard mode with customer-first branding
- Live telemetry simulation with updating timestamps
- Device cards with Live Readings and Trend Charts tabs
- NUMI Live Insights panel
- Compliance Evidence Layer
- Summary cards for temperature, humidity, light, air quality, and alerts
- Customer/header logo upload and NUMI logo upload, handled entirely in the browser
- Configurable primary and secondary brand colours
- Local persistence of the launched dashboard configuration via browser localStorage

## Tech Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Recharts
- lucide-react

## Local Development

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

## Production Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Vercel Deployment

This project is designed to deploy as a static Vite application through GitHub and Vercel.

1. Push the repository to GitHub.
2. Import the repository into Vercel.
3. Use the recommended Vercel settings below.
4. Deploy.
5. Add the custom domain in Vercel project settings when ready.

## Recommended Vercel Settings

Framework: Vite  
Install command: npm install  
Build command: npm run build  
Output directory: dist

## Demo Data Note

All customer, site, device, and telemetry data is realistic demonstration data only. It does not include confidential customer data or live backend integrations.

## Logo Upload Note

Customer/header logos and NUMI logos are uploaded in the browser and stored as data URLs in front-end state. If the dashboard configuration is saved, those data URLs may also be stored in browser localStorage. No backend upload or asset storage is required.

Uploaded images are rendered as provided using `object-fit: contain`; the app does not generate, redraw, recolour, crop, or stylise uploaded logos.

## Favicon Assets

MealNest favicon assets live in `public/`:

- `public/favicon.ico`
- `public/favicon.svg`
- `public/apple-touch-icon.png`
- `public/favicon.png`

The manifest is already configured at `public/site.webmanifest`.

## Limitations

- Front-end only; no backend, database, authentication, or real IoT ingestion is included.
- Live readings and charts are simulated for demonstration.
- localStorage persistence is browser-specific and not shared between users or devices.
- Uploaded logo data stored in localStorage is subject to browser storage limits.
