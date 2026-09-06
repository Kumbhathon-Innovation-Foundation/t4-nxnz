# SevaSetu 🕉️

**The "UPI for volunteering"** — a neutral volunteer identity & repository platform for **Nashik Kumbh Mela 2027** (Hackathon Tower 4 — *Volunteers That Follow the Crowd*, Theme: Pilgrim Experience).

Volunteers onboard **once** (voice-story AI profiling, demo KYC, skills, languages, availability). Any partner app — dispatch dashboards, crowd management, lost-and-found, medical response — discovers and consumes volunteer profiles through a **scoped, partner-keyed open API**, exactly like PhonePe/GPay plug into UPI.

## Quick start

```bash
npm install
npm run seed     # 5 demo volunteers + demo partner key
npm run dev      # http://localhost:3000
```

Open **http://localhost:3000** on your phone (mobile-first UI) and complete onboarding.

**Mock AI mode** is automatic when no API keys are set — the entire flow works offline with a deterministic mock pipeline. Add your `SARVAM_API_KEY` in `.env.local` (see `.env.example`) to use live models.

## Architecture

```
Mobile-first onboarding UI (Next.js 15, React 19, bilingual EN/मराठी)
        │
        ▼  /api/onboarding/*          (session flow, auto-save, resumable)
┌─────────────────────────────────────────────────────┐
│  AI PIPELINE — Sarvam-only (src/lib/ai.ts)          │
│  1. STT:      saaras:v3 (sync <30s, batch API       │
│               for longer audio)                     │
│  2. Extract:  sarvam-105b (strict JSON schema,      │
│               evidence quotes)                      │
│  3. TTS:      bulbul:v3 (synthetic test voices)     │
│  4. Embed:    local deterministic hash embedding    │
│               (swap-in point for a vector model)    │
└─────────────────────────────────────────────────────┘
        │
        ▼
Volunteer Repository  (data/volunteers.csv — atomic writes,
│                      data/embeddings.json sidecar,
│                      repository interface → swap to Postgres in Phase 2)
│
├── Seva Score Engine (src/lib/score-engine.ts) — pure, config-driven,
│   per-skill multipliers, consistency bonus, certification bonus,
│   inactivity decay, append-only ledger
│
└── Open API /v1 (partner keys + scopes, OpenAPI 3.1 at /api-docs)
    ├── GET  /v1/volunteers?skill=&language=&location=&min_score=
    ├── POST /v1/volunteers/search        (semantic, hybrid-ranked)
    ├── GET  /v1/volunteers/{id}[/full]   (PII filtered by scope)
    ├── PATCH /v1/volunteers/{id}         (admin)
    ├── GET/POST /v1/volunteers/{id}/score-events
    ├── GET  /v1/volunteers/{id}/similar  (embedding similarity)
    ├── GET  /v1/meta/{skills|languages|locations}
    ├── POST /v1/partners                 (issue partner keys, admin)
    └── GET  /health
```

## Onboarding flow

1. **Landing** — bilingual toggle (English / मराठी), saffron-kesari Kumbh design
2. **Basic info + OTP** — demo OTP `123456`
3. **KYC** — Aadhaar (demo: any 12 digits; only last 4 stored) + placeholder video-KYC
4. **Police verification** — placeholder, always clears in demo; real status field in data model
5. **Voice/video story** — 5 guided prompts shown before recording; 1–3 min; re-record; typed fallback
   → transcribed (Saaras v3) → profile extracted dynamically with evidence quotes → volunteer reviews/edits chips
6. **Certificates** — upload; demo auto-classification (swim/first-aid/language/NCC)
7. **Details form** — Kumbh dates, time slots, real Nashik locations (Ramkund, Trimbakeshwar, Panchavati…), interest chips + free text
8. **Welcome** — Volunteer ID card, Seva Score starts at 0

Progress auto-saves; closing the tab and reopening resumes where you left off.

## Seva Score engine

Starts at 0. Every volunteering session appends a ledger event with a multiplier:
scarce skills (lifeguard ×1.5, sign-language ×2.0), category multipliers, +5 per
certificate (capped 15/category), +5 consistency bonus at 3+ sessions in a skill,
5% decay per 90 idle days (never below 0). All config in `src/lib/score-config.json`.

## API quickstart

```bash
# Partner key (seeded demo)
KEY="sk_demo_dispatch_key_2027"

# Semantic search
curl -s localhost:3000/v1/volunteers/search \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"query":"lifeguard near ghats who speaks Marathi","top_k":3}'

# Filtered search
curl -s "localhost:3000/v1/volunteers?skill=swimming&location=ramkund" -H "Authorization: Bearer $KEY"

# Record a volunteering session (score +15 for scarce skill)
curl -s -X POST localhost:3000/v1/volunteers/v_seed_rahul/score-events \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"skill":"swimming","category":"safety"}'

# Issue a partner key (admin)
curl -s -X POST localhost:3000/v1/partners \
  -H "Authorization: Bearer sevasetu-admin-key" -H 'Content-Type: application/json' \
  -d '{"name":"Dispatch App","scopes":["read:public","search:volunteers","write:score-events"]}'
```

Full spec: `openapi.yaml` (served at `/api-docs`, importable into Postman/Swagger UI).

## Scopes

| Scope | Access |
|---|---|
| `read:public` | PII-free public profiles |
| `read:profiles` | Full profile incl. contact |
| `search:volunteers` | Search + similar endpoints |
| `write:score-events` | Record volunteering sessions |
| *(admin key)* | Issue partners, patch volunteers, register |

## Environment

Copy `.env.example` → `.env.local` (gitignored — never commit keys):

| Var | Purpose |
|---|---|
| `SARVAM_API_KEY` | Sarvam STT (saaras:v3) + extraction (sarvam-105b) + TTS (bulbul:v3) |
| `MOCK_AI` | Force deterministic offline mock (auto-on without keys) |
| `ADMIN_API_KEY` | Admin bearer key (default `sevasetu-admin-key`) |

## Tests

```bash
npm test        # 37 tests: score-engine units + full API integration suite
npm run build   # production build check
```

### Live AI end-to-end test

With a real `SARVAM_API_KEY` in `.env.local` and the server running (`npm run start`):

```bash
set -a; source .env.local; set +a
node scripts/live-e2e.mjs   # 28 checks: synthetic Bulbul voice → real STT →
                            # real sarvam-105b extraction → custom fields →
                            # semantic search → score engine → privacy scopes
```

The API suite boots an isolated production server on port 3111 with its own data
directory and runs the **golden path end-to-end**: signup → OTP → KYC → story →
documents → details → completion → API discoverability. Nothing is stubbed except
what is explicitly a demo placeholder (KYC, police verification).

## Phase 2 roadmap (not built, by design)

Dynamic rostering/dispatch engine consuming this API: live crowd-demand signals →
match-shift-notify loop, shift check-in/out writing score events automatically.
The data model, scopes (`write:score-events`), and score ledger are ready for it.
