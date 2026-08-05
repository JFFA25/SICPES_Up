// Equivalente a sp_limpiar_tablas (TiDB no soporta stored procedures).
// Uso: node scripts/limpiar_tablas.js
require("dotenv").config();
const connection = require("../src/database/db");

// Se puede agregar el nombre de otra tabla si es que se agrega una nueva tabla, también se limpiará
const TABLAS = ["tbd_pagos", "tbd_reservaciones", "tbd_cuotas"];

async function limpiarTablas() {
  try {
    await query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tabla of TABLAS) {
      await query(`TRUNCATE TABLE ${tabla}`);
      console.log(`✔ Tabla ${tabla} truncada`);
    }

    await query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Listo. Tablas limpiadas (usuarios no se tocaron).");
  } catch (err) {
    console.error("Error al limpiar tablas:", err.message);
  } finally {
    connection.end();
  }
}

function query(sql) {
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

limpiarTablas();
