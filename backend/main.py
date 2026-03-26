from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import os
import json
import uuid
from pathlib import Path
from datetime import datetime, timedelta, timezone
from urllib import parse, request
from dotenv import load_dotenv
import google.generativeai as genai

# Import custom modules
from ml_logic.audio_engine import analyze_vocal_fatigue
from ml_logic.scoring import calculate_stress_index, determine_burnout_status

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI(
    title="Sukoon Medical AI",
    description="Professional Mental Health Support AI Application",
    version="0.1.0"
)

# CORS Middleware - Allow only frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost", "http://127.0.0.1"],
    allow_origin_regex=r"https?://(localhost|127\\.0\\.0\\.1)(:[0-9]+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini API Initialization
try:
    api_key = os.getenv("GOOGLE_API_KEY")
    if not api_key:
        raise ValueError("GOOGLE_API_KEY not found in environment variables")

    genai.configure(api_key=api_key)
    gemini_configured = True
    print("✓ Gemini API configured successfully")
except Exception as e:
    gemini_configured = False
    print(f"✗ Gemini API configuration failed: {e}")

# Data directory setup
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

HISTORY_FILE = DATA_DIR / "history.json"

MOOD_LIBRARY = {
    "work_pressure": {
        "title": "Work Pressure",
        "journal_prompt": "Name the single hardest task and write the smallest next action you can take in 15 minutes.",
        "quote": "Progress in pressure comes from clarity, not speed.",
        "coping_actions": [
            "Take one 2-minute breath reset before resuming work.",
            "Prioritize one mission-critical task and defer two non-essentials.",
            "Use a 25-minute focus block with notifications paused.",
        ],
        "event_keywords": "Yoga OR Sound Healing",
        "event_category_ids": ["107"],
        "clinical_recommendation": "Prescribed for autonomic down-regulation after prolonged cognitive strain.",
    },
    "digital_fatigue": {
        "title": "Digital Fatigue",
        "journal_prompt": "Describe one boundary with screens you can protect tonight and one trigger that breaks it.",
        "quote": "Your attention is a finite clinical resource. Protect it intentionally.",
        "coping_actions": [
            "Go screen-off for 20 minutes and step into daylight.",
            "Lower display brightness and enable focus mode for 2 hours.",
            "Replace one scroll session with a body-based reset.",
        ],
        "event_keywords": "Yoga OR Sound Healing",
        "event_category_ids": ["107"],
        "clinical_recommendation": "Prescribed to reduce sensory overload and digital hyper-arousal.",
    },
    "lonely": {
        "title": "Lonely",
        "journal_prompt": "Write one message you can send now and one in-person interaction you can initiate this week.",
        "quote": "Healing often starts with one honest moment of connection.",
        "coping_actions": [
            "Reach out to one trusted person with a specific check-in request.",
            "Join one community meetup this week, even for 30 minutes.",
            "Choose a shared-space activity instead of isolated scrolling tonight.",
        ],
        "event_keywords": "Community Meetup",
        "event_category_ids": ["110"],
        "clinical_recommendation": "Prescribed for social reconnection and emotional co-regulation.",
    },
    "productive": {
        "title": "Productive",
        "journal_prompt": "Record what worked well today and one habit that sustained your focus.",
        "quote": "Sustainable productivity is built through rhythm, not intensity.",
        "coping_actions": [
            "Preserve momentum with a planned recovery window.",
            "Protect your wind-down time to consolidate gains.",
            "Keep one social activity this week to avoid isolation drift.",
        ],
        "event_keywords": "Live Gigs OR Gallery Openings",
        "event_category_ids": ["103", "105"],
        "clinical_recommendation": "Prescribed to reinforce positive reward circuits through healthy social engagement.",
    },
    "socially_active": {
        "title": "Socially Active",
        "journal_prompt": "Write which interactions gave you energy and which boundaries protected your peace.",
        "quote": "Connection is medicine when it aligns with your values.",
        "coping_actions": [
            "Maintain one meaningful social ritual this week.",
            "Balance activity with one focused solo recovery block.",
            "Track how social contact shifts your stress index over time.",
        ],
        "event_keywords": "Live Gigs OR Gallery Openings",
        "event_category_ids": ["103", "105"],
        "clinical_recommendation": "Prescribed to maintain protective social factors against burnout relapse.",
    },
    "relaxed": {
        "title": "Relaxed",
        "journal_prompt": "Capture what made today feel balanced so you can repeat it deliberately.",
        "quote": "Calm is a skill you are actively training.",
        "coping_actions": [
            "Bank this momentum with a short gratitude reflection.",
            "Keep your current screen limits for another 48 hours.",
            "Schedule one nourishing offline activity this week.",
        ],
        "event_keywords": "Gallery Openings OR Acoustic Live",
        "event_category_ids": ["103", "105"],
        "clinical_recommendation": "Prescribed to stabilize recovery gains and prevent rebound strain.",
    },
}


