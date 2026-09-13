import sys
from backend.models.schemas import DynamicQuestionRequest, TriageAssessmentRequest, ChatMessage, PatientContext
from backend.agents.orchestrator import process_chat_turn, execute_full_triage

def test_safety_guardrail():
    print("Testing Safety Guardrail (Emergency trigger)...")
    req = DynamicQuestionRequest(
        symptoms="I have crushing chest pain and shortness of breath that started 10 minutes ago",
        history=[],
    )
    res = process_chat_turn(req)
    assert res.status == "emergency_halt", f"Expected emergency_halt, got {res.status}"
    assert res.safety.is_emergency is True
    print("[OK] Safety guardrail correctly identified emergency and halted questioning!")

def test_dynamic_questioning():
    print("Testing Dynamic Questioning (Non-emergency)...")
    req = DynamicQuestionRequest(
        symptoms="I have had a mild sore throat and runny nose since yesterday",
        history=[],
        patient_context=PatientContext(severity=3, age_group="adult")
    )
    res = process_chat_turn(req)
    assert res.status in ["continue", "ready_for_assessment"]
    if res.status == "continue":
        assert res.next_question is not None
        print(f"[OK] Dynamic question generated: '{res.next_question.question}'")
        print(f"  Options: {res.next_question.options}")
    else:
        print("[OK] Ready for assessment.")

def test_triage_assessment():
    print("Testing Clinical Triage Assessment...")
    req = TriageAssessmentRequest(
        symptoms="I have had a mild sore throat and cough for 2 days",
        history=[
            ChatMessage(role="assistant", content="When did you first notice these symptoms?"),
            ChatMessage(role="user", content="Started a few days ago, mild fever yesterday."),
        ],
        patient_context=PatientContext(severity=3, age_group="adult", duration="few-days")
    )
    res = execute_full_triage(req)
    assert res.urgency in ["emergency", "same-day", "soon", "self-care"]
    print(f"[OK] Triage assessment successfully produced urgency: {res.urgency.value.upper()}")
    print(f"  Headline: {res.headline}")
    print(f"  Doctor questions: {len(res.doctor_discussion_questions)} generated")
    print(f"  Next steps: {len(res.next_steps)} generated")

if __name__ == "__main__":
    test_safety_guardrail()
    test_dynamic_questioning()
    test_triage_assessment()
    print("\nALL BACKEND PIPELINE TESTS PASSED!")
