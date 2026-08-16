// Rend utilisable au clavier un élément qui porte un `onClick` sans être un
// contrôle natif — typiquement les cartes `div.card` de l'app, qui ne
// peuvent pas devenir des <button> sans casser leur mise en page.
//
// Trouvé pendant la Phase 2 (2026-08-16) : l'outil de test automatisé ne
// trouvait aucun élément interactif sur la carte d'habitude du Dashboard,
// alors qu'elle se clique. C'est le symptôme exact de ce que vit un
// utilisateur au clavier ou au lecteur d'écran — l'élément n'est ni
// atteignable en Tab, ni annoncé comme un contrôle, ni activable par
// Entrée/Espace. Le curseur `pointer` en CSS ne rend rien accessible.
//
// Usage : <div {...activable(() => faireTruc(), { label: 'Ouvrir X' })}>
// Pour un état on/off, passer `role: 'checkbox'` ou `'switch'` + `aria-checked`.
//
// À NE PAS utiliser sur un élément qui contient déjà un bouton imbriqué :
// un contrôle dans un contrôle est invalide en ARIA et casse la navigation
// clavier plutôt que de l'améliorer (cas connu : la ligne d'exercice de
// WorkoutLibrary.jsx, qui embarque son propre bouton « + AJOUTER »).
export function activable(onActivate, { label, role = 'button', ...rest } = {}) {
  return {
    role,
    tabIndex: 0,
    ...(label ? { 'aria-label': label } : {}),
    ...rest,
    onClick: onActivate,
    onKeyDown: e => {
      // Entrée et Espace : ce que fait un <button> natif. Espace est
      // preventDefault sinon la page défile sous l'utilisateur.
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onActivate(e)
      }
    },
  }
}
