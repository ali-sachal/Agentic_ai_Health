import json
import logging
from typing import Optional, List, Dict, Any
from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.models.schemas import (
    ChatMessage,
    PatientContext,
    MedicalSource,
    UrgencyLevel,
)

logger = logging.getLogger(__name__)

RECOMMENDATION_SYSTEM_PROMPT = """You are the HealthGuard Recommendation & Clinician Communication Agent.
Your role is to empower the user with clear, actionable, jargon-free next steps and a discussion guide to bring to a licensed healthcare professional.

CRITICAL DIRECTIVES:
1. NEVER prescribe medication, order medical tests, or claim a specific diagnosis.
2. Frame all testing ideas as "Topics or checks to discuss with your doctor", never as mandatory requirements.
3. Tailor the next steps to the provided urgency level ("emergency", "same-day", "soon", "self-care").
4. Formulate 3-4 specific, high-yield questions the patient can ask their doctor.
5. Provide clear safety-net escalation triggers: exactly what new symptoms should prompt urgent or emergency escalation.

You must respond in valid JSON matching this schema:
{
  "next_steps": [string],
  "escalation_triggers": [string],
  "doctor_discussion_questions": [string],
  "suggested_tests_to_ask_about": [string]
}
"""

DEFAULT_SOURCES: List[Dict[str, str]] = [
    {
        "title": "Health A to Z: Conditions & Symptoms",
        "publisher": "NHS (UK)",
        "url": "https://www.nhs.uk/conditions/",
        "why": "Trusted patient guidance on common symptoms, self-care, and when to seek medical help.",
    },
    {
        "title": "Medical Encyclopedia",
        "publisher": "MedlinePlus (US National Library of Medicine)",
        "url": "https://medlineplus.gov/encyclopedia.html",
        "why": "Plain-language, peer-reviewed medical reference on health concerns and warning signs.",
    },
]


def _rule_based_recommendations(
    urgency: UrgencyLevel,
    symptoms: str,
) -> Dict[str, Any]:
    """Deterministic fallback recommendations."""
    lower = symptoms.lower()

    if urgency == UrgencyLevel.EMERGENCY:
        return {
            "next_steps": [
                "Call your local emergency services (911, 999, 112) or go to the nearest emergency department immediately.",
                "Do not drive yourself if feeling lightheaded, short of breath, or in severe distress.",
                "Have your current medications, known allergies, and medical history ready for first responders.",
            ],
            "escalation_triggers": [
                "Any loss of consciousness or inability to respond",
                "Worsening difficulty catching your breath or chest pain radiating to back/jaw",
                "Sudden weakness, confusion, or inability to speak clearly",
            ],
            "doctor_discussion_questions": [
                "What immediate tests (ECG, blood gas, imaging) are needed to rule out life-threatening conditions?",
                "Are these symptoms related to any underlying cardiovascular or neurological condition?",
                "What signs should I watch for after stabilization?",
            ],
            "suggested_tests_to_ask_about": [
                "Vital signs monitoring (blood pressure, pulse oximetry, heart rate, temperature)",
                "Focused physical examination and emergency evaluation",
                "Urgent diagnostic testing as determined by the receiving emergency clinician",
            ],
        }

    if urgency == UrgencyLevel.SAME_DAY:
        return {
            "next_steps": [
                "Contact your primary care doctor or visit an urgent care center for an in-person assessment today.",
                "Note when symptoms started and record any temperature spikes or medication doses.",
                "If symptoms escalate rapidly before your appointment, go to the emergency room.",
            ],
            "escalation_triggers": [
                "Temperature exceeding 39°C (102.2°F) or failure to respond to fever reducers",
                "Development of chest pressure, breathing trouble, or severe headache with stiff neck",
                "Inability to keep liquids down for more than 12 hours",
            ],
            "doctor_discussion_questions": [
                "Could this be an acute infection or inflammatory condition requiring immediate medication?",
                "What physical checks or lab tests would help clarify what's going on?",
                "Under what conditions should I escalate to an emergency facility tonight?",
            ],
            "suggested_tests_to_ask_about": [
                "Vital signs and temperature verification",
                "Focused physical examination of the affected body region",
                "Possible rapid point-of-care tests (e.g. urinalysis, rapid swab, or basic blood counts if indicated)",
            ],
        }

    if urgency == UrgencyLevel.SOON:
        return {
            "next_steps": [
                "Schedule a routine appointment with your family physician within the next 2 to 4 days.",
                "Keep a daily log of symptoms, noting severity and triggers.",
                "Avoid strenuous activities that clearly aggravate your discomfort.",
            ],
            "escalation_triggers": [
                "Sudden increase in pain from manageable to severe",
                "New onset of fever, unsteadiness, or breathing changes",
                "Symptoms causing severe sleep disruption or inability to perform basic daily activities",
            ],
            "doctor_discussion_questions": [
                "Could my lifestyle, medication, or recent activities be contributing to these symptoms?",
                "Are there non-invasive diagnostic tests or baseline screenings we should order?",
                "What timeline should I expect for recovery or improvement?",
            ],
            "suggested_tests_to_ask_about": [
                "Comprehensive review of medical history and routine physical exam",
                "Baseline blood panels or metabolic evaluation if persistent",
                "Discussion of symptom management and lifestyle modifications",
            ],
        }

    # Self-care
    return {
        "next_steps": [
            "Rest adequately, maintain good hydration with water or electrolyte fluids, and monitor symptoms.",
            "Use standard over-the-counter supportive measures if appropriate for you and not contraindicated.",
            "Contact a healthcare provider if your symptoms fail to improve after 5 to 7 days.",
        ],
        "escalation_triggers": [
            "Any emergence of high fever, persistent vomiting, or localized severe pain",
            "Symptoms progressively worsening rather than improving over the next 48 hours",
            "Any difficulty breathing or unexplained dizziness",
        ],
        "doctor_discussion_questions": [
            "Is there any preventive step or supportive care measure I should consider?",
            "At what point should I come in for an in-person examination if this doesn't fully resolve?",
        ],
        "suggested_tests_to_ask_about": [
            "General health wellness review",
            "Routine checkup if you haven't seen a primary doctor in the past year",
        ],
    }


def build_recommendations(
    urgency: UrgencyLevel,
    symptoms: str,
    history: List[ChatMessage],
    patient_context: Optional[PatientContext] = None,
) -> Dict[str, Any]:
    """
    Builds personalized clinician discussion guide and next steps using Gemini,
    with robust rule-based clinical fallbacks.
    """
    sources = [MedicalSource(**s) for s in DEFAULT_SOURCES]

    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=GEMINI_API_KEY)

            history_repr = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in history])
            prompt = (
                f"SYMPTOMS:\n{symptoms}\n\n"
                f"HISTORY:\n{history_repr}\n\n"
                f"DETERMINED URGENCY LEVEL: {urgency.value.upper()}\n\n"
                f"Generate practical next steps, safety-net escalation triggers, doctor discussion questions, "
                f"and potential non-prescriptive tests/checks to ask about."
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=RECOMMENDATION_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            parsed = json.loads(response.text)
            return {
                "next_steps": parsed.get("next_steps", []),
                "escalation_triggers": parsed.get("escalation_triggers", []),
                "doctor_discussion_questions": parsed.get("doctor_discussion_questions", []),
                "suggested_tests_to_ask_about": parsed.get("suggested_tests_to_ask_about", []),
                "sources": sources,
            }

        except Exception as e:
            logger.warning(f"Gemini recommendation agent error, using rule-based engine: {e}")

    result = _rule_based_recommendations(urgency, symptoms)
    result["sources"] = sources
    return result
