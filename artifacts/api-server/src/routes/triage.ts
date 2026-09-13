import { Router, type IRouter } from "express";
import {
  AssessTriageBody,
  AssessTriageResponse,
} from "@workspace/api-zod";
import type {
  MedicalSource,
  TriageAssessment,
  TriageInput,
} from "@workspace/api-zod";

const router: IRouter = Router();

const emergencySignals: Array<[string[], string]> = [
  [["chest pain", "pressure in chest", "tightness in chest"], "Chest pain, pressure, or tightness can need immediate evaluation."],
  [["difficulty breathing", "shortness of breath", "can't breathe", "cannot breathe"], "Breathing difficulty can become serious quickly."],
  [["one-sided weakness", "face drooping", "slurred speech", "sudden confusion"], "Sudden neurologic changes can be time-sensitive."],
  [["fainted", "fainting", "unconscious", "passed out"], "Loss of consciousness needs urgent medical assessment."],
  [["uncontrolled bleeding", "bleeding heavily", "vomiting blood", "coughing blood"], "Heavy or unexplained bleeding needs immediate care."],
  [["severe allergic reaction", "swollen tongue", "swelling of throat"], "Severe allergic symptoms can threaten breathing."],
  [["seizure", "convulsion"], "A seizure or convulsion needs urgent professional assessment."],
  [["suicidal", "self harm", "hurt myself", "want to die"], "Thoughts of self-harm need immediate support and safety planning."],
  [["unable to keep fluids", "severe dehydration"], "Severe dehydration can require urgent treatment."],
];

const sameDaySignals = [
  "high fever",
  "fever",
  "severe pain",
  "worsening quickly",
  "rapidly getting worse",
  "black stool",
  "blood in stool",
  "new rash",
  "persistent vomiting",
  "pregnancy bleeding",
  "heavy bleeding",
];

function containsAny(text: string, phrases: string[]): boolean {
  return phrases.some((phrase) => text.includes(phrase));
}

function getTopicCategories(text: string): string[] {
  const categories: string[] = [];

  if (containsAny(text, ["cough", "wheeze", "breathing", "shortness of breath", "sore throat", "congestion", "chest"])) {
    categories.push("respiratory or throat symptoms");
  }
  if (containsAny(text, ["headache", "dizzy", "numb", "tingling", "weakness", "confusion", "vision"])) {
    categories.push("neurologic symptoms");
  }
  if (containsAny(text, ["stomach", "abdominal", "nausea", "vomit", "diarrhea", "constipation"])) {
    categories.push("digestive symptoms");
  }
  if (containsAny(text, ["rash", "itch", "swelling", "hives"])) {
    categories.push("skin or allergy-related symptoms");
  }
  if (containsAny(text, ["urine", "urinary", "burning when peeing", "back pain"])) {
    categories.push("urinary or kidney-area symptoms");
  }
  if (containsAny(text, ["pain", "ache", "sore", "pressure"])) {
    categories.push("pain-related symptoms");
  }

  return categories.length > 0 ? categories : ["general symptoms requiring clinical context"];
}

function getSuggestedTests(text: string, urgency: TriageAssessment["urgency"]): string[] {
  const tests = [
    "A clinician may first check vital signs, temperature, heart rate, and oxygen level.",
    "A focused physical examination is usually more useful than ordering every test.",
  ];

  if (urgency === "emergency" || urgency === "same-day") {
    tests.unshift("The receiving clinician may decide on urgent testing after examining you; do not delay care to arrange tests yourself.");
  }
  if (containsAny(text, ["cough", "wheeze", "breathing", "chest"])) {
    tests.push("Depending on the examination, a clinician may consider a chest evaluation, ECG, or imaging.");
  }
  if (containsAny(text, ["fever", "infection", "vomit", "diarrhea", "weakness"])) {
    tests.push("Depending on findings, a clinician may consider blood work or hydration assessment.");
  }
  if (containsAny(text, ["urine", "urinary", "burning when peeing"])) {
    tests.push("Urinalysis may be considered if urinary symptoms are present.");
  }
  if (containsAny(text, ["headache", "dizzy", "numb", "weakness", "confusion"])) {
    tests.push("A clinician may perform a neurologic examination and decide whether further testing is needed.");
  }

  return tests;
}

