"use client";

import { useRef } from "react";
import conversationData from "@/data/conversation.json";
import type { ConversationModel, ReasonResult, Line, SubAgentSpec, Citation } from "./types";
import { useStore } from "./store";
import { persona, subAgentInfo } from "./personas";
import { speak, prefetchTTS, stopSpeaking, cancelRecording } from "./voice";
import { startRealtimeVoice, type RealtimeController } from "./realtime";
import { bestCitation } from "./grounding";
import { PACING } from "./config";

const MODEL = conversationData as unknown as ConversationModel;
export const CONVERSATION = MODEL;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
const VISIT_NOTE: Citation = { file: "visit_note.pdf", page: 1, quote: "", label: "After-Visit Note" };

const FALLBACK: ReasonResult = {
  answer:
    "Your A1c is 7.8%, and 6.5% or above means type 2 diabetes — so you're just over the line, and it's very treatable. Metformin's the usual first step; worth checking the details with Dr. Lee at your follow-up.",
  citations: [{ file: "labs_a1c.pdf", page: 1, quote: "Hemoglobin A1c: 7.8 %", label: "Lab Results — A1c & Lipids" }],
  scope: "grounded",
};

// Companion actions that can be triggered by VOICE during the live call. Each
// spawns a named sub-agent (top-right) + lands a card under "With your OK".
interface LiveAction {
  subKey: string;
  title: string;
  tasks: string[];
  card: { id: string; tool: string; icon: string; title: string; detail: string };
}
const ACTIONS: Record<string, LiveAction> = {
  pharmacy: {
    subKey: "pax", title: "Texting your pharmacy",
    tasks: ["Opening CVS on Main St", "Drafting your message", "Sending the text"],
    card: { id: "pharmacy_text", tool: "text_pharmacy", icon: "pill", title: "Text sent to your pharmacy", detail: "CVS, 12 Main St · about your metformin" },
  },
  peer: {
    subKey: "mira", title: "Finding a peer",
    tasks: ["Searching opted-in members", "Matching by condition + distance", "Sending an introduction"],
    card: { id: "peer", tool: "find_peer", icon: "heart", title: "Peer connection sent", detail: "A 38-yr-old nearby with T2D · message anytime" },
  },
  reminder: {
    subKey: "cal", title: "Scheduling your reminder",
    tasks: ["Creating a daily reminder", "Setting it for 6:30 PM", "Linking your metformin"],
    card: { id: "reminder", tool: "set_reminder", icon: "bell", title: "Daily reminder set", detail: "Metformin · 6:30 PM daily" },
  },
  booking: {
    subKey: "cal", title: "Booking your follow-up",
    tasks: ["Checking Dr. Lee's availability", "Holding Sep 14, 10:00 AM", "Adding to your calendar"],
    card: { id: "followup", tool: "book_followup", icon: "calendar", title: "Follow-up booked", detail: "A1c recheck · Sep 14, 10:00 AM" },
  },
  pickup: {
    subKey: "cal", title: "Checking your prescription",
    tasks: ["Contacting CVS on Main St", "Confirming it's ready", "Texting you the details"],
    card: { id: "pickup", tool: "check_rx", icon: "pill", title: "Prescription checked", detail: "Metformin ready ~4:00 PM · CVS Main St" },
  },
  eye: {
    subKey: "cal", title: "Finding eye doctors",
    tasks: ["Reading your referral", "Searching in-network", "Sorting by distance"],
    card: { id: "eye", tool: "find_eye", icon: "eye", title: "In-network eye doctors", detail: "3 options within 4 miles" },
  },
  flag: {
    subKey: "quinn", title: "Flagging the record error",
    tasks: ["Locating the allergy entry", "Filing a correction", "Notifying your care team"],
    card: { id: "flag", tool: "flag_record_error", icon: "flag", title: "Record correction flagged", detail: "Penicillin allergy · sent for review" },
  },
};