@app.get("/analyze-trends")
async def analyze_trends(
    current_stress_index: float = Query(...),
    history_json: str = Query(default=""),
    days: int = Query(default=30, ge=7, le=30),
):
    """Analyze 7-30 day trend history and return chronic/progress intelligence for UI escalation."""
    history = _resolve_history_payload(history_json)
    if not history:
        return {
            "status": "INSUFFICIENT_DATA",
            "message": "No historical records available for trend analytics.",
            "days_analyzed": 0,
            "seven_day_average": None,
            "consecutive_chronic_days": 0,
            "is_chronic": False,
            "is_progressing": False,
            "saved_screen_hours": 0,
            "victory_message": "",
        }

    recent = sorted(history, key=lambda item: item.get("timestamp", ""), reverse=True)[:days]
    daily = _aggregate_daily_metrics(recent)
    seven_day_entries = recent[:7]
    seven_day_average = sum(float(item.get("stress_index", 0)) for item in seven_day_entries) / max(len(seven_day_entries), 1)

    chronic_streak = _compute_chronic_streak(daily)
    is_chronic = chronic_streak > 5
    is_progressing = current_stress_index <= (seven_day_average * 0.8 if seven_day_average else 0)

    saved_screen_hours = 0.0
    if seven_day_entries:
        avg_screen = sum(float(item.get("screen_time", 0.0)) for item in seven_day_entries) / len(seven_day_entries)
        if avg_screen > 0:
            saved_screen_hours = max(0.0, (avg_screen - float(recent[0].get("screen_time", 0.0))) * 7)

    victory_message = ""
    if is_progressing:
        victory_message = await _build_victory_message(saved_screen_hours, current_stress_index, seven_day_average)

    if is_chronic:
        status = "CHRONIC_BURN_RISK"
        message = "Pattern is consistent with chronic digital strain. Professional consultation is advised."
    elif is_progressing:
        status = "RECOVERY_EXCELLENCE"
        message = "Recovery trajectory detected. Keep reinforcing the current routine."
    else:
        status = "WATCHFUL_STABILITY"
        message = "No critical trend signal. Continue active monitoring and preventive habits."

    return {
        "status": status,
        "message": message,
        "days_analyzed": len(recent),
        "seven_day_average": round(seven_day_average, 2),
        "consecutive_chronic_days": chronic_streak,
        "is_chronic": is_chronic,
        "is_progressing": is_progressing,
        "saved_screen_hours": round(saved_screen_hours, 1),
        "victory_message": victory_message,
    }


def _resolve_history_payload(history_json: str) -> list:
    if history_json:
        try:
            decoded = parse.unquote(history_json)
            payload = json.loads(decoded)
            if isinstance(payload, list):
                return payload
        except Exception as exc:
            print(f"Trend payload parse warning: {exc}")

    if HISTORY_FILE.exists():
        try:
            loaded = json.loads(HISTORY_FILE.read_text(encoding="utf-8"))
            if isinstance(loaded, list):
                return loaded
        except Exception as exc:
            print(f"Trend file parse warning: {exc}")

    return []


