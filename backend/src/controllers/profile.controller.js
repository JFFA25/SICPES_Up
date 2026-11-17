const sharp = require("sharp");
const { getProfileByUserId, updateProfilePhoto } = require("../models/profile.model");
const cloudinaryStorage = require("../utils/cloudinaryStorage");

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);

const getMyProfile = async (req, res) => {
  try {
    const user = await getProfileByUserId(req.session.user.id);
    if (!user) return res.status(404).json({ error: "No se encontró el perfil" });
    return res.json({ user });
  } catch (error) {
    console.error("Error cargando el perfil:", error);
    return res.status(500).json({ error: "No se pudo cargar tu perfil" });
  }
};

const uploadMyAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "Selecciona una imagen para subir" });
  }

  if (!cloudinaryStorage.isConfigured()) {
    return res.status(503).json({ error: "El almacenamiento de fotos aún no está configurado" });
  }

  let optimizedImage;
  try {
    const image = sharp(req.file.buffer, { limitInputPixels: 30000000 });
    const metadata = await image.metadata();

    if (!ALLOWED_FORMATS.has(metadata.format)) {
      return res.status(400).json({ error: "El archivo no contiene una imagen JPG, PNG o WebP válida" });
    }

    optimizedImage = await sharp(req.file.buffer, { limitInputPixels: 30000000 })
      .rotate()
      .resize(512, 512, { fit: "cover", position: "attention", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
  } catch {
    return res.status(400).json({ error: "No se pudo procesar la imagen seleccionada" });
  }

  let photoUrl;
  try {
    photoUrl = await cloudinaryStorage.uploadAvatar(optimizedImage, req.session.user.id);
  } catch (error) {
    console.error("Error guardando la foto en Cloudinary:", error);
    return res.status(502).json({ error: "No se pudo guardar la foto. Intenta de nuevo más tarde" });
  }

  try {
    const updated = await updateProfilePhoto(req.session.user.id, photoUrl);
    if (!updated) return res.status(404).json({ error: "No se encontró el perfil para actualizar" });

    req.session.user.foto_perfil_url = photoUrl;
    const user = await getProfileByUserId(req.session.user.id);
    return res.json({ user });
  } catch (error) {
    console.error("Error actualizando la foto del perfil en TiDB:", error);
    return res.status(500).json({ error: "La foto se subió, pero no se pudo actualizar el perfil" });
  }
};

module.exports = { getMyProfile, uploadMyAvatar };