function getSources(text: string): MedicalSource[] {
  const sources: MedicalSource[] = [
    {
      title: "Health information and conditions",
      publisher: "NHS",
      url: "https://www.nhs.uk/conditions/",
      why: "A patient-friendly reference for symptoms, conditions, and when to seek care.",
    },
    {
      title: "Medical Encyclopedia",
      publisher: "MedlinePlus",
      url: "https://medlineplus.gov/encyclopedia.html",
      why: "A government health reference with plain-language medical background.",
    },
  ];

  if (containsAny(text, ["chest pain", "pressure in chest", "tightness in chest"])) {
    sources.unshift({
      title: "Chest pain",
      publisher: "NHS",
      url: "https://www.nhs.uk/conditions/chest-pain/",
      why: "Relevant reference for chest discomfort and emergency warning signs.",
    });
  }
  if (containsAny(text, ["breathing", "shortness of breath", "cough", "wheeze"])) {
    sources.unshift({
      title: "Shortness of breath",
      publisher: "NHS",
      url: "https://www.nhs.uk/conditions/shortness-of-breath/",
      why: "Relevant reference for breathing symptoms and urgent warning signs.",
    });
  }
  if (containsAny(text, ["headache", "dizzy", "numb", "weakness", "confusion"])) {
    sources.unshift({
      title: "Headache",
      publisher: "MedlinePlus",
      url: "https://medlineplus.gov/headache.html",
      why: "Relevant reference for headache symptoms and reasons to seek care.",
    });
  }
  if (containsAny(text, ["nausea", "vomit", "diarrhea", "stomach", "abdominal"])) {
    sources.unshift({
      title: "Digestive symptoms",
      publisher: "MedlinePlus",
      url: "https://medlineplus.gov/digestivesystem.html",
      why: "Relevant reference for digestive symptoms and related health information.",
    });
  }
  if (containsAny(text, ["rash", "itch", "hives", "skin"])) {
    sources.unshift({
      title: "Skin conditions",
      publisher: "NHS",
      url: "https://www.nhs.uk/conditions/skin/",
      why: "Relevant reference for common skin symptoms and care guidance.",
    });
  }

  return sources.slice(0, 4);
}

function assess(input: TriageInput): TriageAssessment {
  const text = [
    input.symptoms,
    ...input.associatedSymptoms,
    input.medicalHistory,
    input.medications,
    input.pregnancyStatus,
  ]
    .join(" ")
    .toLowerCase();

  const redFlags = emergencySignals
    .filter(([phrases]) => containsAny(text, phrases))
    .map(([, explanation]) => explanation);

  const isEmergency =
    redFlags.length > 0 ||
    input.severity >= 9 ||
    (input.ageGroup === "older-adult" && input.severity >= 8) ||
    (input.pregnancyStatus !== "not-applicable" && containsAny(text, ["severe pain", "bleeding", "fainting", "shortness of breath"]));

  const isSameDay =
    !isEmergency &&
    (input.severity >= 7 ||
      containsAny(text, sameDaySignals) ||
      (input.ageGroup === "child" && input.severity >= 6));

  const isSoon =
    !isEmergency &&
    !isSameDay &&
    (input.severity >= 4 || input.duration === "one-to-two-weeks" || input.duration === "longer");

  const urgency: TriageAssessment["urgency"] = isEmergency
    ? "emergency"
    : isSameDay
      ? "same-day"
      : isSoon
        ? "soon"
        : "self-care";

  const urgencyLabel = {
    emergency: "Emergency care now",
    "same-day": "Same-day medical evaluation",
    soon: "Arrange a clinician visit soon",
    "self-care": "Monitor with safety-net guidance",
  }[urgency];

  const nextSteps = {
    emergency: [
      "Call your local emergency number or go to the nearest emergency department now.",
      "Do not drive yourself if you feel faint, confused, severely short of breath, or unsafe.",
      "If possible, take a list of medicines and known medical conditions with you.",
    ],
    "same-day": [
      "Contact a doctor, urgent-care clinic, or hospital today for an assessment.",
      "If symptoms worsen, new red flags appear, or you cannot stay hydrated, use emergency care.",
      "Bring your medication list and note when the symptoms started.",
    ],
    soon: [
      "Arrange a primary-care or specialist appointment within the next few days.",
      "Track changes in severity, temperature, and new symptoms.",
      "Escalate to same-day or emergency care if warning signs appear.",
    ],
    "self-care": [
      "Use gentle supportive care appropriate for you and monitor how you feel.",
      "Seek clinical advice if symptoms persist, return repeatedly, or become more severe.",
      "Use emergency services immediately if any red-flag symptom develops.",
    ],
  }[urgency];

  const summary = isEmergency
    ? "Some of the information you entered includes warning signs that should not be assessed by an online tool alone."
    : isSameDay
      ? "Your answers suggest that waiting several days may not be appropriate. A clinician should assess you today."
      : isSoon
        ? "Your symptoms do not currently match the highest-risk warning signs in this screening, but a clinician should review them soon."
        : "No high-risk pattern was identified by this limited screening. Keep monitoring and use the safety-net advice below.";

  return {
    urgency,
    urgencyLabel,
    headline: urgency === "emergency"
      ? "Please seek urgent help now"
      : urgency === "same-day"
        ? "Please arrange medical care today"
        : urgency === "soon"
          ? "A clinician should review this soon"
          : "Monitor carefully and know when to escalate",
    summary,
    redFlags,
    possibleCategories: getTopicCategories(text),
    suggestedTests: getSuggestedTests(text, urgency),
    nextSteps,
    sources: getSources(text),
    disclaimer: "HealthGuard is a symptom-triage aid, not a doctor. It cannot diagnose disease, rule out emergencies, or decide which tests you personally need. A licensed clinician must make those decisions.",
  };
}

router.post("/triage", (req, res): void => {
  const parsed = AssessTriageBody.safeParse(req.body);

  if (!parsed.success) {
    req.log.warn({ errors: parsed.error.flatten() }, "Invalid triage input");
    res.status(400).json({ error: "Please complete all required symptom details." });
    return;
  }

  const result = AssessTriageResponse.parse(assess(parsed.data));
  req.log.info({ urgency: result.urgency }, "Triage assessment completed");
  res.json(result);
});

export default router;