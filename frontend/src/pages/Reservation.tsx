import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, ChevronDown, LoaderCircle } from "lucide-react";
import ResidentLayout from "../components/ResidentLayout";
import Icon from "../components/ui/Icon";
import DatePicker, { registerLocale } from "react-datepicker";

import { es } from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";
import Alert from "../components/Alert";
import { useTimedMessage } from "../hooks/useTimedMessage";
import { money, photosOf, useRoomDetails } from "../hooks/useRoomDetails";
import "../styles/rooms.css";

registerLocale("es", es);

interface DropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomDropdownProps {
  options: DropdownOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  disabled?: boolean;
  label: string;
}

const CustomDropdown = ({ options, value, onChange, placeholder, disabled, label }: CustomDropdownProps) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handleClickOutside = () => setOpen(false);
    if (open) {
      setTimeout(() => document.addEventListener('click', handleClickOutside), 10);
    }
    return () => document.removeEventListener('click', handleClickOutside);
  }, [open]);

  return (
    <div className="relative w-full">
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
          }
        }}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            e.preventDefault();
            setOpen(!open);
          }
        }}
        className={`mk-reservation-select${disabled ? " disabled" : ""}${open ? " open" : ""}`}
      >
        <span className={value ? "" : "placeholder"}>
          {value ? options.find((o) => o.value === value)?.label : placeholder}
        </span>
        <ChevronDown className={open ? "rotate-180" : ""} size={16} strokeWidth={2} />
      </div>

      {open && (
        <div role="listbox" className="mk-reservation-options">
          {options.length === 0 ? (
            <div className="mk-reservation-option muted">No hay opciones</div>
          ) : (
            options.map((o) => (
              <div
                key={o.value}
                role="option"
                aria-selected={value === o.value}
                onClick={() => {
                  if (!o.disabled) {
                    onChange(o.value);
                    setOpen(false);
                  }
                }}
                className={`mk-reservation-option${o.disabled ? " disabled" : ""}`}
              >
                {o.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

const Reservation = () => {

  useEffect(() => {
    document.title = "Reservación";
  }, []);

  const navigate = useNavigate();
  const [user, setUser] = useState<{ nombre?: string; foto_perfil_url?: string | null } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    fecha_ingreso: today,
    piso: "",
    habitacion: "",
  });

  const [tipoFilter, setTipoFilter] = useState<"" | "individual" | "compartida">("");
  const [hasReservation, setHasReservation] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const { rooms, loading: loadingRooms, error: roomsError, reload: reloadRooms } = useRoomDetails();
  const { message, showError, showSuccess, clear } = useTimedMessage();

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const res = await fetch("/api/session", { credentials: "include" });
        if (!res.ok) {
          navigate("/login");
          return;
        }
        setUser(await res.json());
      } catch {
        navigate("/login");
      }
    };
    fetchSession();
  }, [navigate]);

  const floors = Array.from(new Set(rooms.map((room) => room.piso)));
  const visibleRooms = rooms.filter(
    (room) => room.piso === form.piso && (!tipoFilter || room.tipo === tipoFilter)
  );
  const selectedRoom = rooms.find((room) => room.piso === form.piso && room.habitacion === form.habitacion);
  const tipo = selectedRoom?.tipo ?? "";
  const monto = selectedRoom?.precio ?? 0;
  const photos = photosOf(selectedRoom);
  const fechaIngreso = form.fecha_ingreso
    ? new Date(`${form.fecha_ingreso}T12:00:00`).toLocaleDateString("es-MX", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
    : "—";

  // VERIFICAR SI YA TIENE RESERVACIÓN
  useEffect(() => {
    const checkReservation = async () => {
      try {
        const res = await fetch(`/api/reservation/me`, {
          credentials: "include",
        });

        const data = await res.json();

        if (data && !["finalizada", "cancelada", "rechazada"].includes(data.estado)) {
          setHasReservation(true);
        }

      } catch (err) {
        console.error("Error al verificar reservación:", err);
      }
    };

    checkReservation();
  }, []);

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasReservation) {
      showError("Ya tienes una reservación registrada");
      return;
    }

    if (!form.fecha_ingreso || !form.piso || !form.habitacion || !selectedRoom) {
      showError("Elige la fecha, el piso y una habitación.");
      return;
    }

    if (!selectedRoom.disponible) {
      showError("Esta habitación ya está ocupada. Elige otra.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/reservation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        // El servidor toma el tipo y el precio de la habitación elegida.
        body: JSON.stringify({ ...form, tipo, monto }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "No se pudo registrar la reservación.");
        setIsSubmitting(false);
        void reloadRooms();
        return;
      }

      showSuccess("Reservación enviada correctamente.");
      setHasReservation(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1500);

    } catch {
      showError("Error al conectar con el servidor");
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <ResidentLayout active="reservation">
        <div className="mk-card" role="status">Cargando tus datos…</div>
      </ResidentLayout>
    );
  }

  return (
    <ResidentLayout active="reservation" userName={user.nombre} userPhoto={user.foto_perfil_url}>
      <header className="mk-page-head">
        <div>
          <span className="mk-eyebrow">NUEVA RESERVACIÓN</span>
          <h1 className="mk-page-title">Reserva tu habitación</h1>
          <p className="mk-lead">Elige el espacio que mejor se adapte a ti.</p>
        </div>
      </header>

      {message && <Alert type={message.type} onClose={clear}>{message.text}</Alert>}
      {hasReservation && <Alert type="info" duration={0}>Ya tienes una reservación registrada.</Alert>}

      <div className="mk-reservation-grid">
        <section className="mk-card mk-reservation-form-card">
          <div className="mk-reservation-steps" aria-label="Pasos para reservar">
            <span className="active">1&nbsp; Datos</span>
            <span>2&nbsp; Habitación</span>
            <span>3&nbsp; Confirmar</span>
          </div>

          <form onSubmit={handleSubmit} className="mk-reservation-form" noValidate>
            <label className="mk-field">
              <span>FECHA DE INGRESO</span>
              <DatePicker
                id="reservation-fecha"
                selected={form.fecha_ingreso ? new Date(`${form.fecha_ingreso}T12:00:00`) : null}
                onChange={(date: Date | null) => {
                  if (date) {
                    const yyyy = date.getFullYear();
                    const mm = String(date.getMonth() + 1).padStart(2, "0");
                    const dd = String(date.getDate()).padStart(2, "0");
                    setForm({ ...form, fecha_ingreso: `${yyyy}-${mm}-${dd}` });
                  }
                }}
                minDate={new Date()}
                disabled={hasReservation}
                locale="es"
                dateFormat="dd/MM/yyyy"
                placeholderText="Selecciona una fecha"
                className="mk-reservation-date"
                wrapperClassName="w-full"
              />
            </label>

            <div className="mk-field">
              <span>PISO</span>
              <CustomDropdown
                label="Piso"
                options={floors.map((pisoNum) => ({ value: pisoNum, label: `Piso ${pisoNum}` }))}
                value={form.piso}
                onChange={(val) => {
                  setForm({ ...form, piso: val, habitacion: "" });
                  setPhotoIndex(0);
                }}
                placeholder={loadingRooms ? "Cargando pisos..." : "Selecciona un piso"}
                disabled={hasReservation || loadingRooms}
              />
            </div>

            {roomsError && <p className="mk-reservation-hint">{roomsError}</p>}

            <fieldset className="mk-reservation-type">
              <legend className="mk-reservation-label">HABITACIÓN</legend>
              <div className="mk-room-filters" role="group" aria-label="Filtrar por tipo">
                {([["", "Todas"], ["individual", "Individual"], ["compartida", "Compartida"]] as const).map(([value, label]) => (
                  <button
                    key={value || "all"}
                    type="button"
                    disabled={hasReservation}
                    className={`mk-room-filter${tipoFilter === value ? " active" : ""}`}
                    onClick={() => setTipoFilter(value)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {!form.piso ? (
                <p className="mk-reservation-hint">Primero selecciona un piso para ver sus habitaciones.</p>
              ) : visibleRooms.length === 0 ? (
                <p className="mk-reservation-hint">No hay habitaciones de ese tipo en este piso.</p>
              ) : (
                <div className="mk-room-grid" role="radiogroup" aria-label="Habitaciones disponibles" style={{ marginTop: 10 }}>
                  {visibleRooms.map((room) => {
                    const selected = room.habitacion === form.habitacion;
                    return (
                      <button
                        key={room.id}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        disabled={hasReservation || !room.disponible}
                        className={`mk-room-card${selected ? " selected" : ""}`}
                        onClick={() => {
                          setForm({ ...form, habitacion: room.habitacion });
                          setPhotoIndex(0);
                        }}
                      >
                        <img className="mk-room-card-photo" src={photosOf(room)[0]} alt={`Habitación ${room.habitacion}`} loading="lazy" />
                        <span className="mk-room-card-badge">{room.tipo === "compartida" ? "Compartida" : "Individual"}</span>
                        {!room.disponible && <span className="mk-room-card-full">Ocupada</span>}
                        <span className="mk-room-card-body">
                          <strong>Habitación {room.habitacion}</strong>
                          <small className="mk-room-card-price">{money(room.precio)} / mes</small>
                          <small>
                            {room.disponible
                              ? room.capacidad > 1
                                ? `${room.cupos} de ${room.capacidad} lugares disponibles`
                                : "Disponible"
                              : "Sin lugares disponibles"}
                          </small>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </fieldset>

            <div className="mk-reservation-actions">
              <button
                type="submit"
                disabled={hasReservation || isSubmitting}
                className="mk-btn mk-primary"
              >
                {isSubmitting ? (
                  <><LoaderCircle className="mk-spin" size={15} /> Enviando...</>
                ) : (
                  <>Reservar <Icon name="arrowRight" size={15} /></>
                )}
              </button>
            </div>
          </form>
        </section>

        <aside className="mk-card mk-reservation-summary">
          <span className="mk-eyebrow">RESUMEN</span>
          {selectedRoom ? (
            <div className="mk-summary-gallery">
              <div className="mk-summary-photo">
                <img src={photos[Math.min(photoIndex, photos.length - 1)]} alt={`Habitación ${selectedRoom.habitacion}`} />
              </div>
              {photos.length > 1 && (
                <div className="mk-summary-thumbs">
                  {photos.map((url, index) => (
                    <button
                      key={url}
                      type="button"
                      className={index === photoIndex ? "active" : ""}
                      onClick={() => setPhotoIndex(index)}
                      aria-label={`Ver foto ${index + 1}`}
                    >
                      <img src={url} alt="" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="mk-summary-empty" style={{ margin: "8px 0 9px" }}>
              Elige una habitación para ver sus fotos.
            </div>
          )}
          <h2>{form.habitacion ? `Habitación ${form.habitacion}` : "Tu habitación"}</h2>
          <p className="mk-reservation-summary-meta">
            {tipo ? (tipo === "individual" ? "Individual" : "Compartida") : "Tipo sin seleccionar"}
            {form.piso ? ` · Piso ${form.piso}` : ""}
          </p>
          {selectedRoom?.descripcion && <p className="mk-summary-desc">{selectedRoom.descripcion}</p>}
          <div className="mk-reservation-summary-lines">
            <div><span>Fecha de ingreso</span><strong>{fechaIngreso}</strong></div>
            <div><span>Renta mensual</span><strong>{monto ? money(monto) : "—"}</strong></div>
            <div className="total"><span>Total al reservar</span><strong>{monto ? money(monto) : "—"}</strong></div>
          </div>
          <div className="mk-reservation-note">
            <BedDouble size={15} />
            <span>La asignación final se confirma al terminar el registro.</span>
          </div>
        </aside>
      </div>
    </ResidentLayout>
  );
};

export default Reservation;
