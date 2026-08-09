import { useRef, useState } from 'react'

// Every bottom sheet in the app shows a little grey "handle" bar at the
// top (.modal-handle) — a near-universal convention meaning "drag this
// down to close". Reported directly on a real screenshot: the handle was
// purely decorative, nothing behind it ever listened for a touch, so
// dragging it did nothing. One small hook instead of fixing this
// per-screen — attach `handlers` to the handle element and spread
// `style` onto the sheet's own root to get a working drag-to-dismiss.
//
// Only vertical downward movement is tracked (dragY never goes negative —
// dragging up doesn't do anything, matching how a real bottom sheet
// behaves: it can only be pulled towards where it came from).
export function useSwipeToDismiss(onDismiss, threshold = 80) {
  const startY = useRef(null)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)

  function onTouchStart(e) {
    startY.current = e.touches[0].clientY
    setDragging(true)
  }

  function onTouchMove(e) {
    if (startY.current == null) return
    const delta = e.touches[0].clientY - startY.current
    if (delta > 0) setDragY(delta)
  }

  function onTouchEnd() {
    if (dragY > threshold) {
      onDismiss()
    }
    setDragY(0)
    setDragging(false)
    startY.current = null
  }

  // Merged onto the sheet's own transform (translateX(-50%) for
  // horizontal centering) rather than replacing it — an inline
  // `style.transform` completely overrides the CSS rule's, so leaving
  // out translateX(-50%) here would visibly shift the sheet sideways the
  // instant a drag starts. When not actively dragging, `transform` is
  // left unset so the CSS class's own value (and its entrance animation)
  // keeps working untouched.
  const style = dragY > 0
    ? { transform: `translateX(-50%) translateY(${dragY}px)`, transition: 'none' }
    : { transition: 'transform 200ms ease' }

  return { dragY, dragging, handlers: { onTouchStart, onTouchMove, onTouchEnd }, style }
}