const AFFIRM = /\b(yes|yeah|yep|yup|sure|please|ok|okay|sounds good|go ahead|do it|connect me|that'?s great|that'?d be great|let'?s|absolutely|definitely|of course)\b/i;
const isAffirmative = (t: string) => AFFIRM.test(t);

// What the patient asked the companion to actually do.
function detectActionIntent(text: string): string | null {
  const t = text.toLowerCase();
  if (/(text|message|send|call|contact)/.test(t) && /pharmac/.test(t)) return "pharmacy";
  // peer = an explicit "connect me" directive only. Merely *wanting* community
  // ("I'm looking for people to talk to") is left for Remy to offer first, so
  // the sub-agent spawns on the patient's yes — not on the bare request.
  if (/(connect|introduce)/.test(t) && /(me|us|someone|somebody|people|peer|with)/.test(t)) return "peer";
  if (/remind/.test(t)) return "reminder";
  if (/(book|schedule|set up)/.test(t) && /(appointment|follow|visit|a1c|recheck)/.test(t)) return "booking";
  if (/(check|refill|pick ?up)/.test(t) && /(prescription|metformin|rx|med)/.test(t)) return "pickup";
  if (/(eye|optometr|ophthal)/.test(t) && /(find|book|schedule|doctor|appointment)/.test(t)) return "eye";
  if (/(flag|fix|correct)/.test(t) && /(record|allerg|penicillin|chart)/.test(t)) return "flag";
  return null;
}

// What the companion just OFFERED to do ("want me to ...?") — armed for a yes.
function detectOffer(text: string): string | null {
  const t = text.toLowerCase();
  if (!/(want me to|should i|i can|would you like|shall i|do you want me|happy to)/.test(t)) return null;
  if (/pharmac/.test(t)) return "pharmacy";
  if (/(connect|peer|community|someone)/.test(t)) return "peer";
  if (/remind/.test(t)) return "reminder";
  if (/(book|appointment|follow)/.test(t)) return "booking";
  if (/(prescription|refill|pick ?up)/.test(t)) return "pickup";
  if (/(eye|optometr|ophthal)/.test(t)) return "eye";
  if (/(flag|correct|record error)/.test(t)) return "flag";
  return null;
}

export function useConversation() {
  const startedRef = useRef(false);
  const scriptRunningRef = useRef(false);
  const usedRef = useRef<Set<string>>(new Set());
  const saCounter = useRef(0);
  const liveRef = useRef<RealtimeController | null>(null);
  const liveReadyRef = useRef(false);
  const liveUserMsgRef = useRef<string | null>(null);
  const firstUserTurnRef = useRef(false);
  const connectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingActionRef = useRef<string | null>(null); // action Remy just offered
  const doneActionsRef = useRef<Set<string>>(new Set());

  // ---------- shared helpers ----------
  const speakRemy = async (text: string) => {
    if (!text) return;
    useStore.getState().setSpeaking("main");
    await speak(text, persona("main"), useStore.getState().voiceProvider, useStore.getState().muted);
    useStore.getState().setSpeaking(null);
  };

  const say = async (line: Line, citation?: Citation, blankIfNoCitation = true) => {
    useStore.getState().addMessage({ role: "agent", persona: "main", text: line.text, citation });
    if (citation) useStore.getState().setCitation(citation);
    else if (blankIfNoCitation) useStore.getState().setCitation(null);
    await speakRemy(line.text);
  };

  const spawnSubAgent = async (spec: SubAgentSpec, reasoning?: Promise<unknown>) => {
    const info = subAgentInfo(spec.key);
    const id = `${spec.key}-${++saCounter.current}`;
    useStore.getState().addSubAgent({
      id, key: spec.key, name: info.name, role: info.role, color: info.color, title: spec.title, status: "running", tasks: [],
    });
    for (const t of spec.tasks) {
      useStore.getState().pushSubAgentTask(id, t);
      await sleep(PACING.thoughtTick);
    }
    if (reasoning) await reasoning;
    useStore.getState().completeSubAgent(id);
    setTimeout(() => useStore.getState().removeSubAgent(id), 20000);
    return id;
  };

  const reason = async (question: string): Promise<ReasonResult> => {
    try {
      const res = await fetch("/api/reason", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question }),
      });
      if (!res.ok) return FALLBACK;
      const data = (await res.json()) as ReasonResult;
      return data?.answer ? data : FALLBACK;
    } catch {
      return FALLBACK;
    }
  };

  const computeSuggestions = (followups?: string[]): string[] => {
    const used = usedRef.current;
    const pickable = Object.keys(MODEL.topics).filter((id) => id !== "done");
    const next = (followups || []).filter((id) => id !== "done" && !used.has(id));
    for (const id of pickable) {
      if (next.length >= 4) break;
      if (!used.has(id) && !next.includes(id)) next.push(id);
    }
    const out = next.slice(0, 4);
    if (used.size >= 1 && MODEL.topics["done"]) out.push("done");
    return out;
  };

  const finishTurn = (followups?: string[]) => {
    useStore.getState().setSuggestions(computeSuggestions(followups));
    useStore.getState().setPhase("awaitingUser");
  };

  // ---------- live (Grok realtime) ----------
  const stopLive = () => {
    try { liveRef.current?.stop(); } catch {}
    liveRef.current = null;
    liveReadyRef.current = false;
    if (connectTimer.current) clearTimeout(connectTimer.current);
  };

  const spawnAction = (key: string) => {
    const a = ACTIONS[key];
    if (!a || doneActionsRef.current.has(a.card.id)) return;
    doneActionsRef.current.add(a.card.id);
    void spawnSubAgent({ key: a.subKey, title: a.title, tasks: a.tasks });
    useStore.getState().addCard({ ...a.card, status: "done" });
  };

  const onLiveUser = (text: string, final: boolean) => {
    if (!text) return;
    if (liveUserMsgRef.current) useStore.getState().updateMessage(liveUserMsgRef.current, text);
    else liveUserMsgRef.current = useStore.getState().addMessage({ role: "user", persona: "user", text });
    if (!final) return;
    liveUserMsgRef.current = null;

    // first reply -> Jack pulls records + care plan + visit note
    if (!firstUserTurnRef.current) {
      firstUserTurnRef.current = true;
      void spawnSubAgent(MODEL.recordsAgent);
      useStore.getState().setCareTeamHandled(MODEL.careTeamHandled);
      useStore.getState().setCitation(VISIT_NOTE);
    }

    // voice-triggered action: an explicit request, or a "yes" to what Remy offered
    const key =
      detectActionIntent(text) ||
      (pendingActionRef.current && isAffirmative(text) ? pendingActionRef.current : null);
    if (key) spawnAction(key);
    pendingActionRef.current = null;
  };

  const onLiveRemy = (text: string) => {
    useStore.getState().setSpeaking(null);
    useStore.getState().addMessage({ role: "agent", persona: "main", text });
    const c = bestCitation(text);
    if (c) useStore.getState().setCitation(c); // highlight the actual line Remy cited
    const offer = detectOffer(text);
    if (offer) pendingActionRef.current = offer; // arm it for the patient's next "yes"
  };

  const endLiveToScripted = () => {
    stopLive();
    useStore.getState().setSpeaking(null);
    finishTurn();
  };

  const fallbackScripted = () => {
    stopLive();
    void runIntro();
  };

  const startLiveIntro = async () => {
    usedRef.current = new Set();
    firstUserTurnRef.current = false;
    liveUserMsgRef.current = null;
    liveReadyRef.current = false;
    pendingActionRef.current = null;
    doneActionsRef.current = new Set();
    useStore.getState().setCitation(VISIT_NOTE); // records show immediately on answer
    useStore.getState().setPhase("live");
    useStore.getState().setSpeaking("main");
    useStore.getState().setSuggestions(MODEL.initialSuggestions);
    connectTimer.current = setTimeout(() => {
      if (!liveReadyRef.current) {
        console.warn("[live] connect timeout -> scripted fallback");
        fallbackScripted();
      }
    }, 9000);
    try {
      liveRef.current = await startRealtimeVoice({
        onReady: () => {
          liveReadyRef.current = true;
          if (connectTimer.current) clearTimeout(connectTimer.current);
          liveRef.current?.greet(); // Remy opens the call himself
        },
        onUser: onLiveUser,
        onRemy: onLiveRemy,
        onError: () => (liveReadyRef.current ? endLiveToScripted() : fallbackScripted()),
      });
    } catch {
      fallbackScripted();
    }
  };

  // resume a live session after the user ended it (no re-greet / no re-pull)
  const startLiveVoice = async () => {
    if (liveRef.current || useStore.getState().phase !== "awaitingUser") return;
    stopSpeaking();
    liveReadyRef.current = false;
    useStore.getState().setPhase("live");
    useStore.getState().setSpeaking("main");
    connectTimer.current = setTimeout(() => {
      if (!liveReadyRef.current) endLiveToScripted();
    }, 9000);
    try {
      liveRef.current = await startRealtimeVoice({
        onReady: () => {
          liveReadyRef.current = true;
          if (connectTimer.current) clearTimeout(connectTimer.current);
          useStore.getState().setSpeaking(null);
        },
        onUser: onLiveUser,
        onRemy: onLiveRemy,
        onError: () => endLiveToScripted(),
      });
    } catch {
      endLiveToScripted();
    }
  };

  const endLiveVoice = () => endLiveToScripted();

  // ---------- scripted fallback flow ----------
  const runIntro = async () => {
    if (scriptRunningRef.current) return;
    scriptRunningRef.current = true;
    useStore.getState().setPhase("running");
    useStore.getState().setCitation(VISIT_NOTE);
    MODEL.intro.forEach((l) => prefetchTTS(l.text, persona("main"), useStore.getState().voiceProvider));
    prefetchTTS(MODEL.summary.text, persona("main"), useStore.getState().voiceProvider);
    for (const line of MODEL.intro) await say(line, undefined, false);
    await spawnSubAgent(MODEL.recordsAgent);
    useStore.getState().setCareTeamHandled(MODEL.careTeamHandled);
    await say(MODEL.summary, undefined, false);
    useStore.getState().setCitation(VISIT_NOTE);
    finishTurn(MODEL.initialSuggestions);
    scriptRunningRef.current = false;
  };

  // ---------- public handlers (branch on live vs scripted) ----------
  const handleTopic = async (id: string) => {
    const topic = MODEL.topics[id];
    if (!topic) return;

    if (liveRef.current) {
      if (useStore.getState().pendingConfirm) return;
      usedRef.current.add(id);
      useStore.getState().addMessage({ role: "user", persona: "user", text: topic.userText });
      if (topic.isClose) {
        liveRef.current.sendText(topic.userText);
        setTimeout(() => { stopLive(); useStore.getState().setSpeaking(null); useStore.getState().setPhase("done"); }, 6000);
        return;
      }
      if (topic.propose) {
        useStore.getState().setPendingConfirm({ topicId: id, prompt: topic.propose.prompt });
        useStore.getState().setSuggestions([]);
      } else {
        useStore.getState().setSuggestions(computeSuggestions(topic.followups));
      }
      liveRef.current.sendText(topic.userText);
      return;
    }

    // scripted
    if (useStore.getState().phase !== "awaitingUser") return;
    usedRef.current.add(id);
    useStore.getState().setSuggestions([]);
    useStore.getState().setPhase("running");
    useStore.getState().addMessage({ role: "user", persona: "user", text: topic.userText });
    if (topic.response) await say({ persona: "main", text: topic.response.text }, topic.response.citation, false);
    if (topic.isClose) { useStore.getState().setPhase("done"); return; }
    if (topic.propose) {
      useStore.getState().addMessage({ role: "agent", persona: "main", text: topic.propose.prompt });
      useStore.getState().setPendingConfirm({ topicId: id, prompt: topic.propose.prompt });
      await speakRemy(topic.propose.prompt);
      useStore.getState().setPhase("confirming");
      return;
    }
    finishTurn(topic.followups);
  };

  const confirmAction = async (yes: boolean) => {
    const pc = useStore.getState().pendingConfirm;
    if (!pc) return;
    const topic = MODEL.topics[pc.topicId];
    const propose = topic?.propose;
    useStore.getState().setPendingConfirm(null);
    useStore.getState().addMessage({ role: "user", persona: "user", text: yes ? "Yes, please." : "Not right now." });

    if (liveRef.current) {
      if (yes && propose) {
        if (propose.subAgent) await spawnSubAgent(propose.subAgent);
        useStore.getState().addCard({ ...propose.card, status: "done" });
        liveRef.current.sendText("Yes, please go ahead with that.");
      } else {
        liveRef.current.sendText("No, not right now — thanks though.");
      }
      useStore.getState().setSuggestions(computeSuggestions(topic?.followups));
      return;
    }

    // scripted
    useStore.getState().setPhase("running");
    if (yes && propose) {
      if (propose.subAgent) await spawnSubAgent(propose.subAgent);
      useStore.getState().addCard({ ...propose.card, status: "done" });
      await say({ persona: "main", text: propose.confirmedText }, undefined, false);
    } else {
      await say({ persona: "main", text: "No problem — we can come back to it anytime." }, undefined, false);
    }
    finishTurn(topic?.followups);
  };

  const submitQuestion = async (text: string) => {
    const q = text.trim();
    if (!q) return;

    if (liveRef.current) {
      useStore.getState().addMessage({ role: "user", persona: "user", text: q });
      liveRef.current.sendText(q);
      return;
    }

    // scripted (typed Q&A via local Claude)
    if (useStore.getState().phase !== "awaitingUser") return;
    useStore.getState().setSuggestions([]);
    useStore.getState().setPhase("running");
    useStore.getState().addMessage({ role: "user", persona: "user", text: q });
    useStore.getState().setPhase("thinking");
    const reasoning = reason(q);
    await spawnSubAgent(
      { key: "jack", title: "Looking through your records", tasks: ["Searching your chart", "Finding the relevant section", "Checking the guidance"] },
      reasoning
    );
    const result = await reasoning;
    useStore.getState().setPhase("running");
    await say({ persona: "main", text: result.answer }, result.citations?.[0]);
    finishTurn();
  };

  // ---------- lifecycle ----------
  const incoming = () => {
    stopLive();
    stopSpeaking();
    startedRef.current = false;
    usedRef.current = new Set();
    firstUserTurnRef.current = false;
    liveUserMsgRef.current = null;
    pendingActionRef.current = null;
    doneActionsRef.current = new Set();
    useStore.getState().reset();
    useStore.getState().setPhase("incoming");
  };

  const accept = () => {
    if (startedRef.current) return;
    startedRef.current = true;
    void startLiveIntro();
  };

  const restart = () => {
    stopLive();
    stopSpeaking();
    cancelRecording();
    startedRef.current = false;
    scriptRunningRef.current = false;
    usedRef.current = new Set();
    firstUserTurnRef.current = false;
    liveUserMsgRef.current = null;
    pendingActionRef.current = null;
    doneActionsRef.current = new Set();
    saCounter.current = 0;
    useStore.getState().reset();
    useStore.getState().setPhase("incoming");
  };

  return { incoming, accept, handleTopic, submitQuestion, confirmAction, startLiveVoice, endLiveVoice, restart };
}
