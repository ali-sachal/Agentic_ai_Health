import { useEffect, useState, type ReactNode } from 'react';
import { ErrorBoundary } from '@/components/error-boundary';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  HeartPulse,
  Info,
  LockKeyhole,
  Menu,
  PhoneCall,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  TriangleAlert,
  User,
  X,
  type LucideIcon,
} from 'lucide-react';
import NotFound from '@/pages/not-found';
import {
  Route,
  Switch,
  Link,
  useLocation,
  Router as WouterRouter,
} from 'wouter';
import {
  fetchNextQuestion,
  fetchTriageAssessment,
  type ChatMessage,
  type PatientContext,
  type AgentQuestion,
  type SafetyCheckResult,
  type TriageAssessmentResponse,
} from '@/lib/api';

const urgencyStyles: Record<
  TriageAssessmentResponse['urgency'],
  { tone: string; icon: LucideIcon; label: string; badgeClass: string; cardClass: string }
> = {
  emergency: {
    tone: 'urgent',
    icon: TriangleAlert,
    label: 'Emergency care now',
    badgeClass: 'bg-red-500/15 text-red-700 border-red-500/30 dark:text-red-400',
    cardClass: 'border-red-500/40 bg-red-500/5 dark:bg-red-950/20',
  },
  'same-day': {
    tone: 'same-day',
    icon: Clock3,
    label: 'Seek care today',
    badgeClass: 'bg-amber-500/15 text-amber-800 border-amber-500/30 dark:text-amber-300',
    cardClass: 'border-amber-500/40 bg-amber-500/5 dark:bg-amber-950/20',
  },
  soon: {
    tone: 'soon',
    icon: Clock3,
    label: 'Arrange care soon',
    badgeClass: 'bg-teal-500/15 text-teal-800 border-teal-500/30 dark:text-teal-300',
    cardClass: 'border-teal-500/30 bg-teal-500/5 dark:bg-teal-950/20',
  },
  'self-care': {
    tone: 'self-care',
    icon: CheckCircle2,
    label: 'Self-care and monitor',
    badgeClass: 'bg-emerald-500/15 text-emerald-800 border-emerald-500/30 dark:text-emerald-300',
    cardClass: 'border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-950/20',
  },
};

