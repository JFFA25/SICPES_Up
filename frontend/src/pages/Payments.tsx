import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import ResidentLayout from "../components/ResidentLayout";
import Icon from "../components/ui/Icon";
import Notice from "../components/ui/Notice";
import StatusPill from "../components/ui/StatusPill";
import { useTimedMessage } from "../hooks/useTimedMessage";

interface ResidentUser {
    nombre?: string;
}

interface ReservationData {
    id: number | string;
    tipo: string;
    fecha_ingreso?: string;
    estado: string;
}

interface PaymentRecord {
    id: number | string;
    mes: number;
    anio: number;
    estado: string;
    monto?: number | string;
    monto_pagado?: number | string;
    tipo_pago?: string;
}

const Payments = () => {
    const navigate = useNavigate();
    const { message, showError, clear } = useTimedMessage();

    const [user, setUser] = useState<ResidentUser | null>(null);
    const [reservation, setReservation] = useState<ReservationData | null>(null);
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [payments, setPayments] = useState<PaymentRecord[]>([]);
    const [currentMonthStatus, setCurrentMonthStatus] = useState<string | null>(null);
    const [isProrated, setIsProrated] = useState(false);
    const [paymentMonth, setPaymentMonth] = useState<number | null>(null);
    const [paymentYear, setPaymentYear] = useState<number | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        document.title = "Pagos";

        const fetchData = async () => {
            let reservationData: ReservationData | null = null;
            try {
                // SESIÓN
                const sessionRes = await fetch(`/api/session`, {
                    credentials: "include",
                });

                if (!sessionRes.ok) {
                    navigate("/login");
                    return;
                }
                const sessionData = await sessionRes.json();
                setUser(sessionData);

                // RESERVACIÓN
                const res = await fetch(`/api/reservation/me`, {
                    credentials: "include",
                });

                if (res.ok) {
                    const data: ReservationData = await res.json();
                    reservationData = data;
                    setReservation(data);
                    
                    if (data && data.estado === "aceptada") {
                        calculatePayment(data);
                    }
                }

                // PAGOS
                const payRes = await fetch(`/api/payment/me`, {
                    credentials: "include",
                });
                if (payRes.ok) {
                        const pData: PaymentRecord[] = await payRes.json();
                        const normalizedPayments = pData.map((p) => ({
                        ...p,
                        mes: Number(p.mes),
                        anio: Number(p.anio),
                        estado: String(p.estado || "").toLowerCase(),
                    }));
                    setPayments(normalizedPayments);

                    const today = new Date();
                    const currentMonth = today.getMonth() + 1;
                    const currentYear = today.getFullYear();

                    const currentPayment = normalizedPayments.find((p) => p.mes === currentMonth && p.anio === currentYear);
                    let targetMonth = currentMonth;
                    let targetYear = currentYear;
                    let targetStatus = currentPayment?.estado ?? null;

                    if (currentPayment?.estado === "pagado") {
                        targetMonth = currentMonth === 12 ? 1 : currentMonth + 1;
                        targetYear = currentMonth === 12 ? currentYear + 1 : currentYear;
                        const nextPayment = normalizedPayments.find((p) => p.mes === targetMonth && p.anio === targetYear);
                        targetStatus = nextPayment?.estado ?? null;
                    }

                    setPaymentMonth(targetMonth);
                    setPaymentYear(targetYear);
                    setCurrentMonthStatus(targetStatus);

                    if (reservationData && reservationData.estado === "aceptada") {
                        calculatePayment(reservationData, targetMonth, targetYear);
                    }
                }
            } catch {
                showError("No se pudieron cargar tus datos de pago. Intenta recargar la página.");
            }
        };

        fetchData();
    }, [navigate, showError]);

    const calculatePayment = (res: ReservationData, targetMonth?: number, targetYear?: number) => {
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
            const prorated = parseFloat(((basePrice / 4) * weekIndex).toFixed(2));
            setPaymentAmount(prorated);
            setIsProrated(true);
        } else {
            setPaymentAmount(basePrice);
            setIsProrated(false);
        }
    };

    const handleRequestPayment = async () => {
        if (!reservation || !paymentMonth || !paymentYear) return;
        
        const fecha_pago = `${paymentYear}-${String(paymentMonth).padStart(2, "0")}-01`;
        const body = {
            reservacion_id: reservation.id,
            monto: paymentAmount,
            fecha_pago,
            mes: paymentMonth,
            anio: paymentYear,
        };
        
        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/payment/request`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(body)
            });
            
            if (res.ok) {
                setCurrentMonthStatus("pendiente");
                const pRes = await fetch(`/api/payment/me`, { credentials: "include" });
                if (pRes.ok) {
                    const nuevos: PaymentRecord[] = await pRes.json();
                    setPayments(nuevos.map((p) => ({ ...p, mes: Number(p.mes), anio: Number(p.anio), estado: String(p.estado || "").toLowerCase() })));
                }
            } else {
                const errorData = await res.json().catch(() => ({ error: "Error desconocido" }));
                console.error("Solicitud de pago fallida:", errorData);
                showError(errorData.error || "No se pudo registrar tu solicitud de pago. Intenta de nuevo.");
            }
        } catch(e) {
            console.error(e);
            showError("Error de conexión al solicitar el pago. Intenta de nuevo.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isProratedPaymentRecord = (payment: PaymentRecord) => {
        if (!reservation?.fecha_ingreso) return false;
        const [year, month] = reservation.fecha_ingreso.split("T")[0].split("-").map(Number);
        const basePrice = reservation.tipo === "individual" ? 2000 : 1200;
        const amount = Number(payment.monto ?? payment.monto_pagado ?? 0);
        return payment.mes === month && payment.anio === year && amount < basePrice;
    };

    if (!user) return null;

    const formatter = new Intl.NumberFormat('es-MX', {
        style: 'currency',
        currency: 'MXN',
        maximumFractionDigits: 0,
    });

    const isPending = reservation?.estado === "aceptada";
    const dueDate = paymentMonth && paymentYear
        ? new Date(paymentYear, paymentMonth - 1, 1).toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        })
        : "—";
    const currentYear = new Date().getFullYear();
    const paidThisYear = payments
        .filter((payment) => payment.estado === "pagado" && payment.anio === currentYear)
        .reduce((total, payment) => total + Number(payment.monto ?? payment.monto_pagado ?? 0), 0);
    const sortedPayments = [...payments].sort((a, b) => b.anio - a.anio || b.mes - a.mes);
    const paymentStatusTone = currentMonthStatus === "pagado"
        ? "ok"
        : currentMonthStatus === "pendiente"
            ? "rev"
            : currentMonthStatus === "atrasado"
                ? "no"
                : "pend";
    const paymentStatusLabel = currentMonthStatus === "pagado"
        ? "Pagado"
        : currentMonthStatus === "pendiente"
            ? "En revisión"
            : currentMonthStatus === "atrasado"
                ? "Rechazado"
                : "Por realizar";

    return (
        <ResidentLayout active="payments" userName={user?.nombre}>
            <header className="mk-page-head">
                <div>
                    <span className="mk-eyebrow">ESTADO DE CUENTA</span>
                    <h1 className="mk-page-title">Gestión de pagos</h1>
                    <p className="mk-lead">Consulta tus cuotas, comprobantes e historial.</p>
                </div>
            </header>

            {message && <Notice type={message.type} onClose={clear}>{message.text}</Notice>}

            <div className="mk-stat-grid">
                <div className="mk-stat">
                    <span className="mk-stat-icon"><Icon name="wallet" size={17} /></span>
                    <strong>{isPending ? formatter.format(paymentAmount) : "—"}</strong>
                    <small>Próximo pago</small>
                </div>
                <div className="mk-stat">
                    <span className="mk-stat-icon"><Icon name="calendar" size={17} /></span>
                    <strong>{isPending ? dueDate : "—"}</strong>
                    <small>Vencimiento</small>
                </div>
                <div className="mk-stat">
                    <span className="mk-stat-icon"><Icon name="check" size={17} /></span>
                    <strong>{formatter.format(paidThisYear)}</strong>
                    <small>Pagado este año</small>
                </div>
                <div className="mk-stat">
                    <span className="mk-stat-icon"><Icon name="card" size={17} /></span>
                    <strong>{payments.length}</strong>
                    <small>Pagos registrados</small>
                </div>
            </div>

            <div className="mk-payments-grid">
                <section className="mk-card mk-payment-upcoming">
                    <div className="mk-card-head">
                        <span className="mk-eyebrow">TU PRÓXIMO PAGO</span>
                        {isPending && <StatusPill tone={paymentStatusTone}>{paymentStatusLabel}</StatusPill>}
                    </div>

                    {isPending ? (
                        <>
                            <div className="mk-amount-block">
                                <strong>{formatter.format(paymentAmount)}</strong>
                                <small>
                                    Cuota de mantenimiento · {dueDate}
                                    {isProrated ? " · prorrateo aplicado" : ""}
                                </small>
                            </div>

                            {currentMonthStatus === "atrasado" && (
                                <p className="mk-payment-rejected">Tu pago fue rechazado. Puedes volver a solicitarlo.</p>
                            )}

                            <button
                                type="button"
                                onClick={handleRequestPayment}
                                disabled={isSubmitting || (Boolean(currentMonthStatus) && currentMonthStatus !== "atrasado")}
                                className="mk-btn mk-primary mk-block"
                            >
                                {isSubmitting
                                    ? "Enviando solicitud..."
                                    : currentMonthStatus === "atrasado"
                                        ? "Reenviar pago"
                                        : currentMonthStatus === "pendiente"
                                            ? "Pago solicitado"
                                            : currentMonthStatus === "pagado"
                                                ? "Pago completo"
                                                : <>Solicitar pago <Icon name="arrowRight" size={16} /></>}
                            </button>
                        </>
                    ) : (
                        <p className="mk-empty-note">No tienes estancias activas asociadas a cobros pendientes.</p>
                    )}
                </section>

                <section className="mk-card mk-payment-placeholder" aria-label="Espacio reservado para una futura función">
                    <div className="mk-payment-placeholder-surface" aria-hidden="true" />
                </section>
            </div>

            <section className="mk-payment-history">
                <h2 className="mk-card-title">Historial de pagos</h2>
                {sortedPayments.length === 0 ? (
                    <div className="mk-payment-empty">
                        <Icon name="clock" size={22} />
                        <p>No hay registros de pagos anteriores.</p>
                    </div>
                ) : (
                    <div className="mk-payment-list">
                        {sortedPayments.map((payment) => {
                            const monthName = new Date(payment.anio, payment.mes - 1, 1)
                                .toLocaleDateString("es-MX", { month: "long", year: "numeric" });
                            const paymentType = payment.tipo_pago === "prorrateo"
                                ? "Prorrateo"
                                : payment.tipo_pago === "mantenimiento"
                                    ? "Mantenimiento"
                                    : "Renta mensual";
                            const tone = payment.estado === "pagado" ? "ok" : payment.estado === "pendiente" ? "rev" : "no";
                            const status = payment.estado === "pagado" ? "Pagado" : payment.estado === "pendiente" ? "En revisión" : "Rechazado";

                            return (
                                <article key={payment.id} className="mk-payment-row">
                                    <span className="mk-payment-row-icon"><Icon name="card" size={17} /></span>
                                    <div className="mk-payment-row-detail">
                                        <strong>
                                            {formatter.format(Number(payment.monto ?? payment.monto_pagado ?? 0))}
                                            {" · "}{monthName.charAt(0).toLocaleUpperCase("es-MX") + monthName.slice(1)}
                                        </strong>
                                        <small>
                                            {paymentType}
                                            {isProratedPaymentRecord(payment) && payment.tipo_pago !== "prorrateo" ? " · Prorrateo" : ""}
                                        </small>
                                    </div>
                                    <StatusPill tone={tone}>{status}</StatusPill>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>
        </ResidentLayout>
    );
};

export default Payments;