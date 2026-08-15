// Photo de profil si avatarUrl existe, sinon repli sur le cercle-initiale
// existant (comportement par défaut inchangé) — contenu seul, pas de wrapper
// propre : les dimensions/l'interactivité (taille, fond, forme, clic) restent
// gérées par l'élément appelant (ex. .db-avatar-btn sur Dashboard.jsx,
// .set-avatar-btn sur Settings.jsx), pour rester réutilisable sans dupliquer
// le CSS par écran. Voir src/styles/global.css pour .avatar-photo.
export default function Avatar({ name, avatarUrl }) {
  if (avatarUrl) {
    return <img src={avatarUrl} alt="" className="avatar-photo" />
  }
  return (name || 'A').charAt(0).toUpperCase()
}