// ── App Shell & Navigation ──────────────────────────────────────────────────
function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-[100dvh] flex flex-col justify-between">
      <header className="relative z-20 border-b border-[hsl(var(--border)/.7)] bg-[hsl(var(--background)/.85)] backdrop-blur-md sticky top-0">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3.5 sm:px-8 lg:px-12">
          <Link href="/" className="focus-ring group flex items-center gap-3 rounded-lg">
            <span className="grid size-10 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] shadow-sm transition-transform group-hover:rotate-[-6deg]">
              <HeartPulse size={22} strokeWidth={2.2} />
            </span>
            <span>
              <span className="flex items-center gap-2">
                <span className="block text-[1.05rem] font-extrabold tracking-[-.04em]">HealthGuard</span>
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[0.62rem] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
                  Agentic AI
                </span>
              </span>
              <span className="hidden text-[.64rem] font-semibold uppercase tracking-[.14em] text-[hsl(var(--muted-foreground))] sm:block">
                Clinical Risk & Triage
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-6 md:flex">
            <a href="/#how-it-works" className="text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
              How It Works
            </a>
            <a href="/#agents" className="text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
              Multi-Agent Pipeline
            </a>
            <a href="/#safety" className="text-sm font-semibold text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]">
              Safety Guardrails
            </a>

            <Link
              href="/assessment"
              className="focus-ring inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-2.5 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-sm transition-transform hover:-translate-y-0.5"
            >
              Start Triage <ArrowRight size={15} />
            </Link>
          </nav>

          <button
            className="focus-ring rounded-lg p-2 md:hidden"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open navigation"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <nav className="border-t border-[hsl(var(--border)/.7)] px-5 py-4 md:hidden bg-[hsl(var(--background))]">
            <div className="flex flex-col gap-2">
              <a href="/#how-it-works" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold">
                How It Works
              </a>
              <a href="/#agents" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold">
                Multi-Agent Pipeline
              </a>
              <a href="/#safety" onClick={() => setMenuOpen(false)} className="rounded-lg px-3 py-2 text-sm font-semibold">
                Safety Guardrails
              </a>
              <Link
                href="/assessment"
                onClick={() => setMenuOpen(false)}
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-[hsl(var(--primary))] px-5 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
              >
                Start Triage <ArrowRight size={15} />
              </Link>
            </div>
          </nav>
        )}
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-[hsl(var(--border)/.7)] bg-[hsl(var(--card)/.4)] mt-16">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-8 text-xs text-[hsl(var(--muted-foreground))] sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <p>
            <span className="font-bold text-[hsl(var(--foreground))]">HealthGuard</span> is an agentic triage and decision-support tool, not a diagnostic service.
          </p>
          <div className="flex items-center gap-4">
            <span className="font-data text-[.68rem] uppercase tracking-wider text-[hsl(var(--primary))] font-bold">
              Powered by Google Gemini API & Fast-Path Safety Engine
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Landing Page (Home) ─────────────────────────────────────────────────────
function Home() {
  return (
    <AppShell>
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="pointer-events-none absolute -right-24 -top-24 size-[28rem] rounded-full border-[34px] border-[hsl(var(--accent)/.3)] sm:size-[38rem]" />
        <div className="pointer-events-none absolute bottom-[-4rem] left-[-6rem] size-56 rounded-full bg-[hsl(var(--secondary)/.8)] blur-3xl" />

        <div className="mx-auto grid max-w-7xl gap-12 px-5 sm:px-8 lg:grid-cols-[1.12fr_.88fr] lg:items-center lg:gap-16 lg:px-12">
          <div className="relative z-10 animate-in">
            <div className="eyebrow mb-5 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3.5 py-1 text-[hsl(var(--primary))]">
              <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
              Agentic Clinical Risk & Triage
            </div>
            <h1 className="font-display text-[clamp(2.8rem,5.5vw,5.2rem)] leading-[1.02] tracking-[-.04em] text-[hsl(var(--foreground))]">
              A clearer, safer next step,{' '}
              <em className="text-[hsl(var(--primary))] font-serif">when symptoms leave you unsure.</em>
            </h1>
            <p className="mt-6 max-w-xl text-[1.05rem] leading-8 text-[hsl(var(--muted-foreground))]">
              HealthGuard replaces confusing internet search rabbit-holes with a structured, agentic triage workflow.
              It dynamically asks what matters, verifies high-risk safety boundaries, and guides you to the right care pathway without claiming a definitive disease diagnosis.
            </p>

            <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <Link
                href="/assessment"
                className="focus-ring group inline-flex items-center gap-3 rounded-full bg-[hsl(var(--primary))] px-7 py-4 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow-lg transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                Begin Agentic Triage <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
              </Link>
              <span className="flex items-center gap-2 text-xs font-semibold text-[hsl(var(--muted-foreground))]">
                <Clock3 size={15} /> 2–3 minutes guided interview
              </span>
            </div>
          </div>

          {/* Safety Card Preview */}
          <div className="relative z-10 animate-in">
            <div className="surface relative overflow-hidden rounded-[2rem] border border-[hsl(var(--border)/.8)] p-6 sm:p-8 shadow-xl">
              <div className="absolute right-0 top-0 h-2 w-2/5 bg-[hsl(var(--accent))]" />
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <p className="eyebrow text-[hsl(var(--primary))]">Safety-First Principle</p>
                  <h2 className="mt-1.5 text-2xl font-extrabold tracking-tight">How HealthGuard Protects You</h2>
                </div>
                <span className="grid size-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                  <ShieldCheck size={26} />
                </span>
              </div>

              <div className="space-y-4">
                <div className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-red-500/15 text-red-600">
                    <ShieldAlert size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold">Instant Red-Flag Halt</h3>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                      Emergency signals (chest pain, stroke symptoms, acute breathing distress) immediately halt questioning and recommend emergency care.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                    <Bot size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold">Context-Adaptive Follow-ups</h3>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                      The Conversational Agent asks 1–2 tailored questions based on your specific answers rather than rigid, irrelevant forms.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3.5">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                    <Stethoscope size={18} />
                  </span>
                  <div>
                    <h3 className="text-sm font-extrabold">Clinician Talking Points</h3>
                    <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                      Leave with a prioritized urgency level, red-flag triggers, and questions prepared to ask your healthcare provider.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-6 border-t border-[hsl(var(--border)/.75)] pt-4 text-xs font-semibold text-[hsl(var(--muted-foreground))] flex items-center gap-2">
                <LockKeyhole size={14} className="text-[hsl(var(--primary))]" />
                <span>Stateless & private. Your medical details are not permanently stored.</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 4-Agent Pipeline Section */}
      <section id="agents" className="border-y border-[hsl(var(--border)/.75)] bg-[hsl(var(--card)/.6)] py-16 sm:py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="eyebrow text-[hsl(var(--primary))]">Agentic Architecture</p>
            <h2 className="font-display mt-3 text-3xl sm:text-4xl tracking-tight">
              Four specialized agents working in coordinated harmony.
            </h2>
            <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))] leading-6">
              Unlike monolithic chatbots that hallucinate medical conclusions, HealthGuard coordinates specialized agents with deterministic safety guardrails.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 relative">
              <span className="font-data text-xs font-bold text-red-500">01 / FAST-PATH</span>
              <h3 className="mt-3 text-base font-extrabold flex items-center gap-2">
                <ShieldAlert size={18} className="text-red-500" />
                Safety Agent
              </h3>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                Deterministic clinical guardrail. Evaluates every input for life-threatening keywords and halts conversation immediately if acute emergencies appear.
              </p>
            </div>

            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 relative">
              <span className="font-data text-xs font-bold text-[hsl(var(--primary))]">02 / INTERACTION</span>
              <h3 className="mt-3 text-base font-extrabold flex items-center gap-2">
                <Bot size={18} className="text-[hsl(var(--primary))]" />
                Questioning Agent
              </h3>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                Powered by Gemini Flash. Analyzes dialogue history to formulate 1 targeted clinical follow-up at a time with smart quick-reply suggestions.
              </p>
            </div>

            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 relative">
              <span className="font-data text-xs font-bold text-amber-500">03 / EVALUATION</span>
              <h3 className="mt-3 text-base font-extrabold flex items-center gap-2">
                <Stethoscope size={18} className="text-amber-500" />
                Risk Assessment Agent
              </h3>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                Stratifies urgency into Emergency, Same-Day, Soon, or Self-Care using clinical risk patterns rather than making single diagnostic claims.
              </p>
            </div>

            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 relative">
              <span className="font-data text-xs font-bold text-emerald-500">04 / EMPOWERMENT</span>
              <h3 className="mt-3 text-base font-extrabold flex items-center gap-2">
                <FileText size={18} className="text-emerald-500" />
                Clinician Brief Agent
              </h3>
              <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-5">
                Produces transparent reasoning, red-flag escalation conditions, and curated questions for the patient to ask their doctor during their appointment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Steps */}
      <section id="how-it-works" className="py-16 sm:py-24 max-w-7xl mx-auto px-5 sm:px-8 lg:px-12">
        <div className="text-center max-w-xl mx-auto">
          <p className="eyebrow text-[hsl(var(--primary))]">The Triage Journey</p>
          <h2 className="font-display mt-3 text-3xl sm:text-4xl tracking-tight">How your session unfolds</h2>
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          <div className="surface rounded-2xl border border-[hsl(var(--border))] p-7 relative">
            <span className="font-data text-2xl font-bold text-[hsl(var(--primary))]">1</span>
            <h3 className="mt-4 text-lg font-extrabold">Describe What's Happening</h3>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-6">
              Enter your main symptoms in plain words along with severity and basic context. No medical terminology needed.
            </p>
          </div>

          <div className="surface rounded-2xl border border-[hsl(var(--border))] p-7 relative">
            <span className="font-data text-2xl font-bold text-[hsl(var(--primary))]">2</span>
            <h3 className="mt-4 text-lg font-extrabold">Adaptive Follow-Up Questions</h3>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-6">
              Our agent asks 1–2 clarifying questions to understand timeline, radiation, and associated flags, adapting with every response.
            </p>
          </div>

          <div className="surface rounded-2xl border border-[hsl(var(--border))] p-7 relative">
            <span className="font-data text-2xl font-bold text-[hsl(var(--primary))]">3</span>
            <h3 className="mt-4 text-lg font-extrabold">Clear Care Pathway</h3>
            <p className="mt-2 text-xs text-[hsl(var(--muted-foreground))] leading-6">
              Receive your personalized urgency level, reason breakdown, doctor discussion guide, and printable summary report.
            </p>
          </div>
        </div>
      </section>

      {/* Safety Notice Section */}
      <section id="safety" className="bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))] py-14">
        <div className="max-w-7xl mx-auto px-5 sm:px-8 lg:px-12 grid gap-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <div>
            <p className="eyebrow text-amber-400">Emergency Caution</p>
            <h2 className="font-display mt-2 text-3xl sm:text-4xl tracking-tight">When to skip HealthGuard</h2>
            <p className="mt-3 text-xs text-[hsl(var(--sidebar-foreground)/.75)] leading-6">
              Do not use this app if you or someone you are assisting has acute warning signs. Call emergency services immediately.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 text-xs text-[hsl(var(--sidebar-foreground)/.8)] leading-6">
            <div className="rounded-xl border border-[hsl(var(--sidebar-border))] p-4">
              <TriangleAlert className="text-amber-400 mb-2" size={20} />
              Crushing chest pain, severe shortness of breath, sudden facial drooping or arm weakness, or heavy uncontrolled bleeding.
            </div>
            <div className="rounded-xl border border-[hsl(var(--sidebar-border))] p-4">
              <PhoneCall className="text-amber-400 mb-2" size={20} />
              Call emergency numbers (911 in US/Canada, 112 in EU, 999 in UK) or go to the nearest emergency department right away.
            </div>
          </div>
        </div>
      </section>
    </AppShell>
  );
}

