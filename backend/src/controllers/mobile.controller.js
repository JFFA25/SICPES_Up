const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const db = require("../database/db");

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");
const LOGIN_REQUEST_TTL_MS = 3 * 60 * 1000; // 3 minutos para aprobar desde el reloj

// Solicitudes de login pendientes de aprobar desde el Wear OS (en memoria).
// No usa WhatsApp/SMS como en la web - el código lo genera y muestra el
// propio reloj, el backend solo necesita saber si esa solicitud fue
// aprobada o no.
//
// Estructura: loginRequestId -> { userId, email, estado, watchCode, expiresAt }
const pendingLoginRequests = new Map();

const passwordMatches = async (storedPassword, suppliedPassword) => {
  if (!storedPassword || !suppliedPassword) return false;
  if (typeof storedPassword === "string" && storedPassword.startsWith("$2")) {
    return bcrypt.compare(suppliedPassword, storedPassword);
  }
  return storedPassword === suppliedPassword;
};

// Limpieza perezosa de solicitudes vencidas para no acumular memoria
const cleanupExpired = () => {
  const now = Date.now();
  for (const [id, req] of pendingLoginRequests.entries()) {
    if (now > req.expiresAt) pendingLoginRequests.delete(id);
  }
};

// PASO 1 (celular): valida email/password. Si son correctos, crea una
// solicitud de login pendiente y le avisa al celular para que la mande
// a su reloj emparejado por la Wearable Data Layer API. Todavía NO
// entrega token.
const loginMobileStep1 = (req, res) => {
  cleanupExpired();
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Correo y contraseña son obligatorios" });
  }

  const normalizedEmail = normalizeEmail(email);

  db.query("SELECT * FROM tbd_usuarios WHERE email = ?", [normalizedEmail], async (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error del servidor" });
    }

    if (results.length === 0) {
      return res.status(400).json({ error: "Correo o contraseña incorrectos" });
    }

    const user = results[0];
    const isValid = await passwordMatches(user.password, password);

    if (!isValid) {
      return res.status(400).json({ error: "Correo o contraseña incorrectos" });
    }

    if (!user.confirmado) {
      return res.status(403).json({ error: "Debes confirmar tu correo antes de iniciar sesión" });
    }

    const loginRequestId = crypto.randomUUID();
    pendingLoginRequests.set(loginRequestId, {
      userId: user.id,
      email: normalizedEmail,
      estado: "pendiente", // pendiente | aprobado | rechazado
      watchCode: null,
      expiresAt: Date.now() + LOGIN_REQUEST_TTL_MS,
    });

    return res.status(202).json({
      loginRequestId,
      message: "Confirma este inicio de sesión desde tu reloj.",
      expiresInSeconds: LOGIN_REQUEST_TTL_MS / 1000,
    });
  });
};

// LLAMADO POR EL RELOJ: el Wear OS genera su propio código (solo para
// mostrárselo al usuario en la pantalla del reloj/celular), y aquí
// marca la solicitud como aprobada o rechazada. El celular se entera
// del resultado consultando /verify-login (o el propio reloj se lo
// puede reenviar por la Data Layer, es un canal aparte de este).
const respondLoginFromWatch = (req, res) => {
  cleanupExpired();
  const { loginRequestId, code, aprobado } = req.body;

  if (!loginRequestId) {
    return res.status(400).json({ error: "Falta loginRequestId" });
  }

  const pending = pendingLoginRequests.get(loginRequestId);

  if (!pending) {
    return res.status(404).json({ error: "La solicitud ya expiró o no existe" });
  }

  if (aprobado === false) {
    pending.estado = "rechazado";
    return res.json({ message: "Inicio de sesión rechazado" });
  }

  pending.estado = "aprobado";
  pending.watchCode = code || null;

  return res.json({ message: "Inicio de sesión aprobado" });
};

// PASO 2 (celular, con polling corto): pregunta si ya se aprobó desde
// el reloj. Si sí, aquí se emite el JWT.
const verifyLoginStatus = (req, res) => {
  cleanupExpired();
  const { loginRequestId } = req.body;

  if (!loginRequestId) {
    return res.status(400).json({ error: "Falta loginRequestId" });
  }

  const pending = pendingLoginRequests.get(loginRequestId);

  if (!pending) {
    return res.status(404).json({ error: "La solicitud ya expiró o no existe" });
  }

  if (pending.estado === "rechazado") {
    pendingLoginRequests.delete(loginRequestId);
    return res.status(401).json({ error: "Rechazaste el inicio de sesión desde tu reloj" });
  }

  if (pending.estado === "pendiente") {
    return res.status(202).json({ estado: "pendiente" });
  }

  // aprobado -> emitir JWT y limpiar la solicitud
  pendingLoginRequests.delete(loginRequestId);

  db.query("SELECT id, nombre, email, rol FROM tbd_usuarios WHERE id = ?", [pending.userId], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ error: "Error del servidor" });
    }

    const user = results[0];
    const payload = { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    });

    return res.json({ estado: "aprobado", token, user: payload });
  });
};

module.exports = { loginMobileStep1, respondLoginFromWatch, verifyLoginStatus };
