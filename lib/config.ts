// Runtime configuration. Defaults come from env (NEXT_PUBLIC_*) and can be
// overridden live from the Settings panel (stored in the conversation store).

export type DemoMode = "fixed" | "live";
export type VoiceProvider = "browser" | "grok";

export const DEFAULT_DEMO_MODE: DemoMode =
  (process.env.NEXT_PUBLIC_DEMO_MODE as DemoMode) === "live" ? "live" : "fixed";

export const DEFAULT_VOICE_PROVIDER: VoiceProvider =
  (process.env.NEXT_PUBLIC_VOICE_PROVIDER as VoiceProvider) === "browser"
    ? "browser"
    : "grok"; // default to Grok voices; browser is the explicit opt-out / fallback

// Pacing (ms) — tuned so the demo feels alive but fits ~3 minutes.
export const PACING = {
  afterAgentLine: 550, // pause after an agent finishes speaking
  thoughtTick: 700, // interval between streamed "thoughts"
  cardStagger: 450, // delay between action cards landing
  beforeUserPrompt: 350,
};

export const SAFETY_FOOTER =
  "Aftervisit supports your care — it is not a substitute for your clinician.";
