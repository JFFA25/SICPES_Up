require("dotenv").config();
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const helmet = require("helmet");

const app = express();

// Necesario detrás de un balanceador de cargas para que las cookies "secure" funcionen bien
app.set("trust proxy", 1);

// CONEXIÓN BD
require("./src/database/db");

// SEGURIDAD - Cabeceras HTTP recomendadas (CSP desactivado para no romper el frontend en dev)
app.use(
  helmet({
    contentSecurityPolicy: false,
  })
);

// CORS - usa FRONTEND_URL en .env (dominio real en la nube, https://localhost:5173 en local)
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "https://localhost:5173",
    credentials: true,
  })
);

// MIDDLEWARES
app.use(express.json());

// SESSION - Configuración optimizada para HTTPS de producción/desarrollo local seguro
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secreto",
    resave: false,
    saveUninitialized: false,
    rolling: true, // Renueva la sesión cada vez que el usuario hace una petición
    cookie: {
      // En producción (detrás del balanceador con HTTPS real) exige secure+none.
      // En local/desarrollo (HTTP plano) no puede ser secure, o el navegador la descarta.
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
      maxAge: 30 * 60 * 1000, // 30 minutos de inactividad
    },
  })
);

// RUTA RAÍZ - Health check
app.get("/", (req, res) => {
  res.send("Backend SICPES Funcionando Correctamente");
});

// RUTAS (DESPUÉS DE SESSION)
const authRoutes = require("./src/routes/auth.routes");
app.use("/api", authRoutes);

const reservationRoutes = require("./src/routes/reservation.routes");
app.use("/api", reservationRoutes);

const paymentRoutes = require("./src/routes/payment.routes");
app.use("/api/payment", paymentRoutes);

const roomRoutes = require("./src/routes/room.routes");
app.use("/api/rooms", roomRoutes);

const adminRoutes = require("./src/routes/admin.routes");
app.use("/api/admin", adminRoutes);

const reportesRoutes = require("./src/routes/reports.routes");
app.use("/api/admin/reportes", reportesRoutes);

const adminController = require("./src/controllers/admin.controller");
app.get("/api/settings", adminController.getPublicSettings);

const externalRoutes = require("./src/routes/external.routes");
app.use("/api", externalRoutes);

// CONTROL DE USUARIOS POR DEFECTO
const createDefaultUsers = require("./src/utils/initUsers");
createDefaultUsers();

// 2. CONFIGURACIÓN DEL SERVIDOR
// El certificado SSL/TLS real ahora se termina en el balanceador de cargas.
// El backend solo habla HTTP plano dentro de la red interna de la nube.
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
