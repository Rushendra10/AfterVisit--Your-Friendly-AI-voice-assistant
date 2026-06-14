import type { Persona, PersonaId } from "./types";

// The Aftervisit care team. "Orchestrated illusion": one brain role-plays all of
// these, but each has a distinct identity + Grok voice so it feels like a real team.
// Grok voices: eve (energetic), ara (warm), rex (confident/clear), sal (smooth), leo (authoritative).
export const PERSONAS: Record<PersonaId, Persona> = {
  main: {
    id: "main",
    name: "Remy",
    role: "Your Care Guide",
    color: "#14b8a6",
    initial: "R",
    voice: { pitch: 1.0, rate: 0.92, voiceHints: ["Samantha", "Victoria"], grokVoice: "ara", speed: 0.96 },
  },
  jack: {
    id: "jack",
    name: "Jack",
    role: "Records Agent",
    color: "#3b82f6",
    initial: "J",
    voice: { pitch: 0.92, rate: 0.92, voiceHints: ["Daniel", "Alex"], grokVoice: "rex", speed: 0.97 },
  },
  jill: {
    id: "jill",
    name: "Jill",
    role: "Care Companion",
    color: "#8b5cf6",
    initial: "J",
    voice: { pitch: 1.06, rate: 0.9, voiceHints: ["Karen", "Moira"], grokVoice: "sal", speed: 0.95 },
  },
  peer: {
    id: "peer",
    name: "Community Member",
    role: "Peer (anonymized)",
    color: "#f59e0b",
    initial: "•",
    voice: { pitch: 1.0, rate: 0.92, voiceHints: ["Tessa", "Fiona"], grokVoice: "leo", speed: 0.96 },
  },
  system: {
    id: "system",
    name: "Aftervisit",
    role: "System",
    color: "#64748b",
    initial: "A",
    voice: { pitch: 1.0, rate: 0.95, voiceHints: ["Samantha"], grokVoice: "ara", speed: 0.96 },
  },
  user: {
    id: "user",
    name: "You",
    role: "Patient",
    color: "#0ea5e9",
    initial: "Y",
    voice: { pitch: 1.0, rate: 1.0, voiceHints: [], grokVoice: "", speed: 1.0 },
  },
};

export const persona = (id: PersonaId): Persona => PERSONAS[id];

// Sub-agents are workers Remy spawns for tasks — they appear as top-right
// "Clicky-style" cards and never speak to the patient. Remy calls them by name.
export interface SubAgentInfo {
  name: string;
  role: string;
  color: string;
}
export const SUB_AGENTS: Record<string, SubAgentInfo> = {
  jack: { name: "Jack", role: "Records", color: "#3b82f6" }, // blue
  cal: { name: "Cal", role: "Scheduling", color: "#f59e0b" }, // amber
  pax: { name: "Pax", role: "Pharmacy", color: "#10b981" }, // emerald
  mira: { name: "Mira", role: "Community", color: "#ec4899" }, // pink
  quinn: { name: "Quinn", role: "Records office", color: "#a78bfa" }, // violet
};
export const subAgentInfo = (key: string): SubAgentInfo =>
  SUB_AGENTS[key] ?? { name: "Agent", role: "Task", color: "#14b8a6" };
