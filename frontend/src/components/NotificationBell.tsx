import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { disablePush, enablePush, getPushState, type PushState } from '../utils/push'
import { HiBell, HiOutlineBell } from 'react-icons/hi2'
import ConfirmModal from './ConfirmModal'

interface Aviso {
  id: number
  titulo: string
  cuerpo: string
  url: string
  leida: number
  creado_en: string
}

// Campana con contador y bandeja. Va en UserNavbar y AdminNavbar.
const NotificationBell = () => {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [items, setItems] = useState<Aviso[]>([])
  const [unread, setUnread] = useState(0)
  const [state, setState] = useState<PushState>('off')
  const [error, setError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setItems(data.items)
      setUnread(data.unread)
    } catch {
      /* sin conexión: se queda con lo último que había */
    }
  }, [])

  useEffect(() => {
    const first = setTimeout(load, 0)
    getPushState().then(setState)
    const timer = setInterval(load, 60_000) // respaldo por si el push no llega (iOS, permiso negado)
    return () => {
      clearTimeout(first)
      clearInterval(timer)
    }
  }, [load])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    const onMessage = (e: MessageEvent) => {
      if (e.data?.type === 'push-received') load()
    }
    navigator.serviceWorker.addEventListener('message', onMessage)
    window.addEventListener('focus', load)
    return () => {
      navigator.serviceWorker.removeEventListener('message', onMessage)
      window.removeEventListener('focus', load)
    }
  }, [load])


  const toggle = async () => {
    setError('')
    try {
      setState(state === 'on' ? await disablePush() : await enablePush())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo cambiar')
    }
  }

  const openItem = async (a: Aviso) => {
    await fetch(`/api/notifications/${a.id}/read`, { method: 'PUT', credentials: 'include' })
    setOpen(false)
    load()
    navigate(a.url)
  }

  const readAll = async () => {
    await fetch('/api/notifications/read-all', { method: 'PUT', credentials: 'include' })
    load()
  }

  const clearAll = async () => {
    setError('')
    try {
      const res = await fetch('/api/notifications', { method: 'DELETE', credentials: 'include' })
      if (!res.ok) throw new Error('No se pudieron eliminar las notificaciones')
      setItems([])
      setUnread(0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudieron eliminar las notificaciones')
    }
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-label="Notificaciones"
          className="relative rounded-full p-2 hover:bg-black/5"
        >
          {unread > 0 ? <HiBell className="h-6 w-6" /> : <HiOutlineBell className="h-6 w-6" />}
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 rounded-full bg-red-600 px-1.5 text-xs font-bold text-white">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute right-0 z-50 mt-2 w-80 rounded-lg border bg-white text-gray-900 shadow-lg">
            <div className="flex items-center justify-between border-b px-3 py-2">
              <strong>Notificaciones</strong>
              {unread > 0 && (
                <button type="button" onClick={readAll} className="text-sm text-green-700 underline">
                  Marcar todo como leído
                </button>
              )}
            </div>

            <ul className="max-h-72 overflow-y-auto">
              {items.length === 0 && <li className="px-3 py-4 text-sm text-gray-500">Aún no tienes avisos.</li>}
              {items.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    onClick={() => openItem(a)}
                    className={`block w-full px-3 py-2 text-left hover:bg-gray-50 ${a.leida ? '' : 'bg-green-50'}`}
                  >
                    <span className="block text-sm font-semibold">{a.titulo}</span>
                    <span className="block text-sm text-gray-600">{a.cuerpo}</span>
                  </button>
                </li>
              ))}
            </ul>

            {items.length > 0 && (
              <div className="border-t px-3 py-2 text-right text-sm">
                <button type="button" onClick={() => setConfirmClear(true)} className="text-red-600 underline">
                  Eliminar todas
                </button>
              </div>
            )}

            <div className="border-t px-3 py-2 text-sm">
              {state === 'unsupported' && <span className="text-gray-500">Tu navegador no admite notificaciones push.</span>}
              {state === 'denied' && (
                <span className="text-gray-500">Bloqueaste las notificaciones; actívalas en los permisos del navegador.</span>
              )}
              {(state === 'on' || state === 'off') && (
                <button type="button" onClick={toggle} className="text-green-700 underline">
                  {state === 'on' ? 'Desactivar avisos en este dispositivo' : 'Activar avisos en este dispositivo'}
                </button>
              )}
              {error && <p className="mt-1 text-red-600">{error}</p>}
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        open={confirmClear}
        title="Eliminar notificaciones"
        description="Se eliminarán todas tus notificaciones. Esta acción no se puede deshacer."
        confirmLabel="Eliminar todas"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          setConfirmClear(false)
          void clearAll()
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </>
  )
}

export default NotificationBell