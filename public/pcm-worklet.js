// Mic capture worklet: posts raw Float32 frames (at the context's 24 kHz) to the
// main thread, which converts them to PCM16 for the Grok realtime API.
class PCMCapture extends AudioWorkletProcessor {
  process(inputs) {
    const input = inputs[0];
    if (input && input[0]) {
      // copy — the underlying buffer is reused across calls
      this.port.postMessage(input[0].slice(0));
    }
    return true;
  }
}
registerProcessor("pcm-capture", PCMCapture);
