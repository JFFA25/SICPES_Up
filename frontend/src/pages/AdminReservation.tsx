import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import Alert from "../components/Alert";
import ConfirmModal from "../components/ConfirmModal";
import Pagination from "../components/admin/Pagination";
import Icon from "../components/ui/Icon";
import { useTimedMessage } from "../hooks/useTimedMessage";

interface Reservation {
  id: number;
  nombre: string;
  email: string;
  foto_perfil_url?: string | null;
  fecha_ingreso: string | null;
  tipo: string;
  piso: string | number | null;
  habitacion: string | number | null;
  monto: string | number | null;
  estado: string;
  motivo_rechazo?: string | null;
}

interface FloorRooms {
  piso: string | number;
  habitaciones: string;
}

const FILTERS = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pendiente" },
  { label: "Aceptadas", value: "aceptada" },
  { label: "Rechazadas", value: "rechazada" },
  { label: "Finalizadas", value: "finalizada" },
] as const;

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

const formatDate = (value: string | null) => {
  const date = value?.split("T")[0];
  if (!date) return "—";
  const [year, month, day] = date.split("-").map(Number);
  return year && month && day ? `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}` : "—";
};

const money = (value: string | number | null) =>
  new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 })
    .format(Number(value) || 0);

const statusClass = (status: string) => {
  if (status === "pendiente") return "pending";
  if (status === "aceptada") return "success";
  if (status === "rechazada" || status === "cancelada") return "danger";
  if (status === "finalizada") return "info";
  return "";
};

