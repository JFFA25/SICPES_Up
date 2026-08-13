// Limpia tbd_usuarios y todo lo que depende de ella (para no dejar registros huérfanos),
// y reinicia el contador de AUTO_INCREMENT (el próximo id insertado será 1).
// Uso: node scripts/limpiar_usuarios.js
require("dotenv").config();
const connection = require("../src/database/db");

// Orden importa: primero las tablas que dependen de usuarios, al final usuarios.
const TABLAS = ["tbd_pagos", "tbd_cuotas", "tbd_reservaciones", "tbd_usuarios"];

function query(sql) {
  return new Promise((resolve, reject) => {
    connection.query(sql, (err, result) => {
      if (err) return reject(err);
      resolve(result);
    });
  });
}

async function limpiarUsuarios() {
  try {
    await query("SET FOREIGN_KEY_CHECKS = 0");

    for (const tabla of TABLAS) {
      await query(`TRUNCATE TABLE ${tabla}`);
      console.log(`✔ Tabla ${tabla} truncada`);
    }

    await query("SET FOREIGN_KEY_CHECKS = 1");
    console.log("Listo. Usuarios (y sus dependientes) limpiados. El próximo id será 1.");
  } catch (err) {
    console.error("Error al limpiar usuarios:", err.message);
  } finally {
    connection.end();
  }
}

limpiarUsuarios();
