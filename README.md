# Smart Kumbh: Crowd-Aware Pilgrim Guidance & Volunteer Response System — **SevaSetu** 🕉️

**Team:** NXNZ
**Tower:** 4 - Pilgrim Experience
**Event:** Kumbhathon SPRINT
**Members:**
- @Devesh0777
- @shravaniBeni
- @Sarjekar
- @shubhamshelke63137-bit

---

## The idea — an Open Volunteer Network

India's volunteers — the world's largest civic workforce — are locked inside silos.
Each NGO, event, and government scheme keeps its own spreadsheet: a volunteer
onboards again and again for every organization, their skills and earned trust are
never portable, and platforms that need volunteers (disaster response, crowd
management, health camps, mandi distribution, mass gatherings) have no way to
plug in and pull live, verified capacity.

**SevaSetu is the missing layer: an open volunteer repository and network.**

A volunteer onboards **once** — by speaking for two minutes in any Indian language.
Our AI pipeline (Sarvam Saaras v3 STT → sarvam-105b extraction) builds a verified,
skill-scored identity with evidence quotes. From that moment, **any platform can
plug in via a partner-keyed API** and:

- **search** the repository semantically ("lifeguard near Ramkund who speaks Marathi"),
- **dispatch** the right people to real-time needs, ranked by skill, Seva Score, distance, language and availability,
- **reward** service automatically — every completed shift appends to an append-only, auditable Seva Score ledger that grows with the volunteer for life.

Built on the same open-network principles as ONDC/Beckn (network reputation,
portable identity, neutral rails), applied to the one domain nobody has built it
for: volunteering. Our dispatch command center is itself proof — it consumes
SevaSetu purely through the same open API any third party would use.

**Nashik Kumbh Mela 2027 is the beachhead; every platform that ever needs
volunteers is the market.**

## What's in this repo

| Surface | What it does |
|---|---|
| `/` (mobile-first onboarding) | Voice/video story onboarding, bilingual EN/मराठी, demo KYC, certificates, availability |
| `/dashboard` | Live volunteer metrics — funnel, languages, skills, locations, Seva Score leaderboard |
| `/dispatch` | Command center: live incidents on a real Nashik map, AI match ranking, auto-allocation, check-in/out with score rewards |
| `/v1/*` open API | Partner-keyed, scoped REST API + OpenAPI 3.1 spec at `/api-docs` |
| `/health` | Service health + mode (live AI / mock) |

## Quick start

```bash
npm install
npm run seed                 # 5 base demo volunteers + demo partner key
npx tsx scripts/seed-dispatch.ts   # 32 network volunteers + 12 real-location incidents
npm run dev                  # https://localhost:3000 (self-signed cert, auto-generated)
```

Open **https://localhost:3000** on your phone (mobile-first UI) and complete onboarding.

> **⚠️ HTTPS required — mic/camera only work on secure origins.** Browsers block
> microphone and camera access on plain `http://` except `http://localhost`. We run
> the app on HTTPS so recording works everywhere:
>
> - **Laptop (this device):** `npm run dev` uses Next.js `--experimental-https` and
>   auto-generates a self-signed cert. Open `https://localhost:3000`, accept the
>   browser's "self-signed certificate" warning once (Advanced → Proceed), done.
> - **Phone (same Wi-Fi):** run `npm run dev` (HTTPS) and open
>   `https://<your-lan-ip>:3000` on the phone — accept the cert warning, then the
>   mic/camera permission prompts will appear.
> - **Production (`npm run start`):** put the server behind any TLS terminator
>   (Caddy, nginx, or a tunnel like `cloudflared`/ngrok) — the app itself is
>   origin-agnostic, it just needs to be served over `https://`.
>
> If the page still says access denied, click the 🔒 icon in the address bar →
> allow Microphone/Camera → reload.

**Demo OTP:** `123456` · **Demo Aadhaar:** any 12 digits (only last 4 stored) ·
**Demo partner key:** `sk_demo_dispatch_key_2027` · **Admin key:** `sevasetu-admin-key`