def _aggregate_daily_metrics(history: list) -> list:
    grouped = {}
    for entry in history:
        timestamp = entry.get("timestamp")
        try:
            date_key = datetime.fromisoformat(str(timestamp).replace("Z", "+00:00")).date().isoformat()
        except Exception:
            continue

        grouped.setdefault(date_key, {"screen": [], "sedentary": []})
        grouped[date_key]["screen"].append(float(entry.get("screen_time", 0.0)))
        grouped[date_key]["sedentary"].append(float(entry.get("sedentary_time", 0.0)))

    daily = []
    for date_key in sorted(grouped.keys()):
        screen_values = grouped[date_key]["screen"]
        sedentary_values = grouped[date_key]["sedentary"]
        daily.append(
            {
                "date": date_key,
                "avg_screen_time": sum(screen_values) / max(len(screen_values), 1),
                "avg_sedentary_time": sum(sedentary_values) / max(len(sedentary_values), 1),
            }
        )
    return daily


def _compute_chronic_streak(daily_metrics: list) -> int:
    streak = 0
    best_streak = 0
    for day in daily_metrics:
        if day["avg_screen_time"] > 8 and day["avg_sedentary_time"] > 6:
            streak += 1
            best_streak = max(best_streak, streak)
        else:
            streak = 0
    return best_streak


async def _build_victory_message(saved_screen_hours: float, current_stress_index: float, seven_day_average: float) -> str:
    default = (
        f"You have reclaimed {saved_screen_hours:.0f} hours of your life from screens this week. "
        "Your brain is healing. Keep going."
    )

    if not gemini_configured:
        return default

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        prompt = f"""
You are a Sukoon Clinical Partner writing a celebratory mental health progress note.
Inputs:
- Saved screen hours this week: {saved_screen_hours:.1f}
- Current stress index: {current_stress_index:.1f}
- 7 day average stress index: {seven_day_average:.1f}

Write one concise, uplifting sentence in medical-coaching tone that reinforces recovery behavior.
"""
        response = model.generate_content(prompt)
        text = response.text.strip()
        return text or default
    except Exception as exc:
        print(f"Victory message generation warning: {exc}")
        return default


@app.get("/contextual-coping")
async def contextual_coping(
    mood: str = Query("work_pressure"),
    city: str = Query("Bengaluru"),
    burnout_status: str = Query("Moderate"),
    stress_index: float = Query(60.0),
):
    """Return personalized coping content and local events based on current mood and context."""
    key = (mood or "").strip().lower()
    profile = MOOD_LIBRARY.get(key, MOOD_LIBRARY["work_pressure"])

    if burnout_status == "Critical" or stress_index >= 75:
        urgency_note = "High-load day detected. Keep goals minimal and prioritize regulation before productivity."
    elif burnout_status == "Moderate" or stress_index >= 40:
        urgency_note = "Moderate strain detected. Early resets now can prevent escalation later."
    else:
        urgency_note = "Current load appears manageable. Use these actions to maintain your baseline."

    events_payload = await _fetch_eventbrite_events(
        city=city,
        keywords=profile["event_keywords"],
        category_ids=profile["event_category_ids"],
    )

    return {
        "mood_key": key,
        "mood_title": profile["title"],
        "journal_prompt": profile["journal_prompt"],
        "quote": profile["quote"],
        "coping_actions": profile["coping_actions"],
        "urgency_note": urgency_note,
        "events": events_payload["events"],
        "events_source": events_payload["source"],
        "clinical_recommendation": profile["clinical_recommendation"],
    }


