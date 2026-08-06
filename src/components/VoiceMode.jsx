import { useState, useEffect, useRef } from 'react'
import { createSpeechRecognizer } from '../utils/speech'
import '../styles/voicemode.css'

// Full-screen voice dictation overlay for the AI Coach — the user asked
// for this after sharing a reference (a healthcare app's voice-mode
// screen: glossy orb, live transcript, record button). Adapted the
// interaction pattern, not the literal light/mint healthcare branding —
// same reasoning as the Athlevo style port earlier: this app's own
// dark + gold/violet palette, not someone else's app colors.
export default function VoiceMode({ lang, onClose, onSend }) {
  const [transcript, setTranscript] = useState('')
  const [interim, setInterim] = useState('')
  const [listening, setListening] = useState(false)
  const [error, setError] = useState('')
  const recognizerRef = useRef(null)

  useEffect(() => {
    const recognizer = createSpeechRecognizer(lang === 'fr' ? 'fr-FR' : lang === 'en' ? 'en-US' : 'es-ES')
    if (!recognizer) {
      setError("La dictée vocale n'est pas prise en charge par ce navigateur.")
      return
    }
    recognizerRef.current = recognizer

    recognizer.onresult = e => {
      let finalText = ''
      let interimText = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript
        if (e.results[i].isFinal) finalText += chunk
        else interimText += chunk
      }
      if (finalText) setTranscript(prev => (prev ? `${prev} ` : '') + finalText.trim())
      setInterim(interimText)
    }
    recognizer.onerror = e => {
      if (e.error === 'not-allowed' || e.error === 'permission-denied') {
        setError('Micro refusé — autorise l’accès dans les réglages du navigateur.')
      } else if (e.error !== 'no-speech') {
        setError('Erreur de reconnaissance vocale, réessaie.')
      }
      setListening(false)
    }
    recognizer.onend = () => setListening(false)

    try {
      recognizer.start()
      setListening(true)
    } catch {
      setError('Impossible de démarrer le micro.')
    }

    return () => {
      recognizer.onresult = null
      recognizer.onerror = null
      recognizer.onend = null
      try { recognizer.stop() } catch { /* already stopped */ }
    }
  }, [lang])

  function stopRecognizer() {
    try { recognizerRef.current?.stop() } catch { /* already stopped */ }
  }

  function handleStopAndSend() {
    stopRecognizer()
    const full = `${transcript} ${interim}`.trim()
    if (full) onSend(full)
    onClose()
  }

  function handleClose() {
    stopRecognizer()
    onClose()
  }

  const hasText = !!(transcript || interim)

  return (
    <div className="voice-mode-overlay">
      <button className="voice-mode-close" onClick={handleClose} aria-label="Fermer">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div className={`voice-mode-orb${listening ? ' listening' : ''}`} />

      <div className="voice-mode-transcript">
        {error ? (
          <p className="voice-mode-error">{error}</p>
        ) : (
          <p>
            {transcript}
            {interim && <span className="voice-mode-interim"> {interim}</span>}
            {!hasText && <span className="voice-mode-hint">Parle, je t'écoute…</span>}
          </p>
        )}
      </div>

      <div className="voice-mode-controls">
        <button className="voice-mode-keyboard-btn" onClick={handleClose} aria-label="Revenir au clavier">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="6" width="20" height="12" rx="2"/>
            <line x1="6" y1="10" x2="6.01" y2="10"/><line x1="10" y1="10" x2="10.01" y2="10"/>
            <line x1="14" y1="10" x2="14.01" y2="10"/><line x1="18" y1="10" x2="18.01" y2="10"/>
            <line x1="7" y1="14.5" x2="17" y2="14.5"/>
          </svg>
        </button>
        <button className="voice-mode-send-btn" onClick={handleStopAndSend} disabled={!hasText} aria-label="Envoyer">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
