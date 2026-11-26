const { createUser } = require("../models/user.model");
const { sendConfirmationEmail, sendForgotPasswordEmail } = require("../utils/mailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const db = require("../database/db");
const { OAuth2Client } = require("google-auth-library");

const frontendBaseUrl = process.env.FRONTEND_URL || "http://localhost:5173";
const googleOAuthClient = new OAuth2Client();

// GLOBAL MAP TO TRACK USER SESSIONS
const activeSessions = new Map();
const pendingVerifications = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;

const normalizeEmail = (email) => (typeof email === "string" ? email.trim().toLowerCase() : "");
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));
const passwordMatches = async (storedPassword, suppliedPassword) => {
  if (!storedPassword || !suppliedPassword) return false;

  if (typeof storedPassword === "string" && (storedPassword.startsWith("$2") || storedPassword.startsWith("$2a") || storedPassword.startsWith("$2b"))) {
    return bcrypt.compare(suppliedPassword, storedPassword);
  }

  return storedPassword === suppliedPassword;
};

const createUserSession = (req, res, user) => {
  req.session.regenerate((err) => {
    if (err) {
      return res.status(500).json({ error: "Error al crear la sesión" });
    }

    if (activeSessions.has(user.id)) {
      const oldSessionId = activeSessions.get(user.id);
      if (req.sessionStore && req.sessionStore.destroy) {
        req.sessionStore.destroy(oldSessionId, (destroyError) => {
          if (destroyError) console.error("Error al destruir sesión antigua:", destroyError);
        });
      }
    }

    activeSessions.set(user.id, req.session.id);
    req.session.user = {
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
      foto_perfil_url: user.foto_perfil_url || null,
    };

    req.session.save((saveError) => {
      if (saveError) {
        return res.status(500).json({ error: "Error al guardar la sesión" });
      }

      return res.json({ message: "Login exitoso" });
    });
  });
};

const getGooglePictureUrl = (picture) => {
  if (typeof picture !== "string") return null;

  try {
    const url = new URL(picture);
    const isGoogleImageHost =
      url.hostname === "googleusercontent.com" ||
      url.hostname.endsWith(".googleusercontent.com");

    return url.protocol === "https:" && isGoogleImageHost && url.href.length <= 512
      ? url.href
      : null;
  } catch {
    return null;
  }
};

const loginUser = (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const sql = "SELECT * FROM tbd_usuarios WHERE email = ?";

  db.query(sql, [normalizeEmail(email)], async (err, results) => {
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

    return createUserSession(req, res, user);
  });
};

const googleLogin = async (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const { credential } = req.body || {};

  if (!clientId) {
    return res.status(503).json({ error: "El inicio de sesión con Google no está configurado" });
  }

  if (typeof credential !== "string" || !credential) {
    return res.status(400).json({ error: "No se recibió la credencial de Google" });
  }

  let payload;
  try {
    const ticket = await googleOAuthClient.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    payload = ticket.getPayload();
  } catch (error) {
    console.warn("No se pudo validar la credencial de Google:", error.message);
    return res.status(401).json({ error: "La autenticación de Google no es válida. Intenta de nuevo." });
  }

  const email = normalizeEmail(payload?.email);
  if (!payload?.sub || !email || payload.email_verified !== true || email.length > 100) {
    return res.status(401).json({ error: "La cuenta de Google no tiene un correo verificado válido" });
  }

  const nombre = (payload.name || email.split("@")[0]).trim().slice(0, 100);
  const fotoPerfil = getGooglePictureUrl(payload.picture);

  db.query(
    "SELECT id, nombre, email, rol, confirmado, foto_perfil_url FROM tbd_usuarios WHERE email = ? LIMIT 1",
    [email],
    (findError, results) => {
      if (findError) {
        console.error("Error buscando usuario de Google:", findError);
        return res.status(500).json({ error: "No se pudo consultar la cuenta" });
      }

      const existingUser = results[0];
      if (existingUser) {
        return db.query(
          `UPDATE tbd_usuarios
           SET confirmado = 1,
               token = NULL,
               foto_perfil_url = COALESCE(NULLIF(foto_perfil_url, ''), ?)
           WHERE id = ?`,
          [fotoPerfil, existingUser.id],
          (updateError) => {
            if (updateError) {
              console.error("Error actualizando cuenta autenticada con Google:", updateError);
              return res.status(500).json({ error: "No se pudo actualizar la cuenta" });
            }

            existingUser.confirmado = 1;
            existingUser.foto_perfil_url = existingUser.foto_perfil_url || fotoPerfil;
            return createUserSession(req, res, existingUser);
          }
        );
      }

      db.query(
        `INSERT INTO tbd_usuarios
           (nombre, email, password, rol, confirmado, token, foto_perfil_url)
         VALUES (?, ?, NULL, 'user', 1, NULL, ?)`,
        [nombre, email, fotoPerfil],
        (insertError, result) => {
          if (insertError) {
            console.error("Error creando usuario de Google:", insertError);
            return res.status(500).json({ error: "No se pudo crear la cuenta" });
          }

          return createUserSession(req, res, {
            id: result.insertId,
            nombre,
            email,
            rol: "user",
            foto_perfil_url: fotoPerfil,
          });
        }
      );
    }
  );
};

