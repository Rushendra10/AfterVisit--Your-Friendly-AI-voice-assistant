// Shared domain types for Aftervisit.

export type PersonaId = "main" | "jack" | "jill" | "peer" | "system" | "user";

export interface VoiceProfile {
  /** Browser SpeechSynthesis fallback tuning */
  pitch: number;
  rate: number;
  /** Preferred system-voice name substrings (first available wins) */
  voiceHints: string[];
  /** Grok Voice id (eve|ara|rex|sal|leo), used when VOICE_PROVIDER=grok */
  grokVoice: string;
  /** Grok TTS speed (0.7–1.5); lower = slower/more natural */
  speed: number;
}

export interface Persona {
  id: PersonaId;
  name: string;
  role: string;
  color: string; // hex accent
  initial: string;
  voice: VoiceProfile;
}

export interface Citation {
  file: string; // e.g. "labs_a1c.pdf"
  page: number; // 1-based
  quote: string; // exact text to surface/highlight
  label: string; // human-friendly document name
}

export interface ActionCard {
  id: string;
  tool: string;
  icon: string; // lucide icon key (see ActionTimeline)
  title: string;
  detail: string;
  status: "running" | "done";
}

export type ChatRole = "agent" | "user";

export interface ChatMessage {
  id: string;
  role: ChatRole;
  persona: PersonaId;
  text: string;
  citation?: Citation;
}

// ---- Conversation model (consent-first, patient-driven) ----

/** Something the clinician/hospital already did — read-only, informational. */
export interface HandledItem {
  id: string;
  icon: string;
  title: string;
  detail: string;
  by: string;
}

export interface Line {
  persona: PersonaId;
  text: string;
}

export interface TopicResponse {
  text: string;
  citation?: Citation;
}

/** Spec for a sub-agent Remy spawns to do a task (shown as a top-right card). */
export interface SubAgentSpec {
  key: string; // registry key: jack | cal | mira | quinn
  title: string; // e.g. "Booking your follow-up"
  tasks: string[]; // streamed task lines
}

/** A live sub-agent instance shown in the dock. */
export interface SubAgent {
  id: string;
  key: string;
  name: string;
  role: string;
  color: string;
  title: string;
  status: "running" | "done";
  tasks: string[];
}

/** A companion action the patient must approve before it happens. */
export interface TopicPropose {
  prompt: string;
  subAgent?: SubAgentSpec;
  card: Omit<ActionCard, "status">;
  confirmedText: string;
}

/** Structured EHR document blocks (for in-app HTML rendering + highlight). */
export interface DocBlock {
  s: string; // style: h1|h2|label|body|bullet|sp|hr
  t?: string;
}
export interface EhrDocStructured {
  label: string;
  pages: DocBlock[][];
}

export interface Topic {
  label: string; // suggestion-chip text
  userText: string; // what shows as the patient's message when chosen
  response?: TopicResponse;
  propose?: TopicPropose;
  followups?: string[];
  isClose?: boolean;
}

export interface ConversationModel {
  patient: { name: string; age: number; condition: string; provider: string };
  greetingCallLabel: string;
  intro: Line[];
  recordsAgent: SubAgentSpec; // Jack pulls the chart at the start
  summary: Line; // Remy's plain-language recap after Jack finishes
  careTeamHandled: HandledItem[];
  handoff: Line;
  initialSuggestions: string[];
  topics: Record<string, Topic>;
}

export interface PendingConfirm {
  topicId: string;
  prompt: string;
}

export interface ReasonResult {
  answer: string;
  citations: Citation[];
  scope?: "grounded" | "general" | "refuse";
  confidence?: "high" | "medium" | "low";
}
