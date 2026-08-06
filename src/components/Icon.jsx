// Shared line-icon set — replaces the emoji used as structural UI chrome
// (section headers, nav labels, button icons) across the app with a single
// consistent visual language: 24x24, rounded stroke caps/joins, currentColor
// (inherits whatever color context it's placed in) so it reads as "premium
// SaaS" rather than "emoji picker" — matches the stroke weight/roundness
// already established by the VOLTA mark (Logo.jsx) and the dumbbell icon in
// Workout.jsx's sectionIcons.
//
// Deliberately NOT used for decorative/personality moments (a toast's "👋",
// a weather widget's "☀️/🌧️", celebratory copy) — those stay as real emoji,
// swapping them for line icons would be a downgrade, not an upgrade.
//
// Usage: <Icon name="home" size={20} />
const PATHS = {
  home: 'M3 11.5 12 4l9 7.5 M5.5 10v9a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-9',
  utensils: 'M6 3v7a2 2 0 0 0 4 0V3 M8 3v18 M8 10v11 M17 3c-1.5 0-3 1.5-3 4v4h3v9',
  dumbbell: 'M5 8v8 M19 8v8 M2 10v4 M22 10v4 M5 12h14',
  'message-circle': 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-4-1L3 20l1.2-3.5A8.4 8.4 0 0 1 3 12.5 8.5 8.5 0 0 1 11.5 4 8.5 8.5 0 0 1 21 11.5z',
  settings: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z',
  users: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  'bar-chart': 'M12 20V10 M18 20V4 M6 20v-4',
  clipboard: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1h-4a1 1 0 0 1-1-1z',
  droplet: 'M12 2.5s7 7.5 7 12.5a7 7 0 1 1-14 0c0-5 7-12.5 7-12.5z',
  moon: 'M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11z',
  zap: 'M13 2 4 14h7l-1 8 9-12h-7l1-8z',
  award: 'M12 15a6 6 0 1 0 0-12 6 6 0 0 0 0 12z M8.2 13.8 7 22l5-3 5 3-1.2-8.2',
  key: 'M15.5 8.5a4.5 4.5 0 1 0-4.24 4.5L3 21.24V23h1.76l8.24-8.26A4.5 4.5 0 0 0 15.5 8.5z M15.5 6.5l2 2',
  mic: 'M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z M19 11a7 7 0 0 1-14 0 M12 18v4 M8 22h8',
  camera: 'M4 8a2 2 0 0 1 2-2h1.5l1-1.5h7l1 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2z M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  link: 'M9 17H7a5 5 0 0 1 0-10h2 M15 7h2a5 5 0 0 1 0 10h-2 M8 12h8',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z M12 1v2 M12 21v2 M4.2 4.2l1.4 1.4 M18.4 18.4l1.4 1.4 M1 12h2 M21 12h2 M4.2 19.8l1.4-1.4 M18.4 5.6l1.4-1.4',
  salad: 'M3 12a9 9 0 0 1 18 0z M2 12h20 M9 12V7 M12 5v7 M15 12V7',
  apple: 'M12 8.5c-1.5-2-4.5-2-6 0-2 2.7-1 8 2 11 1 1 2 1.5 3 1.5s2-.5 3-1.5c3-3 4-8.3 2-11-1.5-2-4.5-2-6 0z M12 8c0-2 1-4 3-4.5',
  flame: 'M12 22c4 0 7-2.7 7-7 0-3-1.5-5-3-7-.3 2-1.3 3-2 3.5.3-2.3-.5-5-3-7.5-.5 3-2 5-4 7-1.3 1.3-2 3-2 4.9 0 4.4 3.1 6.1 3 6.1',
  sparkle: 'M12 3v4 M12 17v4 M3 12h4 M17 12h4 M5.5 5.5l2.8 2.8 M15.7 15.7l2.8 2.8 M18.5 5.5l-2.8 2.8 M8.3 15.7l-2.8 2.8',
  check: 'M20 6 9 17l-5-5',
  // "Activity" pulse line — used for running/course rather than a literal
  // running figure. Deliberately echoes the VOLTA mark's own zigzag
  // language (Logo.jsx) so the stat card ties back to the brand instead of
  // introducing an unrelated shape.
  activity: 'M2 12h4l2-7 4 14 3-10 2 3h5',
}

// A couple of icons (footprints) don't reduce cleanly to one stroked path —
// rendered as raw ellipses instead of forcing them into PATHS.
const SHAPES = {
  footprints: (
    <>
      <ellipse cx="8.5" cy="16.5" rx="2.6" ry="4" transform="rotate(-18 8.5 16.5)" />
      <ellipse cx="15.5" cy="8.5" rx="2.6" ry="4" transform="rotate(14 15.5 8.5)" />
      <path d="M6.2 12.2c-.3-1 0-2 .6-2.4 M17.8 20.2c.3-1 0-2-.6-2.4" strokeLinecap="round" />
    </>
  ),
}

export default function Icon({ name, size = 20, strokeWidth = 1.8, className = '', style }) {
  const d = PATHS[name]
  const shape = SHAPES[name]
  if (!d && !shape) return null
  // A single <path> handles multiple "M ..." subpaths natively — each
  // PATHS entry above is one or more subpaths space-joined, no need to
  // split into separate <path> elements.
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }}
    >
      {shape || <path d={d} />}
    </svg>
  )
}