const getSession = (req, res) => {
  if (!req.session.user?.id) {
    return res.status(401).json({ error: "No autorizado" });
  }

  db.query(
    "SELECT id, nombre, email, rol, foto_perfil_url FROM tbd_usuarios WHERE id = ? LIMIT 1",
    [req.session.user.id],
    (err, results) => {
      if (err) {
        console.error("Error cargando sesión de usuario:", err);
        return res.status(500).json({ error: "No se pudo cargar la sesión" });
      }

      if (results.length === 0) {
        return res.status(401).json({ error: "La cuenta ya no existe" });
      }

      req.session.user = results[0];
      return res.json(req.session.user);
    }
  );
};

const registerUser = async (req, res) => {
  const { nombre, email, password, telefono, phone } = req.body;

  if (!nombre || !email || !password || nombre.trim() === "" || email.trim() === "" || password.trim() === "") {
    return res.status(400).json({ error: "Todos los campos son obligatorios" });
  }

  const normalizedEmail = normalizeEmail(email);
  const token = crypto.randomBytes(20).toString("hex");
  const otp = generateOtp();
  const phoneValue = telefono || phone || "";

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    createUser({ nombre, email: normalizedEmail, password: hashedPassword, token, telefono: phoneValue }, async (err) => {
      if (err) {
        return res.status(500).json({ error: "Error al registrar" });
      }

      pendingVerifications.set(normalizedEmail, {
        email: normalizedEmail,
        otp,
        expiresAt: Date.now() + OTP_TTL_MS,
        phone: phoneValue,
      });

      try {
        await sendConfirmationEmail(normalizedEmail, token, nombre);
      } catch (error) {
        console.error("Error al enviar correo de confirmación:", error);
        return res.status(502).json({
          error: "La cuenta se registró, pero no se pudo enviar el correo de confirmación.",
          requiresVerification: true,
        });
      }

      res.json({
        message: "Registro exitoso. Revisa tu correo para confirmar tu cuenta.",
        requiresVerification: true,
        email: normalizedEmail,
      });
    });
  } catch (error) {
    console.error("Error al hashear contraseña:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

const confirmUser = (req, res) => {
  const { token } = req.params;

  const sql = `
    UPDATE tbd_usuarios 
    SET confirmado = 1, token = NULL 
    WHERE token = ?
  `;

  db.query(sql, [token], (err, result) => {
    if (err) {
      console.error(err);
      return res.redirect(`${frontendBaseUrl}/error`);
    }

    if (result.affectedRows === 0) {
      return res.redirect(`${frontendBaseUrl}/error`);
    }

    res.redirect(`${frontendBaseUrl}/confirmado`);
  });
};

const verifyOtp = (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ error: "Email y código son obligatorios" });
  }

  const normalizedEmail = normalizeEmail(email);
  const pending = pendingVerifications.get(normalizedEmail);

  if (!pending) {
    return res.status(400).json({ error: "No hay un código de verificación activo para este correo" });
  }

  if (Date.now() > pending.expiresAt) {
    pendingVerifications.delete(normalizedEmail);
    return res.status(400).json({ error: "El código ha expirado. Solicita uno nuevo" });
  }

  if (String(code) !== String(pending.otp)) {
    return res.status(400).json({ error: "Código de verificación incorrecto" });
  }

  const sql = "UPDATE tbd_usuarios SET confirmado = 1, token = NULL WHERE email = ?";
  db.query(sql, [normalizedEmail], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: "Error al verificar la cuenta" });
    }

    pendingVerifications.delete(normalizedEmail);
    return res.json({ message: "Cuenta verificada correctamente" });
  });
};

