# Sukoon: Digital Vitality Sentry

Sukoon is a clinical-inspired digital wellbeing platform that detects early burnout signals from daily behavior and optional voice biomarkers. It translates raw lifestyle patterns into actionable recovery guidance, safety escalation, and a longitudinal stress timeline.

## The Problem

Digital burnout often builds silently through prolonged screen exposure, sedentary patterns, and poor recovery habits. Users typically notice symptoms only after cognitive overload has already affected mood, focus, and performance.

Sukoon targets this silent drain by converting everyday digital behavior into a measurable cognitive load profile.

## The Innovation

Sukoon combines weighted digital phenotyping with vocal signal analysis:

- Lifestyle stress model: Screen load, physical stagnation, and rest deficit are fused into a weighted Stress Index.
- Vocal fatigue detection: Librosa-based analysis tracks prosodic narrowing (reduced vocal variability and energy changes) as a fatigue marker.
- Safety layer: Escalation-aware support pathways surface immediate professional help links for high-risk states.

## Tech Stack

- Backend: FastAPI, python-multipart, Librosa, NumPy, python-dotenv
- AI: Gemini 3 Flash architecture target (current implementation uses Gemini Flash API model in backend config)
- Frontend: React, Tailwind CSS, Framer Motion, Recharts, Lucide React
- UX Utilities: react-hot-toast for instant success/error guidance

## Core Flow

1. User starts a check-in on `/input`.
2. User submits:
- Screen time
- Sedentary time
- Sleep quality
- Text reflection or recorded/uploaded voice sample
3. Frontend sends multipart `POST /analyze`.
4. Backend returns stress profile, burnout status, vocal markers, and AI insight.
5. Frontend persists the result to:
- `sessionStorage` for current session routing
- `localStorage` under `sukoon_history` for timeline/history view
6. User explores `/dashboard`, `/coping`, and `/history`.

## Setup Instructions

## 1) Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

Backend runs on: `http://localhost:8000`

## 2) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs on: `http://localhost:5173`

## Environment Variables

Create `backend/.env`:

```env
GOOGLE_API_KEY=your_gemini_api_key_here
EVENTBRITE_TOKEN=your_eventbrite_private_token_here
PORT=8000
```

`EVENTBRITE_TOKEN` is optional. If missing, Sukoon automatically falls back to curated local wellness search links.

## API Contract

### `POST /analyze`

Content-Type: `multipart/form-data`

Required fields:
- `screen_time` (float)
- `sedentary_time` (float)
- `sleep_hours` (float)
- `user_text` (string)

Optional field:
- `audio_file` (wav/webm/ogg)

### `GET /contextual-coping`

Query params:
- `mood` (e.g. `work_pressure`, `digital_fatigue`, `lonely`, `productive`, `socially_active`, `relaxed`)
- `city` (e.g. `Bengaluru`)
- `burnout_status` (`Low`, `Moderate`, `Critical`)
- `stress_index` (0-100)

Response includes:
- `journal_prompt`
- `quote`
- `coping_actions[]`
- `clinical_recommendation`
- `events[]` (Eventbrite when configured, fallback otherwise)

### `GET /analyze-trends`

Query params:
- `current_stress_index` (float)
- `days` (7-30, default 30)
- `history_json` (URL-encoded JSON array of history items from `sukoon_history`)

Response includes:
- `status` (`CHRONIC_BURN_RISK`, `RECOVERY_EXCELLENCE`, `WATCHFUL_STABILITY`, `INSUFFICIENT_DATA`)
- `consecutive_chronic_days`
- `seven_day_average`
- `victory_message`

## Demo-Ready Highlights

- Real-time in-browser recording with MediaRecorder
- Recording preview playback before submission
- Animated vitality gauge and impact charts
- Personalized coping cards with completion feedback
- Distress escalation modal with immediate support options
- Privacy-friendly history clear action

## Future Enhancements

- Therapist/network geolocation integration
- Longitudinal trend forecasting and relapse risk windows
- Secure cloud profile storage with clinician-facing dashboards