async def _fetch_eventbrite_events(city: str, keywords: str, category_ids: list) -> dict:
    """Fetch local events from Eventbrite if token is present, otherwise return curated fallback events."""
    token = os.getenv("EVENTBRITE_TOKEN")
    if not token:
        return {
            "events": _fallback_events(city),
            "source": "fallback",
        }

    start_after = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    end_before = (datetime.now(timezone.utc) + timedelta(days=21)).strftime("%Y-%m-%dT%H:%M:%SZ")

    query = parse.urlencode(
        {
            "q": keywords,
            "location.address": city,
            "categories": ",".join(category_ids),
            "start_date.range_start": start_after,
            "start_date.range_end": end_before,
            "sort_by": "date",
            "page_size": 6,
        }
    )
    url = f"https://www.eventbriteapi.com/v3/events/search/?{query}"

    req = request.Request(
        url,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )

    try:
        with request.urlopen(req, timeout=8) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
    except Exception as exc:
        print(f"Eventbrite fetch failed: {exc}")
        return {
            "events": _fallback_events(city),
            "source": "fallback",
        }

    events = []
    for item in payload.get("events", [])[:3]:
        start = item.get("start") or {}
        category = item.get("category_id", "Wellness")
        events.append(
            {
                "name": (item.get("name") or {}).get("text") or "Wellness Event",
                "date": start.get("local") or "TBA",
                "location": city if isinstance(city, str) else "Local",
                "url": item.get("url") or "https://www.eventbrite.com/",
                "is_free": bool(item.get("is_free", False)),
                "category": str(category),
            }
        )

    if not events:
        return {
            "events": _fallback_events(city),
            "source": "fallback",
        }

    return {
        "events": events,
        "source": "eventbrite",
    }


def _fallback_events(city: str) -> list:
    city_name = city or "your city"
    return [
        {
            "name": f"Mindful Breathing Circle - {city_name}",
            "date": "This Saturday, 8:00 AM",
            "location": city_name,
            "url": f"https://www.google.com/search?q=mindfulness+events+in+{parse.quote_plus(city_name)}",
            "is_free": True,
            "category": "Mindfulness",
        },
        {
            "name": f"Community Yoga Recovery Session - {city_name}",
            "date": "Sunday, 7:30 AM",
            "location": city_name,
            "url": f"https://www.google.com/search?q=yoga+community+class+in+{parse.quote_plus(city_name)}",
            "is_free": False,
            "category": "Movement",
        },
        {
            "name": f"Peer Support Meetup - {city_name}",
            "date": "Wednesday, 6:30 PM",
            "location": city_name,
            "url": f"https://www.google.com/search?q=mental+health+support+group+in+{parse.quote_plus(city_name)}",
            "is_free": True,
            "category": "Support Group",
        },
    ]

@app.get("/")
async def health_check():
    """Health check endpoint for backend status"""
    return {
        "status": "online",
        "model": "Gemini-Ready",
        "project": "Sukoon Medical AI",
        "version": "0.1.0",
        "gemini_configured": gemini_configured
    }


@app.get("/analyze")
async def analyze_usage_info():
    """Guidance endpoint for developers opening /analyze in a browser."""
    return {
        "detail": "Use POST /analyze with multipart/form-data.",
        "required_fields": [
            "screen_time",
            "sedentary_time",
            "sleep_hours",
            "user_text"
        ],
        "optional_fields": ["audio_file"]
    }


