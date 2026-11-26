const sharp = require("sharp");
const db = require("../database/db");
const { readSettings } = require("../utils/settingsStore");
const cloudinaryStorage = require("../utils/cloudinaryStorage");

const pool = db.promise();
const ACTIVE_STATES = "('cancelada', 'rechazada', 'finalizada')";
const MAX_PHOTOS_PER_ROOM = 8;
const DEFAULT_CAPACITY = { individual: 1, compartida: 2 };
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

const priceFor = (tipo, settings) =>
  Number(tipo === "compartida" ? settings.precioCompartida : settings.precioIndividual) || 0;

// ── Lectura ─────────────────────────────────────────────────────────────────

// Formato anterior (lo siguen usando las pantallas actuales): piso → habitaciones.
const getRooms = (req, res) => {
  const sql = "SELECT piso, GROUP_CONCAT(habitacion ORDER BY habitacion ASC SEPARATOR ', ') AS habitaciones FROM tbi_habitaciones WHERE activa = 1 GROUP BY piso ORDER BY piso ASC";
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json({ error: "Error en el servidor" });

    const formatted = {};
    results.forEach((row) => {
      formatted[row.piso] = row.habitaciones.split(", ");
    });

    res.json({ lista: results, agrupado: formatted });
  });
};

const loadRoomDetails = async ({ includeInactive }) => {
  const [rooms] = await pool.query(
    `SELECT h.id, h.piso, h.habitacion, h.tipo, h.capacidad, h.descripcion, h.activa,
            (SELECT COUNT(*) FROM tbd_reservaciones r
              WHERE r.piso = h.piso AND r.habitacion = h.habitacion
                AND r.estado NOT IN ${ACTIVE_STATES}) AS ocupantes
       FROM tbi_habitaciones h
      ${includeInactive ? "" : "WHERE h.activa = 1"}
      ORDER BY h.piso ASC, h.habitacion ASC`
  );
  const [photos] = await pool.query(
    "SELECT id, habitacion_id, url FROM tbi_habitacion_fotos ORDER BY orden ASC, id ASC"
  );
  const settings = readSettings();

  const photosByRoom = new Map();
  photos.forEach((photo) => {
    if (!photosByRoom.has(photo.habitacion_id)) photosByRoom.set(photo.habitacion_id, []);
    photosByRoom.get(photo.habitacion_id).push({ id: photo.id, url: photo.url });
  });

  return rooms.map((room) => {
    const ocupantes = Number(room.ocupantes);
    const capacidad = Number(room.capacidad);
    return {
      id: room.id,
      piso: room.piso,
      habitacion: room.habitacion,
      tipo: room.tipo,
      capacidad,
      descripcion: room.descripcion,
      activa: Boolean(room.activa),
      precio: priceFor(room.tipo, settings),
      ocupantes,
      cupos: Math.max(capacidad - ocupantes, 0),
      disponible: Boolean(room.activa) && ocupantes < capacidad,
      fotos: photosByRoom.get(room.id) || [],
    };
  });
};

// Público: todo lo que el estudiante necesita para elegir cuarto.
const getRoomDetails = async (req, res) => {
  try {
    res.json(await loadRoomDetails({ includeInactive: false }));
  } catch (error) {
    console.error("Error cargando habitaciones:", error);
    res.status(500).json({ error: "No se pudieron cargar las habitaciones" });
  }
};

// Admin: incluye habitaciones desactivadas.
const getRoomDetailsAdmin = async (req, res) => {
  try {
    res.json(await loadRoomDetails({ includeInactive: true }));
  } catch (error) {
    console.error("Error cargando habitaciones (admin):", error);
    res.status(500).json({ error: "No se pudieron cargar las habitaciones" });
  }
};

// ── Escritura (admin) ───────────────────────────────────────────────────────

const addRooms = (req, res) => {
  const { piso, habitaciones, tipo = "individual", descripcion } = req.body;
  if (!piso || !habitaciones) return res.status(400).json({ error: "Faltan datos" });
  if (!["individual", "compartida"].includes(tipo)) {
    return res.status(400).json({ error: "El tipo debe ser individual o compartida" });
  }

  const capacidad = Number(req.body.capacidad) || DEFAULT_CAPACITY[tipo];
  if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 6) {
    return res.status(400).json({ error: "La capacidad debe ser un número entre 1 y 6" });
  }

  const habArray = String(habitaciones).split(",").map((h) => h.trim()).filter((h) => h !== "");
  if (habArray.length === 0) return res.status(400).json({ error: "Lista de habitaciones vacia" });

  const cleanDescription = descripcion ? String(descripcion).trim().slice(0, 255) : null;
  const values = habArray.map((h) => [piso, h, tipo, capacidad, cleanDescription]);

  db.query(
    "INSERT IGNORE INTO tbi_habitaciones (piso, habitacion, tipo, capacidad, descripcion) VALUES ?",
    [values],
    (err, result) => {
      if (err) return res.status(500).json({ error: "Error al insertar" });
      res.json({ message: "Habitaciones agregadas correctamente", added: result.affectedRows });
    }
  );
};

