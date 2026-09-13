from typing import List, Tuple
from backend.models.schemas import SafetyCheckResult

# Structured red-flag trigger definitions: list of (synonyms/phrases, clinical explanation)
EMERGENCY_SIGNALS: List[Tuple[List[str], str]] = [
    (
        ["chest pain", "pressure in chest", "tightness in chest", "crushing chest", "heart attack", "pain radiating to arm", "pain radiating to jaw"],
        "Severe chest discomfort, pain, pressure, or tightness can indicate an acute cardiac event or emergency."
    ),
    (
        ["difficulty breathing", "shortness of breath", "can't breathe", "cannot breathe", "gasping for air", "turning blue", "struggling to breathe", "severe breathlessness"],
        "Acute breathing difficulty or severe shortness of breath can deteriorate rapidly and threatens oxygenation."
    ),
    (
        ["face drooping", "slurred speech", "one-sided weakness", "arm numbness", "loss of speech", "sudden confusion", "stroke"],
        "Sudden neurological deficits such as facial droop, slurred speech, or one-sided weakness are time-critical stroke indicators."
    ),
    (
        ["unconscious", "passed out", "fainted", "fainting", "blackout", "unresponsive", "collapsed"],
        "Loss of consciousness or sudden collapse requires immediate in-person medical evaluation."
    ),
    (
        ["vomiting blood", "coughing blood", "uncontrolled bleeding", "bleeding heavily", "severe hemorrhage"],
        "Heavy, active, or unexplained bleeding can lead to shock and requires immediate emergency care."
    ),
    (
        ["swollen tongue", "throat closing", "severe allergic reaction", "anaphylaxis", "lips swelling", "cannot swallow"],
        "Signs of severe allergic reaction (anaphylaxis) can rapidly obstruct airways."
    ),
    (
        ["seizure", "convulsion", "shaking uncontrollably"],
        "A seizure or sudden convulsion necessitates immediate professional medical assistance."
    ),
    (
        ["suicidal", "self harm", "want to die", "hurt myself", "kill myself", "end my life"],
        "Immediate crisis support is essential. Please contact emergency services or a crisis helpline right now."
    ),
    (
        ["stiff neck with fever", "rash that does not fade", "purple spots with fever"],
        "High fever combined with neck stiffness or non-blanching rash can indicate severe acute infection."
    ),
]


def evaluate_safety_guardrail(full_text: str) -> SafetyCheckResult:
    """
    Deterministic safety evaluation.
    Scans the aggregated conversation text for high-risk red-flag indicators.
    Returns a SafetyCheckResult indicating whether immediate emergency escalation is warranted.
    """
    normalized = full_text.lower()
    matched_flags: List[str] = []

    for phrases, explanation in EMERGENCY_SIGNALS:
        if any(phrase in normalized for phrase in phrases):
            matched_flags.append(explanation)

    if matched_flags:
        return SafetyCheckResult(
            is_emergency=True,
            red_flags=matched_flags,
            emergency_headline="Emergency care needed immediately",
            immediate_actions=[
                "Call your local emergency number (such as 911, 112, or 999) right now.",
                "Do not attempt to drive yourself if experiencing dizziness, chest discomfort, or weakness; ask someone to assist you or request an ambulance.",
                "Have any medication lists or medical history available for first responders.",
                "If someone is nearby, notify them immediately so they can stay with you."
            ],
        )

    return SafetyCheckResult(is_emergency=False, red_flags=[], emergency_headline=None, immediate_actions=[])
