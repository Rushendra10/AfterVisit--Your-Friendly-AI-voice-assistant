# Aftervisit — Your Friendly AI Voice Assistant for After the Doctor's Visit

A **voice-first AI care team** that calls you right after a clinic visit, **explains your records in
plain language**, **gets your follow-ups done with your consent** (prescription, scheduling, referral,
reminders), and **connects you to a real peer** going through the same thing — all grounded in your own
medical records.

Built for the **Legion Health** healthcare hackathon (sponsors: **Vercel/v0**, **Cursor**, **xAI Grok Voice**).
Demo patient: **Alex Rivera**, 41, newly diagnosed **Type 2 Diabetes**. *All clinical data is synthetic.*

---

# 📋 DevPost Submission (copy-paste ready)

> Copy everything between the lines below straight into DevPost.

---

## Inspiration

Patients leave the clinic overwhelmed. The research is brutal: people remember only **49%** of what their
doctor said, **31% of newly prescribed diabetes medications are never filled**, and the patients with the
worst follow-through face **45% higher mortality** and are **58% more likely to be hospitalized**. The
moment you walk out the door, you're alone with a wall of jargon, a prescription you don't understand, and
a follow-up you'll probably forget. The system gives you *nothing* between visits. We wanted to build the
companion that closes that loop — something that feels like calling a friend who happens to be a nurse.

## What it does

Aftervisit is a post-visit AI patient companion. Right after your appointment, you get a phone call from
**Remy**, your friendly AI care guide. In one natural, low-latency voice conversation, Remy:

- **Greets you and asks what you want to make sense of** — it never dumps information on you.
- **Translates the jargon into plain English**, and as it explains, it **highlights the exact lines in
  your real records** so you can see what it's talking about.
- **Answers your questions** grounded in your chart (e.g., "how much is all of this going to cost me?" →
  pulls your real estimated costs and breaks them down).
- **Takes action with your consent** — when you say yes, Remy **spawns named sub-agents** to do the work
  (text your pharmacy, book a follow-up, find an in-network eye doctor, flag a record error). You watch
  them work in real time as glowing cards in the corner. Nothing happens without your okay.
- **Connects you to community** — when you say you're scared and want people to talk to, Remy warmly
  offers to connect you with an opted-in peer nearby with the same condition.

Everything is voice-first, grounded in your own data, and consent-first by design — a companion, not an autopilot.

## How we built it

- **Frontend:** Next.js (App Router) + React + TypeScript + Tailwind, with Zustand for state and
  Framer Motion for the animated, "Clicky-style" sub-agent cards.
- **Voice (xAI Grok):** The live call runs on the **Grok realtime voice agent**
  (`grok-voice-think-fast-1.1` over `wss://api.x.ai/v1/realtime`). Because a browser can't attach an auth
  header to a WebSocket, we built a small **Node `ws` proxy** that holds the key and injects Remy's
  persona + the patient's full EHR corpus into the session so every answer is grounded. Mic audio streams
  as **PCM16 @ 24 kHz** via an AudioWorklet, the model's voice plays back with **barge-in** (you can
  interrupt it mid-sentence), and live transcripts stream into the chat.
- **Reasoning brain (Claude):** Typed questions are answered by a **local Claude CLI** subprocess
  (`claude -p … --output-format json`) reasoning over the synthetic `/EHR` corpus — no cloud API key
  needed. It returns `{answer, scope, citations}`, so the records panel can open and highlight the exact
  cited line.
- **Grounding:** A generator script builds a realistic dummy EHR (after-visit note, A1c labs, med list,
  estimated costs, problem list, prior visits) as **real PDFs** plus structured blocks the UI renders and
  highlights.
- **Agentic actions:** Each consented action spawns a named sub-agent (Jack = records, Pax = pharmacy,
  Cal = scheduling, Mira = community, Quinn = records office), each a distinct color with a subtle glow,
  and lands an animated "✓ done" card under "With your OK."

## Challenges we ran into

- **Realtime voice over WebSockets in the browser** — you can't set an `Authorization` header on a WS, so
  we had to build a relay proxy and learn the OpenAI-realtime-style event protocol (server VAD turn
  detection, audio deltas, transcription events) the hard way.
