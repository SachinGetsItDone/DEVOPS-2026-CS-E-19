// Browser-native speech synthesis (Web Speech API)
// Provides clear, natural voice output with zero latency and no external API keys required.

export function isTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function speak(text, { rate = 1 } = {}) {
  if (!isTtsSupported() || !text) return false;

  window.speechSynthesis.cancel();

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = rate;

  const voices = window.speechSynthesis.getVoices();
  const englishVoice =
    voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Online'))) ||
    voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Microsoft') || v.name.includes('Samantha') || v.name.includes('David') || v.name.includes('Zira'))) ||
    voices.find((v) => v.lang.startsWith('en'));

  if (englishVoice) {
    utterance.voice = englishVoice;
    utterance.lang = englishVoice.lang;
  } else {
    utterance.lang = 'en-US';
  }

  window.speechSynthesis.speak(utterance);
  return true;
}

export function stopSpeaking() {
  if (isTtsSupported()) {
    window.speechSynthesis.cancel();
  }
}
