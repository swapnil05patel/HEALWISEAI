// Add type definitions for Web Speech API
type SpeechRecognition = typeof window.SpeechRecognition | typeof window.webkitSpeechRecognition;

interface Window {
  SpeechRecognition: typeof SpeechRecognition;
  webkitSpeechRecognition: typeof SpeechRecognition;
}
