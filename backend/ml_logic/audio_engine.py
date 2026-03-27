"""Audio analysis engine for vocal biomarker extraction."""

from pathlib import Path
from typing import Dict, Tuple

import librosa
import numpy as np


PROSODIC_NARROWING_THRESHOLD_HZ = 20.0
HEALTHY_VARIANCE_TARGET_HZ = 60.0
MIN_AUDIO_SECONDS = 1.0
SAMPLE_RATE = 22050


def _load_audio(file_path: str) -> Tuple[np.ndarray, int]:
    """Load audio safely and validate file-level constraints."""
    path = Path(file_path)
    if not path.exists() or not path.is_file():
        raise FileNotFoundError(f"Audio file not found: {file_path}")

    allowed_audio_extensions = {".wav", ".webm", ".ogg", ".mp3", ".mpeg", ".m4a", ".mp4", ".aac"}
    if path.suffix.lower() not in allowed_audio_extensions:
        raise ValueError("Unsupported audio format for vocal biomarker analysis")

    y, sr = librosa.load(str(path), sr=SAMPLE_RATE, mono=True)
    if y.size == 0:
        raise ValueError("Audio file is empty or unreadable")

    duration_sec = len(y) / float(sr)
    if duration_sec < MIN_AUDIO_SECONDS:
        raise ValueError("Audio too short for reliable analysis")

    return y, sr


def _extract_voiced_f0(y: np.ndarray, sr: int) -> np.ndarray:
    """Extract voiced fundamental frequency (F0) using librosa.pyin."""
    f0, voiced_flag, _ = librosa.pyin(
        y,
        fmin=librosa.note_to_hz("C2"),
        fmax=librosa.note_to_hz("C7"),
        sr=sr,
    )

    if f0 is None or voiced_flag is None:
        raise ValueError("Pitch extraction failed")

    voiced_f0 = f0[voiced_flag]
    voiced_f0 = voiced_f0[~np.isnan(voiced_f0)]
    if len(voiced_f0) < 8:
        raise ValueError("Insufficient voiced segments for stable variance")

    return voiced_f0


def _normalize_vocal_fatigue(f0_std_hz: float) -> float:
    """Map pitch variability to fatigue score in [0, 1]."""
    if f0_std_hz <= PROSODIC_NARROWING_THRESHOLD_HZ:
        return 1.0

    expressive_span = HEALTHY_VARIANCE_TARGET_HZ - PROSODIC_NARROWING_THRESHOLD_HZ
    if expressive_span <= 0:
        return 0.5

    expressive_ratio = (f0_std_hz - PROSODIC_NARROWING_THRESHOLD_HZ) / expressive_span
    fatigue = 1.0 - float(np.clip(expressive_ratio, 0.0, 1.0))
    return float(np.clip(fatigue, 0.0, 1.0))


def get_vocal_fatigue_score(file_path: str) -> float:
    """
    Return normalized vocal fatigue score using pitch variance from librosa.pyin.

    Logic:
    - Low F0 variance (< ~15-20Hz): monotone/prosodic narrowing => higher fatigue
    - High F0 variance: healthy expressive speech => lower fatigue

    Returns:
        float in range 0.0 to 1.0 where 1.0 is maximum fatigue.
    """
    try:
        y, sr = _load_audio(file_path)
        voiced_f0 = _extract_voiced_f0(y, sr)
        f0_std = float(np.std(voiced_f0))
        return _normalize_vocal_fatigue(f0_std)
    except Exception:
        # Neutral fallback protects API flow when recording quality is poor.
        return 0.5


def analyze_vocal_fatigue(file_path: str) -> Dict[str, float]:
    """
    Analyze vocal characteristics to detect fatigue and stress indicators.

    Args:
        file_path: Path to .wav audio file

    Returns:
        Dictionary with vocal metrics:
        - vocal_fatigue_score: 0.0-1.0 (1.0 = high fatigue/monotone)
        - f0_variance: Standard deviation of fundamental frequency
        - confidence: Analysis confidence level
    """

    try:
        y, sr = _load_audio(file_path)
        voiced_f0 = _extract_voiced_f0(y, sr)

        f0_std = float(np.std(voiced_f0))
        vocal_fatigue_score = _normalize_vocal_fatigue(f0_std)

        return {
            "vocal_fatigue_score": float(vocal_fatigue_score),
            "f0_variance": f0_std,
            "confidence": float(min(len(voiced_f0) / 500, 1.0)),
            "voiced_segments": int(len(voiced_f0)),
            "prosodic_narrowing": bool(f0_std <= PROSODIC_NARROWING_THRESHOLD_HZ),
        }

    except Exception as e:
        return {
            "vocal_fatigue_score": 0.5,
            "f0_variance": 0.0,
            "confidence": 0.0,
            "error": str(e),
            "prosodic_narrowing": False,
        }
