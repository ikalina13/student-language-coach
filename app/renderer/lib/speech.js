// Read words aloud with the English voices that come with Windows (works offline).
let voice = null;

function pick() {
  const voices = window.speechSynthesis ? speechSynthesis.getVoices() : [];
  voice = voices.find((v) => /en[-_](US|GB|PH)/i.test(v.lang) && v.localService)
    || voices.find((v) => /^en/i.test(v.lang)) || null;
}

if (window.speechSynthesis) {
  pick();
  speechSynthesis.addEventListener('voiceschanged', pick);
}

export const canSpeak = () => !!voice;

export function speak(text) {
  if (!voice) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.85;
  speechSynthesis.speak(u);
}
