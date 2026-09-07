# DEMO — SevaSetu: Open Volunteer Network

**Team NXNZ · Tower 4 · Kumbhathon SPRINT**

- 🎥 **Video walkthrough:** <!-- paste your 2-3 min video link here before deadline --> _TODO: add link_
- 🌐 **Live demo (local):** `npm run start` → **https://localhost:3000** (HTTPS required — mic/camera only work on secure origins; see README "HTTPS required")

## The 30-second pitch

> Every mass gathering, flood response, and mandi distribution in India runs on the
> same missing piece: a volunteer layer that is siloed — re-onboarded by every
> organization, never portable, invisible to every platform that needs help.
> SevaSetu is the open network that fixes this. A volunteer onboards once — by
> speaking for two minutes in any Indian language — our AI builds a verified,
> skill-scored identity, and any platform plugs in via our API and dispatches the
> right people live. Serving grows a volunteer's Seva Score; the score gets them
> dispatched first. UPI unified payments. ONDC unified commerce. SevaSetu unifies
> India's volunteers — our largest underused resource.

## Demo script (3 minutes, on a phone + laptop side by side)

### 1. Onboarding is a conversation, not a form (60s) — phone
1. Open **https://localhost:3000** (accept the self-signed cert warning once) → switch language to **मराठी** and back.
2. Sign up (name, DOB, phone) → OTP **123456**.
3. Aadhaar: type any 12 digits → "Verifying…" → police check clears (demo placeholders —
   production slots in DigiLocker/UIDAI + state police APIs).
4. **Record a story**: tap the dark circle for video (live preview shows), answer the
   on-screen prompts in Marathi/Hindi, ~30 seconds. Submit.
5. Watch the pipeline: Sarvam Saaras v3 transcribes → sarvam-105b extracts
   **languages, skills, roles — each with an evidence quote from your own words**.
6. Review the extracted chips (remove/add), pick locations (Ramkund, Trimbakeshwar…)
   and time slots → **Volunteer ID card** with Seva Score 0.

### 2. The network thinks (45s) — laptop
1. Open `/dispatch`: 12 live incidents on a real Nashik map (NTKMA coordinates),
   Godavari highlighted, pins colored by urgency.
2. Click **"Child separated at Ramkund"** (critical) → the AI match ranking appears:
   each candidate with **match score, distance, Seva points, language ✓, and the
   reasons** ("skill match: lost-child assistance · proven: 53 pts · at Ramkund (0 m) ·
   speaks Marathi/Hindi").
3. Click **⚡ Auto-allocate team** → 3 best volunteers assigned instantly, map pin
   updates to 3/3.

### 3. The reward loop — the revolutionary bit (45s)
1. Press **📍 Volunteer check-in** → status flips to "on site".
2. Press **✅ Check-out · award Seva Score** → toast: **"+12 Seva Score in
   'lost-child assistance' → total 65"**. Dispatch literally grows the volunteer's
   portable reputation.
3. Press **⚡ Simulate City Response** — the whole loop plays itself end-to-end on
   camera for the next case.

### 4. Prove it's an open network (30s) — terminal
```bash
KEY="sk_demo_dispatch_key_2027"
curl -s localhost:3000/v1/volunteers/search -H "Authorization: Bearer $KEY" \
  -H 'Content-Type: application/json' \
  -d '{"query":"sign language volunteer for elderly pilgrims","top_k":2}'
```
Every action the command center took is a plain API call any platform can make —
disaster apps, mandi queues, health camps. One repository, many consumers.

### Close (10s)
Open `/dashboard`: registrations, languages, skills, locations, Seva Score
leaderboard. **One registration. Every platform served. Reputation that compounds for life.**

## Screenshots

<!-- Add 3-4 screenshots before deadline: onboarding story step, dispatch map with pins,
     AI match panel, score-award toast. Filenames: shots/1-onboarding.png etc. -->

_This repository contains everything needed to run the demo offline: `npm run seed &&
npx tsx scripts/seed-dispatch.ts && npm run start` (mock-AI mode is automatic without API keys)._
