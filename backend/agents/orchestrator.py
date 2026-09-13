import logging
from typing import Dict, Any
from backend.models.schemas import (
    DynamicQuestionRequest,
    DynamicQuestionResponse,
    TriageAssessmentRequest,
    TriageAssessmentResponse,
    UrgencyLevel,
    SafetyCheckResult,
)
from backend.agents.safety_agent import evaluate_safety_guardrail
from backend.agents.questioning_agent import generate_next_question
from backend.agents.risk_agent import assess_clinical_risk
from backend.agents.recommendation_agent import build_recommendations

logger = logging.getLogger(__name__)


def process_chat_turn(request: DynamicQuestionRequest) -> DynamicQuestionResponse:
    """
    Coordinates the dynamic questioning interaction:
    1. Runs fast-path deterministic safety check on all accumulated text.
    2. If an acute red flag is detected, immediately halts questioning and escalates.
    3. Otherwise, calls the Questioning Agent to either produce a targeted follow-up question
       or signal that sufficient context is present for full assessment.
    """
    all_text = f"{request.symptoms} " + " ".join([m.content for m in request.history])
    safety_result = evaluate_safety_guardrail(all_text)

    # 1. Immediate emergency fast-path
    if safety_result.is_emergency:
        return DynamicQuestionResponse(
            status="emergency_halt",
            turn_count=len(request.history),
            safety=safety_result,
            next_question=None,
            agent_note="High-risk red flag identified. Immediate emergency escalation triggered.",
        )

    # 2. Dynamic questioning agent
    next_q, is_ready, agent_note = generate_next_question(
        symptoms=request.symptoms,
        history=request.history,
        patient_context=request.patient_context,
    )

    if is_ready:
        return DynamicQuestionResponse(
            status="ready_for_assessment",
            turn_count=len(request.history),
            safety=safety_result,
            next_question=None,
            agent_note=agent_note or "Sufficient clinical information collected.",
        )

    return DynamicQuestionResponse(
        status="continue",
        turn_count=len(request.history),
        safety=safety_result,
        next_question=next_q,
        agent_note=agent_note,
    )


def execute_full_triage(request: TriageAssessmentRequest) -> TriageAssessmentResponse:
    """
    Executes the multi-agent clinical assessment pipeline:
    1. Runs deterministic safety check to ensure no emergencies are missed.
    2. Runs Clinical Risk Assessment Agent (Gemini Flash + clinical fallback) for urgency stratification.
    3. Runs Recommendation Agent (Gemini Flash + safety net guidance) to create next steps,
       clinician talking points, and non-prescriptive test guidance.
    4. Compiles structured TriageAssessmentResponse.
    """
    all_text = f"{request.symptoms} " + " ".join([m.content for m in request.history])
    safety_result = evaluate_safety_guardrail(all_text)

    # Risk assessment
    risk_data = assess_clinical_risk(
        symptoms=request.symptoms,
        history=request.history,
        patient_context=request.patient_context,
    )

    urgency_raw = risk_data.get("urgency", "soon")
    # If safety guardrail flagged emergency, override urgency to emergency
    if safety_result.is_emergency:
        urgency_raw = "emergency"

    urgency_level = UrgencyLevel(urgency_raw)

    # Merge red flags
    red_flags = list(set(safety_result.red_flags + risk_data.get("red_flags", [])))

    # Recommendation generation
    rec_data = build_recommendations(
        urgency=urgency_level,
        symptoms=request.symptoms,
        history=request.history,
        patient_context=request.patient_context,
    )

    urgency_label = risk_data.get("urgency_label")
    if not urgency_label:
        urgency_label = {
            UrgencyLevel.EMERGENCY: "Emergency care now",
            UrgencyLevel.SAME_DAY: "Same-day medical evaluation",
            UrgencyLevel.SOON: "Arrange a clinician visit soon",
            UrgencyLevel.SELF_CARE: "Monitor with safety-net guidance",
        }[urgency_level]

    return TriageAssessmentResponse(
        urgency=urgency_level,
        urgency_label=urgency_label,
        headline=risk_data.get("headline", "Assessment Completed"),
        summary=risk_data.get("summary", ""),
        rationale=risk_data.get("rationale", []),
        red_flags=red_flags,
        escalation_triggers=rec_data.get("escalation_triggers", []),
        doctor_discussion_questions=rec_data.get("doctor_discussion_questions", []),
        suggested_tests_to_ask_about=rec_data.get("suggested_tests_to_ask_about", []),
        possible_clinical_categories=risk_data.get("possible_clinical_categories", []),
        next_steps=rec_data.get("next_steps", []),
        sources=rec_data.get("sources", []),
    )
