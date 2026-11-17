const crypto = require("crypto");
const db = require("../database/db");
const { pushEnabled, PUBLIC_KEY, notifyUser } = require("../utils/push");

const q = async (sql, params = []) => (await db.promise().query(sql, params))[0];
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Público: el frontend lo pide para suscribirse (así no hay que recompilar al cambiar la llave)
const getPublicKey = (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: "Notificaciones push no configuradas" });
  res.json({ publicKey: PUBLIC_KEY });
};

const subscribe = async (req, res) => {
  const user = req.session.user;
  if (!user) return res.status(401).json({ error: "No autenticado" });

  const sub = req.body?.subscription;
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ error: "Suscripción inválida" });
  }

  try {
    // Si el mismo dispositivo lo usa otra cuenta, la suscripción pasa a la cuenta actual
    await q(
      `INSERT INTO tbd_push_suscripciones (usuario_id, endpoint_hash, endpoint, p256dh, auth, user_agent)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE usuario_id = VALUES(usuario_id), p256dh = VALUES(p256dh), auth = VALUES(auth)`,
      [user.id, sha256(sub.endpoint), sub.endpoint, sub.keys.p256dh, sub.keys.auth, (req.headers["user-agent"] || "").slice(0, 255)]
    );
    res.status(201).json({ message: "Notificaciones activadas" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const unsubscribe = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: "Falta endpoint" });

  try {
    await q("DELETE FROM tbd_push_suscripciones WHERE endpoint_hash = ? AND usuario_id = ?", [sha256(endpoint), req.session.user.id]);
    res.json({ message: "Notificaciones desactivadas" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

// Bandeja: últimos 30 avisos + cuántos están sin leer
const listNotifications = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  try {
    const items = await q(
      "SELECT id, tipo, titulo, cuerpo, url, leida, creado_en FROM tbd_notificaciones WHERE usuario_id = ? ORDER BY id DESC LIMIT 30",
      [req.session.user.id]
    );
    const [{ total }] = await q("SELECT COUNT(*) AS total FROM tbd_notificaciones WHERE usuario_id = ? AND leida = 0", [req.session.user.id]);
    res.json({ items, unread: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const clearNotifications = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  try {
    await q("DELETE FROM tbd_notificaciones WHERE usuario_id = ?", [req.session.user.id]);
    res.json({ message: "Notificaciones eliminadas" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

const markRead = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  try {
    const sql = req.params.id
      ? ["UPDATE tbd_notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?", [req.params.id, req.session.user.id]]
      : ["UPDATE tbd_notificaciones SET leida = 1 WHERE usuario_id = ?", [req.session.user.id]];
    await q(...sql);
    res.json({ message: "Listo" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Error del servidor" });
  }
};

// Para probar rápido que llega el push al dispositivo actual
const sendTest = async (req, res) => {
  if (!req.session.user) return res.status(401).json({ error: "No autenticado" });
  await notifyUser(req.session.user.id, { tipo: "prueba", title: "SICPES", body: "Las notificaciones funcionan correctamente.", url: "/dashboard" });
  res.json({ message: "Enviada" });
};

module.exports = { getPublicKey, subscribe, unsubscribe, listNotifications, clearNotifications, markRead, sendTest };
