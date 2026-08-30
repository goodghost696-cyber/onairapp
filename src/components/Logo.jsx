import { useId } from 'react'
import '../styles/brand.css'

// The VOLTA mark — V-éclair emblem (gradient citron→lavande + aile pleine
// lavande), remplace au 2026-08-30 l'ancienne flèche zigzag stroke-only.
// Extrait tel quel du groupe "VOLTA emblem" de public/logo-volta.svg (voir
// aussi public/volta-mark.svg, la même extraction sauvegardée en fichier
// autonome) — mêmes coordonnées de path et mêmes couleurs de dégradé,
// aucune approximation : ce groupe ne contenait que ces 2 <path>, pas le
// wordmark ni la tagline, donc pas d'ambiguïté à l'extraction.
// Gradient id dérivé de useId() (pas une chaîne fixe) — Landing.jsx monte
// à la fois <Logo> (colonne gauche) ET <SplashIntro> (qui a son propre
// mark inline, même dégradé) simultanément le temps du splash ; deux
// gradients avec le même id littéral dans le même document seraient un
// vrai conflit d'id, pas juste une précaution en l'air.
function Mark() {
  const gradId = useId()
  return (
    <svg viewBox="-200 -10 435 455">
      <defs>
        <linearGradient id={`volta-mark-${gradId}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4F24A" />
          <stop offset="48%" stopColor="#D8C8E8" />
          <stop offset="100%" stopColor="#A78BFA" />
        </linearGradient>
      </defs>
      <path d="M-190 0 L-80 0 L55 235 L-8 340 Z" fill={`url(#volta-mark-${gradId})`} />
      <path d="M110 0 L225 0 L108 168 L174 168 L-8 435 L38 287 L-52 287 L72 112 L30 112 Z" fill="#A78BFA" />
    </svg>
  )
}

// Three declinations of the brand, matching the "ICÔNE APP / LOCKUP
// PRINCIPAL / WORDMARK SEUL" reference:
//   - "icon"     — the mark alone (nav, favicon-sized spots)
//   - "wordmark" — "VOLTA" text alone, Unbounded extra-bold (headers that
//                   already show the mark elsewhere, e.g. next to a PWA icon)
//   - "lockup"   — mark + wordmark together (default). `orientation="column"`
//                   stacks them (splash/auth screens, matches the reference
//                   exactly); `orientation="row"` sits them side by side
//                   (page headers / hero titles that read left to right).
export default function Logo({ variant = 'lockup', orientation = 'column', size = 40, className = '', style }) {
  const icon = (
    <span className="brand-icon" style={{ width: size, height: size }}>
      <Mark />
    </span>
  )
  const word = (
    <span className="brand-wordmark" style={{ fontSize: Math.round(size * 0.42) }}>VOLTA</span>
  )

  if (variant === 'icon') return <span className={`brand-mark ${className}`} style={style}>{icon}</span>
  if (variant === 'wordmark') return <span className={`brand-mark ${className}`} style={style}>{word}</span>

  return (
    <span className={`brand-lockup brand-lockup-${orientation} ${className}`} style={style}>
      {icon}
      {word}
    </span>
  )
}
