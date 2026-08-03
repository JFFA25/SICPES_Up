const rateLimit = require("express-rate-limit");

// Límite para intentos de login/registro: 10 intentos cada 15 minutos por IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiados intentos. Intenta de nuevo más tarde." },
});

// Límite más estricto para recuperación de contraseña: 5 intentos por hora por IP
const forgotPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Demasiadas solicitudes de recuperación. Intenta de nuevo más tarde." },
});

module.exports = { authLimiter, forgotPasswordLimiter };