**Mock AI mode** is automatic when no API keys are set — the entire flow works
offline with a deterministic mock pipeline. Add `SARVAM_API_KEY` in `.env.local`
(see `.env.example`) to switch the onboarding pipeline to live Sarvam models.

## Testing it (judge path, 3 minutes)

1. **Onboard a volunteer:** open `/` on your phone → sign up → OTP `123456` → demo KYC →
   record (or type) your story → review extracted skills → pick locations/slots → get your ID card.
2. **See the network think:** open `/dispatch` → click any case → read the AI match
   ranking with reasons ("skill match: lifeguard · proven: 53 pts · at Ramkund (0 m) · speaks Marathi").
3. **Run the loop:** hit **⚡ Simulate City Response** — the system allocates a team,
   checks them in on the map, resolves the case, and awards Seva Scores live.
4. **Verify openness:** `GET /v1/needs` and `POST /v1/volunteers/search` with the demo
   partner key — everything the command center does, any external app can do.

## API quickstart

```bash
KEY="sk_demo_dispatch_key_2027"

# Semantic search over the volunteer repository
curl -s localhost:3000/v1/volunteers/search \
  -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
  -d '{"query":"lifeguard near ghats who speaks Marathi","top_k":3}'

# Create a need and auto-allocate (any consumer app)
curl -X POST localhost:3000/v1/needs -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' -d '{
  "title":"Drowning emergency","category":"safety","required_skills":["lifeguard"],
  "languages_required":["Marathi"],"people_needed":2,"urgency":"critical",
  "location_name":"Ramkund","lat":20.0079,"lng":73.7923,"radius_m":2000 }'
curl -X POST localhost:3000/v1/needs/{id}/allocate -H "Authorization: Bearer $KEY" -d '{}'

# Shift lifecycle — check-out automatically awards Seva Score
curl -X POST localhost:3000/v1/assignments/{id}/checkin  -H "Authorization: Bearer $KEY"
curl -X POST localhost:3000/v1/assignments/{id}/checkout -H "Authorization: Bearer $KEY"
```

Full spec: `openapi.yaml` (served at `/api-docs`, importable into Postman/Swagger UI).

| Scope | Access |
|---|---|
| `read:public` | PII-free public profiles |
| `read:profiles` | Full profile incl. contact |
| `search:volunteers` | Search + similar + needs endpoints |
| `write:score-events` | Record sessions, check-in/out |
| *(admin key)* | Issue partner keys, patch volunteers, stats |

## Architecture

```
Mobile-first onboarding UI (Next.js 15, React 19, bilingual EN/मराठी)
        │
        ▼  /api/onboarding/*          (session flow, auto-save, resumable)
┌─────────────────────────────────────────────────────┐
│  AI PIPELINE — Sarvam (src/lib/ai.ts)               │
│  1. STT:      saaras:v3 (sync <30s, server-side     │
│               WAV chunking for longer audio)        │
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
│                      repository interface → swap to Postgres)
│
├── Seva Score Engine (src/lib/score-engine.ts) — pure, config-driven,
│   per-skill multipliers, consistency + certification bonuses,
│   inactivity decay, append-only ledger
│
├── Dispatch Engine (src/lib/dispatch-engine.ts) — pure ranking:
│   semantic skill similarity (35%) + per-skill Seva Score (25%)
│   + haversine proximity (20%) + language (15%) + availability (5%),
│   urgency response caps, transparent reasons & warnings
│
└── Open API /v1 (partner keys + scopes, OpenAPI 3.1 at /api-docs)
    ├── GET  /v1/volunteers?skill=&language=&location=&min_score=
    ├── POST /v1/volunteers/search        (semantic, hybrid-ranked)
    ├── GET  /v1/volunteers/{id}[/full]   (PII filtered by scope)
    ├── PATCH /v1/volunteers/{id}         (admin)
    ├── GET/POST /v1/volunteers/{id}/score-events
    ├── GET  /v1/volunteers/{id}/similar  (embedding similarity)
    ├── GET/POST /v1/needs  +  /{id}/match  +  /{id}/allocate
    ├── POST /v1/assignments/{id}/checkin | /checkout  (auto score award)
    ├── GET  /v1/admin/stats             (dashboard metrics, admin)
    ├── GET  /v1/meta/{skills|languages|locations}
    ├── POST /v1/partners                 (issue partner keys, admin)
    └── GET  /health
```