// ── Interactive Guided Assessment ───────────────────────────────────────────
function Assessment() {
  const [, setLocation] = useLocation();

  // Phase: 'baseline' | 'conversation' | 'analyzing'
  const [phase, setPhase] = useState<'baseline' | 'conversation' | 'analyzing'>('baseline');

  // Baseline state
  const [symptoms, setSymptoms] = useState('');
  const [severity, setSeverity] = useState(5);
  const [duration, setDuration] = useState<PatientContext['duration']>('today');
  const [ageGroup, setAgeGroup] = useState<PatientContext['age_group']>('adult');
  const [pregnancy, setPregnancy] = useState<PatientContext['pregnancy_status']>('not-applicable');
  const [medHistory, setMedHistory] = useState('');
  const [medications, setMedications] = useState('');

  // Conversational state
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<AgentQuestion | null>(null);
  const [freeformAnswer, setFreeformAnswer] = useState('');
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [agentStatusNote, setAgentStatusNote] = useState<string | null>(null);
  const [safetyHalt, setSafetyHalt] = useState<SafetyCheckResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const patientContext: PatientContext = {
    age_group: ageGroup,
    duration,
    severity,
    medical_history: medHistory,
    medications,
    pregnancy_status: pregnancy,
  };

  // Start the dynamic agent session from baseline
  const startAgentInterview = async () => {
    if (symptoms.trim().length < 3) {
      setErrorMessage('Please describe your main concern or symptoms before proceeding.');
      return;
    }
    setErrorMessage(null);
    setIsAgentLoading(true);
    setPhase('conversation');

    try {
      const response = await fetchNextQuestion(symptoms, [], patientContext);

      if (response.status === 'emergency_halt') {
        setSafetyHalt(response.safety);
        setIsAgentLoading(false);
        return;
      }

      if (response.status === 'ready_for_assessment') {
        // Proceed straight to final triage
        runFinalTriage([]);
        return;
      }

      if (response.next_question) {
        setCurrentQuestion(response.next_question);
        setAgentStatusNote(response.agent_note || null);
        setHistory([
          { role: 'assistant', content: response.next_question.question },
        ]);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to connect to triage agent.');
      setPhase('baseline');
    } finally {
      setIsAgentLoading(false);
    }
  };

  // User submits an answer to the current agent question
  const submitAnswer = async (answerText: string) => {
    const text = answerText.trim();
    if (!text) return;

    const newHistory: ChatMessage[] = [
      ...history,
      { role: 'user', content: text },
    ];
    setHistory(newHistory);
    setFreeformAnswer('');
    setIsAgentLoading(true);
    setErrorMessage(null);

    try {
      const response = await fetchNextQuestion(symptoms, newHistory, patientContext);

      if (response.status === 'emergency_halt') {
        setSafetyHalt(response.safety);
        setIsAgentLoading(false);
        return;
      }

      if (response.status === 'ready_for_assessment' || !response.next_question) {
        // All necessary context gathered!
        runFinalTriage(newHistory);
        return;
      }

      // Next follow-up question
      setCurrentQuestion(response.next_question);
      setAgentStatusNote(response.agent_note || null);
      setHistory([
        ...newHistory,
        { role: 'assistant', content: response.next_question.question },
      ]);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error processing response.');
    } finally {
      setIsAgentLoading(false);
    }
  };

  // Final risk assessment orchestration
  const runFinalTriage = async (finalHistory: ChatMessage[]) => {
    setPhase('analyzing');
    setIsAgentLoading(true);
    try {
      const assessment = await fetchTriageAssessment(symptoms, finalHistory, patientContext);
      sessionStorage.setItem('healthguard-assessment', JSON.stringify(assessment));
      sessionStorage.setItem('healthguard-patient-context', JSON.stringify(patientContext));
      sessionStorage.setItem('healthguard-symptoms', symptoms);
      setLocation('/result');
    } catch (err: any) {
      setErrorMessage(err.message || 'Error generating final assessment.');
      setPhase('conversation');
    } finally {
      setIsAgentLoading(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-5 py-10 sm:px-8 sm:py-16 lg:px-12">
        {/* Emergency Stop Modal / Banner */}
        {safetyHalt && (
          <div className="mb-8 rounded-2xl border-2 border-red-500 bg-red-50 dark:bg-red-950/40 p-6 shadow-xl animate-in">
            <div className="flex items-start gap-4">
              <span className="grid size-12 place-items-center rounded-2xl bg-red-600 text-white shrink-0">
                <ShieldAlert size={28} />
              </span>
              <div>
                <h2 className="text-xl font-extrabold text-red-700 dark:text-red-400">
                  {safetyHalt.emergency_headline || 'Emergency Care Recommended Now'}
                </h2>
                <p className="mt-2 text-sm text-red-900/80 dark:text-red-200 leading-6">
                  HealthGuard's safety guardrail identified high-risk symptoms that should not be evaluated through an online assistant.
                </p>

                <div className="mt-4 rounded-xl bg-white/70 dark:bg-black/30 p-4 border border-red-200 dark:border-red-900">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-red-800 dark:text-red-300">
                    Immediate Recommended Steps:
                  </h4>
                  <ul className="mt-2 space-y-1.5 text-xs text-red-900 dark:text-red-100 font-medium">
                    {safetyHalt.immediate_actions.map((act, i) => (
                      <li key={i} className="flex gap-2">
                        <span className="text-red-600 font-bold">•</span>
                        <span>{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex flex-wrap gap-3">
                  <a
                    href="tel:911"
                    className="inline-flex items-center gap-2 rounded-full bg-red-600 px-5 py-2.5 text-xs font-bold text-white shadow hover:bg-red-700"
                  >
                    <PhoneCall size={14} /> Call Emergency Services (911 / 112)
                  </a>
                  <button
                    onClick={() => {
                      setSafetyHalt(null);
                      setPhase('baseline');
                    }}
                    className="rounded-full border border-red-300 px-4 py-2.5 text-xs font-bold text-red-800 dark:text-red-300 hover:bg-red-100"
                  >
                    Restart Assessment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Phase 1: Baseline Context Intake */}
        {phase === 'baseline' && (
          <section className="animate-in">
            <div className="mb-8">
              <div className="eyebrow text-[hsl(var(--primary))] flex items-center gap-1.5">
                <Bot size={14} /> Step 1 · Initial Symptoms & Baseline
              </div>
              <h1 className="font-display mt-2 text-3xl sm:text-4xl tracking-tight">
                Tell us what you're experiencing.
              </h1>
              <p className="mt-2 text-xs sm:text-sm text-[hsl(var(--muted-foreground))] leading-6">
                Describe your symptoms in your own words. The agentic system will analyze this and determine if follow-up details are needed.
              </p>
            </div>

            {errorMessage && (
              <div className="mb-6 flex items-center gap-2 rounded-xl bg-red-500/10 border border-red-500/20 p-3.5 text-xs font-semibold text-red-600">
                <AlertCircle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 sm:p-8 space-y-6">
              <div>
                <label className="block text-sm font-extrabold mb-1">
                  What is your main concern or symptom? <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mb-2">
                  Mention where it is, what it feels like, and how quickly it appeared.
                </p>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  maxLength={2000}
                  rows={4}
                  placeholder="For example: I have had a persistent dull stomach ache since yesterday morning, with mild nausea..."
                  className="focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background)/.6)] p-3.5 text-sm leading-6 outline-none transition-colors focus:border-[hsl(var(--primary))]"
                />
                <div className="mt-1 text-right text-[0.68rem] text-[hsl(var(--muted-foreground))] font-data">
                  {symptoms.length}/2000
                </div>
              </div>

              {/* Severity Slider */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-extrabold">Current Severity / Discomfort Level</label>
                  <span className="font-data text-xs font-bold text-[hsl(var(--primary))] bg-[hsl(var(--secondary))] px-2.5 py-0.5 rounded-md">
                    {severity} / 10
                  </span>
                </div>
                <div className="rounded-xl bg-[hsl(var(--secondary)/.5)] p-3.5">
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={severity}
                    onChange={(e) => setSeverity(Number(e.target.value))}
                    className="w-full accent-[hsl(var(--primary))]"
                  />
                  <div className="mt-1.5 flex justify-between text-[0.68rem] text-[hsl(var(--muted-foreground))] font-semibold">
                    <span>1 · Mild discomfort</span>
                    <span>5 · Moderate</span>
                    <span>10 · Severe pain</span>
                  </div>
                </div>
              </div>

              {/* Duration Pills */}
              <div>
                <label className="block text-sm font-extrabold mb-2">When did it begin?</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['today', 'Today'],
                    ['few-days', 'A few days ago'],
                    ['one-to-two-weeks', '1–2 weeks ago'],
                    ['longer', 'Longer'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDuration(val as PatientContext['duration'])}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all text-center ${
                        duration === val
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] shadow-sm'
                          : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Age Group */}
              <div>
                <label className="block text-sm font-extrabold mb-2">Who is this assessment for?</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['child', 'Child (<12)'],
                    ['teen', 'Teen (12–17)'],
                    ['adult', 'Adult (18–64)'],
                    ['older-adult', 'Older Adult (65+)'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAgeGroup(val as PatientContext['age_group'])}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all text-center ${
                        ageGroup === val
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] shadow-sm'
                          : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pregnancy Consideration */}
              <div>
                <label className="block text-sm font-extrabold mb-1">Pregnancy Context (if applicable)</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ['not-applicable', 'Not applicable'],
                    ['pregnant', 'Currently pregnant'],
                    ['possibly-pregnant', 'Possibly pregnant'],
                    ['postpartum', 'Recently postpartum'],
                  ].map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setPregnancy(val as PatientContext['pregnancy_status'])}
                      className={`rounded-xl border py-2.5 px-3 text-xs font-bold transition-all text-center ${
                        pregnancy === val
                          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] shadow-sm'
                          : 'border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:border-[hsl(var(--primary)/.5)]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-[hsl(var(--border)/.75)] pt-5 flex justify-end">
                <button
                  type="button"
                  onClick={startAgentInterview}
                  disabled={isAgentLoading}
                  className="inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))] shadow transition-all hover:-translate-y-0.5 disabled:opacity-70"
                >
                  {isAgentLoading ? (
                    <>
                      <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      Connecting with Questioning Agent...
                    </>
                  ) : (
                    <>
                      Continue to Dynamic Interview <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Phase 2: Conversational Dynamic Questioning Stream */}
        {phase === 'conversation' && (
          <section className="animate-in space-y-6">
            {/* Top Agent Status Banner */}
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold">Active Agent:</span>
                <span className="text-[hsl(var(--muted-foreground))]">
                  {isAgentLoading ? 'Evaluating Context & Safety...' : 'Questioning Agent (Gemini Flash)'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 font-data text-[0.68rem] text-emerald-700 dark:text-emerald-300 font-bold">
                  Safety Guardrail: Active
                </span>
                <button
                  onClick={() => runFinalTriage(history)}
                  className="rounded-full border border-[hsl(var(--border))] px-3 py-1 font-bold text-[0.7rem] hover:bg-[hsl(var(--secondary)/.6)] transition-colors"
                >
                  Skip to Risk Report
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center justify-between gap-3 rounded-xl bg-red-500/10 border border-red-500/20 p-4 text-xs font-semibold text-red-600">
                <div className="flex items-center gap-2">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setErrorMessage(null);
                      if (currentQuestion) {
                        // retry current state
                      } else {
                        startAgentInterview();
                      }
                    }}
                    className="rounded-lg bg-red-600 px-3 py-1 text-white hover:bg-red-700 transition-colors"
                  >
                    Retry
                  </button>
                  <button
                    onClick={() => runFinalTriage(history)}
                    className="rounded-lg border border-red-300 px-3 py-1 text-red-700 hover:bg-red-100 dark:hover:bg-red-950/30 transition-colors"
                  >
                    Proceed to Report
                  </button>
                </div>
              </div>
            )}

            {/* Conversation Stream */}
            <div className="space-y-4">
              {/* Initial Chief Complaint Card */}
              <div className="flex gap-3 items-start">
                <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] mt-1">
                  <User size={16} />
                </span>
                <div className="surface rounded-2xl border border-[hsl(var(--border))] p-4 max-w-xl text-sm leading-6">
                  <p className="font-semibold text-xs text-[hsl(var(--muted-foreground))] mb-1">Your initial report:</p>
                  <p>“{symptoms}”</p>
                </div>
              </div>

              {/* Dialogue History */}
              {history.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 items-start ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] mt-1">
                      <Bot size={16} />
                    </span>
                  )}
                  <div
                    className={`rounded-2xl p-4 max-w-xl text-sm leading-6 ${
                      msg.role === 'user'
                        ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] font-medium'
                        : 'surface border border-[hsl(var(--border))]'
                    }`}
                  >
                    <p>{msg.content}</p>
                  </div>
                  {msg.role === 'user' && (
                    <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] mt-1">
                      <User size={16} />
                    </span>
                  )}
                </div>
              ))}

              {isAgentLoading && (
                <div className="flex gap-3 items-center text-xs text-[hsl(var(--muted-foreground))] p-2">
                  <span className="size-4 animate-spin rounded-full border-2 border-[hsl(var(--primary))] border-t-transparent" />
                  <span>Agent is analyzing safety parameters and preparing next step...</span>
                </div>
              )}
            </div>

            {/* Current Active Question Input Box */}
            {currentQuestion && !isAgentLoading && (
              <div className="surface rounded-2xl border-2 border-[hsl(var(--primary)/.4)] p-5 sm:p-6 shadow-lg animate-in">
                {currentQuestion.context_reason && (
                  <div className="mb-3 flex items-center gap-1.5 text-xs text-[hsl(var(--primary))] font-semibold">
                    <Sparkles size={14} />
                    <span>{currentQuestion.context_reason}</span>
                  </div>
                )}

                <h3 className="text-base font-extrabold mb-4">{currentQuestion.question}</h3>

                {/* Quick-reply Option Chips */}
                {currentQuestion.options && currentQuestion.options.length > 0 && (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {currentQuestion.options.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => submitAnswer(opt)}
                        className="lift rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.5)] px-3.5 py-2 text-xs font-bold hover:border-[hsl(var(--primary))] hover:bg-[hsl(var(--secondary))] transition-all text-left"
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}

                {/* Freeform Answer Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={freeformAnswer}
                    onChange={(e) => setFreeformAnswer(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') submitAnswer(freeformAnswer);
                    }}
                    placeholder="Or type a custom reply in your own words..."
                    className="focus-ring flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-2.5 text-xs sm:text-sm outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => submitAnswer(freeformAnswer)}
                    disabled={!freeformAnswer.trim()}
                    className="rounded-xl bg-[hsl(var(--primary))] px-4 py-2.5 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:opacity-90 disabled:opacity-50 transition-opacity"
                  >
                    <Send size={15} />
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {/* Phase 3: Final Analysis Animation State */}
        {phase === 'analyzing' && (
          <div className="text-center py-20 animate-in">
            <div className="mx-auto size-16 place-items-center rounded-3xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] grid mb-6">
              <Sparkles size={30} className="animate-spin" />
            </div>
            <h2 className="font-display text-3xl tracking-tight">Clinical Risk Assessment in Progress</h2>
            <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))] max-w-md mx-auto">
              Our Risk Assessment and Clinician Communication Agents are synthesizing your symptoms, timeline, and risk factors into a comprehensive triage guide...
            </p>

            <div className="mt-8 max-w-sm mx-auto space-y-2.5 text-left text-xs text-[hsl(var(--muted-foreground))] font-semibold">
              <div className="flex items-center gap-2 text-emerald-600">
                <Check size={16} /> 1. Deterministic Safety Checks Passed
              </div>
              <div className="flex items-center gap-2 text-emerald-600">
                <Check size={16} /> 2. Symptom Context Structured
              </div>
              <div className="flex items-center gap-2 text-[hsl(var(--primary))] animate-pulse">
                <Bot size={16} /> 3. Stratifying Urgency & Doctor Discussion Guide...
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ── Triage Results Screen ───────────────────────────────────────────────────
function Result() {
  const [, setLocation] = useLocation();

  const [assessment] = useState<TriageAssessmentResponse | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('healthguard-assessment') || 'null');
    } catch {
      return null;
    }
  });

  const [symptoms] = useState<string>(() => sessionStorage.getItem('healthguard-symptoms') || '');
  const [patientContext] = useState<PatientContext | null>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('healthguard-patient-context') || 'null');
    } catch {
      return null;
    }
  });

  if (!assessment) {
    return (
      <AppShell>
        <div className="mx-auto max-w-xl px-5 py-24 text-center">
          <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))] mb-4">
            <FileText size={28} />
          </span>
          <h1 className="font-display text-3xl">No active assessment</h1>
          <p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">
            Complete the guided assessment to review your clinical risk recommendations.
          </p>
          <Link
            href="/assessment"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-[hsl(var(--primary))] px-6 py-3 text-sm font-bold text-[hsl(var(--primary-foreground))]"
          >
            Start Assessment <ArrowRight size={16} />
          </Link>
        </div>
      </AppShell>
    );
  }

  const style = urgencyStyles[assessment.urgency] || urgencyStyles.soon;
  const UrgencyIcon = style.icon;

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16 lg:px-12">
        {/* Top Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="eyebrow text-[hsl(var(--primary))] flex items-center gap-1.5">
              <CheckCircle2 size={14} /> HealthGuard Clinical Triage Report
            </div>
            <h1 className="font-display mt-2 text-3xl sm:text-4xl tracking-tight">
              Recommended Care Pathway
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-4 py-2 text-xs font-bold hover:bg-[hsl(var(--secondary)/.6)] transition-colors"
            >
              <FileText size={14} /> Print / Save Report
            </button>
            <button
              onClick={() => {
                sessionStorage.removeItem('healthguard-assessment');
                setLocation('/assessment');
              }}
              className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--secondary))] px-4 py-2 text-xs font-bold text-[hsl(var(--foreground))] hover:opacity-90 transition-opacity"
            >
              <RefreshCw size={14} /> Start Over
            </button>
          </div>
        </div>

        {/* Primary Urgency Card */}
        <section className={`relative overflow-hidden rounded-3xl border-2 p-6 sm:p-9 shadow-xl mb-8 ${style.cardClass}`}>
          <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-3">
              <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-extrabold ${style.badgeClass}`}>
                <UrgencyIcon size={16} />
                <span>{assessment.urgency_label}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{assessment.headline}</h2>
              <p className="text-sm leading-7 text-[hsl(var(--foreground)/.85)] max-w-2xl">{assessment.summary}</p>
            </div>

            <span className="hidden size-16 shrink-0 place-items-center rounded-2xl bg-white/80 dark:bg-black/40 sm:grid shadow-sm">
              <UrgencyIcon size={32} className="text-[hsl(var(--primary))]" />
            </span>
          </div>

          {/* Rationale breakdown */}
          {assessment.rationale && assessment.rationale.length > 0 && (
            <div className="mt-6 border-t border-[hsl(var(--border)/.6)] pt-5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-2.5">
                Why this level was recommended:
              </h4>
              <ul className="space-y-1.5 text-xs sm:text-sm text-[hsl(var(--foreground)/.8)]">
                {assessment.rationale.map((reason, i) => (
                  <li key={i} className="flex gap-2.5 items-start">
                    <span className="size-1.5 rounded-full bg-[hsl(var(--primary))] mt-2 shrink-0" />
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {/* Two-Column Grid: Actionable Guides */}
        <div className="grid gap-8 lg:grid-cols-[1.1fr_.9fr]">
          <div className="space-y-6">
            {/* Next Steps */}
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 sm:p-7">
              <div className="flex items-center gap-2.5 mb-4">
                <span className="grid size-9 place-items-center rounded-xl bg-[hsl(var(--secondary))] text-[hsl(var(--primary))]">
                  <ArrowRight size={18} />
                </span>
                <h3 className="text-lg font-extrabold">Next Action Steps</h3>
              </div>
              <ul className="space-y-3">
                {assessment.next_steps.map((step, idx) => (
                  <li key={idx} className="flex gap-3 text-sm leading-6">
                    <span className="size-2 rounded-full bg-[hsl(var(--primary))] mt-2 shrink-0" />
                    <span>{step}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Red-Flag Escalation Conditions */}
            {assessment.escalation_triggers && assessment.escalation_triggers.length > 0 && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6 sm:p-7">
                <div className="flex items-center gap-2.5 mb-3">
                  <span className="grid size-9 place-items-center rounded-xl bg-red-500/15 text-red-600">
                    <TriangleAlert size={18} />
                  </span>
                  <h3 className="text-lg font-extrabold text-red-700 dark:text-red-400">
                    Seek Immediate Help Sooner If:
                  </h3>
                </div>
                <ul className="space-y-2.5">
                  {assessment.escalation_triggers.map((trigger, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs sm:text-sm text-red-950 dark:text-red-200 leading-6">
                      <span className="size-1.5 rounded-full bg-red-500 mt-2 shrink-0" />
                      <span>{trigger}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Doctor Discussion Guide */}
            {assessment.doctor_discussion_questions && assessment.doctor_discussion_questions.length > 0 && (
              <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6 sm:p-7">
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="grid size-9 place-items-center rounded-xl bg-amber-500/15 text-amber-600">
                    <Stethoscope size={18} />
                  </span>
                  <div>
                    <h3 className="text-lg font-extrabold">Questions to Ask Your Doctor</h3>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">Bring these prompts to your consultation</p>
                  </div>
                </div>
                <ul className="space-y-2.5">
                  {assessment.doctor_discussion_questions.map((q, idx) => (
                    <li key={idx} className="flex gap-2.5 text-xs sm:text-sm leading-6 font-medium">
                      <span className="text-[hsl(var(--primary))] font-bold font-data">Q{idx + 1}.</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="space-y-6">
            {/* Patient Context Summary */}
            <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6">
              <p className="eyebrow text-[hsl(var(--muted-foreground))]">Patient Intake Summary</p>
              <h3 className="mt-2 text-base font-extrabold">What you reported:</h3>
              <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted-foreground))] italic">
                “{symptoms}”
              </p>

              {patientContext && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[hsl(var(--border)/.6)] pt-4 text-xs">
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Severity</span>
                    <p className="font-bold">{patientContext.severity} / 10</p>
                  </div>
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Onset</span>
                    <p className="font-bold capitalize">{patientContext.duration?.replaceAll('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Age Group</span>
                    <p className="font-bold capitalize">{patientContext.age_group?.replaceAll('-', ' ')}</p>
                  </div>
                  <div>
                    <span className="text-[0.65rem] font-bold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">Pregnancy Context</span>
                    <p className="font-bold capitalize">{patientContext.pregnancy_status?.replaceAll('-', ' ')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Possible Clinical Categories */}
            {assessment.possible_clinical_categories && assessment.possible_clinical_categories.length > 0 && (
              <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6">
                <p className="eyebrow text-[hsl(var(--muted-foreground))]">Clinical Focus Areas</p>
                <h3 className="mt-1.5 text-base font-extrabold">Broad Symptom Categories</h3>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1 mb-3">
                  These represent general organ systems, not confirmed diagnoses.
                </p>
                <div className="flex flex-wrap gap-2">
                  {assessment.possible_clinical_categories.map((cat) => (
                    <span key={cat} className="rounded-full bg-[hsl(var(--secondary))] px-3 py-1 text-xs font-bold text-[hsl(var(--primary))]">
                      {cat}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Tests & Physical Checks to Ask About */}
            {assessment.suggested_tests_to_ask_about && assessment.suggested_tests_to_ask_about.length > 0 && (
              <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6">
                <p className="eyebrow text-[hsl(var(--muted-foreground))]">Doctor Consultation Guide</p>
                <h3 className="mt-1.5 text-base font-extrabold">Checks You May Ask About</h3>
                <ul className="mt-3 space-y-2 text-xs leading-5 text-[hsl(var(--muted-foreground))]">
                  {assessment.suggested_tests_to_ask_about.map((test, i) => (
                    <li key={i} className="flex gap-2 items-start">
                      <CheckCircle2 size={14} className="text-[hsl(var(--primary))] mt-0.5 shrink-0" />
                      <span>{test}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Trusted Medical References */}
            {assessment.sources && assessment.sources.length > 0 && (
              <div className="surface rounded-2xl border border-[hsl(var(--border))] p-6">
                <p className="eyebrow text-[hsl(var(--muted-foreground))]">Verified Sources</p>
                <h3 className="mt-1.5 text-base font-extrabold">Trusted Medical References</h3>
                <div className="mt-3 space-y-2.5">
                  {assessment.sources.map((src, i) => (
                    <a
                      key={i}
                      href={src.url}
                      target="_blank"
                      rel="noreferrer"
                      className="block rounded-xl border border-[hsl(var(--border))] bg-[hsl(var(--background)/.4)] p-3 hover:border-[hsl(var(--primary))] transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-xs font-bold">{src.title}</p>
                          <p className="text-[0.68rem] text-[hsl(var(--primary))] font-bold uppercase">{src.publisher}</p>
                          <p className="text-[0.7rem] text-[hsl(var(--muted-foreground))] mt-1">{src.why}</p>
                        </div>
                        <ExternalLink size={14} className="text-[hsl(var(--primary))] shrink-0 mt-0.5 ml-2" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Safety Disclaimer Footer */}
        <div className="mt-10 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--secondary)/.4)] p-6 text-xs text-[hsl(var(--muted-foreground))] leading-6">
          <p className="font-bold text-[hsl(var(--foreground))] mb-1 flex items-center gap-1.5">
            <Info size={15} className="text-[hsl(var(--primary))]" />
            Medical Disclaimer
          </p>
          <p>{assessment.disclaimer}</p>
        </div>
      </div>
    </AppShell>
  );
}

// ── Root Router & Providers ─────────────────────────────────────────────────
function AppRouter() {
  const [location] = useLocation();
  return (
    <ErrorBoundary resetKey={location}>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/assessment" component={Assessment} />
        <Route path="/result" component={Result} />
        <Route component={NotFound} />
      </Switch>
    </ErrorBoundary>
  );
}

export default function App() {
  return (
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <AppRouter />
    </WouterRouter>
  );
}
