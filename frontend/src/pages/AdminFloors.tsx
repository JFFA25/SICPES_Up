import { useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import Alert from "../components/Alert";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/ui/Icon";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { photosOf, useRoomDetails } from "../hooks/useRoomDetails";
import type { RoomDetail } from "../hooks/useRoomDetails";
import "../styles/rooms.css";

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const DEFAULT_CAPACITY = { individual: 1, compartida: 2 } as const;

const readError = async (response: Response, fallback: string) => {
  const result = await response.json().catch(() => ({}));
  return typeof result.error === "string" ? result.error : fallback;
};

/* ── Modal para editar una habitación y sus fotos ───────────────────────── */
interface RoomEditorProps {
  room: RoomDetail;
  onClose: () => void;
  onChanged: () => Promise<void>;
  showError: (text: string) => void;
  showSuccess: (text: string) => void;
}

const RoomEditor = ({ room, onClose, onChanged, showError, showSuccess }: RoomEditorProps) => {
  const [tipo, setTipo] = useState<RoomDetail["tipo"]>(room.tipo);
  const [capacidad, setCapacidad] = useState(room.capacidad);
  const [descripcion, setDescripcion] = useState(room.descripcion ?? "");
  const [activa, setActiva] = useState(room.activa);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [busyPhoto, setBusyPhoto] = useState<number | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<number | null>(null);
  const [deletingRoom, setDeletingRoom] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Evita que la página de fondo se desplace mientras el modal está abierto.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const hasOccupants = room.ocupantes > 0;

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch(`/api/rooms/${room.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ tipo, capacidad, descripcion: descripcion.trim(), activa }),
      });
      if (!response.ok) throw new Error(await readError(response, "No se pudo guardar la habitación."));
      showSuccess(`Habitación ${room.habitacion} actualizada.`);
      await onChanged();
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo guardar la habitación.");
    } finally {
      setSaving(false);
    }
  };

  const uploadFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;

    setUploading(true);
    let uploaded = 0;
    for (const file of files) {
      if (file.size > MAX_PHOTO_BYTES) {
        showError(`"${file.name}" pesa más de 5 MB.`);
        continue;
      }
      const body = new FormData();
      body.append("photo", file);
      try {
        const response = await fetch(`/api/rooms/${room.id}/photos`, { method: "POST", credentials: "include", body });
        if (!response.ok) throw new Error(await readError(response, "No se pudo subir la foto."));
        uploaded += 1;
        await onChanged();
      } catch (error) {
        showError(error instanceof Error ? error.message : "No se pudo subir la foto.");
        break;
      }
    }
    if (uploaded) showSuccess(uploaded === 1 ? "Foto subida." : `${uploaded} fotos subidas.`);
    setUploading(false);
  };

  const makeCover = async (photoId: number) => {
    setBusyPhoto(photoId);
    try {
      const response = await fetch(`/api/rooms/photos/${photoId}/cover`, { method: "PUT", credentials: "include" });
      if (!response.ok) throw new Error(await readError(response, "No se pudo cambiar la portada."));
      await onChanged();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo cambiar la portada.");
    } finally {
      setBusyPhoto(null);
    }
  };

  const removePhoto = async (photoId: number) => {
    setBusyPhoto(photoId);
    try {
      const response = await fetch(`/api/rooms/photos/${photoId}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(await readError(response, "No se pudo eliminar la foto."));
      showSuccess("Foto eliminada.");
      await onChanged();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar la foto.");
    } finally {
      setBusyPhoto(null);
    }
  };

  const removeRoom = async () => {
    try {
      const response = await fetch(`/api/rooms/item/${room.id}`, { method: "DELETE", credentials: "include" });
      if (!response.ok) throw new Error(await readError(response, "No se pudo eliminar la habitación."));
      showSuccess(`Habitación ${room.habitacion} eliminada del piso ${room.piso}.`);
      await onChanged();
      onClose();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar la habitación.");
    }
  };

  return (
    <div
      className="admin-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose();
      }}
    >
      <section className="admin-modal admin-room-modal" role="dialog" aria-modal="true" aria-labelledby="room-editor-title" style={{ width: "min(100%, 680px)" }}>
        <header className="admin-modal-header">
          <div>
            <span className="admin-eyebrow">PISO {room.piso}</span>
            <h2 id="room-editor-title">Habitación {room.habitacion}</h2>
            <p>
              {hasOccupants
                ? `${room.ocupantes} reservación(es) activa(s) en esta habitación.`
                : "Sin reservaciones activas."}
            </p>
          </div>
          <button type="button" className="admin-modal-close" onClick={onClose} aria-label="Cerrar">×</button>
        </header>

        <div className="admin-modal-body">
          <div className="admin-edit-grid">
            <label className="admin-field">
              <span>Tipo</span>
              <select
                value={tipo}
                disabled={hasOccupants}
                onChange={(event) => {
                  const next = event.target.value as RoomDetail["tipo"];
                  setTipo(next);
                  setCapacidad(DEFAULT_CAPACITY[next]);
                }}
              >
                <option value="individual">Individual</option>
                <option value="compartida">Compartida</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Capacidad (personas)</span>
              <input
                type="number"
                min={Math.max(room.ocupantes, 1)}
                max={6}
                value={capacidad}
                onChange={(event) => setCapacidad(Number(event.target.value))}
              />
            </label>
            <label className="admin-field full">
              <span>Descripción (opcional)</span>
              <textarea
                rows={2}
                maxLength={255}
                value={descripcion}
                onChange={(event) => setDescripcion(event.target.value)}
                placeholder="Ej. Ventana al jardín, escritorio y closet amplio."
              />
            </label>
            <label className="admin-toggle full">
              <input type="checkbox" checked={activa} disabled={hasOccupants && activa} onChange={(event) => setActiva(event.target.checked)} />
              Visible para reservar
            </label>
          </div>
          {hasOccupants && (
            <p className="admin-eyebrow" style={{ textTransform: "none", letterSpacing: 0, marginBottom: 12 }}>
              Con reservaciones activas no se puede cambiar el tipo, desactivar ni eliminar la habitación.
            </p>
          )}

          <span className="admin-eyebrow">FOTOS ({room.fotos.length}/8)</span>
          <div className="admin-photo-grid" style={{ marginTop: 8 }}>
            {room.fotos.map((photo, index) => (
              <figure key={photo.id} className="admin-photo" style={{ margin: 0 }}>
                <img src={photo.url} alt={`Foto ${index + 1} de la habitación ${room.habitacion}`} loading="lazy" />
                {index === 0 && <span className="admin-photo-cover">PORTADA</span>}
                <div className="admin-photo-actions">
                  {index !== 0 && (
                    <button type="button" disabled={busyPhoto === photo.id} onClick={() => void makeCover(photo.id)}>Portada</button>
                  )}
                  <button type="button" className="danger" disabled={busyPhoto === photo.id} onClick={() => setDeletingPhoto(photo.id)}>Quitar</button>
                </div>
              </figure>
            ))}
            {room.fotos.length < 8 && (
              <button
                type="button"
                className={`admin-photo-add${uploading ? " busy" : ""}`}
                onClick={() => fileInput.current?.click()}
                disabled={uploading}
              >
                <Icon name="upload" size={18} />
                <span>{uploading ? "Subiendo..." : "Subir fotos"}</span>
              </button>
            )}
          </div>
          <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={uploadFiles} />
          {room.fotos.length === 0 && (
            <p style={{ margin: "8px 0 0", color: "#66766A", fontSize: 9 }}>
              Sin fotos: los estudiantes verán una imagen genérica. JPG, PNG o WebP, máximo 5 MB cada una.
            </p>
          )}
        </div>

        <footer className="admin-modal-footer">
          <button type="button" className="admin-btn danger admin-modal-danger" disabled={hasOccupants || saving} onClick={() => setDeletingRoom(true)}>
            Eliminar habitación
          </button>
          <button type="button" className="admin-btn ghost" onClick={onClose} disabled={saving}>Cancelar</button>
          <button type="button" className="admin-btn" onClick={() => void save()} disabled={saving || uploading}>
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </footer>
      </section>

      <ConfirmModal
        open={deletingPhoto !== null}
        title="Quitar foto"
        description="La foto dejará de mostrarse en la residencia y en esta habitación."
        confirmLabel="Quitar foto"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          if (deletingPhoto !== null) void removePhoto(deletingPhoto);
          setDeletingPhoto(null);
        }}
        onCancel={() => setDeletingPhoto(null)}
      />
      <ConfirmModal
        open={deletingRoom}
        title="Eliminar habitación"
        description={`¿Eliminar la habitación ${room.habitacion} del piso ${room.piso} junto con sus fotos? Esta acción no se puede deshacer.`}
        confirmLabel="Eliminar habitación"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          setDeletingRoom(false);
          void removeRoom();
        }}
        onCancel={() => setDeletingRoom(false)}
      />
    </div>
  );
};

