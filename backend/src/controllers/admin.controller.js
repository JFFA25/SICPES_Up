const db = require("../database/db");
const { readSettings, writeSettings } = require("../utils/settingsStore");
const { notifyReservationOwner, pushToUser } = require("../utils/push");

// OBTENER TODOS LOS PAGOS (ADMIN)
const getAllPayments = (req, res) => {
  const sql = `
    SELECT p.*, p.monto_pagado AS monto,
           u.nombre, u.email, u.foto_perfil_url, r.piso, r.habitacion
    FROM tbd_pagos p
    JOIN tbd_reservaciones r ON p.reservacion_id = r.id
    JOIN tbd_usuarios u ON r.usuario_id = u.id
    ORDER BY p.anio DESC, p.mes DESC, p.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    res.json(results);
  });
};

const sendPaymentReminder = async (req, res) => {
  const { id } = req.params;

  try {
    const [rows] = await db.promise().query(
      `SELECT p.reservacion_id, p.mes, p.anio, p.estado,
              COALESCE(p.monto_calculado, p.monto_pagado, 0) AS monto,
              r.usuario_id
       FROM tbd_pagos p
       JOIN tbd_reservaciones r ON p.reservacion_id = r.id
       WHERE p.id = ?
       LIMIT 1`,
      [id]
    );
    const payment = rows[0];
    if (!payment) return res.status(404).json({ error: "Pago no encontrado" });
    if (String(payment.estado).toLowerCase() === "pagado") {
      return res.status(409).json({ error: "No se puede recordar un pago que ya fue aprobado" });
    }

    const month = Number(payment.mes);
    const year = Number(payment.anio);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 1) {
      return res.status(409).json({ error: "El periodo de pago no es válido" });
    }
    const dueDate = new Date(year, month - 1, 1);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (String(payment.estado).toLowerCase() !== "atrasado" && dueDate >= today) {
      return res.status(409).json({ error: "Este periodo todavía no está vencido" });
    }

    const title = "Recordatorio de pago pendiente";
    const body = `Tienes un pago pendiente de ${month}/${year} por $${Number(payment.monto).toFixed(2)} MXN. Revisa tu cuenta.`;
    await db.promise().query(
      "INSERT INTO tbd_notificaciones (usuario_id, tipo, titulo, cuerpo, url) VALUES (?, ?, ?, ?, ?)",
      [payment.usuario_id, "pago_recordatorio", title, body, "/payments"]
    );
    void pushToUser(payment.usuario_id, { title, body, url: "/payments", tag: "pago_recordatorio" })
      .catch((error) => console.error("[admin] Error enviando push de recordatorio:", error.message));
    return res.json({ message: "Recordatorio registrado en las notificaciones del estudiante." });
  } catch (error) {
    console.error("[admin] No se pudo enviar el recordatorio de pago:", error.message);
    return res.status(500).json({ error: "No se pudo enviar el recordatorio de pago" });
  }
};

// ACTUALIZAR ESTADO DE PAGO (ADMIN)
const updatePaymentStatus = (req, res) => {
  const { id } = req.params;
  const { estado } = req.body;

  const normalized = String(estado || "").toLowerCase();
  const statusMap = {
    pendiente: "Pendiente",
    aprobado: "Pagado",
    pagado: "Pagado",
    rechazado: "Atrasado",
    atrasado: "Atrasado",
  };

  const dbEstado = statusMap[normalized];
  if (!dbEstado) {
    return res.status(400).json({ error: "Estado de pago inválido" });
  }

  const sql = "UPDATE tbd_pagos SET estado = ? WHERE id = ?";
  db.query(sql, [dbEstado, id], (err) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });

    // Aviso push al estudiante (pagado / rechazado) con el periodo del pago
    if (dbEstado !== "Pendiente") {
      db.query("SELECT reservacion_id, mes, anio FROM tbd_pagos WHERE id = ?", [id], (e2, rows) => {
        const pago = rows && rows[0];
        if (e2 || !pago) return;
        notifyReservationOwner(pago.reservacion_id, dbEstado === "Pagado"
          ? { tipo: "pago_confirmado", title: "Pago confirmado", body: `Tu pago de ${pago.mes}/${pago.anio} fue confirmado.`, url: "/payments" }
          : { tipo: "pago_rechazado", title: "Pago no aprobado", body: `Tu pago de ${pago.mes}/${pago.anio} no fue aprobado. Revisa tu historial.`, url: "/payments" });
      });
    }

    res.json({ message: "Pago actualizado" });
  });
};

// OBTENER CONFIGURACIONES (ADMIN)
const getSettings = (req, res) => {
  res.json(readSettings());
};

const getPublicSettings = (req, res) => {
  res.json(readSettings());
};

// ACTUALIZAR CONFIGURACIONES (ADMIN)
const updateSettings = (req, res) => {
  const { precioIndividual, precioCompartida, emailAdmin } = req.body;

  if (!precioIndividual || !precioCompartida || !emailAdmin) {
    return res.status(400).json({ error: "Todos los campos son requeridos" });
  }

  const updated = writeSettings({
    precioIndividual,
    precioCompartida,
    emailAdmin,
  });

  res.json({ message: "Configuraciones actualizadas", settings: updated });
};

// GENERAR DATOS DE PRUEBA (MOCK DATA)
const generateMockData = (req, res) => {
  const { cantidad = 10, estado_reservacion = null, estado_pago = null, motivo_rechazo = null } = req.body;

  // Si los valores vienen vacíos o undefined, se mandan como null para que el SP los aleatorice
  const sql = "CALL sp_generar_lote_hibrido(?, ?, ?, ?)";
  db.query(sql, [cantidad, estado_reservacion, estado_pago, motivo_rechazo], (err) => {
    if (err) return res.status(500).json({ error: "Error al generar datos", details: err.message });
    res.json({ message: `Se generaron ${cantidad} registros exitosamente.` });
  });
};

module.exports = {
  getAllPayments,
  updatePaymentStatus,
  sendPaymentReminder,
  getSettings,
  getPublicSettings,
  updateSettings,
  generateMockData
};