const updateRoom = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Habitación inválida" });

  try {
    const [rows] = await pool.query(
      `SELECT h.*, (SELECT COUNT(*) FROM tbd_reservaciones r
                     WHERE r.piso = h.piso AND r.habitacion = h.habitacion
                       AND r.estado NOT IN ${ACTIVE_STATES}) AS ocupantes
         FROM tbi_habitaciones h WHERE h.id = ?`,
      [id]
    );
    const room = rows[0];
    if (!room) return res.status(404).json({ error: "Habitación no encontrada" });
    const ocupantes = Number(room.ocupantes);

    const updates = [];
    const values = [];

    if (req.body.tipo !== undefined) {
      if (!["individual", "compartida"].includes(req.body.tipo)) {
        return res.status(400).json({ error: "El tipo debe ser individual o compartida" });
      }
      if (req.body.tipo !== room.tipo && ocupantes > 0) {
        return res.status(409).json({ error: "No puedes cambiar el tipo de una habitación con reservaciones activas" });
      }
      updates.push("tipo = ?");
      values.push(req.body.tipo);
    }

    if (req.body.capacidad !== undefined) {
      const capacidad = Number(req.body.capacidad);
      if (!Number.isInteger(capacidad) || capacidad < 1 || capacidad > 6) {
        return res.status(400).json({ error: "La capacidad debe ser un número entre 1 y 6" });
      }
      if (capacidad < ocupantes) {
        return res.status(409).json({ error: `Hay ${ocupantes} reservaciones activas; la capacidad no puede ser menor` });
      }
      updates.push("capacidad = ?");
      values.push(capacidad);
    }

    if (req.body.descripcion !== undefined) {
      updates.push("descripcion = ?");
      values.push(req.body.descripcion ? String(req.body.descripcion).trim().slice(0, 255) : null);
    }

    if (req.body.activa !== undefined) {
      const activa = req.body.activa ? 1 : 0;
      if (!activa && ocupantes > 0) {
        return res.status(409).json({ error: "No puedes desactivar una habitación con reservaciones activas" });
      }
      updates.push("activa = ?");
      values.push(activa);
    }

    if (updates.length === 0) return res.status(400).json({ error: "No hay campos por actualizar" });

    await pool.query(`UPDATE tbi_habitaciones SET ${updates.join(", ")} WHERE id = ?`, [...values, id]);
    res.json({ message: "Habitación actualizada" });
  } catch (error) {
    console.error("Error actualizando habitación:", error);
    res.status(500).json({ error: "No se pudo actualizar la habitación" });
  }
};

const deleteFloor = (req, res) => {
  const { piso } = req.params;
  db.query(
    "SELECT COUNT(*) AS ocupadas FROM tbd_reservaciones WHERE piso = ? AND estado NOT IN ('cancelada', 'rechazada', 'finalizada')",
    [piso],
    (checkError, rows) => {
      if (checkError) return res.status(500).json({ error: "Error al verificar las habitaciones del piso" });
      if (Number(rows[0].ocupadas) > 0) {
        return res.status(409).json({ error: "No se puede eliminar un piso con habitaciones asignadas" });
      }

      db.query("DELETE FROM tbi_habitaciones WHERE piso = ?", [piso], (err) => {
        if (err) return res.status(500).json({ error: "Error al eliminar" });
        res.json({ message: "Piso y habitaciones eliminados" });
      });
    }
  );
};

// ── Fotos (admin) ───────────────────────────────────────────────────────────

