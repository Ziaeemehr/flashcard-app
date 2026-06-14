let frenchVoice: SpeechSynthesisVoice | null = null;

function pickFrenchVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === "fr-FR") ??
    voices.find((v) => v.lang.startsWith("fr")) ??
    null
  );
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  frenchVoice = pickFrenchVoice();
  window.speechSynthesis.onvoiceschanged = () => {
    frenchVoice = pickFrenchVoice();
  };
}

function speakWithBrowserVoice(text: string, rate: 1 | 0.6) {
  if (!("speechSynthesis" in window)) return;

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "fr-FR";
  utterance.rate = rate;
  if (frenchVoice) utterance.voice = frenchVoice;
  window.speechSynthesis.speak(utterance);
}

export async function speakFrench(text: string, rate: 1 | 0.6 = 1) {
  if (!text.trim()) return;

  try {
    const params = new URLSearchParams({ text });
    if (rate === 0.6) params.set("rate", "slow");
    const res = await fetch(`/api/tts?${params.toString()}`);
    if (!res.ok) throw new Error(`TTS error ${res.status}`);

    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.addEventListener("ended", () => URL.revokeObjectURL(url));
    await audio.play();
  } catch {
    speakWithBrowserVoice(text, rate);
  }
}
