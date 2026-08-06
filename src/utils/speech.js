// Web Speech API wrapper for voice dictation (AICoach's voice mode). No
// polyfill possible — this is a browser API, unsupported in Firefox and
// spotty on iOS Safari, so every caller must check isSpeechRecognitionSupported()
// first and hide/disable the mic entry point rather than offering a
// button that silently does nothing.

export function isSpeechRecognitionSupported() {
  return typeof window !== 'undefined' && !!(window.SpeechRecognition || window.webkitSpeechRecognition)
}

export function createSpeechRecognizer(lang = 'fr-FR') {
  const SR = typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  if (!SR) return null
  const recognizer = new SR()
  recognizer.lang = lang
  recognizer.continuous = true
  recognizer.interimResults = true
  return recognizer
}
