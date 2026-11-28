const sharp = require("sharp");
const db = require("../database/db");
const cloudinaryStorage = require("../utils/cloudinaryStorage");

const pool = db.promise();
const MAX_PHOTOS = 12;
const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

// La tabla se crea sola la primera vez (no hace falta correr SQL a mano).
let tableReady = null;
const ensureTable = () => {
  if (!tableReady) {
    tableReady = pool
      .query(
        `CREATE TABLE IF NOT EXISTS tbi_residencia_fotos (
           id INT AUTO_INCREMENT PRIMARY KEY,
           url VARCHAR(500) NOT NULL,
           public_id VARCHAR(255) NOT NULL,
           descripcion VARCHAR(120) NULL,
           orden INT NOT NULL DEFAULT 0,
           creada_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
         )`
      )
      .catch((error) => {
        tableReady = null;
        throw error;
      });
  }
  return tableReady;
};

// Pública: la usa la pantalla "La residencia".
const getPhotos = async (req, res) => {
  try {
    await ensureTable();
    const [rows] = await pool.query(
      "SELECT id, url, descripcion FROM tbi_residencia_fotos ORDER BY orden ASC, id ASC"
    );
    res.json(rows);
  } catch (error) {
    console.error("Error obteniendo fotos de la residencia:", error);
    res.status(500).json({ error: "No se pudieron cargar las fotos" });
  }
};

const addPhoto = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "Selecciona una foto para subir" });
  if (!cloudinaryStorage.isConfigured()) {
    return res.status(503).json({ error: "El almacenamiento de fotos aún no está configurado" });
  }

  try {
    await ensureTable();
    const [[{ total }]] = await pool.query("SELECT COUNT(*) AS total FROM tbi_residencia_fotos");
    if (Number(total) >= MAX_PHOTOS) {
      return res.status(400).json({ error: `La galería admite hasta ${MAX_PHOTOS} fotos` });
    }
  } catch (error) {
    console.error("Error verificando galería:", error);
    return res.status(500).json({ error: "No se pudo verificar la galería" });
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
    uploaded = await cloudinaryStorage.uploadResidencePhoto(optimized);
  } catch (error) {
    console.error("Error subiendo foto de la residencia a Cloudinary:", error);
    return res.status(502).json({ error: "No se pudo guardar la foto. Intenta de nuevo más tarde" });
  }

  try {
    const descripcion = String(req.body?.descripcion || "").trim().slice(0, 120) || null;
    const [[{ nextOrder }]] = await pool.query(
      "SELECT COALESCE(MAX(orden), -1) + 1 AS nextOrder FROM tbi_residencia_fotos"
    );
    const [result] = await pool.query(
      "INSERT INTO tbi_residencia_fotos (url, public_id, descripcion, orden) VALUES (?, ?, ?, ?)",
      [uploaded.url, uploaded.publicId, descripcion, nextOrder]
    );
    res.status(201).json({ id: result.insertId, url: uploaded.url, descripcion });
  } catch (error) {
    console.error("Error guardando foto de la residencia:", error);
    cloudinaryStorage.deleteImage(uploaded.publicId).catch(() => {});
    res.status(500).json({ error: "No se pudo guardar la foto" });
  }
};

const updatePhoto = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Foto inválida" });
  const descripcion = String(req.body?.descripcion || "").trim().slice(0, 120) || null;
  try {
    await ensureTable();
    const [result] = await pool.query("UPDATE tbi_residencia_fotos SET descripcion = ? WHERE id = ?", [descripcion, id]);
    if (!result.affectedRows) return res.status(404).json({ error: "Foto no encontrada" });
    res.json({ message: "Descripción actualizada" });
  } catch (error) {
    console.error("Error actualizando foto de la residencia:", error);
    res.status(500).json({ error: "No se pudo actualizar la foto" });
  }
};

// Mueve la foto al inicio (será la principal de la galería).
const setCover = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Foto inválida" });
  try {
    await ensureTable();
    const [[photo]] = await pool.query("SELECT id FROM tbi_residencia_fotos WHERE id = ?", [id]);
    if (!photo) return res.status(404).json({ error: "Foto no encontrada" });
    const [[{ minOrder }]] = await pool.query("SELECT COALESCE(MIN(orden), 0) AS minOrder FROM tbi_residencia_fotos");
    await pool.query("UPDATE tbi_residencia_fotos SET orden = ? WHERE id = ?", [Number(minOrder) - 1, id]);
    res.json({ message: "Foto principal actualizada" });
  } catch (error) {
    console.error("Error cambiando foto principal:", error);
    res.status(500).json({ error: "No se pudo cambiar la foto principal" });
  }
};

const deletePhoto = async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) return res.status(400).json({ error: "Foto inválida" });
  try {
    await ensureTable();
    const [[photo]] = await pool.query("SELECT public_id FROM tbi_residencia_fotos WHERE id = ?", [id]);
    if (!photo) return res.status(404).json({ error: "Foto no encontrada" });
    await pool.query("DELETE FROM tbi_residencia_fotos WHERE id = ?", [id]);
    if (cloudinaryStorage.isConfigured()) {
      cloudinaryStorage.deleteImage(photo.public_id).catch((error) =>
        console.error("No se pudo borrar la imagen de Cloudinary:", error)
      );
    }
    res.json({ message: "Foto eliminada" });
  } catch (error) {
    console.error("Error eliminando foto de la residencia:", error);
    res.status(500).json({ error: "No se pudo eliminar la foto" });
  }
};

module.exports = { getPhotos, addPhoto, updatePhoto, setCover, deletePhoto };
