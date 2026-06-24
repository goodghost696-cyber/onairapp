import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useApp } from '../context/AppContext'
import CalorieRing from '../components/CalorieRing'

const QUOTES = [
  'Reste constant.',
  'Un jour à la fois.',
  "L'effort paie.",
  "Pas d'excuses.",
  'Continue.',
]

const TOTAL = 5

function Block({ active, children }) {
  const [animKey, setAnimKey] = useState(0)
  useEffect(() => {
    if (active) setAnimKey(k => k + 1)
  }, [active])
  return (
    <div style={{ height: '100vh' }}>
      <div key={animKey} style={{ height: '100%', animation: 'blockEnter 300ms ease-out forwards' }}>
        {children}
      </div>
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { appData } = useApp()

  const [block, setBlock] = useState(0)
  const [auto, setAuto] = useState(true)
  const touchY = useRef(null)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'
  const quote = QUOTES[new Date().getDay() % QUOTES.length]

  useEffect(() => {
    if (!auto || block >= TOTAL - 1) { setAuto(false); return }
    const t = setTimeout(() => setBlock(b => b + 1), 2500)
    return () => clearTimeout(t)
  }, [block, auto])

  function stopAuto() { setAuto(false) }

  function goTo(i) { stopAuto(); setBlock(i) }

  function onTouchStart(e) {
    touchY.current = e.touches[0].clientY
    stopAuto()
  }

  function onTouchEnd(e) {
    if (touchY.current === null) return
    const diff = touchY.current - e.changedTouches[0].clientY
    if (Math.abs(diff) > 50) {
      if (diff > 0) setBlock(b => Math.min(b + 1, TOTAL - 1))
      else setBlock(b => Math.max(b - 1, 0))
    }
    touchY.current = null
  }

  const macros = [
    { label: 'Protéines', val: appData.protein, goal: appData.proteinGoal, unit: 'g' },
    { label: 'Glucides',  val: appData.carbs,   goal: appData.carbsGoal,   unit: 'g' },
    { label: 'Lipides',   val: appData.fat,      goal: appData.fatGoal,     unit: 'g' },
  ]

  const metrics = [
    { label: 'Eau',     value: appData.water,             unit: 'ml',  target: 2500,  path: '/hydration' },
    { label: 'Pas',     value: appData.steps,             unit: 'pas', target: 10000, path: '/rings' },
    { label: 'Sommeil', value: appData.sleep?.hours || 0, unit: 'h',   target: 8,     path: '/rings' },
  ]

  return (
    <div
      style={{ width: '100%', height: '100vh', overflow: 'hidden', position: 'relative', background: 'var(--bg)' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onClick={stopAuto}
    >
      {/* Scroll track */}
      <div style={{
        height: `${TOTAL * 100}vh`,
        transform: `translateY(-${block * 100}vh)`,
        transition: 'transform 400ms ease-out',
      }}>

        {/* Block 1 — Salutation */}
        <Block active={block === 0}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 24px 80px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
              ON AIR FITNESS
            </p>
            <h1 style={{ fontSize: 34, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1.2, marginBottom: 10 }}>
              {greeting},<br />{user?.name}.
            </h1>
            <p style={{ fontSize: 16, color: 'var(--text-secondary)', marginBottom: 48 }}>
              Voyons où tu en es.
            </p>
            <p style={{ fontSize: 18, fontStyle: 'italic', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              "{quote}"
            </p>
          </div>
        </Block>

        {/* Block 2 — Calories + macros */}
        <Block active={block === 1}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100%', padding: '0 24px 80px', gap: 36 }}>
            <p style={{ alignSelf: 'flex-start', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase' }}>
              Nutrition
            </p>
            <CalorieRing current={appData.calories} goal={appData.calorieGoal} />
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, width: '100%' }}>
              {macros.map(m => (
                <div key={m.label} style={{ textAlign: 'center' }}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                    {m.label}
                  </p>
                  <p style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>
                    {m.val}
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 400 }}>/{m.goal}{m.unit}</span>
                  </p>
                  <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min((m.val / m.goal) * 100, 100)}%`,
                      background: 'var(--accent)',
                      borderRadius: 2,
                      transition: 'width 600ms ease',
                    }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Block>

        {/* Block 3 — Séance du jour */}
        <Block active={block === 2}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 24px 80px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
              Programme
            </p>
            <div
              onClick={e => { e.stopPropagation(); navigate('/workout') }}
              style={{
                background: 'var(--surface)',
                borderRadius: 16,
                padding: '28px 22px',
                borderLeft: '3px solid var(--accent)',
                cursor: 'pointer',
              }}
            >
              <p style={{ fontSize: 11, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: 10 }}>
                Séance du jour
              </p>
              {appData.todayWorkout ? (
                <>
                  <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 6 }}>
                    {appData.todayWorkout.name}
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                    {appData.todayWorkout.exerciseCount || '–'} exercices · {appData.todayWorkout.duration || '–'} min
                  </p>
                  <button
                    className="btn-accent"
                    style={{ width: '100%' }}
                    onClick={e => { e.stopPropagation(); navigate('/workout') }}
                  >
                    COMMENCER
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 8 }}>
                    Repos actif aujourd'hui.
                  </p>
                  <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                    Récupération active recommandée.
                  </p>
                </>
              )}
            </div>
          </div>
        </Block>

        {/* Block 4 — Métriques rapides */}
        <Block active={block === 3}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 24px 80px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
              Aujourd'hui
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
              {metrics.map(m => {
                const pct = Math.min((m.value / m.target) * 100, 100)
                return (
                  <div
                    key={m.label}
                    onClick={e => { e.stopPropagation(); navigate(m.path) }}
                    style={{ background: 'var(--surface)', borderRadius: 14, padding: '18px 12px', cursor: 'pointer' }}
                  >
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
                      {m.label}
                    </p>
                    <p style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', marginBottom: 2 }}>
                      {m.value}
                    </p>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 12 }}>
                      {m.unit}
                    </p>
                    <div style={{ height: 3, background: 'var(--surface-2)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{
                        height: '100%',
                        width: `${pct}%`,
                        background: 'var(--accent)',
                        borderRadius: 2,
                        transition: 'width 600ms ease',
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </Block>

        {/* Block 5 — Activité */}
        <Block active={block === 4}>
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', height: '100%', padding: '0 24px 80px' }}>
            <p style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.2em', textTransform: 'uppercase', marginBottom: 24 }}>
              Activité
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div
                onClick={e => { e.stopPropagation(); navigate('/workout') }}
                style={{ background: 'var(--surface)', borderRadius: 14, padding: '28px 18px', cursor: 'pointer' }}
              >
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                  Séances
                </p>
                <p style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {appData.weeklyWorkouts || 0}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>cette semaine</p>
              </div>
              <div
                onClick={e => { e.stopPropagation(); navigate('/run') }}
                style={{ background: 'var(--surface)', borderRadius: 14, padding: '28px 18px', cursor: 'pointer' }}
              >
                <p style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 14 }}>
                  Course
                </p>
                <p style={{ fontSize: 40, fontWeight: 900, color: 'var(--text-primary)', lineHeight: 1 }}>
                  {appData.kmRun || 0}
                </p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>km courus</p>
              </div>
            </div>
          </div>
        </Block>

      </div>

      {/* Dot indicators */}
      <div style={{
        position: 'absolute', right: 14, top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
        paddingBottom: 40,
      }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <button
            key={i}
            onClick={e => { e.stopPropagation(); goTo(i) }}
            style={{
              width: 5,
              height: i === block ? 16 : 5,
              borderRadius: 3,
              background: i === block ? 'var(--accent)' : 'var(--surface-2)',
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'height 200ms ease, background 200ms ease',
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes blockEnter {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
