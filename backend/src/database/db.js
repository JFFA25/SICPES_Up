const mysql = require("mysql2");

const useSSL = process.env.DB_SSL === "true";

// Pool en vez de una sola conexión: TiDB Cloud (como la mayoría de MySQL
// en la nube) cierra conexiones inactivas después de un rato. Con una
// sola conexión (createConnection), cuando eso pasa mysql2 dispara un
// evento 'error' que, sin nadie escuchándolo, tumba TODO el proceso de
// Node (comportamiento por defecto de EventEmitter). El pool evita esto:
// cada query toma una conexión disponible y las maneja/reemplaza solo.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  ...(useSSL ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
});

// Red de seguridad: si de todos modos llega un error a nivel pool
// (por ejemplo al abrir una conexión nueva), lo logueamos en vez de
// dejar que tumbe el proceso.
pool.on("error", (err) => {
  console.error("Error en el pool de MySQL:", err.message);
});

// MENSAJE DE CONEXIÓN - solo para confirmar que las credenciales sirven
pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error al conectar a MySQL:", err.message);
  } else {
    console.log("Conectado a MySQL correctamente");
    connection.release();
  }
});

module.exports = pool;