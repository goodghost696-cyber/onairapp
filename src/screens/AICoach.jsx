import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import { useLanguage } from '../context/LanguageContext'
import { authHeader } from '../lib/supabase'
import { isSpeechRecognitionSupported } from '../utils/speech'
import VoiceMode from '../components/VoiceMode'
import { BOUNDS, clamp } from '../utils/validation'

const LANG_NAMES = { fr: 'français', en: 'English', es: 'español' }

// Anthropic tool-use definitions — gives the AI Coach the ability to
// actually write to the member's data (nutrition, activité, entraînement)
// instead of only talking about it. Kept to a deliberately small, useful
// subset for this first version rather than trying to cover every screen
// at once: water/steps/km/sleep (all already have a "set today's value"
// concept in AppContext), meals, and single logged exercises.
const TOOLS = [
  {
    name: 'log_water',
    description: "Ajoute une quantité d'eau bue (en ml) au total du jour de l'utilisateur. Utilise ceci quand l'utilisateur dit avoir bu une certaine quantité d'eau.",
    input_schema: {
      type: 'object',
      properties: { ml: { type: 'number', description: "Quantité d'eau en millilitres à ajouter au total du jour, ex: 500" } },
      required: ['ml'],
    },
  },
  {
    name: 'log_steps',
    description: "Enregistre le nombre total de pas du jour (remplace la valeur actuelle, ce n'est pas un ajout).",
    input_schema: {
      type: 'object',
      properties: { steps: { type: 'number', description: "Nombre total de pas aujourd'hui" } },
      required: ['steps'],
    },
  },
  {
    name: 'log_km_run',
    description: "Enregistre la distance totale courue aujourd'hui, en kilomètres (remplace la valeur actuelle).",
    input_schema: {
      type: 'object',
      properties: { km: { type: 'number', description: 'Distance en kilomètres, ex: 5.2' } },
      required: ['km'],
    },
  },
  {
    name: 'log_sleep',
    description: 'Enregistre la durée de sommeil de la nuit dernière.',
    input_schema: {
      type: 'object',
      properties: {
        hours: { type: 'number', description: 'Heures de sommeil (nombre entier)' },
        minutes: { type: 'number', description: 'Minutes supplémentaires, 0 à 59' },
      },
      required: ['hours'],
    },
  },
  {
    name: 'add_meal',
    description: "Ajoute un repas au journal alimentaire du jour avec ses calories et macronutriments. N'invente jamais de chiffres non donnés par l'utilisateur — demande-les si nécessaire plutôt que d'estimer au hasard.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: "Nom du repas ou de l'aliment" },
        calories: { type: 'number', description: 'Calories totales en kcal' },
        protein: { type: 'number', description: 'Protéines en grammes' },
        carbs: { type: 'number', description: 'Glucides en grammes' },
        fat: { type: 'number', description: 'Lipides en grammes' },
        meal_type: { type: 'string', description: 'Type de repas : Petit-déjeuner, Déjeuner, Dîner ou Collation' },
      },
      required: ['name', 'calories'],
    },
  },
  {
    name: 'log_quick_exercise',
    description: "Enregistre un exercice de musculation effectué (séries/répétitions/charge), en dehors d'une séance complète suivie dans l'app.",
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Nom de l\'exercice, ex: Développé couché' },
        sets: { type: 'number', description: 'Nombre de séries' },
        reps: { type: 'number', description: 'Répétitions par série' },
        kg: { type: 'number', description: 'Charge utilisée en kg' },
      },
      required: ['name', 'sets'],
    },
  },
]

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', gap: 4, padding: '12px 16px', alignItems: 'center' }}>
      {[0,1,2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--text-muted)',
          animation: `dotPulse 1.2s ${i*0.2}s ease-in-out infinite`,
        }} />
      ))}
      <style>{`
        @keyframes dotPulse {
          0%,80%,100% { opacity: 0.3; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}

export default function AICoach() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appData, updateData, addMeal, logQuickExercise } = useApp()
  const { lang, t } = useLanguage()
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: `Salut ${user?.name} ! Je suis ton coach IA VOLTA. J'ai accès à toutes tes données du jour. Qu'est-ce qu'on fait ?`,
      ts: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceModeOpen, setVoiceModeOpen] = useState(false)
  const bottomRef = useRef(null)
  const messagesRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const quickPrompts = [
    "Comment j'ai géré ma semaine ?",
    "Donne-moi un défi pour aujourd'hui",
    "Mes points faibles ?",
    "Qu'est-ce que je mange ce soir ?",
  ]

  // Runs one tool call against real app data and returns a short French
  // status string, sent straight back to Claude as the tool_result content
  // — it also doubles as what the model tends to paraphrase in its reply,
  // so it's written to already read like a confirmation, not a log line.
  // Every write here still goes through AppContext's own functions
  // (addMeal, updateData, logQuickExercise), which have their own value
  // clamping — this adds a second clamp pass up front mainly so a wildly
  // out-of-range voice/text number never even reaches those.
  async function executeTool(name, input) {
    try {
      switch (name) {
        case 'log_water': {
          const add = clamp(Number(input.ml), { min: 0, max: BOUNDS.water.max }, 0)
          const total = clamp((appData.water || 0) + add, BOUNDS.water)
          updateData('water', total)
          return `Eau mise à jour : ${total}ml aujourd'hui.`
        }
        case 'log_steps': {
          const total = clamp(Number(input.steps), BOUNDS.steps)
          updateData('steps', total)
          return `Pas mis à jour : ${total}.`
        }
        case 'log_km_run': {
          const total = clamp(Number(input.km), BOUNDS.kmRun)
          updateData('kmRun', total)
          return `Course mise à jour : ${total}km.`
        }
        case 'log_sleep': {
          const hours = clamp(Number(input.hours), BOUNDS.sleepHours)
          const minutes = Math.min(59, Math.max(0, Math.round(Number(input.minutes)) || 0))
          const totalH = hours + minutes / 60
          const quality = totalH >= 7 ? 'GOOD' : totalH >= 5 ? 'FAIR' : 'POOR'
          updateData('sleep', { hours, minutes, quality })
          return `Sommeil enregistré : ${hours}h${minutes}min.`
        }
        case 'add_meal': {
          const calories = clamp(Number(input.calories), BOUNDS.mealKcal)
          const protein = clamp(Number(input.protein) || 0, BOUNDS.mealMacroG)
          const carbs = clamp(Number(input.carbs) || 0, BOUNDS.mealMacroG)
          const fat = clamp(Number(input.fat) || 0, BOUNDS.mealMacroG)
          const name2 = String(input.name || 'Repas').slice(0, 80)
          await addMeal({ name: name2, calories, protein, carbs, fat, mealType: input.meal_type || 'Collation' })
          return `Repas ajouté : ${name2} (${calories} kcal).`
        }
        case 'log_quick_exercise': {
          const setsCount = Math.min(20, Math.max(1, Math.round(Number(input.sets)) || 1))
          const reps = Math.min(100, Math.max(0, Math.round(Number(input.reps)) || 0))
          const kg = Math.min(500, Math.max(0, Number(input.kg) || 0))
          const name2 = String(input.name || 'Exercice').slice(0, 80)
          await logQuickExercise({ name: name2, setsCount, reps, kg })
          return `Exercice enregistré : ${name2}, ${setsCount}x${reps}${kg ? ` à ${kg}kg` : ''}.`
        }
        default:
          return `Outil inconnu : ${name}`
      }
    } catch (err) {
      console.error('[AICoach] executeTool failed', name, err)
      return `L'action "${name}" a échoué côté serveur, réessaie.`
    }
  }

  function buildSystemPrompt() {
    return `T'es le coach IA de ${user?.name} chez VOLTA Fitness.

Tu as accès à toutes ses données :
- Calories aujourd'hui : ${appData?.calories || 0} / ${appData?.calorieGoal || 2400} kcal
- Pas : ${appData?.steps || 0}
- Km courus : ${appData?.kmRun || 0}
- Hydratation : ${appData?.water || 0}ml
- Sommeil : ${appData?.sleep?.hours || 0}h${appData?.sleep?.minutes || 0}min
- Séances cette semaine : ${appData?.weeklyWorkouts || 0}/6
- Objectif : ${user?.goal || 'Prise de masse'}

TON STYLE — OBLIGATOIRE :
— Tu tutoies toujours. Jamais de "vous".
— Ton de coach professionnel : direct, motivant, clair. Chaleureux sans être familier — pas de "mec", pas de surnoms, pas de blagues.
— Exemples de ton correct : "Allez ${user?.name}, belle semaine — continue sur cette lancée.", "1200ml d'eau aujourd'hui, c'est en dessous de ton objectif.", "Tu es sur une bonne dynamique, garde ce rythme."
— Réponses courtes et percutantes. Max 3-4 phrases.
— Tu utilises les vraies données. Jamais de réponses génériques.
— Si le sommeil est mauvais tu le signales. Si les calories sont basses tu interroges.
— Tu termines parfois par une question ou un défi court.
— LANGUE : Réponds toujours en ${lang === 'fr' ? 'français' : lang === 'en' ? 'anglais' : 'espagnol'}.

ACTIONS CONCRÈTES :
— Tu as des outils pour écrire réellement dans les données de l'utilisateur (eau, pas, course, sommeil, repas, exercices). Utilise-les dès qu'il te donne une info exploitable à l'oral ou à l'écrit — ex: "j'ai bu 500ml", "ajoute une salade au déjeuner, 400 kcal", "j'ai fait 8000 pas".
— N'invente jamais un chiffre qu'il ne t'a pas donné (calories, macros...) — demande-le plutôt que de l'estimer au hasard.
— Une fois l'outil exécuté, confirme en une phrase courte avec le chiffre exact enregistré. Ne redécris pas l'action en détail, confirme juste.`
  }

  async function sendMessage(text) {
    if (!text.trim() || loading) return
    const userMsg = { role: 'user', content: text, ts: new Date() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)

    let convo = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }))
    const system = buildSystemPrompt()

    try {
      let finalText = null
      const actionsLog = []

      // Up to 4 rounds: most turns resolve in 1 (no tool) or 2 (one tool
      // call then a text reply) — the cap just guards against the model
      // looping on tool calls instead of ever producing a final answer.
      for (let round = 0; round < 4 && finalText === null; round++) {
        const res = await fetch('/api/claude', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(await authHeader()),
          },
          body: JSON.stringify({
            model: 'claude-haiku-4-5-20251001',
            max_tokens: 1000,
            system,
            messages: convo,
            tools: TOOLS,
          }),
        })

        if (!res.ok) throw new Error('API error')
        const data = await res.json()
        const blocks = data.content || []
        const toolUses = blocks.filter(b => b.type === 'tool_use')

        if (toolUses.length === 0) {
          finalText = blocks.map(b => b.type === 'text' ? b.text : '').join('').trim()
          break
        }

        const resultBlocks = []
        for (const tu of toolUses) {
          const resultText = await executeTool(tu.name, tu.input || {})
          actionsLog.push(resultText)
          resultBlocks.push({ type: 'tool_result', tool_use_id: tu.id, content: resultText })
        }
        convo = [...convo, { role: 'assistant', content: blocks }, { role: 'user', content: resultBlocks }]
      }

      const aiMsg = { role: 'assistant', content: finalText || actionsLog.join(' ') || '...', ts: new Date() }
      setMessages(prev => [...prev, aiMsg])
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connexion perdue. Réessaie.',
        ts: new Date(),
        error: true,
      }])
    } finally {
      setLoading(false)
    }
  }

  function fmt(d) {
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="app-wrapper" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
      {/* Header */}
      <div className="screen-header" style={{
        padding: '20px 16px 12px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 12,
        flexShrink: 0,
        background: 'var(--bg)',
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }} onClick={() => navigate('/dashboard')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="var(--text-primary)">
            <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/>
          </svg>
        </button>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, lineHeight: '28px' }}>{t('ai_coach_title')}</h1>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{t('powered_by')}</span>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesRef}
        style={{
          position: 'absolute',
          top: 73,
          left: 0, right: 0,
          bottom: 185,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '12px 16px',
              borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role === 'user' ? 'var(--accent)' : 'var(--surface)',
              border: m.role === 'user' ? 'none' : `1px solid ${m.error ? 'var(--danger)' : 'var(--border)'}`,
              color: m.role === 'user' ? '#000' : 'var(--text-primary)',
              fontSize: 15,
              lineHeight: '22px',
            }}>
              {m.content}
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{fmt(m.ts)}</span>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px 16px 16px 4px' }}>
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area — fixed above nav */}
      <div style={{
        position: 'fixed',
        bottom: 100,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 'calc(100% - 32px)',
        // Was 358 (= old 390px root cap - 32px margin), never updated when
        // #root's cap moved to 480px — left this the one input bar in the
        // app still visibly narrower than everything around it on any real
        // phone wider than ~390 CSS px. 448 = 480 - 32, matches the rest.
        maxWidth: 448,
        zIndex: 90,
        background: 'var(--bg)',
        borderTop: '1px solid var(--border)',
        paddingTop: 12,
      }}>
        {/* Quick prompts */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 10, paddingBottom: 2 }}>
          {quickPrompts.map(p => (
            <button key={p} onClick={() => sendMessage(p)} style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-secondary)',
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 50,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              flexShrink: 0,
            }}>{p}</button>
          ))}
        </div>
        {/* Text input */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
            placeholder={t('chat_placeholder')}
            style={{ flex: 1, borderRadius: 10 }}
          />
          {/* Mic only shown when the browser actually supports it (Web
              Speech API — no Firefox, spotty on iOS Safari) rather than
              offering a button that would silently do nothing. */}
          {isSpeechRecognitionSupported() && (
            <button onClick={() => setVoiceModeOpen(true)} aria-label="Dicter un message" style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              color: 'var(--text-primary)',
              width: 40,
              cursor: 'pointer',
              borderRadius: 10,
              flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
                <path d="M19 10v2a7 7 0 01-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
          <button onClick={() => sendMessage(input)} style={{
            background: 'var(--accent)',
            border: 'none',
            color: 'var(--accent-ink)',
            padding: '0 20px',
            cursor: 'pointer',
            borderRadius: 10,
            flexShrink: 0,
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="var(--accent-ink)">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
            </svg>
          </button>
        </div>
      </div>

      {voiceModeOpen && (
        <VoiceMode
          lang={lang}
          onClose={() => setVoiceModeOpen(false)}
          onSend={text => sendMessage(text)}
        />
      )}
    </div>
  )
}
