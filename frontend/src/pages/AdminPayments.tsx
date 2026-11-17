import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AdminNavbar from "../components/admin/AdminNavbar";
import Alert from "../components/Alert";
import Pagination from "../components/admin/Pagination";
import Icon from "../components/ui/Icon";
import { useTimedMessage } from "../hooks/useTimedMessage";

interface Payment {
  id: number;
  reservacion_id: number | null;
  nombre: string;
  email: string;
  foto_perfil_url?: string | null;
  piso?: string | number | null;
  habitacion?: string | number | null;
  mes: number | null;
  anio: number | null;
  monto?: number | string | null;
  monto_pagado?: number | string | null;
  monto_calculado?: number | string | null;
  estado: string;
  tipo_pago?: string | null;
  metodo_pago?: string | null;
  fecha_pago?: string | null;
  fecha_generada?: string | null;
}

type PaymentFilter = "all" | "pending" | "paid" | "arrears";

const FILTERS: { label: string; value: PaymentFilter }[] = [
  { label: "Todos los pagos", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Pagados", value: "paid" },
  { label: "Adeudos", value: "arrears" },
];

const normalizedStatus = (payment: Payment) => String(payment.estado || "").toLowerCase();
const amountFor = (payment: Payment) => Number(payment.monto ?? payment.monto_pagado ?? payment.monto_calculado ?? 0);
const currency = (amount: number) => new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  minimumFractionDigits: 2,
}).format(amount);

const isOverdue = (payment: Payment) => {
  const status = normalizedStatus(payment);
  if (status === "atrasado" || status === "rechazado") return true;
  if (status !== "pendiente" || !payment.mes || !payment.anio) return false;
  const dueDate = new Date(Number(payment.anio), Number(payment.mes) - 1, 1);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return dueDate < today;
};

const paymentState = (payment: Payment) => isOverdue(payment) ? "atrasado" : normalizedStatus(payment);

const initials = (name: string) =>
  name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();

const period = (payment: Payment) => payment.mes && payment.anio ? `${payment.mes}/${payment.anio}` : "—";