## Onboarding flow

1. **Landing** — bilingual toggle (English / मराठी), saffron-kesari Kumbh design
2. **Basic info + OTP** — demo OTP `123456`
3. **KYC** — Aadhaar (demo: any 12 digits; only last 4 stored) + placeholder video-KYC
4. **Police verification** — placeholder in demo; real status field (`pending`/`clear`/`flagged`) in the data model for the production integration
5. **Voice/video story** — 5 guided prompts shown before recording; 1–3 min; live camera preview; re-record; typed fallback
   → transcribed (Saaras v3) → profile extracted dynamically with evidence quotes → volunteer reviews/edits chips
6. **Certificates** — upload; demo auto-classification (swim/first-aid/language/NCC)
7. **Details form** — Kumbh dates, time slots, real Nashik locations, interest chips + free text
8. **Welcome** — Volunteer ID card, Seva Score starts at 0

Progress auto-saves; closing the tab and reopening resumes where you left off.

## Seva Score engine

Starts at 0. Every volunteering session appends a ledger event with a multiplier:
scarce skills (lifeguard ×1.5, sign-language ×2.0), category multipliers, +5 per
certificate (capped 15/category), +5 consistency bonus at 3+ sessions in a skill,
5% decay per 90 idle days (never below 0). All config in `src/lib/score-config.json`.
The dispatch check-out flow fires these events automatically — **serving grows your
reputation; reputation gets you dispatched first.**

## Demo data

- 5 base volunteers + 32 network volunteers (lifeguards at ghats, paramedics on
  night shift, sign-language certified, sanitation crews, polyglot language helpers)
  with realistic pre-built score histories (scores 0–100+).
- 12 incidents at **real coordinates** from the NTKMA Kumbh dataset
  (nashik-monitor-v2, Kumbhathon Innovation Foundation): Ramkund, Trimbakeshwar,
  Kapila Sangam Ghat, Nashik Road station, CBS, Muktidham, and more.
- Reset anytime: `rm -rf data && npm run seed && npx tsx scripts/seed-dispatch.ts`

## Environment

Copy `.env.example` → `.env.local` (gitignored — never commit keys):

| Var | Purpose |
|---|---|
| `SARVAM_API_KEY` | Sarvam STT (saaras:v3) + extraction (sarvam-105b) + TTS (bulbul:v3) |
| `MOCK_AI` | Force deterministic offline mock (auto-on without keys) |
| `ADMIN_API_KEY` | Admin bearer key (default `sevasetu-admin-key`) |

## Tests

```bash
npm test        # 55 tests: score engine, dashboard stats, API golden path,
                # dispatch matching + full allocation lifecycle
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

Nothing is stubbed except what is explicitly a demo placeholder (KYC, police verification).

## Roadmap: from Kumbh beachhead to national network

1. **Kumbh 2027 (built):** onboarding, repository, dispatch, scores — deployed with the Nashik authority.
2. **Crowd-signal needs (next):** auto-open needs from live crowd-density data — "the map asks for help before the phone rings."
3. **WhatsApp voice-bot channel:** onboard via a Sarvam-powered WhatsApp flow — no app install needed.
4. **More consumers on the same API:** disaster response (NDMA/Aapda Mitra trained-volunteer integration), mandi distribution queues, health camps, city events — one repository, many consumers.
5. **Fair allocation layer:** rotation caps so dispatch distributes opportunity, not just efficiency.
6. **DPDP-ready consent + DigiLocker/UIDAI verification:** replace demo placeholders with consented government rails.

See [`DEMO.md`](DEMO.md) for the demo script and screenshots.
