# Propley Sales Engine

A premium, high-contrast, real estate sales presentation and co-browsing application designed to run cinematic, real-time client presentations. Built with **Next.js 16** (App Router), **React 19**, **Tailwind CSS v4**, and the **Sera architectural design language**.



---

## 🏛 The "Sera" Design Philosophy

Propley adheres to the **Sera Design System**, inspired by modern architectural journals. It features sharp geometry, minimalist layouts, and high-contrast styling.

### 🎨 Color System (`src/app/globals.css`)
- **Ivory** (`#FFFFFF`): Primary surfaces, cards, and drawers.
- **Stone** (`#FBFBFA`): App shell backgrounds (dashboard / executive overview).
- **Stone-Alt** (`#F2F2F0`): Borders, dividers, and input underlines.
- **Ink** (`#1A1A1A`): Primary text and buttons.
- **Gold** (`#8B6B3F`): Active navigation, focus rings, and premium accents.
- **Obsidian** (`#0A0A0A`): Moderator sidebars and footers for dark, immersive control rooms.
- **Gold-Light** (`#FFC977`): Active status indicators, live badge accents, and cinematic stages.

### 📐 Geometry & Radius
- **Zero Radius:** Set `--radius: 0px` globally. All buttons, inputs, dropdowns, and cards are strictly **`rounded-none`**.
- **Accents:** High-quality page transitions, slide animations, and signature top gold borders (e.g. `h-[6px] bg-gold`) on auth and entry screens.

---

## 🛠 Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Styles:** Tailwind CSS v4 + `@base-ui/react` primitives + `vaul` (Drawers)
- **State Management:** Zustand + Redux Toolkit (`@reduxjs/toolkit`)
- **Animations:** Framer Motion (`framer-motion`)
- **Icons:** Remix Icons (`react-icons/ri` & `@remixicon/react`)
- **Networking:** Axios API Client with BFF (Backend-for-Frontend) endpoint caching

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js** (v18.x or newer)
- **SSL Certificates:** To run the WebRTC & microphone/camera functionalities locally, HTTPS is required.

### 2. Local SSL Certificate Setup
For local HTTPS, place your certificates inside the `certs` directory:
- `certs/localhost-key.pem`
- `certs/localhost.pem`

### 3. Installation
```bash
npm install
```

### 4. Running the Development Server
Run the dev server with experimental HTTPS certificates bound to port `3001`:
```bash
npm run dev
```
Open **https://localhost:3001** to view the Sales Console.

---

## 📂 Project Structure

```bash
├── certs/                 # Local SSL certificates for HTTPS development
├── docs/                  # API, Clarity, Redux, and Voice Engine documentation
├── public/                # Static assets (logos, fallback images)
├── src/
│   ├── app/               # Next.js App Router folders and routes
│   │   ├── admin/         # Access control, role policy dashboards
│   │   ├── auth/          # Console Login and Onboarding screen
│   │   ├── customers/     # CRM view and customer timelines
│   │   ├── meetings/      # Presentation scheduler & CMS
│   │   ├── moderator/     # Advisor side of the cinematic theater view
│   │   └── participant/   # Client side of the presentation viewer
│   ├── components/        # Reusable global layout elements & shadcn components
│   │   ├── layout/        # App Sidebar, Header and TopBar
│   │   ├── presentations/ # CMS tables, calendar integrations, templates
│   │   └── ui/            # Strict Sera-styled shadcn/ui components
│   ├── context/           # App-level contexts (Admin, Auth)
│   ├── hooks/             # Custom state hooks
│   ├── lib/               # Mock data, stores, and platform permissions
│   │   ├── api/           # BFF fetch clients and routing hooks
│   │   └── roles.ts       # Access control mapping (Admin, Advisor, Consultant)
│   └── store/             # Global application state slices
```

---

## 👥 Access Roles & CRM Terminology

Propley is built for a **premium real estate sales team**. Keep customer-facing copies aligned with high-end presentations:
- Prefer **Advisor** or **Consultant** over *Agent* or *Broker*.
- Prefer **Presentation** or **Development** over *House* or *Property*.
- Use **Initialize Engine** or **Enter Sales Portal** for launching co-browsing.

### CMS Roles (`src/lib/roles.ts`)
1. `super_admin` - Full platform access & role management.
2. `admin` - Operations & Advisor provisioning.
3. `advisor` - Presentation hosts; owners of customer portfolios.
4. `consultant` - Co-hosts with read-focused presentation permissions.

---

## 🔌 Core Integrations

- **EnableX:** Real-time WebRTC co-browsing synchronizing presentation stages, screen states, and voice call parameters.
- **Microsoft Clarity:** Built-in tracking using Project ID `wsfm0rhyky` to generate engagement metrics, transcripts, and AI-driven slide heatmaps.
- **Calendar Feeds:** Generates Google Calendar links and direct `.ics` file downloads for client presentation invites.

---

## 📱 Mobile Testing & Tunnels

When developing and testing on mobile devices, standard tunneling services like the free tier of Ngrok intercept initial requests with a "Visit Site" warning page. This breaks background requests like Next.js Hot Module Replacement (HMR) WebSockets and `site.webmanifest` files because they cannot bypass the warning HTML.

To test on mobile without these errors, use **Cloudflare Quick Tunnels** which do not have an interstitial warning page:

```bash
npx cloudflared tunnel --url http://localhost:3000
```
*(If your Next.js server is running on a different port like `3001`, change the port in the command above accordingly.)*

**Note on Next.js Configuration:** 
Next.js 15+ has strict development origin checks. To allow WebSocket connections over Cloudflare or Ngrok, you must add the tunnel domain to your `next.config.ts`:

```ts
const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "localhost:3000",
    "your-tunnel-url.trycloudflare.com"
  ],
  // ...
}
```
