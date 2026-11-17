const db = require("../database/db");
const { readSettings, writeSettings } = require("../utils/settingsStore");
const { notifyReservationOwner } = require("../utils/push");

// OBTENER TODAS LAS RESERVACIONES (ADMIN)
const getAllReservations = (req, res) => {
  const sql = `
    SELECT p.*, p.monto_pagado AS monto, u.nombre, u.email, MONTH(p.fecha_pago) AS mes, YEAR(p.fecha_pago) AS anio
    FROM tbd_pagos p
    JOIN tbd_reservaciones r ON p.reservacion_id = r.id
    JOIN tbd_usuarios u ON r.usuario_id = u.id
    ORDER BY p.fecha_pago DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    res.json(results);
  });
};

// ACTUALIZAR ESTADO DE RESERVACIÓN (ADMIN)
const updateReservationStatus = (req, res) => {
  const { id } = req.params;
  const { estado, motivo_rechazo, piso, habitacion, monto } = req.body;

  let sql, values;

  if (estado === "aceptada" && piso && habitacion && monto) {
    // Si se acepta, actualizar también los detalles
    sql = "UPDATE tbd_reservaciones SET estado = ?, motivo_rechazo = ?, piso = ?, habitacion = ?, monto = ? WHERE id = ?";
    values = [estado, motivo_rechazo || null, piso, habitacion, monto, id];
  } else {
    sql = "UPDATE tbd_reservaciones SET estado = ?, motivo_rechazo = ? WHERE id = ?";
    values = [estado, motivo_rechazo || null, id];
  }

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    res.json({ message: "Reservación actualizada" });
  });
};

// OBTENER TODOS LOS PAGOS (ADMIN)
const getAllPayments = (req, res) => {
  const sql = `
    SELECT p.*, u.nombre, u.email, MONTH(p.fecha_pago) AS mes, YEAR(p.fecha_pago) AS anio
    FROM tbd_pagos p
    JOIN tbd_reservaciones r ON p.reservacion_id = r.id
    JOIN tbd_usuarios u ON r.usuario_id = u.id
    ORDER BY p.fecha_pago DESC
  `;

  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });
    res.json(results);
  });
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
  getAllReservations,
  updateReservationStatus,
  getAllPayments,
  updatePaymentStatus,
  getSettings,
  getPublicSettings,
  updateSettings,
  generateMockData
};