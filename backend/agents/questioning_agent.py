import json
import logging
from typing import Optional, List, Tuple
from backend.config import GEMINI_API_KEY, GEMINI_MODEL
from backend.models.schemas import (
    ChatMessage,
    PatientContext,
    AgentQuestion,
    QuestionType,
)

logger = logging.getLogger(__name__)

MAX_QUESTIONING_TURNS = 3

SYSTEM_PROMPT = """You are the HealthGuard Dynamic Questioning Agent, a clinical communication specialist.
Your purpose is to collect necessary, safety-relevant context from a user describing symptoms so an accurate clinical urgency assessment can be performed.

Guidelines:
1. NEVER provide a diagnosis or assume what illness the person has.
2. Ask only ONE concise, high-yield clinical question at a time.
3. Prioritize high-risk context: exact onset/duration, progression (sudden vs gradual), associated warning signs (fever, breathing difficulty, dizziness), pain radiation/character, or underlying risk factors (pregnancy, cardiac history).
4. Provide 3-5 intuitive, plain-language quick-reply options for the user, while still allowing freeform input.
5. Provide a short, reassuring `context_reason` (1 sentence) explaining why this detail helps determine care urgency.
6. If 2-3 informative details have already been gathered, set `ready_for_assessment: true` instead of asking unnecessary questions.

You must respond in valid JSON matching this schema:
{
  "ready_for_assessment": boolean,
  "question": string or null,
  "context_reason": string or null,
  "options": [string] or [],
  "agent_note": string or null
}
"""


def _build_fallback_question(symptoms: str, turn: int, patient_context: Optional[PatientContext]) -> Tuple[AgentQuestion, bool]:
    """Rule-based fallback when Gemini API key is absent or offline."""
    lower = symptoms.lower()
    
    if turn == 0:
        if any(w in lower for w in ["pain", "ache", "cramp", "hurts", "sore"]):
            return (
                AgentQuestion(
                    id=f"q_{turn+1}",
                    question="How would you describe the intensity and progression of the discomfort?",
                    context_reason="Understanding whether the pain started suddenly and whether it is worsening quickly helps determine urgency.",
                    question_type=QuestionType.OPTIONS,
                    options=[
                        "Sudden & severe (getting worse fast)",
                        "Moderate & constant since onset",
                        "Mild & comes and goes",
                        "Gradually improving",
                    ],
                ),
                False,
            )
        else:
            return (
                AgentQuestion(
                    id=f"q_{turn+1}",
                    question="When did you first notice these symptoms, and how have they changed?",
                    context_reason="Timeline and progression help clinicians distinguish acute flare-ups from evolving issues.",
                    question_type=QuestionType.OPTIONS,
                    options=[
                        "Started today and worsening",
                        "Started a few days ago",
                        "Over 1 to 2 weeks",
                        "Ongoing for a month or more",
                    ],
                ),
                False,
            )

    if turn == 1:
        return (
            AgentQuestion(
                id=f"q_{turn+1}",
                question="Are you experiencing any associated warning signs such as fever, breathing changes, or dizziness?",
                context_reason="Systemic warning signs alter urgency and indicate if immediate clinical review is necessary.",
                question_type=QuestionType.OPTIONS,
                options=[
                    "High fever or persistent chills",
                    "Mild fever or feeling warm",
                    "Dizziness or lightheadedness",
                    "None of these warning signs",
                ],
            ),
            False,
        )

    # After turn 2 or more, ready for assessment
    return (
        AgentQuestion(
            id="ready",
            question="We have collected key details. Let's analyze your clinical urgency.",
            context_reason="Sufficient information gathered.",
            question_type=QuestionType.TEXT,
            options=[],
        ),
        True,
    )


def generate_next_question(
    symptoms: str,
    history: List[ChatMessage],
    patient_context: Optional[PatientContext] = None,
) -> Tuple[Optional[AgentQuestion], bool, Optional[str]]:
    """
    Generates the next dynamic question or decides the session is ready for triage assessment.
    Returns: (AgentQuestion | None, ready_for_assessment: bool, agent_note: str | None)
    """
    # Count how many answers user has provided
    user_turns = sum(1 for m in history if m.role == "user")

    if user_turns >= MAX_QUESTIONING_TURNS:
        return None, True, "Sufficient clinical context gathered over interactive turns."

    # Try Gemini API if key is available
    if GEMINI_API_KEY:
        try:
            from google import genai
            from google.genai import types

            client = genai.Client(api_key=GEMINI_API_KEY)
            
            history_repr = "\n".join([f"{msg.role.upper()}: {msg.content}" for msg in history])
            context_repr = ""
            if patient_context:
                context_repr = (
                    f"Age Group: {patient_context.age_group}, Duration: {patient_context.duration}, "
                    f"Reported Severity: {patient_context.severity}/10, Pregnancy: {patient_context.pregnancy_status}, "
                    f"History: {patient_context.medical_history}, Meds: {patient_context.medications}"
                )

            prompt = (
                f"PATIENT'S INITIAL CONCERN:\n{symptoms}\n\n"
                f"INTERACTION HISTORY (Turn {user_turns} of {MAX_QUESTIONING_TURNS}):\n{history_repr or 'No follow-up exchanges yet.'}\n\n"
                f"PATIENT CONTEXT:\n{context_repr or 'None specified.'}\n\n"
                f"Decide whether to ask 1 targeted follow-up question or if enough context exists to assess urgency."
            )

            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    system_instruction=SYSTEM_PROMPT,
                    response_mime_type="application/json",
                    temperature=0.2,
                ),
            )

            parsed = json.loads(response.text)
            ready = parsed.get("ready_for_assessment", False)
            q_text = parsed.get("question")
            
            if ready or not q_text or user_turns >= MAX_QUESTIONING_TURNS - 1 and ready:
                return None, True, parsed.get("agent_note", "Ready for clinical assessment.")

            question = AgentQuestion(
                id=f"q_{user_turns + 1}",
                question=q_text,
                context_reason=parsed.get("context_reason", "To clarify clinical urgency."),
                question_type=QuestionType.OPTIONS if parsed.get("options") else QuestionType.TEXT,
                options=parsed.get("options", []),
            )
            return question, False, parsed.get("agent_note")

        except Exception as e:
            logger.warning(f"Gemini questioning agent exception, falling back to rule-based: {e}")

    # Fallback to deterministic questions
    question, ready = _build_fallback_question(symptoms, user_turns, patient_context)
    if ready:
        return None, True, "Ready for assessment."
    return question, False, "Safety rule-based follow-up question."
