import json
import logging
from typing import Optional, List, Dict, Any
from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.models.schemas import (
    ChatMessage,
    PatientContext,
    UrgencyLevel,
)

logger = logging.getLogger(__name__)

RISK_SYSTEM_PROMPT = """You are the HealthGuard Clinical Risk Assessment Agent.
Your responsibility is clinical triage risk stratification.

CRITICAL SAFETY DIRECTIVES:
1. You DO NOT diagnose illnesses or diseases. Never state "You have pneumonia" or "This is appendicitis".
2. You categorize the situation into one of four calibrated urgency levels:
   - "emergency": Immediate life or limb threat, acute severe symptoms requiring emergency room or 911/112/999.
   - "same-day": Non-immediately fatal but time-sensitive symptoms that need in-person physician or urgent-care evaluation today.
   - "soon": Subacute or persistent symptoms needing primary care consultation within 2–4 days.
   - "self-care": Low-risk, mild symptoms suitable for supportive home self-care and watchful waiting.
3. If the patient is an older adult, child, pregnant, or has high pain (>= 8/10), err on the side of caution (at least same-day unless mild).
4. Provide 2-4 clear, bulleted reasons for your urgency assessment in plain, empathetic language.
5. Identify any potential red flags or warning signs the patient should monitor.

You must respond in valid JSON matching this schema:
{
  "urgency": "emergency" | "same-day" | "soon" | "self-care",
  "urgency_label": string,
  "headline": string,
  "summary": string,
  "rationale": [string],
  "red_flags": [string],
  "possible_clinical_categories": [string]
}
"""


def _rule_based_risk_assessment(
    symptoms: str,
    history: List[ChatMessage],
    patient_context: Optional[PatientContext],
) -> Dict[str, Any]:
    """Calibrated rule-based risk evaluation fallback."""
    full_text = f"{symptoms} " + " ".join([m.content for m in history])
    lower = full_text.lower()
    
    severity = patient_context.severity if patient_context and patient_context.severity else 5
    age_group = patient_context.age_group if patient_context else "adult"
    pregnancy = patient_context.pregnancy_status if patient_context else "not-applicable"

    # Emergency criteria
    if (
        severity >= 9
        or (age_group == "older-adult" and severity >= 8)
        or any(w in lower for w in ["chest pain", "shortness of breath", "unconscious", "passed out", "slurred speech", "bleeding heavily", "suicidal"])
        or (pregnancy != "not-applicable" and any(w in lower for w in ["severe pain", "bleeding", "fainting"]))
    ):
        return {
            "urgency": "emergency",
            "urgency_label": "Emergency care now",
            "headline": "Please seek emergency care immediately",
            "summary": "Your reported symptoms include high-acuity indicators that should not wait for an appointment and need urgent in-person evaluation.",
            "rationale": [
                "Presence of critical warning signs or high symptom severity.",
                "Risk of rapid progression without acute clinical monitoring.",
                "Requires in-person diagnostic facilities such as ECG, oxygenation, or emergency lab evaluation."
            ],
            "red_flags": [
                "Chest tightness, pressure, or shortness of breath",
                "Sudden weakness, confusion, or speech changes",
                "Loss of consciousness or severe uncontrollable bleeding"
            ],
            "possible_clinical_categories": ["Acute emergency indicators", "Cardiorespiratory or acute neurological symptoms"]
        }

    # Same-day criteria
    same_day_signals = ["fever", "high fever", "severe pain", "vomiting", "blood in stool", "worsening quickly", "rash with fever", "persistent pain"]
    if (
        severity >= 7
        or any(sig in lower for sig in same_day_signals)
        or (age_group == "child" and severity >= 6)
    ):
        return {
            "urgency": "same-day",
            "urgency_label": "Same-day medical evaluation",
            "headline": "Please arrange to see a doctor today",
            "summary": "Your responses suggest that waiting several days is not advisable. An in-person clinician or urgent care clinic should review your symptoms today.",
            "rationale": [
                "Reported symptoms have features that could progress or cause complications without timely care.",
                "Severity or rapid onset warrants medical assessment within 12–24 hours.",
                "Physical examination and possible targeted tests are recommended."
            ],
            "red_flags": [
                "Inability to tolerate oral fluids or signs of dehydration",
                "Fever rising above 39°C (102.2°F) or not responding to antipyretics",
                "Spreading rash or breathing changes"
            ],
            "possible_clinical_categories": ["Acute systemic or localized symptoms needing same-day review"]
        }

    # Routine soon criteria
    if severity >= 4 or (patient_context and patient_context.duration in ["one-to-two-weeks", "longer"]):
        return {
            "urgency": "soon",
            "urgency_label": "Arrange a clinician visit soon",
            "headline": "A doctor should review this within a few days",
            "summary": "Your symptoms do not currently indicate immediate danger, but persist long enough or cause enough disruption that a scheduled consultation is sensible.",
            "rationale": [
                "Symptoms are ongoing or moderate, suggesting professional review is beneficial.",
                "No immediate life-threatening markers identified in this screening.",
                "Allows discussion of management options and baseline checks."
            ],
            "red_flags": [
                "Sudden sharp increase in pain intensity",
                "Development of new fever or shortness of breath",
                "New neurological symptoms or dizziness upon standing"
            ],
            "possible_clinical_categories": ["Subacute symptoms suitable for routine primary care"]
        }

    # Self-care criteria
    return {
        "urgency": "self-care",
        "urgency_label": "Monitor with safety-net guidance",
        "headline": "Low-risk symptoms: monitor and support at home",
        "summary": "No high-risk indicators were identified by this screening. Supportive home care is likely appropriate while monitoring closely for any changes.",
        "rationale": [
            "Low reported severity and absence of systemic warning signs.",
            "Patterns commonly reflect self-limiting conditions that resolve with rest and hydration.",
            "Clear safety escalation thresholds are provided if symptoms persist."
        ],
        "red_flags": [
            "Symptoms lasting longer than expected or failing to improve after 5–7 days",
            "Any emergence of fever, breathing changes, or sharp localized pain"
        ],
        "possible_clinical_categories": ["Mild, self-limiting general symptoms"]
    }


