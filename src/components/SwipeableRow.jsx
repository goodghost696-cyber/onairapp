import { useRef, useState } from 'react'

// Reveals action buttons (e.g. "Modifier"/"Supprimer") by swiping the row
// left, instead of always-visible buttons cluttering the card.
export default function SwipeableRow({ children, actions }) {
  const [dragX, setDragX] = useState(0)
  const dragging = useRef(false)
  const openRef = useRef(false)
  const startXRef = useRef(0)
  const actionsWidth = actions.length * 76

  function onPointerDown(e) {
    dragging.current = true
    startXRef.current = e.clientX + (openRef.current ? actionsWidth : 0)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragging.current) return
    const delta = e.clientX - startXRef.current
    setDragX(Math.max(-actionsWidth, Math.min(0, delta)))
  }

  function onPointerUp() {
    if (!dragging.current) return
    dragging.current = false
    const shouldOpen = dragX < -actionsWidth / 2
    openRef.current = shouldOpen
    setDragX(shouldOpen ? -actionsWidth : 0)
  }

  function close() {
    openRef.current = false
    setDragX(0)
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: 12, marginBottom: 8 }}>
      <div style={{ position: 'absolute', top: 0, right: 0, bottom: 0, display: 'flex' }}>
        {actions.map((a, i) => (
          <button
            key={i}
            onClick={() => { a.onClick(); close() }}
            style={{
              width: 76, border: 'none', cursor: 'pointer',
              background: a.color, color: '#fff', fontSize: 11, fontWeight: 700,
              textTransform: 'uppercase', letterSpacing: 0.5,
            }}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        style={{
          transform: `translateX(${dragX}px)`,
          transition: dragging.current ? 'none' : 'transform 200ms ease',
          touchAction: 'pan-y',
        }}
      >
        {children}
      </div>
    </div>
  )
}
