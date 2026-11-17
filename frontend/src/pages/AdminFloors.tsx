import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import Alert from "../components/Alert";
import ConfirmModal from "../components/ConfirmModal";
import Icon from "../components/ui/Icon";
import { useTimedMessage } from "../hooks/useTimedMessage";

interface Floor {
  piso: string | number;
  habitaciones: string;
}

interface Reservation {
  estado: string;
  piso: string | number | null;
  habitacion: string | number | null;
}

const roomsFor = (floor: Floor) => floor.habitaciones.split(",").map((room) => room.trim()).filter(Boolean);

const AdminFloors = () => {
  const navigate = useNavigate();
  const [floors, setFloors] = useState<Floor[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [floorNumber, setFloorNumber] = useState("");
  const [roomNumbers, setRoomNumbers] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingFloor, setDeletingFloor] = useState<string | null>(null);
  const { message, showError, showSuccess, clear } = useTimedMessage();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [roomsResponse, reservationsResponse] = await Promise.all([
        fetch("/api/rooms", { credentials: "include" }),
        fetch("/api/admin/reservations", { credentials: "include" }),
      ]);
      if (roomsResponse.status === 401 || reservationsResponse.status === 401) {
        navigate("/login");
        return;
      }
      if (!roomsResponse.ok || !reservationsResponse.ok) throw new Error("No se pudieron cargar los pisos y reservaciones.");
      const [roomsData, reservationsData] = await Promise.all([roomsResponse.json(), reservationsResponse.json()]);
      setFloors(Array.isArray(roomsData.lista) ? roomsData.lista : []);
      setReservations(Array.isArray(reservationsData) ? reservationsData : []);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron cargar los pisos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Pisos y habitaciones | Panel administrativo";
    void fetchData();
    // La carga inicial solo debe ejecutarse al montar esta página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const occupiedRooms = useMemo(() => reservations.filter((reservation) => reservation.estado === "aceptada"), [reservations]);
  const availableCount = floors.reduce((total, floor) => {
    const rooms = roomsFor(floor);
    return total + rooms.filter((room) => !occupiedRooms.some((reservation) =>
      String(reservation.piso) === String(floor.piso) && String(reservation.habitacion) === room
    )).length;
  }, 0);
  const totalRooms = floors.reduce((total, floor) => total + roomsFor(floor).length, 0);

  const occupiedForFloor = (floor: Floor) => roomsFor(floor).filter((room) => occupiedRooms.some((reservation) =>
    String(reservation.piso) === String(floor.piso) && String(reservation.habitacion) === room
  ));

  const addFloor = async (event: FormEvent<HTMLFormElement>) => {
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
        body: JSON.stringify({ piso: parsedFloor, habitaciones: uniqueRooms.join(", ") }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo agregar el piso.");
      if (Number(result.added) > 0) {
        showSuccess(`Se agregaron ${Number(result.added)} habitaciones al piso ${parsedFloor}.`);
      } else {
        showError("Las habitaciones ingresadas ya estaban registradas.");
      }
      setFloorNumber("");
      setRoomNumbers("");
      await fetchData();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo agregar el piso.");
    } finally {
      setSaving(false);
    }
  };

  const deleteFloor = async (floor: string) => {
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(floor)}`, {
        method: "DELETE",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo eliminar el piso.");
      showSuccess(result.message || "Piso eliminado.");
      await fetchData();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo eliminar el piso.");
    }
  };

  return (
    <AdminNavbar active="floors">
      <div className="admin-page">
        {message && <div className="admin-alert"><Alert type={message.type} onClose={clear}>{message.text}</Alert></div>}
        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>Pisos y habitaciones</h1>
            <p>Organiza la capacidad disponible y consulta la ocupación actual.</p>
          </div>
          <span className="admin-settings-badge"><Icon name="bed" size={14} /> {availableCount} de {totalRooms} disponibles</span>
        </header>

        <div className="admin-floor-layout">
          <section>
            <div className="admin-floor-grid">
              {loading ? <div className="admin-empty">Cargando pisos...</div> : floors.length ? floors.map((floor) => {
                const rooms = roomsFor(floor);
                const occupied = occupiedForFloor(floor);
                const available = rooms.length - occupied.length;
                const percentage = rooms.length ? Math.round((available / rooms.length) * 100) : 0;
                return (
                  <article key={floor.piso} className="admin-floor-card">
                    <header className="admin-floor-head">
                      <span className="admin-floor-icon"><Icon name="building" size={17} /></span>
                      <button
                        type="button"
                        className="admin-floor-delete"
                        disabled={occupied.length > 0}
                        title={occupied.length ? "No se puede eliminar un piso con habitaciones asignadas." : "Eliminar piso"}
                        aria-label={`Eliminar piso ${floor.piso}`}
                        onClick={() => setDeletingFloor(String(floor.piso))}
                      >
                        <Icon name="close" size={15} />
                      </button>
                    </header>
                    <h2>Piso {floor.piso}</h2>
                    <p className="admin-floor-count">{rooms.length} habitaciones · {available} disponibles</p>
                    <div className="admin-floor-meter" aria-label={`${percentage}% de habitaciones disponibles`}>
                      <span style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="admin-room-tags">
                      {rooms.map((room) => {
                        const isOccupied = occupied.includes(room);
                        return <span key={room} className={`admin-room-tag${isOccupied ? " occupied" : ""}`}>{room}</span>;
                      })}
                    </div>
                  </article>
                );
              }) : <div className="admin-empty">No hay pisos registrados todavía.</div>}
            </div>
          </section>

          <form className="admin-panel admin-floor-form" onSubmit={addFloor}>
            <span className="admin-eyebrow">CAPACIDAD</span>
            <h2>Agregar piso</h2>
            <p>Registra un piso y sus habitaciones disponibles.</p>
            <label className="admin-field">
              <span>Número de piso</span>
              <input type="number" min="0" value={floorNumber} onChange={(event) => setFloorNumber(event.target.value)} placeholder="Ej. 4" required />
            </label>
            <label className="admin-field">
              <span>Habitaciones</span>
              <textarea value={roomNumbers} onChange={(event) => setRoomNumbers(event.target.value)} placeholder="Ej. 401, 402, 403" rows={3} required />
              <small>Separa los números con comas.</small>
            </label>
            <button type="submit" className="admin-btn" disabled={saving}>
              <Icon name="plus" size={14} /> {saving ? "Guardando..." : "Agregar piso"}
            </button>
          </form>
        </div>
      </div>

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