const AdminPayments = () => {
  const navigate = useNavigate();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PaymentFilter>("all");
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [updating, setUpdating] = useState(false);
  const [remindingId, setRemindingId] = useState<number | null>(null);
  const { message, showError, showSuccess, clear } = useTimedMessage();

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/payments", { credentials: "include" });
      if (response.status === 401) {
        navigate("/login");
        return;
      }
      if (!response.ok) throw new Error("No se pudieron cargar los pagos.");
      const data: unknown = await response.json();
      if (!Array.isArray(data)) throw new Error("La respuesta de pagos no es válida.");
      setPayments(data as Payment[]);
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudieron cargar los pagos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Pagos | Panel administrativo";
    fetchPayments();
    // La carga inicial solo debe ejecutarse al montar esta página.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, search]);

  const counts = useMemo(() => ({
    total: payments.length,
    pending: payments.filter((payment) => paymentState(payment) === "pendiente").length,
    paid: payments.filter((payment) => paymentState(payment) === "pagado").length,
    arrears: payments.filter(isOverdue).length,
  }), [payments]);

  const filteredPayments = useMemo(() => payments.filter((payment) => {
    const state = paymentState(payment);
    const matchesFilter = filter === "all" ||
      (filter === "pending" && state === "pendiente") ||
      (filter === "paid" && state === "pagado") ||
      (filter === "arrears" && isOverdue(payment));
    const searchText = `${payment.nombre} ${payment.email} ${payment.id} ${payment.reservacion_id || ""} ${period(payment)}`.toLowerCase();
    return matchesFilter && searchText.includes(search.trim().toLowerCase());
  }), [filter, payments, search]);

  const itemsPerPage = filter === "arrears" ? 6 : 8;
  const currentItems = filteredPayments.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const updatePaymentStatus = async (payment: Payment, estado: "pagado" | "rechazado") => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ estado }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo actualizar el pago.");
      showSuccess(estado === "pagado" ? "Pago aprobado y estudiante notificado." : "Pago marcado como no aprobado.");
      setSelectedPayment(null);
      await fetchPayments();
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo actualizar el pago.");
    } finally {
      setUpdating(false);
    }
  };

  const sendReminder = async (payment: Payment) => {
    setRemindingId(payment.id);
    try {
      const response = await fetch(`/api/admin/payments/${payment.id}/reminder`, {
        method: "POST",
        credentials: "include",
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "No se pudo enviar el recordatorio.");
      showSuccess(result.message || "Recordatorio enviado al estudiante.");
    } catch (error) {
      showError(error instanceof Error ? error.message : "No se pudo enviar el recordatorio.");
    } finally {
      setRemindingId(null);
    }
  };

  const countsByFilter: Record<PaymentFilter, number> = {
    all: counts.total,
    pending: counts.pending,
    paid: counts.paid,
    arrears: counts.arrears,
  };

  return (
    <AdminNavbar active="payments">
      <div className="admin-page">
        {message && <div className="admin-alert"><Alert type={message.type} duration={0} onClose={clear}>{message.text}</Alert></div>}

        <header className="admin-page-head">
          <div>
            <span className="admin-eyebrow">PANEL ADMINISTRATIVO</span>
            <h1>{filter === "arrears" ? "Adeudos y recordatorios" : "Pagos"}</h1>
            <p>Revisa los pagos recibidos y da seguimiento a los periodos pendientes.</p>
          </div>
          <button type="button" className="admin-head-action" onClick={() => setFilter("arrears")}>
            <Icon name="bell" size={14} /> Ver adeudos <span className="admin-head-count">{counts.arrears}</span>
          </button>
        </header>

        <div className="admin-stats">
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="wallet" size={16} /></span><div><strong>{counts.total}</strong><small>Registros</small></div></div>
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="clock" size={16} /></span><div><strong>{counts.pending}</strong><small>Pendientes</small></div></div>
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="check" size={16} /></span><div><strong>{counts.paid}</strong><small>Pagados</small></div></div>
          <div className="admin-stat"><span className="admin-stat-icon"><Icon name="bell" size={16} /></span><div><strong>{counts.arrears}</strong><small>Adeudos</small></div></div>
        </div>

        <div className="admin-toolbar">
          <div className="admin-filters" aria-label="Filtrar pagos">
            {FILTERS.map((item) => (
              <button
                key={item.value}
                type="button"
                className={`admin-filter${filter === item.value ? " active" : ""}`}
                aria-pressed={filter === item.value}
                onClick={() => setFilter(item.value)}
              >
                {item.label}<span> · {countsByFilter[item.value]}</span>
              </button>
            ))}
          </div>
          <label className="admin-search">
            <Icon name="search" size={15} />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar estudiante..." aria-label="Buscar pagos" />
          </label>
        </div>

        <section className={`admin-list${filter === "arrears" ? " admin-arrears-list" : ""}`} aria-label={filter === "arrears" ? "Lista de adeudos" : "Lista de pagos"}>
          {loading ? (
            <div className="admin-empty"><span className="admin-loading-dot" /> Cargando pagos...</div>
          ) : currentItems.length ? (
            filter === "arrears" ? currentItems.map((payment) => (
              <article key={payment.id} className="admin-arrears-card">
                <div className="admin-person">
                  <span className="admin-person-avatar">
                    {payment.foto_perfil_url ? <img src={payment.foto_perfil_url} alt="" /> : initials(payment.nombre || "S")}
                  </span>
                  <div className="admin-person-copy">
                    <strong>{payment.nombre || "Estudiante"}</strong>
                    <small>{payment.piso ? `Piso ${payment.piso} · ` : ""}{payment.habitacion ? `Hab. ${payment.habitacion}` : `Reserva #${payment.reservacion_id || payment.id}`}</small>
                  </div>
                </div>
                <div className="admin-arrears-period"><small>PERIODO</small><strong>{period(payment)}</strong></div>
                <div className="admin-arrears-amount"><small>ADEUDO</small><strong>{currency(amountFor(payment))}</strong></div>
                <button className="admin-btn secondary" type="button" disabled={remindingId === payment.id} onClick={() => void sendReminder(payment)}>
                  <Icon name="bell" size={13} /> {remindingId === payment.id ? "Enviando..." : "Enviar recordatorio"}
                </button>
              </article>
            )) : currentItems.map((payment) => (
              <article key={payment.id} className="admin-list-row">
                <div className="admin-person">
                  <span className="admin-person-avatar">
                    {payment.foto_perfil_url ? <img src={payment.foto_perfil_url} alt="" /> : initials(payment.nombre || "S")}
                  </span>
                  <div className="admin-person-copy">
                    <strong>{payment.nombre || "Estudiante"}</strong>
                    <small>Reserva #{payment.reservacion_id || payment.id} · {payment.tipo_pago || "Pago mensual"}</small>
                  </div>
                </div>
                <div className="admin-cell admin-hide-mobile">
                  <span className={`admin-status ${paymentState(payment) === "pagado" ? "success" : isOverdue(payment) ? "danger" : "pending"}`}>{isOverdue(payment) ? "adeudo" : paymentState(payment)}</span>
                </div>
                <div className="admin-cell admin-hide-tablet"><small>PERIODO</small><strong>{period(payment)}</strong></div>
                <div className="admin-cell admin-hide-mobile"><small>MONTO</small><strong>{currency(amountFor(payment))}</strong></div>
                <div className="admin-row-actions">
                  <button className="admin-btn secondary" type="button" onClick={() => setSelectedPayment(payment)}>Revisar</button>
                </div>
              </article>
            ))
          ) : (
            <div className="admin-empty">{payments.length ? "No hay resultados con esos filtros." : "No hay pagos para mostrar."}</div>
          )}
          {!loading && filteredPayments.length > itemsPerPage && (
            <div className="admin-pagination">
              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredPayments.length / itemsPerPage)}
                totalItems={filteredPayments.length}
                itemsPerPage={itemsPerPage}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </section>
      </div>

      {selectedPayment && (
        <div className="admin-modal-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget && !updating) setSelectedPayment(null);
        }}>
          <section className="admin-modal admin-payment-modal" role="dialog" aria-modal="true" aria-labelledby="payment-title">
            <header className="admin-modal-header">
              <div>
                <span className="admin-eyebrow">REVISIÓN DE PAGO</span>
                <h2 id="payment-title">Pago #{selectedPayment.id}</h2>
                <p>{selectedPayment.nombre} · periodo {period(selectedPayment)}</p>
              </div>
              <button type="button" className="admin-modal-close" onClick={() => setSelectedPayment(null)} aria-label="Cerrar">×</button>
            </header>
            <div className="admin-modal-body">
              <div className="admin-detail-grid">
                <div className="admin-detail"><small>ESTUDIANTE</small><strong>{selectedPayment.nombre}</strong></div>
                <div className="admin-detail"><small>MONTO</small><strong>{currency(amountFor(selectedPayment))}</strong></div>
                <div className="admin-detail"><small>PERIODO</small><strong>{period(selectedPayment)}</strong></div>
                <div className="admin-detail"><small>MÉTODO</small><strong>{selectedPayment.metodo_pago || "No especificado"}</strong></div>
              </div>
              <div className="admin-receipt-placeholder">
                <span><Icon name="upload" size={18} /></span>
                <strong>Espacio de comprobante</strong>
                <p>El sistema todavía no almacena comprobantes de pago. Este espacio queda reservado para una futura integración.</p>
              </div>
            </div>
            <footer className="admin-modal-footer">
              <button type="button" className="admin-btn danger" onClick={() => void updatePaymentStatus(selectedPayment, "rechazado")} disabled={updating || paymentState(selectedPayment) === "pagado"}>
                Marcar no aprobado
              </button>
              <button type="button" className="admin-btn" onClick={() => void updatePaymentStatus(selectedPayment, "pagado")} disabled={updating || paymentState(selectedPayment) === "pagado"}>
                {updating ? "Guardando..." : "Aprobar pago"}
              </button>
            </footer>
          </section>
        </div>
      )}
    </AdminNavbar>
  );
};

export default AdminPayments;
