"""
Weighted Stress Scoring System for Sukoon
Calculates comprehensive stress index from lifestyle and vocal indicators
"""

from typing import Dict


def calculate_stress_index(
    screen_time: float,
    sedentary_time: float,
    sleep_hours: float,
    vocal_fatigue_score: float = 0.0,
    has_audio: bool = False
) -> Dict[str, float]:
    """
    Calculate weighted stress index using lifestyle metrics and vocal analysis.

    Args:
        screen_time: Hours of screen exposure
        sedentary_time: Hours in sedentary state
        sleep_hours: Hours of sleep
        vocal_fatigue_score: 0.0-1.0 from audio analysis
        has_audio: Whether audio analysis was performed

    Returns:
        Dictionary with:
        - stress_index: 0-100 overall stress score
        - screen_score: Component score (0-50)
        - sedentary_score: Component score (0-30)
        - sleep_score: Component score (0-20)
        - vocal_penalty_applied: Boolean
        - components: Breakdown of all scores
    """

    # Each factor is normalized to 0-100 before weighted blending.
    # Screen and sedentary saturation points reflect sustained high-load behavior.
    screen_score = min((screen_time / 12.0) * 100.0, 100.0)
    sedentary_score = min((sedentary_time / 10.0) * 100.0, 100.0)

    if sleep_hours >= 8.0:
        sleep_score = 0.0
    else:
        sleep_deficit = min(8.0 - sleep_hours, 8.0)
        sleep_score = (sleep_deficit / 8.0) * 100.0

    vocal_component = float(vocal_fatigue_score) * 100.0 if has_audio else 0.0

    final_stress_index = (
        (screen_score * 0.4)
        + (sedentary_score * 0.2)
        + (sleep_score * 0.2)
        + (vocal_component * 0.2)
    )

    vocal_penalty_applied = bool(has_audio and vocal_fatigue_score > 0)

    return {
        "stress_index": float(min(final_stress_index, 100.0)),
        "screen_score": float(screen_score),
        "sedentary_score": float(sedentary_score),
        "sleep_score": float(sleep_score),
        "vocal_score": float(vocal_component),
        "base_stress_index": float(min(final_stress_index, 100.0)),
        "vocal_penalty_applied": vocal_penalty_applied,
        "components": {
            "screen_time_hours": screen_time,
            "sedentary_time_hours": sedentary_time,
            "sleep_hours": sleep_hours,
            "vocal_fatigue_score": float(vocal_fatigue_score) if has_audio else 0.0
        }
    }


def determine_burnout_status(stress_index: float, vocal_fatigue_score: float = 0.0) -> str:
    """
    Classify burnout status based on stress index and vocal indicators.

    Args:
        stress_index: 0-100 stress score
        vocal_fatigue_score: 0.0-1.0 vocal fatigue indicator

    Returns:
        "Low", "Moderate", or "Critical"
    """

    # Burnout classification thresholds
    if stress_index >= 70 or vocal_fatigue_score >= 0.8:
        return "Critical"
    elif stress_index >= 50 or vocal_fatigue_score >= 0.6:
        return "Moderate"
    else:
        return "Low"
