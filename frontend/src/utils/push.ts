// Utilidades de notificaciones push (PWA). Usa las mismas cookies de sesión que el resto de la app.

const urlBase64ToUint8Array = (base64: string) => {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

export type PushState = 'unsupported' | 'denied' | 'off' | 'on'

export const pushSupported = () =>
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// Estado actual para pintar el botón
export const getPushState = async (): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported'
  if (Notification.permission === 'denied') return 'denied'
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  return sub && Notification.permission === 'granted' ? 'on' : 'off'
}

// Debe llamarse desde un clic del usuario (los navegadores lo exigen para pedir permiso)
export const enablePush = async (): Promise<PushState> => {
  if (!pushSupported()) return 'unsupported'

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return permission === 'denied' ? 'denied' : 'off'

  const keyRes = await fetch('/api/push/public-key')
  if (!keyRes.ok) throw new Error('Las notificaciones no están disponibles en el servidor')
  const { publicKey } = await keyRes.json()

  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    }))

  const res = await fetch('/api/push/subscribe', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscription: sub.toJSON() }),
  })
  if (!res.ok) throw new Error('No se pudo guardar la suscripción')
  return 'on'
}

// Quita la suscripción del dispositivo (también conviene llamarla al cerrar sesión)
export const disablePush = async (): Promise<PushState> => {
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await fetch('/api/push/unsubscribe', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ endpoint: sub.endpoint }),
    }).catch(() => {})
    await sub.unsubscribe()
  }
  return 'off'
}
