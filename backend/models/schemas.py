from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class UrgencyLevel(str, Enum):
    EMERGENCY = "emergency"
    SAME_DAY = "same-day"
    SOON = "soon"
    SELF_CARE = "self-care"


class QuestionType(str, Enum):
    OPTIONS = "options"
    TEXT = "text"
    SCALE = "scale"
    BOOLEAN = "boolean"


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str


class PatientContext(BaseModel):
    age_group: Optional[str] = "adult"
    duration: Optional[str] = "today"
    severity: Optional[int] = 5
    medical_history: Optional[str] = ""
    medications: Optional[str] = ""
    pregnancy_status: Optional[str] = "not-applicable"


class AgentQuestion(BaseModel):
    id: str = Field(default="q1")
    question: str
    context_reason: Optional[str] = "To clarify urgency and safe next steps"
    question_type: QuestionType = QuestionType.OPTIONS
    options: List[str] = Field(default_factory=list)
    allows_freeform: bool = True


class SafetyCheckResult(BaseModel):
    is_emergency: bool = False
    red_flags: List[str] = Field(default_factory=list)
    emergency_headline: Optional[str] = None
    immediate_actions: List[str] = Field(default_factory=list)


class DynamicQuestionRequest(BaseModel):
    symptoms: str = Field(..., min_length=2, description="Primary concern or initial symptom text")
    history: List[ChatMessage] = Field(default_factory=list, description="Prior conversation exchanges")
    patient_context: Optional[PatientContext] = None


class DynamicQuestionResponse(BaseModel):
    status: str = Field(..., description="'continue', 'ready_for_assessment', or 'emergency_halt'")
    turn_count: int = 0
    safety: SafetyCheckResult
    next_question: Optional[AgentQuestion] = None
    agent_note: Optional[str] = None


class MedicalSource(BaseModel):
    title: str
    publisher: str
    url: str
    why: str


class TriageAssessmentRequest(BaseModel):
    symptoms: str
    history: List[ChatMessage] = Field(default_factory=list)
    patient_context: Optional[PatientContext] = None


class TriageAssessmentResponse(BaseModel):
    urgency: UrgencyLevel
    urgency_label: str
    headline: str
    summary: str
    rationale: List[str] = Field(default_factory=list)
    red_flags: List[str] = Field(default_factory=list)
    escalation_triggers: List[str] = Field(default_factory=list)
    doctor_discussion_questions: List[str] = Field(default_factory=list)
    suggested_tests_to_ask_about: List[str] = Field(default_factory=list)
    possible_clinical_categories: List[str] = Field(default_factory=list)
    next_steps: List[str] = Field(default_factory=list)
    sources: List[MedicalSource] = Field(default_factory=list)
    disclaimer: str = (
        "HealthGuard is a decision-support and triage tool, not a doctor. "
        "It cannot diagnose disease, rule out medical emergencies, or order tests. "
        "Always seek the advice of a qualified healthcare provider."
    )
