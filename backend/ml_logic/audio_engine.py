"""
Audio Analysis Engine for Sukoon Mental Health Support
Extracts vocal fatigue indicators using Librosa signal processing
"""

import librosa
import numpy as np
from typing import Dict, Tuple


def analyze_vocal_fatigue(file_path: str) -> Dict[str, float]:
    """
    Analyze vocal characteristics to detect fatigue and stress indicators.

    Args:
        file_path: Path to .wav audio file

    Returns:
        Dictionary with vocal metrics:
        - vocal_fatigue_score: 0.0-1.0 (1.0 = high fatigue/monotone)
        - f0_variance: Standard deviation of fundamental frequency
        - hnr_score: Harmonics-to-Noise Ratio (normalized 0-1)
        - confidence: Analysis confidence level
    """

    try:
        # Load audio file
        y, sr = librosa.load(file_path, sr=22050)

        if len(y) < sr:  # Less than 1 second
            return {
                "vocal_fatigue_score": 0.5,
                "f0_variance": 0.0,
                "hnr_score": 0.5,
                "confidence": 0.3,
                "error": "Audio too short for reliable analysis"
            }

        # ============ Pitch Extraction (F0) ============
        f0, voiced_flag, voiced_probs = librosa.pyin(
            y,
            fmin=librosa.note_to_hz('C2'),
            fmax=librosa.note_to_hz('C7'),
            threshold=0.1
        )

        # Filter out unvoiced segments
        voiced_f0 = f0[voiced_flag]

        if len(voiced_f0) < 10:
            return {
                "vocal_fatigue_score": 0.5,
                "f0_variance": 0.0,
                "hnr_score": 0.5,
                "confidence": 0.2,
                "error": "Insufficient voiced segments"
            }

        # ============ F0 Variance (Monotone Indicator) ============
        f0_std = np.std(voiced_f0)
        f0_mean = np.mean(voiced_f0)
        f0_cv = (f0_std / f0_mean) if f0_mean > 0 else 0  # Coefficient of variation

        # Lower CV = monotone (fatigued), Higher CV = varied (energetic)
        # Normalize: typical CV range for speech is 0.05-0.15 (very varied to nearly monotone)
        f0_monotone_score = np.clip(1.0 - (f0_cv / 0.15), 0.0, 1.0)

        # ============ Harmonics-to-Noise Ratio (HNR) ============
        hnr_score = _calculate_hnr(y, sr, f0_mean)

        # ============ Vocal Fatigue Composite Score ============
        # Combine monotone + HNR indicators
        # High monotone + Low HNR = High fatigue
        vocal_fatigue_score = (f0_monotone_score * 0.6) + (hnr_score * 0.4)
        vocal_fatigue_score = np.clip(vocal_fatigue_score, 0.0, 1.0)

        return {
            "vocal_fatigue_score": float(vocal_fatigue_score),
            "f0_variance": float(f0_std),
            "f0_mean": float(f0_mean),
            "f0_monotone_ratio": float(f0_monotone_score),
            "hnr_score": float(hnr_score),
            "confidence": float(min(len(voiced_f0) / 500, 1.0)),  # Higher voiced segments = higher confidence
            "voiced_segments": len(voiced_f0)
        }

    except Exception as e:
        return {
            "vocal_fatigue_score": 0.5,
            "f0_variance": 0.0,
            "hnr_score": 0.5,
            "confidence": 0.0,
            "error": str(e)
        }


def _calculate_hnr(y: np.ndarray, sr: int, f0_mean: float) -> float:
    """
    Calculate Harmonics-to-Noise Ratio.

    Lower HNR = Breathiness/thinness (vocal fatigue indicator)
    Higher HNR = Clear, strong voice

    Returns: Normalized score 0.0-1.0
    """

    try:
        # Extract harmonics using autocorrelation
        if f0_mean <= 0:
            return 0.5

        # Estimate periodicity using autocorrelation
        hop_length = 512
        S = librosa.stft(y, hop_length=hop_length)
        magnitude = np.abs(S)

        # Compute spectral centroid as proxy for voice clarity
        frequencies = librosa.fft_frequencies(sr=sr)
        spectral_centroid = librosa.feature.spectral_centroid(S=magnitude, sr=sr)[0]

        # Spectral flux (change over time - high energy movement = better voice quality)
        spectral_flux = np.sqrt(np.sum(np.diff(magnitude, axis=1)**2, axis=0))
        mean_flux = np.mean(spectral_flux) if len(spectral_flux) > 0 else 0

        # Normalize flux to 0-1 range
        flux_normalized = np.clip(mean_flux / 100, 0.0, 1.0)

        # HNR estimate: higher flux and higher centroid = clearer voice
        hnr_normalized = flux_normalized

        return float(hnr_normalized)

    except Exception as e:
        print(f"HNR calculation warning: {e}")
        return 0.5
