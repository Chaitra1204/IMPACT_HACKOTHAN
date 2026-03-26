# Sukoon Backend API

Clinical-inspired FastAPI backend for Sukoon mental wellness insights.

## Features

- `POST /analyze` for stress index and AI insight generation
- `GET /contextual-coping` for mood-based coping suggestions and local events
- `GET /analyze-trends` for chronic risk and recovery trend detection
- Optional voice-based fatigue analysis

## Tech Stack

- FastAPI
- Uvicorn
- Librosa
- NumPy
- Google Generative AI (Gemini)

## Setup

1. Create and activate Python 3.11 virtual environment

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
```

2. Install dependencies

```powershell
pip install -r requirements.txt
```

3. Create `.env`

```env
GOOGLE_API_KEY=your_key_here
EVENTBRITE_TOKEN=your_eventbrite_token_here
PORT=8000
```

4. Run server

```powershell
python main.py
```

Backend URL: `http://localhost:8000`

## Notes

- `EVENTBRITE_TOKEN` is optional. If missing, fallback event recommendations are returned.
- Do not commit `.venv` or `.env`.
