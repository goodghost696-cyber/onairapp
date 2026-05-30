const colors = {
  A: { bg: '#1FD66B', text: '#000' },
  B: { bg: '#85C441', text: '#000' },
  C: { bg: '#F5A623', text: '#000' },
  D: { bg: '#E07820', text: '#fff' },
  E: { bg: '#E03020', text: '#fff' },
}

export default function NutriscoreBadge({ score }) {
  const c = colors[score] || colors['C']
  return (
    <span style={{
      background: c.bg,
      color: c.text,
      fontWeight: 700,
      fontSize: 10,
      padding: '2px 7px',
      borderRadius: 3,
      letterSpacing: 1,
      textTransform: 'uppercase',
    }}>
      {score}
    </span>
  )
}
