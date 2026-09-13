export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface PatientContext {
  age_group?: 'child' | 'teen' | 'adult' | 'older-adult';
  duration?: 'today' | 'few-days' | 'one-to-two-weeks' | 'longer';
  severity?: number;
  medical_history?: string;
  medications?: string;
  pregnancy_status?: 'not-applicable' | 'pregnant' | 'possibly-pregnant' | 'postpartum';
}

export interface AgentQuestion {
  id: string;
  question: string;
  context_reason?: string;
  question_type: 'options' | 'text' | 'scale' | 'boolean';
  options: string[];
  allows_freeform: boolean;
}

export interface SafetyCheckResult {
  is_emergency: boolean;
  red_flags: string[];
  emergency_headline?: string;
  immediate_actions: string[];
}

export interface DynamicQuestionResponse {
  status: 'continue' | 'ready_for_assessment' | 'emergency_halt';
  turn_count: number;
  safety: SafetyCheckResult;
  next_question?: AgentQuestion;
  agent_note?: string;
}

export interface MedicalSource {
  title: string;
  publisher: string;
  url: string;
  why: string;
}

export interface TriageAssessmentResponse {
  urgency: 'emergency' | 'same-day' | 'soon' | 'self-care';
  urgency_label: string;
  headline: string;
  summary: string;
  rationale: string[];
  red_flags: string[];
  escalation_triggers: string[];
  doctor_discussion_questions: string[];
  suggested_tests_to_ask_about: string[];
  possible_clinical_categories: string[];
  next_steps: string[];
  sources: MedicalSource[];
  disclaimer: string;
}

const API_BASE = '/api';

async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 15000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error('Request timed out. The server or AI model is taking longer than expected. Please try again.');
    }
    throw err;
  } finally {
    clearTimeout(id);
  }
}

export async function checkHealth(): Promise<{ status: string; gemini_configured: boolean; gemini_model?: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/health`, {}, 5000);
  if (!res.ok) throw new Error('Failed to connect to HealthGuard backend');
  return res.json();
}

export async function updateGeminiKey(apiKey: string): Promise<{ status: string; message: string }> {
  const res = await fetchWithTimeout(`${API_BASE}/config/gemini-key`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ api_key: apiKey }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to update key' }));
    throw new Error(error.detail || 'Failed to update Gemini API key');
  }
  return res.json();
}

export async function fetchNextQuestion(
  symptoms: string,
  history: ChatMessage[],
  patientContext?: PatientContext
): Promise<DynamicQuestionResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/chat/question`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symptoms,
      history,
      patient_context: patientContext,
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to process questioning' }));
    throw new Error(error.detail || 'Questioning agent error');
  }
  return res.json();
}

export async function fetchTriageAssessment(
  symptoms: string,
  history: ChatMessage[],
  patientContext?: PatientContext
): Promise<TriageAssessmentResponse> {
  const res = await fetchWithTimeout(`${API_BASE}/triage/assess`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      symptoms,
      history,
      patient_context: patientContext,
    }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: 'Failed to complete triage assessment' }));
    throw new Error(error.detail || 'Triage assessment error');
  }
  return res.json();
}

