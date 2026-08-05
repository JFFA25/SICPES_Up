// Equivalente a sp_generar_reporte_demo (TiDB no soporta stored procedures).
// Uso: node scripts/generar_reporte_demo.js <numero_de_reservaciones>
// Ejemplo: node scripts/generar_reporte_demo.js 20
require("dotenv").config();
const connection = require("../src/database/db");

const NOMBRES = ["Ana","Luis","Sofia","Diego","Carla","Javier","Maria","Fernando",
  "Paola","Ricardo","Valeria","Emilio","Ximena","Alejandro","Renata","Gustavo"];
const APELLIDOS = ["Gomez","Lopez","Perez","Diaz","Ruiz","Hernandez","Garcia","Martinez",
  "Torres","Ramirez","Flores","Castillo","Reyes","Morales","Vargas","Ortiz"];
const MOTIVOS_RECHAZO = [
  "Falta de documentación académica",
  "Cupo lleno en el piso seleccionado",
  "Incumplimiento de políticas de convivencia",
  "Error en la verificación de identidad",
  "Historial de pagos negativo",
  "Solicitud duplicada",
];
// Hash de ejemplo (mismo que usaba el SP original) — no representa una contraseña real usable.
const PASSWORD_HASH = "$2b$10$WjFCzZfNuazV4CcYUK6DsOiOvxQ9DJ9cKi.nSYSqngdF4a9II6GAK";

const numReservaciones = parseInt(process.argv[2], 10) || 10;

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    connection.query(sql, params, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}
function toSqlDate(d) {
  return d.toISOString().slice(0, 10);
}
function toSqlDateTime(d) {
  return d.toISOString().slice(0, 19).replace("T", " ");
}
function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}
function subMonths(date, months) {
  const d = new Date(date);
  d.setMonth(d.getMonth() - months);
  return d;
}

async function generar() {
  try {
    await query("SET FOREIGN_KEY_CHECKS = 0");
    await query("SET SQL_SAFE_UPDATES = 0");

    const [{ total: numHabitaciones }] = await query(
      "SELECT COUNT(*) AS total FROM tbi_habitaciones"
    );

    for (let i = 1; i <= numReservaciones; i++) {
      // ---------- 1. USUARIO ----------
      const nombre = pick(NOMBRES);
      const apellido = pick(APELLIDOS);
      const telefono = `whatsapp:+521${String(randInt(0, 9999999999)).padStart(10, "0")}`;
      const email = `${nombre.toLowerCase()}.${apellido.toLowerCase()}${i}${randInt(0, 9999)}@sicpes-demo.mx`;

      const userResult = await query(
        `INSERT INTO tbd_usuarios (nombre, email, password, rol, confirmado, telefono)
         VALUES (?, ?, ?, 'user', 1, ?)`,
        [`${nombre} ${apellido}`, email, PASSWORD_HASH, telefono]
      );
      const uid = userResult.insertId;

      // ---------- 2. RESERVACIÓN ----------
      let roll = randInt(0, 99);
      const tipo = roll < 55 ? "compartida" : "individual";

      let piso, habitacion;
      if (numHabitaciones > 0) {
        const [hab] = await query(
          "SELECT piso, habitacion FROM tbi_habitaciones ORDER BY RAND() LIMIT 1"
        );
        piso = parseInt(hab.piso, 10);
        habitacion = parseInt(hab.habitacion, 10);
      } else {
        piso = randInt(1, 5);
        habitacion = piso * 100 + randInt(1, 20);
      }
      const monto = Math.round((1800 + Math.random() * 2200) / 50) * 50;

      const mesesAtras = randInt(1, 6);
      const fechaIngreso = addDays(subMonths(new Date(), mesesAtras), randInt(0, 27));
      const creadoEn = addDays(fechaIngreso, -randInt(1, 10));

      roll = randInt(0, 99);
      const estadoRes =
        roll < 55 ? "aceptada" :
        roll < 70 ? "pendiente" :
        roll < 82 ? "finalizada" :
        roll < 91 ? "cancelada" : "rechazada";

      const motivoRechazo = estadoRes === "rechazada" ? pick(MOTIVOS_RECHAZO) : null;

      const resResult = await query(
        `INSERT INTO tbd_reservaciones (usuario_id, fecha_ingreso, tipo, piso, habitacion, monto, estado, motivo_rechazo, creado_en)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [uid, toSqlDate(fechaIngreso), tipo, piso, habitacion, monto, estadoRes, motivoRechazo, toSqlDateTime(creadoEn)]
      );
      const rid = resResult.insertId;

      // ---------- 3. HISTORIAL DE PAGOS Y CUOTAS ----------
      if (estadoRes === "aceptada" || estadoRes === "finalizada") {
        for (let j = mesesAtras; j >= 0; j--) {
          const fechaMes = subMonths(new Date(), j);
          const mes = fechaMes.getMonth() + 1;
          const anio = fechaMes.getFullYear();

          roll = randInt(0, 99);
          let estadoPago;
          if (j === 0) {
            estadoPago = roll < 40 ? "Pagado" : roll < 75 ? "Pendiente" : "Atrasado";
          } else {
            estadoPago = roll < 85 ? "Pagado" : roll < 93 ? "Pendiente" : "Atrasado";
          }

          const metodoPago = pick(["transferencia", "efectivo", "tarjeta_credito"]);
          const montoPagado = estadoPago === "Pagado" ? monto : 0.0;
          const fechaPago = estadoPago === "Pagado" ? toSqlDateTime(addDays(fechaMes, randInt(1, 25))) : null;
          const estadoCuota = estadoPago === "Pagado" ? "pagada" : "pendiente";

          await query(
            `INSERT INTO tbd_pagos (reservacion_id, mes, anio, monto_pagado, monto_calculado, fecha_pago, fecha_generada, metodo_pago, estado, tipo_pago)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'mensual')`,
            [rid, mes, anio, montoPagado, monto, fechaPago, toSqlDate(fechaMes), metodoPago, estadoPago]
          );

          await query(
            `INSERT INTO tbd_cuotas (reservacion_id, mes, anio, tipo_pago, monto_calculado, monto_real, estado, fecha_vencimiento)
             VALUES (?, ?, ?, 'mensual', ?, ?, ?, ?)`,
            [rid, mes, anio, monto, estadoPago === "Pagado" ? monto : 0.0, estadoCuota, toSqlDate(addDays(fechaMes, 5))]
          );
        }
      }

      console.log(`✔ (${i}/${numReservaciones}) Usuario ${email} — reservación ${estadoRes}`);
    }

    await query("SET FOREIGN_KEY_CHECKS = 1");
    await query("SET SQL_SAFE_UPDATES = 1");
    console.log(`Listo. Se generaron ${numReservaciones} reservaciones de prueba.`);
  } catch (err) {
    console.error("Error generando datos demo:", err.message);
  } finally {
    connection.end();
  }
}

generar();
