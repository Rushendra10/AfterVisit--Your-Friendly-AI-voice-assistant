import { create } from "zustand";
import type {
  ActionCard,
  ChatMessage,
  Citation,
  HandledItem,
  PendingConfirm,
  PersonaId,
  SubAgent,
} from "./types";
import { DEFAULT_DEMO_MODE, DEFAULT_VOICE_PROVIDER, type DemoMode, type VoiceProvider } from "./config";

export type Phase =
  | "idle"
  | "incoming"
  | "running"
  | "awaitingUser"
  | "thinking"
  | "confirming"
  | "live"
  | "done";

let _id = 0;
const nextId = () => `m${++_id}`;

interface ConversationState {
  phase: Phase;
  messages: ChatMessage[];
  subAgents: SubAgent[]; // top-right Clicky-style worker cards
  cards: ActionCard[]; // companion actions the patient approved ("with your OK")
  careTeamHandled: HandledItem[]; // what the clinician already did (read-only)
  activeCitation: Citation | null;
  suggestions: string[]; // topic ids
  pendingConfirm: PendingConfirm | null;
  speaking: PersonaId | null;
  recording: boolean;

  demoMode: DemoMode;
  voiceProvider: VoiceProvider;
  muted: boolean;

  setPhase: (p: Phase) => void;
  addMessage: (m: Omit<ChatMessage, "id">) => string;
  updateMessage: (id: string, text: string) => void;
  addSubAgent: (s: SubAgent) => void;
  pushSubAgentTask: (id: string, task: string) => void;
  completeSubAgent: (id: string) => void;
  removeSubAgent: (id: string) => void;
  addCard: (c: ActionCard) => void;
  updateCard: (id: string, patch: Partial<ActionCard>) => void;
  setCareTeamHandled: (h: HandledItem[]) => void;
  setCitation: (c: Citation | null) => void;
  setSuggestions: (s: string[]) => void;
  setPendingConfirm: (p: PendingConfirm | null) => void;
  setSpeaking: (p: PersonaId | null) => void;
  setRecording: (b: boolean) => void;

  setDemoMode: (m: DemoMode) => void;
  setVoiceProvider: (v: VoiceProvider) => void;
  toggleMuted: () => void;
  reset: () => void;
}

export const useStore = create<ConversationState>((set) => ({
  phase: "idle",
  messages: [],
  subAgents: [],
  cards: [],
  careTeamHandled: [],
  activeCitation: null,
  suggestions: [],
  pendingConfirm: null,
  speaking: null,
  recording: false,

  demoMode: DEFAULT_DEMO_MODE,
  voiceProvider: DEFAULT_VOICE_PROVIDER,
  muted: false,

  setPhase: (p) => set({ phase: p }),
  addMessage: (m) => {
    const id = nextId();
    set((s) => ({ messages: [...s.messages, { ...m, id }] }));
    return id;
  },
  updateMessage: (id, text) =>
    set((s) => ({ messages: s.messages.map((m) => (m.id === id ? { ...m, text } : m)) })),
  // keep at most 3 cards; a new one evicts the oldest (FIFO)
  addSubAgent: (sa) => set((s) => ({ subAgents: [...s.subAgents, sa].slice(-3) })),
  pushSubAgentTask: (id, task) =>
    set((s) => ({
      subAgents: s.subAgents.map((a) => (a.id === id ? { ...a, tasks: [...a.tasks, task] } : a)),
    })),
  completeSubAgent: (id) =>
    set((s) => ({
      subAgents: s.subAgents.map((a) => (a.id === id ? { ...a, status: "done" } : a)),
    })),
  removeSubAgent: (id) => set((s) => ({ subAgents: s.subAgents.filter((a) => a.id !== id) })),
  addCard: (c) => set((s) => ({ cards: [...s.cards, c] })),
  updateCard: (id, patch) =>
    set((s) => ({ cards: s.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),
  setCareTeamHandled: (h) => set({ careTeamHandled: h }),
  setCitation: (c) => set({ activeCitation: c }),
  setSuggestions: (s) => set({ suggestions: s }),
  setPendingConfirm: (p) => set({ pendingConfirm: p }),
  setSpeaking: (p) => set({ speaking: p }),
  setRecording: (b) => set({ recording: b }),

  setDemoMode: (m) => set({ demoMode: m }),
  setVoiceProvider: (v) => set({ voiceProvider: v }),
  toggleMuted: () => set((s) => ({ muted: !s.muted })),
  reset: () =>
    set({
      phase: "idle",
      messages: [],
      subAgents: [],
      cards: [],
      careTeamHandled: [],
      activeCitation: null,
      suggestions: [],
      pendingConfirm: null,
      speaking: null,
      recording: false,
    }),
}));