- **One voice, many agents** — making it feel like a *team* without ever having two voices talk over each
  other. Only Remy ever speaks; the sub-agents are visible workers, never voices.
- **Spawning a local Claude subprocess** that wouldn't hang — the CLI waited forever on an open stdin pipe
  until we set `stdio: ["ignore","pipe","pipe"]`.
- **Consent-first flow detection** — distinguishing "I'm *looking for* community" (Remy should offer
  first) from "yes, *connect me*" (now spawn the agent) so actions only fire after the patient agrees.
- **Making it unbreakable for a live demo** — a fully scripted fallback path takes over instantly if the
  realtime connection ever drops, so the demo can never die on stage.

## Accomplishments that we're proud of

- A genuinely **seamless, low-latency voice conversation** that greets, explains, highlights records,
  answers cost questions, and takes consented actions — all in one natural call.
- The records panel that **highlights the exact line** Remy is talking about, in real time.
- **Consent-first agentic actions** with live, glowing sub-agent cards — visible agency without ever
  losing patient control.
- A real, warm **community-connection** moment that lands the emotional core of the product.
- Three sponsor tools woven into one coherent story: **Grok Voice** for the conversation, **local Claude**
  for grounded reasoning, **v0 + Cursor** for the build.

## What we learned

- Patient agency is a *design* problem as much as an AI problem — the magic is in **asking first** and
  **showing your work**, not in doing more automatically.
- Grounding + citation highlighting is what turns "an AI chatbot" into "something I can actually trust
  with my health."
- Realtime voice is a different beast from request/response TTS — barge-in and turn-taking are what make
  it feel human.

## What's next for Aftervisit

- Real EHR integration (FHIR) instead of synthetic data, behind proper auth and consent.
- True peer-matching with a real, opted-in community.
- Live tool execution (real pharmacy/scheduling APIs) behind a verified-action audit trail.
- Multilingual support and accessibility-first voice for the patients who need this most.

## Built With

`next.js` · `react` · `typescript` · `tailwindcss` · `zustand` · `framer-motion` · `xai-grok-voice` ·
`grok-realtime` · `websockets` · `claude` · `node.js` · `v0` · `cursor`

---

# 🚀 Quick start

```bash
npm install
npm run dev          # regenerates the dummy EHR, then starts Next.js + the voice proxy
# open http://localhost:3000 in Chrome/Edge (for the mic) and click Begin → Answer.
```

`npm run dev` runs **two processes** (via `concurrently`): **Next.js** and the **realtime voice proxy**
(`scripts/voice-proxy.mjs`, `ws://localhost:8787`). Add your `XAI_API_KEY` to `.env.local` (see
`.env.example`). Without a key, scripted voice falls back to the browser and the live call no-ops — the
typed Q&A and scripted flow still work.

```bash
cp .env.example .env.local   # then paste your XAI_API_KEY
```

---

# 🎬 The demo flow (realtime-first, consent-first)

1. **Begin → iPhone notification** ("Dr. Lee finished filing your records") → tap the green **Answer** button (it rings).
2. **Remy opens the call live:** *"Hey Alex! I'm Remy, your care guide — how are you feeling?"*
3. You mention you just had a visit and want clarity → **Remy asks what you'd like to make sense of** (it doesn't dump info) and has **Jack** pull your records (top-right card).
4. You ask Remy to simplify → it **breaks it down informally and highlights the matching lines** in your records (A1c 7.8% → Type 2 Diabetes, metformin, eye-exam referral, recheck).
5. You ask about **cost** → Remy answers from your **Estimated Costs** record (~$107 total) and offers to **text your pharmacy** → you say yes → **Pax** spawns and the text goes out.
6. You say you're scared and want **community** → Remy responds warmly and offers to **connect** you with a nearby peer → you accept → **Mira** spawns and the connection is sent. Demo ends.

Sub-agents appear top-right as **distinct-colored cards with a subtle glow** (max 3, newest first). Only **Remy** ever speaks.

---

# 🧠 How it works