def assess_clinical_risk(
    symptoms: str,
    history: List[ChatMessage],
    patient_context: Optional[PatientContext] = None,
) -> Dict[str, Any]:
    """
    Evaluates clinical risk using Gemini API with structured output,
    falling back to calibrated rule-based assessment if needed.
    """
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=GEMINI_API_KEY)

            history_repr = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in history])
            context_repr = ""
            if patient_context:
                context_repr = (
                    f"Age: {patient_context.age_group}, Duration: {patient_context.duration}, "
                    f"Severity: {patient_context.severity}/10, Pregnancy: {patient_context.pregnancy_status}, "
                    f"History: {patient_context.medical_history}, Medications: {patient_context.medications}"
                )

            prompt = (
                f"PATIENT CHIEF COMPLAINT:\n{symptoms}\n\n"
                f"INTERACTION TRANSCRIPT:\n{history_repr or 'No additional turns.'}\n\n"
                f"PATIENT CONTEXT:\n{context_repr or 'Standard adult, no special history provided.'}\n\n"
                f"Analyze the clinical risk and determine the appropriate urgency level (emergency, same-day, soon, self-care)."
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=RISK_SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.1,
                ),
            )

            parsed = json.loads(response.text)
            # Ensure valid urgency
            urgency_str = parsed.get("urgency", "soon").lower()
            if urgency_str not in ["emergency", "same-day", "soon", "self-care"]:
                urgency_str = "soon"
            parsed["urgency"] = urgency_str
            return parsed

        except Exception as e:
            logger.warning(f"Gemini risk assessment exception, using rule-based engine: {e}")

    return _rule_based_risk_assessment(symptoms, history, patient_context)
