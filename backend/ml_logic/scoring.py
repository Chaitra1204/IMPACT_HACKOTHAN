"""
Weighted Stress Scoring System for Sukoon
Calculates comprehensive stress index from lifestyle and vocal indicators
"""

from typing import Dict, Tuple
import numpy as np


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

    # ============ Screen Time Score (50% weight) ============
    # Assumption: 12 hours is maximum harmful screen time
    screen_score = min((screen_time / 12.0) * 50.0, 50.0)

    # ============ Sedentary Time Score (30% weight) ============
    # Assumption: 10 hours is maximum harmful sedentary time
    sedentary_score = min((sedentary_time / 10.0) * 30.0, 30.0)

    # ============ Sleep Score (20% weight) ============
    # Optimal sleep is 8 hours. Deviation increases stress.
    # If sleep > 8, score = 0 (no penalty)
    # If sleep < 8, score increases linearly
    if sleep_hours >= 8.0:
        sleep_score = 0.0
    else:
        sleep_deficit = 8.0 - sleep_hours
        sleep_score = min((sleep_deficit / 8.0) * 20.0, 20.0)

    # ============ Base Stress Index ============
    base_stress_index = screen_score + sedentary_score + sleep_score

    # ============ Vocal Fatigue Penalty ============
    vocal_penalty_applied = False
    final_stress_index = base_stress_index

    if has_audio and vocal_fatigue_score > 0.6:
        # Apply 20% multiplier if vocal fatigue is high
        final_stress_index = min(base_stress_index * 1.2, 100.0)
        vocal_penalty_applied = True

    return {
        "stress_index": float(min(final_stress_index, 100.0)),
        "screen_score": float(screen_score),
        "sedentary_score": float(sedentary_score),
        "sleep_score": float(sleep_score),
        "base_stress_index": float(base_stress_index),
        "vocal_penalty_applied": vocal_penalty_applied,
        "components": {
            "screen_time_hours": screen_time,
            "sedentary_time_hours": sedentary_time,
            "sleep_hours": sleep_hours,
            "vocal_fatigue_score": float(vocal_fatigue_score) if has_audio else None
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
