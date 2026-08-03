const mysql = require("mysql2");

const useSSL = process.env.DB_SSL === "true";

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT,
  ...(useSSL ? { ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true } } : {}),
});

// MENSAJE DE CONEXIÓN
connection.connect((err) => {
  if (err) {
    console.error("Error al conectar a MySQL:", err.message);
  } else {
    console.log("Conectado a MySQL correctamente");
  }
});

module.exports = connection;