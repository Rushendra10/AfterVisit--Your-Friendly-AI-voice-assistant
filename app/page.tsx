"use client";

import { useStore } from "@/lib/store";
import { useConversation } from "@/lib/useConversation";
import { StartScreen } from "@/components/StartScreen";
import { PhoneCall } from "@/components/PhoneCall";
import { SettingsBar } from "@/components/SettingsBar";
import { ChatTranscript } from "@/components/ChatTranscript";
import { RecordsStage } from "@/components/RecordsStage";
import { SubAgentDock } from "@/components/SubAgentDock";
import { ActionsOverlay } from "@/components/ActionsOverlay";
import { SafetyFooter } from "@/components/SafetyFooter";

export default function Home() {
  const phase = useStore((s) => s.phase);
  const conv = useConversation();

  if (phase === "idle") {
    return <StartScreen onStart={conv.incoming} />;
  }

  if (phase === "incoming") {
    return (
      <PhoneCall
        onAccept={conv.accept}
        onDecline={() => {
          useStore.getState().reset();
          useStore.getState().setPhase("idle");
        }}
      />
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <SettingsBar onRestart={conv.restart} />
      <main className="flex min-h-0 flex-1 gap-3 p-3">
        {/* left: conversation */}
        <div className="flex w-[40%] min-w-[360px] max-w-[560px]">
          <ChatTranscript
            onTopic={conv.handleTopic}
            onSubmit={conv.submitQuestion}
            onConfirm={conv.confirmAction}
            onStartLive={conv.startLiveVoice}
            onEndLive={conv.endLiveVoice}
          />
        </div>
        {/* right: records stage with floating agent + actions overlays */}
        <div className="relative flex min-h-0 flex-1">
          <RecordsStage />
          <SubAgentDock />
          <ActionsOverlay />
        </div>
      </main>
      <SafetyFooter />
    </div>
  );
}
