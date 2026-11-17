import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BedDouble, ChevronDown, LoaderCircle, UserRound, UsersRound } from "lucide-react";
import ResidentLayout from "../components/ResidentLayout";
import Icon from "../components/ui/Icon";
import DatePicker, { registerLocale } from "react-datepicker";

import { es } from "date-fns/locale/es";
import "react-datepicker/dist/react-datepicker.css";
import Alert from "../components/Alert";
import { useTimedMessage } from "../hooks/useTimedMessage";

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
  const [user, setUser] = useState<{ nombre?: string } | null>(null);

  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState({
    fecha_ingreso: today,
    piso: "",
    habitacion: "",
  });

  const [tipo, setTipo] = useState("");
  const [hasReservation, setHasReservation] = useState(false);
  const [prices, setPrices] = useState({ individual: 2000, compartida: 1200 });
  const [occupiedRooms, setOccupiedRooms] = useState<string[]>([]);
  const [habitacionesPorPiso, setHabitacionesPorPiso] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
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

  // CARGAR HABITACIONES DESDE API
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const res = await fetch(`/api/rooms`);
        if (res.ok) {
          const data = await res.json();
          const rows = Array.isArray(data) ? data : data.lista || [];
          const formatted: Record<string, string[]> = {};
          rows.forEach((row: { piso: string; habitaciones: string }) => {
            formatted[row.piso] = row.habitaciones.split(', ');
          });
          setHabitacionesPorPiso(data.agrupado || formatted);
        } else {
          console.error("Error cargando habitaciones: respuesta inválida", res.status);
        }
      } catch (err) {
        console.error("Error cargando habitaciones:", err);
      }
    };

    const fetchSettings = async () => {
      try {
        const res = await fetch(`/api/settings`);
        if (res.ok) {
          const data = await res.json();
          setPrices({
            individual: data.precioIndividual || 2000,
            compartida: data.precioCompartida || 1200,
          });
        }
      } catch (err) {
        console.error("Error cargando precios de configuración:", err);
      }
    };

    fetchRooms();
    fetchSettings();
  }, []);

  // MONTO
  const monto =
    tipo === "individual"
      ? prices.individual
      : tipo === "compartida"
        ? prices.compartida
        : 0;
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

  // OBTENER HABITACIONES OCUPADAS
  useEffect(() => {
    if (!form.piso) return;

    const fetchOccupied = async () => {
      try {
        const res = await fetch(
          `/api/reservation/occupied?piso=${form.piso}`
        );

        const data = await res.json();

        setOccupiedRooms(data || []);

      } catch (err) {
        console.error("Error al cargar habitaciones ocupadas:", err);
      }
    };

    fetchOccupied();
  }, [form.piso]);

  // VALIDACIÓN EXTRA
  useEffect(() => {
    if (form.habitacion && occupiedRooms.includes(form.habitacion)) {
      showError("Esta habitación ya está ocupada. Elige otra.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.habitacion, occupiedRooms]);

  // SUBMIT
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (hasReservation) {
      showError("Ya tienes una reservación registrada");
      return;
    }

    if (!form.fecha_ingreso || !tipo || !form.piso || !form.habitacion) {
      showError("Todos los campos son obligatorios");
      return;
    }

    if (occupiedRooms.includes(form.habitacion)) {
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
        body: JSON.stringify({
          ...form,
          tipo,
          monto,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showError(data.error || "No se pudo registrar la reservación.");
        setIsSubmitting(false);
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

  if (!user) return null;

  return (
    <ResidentLayout active="reservation" userName={user.nombre}>
      <header className="mk-page-head">
        <div>
          <span className="mk-eyebrow">NUEVA RESERVACIÓN</span>
          <h1 className="mk-page-title">Reserva tu habitación</h1>
          <p className="mk-lead">Elige el espacio que mejor se adapte a ti.</p>
        </div>
      </header>

      {message && <Alert type={message.type} onClose={clear}>{message.text}</Alert>}
      {hasReservation && <Alert type="info">Ya tienes una reservación registrada.</Alert>}

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

            <fieldset className="mk-reservation-type">
              <legend className="mk-reservation-label">TIPO DE HABITACIÓN</legend>
              <div className="mk-reservation-type-options" role="radiogroup" aria-label="Tipo de habitación">
                <button
                  type="button"
                  role="radio"
                  aria-checked={tipo === "individual"}
                  disabled={hasReservation}
                  onClick={() => setTipo("individual")}
                  className={`mk-reservation-type-option${tipo === "individual" ? " selected" : ""}`}
                >
                  <UserRound size={18} />
                  <span><strong>Individual</strong><small>${prices.individual.toLocaleString("es-MX")} / mes</small></span>
                </button>
                <button
                  type="button"
                  role="radio"
                  aria-checked={tipo === "compartida"}
                  disabled={hasReservation}
                  onClick={() => setTipo("compartida")}
                  className={`mk-reservation-type-option${tipo === "compartida" ? " selected" : ""}`}
                >
                  <UsersRound size={18} />
                  <span><strong>Compartida</strong><small>${prices.compartida.toLocaleString("es-MX")} / mes</small></span>
                </button>
              </div>
            </fieldset>

            <div className="mk-reservation-fields">
              <div className="mk-field">
                <span>PISO</span>
                <CustomDropdown
                  label="Piso"
                  options={Object.keys(habitacionesPorPiso).sort().map((pisoNum) => ({
                    value: pisoNum,
                    label: `Piso ${pisoNum}`,
                  }))}
                  value={form.piso}
                  onChange={(val) => setForm({ ...form, piso: val, habitacion: "" })}
                  placeholder="Selecciona un piso"
                  disabled={hasReservation}
                />
              </div>

              <div className="mk-field">
                <span>HABITACIÓN</span>
                <CustomDropdown
                  label="Habitación"
                  options={
                    form.piso
                      ? (habitacionesPorPiso[form.piso] || []).map((hab) => {
                        const isOccupied = occupiedRooms.map(String).includes(String(hab));
                        return {
                          value: hab,
                          label: isOccupied ? `Habitación ${hab} (Ocupada)` : `Habitación ${hab}`,
                          disabled: isOccupied,
                        };
                      })
                      : []
                  }
                  value={form.habitacion}
                  onChange={(val) => setForm({ ...form, habitacion: val })}
                  placeholder={form.piso ? "Selecciona una habitación" : "Primero selecciona un piso"}
                  disabled={!form.piso || hasReservation}
                />
              </div>
            </div>

            {form.piso && occupiedRooms.length > 0 && (
              <p className="mk-reservation-hint">
                Las habitaciones marcadas como ocupadas no estarán disponibles para reservar.
              </p>
            )}

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
          <div className="mk-reservation-image-placeholder" aria-hidden="true" />
          <h2>{form.habitacion ? `Habitación ${form.habitacion}` : "Tu habitación"}</h2>
          <p className="mk-reservation-summary-meta">
            {tipo ? (tipo === "individual" ? "Individual" : "Compartida") : "Tipo sin seleccionar"}
            {form.piso ? ` · Piso ${form.piso}` : ""}
          </p>
          <div className="mk-reservation-summary-lines">
            <div><span>Fecha de ingreso</span><strong>{fechaIngreso}</strong></div>
            <div><span>Renta mensual</span><strong>{monto ? `$${monto.toLocaleString("es-MX")}` : "—"}</strong></div>
            <div className="total"><span>Total al reservar</span><strong>{monto ? `$${monto.toLocaleString("es-MX")}` : "—"}</strong></div>
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