- **Live voice (Grok realtime):** the call runs on `grok-voice-think-fast-1.1` over
  `wss://api.x.ai/v1/realtime`, relayed by `scripts/voice-proxy.mjs` which injects Remy's persona + the
  EHR corpus for grounding. Browser streams mic PCM16 @ 24 kHz (`lib/realtime.ts` + `public/pcm-worklet.js`),
  plays audio back, and supports **barge-in** via server VAD.
- **Typed reasoning (local Claude):** `/api/reason` spawns `claude -p … --output-format json` over
  `data/ehr/corpus.txt` and returns `{answer, scope, citations}` (`grounded` opens the cited record;
  `general` says "not in your notes, but generally…"; `refuse` politely declines + offers to book).
- **Grounded records:** `RecordsStage` renders structured EHR blocks and **highlights the cited line**,
  blanking the page when an answer isn't in the records.
- **Consent-first actions:** voice offers ("want me to text your pharmacy?") arm an action that only fires
  on your "yes," spawning the named sub-agent and landing a card under "With your OK."
- **Unbreakable demo:** if the realtime connection fails, a fully scripted fallback flow takes over.

---

# 🗂️ Architecture

```
app/
  page.tsx                 # orchestrator: StartScreen / PhoneCall / Cockpit
  api/reason/route.ts      # live brain — spawns the local `claude` CLI over /EHR
  api/voice/{tts,stt}      # Grok Voice: POST /v1/tts and /v1/stt (browser fallback)
  api/tools/route.ts       # mock agentic actions
  api/ehr/route.ts         # EHR document manifest
components/
  StartScreen, PhoneCall   # landing + iPhone notification / answer-call screen (with ringtone)
  ChatTranscript, TalkBar  # Remy-only chat + suggestion chips, Yes/No confirm, live voice bar
  RecordsStage             # records viewer: switch doc + highlight cited line + blank when ungrounded
  SubAgentDock             # top-right sub-agent cards (color + subtle glow, running + tasks)
  ActionsOverlay           # "Your care plan": Handled-by-care-team + With-your-OK buckets
lib/
  useConversation.ts       # realtime-first engine: greets, spawns sub-agents, consent-gated actions
  realtime.ts              # Grok realtime client: mic PCM24k stream, playback, barge-in, transcripts
  voice.ts                 # Grok/browser scripted voice: single-speaker lock, cache + prefetch
  store.ts                 # zustand UI state (subAgents, suggestions, pendingConfirm, cards)
  personas.ts              # Remy (sole voice) + SUB_AGENTS registry (Jack/Cal/Pax/Mira/Quinn)
  grounding.ts             # best-line citation matcher for live highlighting
  config.ts, types.ts, ehrDocs.ts
scripts/
  voice-proxy.mjs          # ws relay -> wss://api.x.ai/v1/realtime (holds key, injects grounded session)
  generate-ehr.mjs         # builds the synthetic EHR (PDFs + text + corpus); runs on predev/prebuild
public/
  pcm-worklet.js           # AudioWorklet: mic capture -> Float32 frames for realtime
  ehr/*.pdf                # generated synthetic EHR PDFs
data/
  conversation.json        # Remy-narrated scripted fallback model
  ehr/{docs.json,*.txt,corpus.txt}  # structured + text EHR (rendered + read by /api/reason)
```

---

# 🏆 Sponsor tools

- **Grok Voice (xAI)** — the entire live conversation: realtime voice agent + TTS/STT.
- **Local Claude** — the invisible grounded reasoning brain (no cloud API key).
- **v0** — UI scaffolding. **Cursor** — building and iterating.

---

# 📊 The numbers behind the problem

| Stat | Source |
|---|---|
| **31.4%** of newly prescribed diabetes meds are never filled | J Gen Intern Med, 2010 (PMC2842539) |
| Patients recall only **49%** of recommendations after a visit | PLOS ONE, 2018 |
| Poorest-adherence new T2D patients: **45% higher** all-cause mortality | Sci Reports, 2018 (PMC6093904) |
| Non-adherent diabetes patients **58% more likely** hospitalized | JAMA Intern Med, 2006 |
| Non-adherence ≈ **125,000 preventable deaths/yr** + **$100–300B/yr** | CDC MMWR, 2017 |

---

> ⚠️ **Educational prototype. Synthetic data only.** Aftervisit supports your care — it is not a
> substitute for your clinician.