/* ── Página ─────────────────────────────────────────────────────────────── */
const AdminFloors = () => {
  const navigate = useNavigate();
  const { rooms, loading, error, unauthorized, reload } = useRoomDetails(true);
  const [floorNumber, setFloorNumber] = useState("");
  const [roomNumbers, setRoomNumbers] = useState("");
  const [newTipo, setNewTipo] = useState<RoomDetail["tipo"]>("individual");
  const [newCapacidad, setNewCapacidad] = useState<number>(DEFAULT_CAPACITY.individual);
  const [saving, setSaving] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const { message, showError, showSuccess, clear } = useTimedMessage();

  useEffect(() => {
    document.title = "Pisos y habitaciones | Panel administrativo";
  }, []);

  useEffect(() => {
    if (unauthorized) navigate("/login");
  }, [unauthorized, navigate]);

  useEffect(() => {
    if (error) showError(error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  const floors = useMemo(() => {
    const grouped = new Map<string, RoomDetail[]>();
    rooms.forEach((room) => grouped.set(room.piso, [...(grouped.get(room.piso) ?? []), room]));
    return Array.from(grouped.entries());
  }, [rooms]);

  const activeRooms = rooms.filter((room) => room.activa);
  const totalSpots = activeRooms.reduce((total, room) => total + room.capacidad, 0);
  const freeSpots = activeRooms.reduce((total, room) => total + room.cupos, 0);
  const editingRoom = rooms.find((room) => room.id === editingId) ?? null;

  const addRooms = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsedFloor = floorNumber.trim();
    const uniqueRooms = Array.from(new Set(roomNumbers.split(",").map((room) => room.trim()).filter(Boolean)));
    if (!parsedFloor || uniqueRooms.length === 0) {
      showError("Ingresa el número del piso y al menos una habitación.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ piso: parsedFloor, habitaciones: uniqueRooms.join(", "), tipo: newTipo, capacidad: newCapacidad }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo agregar las habitaciones.");
      if (Number(result.added) > 0) {
        showSuccess(`Se agregaron ${Number(result.added)} habitaciones al piso ${parsedFloor}.`);
      } else {
        showError("Las habitaciones ingresadas ya estaban registradas.");
      }
      setFloorNumber("");
      setRoomNumbers("");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo agregar las habitaciones.");
    } finally {
      setSaving(false);
    }
  };

  const deleteFloor = async (floor: string) => {
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(floor)}`, { method: "DELETE", credentials: "include" });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar el piso.");
      showSuccess(result.message || "Piso eliminado.");
      await reload();
    } catch (err) {
      showError(err instanceof Error ? err.message : "No se pudo eliminar el piso.");
    }
  };

  const addToFloor = (floor: string) => {
    setFloorNumber(floor);
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  return (
    <AdminNavbar active="floors">
      <div className="admin-page">
        {message && <div className="admin-alert"><Alert type={message.type} onClose={clear}>{message.text}</Alert></div>}
        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>Pisos y habitaciones</h1>
            <p>Edita el tipo, la capacidad y las fotos de cada habitación. Los cambios se ven al instante en la residencia y al reservar.</p>
          </div>
          <span className="admin-settings-badge"><Icon name="bed" size={14} /> {freeSpots} de {totalSpots} lugares disponibles</span>
        </header>

        <div className="admin-floor-layout">
          <section>
            <div className="admin-floor-grid">
              {loading ? <div className="admin-empty">Cargando pisos...</div> : floors.length ? floors.map(([floor, floorRooms]) => {
                const spots = floorRooms.filter((room) => room.activa).reduce((total, room) => total + room.capacidad, 0);
                const free = floorRooms.filter((room) => room.activa).reduce((total, room) => total + room.cupos, 0);
                const percentage = spots ? Math.round((free / spots) * 100) : 0;
                const hasOccupied = floorRooms.some((room) => room.ocupantes > 0);
                return (
                  <article key={floor} className="admin-floor-card">
                    <header className="admin-floor-head">
                      <span className="admin-floor-icon"><Icon name="building" size={17} /></span>
                      <button
                        type="button"
                        className="admin-floor-delete"
                        disabled={hasOccupied}
                        title={hasOccupied ? "No se puede eliminar un piso con habitaciones asignadas." : "Eliminar piso"}
                        aria-label={`Eliminar piso ${floor}`}
                        onClick={() => setDeletingFloor(floor)}
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </header>
                    <h2>Piso {floor}</h2>
                    <p className="admin-floor-count">{floorRooms.length} habitaciones · {free} de {spots} lugares libres</p>
                    <div className="admin-floor-meter" aria-label={`${percentage}% de lugares disponibles`}>
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="admin-room-chips">
                      {floorRooms.map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          className={`admin-room-chip${room.ocupantes > 0 ? " occupied" : ""}${room.activa ? "" : " inactive"}`}
                          title={`Editar habitación ${room.habitacion}`}
                          onClick={() => setEditingId(room.id)}
                        >
                          {room.habitacion}
                          <i>{room.tipo === "compartida" ? "C" : "I"}</i>
                          {photosOf(room).length > 0 && room.fotos.length > 0 && <Icon name="upload" size={10} />}
                        </button>
                      ))}
                      <button type="button" className="admin-room-chip" onClick={() => addToFloor(floor)} title="Agregar habitaciones a este piso">
                        <Icon name="plus" size={10} /> Agregar
                      </button>
                    </div>
                  </article>
                );
              }) : <div className="admin-empty">No hay pisos registrados todavía.</div>}
            </div>
            <p style={{ margin: "10px 2px 0", color: "#66766A", fontSize: 9 }}>
              I = individual · C = compartida · en amarillo, con reservaciones activas · con ícono, ya tiene fotos. Toca una habitación para editarla.
            </p>
          </section>

          <form ref={formRef} className="admin-panel admin-floor-form" onSubmit={addRooms}>
            <span className="admin-eyebrow">CAPACIDAD</span>
            <h2>Agregar piso o habitaciones</h2>
            <p>Para sumar habitaciones a un piso existente, escribe su mismo número de piso.</p>
            <label className="admin-field">
              <span>Número de piso</span>
              <input type="number" min="0" value={floorNumber} onChange={(event) => setFloorNumber(event.target.value)} placeholder="Ej. 4" required />
            </label>
            <label className="admin-field">
              <span>Habitaciones</span>
              <textarea value={roomNumbers} onChange={(event) => setRoomNumbers(event.target.value)} placeholder="Ej. 401, 402, 403" rows={3} required />
              <small>Separa los números con comas.</small>
            </label>
            <label className="admin-field">
              <span>Tipo</span>
              <select
                value={newTipo}
                onChange={(event) => {
                  const next = event.target.value as RoomDetail["tipo"];
                  setNewTipo(next);
                  setNewCapacidad(DEFAULT_CAPACITY[next]);
                }}
              >
                <option value="individual">Individual</option>
                <option value="compartida">Compartida</option>
              </select>
            </label>
            <label className="admin-field">
              <span>Capacidad (personas)</span>
              <input type="number" min="1" max="6" value={newCapacidad} onChange={(event) => setNewCapacidad(Number(event.target.value))} />
            </label>
            <button type="submit" className="admin-btn" disabled={saving}>
              <Icon name="plus" size={14} /> {saving ? "Guardando..." : "Agregar"}
            </button>
          </form>
        </div>
      </div>

      {editingRoom && (
        <RoomEditor
          key={editingRoom.id}
          room={editingRoom}
          onClose={() => setEditingId(null)}
          onChanged={reload}
          showError={showError}
          showSuccess={showSuccess}
        />
      )}

      <ConfirmModal
        open={deletingFloor !== null}
        title="Eliminar piso"
        description={deletingFloor ? `¿Eliminar el piso ${deletingFloor} y todas sus habitaciones? Esta acción no se puede deshacer.` : undefined}
        confirmLabel="Eliminar piso"
        cancelLabel="Cancelar"
        tone="danger"
        onConfirm={() => {
          if (deletingFloor) void deleteFloor(deletingFloor);
          setDeletingFloor(null);
        }}
        onCancel={() => setDeletingFloor(null)}
      />
    </AdminNavbar>
  );
};

export default AdminFloors;