const AdminReservations = () => {
  const navigate = useNavigate();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [floors, setFloors] = useState<FloorRooms[]>([]);
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["value"]>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [assignment, setAssignment] = useState<Reservation | null>(null);
  const [selectedFloor, setSelectedFloor] = useState("");
  const [selectedRoom, setSelectedRoom] = useState("");
  const [amount, setAmount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rejecting, setRejecting] = useState<number | null>(null);
  const { message, showError, showSuccess, clear } = useTimedMessage();

  const fetchReservations = async () => {
    try {
      const response = await fetch("/api/admin/reservations", { credentials: "include" });
      if (response.status === 401) {
        navigate("/login");
        return;
      }
      if (!response.ok) throw new Error("No se pudieron cargar las reservaciones.");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("La respuesta de reservaciones no es válida.");
      setReservations(data as Reservation[]);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron cargar las reservaciones.");
    }
  };

  const fetchFloors = async () => {
    try {
      const response = await fetch("/api/rooms", { credentials: "include" });
      if (!response.ok) throw new Error("No se pudieron cargar las habitaciones.");
      const data = await response.json();
      setFloors(Array.isArray(data.lista) ? data.lista : []);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron cargar las habitaciones.");
    }
  };

  useEffect(() => {
    document.title = "Reservaciones | Panel administrativo";
    fetchReservations();
    fetchFloors();
    // Las funciones de carga se disparan una vez al montar la página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const counts = useMemo(() => ({
    total: reservations.length,
    pending: reservations.filter((item) => item.estado === "pendiente").length,
    accepted: reservations.filter((item) => item.estado === "aceptada").length,
    rejected: reservations.filter((item) => item.estado === "rechazada" || item.estado === "cancelada").length,
  }), [reservations]);

  const filteredReservations = useMemo(() => reservations.filter((item) => {
    const matchesStatus = filter === "all" ||
        item.estado === filter ||
        (filter === "rechazada" && item.estado === "cancelada");
    const searchText = `${item.nombre} ${item.email} ${item.id} ${item.tipo} ${item.habitacion || ""}`.toLowerCase();
    return matchesStatus && searchText.includes(search.trim().toLowerCase());
  }), [filter, reservations, search]);

  const itemsPerPage = 8;
  const currentItems = filteredReservations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const roomNames = floors.find((floor) => String(floor.piso) === selectedFloor)?.habitaciones
    .split(",").map((room) => room.trim()).filter(Boolean) || [];
  const availableRooms = roomNames.filter((room) => !reservations.some((item) =>
    item.id !== assignment?.id &&
    item.estado === "aceptada" &&
    String(item.piso) === selectedFloor &&
    String(item.habitacion) === room
  ));

  const openAssignment = (item: Reservation) => {
    const initialFloor = item.piso ? String(item.piso) : String(floors[0]?.piso ?? "");
    setAssignment(item);
    setSelectedFloor(initialFloor);
    setSelectedRoom(item.habitacion ? String(item.habitacion) : "");
    setAmount(Number(item.monto) || (item.tipo === "compartida" ? 1800 : 2500));
  };

  const updateReservation = async (id: number, payload: Record<string, unknown>, successText: string) => {
    try {
      const response = await fetch(`/api/admin/reservations/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar la reservación.");
      showSuccess(successText);
      await fetchReservations();
      return true;
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo actualizar la reservación.");
      return false;
    }
  };

  const assignRoom = async () => {
    if (!assignment || !selectedFloor || !availableRooms.includes(selectedRoom)) {
      showError("Selecciona un piso y una habitación disponible.");
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      showError("Ingresa un monto mensual válido.");
      return;
    }

    setSaving(true);
    const updated = await updateReservation(assignment.id, {
      estado: "aceptada",
      piso: selectedFloor,
      habitacion: selectedRoom,
      monto: amount,
    }, "Habitación asignada y reservación aceptada.");
    if (updated) setAssignment(null);
    setSaving(false);
  };

  const updateStatus = async (id: number, estado: string, motivo_rechazo?: string) => {
    await updateReservation(
      id,
      { estado, ...(motivo_rechazo?.trim() ? { motivo_rechazo: motivo_rechazo.trim() } : {}) },
      estado === "finalizada" ? "Reservación finalizada." : "Reservación rechazada."
    );
  };

  const filterCount = (value: (typeof FILTERS)[number]["value"]) =>
    value === "all" ? reservations.length : reservations.filter((item) =>
      item.estado === value || (value === "rechazada" && item.estado === "cancelada")
    ).length;

  return (
    <AdminNavbar active="reservations">
      <div className="admin-page">
        {message && <div className="admin-alert"><Alert type={message.type} onClose={clear}>{message.text}</Alert></div>}

        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>Reservaciones</h1>
            <p>Revisa las solicitudes y asigna habitaciones a los estudiantes.</p>
          </div>
          <button type="button" className="admin-head-action" onClick={() => navigate("/admin/reports")}>
            <Icon name="download" size={14} /> Reportes
          </button>
        </header>

        <div className="admin-stats">
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="users" size={16} /></span><div><strong>{counts.total}</strong><small>Total</small></div></div>
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="clock" size={16} /></span><div><strong>{counts.pending}</strong><small>Pendientes</small></div></div>
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="check" size={16} /></span><div><strong>{counts.accepted}</strong><small>Aceptadas</small></div></div>
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="close" size={16} /></span><div><strong>{counts.rejected}</strong><small>Rechazadas</small></div></div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-filters" aria-label="Filtrar reservaciones">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`admin-filter${filter === item.value ? " active" : ""}`}
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label}{item.value !== "all" && <span> · {filterCount(item.value)}</span>}
              </button>
            ))}
          </div>
          <label className="admin-search">
            <Icon name="search" size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar estudiante..." aria-label="Buscar reservaciones" />
          </label>
        </div>

        <section className="admin-list" aria-label="Lista de reservaciones">
          {currentItems.length ? currentItems.map((item) => (
            <article key={item.id} className="admin-list-row">
              <div className="admin-person">
                <span className="admin-person-avatar">
                  {item.foto_perfil_url ? <img src={item.foto_perfil_url} alt="" /> : initials(item.nombre || "S")}
                </span>
                <div className="admin-person-copy">
                  <strong>{item.nombre || "Estudiante"}</strong>
                  <small>{item.tipo || "Habitación"} · {item.habitacion ? `Hab. ${item.habitacion}` : "Sin asignar"}</small>
                </div>
              </div>
              <div className="admin-cell admin-hide-mobile"><span className={`admin-status ${statusClass(item.estado)}`}>{item.estado}</span></div>
              <div className="admin-cell admin-hide-tablet"><small>INGRESO</small><strong>{formatDate(item.fecha_ingreso)}</strong></div>
              <div className="admin-cell admin-hide-mobile"><small>MENSUAL</small><strong>{money(item.monto)}</strong></div>
              <div className="admin-row-actions">
                {item.estado === "pendiente" ? (
                  <>
                    <button className="admin-btn" type="button" onClick={() => openAssignment(item)}>Asignar</button>
                    <button className="admin-btn danger" type="button" onClick={() => setRejecting(item.id)}>Rechazar</button>
                  </>
                ) : item.estado === "aceptada" ? (
                  <button className="admin-btn secondary" type="button" onClick={() => void updateStatus(item.id, "finalizada")}>Finalizar</button>
                ) : <span className={`admin-status ${statusClass(item.estado)}`}>{item.estado}</span>}
              </div>
            </article>
          )) : (
            <div className="admin-empty">{reservations.length ? "No hay resultados con esos filtros." : "No hay reservaciones para mostrar."}</div>
          )}
          {filteredReservations.length > itemsPerPage && (
            <div className="admin-pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredReservations.length / itemsPerPage)}
                totalItems={filteredReservations.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </section>
      </div>

      {assignment && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !saving) setAssignment(null);
        }}>
          <section className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="assign-title">
            <header className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">GESTIÓN DE RESERVACIONES</span>
                <h2 id="assign-title">Asignar habitación</h2>
                <p>Revisa la solicitud de {assignment.nombre} y asigna un espacio.</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setAssignment(null)} aria-label="Cerrar">×</button>
            </header>
            <div className="admin-modal-body admin-assignment-grid">
              <div>
                <section className="admin-panel">
                  <div className="admin-person admin-assignment-person">
                    <span className="admin-person-avatar">
                      {assignment.foto_perfil_url ? <img src={assignment.foto_perfil_url} alt="" /> : initials(assignment.nombre || "S")}
                    </span>
                    <div className="admin-person-copy"><small>SOLICITANTE</small><strong>{assignment.nombre}</strong><small>{assignment.email}</small></div>
                  </div>
                  <div className="admin-detail-grid">
                    <div className="admin-detail"><small>TIPO DE HABITACIÓN</small><strong>{assignment.tipo || "—"}</strong></div>
                    <div className="admin-detail"><small>FECHA DE INGRESO</small><strong>{formatDate(assignment.fecha_ingreso)}</strong></div>
                    <div className="admin-detail"><small>MONTO ACTUAL</small><strong>{money(assignment.monto)}</strong></div>
                    <div className="admin-detail"><small>ESTADO</small><strong>{assignment.estado}</strong></div>
                  </div>
                </section>
                <section className="admin-panel admin-room-panel">
                  <h3>Habitaciones disponibles</h3>
                  <label className="admin-field">
                    <span>Piso</span>
                    <select value={selectedFloor} onChange={(event) => { setSelectedFloor(event.target.value); setSelectedRoom(""); }}>
                      <option value="">Selecciona un piso</option>
                      {floors.map((floor) => <option key={floor.piso} value={String(floor.piso)}>Piso {floor.piso}</option>)}
                    </select>
                  </label>
                  {roomNames.length ? (
                    <div className="admin-room-options">
                      {roomNames.map((room) => {
                        const isAvailable = availableRooms.includes(room);
                        return (
                          <button
                            key={room}
                            type="button"
                            className={`admin-room-option${selectedRoom === room ? " selected" : ""}`}
                            disabled={!isAvailable}
                            onClick={() => setSelectedRoom(room)}
                          >
                            <span>Habitación {room}</span><small>{isAvailable ? "Disponible" : "Ocupada"}</small>
                          </button>
                        );
                      })}
                    </div>
                  ) : <p className="admin-empty">No hay habitaciones registradas en este piso.</p>}
                </section>
              </div>
              <aside className="admin-panel">
                <span className="admin-eyebrow">DECISIÓN</span>
                <h3>Confirmar asignación</h3>
                <p>Al confirmar, el estudiante recibirá una notificación con los datos de su habitación.</p>
                <label className="admin-field">
                  <span>Monto mensual (MXN)</span>
                  <input type="number" min="1" value={amount} onChange={(event) => setAmount(Number(event.target.value))} />
                </label>
                <div className="admin-assignment-summary">
                  Piso {selectedFloor || "—"} · Habitación {selectedRoom || "—"}
                </div>
              </aside>
            </div>
            <footer className="admin-modal-footer">
              <button type="button" className="admin-btn ghost" onClick={() => setAssignment(null)} disabled={saving}>Cancelar</button>
              <button type="button" className="admin-btn" onClick={assignRoom} disabled={saving || !availableRooms.includes(selectedRoom)}>
                {saving ? "Guardando..." : "Confirmar asignación"}
              </button>
            </footer>
          </section>
        </div>
      )}

      <ConfirmModal
        open={rejecting !== null}
        title="Rechazar reservación"
        description="El motivo se mostrará al estudiante en su panel."
        confirmLabel="Rechazar solicitud"
        cancelLabel="Cancelar"
        tone="danger"
        requireInput={{ label: "Motivo del rechazo", placeholder: "Ej. Documentación incompleta", optional: true }}
        onConfirm={(reason) => {
          if (rejecting !== null) void updateStatus(rejecting, "rechazada", reason);
          setRejecting(null);
        }}
        onCancel={() => setRejecting(null)}
      />
    </AdminNavbar>
  );
};

export default AdminReservations;
