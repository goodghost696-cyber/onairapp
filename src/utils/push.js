import { supabase } from '../lib/supabase'

// Web Push public key, safe to ship client-side (only the private key on
// the server can actually sign/send with it).
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

// applicationServerKey needs a Uint8Array, not the base64url string the
// VAPID key comes as — standard conversion for the Push API.
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export function isPushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && !!VAPID_PUBLIC_KEY
}

// iOS restricts the Push API to an installed (home-screen/standalone) PWA
// — a regular Safari tab always fails isPushSupported() there, silently,
// with nothing in the DOM to explain why (reported directly: "ne propose
// rien... je dois avoir le choix"). This tells the UI whether that's
// *why*, so it can say "install to your home screen" instead of just
// showing nothing.
export function isIOSNotStandalone() {
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches
  return isIOS && !isStandalone
}

export async function getPushSubscriptionState() {
  if (!isPushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const registration = await navigator.serviceWorker.ready
  const existing = await registration.pushManager.getSubscription()
  return existing ? 'subscribed' : 'unsubscribed'
}

export async function subscribeToPush(userId) {
  if (!isPushSupported() || !userId) return { success: false }
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return { success: false, error: 'permission-denied' }

  const registration = await navigator.serviceWorker.ready
  let subscription = await registration.pushManager.getSubscription()
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
  }

  const json = subscription.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
  }, { onConflict: 'endpoint' })

  if (error) {
    console.error('[push] subscribeToPush: upsert failed', error)
    return { success: false, error }
  }
  return { success: true }
}

export async function unsubscribeFromPush() {
  if (!isPushSupported()) return { success: false }
  const registration = await navigator.serviceWorker.ready
  const subscription = await registration.pushManager.getSubscription()
  if (!subscription) return { success: true }

  const endpoint = subscription.endpoint
  await subscription.unsubscribe()
  const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
  if (error) console.error('[push] unsubscribeFromPush: delete failed', error)
  return { success: true }
}
