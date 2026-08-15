import { supabase } from '../lib/supabase'
import { resizeImage } from './image'

// Upload une nouvelle photo de profil pour l'utilisateur donné : redimensionne
// côté client (réutilise resizeImage — déjà utilisé par Scan.jsx/Nutrition.jsx
// pour la même raison, garder l'upload petit) à 400px max, puis envoie vers
// Supabase Storage sous "{userId}/avatar.jpg" — chemin FIXE, upsert:true : un
// seul avatar par utilisateur, toujours écrasé, pas de vieux fichiers orphelins
// qui s'accumulent dans le bucket à chaque changement de photo.
//
// La policy Storage restreint l'écriture au premier segment de chemin égal à
// auth.uid() (voir la migration ajoutant le bucket "avatars") — un chemin
// forgé visant le dossier d'un autre utilisateur est rejeté côté serveur,
// quoi que le client envoie.
export async function uploadAvatar(userId, file) {
  const dataUrl = await resizeImage(file, 400)
  const blob = await (await fetch(dataUrl)).blob()
  const path = `${userId}/avatar.jpg`
  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true })
  if (uploadError) throw uploadError
  const { data } = supabase.storage.from('avatars').getPublicUrl(path)
  // Cache-bust : le chemin est fixe (toujours écrasé), donc sans ceci le
  // navigateur/CDN continuerait à servir l'ancienne image en cache après un
  // nouvel upload — le paramètre horodaté force un fetch frais.
  return `${data.publicUrl}?t=${Date.now()}`
}
