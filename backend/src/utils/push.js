const webpush = require("web-push");
const db = require("../database/db");

const PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY;
const PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;
const SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@sicpes.local";

const pushEnabled = Boolean(PUBLIC_KEY && PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(SUBJECT, PUBLIC_KEY, PRIVATE_KEY);
} else {
  console.warn("[push] Sin VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY: solo se guardan avisos en la bandeja, no se envía push.");
}

const query = async (sql, params = []) => {
  const [rows] = await db.promise().query(sql, params);
  return rows;
};

// Envía el push a todos los dispositivos del usuario y borra los que ya no existen.
const pushToUser = async (userId, payload) => {
  if (!pushEnabled) return;

  const subs = await query(
    "SELECT id, endpoint, p256dh, auth FROM tbd_push_suscripciones WHERE usuario_id = ?",
    [userId]
  );

  await Promise.allSettled(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
      } catch (err) {
        // 404/410: el usuario desinstaló la PWA o revocó el permiso
        if (err.statusCode === 404 || err.statusCode === 410) {
          await query("DELETE FROM tbd_push_suscripciones WHERE id = ?", [s.id]);
        } else {
          console.error("[push] Error enviando a", s.id, err.statusCode || err.message);
        }
      }
    })
  );
};

/**
 * Guarda el aviso en la bandeja (tbd_notificaciones) y manda el push.
 * NUNCA lanza error: una notificación fallida no debe romper la petición principal.
 * Úsala sin await para no retrasar la respuesta de la API.
 *   notifyUser(id, { tipo, title, body, url })
 */
const notifyUser = async (userId, { tipo = "general", title, body, url = "/dashboard" }) => {
  try {
    await query(
      "INSERT INTO tbd_notificaciones (usuario_id, tipo, titulo, cuerpo, url) VALUES (?, ?, ?, ?, ?)",
      [userId, tipo, String(title).slice(0, 120), String(body).slice(0, 255), url]
    );
    await pushToUser(userId, { title, body, url, tag: tipo });
  } catch (err) {
    console.error("[push] notifyUser falló:", err.message);
  }
};

const notifyAdmins = async (payload) => {
  try {
    const admins = await query("SELECT id FROM tbd_usuarios WHERE rol = 'admin'");
    await Promise.allSettled(admins.map((a) => notifyUser(a.id, payload)));
  } catch (err) {
    console.error("[push] notifyAdmins falló:", err.message);
  }
};

// Notifica al dueño de una reservación (por id de reservación)
const notifyReservationOwner = async (reservacionId, payload) => {
  try {
    const rows = await query("SELECT usuario_id FROM tbd_reservaciones WHERE id = ? LIMIT 1", [reservacionId]);
    if (rows[0]) await notifyUser(rows[0].usuario_id, payload);
  } catch (err) {
    console.error("[push] notifyReservationOwner falló:", err.message);
  }
};

module.exports = { pushEnabled, PUBLIC_KEY, notifyUser, notifyAdmins, notifyReservationOwner };
