# SevaSetu

## Product Identity

**SevaSetu** is an AI-assisted, human-controlled volunteer operations platform for Simhastha 2027 in Nashik. Its core promise is:

> Right volunteer. Right place. Right route. Right support. Verified outcome.

Simhastha is the first deployment. The underlying product is designed to become a reusable mission-orchestration platform for festivals, disaster response, NGOs, campuses, civic programs, and other temporary workforces.

## Core Differentiator

SevaSetu does not stop at publishing a roster. Every assignment becomes a live mission that remains visible until it is:

1. Accepted
2. Checked in
3. In progress
4. Supported or reinforced when needed
5. Resolved, partially resolved, or escalated
6. Verified and recorded for operational learning

AI may structure information, recommend matches, estimate reachability, summarize operations, and identify gaps. Authorized humans retain approval, override, sensitive-deployment, and life-safety control.

## Platform Roles

### Volunteer

The volunteer dashboard answers: **What do I need to do?**

It must support:

- Profile and capability readiness
- Training and map orientation
- Shift details and check-in
- Mission acceptance
- Safe route and ETA
- Requesting manpower, language, Sakhi, first-aid, resource, or supervisor support
- Captain checklist and mission completion
- Verified non-competitive Seva recognition

### Zonal Administrator

The zonal dashboard answers: **Is my zone functioning?**

It must support:

- Headcount and post coverage
- Deployment board
- Mission Control
- Support requests and reinforcement approval
- Roster suggestions with human approval
- SOP library
- Local map layers and route context
- Zone reports and settings

### Central Administrator

The central dashboard answers: **Where does Nashik need intervention?**

It must support:

- Cross-zone coverage
- Unresolved and escalated missions
- Skill and language shortages
- Reinforcement demand
- Crowd and route trends
- District intervention queue
- Rebalancing capacity
- Policy and approval oversight
- Outcome and operational learning metrics

## Operational Loop

`DEMAND -> MATCH -> DISPATCH -> SUPPORT -> RESOLVE -> LEARN`

The loop must remain closed. A successful dispatch is not the same as a successful outcome.

## Capability and Matching Model

A volunteer profile should eventually contain:

- Languages
- Interests
- Self-declared skills
- Verified skills and certifications
- Availability
- Role suitability
- Zone/post assignment
- Consent and location-sharing status
- Authority verification status
- Current workload and last-known location

Reinforcement ranking should consider skill, language, availability, current workload, source-zone coverage, crowd-aware ETA, and safety restrictions. Never match only by nearest distance.

## Safety and Privacy Boundaries

- Human override is absolute for operational decisions.
- Police and health command channels remain authoritative for life-safety incidents.
- Location is role-based, purpose-limited, consented, and preferably active only during a shift.
- Show last-known location and timestamp during weak connectivity; never present stale data as live.
- Use approved, retrieval-grounded SOP and facility information.
- Do not require photos for sensitive pilgrim assistance.
- Use offline, degraded-mode, SMS, IVR, and printed fallbacks where required.
- Prefer personal milestones and verified service records over public competitive leaderboards.

## Current Prototype Features

- SevaSetu sign-in screen with demo credentials
- Volunteer, zonal administrator, and central administrator role switcher
- Zonal overview, deployment board, volunteer directory, tasks, reports, and settings
- Mission Control with acceptance, checklist, support, reinforcement approval, resolution, and escalation
- Volunteer dashboard with mission acceptance, check-in, completion, and support request
- Central dashboard with cross-zone intervention queue and district-plan approval
- SOP library with step-by-step procedures and reviewed state
- Training hub with video/image references, filters, and media upload affordance
- Nashik Map with local GeoJSON service layers, volunteer posts, location details, and color/single-color toggle
- SevaSetu branding and reference-based visual language
- Exact supplied maroon figure HTML artwork used on the sign-in page

## Honest MVP Boundaries

The current prototype uses local mock data and simulated interactions for:

- AI interview and profile extraction
- Authority verification
- Live crowd feeds
- Telecom or automated calling
- Police/health integrations
- Production authentication
- Persistent backend storage
- Real-time multi-user synchronization
- Production-grade route safety and predictive crowd models

Do not claim these are live integrations until they are connected and validated.

## Visual Direction

Keep the visual system consistent:

- Product name: SevaSetu
- Primary identity: warm terracotta and maroon
- Reference accent: orange gradient with maroon line-art figures
- Map accents: terracotta services, violet landmarks, blue mobility/routes
- Surfaces: warm white, soft gray, restrained borders
- Display headings: Georgia-style serif
- Operational text: compact, readable sans-serif
- UI should feel calm, civic, trustworthy, and field-ready
- Avoid purple-heavy gradients, generic SaaS hero layouts, and decorative UI that hides operational information

## Important Files

- `src/App.tsx` - dashboards, sign-in, mission workflow, role switching, SOPs, training, reports
- `src/App.css` - application and sign-in visual system
- `src/NashikMap.tsx` - MapLibre map, GeoJSON layers, markers, and map appearance toggle
- `public/nashik-data/` - local Nashik GeoJSON datasets
- `public/sevasetu_maroon_figure_left.html` - supplied maroon figure artwork source
- `public/sevasetu-login-bg.png` - uploaded login background image
- `public/sevasetu-figures.svg` - generated fallback artwork
- `index.html` - SevaSetu browser title

## Demo Access

- Email: `devv@sevasetu.in`
- Password: `sevasetu123`

This is demo-only local validation, not production authentication.

## Run After Transferring the Project

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite. For a production validation:

```powershell
npm run build
npm run preview
```

## Handoff Rule

When adding features, preserve the identity and product direction in this document. Extend the closed-loop mission model instead of creating isolated static pages. Keep AI recommendations explainable and human approvals visible.