@app.post("/analyze")
async def analyze_mental_health(
    screen_time: float = Form(...),
    sedentary_time: float = Form(...),
    sleep_hours: float = Form(...),
    user_text: str = Form(...),
    audio_file: UploadFile = File(None)
):
    """
    Comprehensive mental health analysis endpoint.

    Inputs:
    - screen_time: Hours of daily screen exposure
    - sedentary_time: Hours of sedentary activity
    - sleep_hours: Hours of sleep per night
    - user_text: User's self-reported text about their state
    - audio_file: Optional voice recording for vocal fatigue analysis

    Returns:
    - stress_index: 0-100 overall stress score
    - vocal_analysis: Vocal fatigue metrics (if audio provided)
    - gemini_response: AI-generated insight and recommendations
    """

    audio_file_path = None
    vocal_analysis = None

    try:
        # ============ Audio Processing (if provided) ============
        if audio_file and audio_file.filename:
            # Generate unique filename
            file_extension = Path(audio_file.filename).suffix
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            audio_file_path = DATA_DIR / unique_filename

            # Save uploaded file
            with open(audio_file_path, "wb") as f:
                audio_content = await audio_file.read()
                f.write(audio_content)

            # Analyze vocal fatigue
            vocal_analysis = analyze_vocal_fatigue(str(audio_file_path))
            vocal_fatigue_score = vocal_analysis.get("vocal_fatigue_score", 0.0)
            has_audio = True
        else:
            vocal_fatigue_score = 0.0
            has_audio = False

        # ============ Calculate Stress Index ============
        stress_results = calculate_stress_index(
            screen_time=screen_time,
            sedentary_time=sedentary_time,
            sleep_hours=sleep_hours,
            vocal_fatigue_score=vocal_fatigue_score,
            has_audio=has_audio
        )

        stress_index = stress_results["stress_index"]
        burnout_status = determine_burnout_status(stress_index, vocal_fatigue_score)

        # ============ Gemini Analysis ============
        gemini_response = await _get_gemini_insight(
            stress_results=stress_results,
            vocal_fatigue_score=vocal_fatigue_score,
            user_text=user_text,
            burnout_status=burnout_status
        )

        # ============ Compile Response ============
        response = {
            "analysis_complete": True,
            "stress_index": stress_index,
            "burnout_status": burnout_status,
            "stress_breakdown": {
                "screen_score": stress_results["screen_score"],
                "sedentary_score": stress_results["sedentary_score"],
                "sleep_score": stress_results["sleep_score"],
            },
            "vocal_analysis": vocal_analysis if has_audio else None,
            "vocal_penalty_applied": stress_results["vocal_penalty_applied"],
            "gemini_insight": gemini_response
        }

        return response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    finally:
        # Clean up temporary audio file
        if audio_file_path and audio_file_path.exists():
            try:
                audio_file_path.unlink()
            except Exception as e:
                print(f"Warning: Could not delete temporary file {audio_file_path}: {e}")


