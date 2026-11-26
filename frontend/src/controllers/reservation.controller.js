const db = require("../database/db");
const {
  createReservation,
  getReservationByUser,
} = require("../models/reservation.model");
const { sendSms } = require("../utils/notifications");
const { notifyAdmins, notifyReservationOwner } = require("../utils/push");
const { readSettings } = require("../utils/settingsStore");

const pool = db.promise();
const CLOSED_STATES = "('cancelada', 'rechazada', 'finalizada')";


// CREAR RESERVACIÓN
// El tipo y el precio salen de la habitación elegida (no del cliente), y la
// verificación de cupos se hace dentro de una transacción que bloquea la fila
// de la habitación para que dos personas no puedan apartar el mismo lugar.

const createReservationController = async (req, res) => {
  const { fecha_ingreso, piso, habitacion } = req.body;

  // validar sesión
  if (!req.session.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const usuario_id = req.session.user.id;

  // validar datos y fecha
  if (!piso || !habitacion || !fecha_ingreso) {
    return res.status(400).json({ error: "Faltan datos de la reservación" });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha_ingreso))) {
    return res.status(400).json({ error: "La fecha de ingreso no es válida" });
  }
  const fechaHoy = new Date().toISOString().split("T")[0];
  if (fecha_ingreso < fechaHoy) {
    return res.status(400).json({
      error: "La fecha no puede ser anterior a hoy",
    });
  }

  let connection;
  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Bloquea la habitación mientras se valida y se guarda
    const [rooms] = await connection.query(
      "SELECT id, tipo, capacidad FROM tbi_habitaciones WHERE piso = ? AND habitacion = ? AND activa = 1 FOR UPDATE",
      [piso, habitacion]
    );
    const room = rooms[0];
    if (!room) {
      await connection.rollback();
      return res.status(404).json({ error: "Esa habitación no está disponible." });
    }

    // Una sola reservación activa por usuario
    const [mine] = await connection.query(
      `SELECT id FROM tbd_reservaciones WHERE usuario_id = ? AND estado NOT IN ${CLOSED_STATES}`,
      [usuario_id]
    );
    if (mine.length > 0) {
      await connection.rollback();
      return res.status(400).json({ error: "Ya tienes una reservación registrada" });
    }

    // Cupos de la habitación
    const [[{ ocupantes }]] = await connection.query(
      `SELECT COUNT(*) AS ocupantes FROM tbd_reservaciones
        WHERE piso = ? AND habitacion = ? AND estado NOT IN ${CLOSED_STATES}`,
      [piso, habitacion]
    );
    if (Number(ocupantes) >= Number(room.capacidad)) {
      await connection.rollback();
      return res.status(400).json({
        error: "Esta habitación ya está ocupada. Elige otra habitación.",
      });
    }

    // Precio según el tipo real de la habitación
    const settings = readSettings();
    const monto = Number(
      room.tipo === "compartida" ? settings.precioCompartida : settings.precioIndividual
    ) || 0;

    await connection.query(
      `INSERT INTO tbd_reservaciones (usuario_id, fecha_ingreso, tipo, piso, habitacion, monto, estado)
       VALUES (?, ?, ?, ?, ?, ?, 'pendiente')`,
      [usuario_id, fecha_ingreso, room.tipo, piso, habitacion, monto]
    );

    await connection.commit();
  } catch (error) {
    if (connection) await connection.rollback().catch(() => {});
    console.error("Error al crear reservación:", error);
    return res.status(500).json({ error: "Error al crear reservación" });
  } finally {
    if (connection) connection.release();
  }

  // Aviso push a los administradores (sin await: no retrasa la respuesta)
  notifyAdmins({
    tipo: "nueva_reservacion",
    title: "Nueva solicitud de reservación",
    body: `${req.session.user.nombre || "Un estudiante"} solicitó el piso ${piso}, habitación ${habitacion}.`,
    url: "/admin/reservations",
  });

  res.json({
    message: "Reservación enviada correctamente y está pendiente de revisión",
  });
};


// OBTENER RESERVACIÓN DEL USUARIO

const getMyReservation = (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "No autenticado" });
  }

  const usuario_id = req.session.user.id;

  getReservationByUser(usuario_id, (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Error al obtener reservación",
      });
    }

    res.json(results[0] || null);
  });
};


//  ADMIN: VER TODAS LAS RESERVACIONES

const getAllReservations = (req, res) => {
  const sql = `
    SELECT r.*, u.nombre, u.email, u.foto_perfil_url
    FROM tbd_reservaciones r
    JOIN tbd_usuarios u ON r.usuario_id = u.id
    ORDER BY r.id DESC
  `;

  db.query(sql, (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Error al obtener reservaciones",
      });
    }

    res.json(results);
  });
};


// ADMIN: ACTUALIZAR ESTADO

