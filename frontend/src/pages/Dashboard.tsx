import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ResidentLayout from "../components/ResidentLayout";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import StatusPill from "../components/ui/StatusPill";
import roomIndividual from "../assets/images/room_individual.jpg";
import roomShared from "../assets/images/room_shared.jpg";
import { useTimedMessage } from "../hooks/useTimedMessage";

const Dashboard = () => {

  const navigate = useNavigate();
  const { message, showError, clear } = useTimedMessage();

  // USUARIO
  const [user, setUser] = useState<any>(null);

  // RESERVACIÓN
  const [reservation, setReservation] = useState<any>(null);

  // PAGO
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMonth, setPaymentMonth] = useState<number | null>(null);
  const [paymentYear, setPaymentYear] = useState<number | null>(null);
  const [currentMonthStatus, setCurrentMonthStatus] = useState<string | null>(null);
  const [isProrated, setIsProrated] = useState(false);

  // AVISOS (bandeja de notificaciones)
  const [notices, setNotices] = useState<{ id: number; titulo: string; cuerpo: string; url: string; leida: number }[]>([]);

  useEffect(() => {
    document.title = "Dashboard";

    const calculatePayment = (res: any, targetMonth?: number, targetYear?: number) => {
      const basePrice = res.tipo === "individual" ? 2000 : 1200;
      const dateStr = res.fecha_ingreso ? res.fecha_ingreso.split("T")[0] : "";
      if (!dateStr) {
        setPaymentAmount(basePrice);
        setIsProrated(false);
        return;
      }

      const [year, month, day] = dateStr.split("-").map(Number);
      const today = new Date();
      const currentMonth = targetMonth ?? today.getMonth() + 1;
      const currentYear = targetYear ?? today.getFullYear();

      if (currentYear === year && currentMonth === month) {
        const weekIndex = Math.min(4, Math.max(1, Math.ceil(day / 7)));
        const prorated = (basePrice / 4) * weekIndex;
        setPaymentAmount(prorated);
        setIsProrated(true);
      } else {
        setPaymentAmount(basePrice);
        setIsProrated(false);
      }
    };

    const getSession = async () => {
      try {
        const res = await fetch("/api/session", {
          credentials: "include",
        });

        if (!res.ok) {
          navigate("/login");
          return;
        }

        const data = await res.json();
        setUser(data);

      } catch {
        navigate("/login");
      }
    };

    const getReservation = async () => {
      try {
        const res = await fetch("/api/reservation/me", {
          credentials: "include",
        });

        if (res.status === 401) {
          navigate("/login");
          return null;
        }

        if (!res.ok) {
          showError("No se pudo cargar tu reservación. Intenta recargar la página.");
          return null;
        }

        const data = await res.json();
        setReservation(data);
        return data;

      } catch {
        showError("No se pudo cargar tu reservación. Intenta recargar la página.");
        return null;
      }
    };

    const getPaymentInfo = async (reservationData: any) => {
      try {
        const res = await fetch("/api/payment/me", {
          credentials: "include",
        });

        if (!res.ok) return;

        const payments = await res.json();
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const currentYear = today.getFullYear();

        const thisMonthPayment = payments.find((p: any) => p.mes === currentMonth && p.anio === currentYear);
        let targetMonth = currentMonth;
        let targetYear = currentYear;
        let targetStatus = thisMonthPayment?.estado ?? null;

        if (thisMonthPayment?.estado === "pagado") {
          targetMonth = currentMonth === 12 ? 1 : currentMonth + 1;
          targetYear = currentMonth === 12 ? currentYear + 1 : currentYear;
          const nextMonthPayment = payments.find((p: any) => p.mes === targetMonth && p.anio === targetYear);
          targetStatus = nextMonthPayment?.estado ?? null;
        }

        setPaymentMonth(targetMonth);
        setPaymentYear(targetYear);
        setCurrentMonthStatus(targetStatus);

        if (reservationData && reservationData.estado === "aceptada") {
          calculatePayment(reservationData, targetMonth, targetYear);
        }
      } catch {
        showError("No se pudo cargar tu información de pagos.");
      }
    };

    const getNotices = async () => {
      try {
        const res = await fetch("/api/notifications", { credentials: "include" });
        if (!res.ok) return;
        const data = await res.json();
        setNotices(Array.isArray(data.items) ? data.items.slice(0, 3) : []);
      } catch {
        /* los avisos son opcionales en el panel */
      }
    };

    const fetchData = async () => {
      getNotices();
      await getSession();
      const reservationData = await getReservation();
      if (reservationData) {
        await getPaymentInfo(reservationData);
      }
    };

    fetchData();

  }, [navigate]);

  // evita parpadeo
  if (!user) return null;

  const estado: string = reservation?.estado ?? "";
  const isFinalizada = estado === "finalizada";
  const isRechazada = estado === "rechazada" || estado === "cancelada";
  const isActiva = Boolean(reservation) && !isFinalizada && !isRechazada;

  const money = (n: number) =>
    new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 }).format(n);
  const cap = (t?: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : "—");
  const fmtDate = (iso?: string) => {
    const d = iso ? iso.split("T")[0].split("-") : [];
    return d.length === 3 ? `${d[2]}/${d[1]}/${d[0]}` : "";
  };

  const reservaTone = estado === "aceptada" ? "ok" : estado === "pendiente" ? "rev" : isRechazada ? "no" : "pend";
  const reservaLabel =
    estado === "pendiente" ? "En revisión" : estado === "aceptada" ? "Aceptada" : estado === "rechazada" ? "Rechazada"
      : estado === "cancelada" ? "Cancelada" : estado === "finalizada" ? "Finalizada" : "Sin reservación";

  const payTone = currentMonthStatus === "pagado" ? "ok" : currentMonthStatus === "pendiente" ? "rev" : currentMonthStatus === "atrasado" ? "no" : "pend";
  const payLabel =
    currentMonthStatus === "pagado" ? "Pagado" : currentMonthStatus === "pendiente" ? "En revisión"
      : currentMonthStatus === "atrasado" ? "Rechazado" : "Por realizar";

  const showPayment = estado === "aceptada" && paymentMonth !== null;
  const firstName = (user?.nombre || "Usuario").split(" ")[0];
  const photo = reservation?.tipo === "compartida" ? roomShared : roomIndividual;

  return (
    <ResidentLayout active="dashboard" userName={user?.nombre} userPhoto={user?.foto_perfil_url}>
      <div className="mk-page-head">
        <div>
          <span className="mk-eyebrow">PANEL DEL RESIDENTE</span>
          <h1 className="mk-page-title">Hola, {firstName}</h1>
          <p className="mk-lead">Este es el resumen de tu residencia y tus próximos movimientos.</p>
        </div>
      </div>

      {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}

      <div className="mk-stat-grid">
        <div className="mk-stat">
          <span className="mk-stat-icon"><Icon name="bed" size={17} /></span>
          <strong>{reservation?.habitacion || "—"}</strong>
          <small>Habitación</small>
        </div>
        <div className="mk-stat">
          <span className="mk-stat-icon"><Icon name="building" size={17} /></span>
          <strong>{reservation?.piso || "—"}</strong>
          <small>Piso</small>
        </div>
        <div className="mk-stat">
          <span className="mk-stat-icon"><Icon name="home" size={17} /></span>
          <strong>{cap(reservation?.tipo)}</strong>
          <small>Tipo</small>
        </div>
        <div className="mk-stat">
          <span className="mk-stat-icon"><Icon name="wallet" size={17} /></span>
          <strong>{showPayment ? money(paymentAmount) : "—"}</strong>
          <small>Próximo pago</small>
        </div>
      </div>

      <div className="mk-dash-grid">
        {/* RESERVACIÓN */}
        <article className="mk-card mk-card-room">
          <div className="mk-card-head">
            <span className="mk-eyebrow">{isFinalizada ? "ÚLTIMA ESTANCIA" : "TU RESERVACIÓN"}</span>
            {reservation && <StatusPill tone={reservaTone}>{reservaLabel}</StatusPill>}
          </div>

          {reservation ? (
            <>
              <div className="mk-room-strip">
                <div className="mk-room-thumb">
                  <img className="mk-photo" src={photo} alt={`Habitación ${cap(reservation.tipo)}`} />
                </div>
                <div>
                  <strong>Residencia SICPES · {reservation.habitacion || "N/A"}</strong>
                  <small>{cap(reservation.tipo)} · {reservation.piso || "N/A"}</small>
                  {reservation.fecha_ingreso && (
                    <span className="mk-mini-strong">Ingreso {fmtDate(reservation.fecha_ingreso)}</span>
                  )}
                </div>
              </div>

              {isRechazada && reservation.motivo_rechazo && (
                <div className="mk-reject"><strong>Motivo del rechazo:</strong> {reservation.motivo_rechazo}</div>
              )}

              {isActiva ? (
                <Link to="/reservation" className="mk-btn mk-secondary mk-block">
                  Ver estado de mi petición
                </Link>
              ) : (
                <Link to="/reservation" className="mk-btn mk-primary mk-block">
                  Solicitar nueva reservación <Icon name="arrowRight" size={16} />
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="mk-empty-note" style={{ marginBottom: 12 }}>No tienes ninguna reservación activa.</p>
              <Link to="/reservation" className="mk-btn mk-primary mk-block">
                Solicitar habitación <Icon name="arrowRight" size={16} />
              </Link>
            </>
          )}
        </article>

        {/* PRÓXIMO PAGO */}
        <article className="mk-card mk-card-pay">
          <div className="mk-card-head">
            <span className="mk-eyebrow">PRÓXIMO PAGO</span>
            {showPayment && <StatusPill tone={payTone}>{payLabel}</StatusPill>}
          </div>

          {showPayment ? (
            <>
              <div className="mk-amount-block">
                <strong>{money(paymentAmount)}</strong>
                <small>
                  Mensualidad {paymentMonth}/{paymentYear} · vence el 1ro de cada mes
                  {isProrated ? " · prorrateo aplicado" : ""}
                </small>
              </div>
              <Link to="/payments" className="mk-btn mk-primary mk-block">
                Ir a pagos <Icon name="arrowRight" size={16} />
              </Link>
            </>
          ) : (
            <p className="mk-empty-note">No hay pagos pendientes.</p>
          )}
        </article>
      </div>

      {/* AVISOS */}
      <article className="mk-card">
        <div className="mk-card-head">
          <h3 className="mk-card-title">Avisos</h3>
        </div>
        {notices.length === 0 ? (
          <p className="mk-notice-empty">Todavía no tienes avisos. Aquí aparecerán los cambios de tu reservación y tus pagos.</p>
        ) : (
          notices.map((n) => (
            <Link key={n.id} to={n.url || "/dashboard"} className="mk-notice" style={{ fontWeight: n.leida ? 400 : 600 }}>
              <Icon name="bell" size={16} />
              <span>{n.titulo}{n.cuerpo ? ` — ${n.cuerpo}` : ""}</span>
              <Icon name="chevronRight" size={15} />
            </Link>
          ))
        )}
      </article>
    </ResidentLayout>
  );
};

export default Dashboard;