async def _get_gemini_insight(
    stress_results: dict,
    vocal_fatigue_score: float,
    user_text: str,
    burnout_status: str
) -> dict:
    """
    Send data to Google Gemini for compassionate AI analysis.

    Returns:
    {
        "insight": "2-sentence empathetic observation",
        "recommendation": "Specific micro-movement or digital detox tip",
        "escalation": bool
    }
    """

    if not gemini_configured:
        return _build_local_insight(
            stress_results=stress_results,
            vocal_fatigue_score=vocal_fatigue_score,
            user_text=user_text,
            burnout_status=burnout_status,
            source="local-fallback"
        )

    try:
        # Prepare context prompt
        stress_index = stress_results["stress_index"]
        context = f"""
User Assessment:
- Stress Index: {stress_index}/100
- Burnout Status: {burnout_status}
- Screen Time: {stress_results['components']['screen_time_hours']} hours
- Sedentary Time: {stress_results['components']['sedentary_time_hours']} hours
- Sleep: {stress_results['components']['sleep_hours']} hours
- Vocal Fatigue: {vocal_fatigue_score:.2f}/1.0
- User Statement: "{user_text}"
"""

        # System instruction for Gemini
        system_instruction = """You are a Sukoon Clinical Partner.
    If the trend is chronic, use a firm, medical tone emphasizing professional help.
    If the trend is progressing, use an enthusiastic, celebratory tone.
    Always bridge the gap between digital habits and real-world social prescriptions.
    Your role is to analyze user data with empathy and provide actionable, evidence-based guidance.

IMPORTANT: You MUST respond ONLY with valid JSON in this exact format:
{
    "insight": "A 2-sentence empathetic observation about their state",
    "recommendation": "One specific, actionable micro-movement or digital detox tip they can do now",
    "escalation": true/false (true if voice or text indicates high-risk distress, suicidal ideation, or severe anxiety)
}

Do not include any text outside this JSON. Do not explain your reasoning. Only output the JSON object."""

        # Call Gemini API
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(
            f"{system_instruction}\n\n{context}",
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=500
            )
        )

        # Parse response
        response_text = response.text.strip()

        # Try to extract JSON from response
        try:
            # Remove markdown code block if present
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()
            elif response_text.startswith("```"):
                response_text = response_text.replace("```", "").strip()

            gemini_data = json.loads(response_text)
            return {
                "insight": gemini_data.get("insight", "Please take care of yourself."),
                "recommendation": gemini_data.get("recommendation", "Take a 5-minute break."),
                "escalation": bool(gemini_data.get("escalation", False))
            }
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            return {
                "insight": "Your wellbeing matters. Take time to rest and reconnect with yourself.",
                "recommendation": "Try a 5-minute breathing exercise or short walk.",
                "escalation": "critical" in response_text.lower() or "severe" in response_text.lower()
            }

    except Exception as e:
        print(f"Gemini API error: {e}")
        fallback = _build_local_insight(
            stress_results=stress_results,
            vocal_fatigue_score=vocal_fatigue_score,
            user_text=user_text,
            burnout_status=burnout_status,
            source="local-fallback"
        )
        fallback["error"] = str(e)
        return fallback


def _build_local_insight(
    stress_results: dict,
    vocal_fatigue_score: float,
    user_text: str,
    burnout_status: str,
    source: str
) -> dict:
    """Generate dynamic local insight when Gemini is unavailable."""
    text = (user_text or "").lower()
    stress_index = float(stress_results.get("stress_index", 0.0))
    screen_score = float(stress_results.get("screen_score", 0.0))
    sedentary_score = float(stress_results.get("sedentary_score", 0.0))
    sleep_score = float(stress_results.get("sleep_score", 0.0))

    risk_keywords = ["panic", "hopeless", "can't cope", "suicide", "self harm", "overwhelmed"]
    escalation = burnout_status == "Critical" or any(keyword in text for keyword in risk_keywords)

    if burnout_status == "Critical":
        insight = (
            f"Your current profile suggests elevated burnout risk (stress index {stress_index:.1f}/100). "
            "The combined lifestyle and fatigue markers indicate you should reduce load today."
        )
    elif burnout_status == "Moderate":
        insight = (
            f"Your profile shows a moderate strain pattern (stress index {stress_index:.1f}/100). "
            "Early recovery actions now can prevent escalation over the next few days."
        )
    else:
        insight = (
            f"Your current signals indicate relatively stable load (stress index {stress_index:.1f}/100). "
            "Maintaining healthy pacing will help preserve this baseline."
        )

    dominant_component = max(
        [
            ("screen", screen_score),
            ("sedentary", sedentary_score),
            ("sleep", sleep_score),
        ],
        key=lambda item: item[1],
    )[0]

    if dominant_component == "screen":
        recommendation = "Take a 10-minute screen-off reset every 90 minutes and lower brightness after sunset."
    elif dominant_component == "sedentary":
        recommendation = "Set a 45-minute stand-and-stretch interval and complete one 3-minute mobility reset each cycle."
    else:
        recommendation = "Protect a fixed wind-down window and target at least 7.5 hours of consistent sleep timing tonight."

    if vocal_fatigue_score >= 0.6:
        recommendation += " Add 2 minutes of diaphragmatic breathing to reduce vocal and cognitive strain."

    return {
        "insight": insight,
        "recommendation": recommendation,
        "escalation": escalation,
        "source": source,
    }


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)