const uploadRoomPhoto = async (req, res) => {
  const roomId = Number(req.params.id);
  if (!Number.isInteger(roomId)) return res.status(400).json({ error: "Habitación inválida" });
  if (!req.file) return res.status(400).json({ error: "Selecciona una foto para subir" });
  if (!cloudinaryStorage.isConfigured()) {
    return res.status(503).json({ error: "El almacenamiento de fotos aún no está configurado" });
  }

  try {
    const [rooms] = await pool.query("SELECT id FROM tbi_habitaciones WHERE id = ?", [roomId]);
    if (!rooms[0]) return res.status(404).json({ error: "Habitación no encontrada" });

    const [[{ total }]] = await pool.query(
      "SELECT COUNT(*) AS total FROM tbi_habitacion_fotos WHERE habitacion_id = ?",
      [roomId]
    );
    if (Number(total) >= MAX_PHOTOS_PER_ROOM) {
      return res.status(400).json({ error: `Cada habitación admite hasta ${MAX_PHOTOS_PER_ROOM} fotos` });
    }
  } catch (error) {
    console.error("Error verificando habitación:", error);
    return res.status(500).json({ error: "No se pudo verificar la habitación" });
  }

  let optimized;
  try {
    const metadata = await sharp(req.file.buffer, { limitInputPixels: 40000000 }).metadata();
    if (!ALLOWED_FORMATS.has(metadata.format)) {
      return res.status(400).json({ error: "El archivo no contiene una imagen JPG, PNG o WebP válida" });
    }
    optimized = await sharp(req.file.buffer, { limitInputPixels: 40000000 })
      .rotate()
      .resize(1600, 1067, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return res.status(400).json({ error: "No se pudo procesar la imagen seleccionada" });
  }

  let uploaded;
  try {
    uploaded = await cloudinaryStorage.uploadRoomPhoto(optimized, roomId);
  } catch (error) {
    console.error("Error subiendo foto de habitación a Cloudinary:", error);
    return res.status(502).json({ error: "No se pudo guardar la foto. Intenta de nuevo más tarde" });
  }

  try {
    const [[{ nextOrder }]] = await pool.query(
      "SELECT COALESCE(MAX(orden), -1) + 1 AS nextOrder FROM tbi_habitacion_fotos WHERE habitacion_id = ?",
      [roomId]
    );
    const [result] = await pool.query(
      "INSERT INTO tbi_habitacion_fotos (habitacion_id, url, public_id, orden) VALUES (?, ?, ?, ?)",
      [roomId, uploaded.url, uploaded.publicId, Math.min(Number(nextOrder), 120)]
    );
    res.status(201).json({ foto: { id: result.insertId, url: uploaded.url } });
  } catch (error) {
    console.error("Error guardando la foto en la base de datos:", error);
    cloudinaryStorage.deleteImage(uploaded.publicId).catch(() => {});
    res.status(500).json({ error: "No se pudo registrar la foto" });
  }
};

const deleteRoomPhoto = async (req, res) => {
  const photoId = Number(req.params.photoId);
  if (!Number.isInteger(photoId)) return res.status(400).json({ error: "Foto inválida" });

  try {
    const [rows] = await pool.query("SELECT public_id FROM tbi_habitacion_fotos WHERE id = ?", [photoId]);
    if (!rows[0]) return res.status(404).json({ error: "Foto no encontrada" });

    await pool.query("DELETE FROM tbi_habitacion_fotos WHERE id = ?", [photoId]);
    if (cloudinaryStorage.isConfigured()) {
      cloudinaryStorage.deleteImage(rows[0].public_id).catch((error) =>
        console.error("No se pudo borrar la imagen de Cloudinary:", error.message)
      );
    }
    res.json({ message: "Foto eliminada" });
  } catch (error) {
    console.error("Error eliminando foto:", error);
    res.status(500).json({ error: "No se pudo eliminar la foto" });
  }
};

// Marca una foto como portada (la primera que se muestra).
const setCoverPhoto = async (req, res) => {
  const photoId = Number(req.params.photoId);
  if (!Number.isInteger(photoId)) return res.status(400).json({ error: "Foto inválida" });

  try {
    const [rows] = await pool.query("SELECT habitacion_id FROM tbi_habitacion_fotos WHERE id = ?", [photoId]);
    if (!rows[0]) return res.status(404).json({ error: "Foto no encontrada" });

    const roomId = rows[0].habitacion_id;
    const [all] = await pool.query(
      "SELECT id FROM tbi_habitacion_fotos WHERE habitacion_id = ? AND id <> ? ORDER BY orden ASC, id ASC",
      [roomId, photoId]
    );
    const ordered = [photoId, ...all.map((photo) => photo.id)];
    for (let index = 0; index < ordered.length; index += 1) {
      await pool.query("UPDATE tbi_habitacion_fotos SET orden = ? WHERE id = ?", [index, ordered[index]]);
    }
    res.json({ message: "Portada actualizada" });
  } catch (error) {
    console.error("Error actualizando portada:", error);
    res.status(500).json({ error: "No se pudo actualizar la portada" });
  }
};

module.exports = {
  getRooms,
  getRoomDetails,
  getRoomDetailsAdmin,
  addRooms,
  updateRoom,
  deleteFloor,
  uploadRoomPhoto,
  deleteRoomPhoto,
  setCoverPhoto,
};