const resendConfirmation = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  const normalizedEmail = normalizeEmail(email);
  db.query("SELECT * FROM tbd_usuarios WHERE email = ?", [normalizedEmail], async (err, results) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    if (results.length === 0) return res.status(404).json({ error: "No se encontró el usuario" });

    const token = crypto.randomBytes(20).toString("hex");
    db.query("UPDATE tbd_usuarios SET token = ? WHERE email = ?", [token, normalizedEmail], async (err2) => {
      if (err2) return res.status(500).json({ error: "Error generando token" });

      await sendConfirmationEmail(normalizedEmail, token, results[0].nombre);
      res.json({ message: "Se ha reenviado el correo de confirmación" });
    });
  });
};

const logoutUser = (req, res) => {
  if (req.session.user && activeSessions.has(req.session.user.id)) {
    activeSessions.delete(req.session.user.id);
  }
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: "Error al cerrar sesión" });
    res.clearCookie("connect.sid");
    res.json({ message: "Sesión cerrada correctamente" });
  });
};

const forgotPassword = (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: "Email requerido" });

  db.query("SELECT * FROM tbd_usuarios WHERE email = ?", [normalizeEmail(email)], async (err, results) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    if (results.length === 0) return res.status(400).json({ error: "Si el correo existe, recibirás un enlace." });

    const token = crypto.randomBytes(20).toString("hex");

    db.query("UPDATE tbd_usuarios SET token = ? WHERE email = ?", [token, normalizeEmail(email)], async (err2) => {
      if (err2) return res.status(500).json({ error: "Error generando token" });

      try {
        await sendForgotPasswordEmail(normalizeEmail(email), token, results[0].nombre);
        res.json({ message: "Si el correo existe, recibirás un enlace de recuperación." });
      } catch (e) {
        res.status(500).json({ error: "Error enviando correo" });
      }
    });
  });
};

const resetPassword = (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword || newPassword.length < 8) {
    return res.status(400).json({ error: "La contraseña debe tener mínimo 8 caracteres." });
  }

  db.query("SELECT * FROM tbd_usuarios WHERE token = ?", [token], async (err, results) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    if (results.length === 0) return res.status(400).json({ error: "Token inválido o expirado." });

    const user = results[0];
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    db.query("UPDATE tbd_usuarios SET password = ?, token = NULL WHERE id = ?", [hashedPassword, user.id], (err2) => {
      if (err2) return res.status(500).json({ error: "Error actualizando contraseña" });
      res.json({ message: "Contraseña actualizada correctamente" });
    });
  });
};

const checkResetToken = (req, res) => {
  const { token } = req.params;
  db.query("SELECT * FROM tbd_usuarios WHERE token = ?", [token], (err, results) => {
    if (err) return res.status(500).json({ error: "Error interno" });
    if (results.length === 0) return res.status(400).json({ error: "Token inválido o expirado." });
    res.json({ message: "Token válido" });
  });
};

module.exports = { loginUser, googleLogin, registerUser, confirmUser, verifyOtp, resendConfirmation, getSession, logoutUser, forgotPassword, resetPassword, checkResetToken };