const updateReservationStatus = (req, res) => {
  const { id } = req.params;
  const { estado, monto, piso, habitacion, motivo_rechazo } = req.body;

  let updates = [];
  let values = [];

  if (estado) {
    const estadosValidos = ["pendiente", "aceptada", "cancelada", "rechazada", "finalizada"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: "Estado inválido" });
    }
    updates.push("estado = ?");
    values.push(estado);
  }

  if (monto !== undefined) {
    updates.push("monto = ?");
    values.push(monto);
  }

  if (piso !== undefined) {
    updates.push("piso = ?");
    values.push(piso);
  }

  if (habitacion !== undefined) {
    updates.push("habitacion = ?");
    values.push(habitacion);
  }

  if (motivo_rechazo !== undefined) {
    updates.push("motivo_rechazo = ?");
    values.push(motivo_rechazo);
  }

  if (updates.length === 0) {
    return res.status(400).json({ error: "No hay campos por actualizar" });
  }

  const runUpdate = () => {
  const sql = `
    UPDATE tbd_reservaciones 
    SET ${updates.join(", ")}
    WHERE id = ?
  `;
  values.push(id);

  db.query(sql, values, (err, result) => {
    if (err) {
      return res.status(500).json({
        error: "Error al actualizar estado",
      });
    }

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Reservación no encontrada",
      });
    }

    if (estado === "aceptada") {
      const userQuery = "SELECT u.nombre, u.email, u.telefono FROM tbd_usuarios u JOIN tbd_reservaciones r ON r.usuario_id = u.id WHERE r.id = ? LIMIT 1";
      db.query(userQuery, [id], async (userErr, userRows) => {
        if (!userErr && userRows && userRows[0]) {
          const user = userRows[0];
          const message = `Hola ${user.nombre}, tu reservación ha sido aceptada en SICPES.`;
          await sendSms({ to: user.telefono || user.email, body: message });
        }
      });
    }

    // Aviso push al estudiante cuando cambia el estado de su solicitud
    const avisos = {
      aceptada: ["Reservación aceptada", "Tu reservación fue aceptada. Ya puedes consultar tus pagos."],
      rechazada: ["Reservación rechazada", `Tu solicitud fue rechazada.${motivo_rechazo ? " Motivo: " + motivo_rechazo : ""}`],
      cancelada: ["Reservación cancelada", "Tu reservación fue cancelada."],
      finalizada: ["Reservación finalizada", "Tu reservación ha finalizado."],
    };
    if (estado && avisos[estado]) {
      notifyReservationOwner(id, {
        tipo: `reservacion_${estado}`,
        title: avisos[estado][0],
        body: avisos[estado][1],
        url: "/dashboard",
      });
    }

    res.json({
      message: "Actualizado correctamente",
    });
  });
  };

  // Si el admin cambia la habitación, se valida que exista y tenga cupo
  if (piso !== undefined || habitacion !== undefined) {
    db.query("SELECT piso, habitacion FROM tbd_reservaciones WHERE id = ?", [id], (findErr, found) => {
      if (findErr) return res.status(500).json({ error: "Error al actualizar estado" });
      if (!found[0]) return res.status(404).json({ error: "Reservación no encontrada" });

      const targetFloor = piso !== undefined ? piso : found[0].piso;
      const targetRoom = habitacion !== undefined ? habitacion : found[0].habitacion;

      db.query(
        `SELECT h.tipo, h.capacidad,
                (SELECT COUNT(*) FROM tbd_reservaciones r
                  WHERE r.piso = h.piso AND r.habitacion = h.habitacion
                    AND r.estado NOT IN ${CLOSED_STATES} AND r.id <> ?) AS ocupantes
           FROM tbi_habitaciones h WHERE h.piso = ? AND h.habitacion = ? AND h.activa = 1`,
        [id, targetFloor, targetRoom],
        (roomErr, rooms) => {
          if (roomErr) return res.status(500).json({ error: "Error al actualizar estado" });
          const target = rooms[0];
          if (!target) return res.status(400).json({ error: "Esa habitación no existe o está desactivada" });
          if (Number(target.ocupantes) >= Number(target.capacidad)) {
            return res.status(400).json({ error: "Esa habitación ya no tiene cupos disponibles" });
          }
          updates.push("tipo = ?");
          values.push(target.tipo);
          runUpdate();
        }
      );
    });
  } else {
    runUpdate();
  }
};


// OBTENER HABITACIONES OCUPADAS (llenas) DE UN PISO
// Una habitación aparece aquí cuando ya no tiene cupos disponibles.
const getOccupiedRooms = (req, res) => {
  const { piso } = req.query;

  const sql = `
    SELECT h.habitacion
    FROM tbi_habitaciones h
    WHERE h.piso = ?
      AND (
        SELECT COUNT(*) FROM tbd_reservaciones r
        WHERE r.piso = h.piso AND r.habitacion = h.habitacion
          AND r.estado NOT IN ${CLOSED_STATES}
      ) >= h.capacidad
  `;

  db.query(sql, [piso], (err, results) => {
    if (err) {
      return res.status(500).json({
        error: "Error al obtener habitaciones ocupadas",
      });
    }

    res.json(results.map((r) => r.habitacion));
  });
};

module.exports = {
  createReservationController,
  getMyReservation,
  getAllReservations,
  updateReservationStatus,
  getOccupiedRooms
};